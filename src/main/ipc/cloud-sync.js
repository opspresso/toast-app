/**
 * Toast - Cloud Sync IPC Handlers
 *
 * Handlers for sync status, enabling/disabling, manual sync, and debugging.
 */

const { ipcMain } = require('electron');
const authManager = require('../auth-manager');
const userDataManager = require('../user-data-manager');
const { createLogger } = require('../logger');
const { broadcastToWindows } = require('../broadcast');
const { getDeviceId } = require('../config');

const logger = createLogger('IPC');

/**
 * Set up cloud sync IPC handlers
 * @param {Object} windows - Object containing application windows
 * @param {Object} config - Shared config store
 */
function setupCloudSyncHandlers(windows, config) {
  // Cloud synchronization related handlers
  // 매니저는 src/index.js가 initCloudSync로 1회 초기화하며, 여기서는 조회만 한다
  const getCloudSyncManager = () => require('../cloud-sync').getSyncManager();

  // Settings Synced 이벤트 핸들러 전달
  ipcMain.on('settings-synced', (event, data) => {
    broadcastToWindows(windows, 'settings-synced', data);
  });

  // Get sync status
  ipcMain.handle('get-sync-status', async () => {
    try {
      const cloudSyncManager = getCloudSyncManager();
      if (cloudSyncManager) {
        // getCurrentStatus() 메서드로 현재 상태 조회
        return cloudSyncManager.getCurrentStatus();
      }
      else {
        // CloudSyncManager 초기화할 수 없으면 Config Store에서 실제 상태 읽기
        const savedEnabled = config.get('cloudSync.enabled');
        const actualEnabled = savedEnabled !== undefined ? savedEnabled : true;

        logger.info(`Cloud sync manager not initialized, returning config-based status: ${actualEnabled}`);
        return {
          enabled: actualEnabled,
          deviceId: getDeviceId(),
          lastSyncTime: 0,
          lastChangeType: null,
        };
      }
    }
    catch (error) {
      logger.error('Error getting sync status:', error);

      // 오류 시에도 Config Store에서 상태 읽기 시도
      try {
        const savedEnabled = config.get('cloudSync.enabled');
        const actualEnabled = savedEnabled !== undefined ? savedEnabled : false;

        return {
          enabled: actualEnabled,
          deviceId: getDeviceId(),
          lastSyncTime: 0,
          lastChangeType: null,
        };
      }
      catch (configError) {
        logger.error('Error reading config for sync status:', configError);
        return {
          enabled: false,
          deviceId: getDeviceId(),
          lastSyncTime: 0,
          lastChangeType: null,
        };
      }
    }
  });

  // Set cloud sync enabled/disabled
  ipcMain.handle('set-cloud-sync-enabled', async (event, enabled) => {
    try {
      // 동기화 설정 변경 로그
      logger.info(`Setting cloud sync to ${enabled ? 'enabled' : 'disabled'}`);

      const cloudSyncManager = getCloudSyncManager();
      if (cloudSyncManager) {
        // enable/disable 메서드를 사용하여 클라우드 동기화 활성화/비활성화
        if (enabled) {
          cloudSyncManager.enable();
        }
        else {
          cloudSyncManager.disable();
        }

        // 현재 상태 반환 (CloudSyncManager가 단일 진실 원천)
        return {
          success: true,
          status: cloudSyncManager.getCurrentStatus(),
        };
      }
      else {
        // 매니저가 초기화되지 않은 경우
        logger.warn('Cloud sync manager not initialized, cannot enable/disable');
        return {
          success: false,
          error: 'Cloud sync manager not initialized',
        };
      }
    }
    catch (error) {
      logger.error('Error setting cloud sync enabled:', error);
      return {
        success: false,
        error: error.message || 'Unknown error',
      };
    }
  });

  // Manual sync (upload, download, resolve)
  ipcMain.handle('manual-sync', async (event, action) => {
    try {
      // 유효성 검사
      if (!['upload', 'download', 'resolve'].includes(action)) {
        throw new Error(`Invalid sync action: ${action}`);
      }

      const cloudSyncManager = getCloudSyncManager();
      if (cloudSyncManager) {
        // 수동 동기화 실행
        logger.info(`Performing manual sync action: ${action}`);
        const result = await cloudSyncManager.manualSync(action);

        // 동기화 결과가 성공이면 UI 업데이트 메시지 전송
        if (result.success) {
          // 현재 설정 데이터 수집
          const configData = {
            pages: config.get('pages'),
            appearance: config.get('appearance'),
            advanced: config.get('advanced'),
            subscription: config.get('subscription'),
          };

          // 동기화 완료 알림 (설정 데이터 포함)
          broadcastToWindows(windows, 'config-updated', configData);
        }

        return result;
      }
      else {
        // 매니저가 초기화되지 않은 경우
        logger.warn('Cloud sync manager not initialized, cannot perform manual sync');
        return {
          success: false,
          error: 'Cloud sync manager not initialized',
        };
      }
    }
    catch (error) {
      logger.error(`Error performing manual sync (${action}):`, error);
      return {
        success: false,
        error: error.message || 'Unknown error',
      };
    }
  });

  // Debug sync status (for troubleshooting)
  ipcMain.handle('debug-sync-status', async () => {
    try {
      logger.info('=== Debug sync status requested ===');
      const cloudSyncManager = getCloudSyncManager();
      logger.info('cloudSyncManager exists:', !!cloudSyncManager);
      logger.info('authManager exists:', !!authManager);
      logger.info('userDataManager exists:', !!userDataManager);

      if (cloudSyncManager) {
        const status = cloudSyncManager.getCurrentStatus();
        const subscription = config.get('subscription');
        const hasAuthManager = !!authManager;
        const hasValidToken = hasAuthManager ? await authManager.hasValidToken() : false;

        logger.info('Sync status:', status);
        logger.info('Has valid token:', hasValidToken);

        return {
          success: true,
          status: {
            ...status,
            hasAuthManager,
            hasValidToken,
            subscription: subscription
              ? {
                active: subscription.active,
                isSubscribed: subscription.isSubscribed,
                features: subscription.features,
                plan: subscription.plan,
              }
              : null,
          },
        };
      }
      else {
        return {
          success: false,
          error: 'Cloud sync manager not initialized - authManager or userDataManager missing',
          debug: {
            hasAuthManager: !!authManager,
            hasUserDataManager: !!userDataManager,
          },
        };
      }
    }
    catch (error) {
      logger.error('Error getting debug sync status:', error);
      return {
        success: false,
        error: error.message || 'Unknown error',
      };
    }
  });
}

module.exports = {
  setupCloudSyncHandlers,
};
