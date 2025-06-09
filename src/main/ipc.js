/**
 * Toast - IPC Handlers
 *
 * This module sets up IPC (Inter-Process Communication) handlers for
 * communication between the main process and renderer processes.
 */

const { ipcMain } = require('electron');
const { executeAction, validateAction } = require('./executor');
const config = require('./config').createConfigStore();
const os = require('os');
const { dialog, shell } = require('electron');
const { unregisterGlobalShortcuts, registerGlobalShortcuts } = require('./shortcuts');
const auth = require('./auth');
const authManager = require('./auth-manager');
const userDataManager = require('./user-data-manager');
const updater = require('./updater');
const { createLogger, handleIpcLogging } = require('./logger');
const { extractAppIcon, extractAppNameFromPath } = require('./utils/app-icon-extractor');

// 모듈별 로거 생성
const logger = createLogger('IPC');

// Track button edit modal state
let isModalOpen = false;

/**
 * Function to check if modal is currently open
 * @returns {boolean} Modal open state
 */
function isModalOpened() {
  return isModalOpen;
}

/**
 * Function to get device identifier
 * @returns {string} Device identifier
 */
function getDeviceIdentifier() {
  const platform = process.platform;
  const hostname = os.hostname();
  const username = os.userInfo().username;
  return `${platform}-${hostname}-${username}`;
}

/**
 * Set up IPC handlers
 * @param {Object} windows - Object containing application windows
 */
function setupIpcHandlers(windows) {
  // Initialize authentication manager (pass window references)
  authManager.initialize(windows);

  // Initialize user data manager (pass window references)
  userDataManager.initialize(windows);

  // Initialize auto updater (pass window references)
  updater.initAutoUpdater(windows);

  // Register URL protocol handler (OAuth redirection handling)
  auth.registerProtocolHandler();

  // Handle protocol requests during app execution
  global.handleProtocolRequest = async url => {
    logger.info('Protocol request received:', url);

    // Process authentication URL using handleAuthRedirect function in auth.js
    if (url.startsWith('toast-app://auth')) {
      try {
        const urlObj = new URL(url);
        const action = urlObj.searchParams.get('action');

        const result = await auth.handleAuthRedirect(url);

        // Send processing result to settings window
        if (windows.settings && !windows.settings.isDestroyed()) {
          windows.settings.webContents.send('auth-result', result);
        }

        // Notify both windows through auth-manager on login success
        if (result.success) {
          // Send special message if action is reload_auth
          if (action === 'reload_auth') {
            authManager.notifyAuthStateChange({
              type: 'auth-reload',
              subscription: result.subscription,
              message: 'Authentication information has been refreshed.',
            });
          } else {
            // Regular login success notification
            authManager.notifyLoginSuccess(result.subscription);
          }
        } else {
          // Login failure notification
          authManager.notifyLoginError(result.error || 'Unknown error');
        }
      } catch (error) {
        logger.error('Error handling auth redirect:', error);
        // Notification when error occurs
        authManager.notifyLoginError(error.message || 'Unknown error');
      }
    } else if (windows.settings && !windows.settings.isDestroyed()) {
      // Deliver other protocol data
      windows.settings.webContents.send('protocol-data', url);
    }
  };

  // Handle button edit modal state change
  ipcMain.on('modal-state-changed', (event, open) => {
    isModalOpen = open;
  });

  // Handler to return current modal state
  ipcMain.handle('is-modal-open', () => {
    return isModalOpen;
  });

  // Set window's alwaysOnTop property
  ipcMain.handle('set-always-on-top', (event, value) => {
    try {
      if (windows.toast && !windows.toast.isDestroyed()) {
        windows.toast.setAlwaysOnTop(value);
        return true;
      }
      return false;
    } catch (error) {
      logger.error('Error setting alwaysOnTop:', error);
      return false;
    }
  });

  // Return current window position
  ipcMain.handle('get-window-position', event => {
    try {
      if (windows.toast && !windows.toast.isDestroyed()) {
        return windows.toast.getPosition();
      }
      return null;
    } catch (error) {
      logger.error('Error getting window position:', error);
      return null;
    }
  });

  // Temporarily disable alwaysOnTop (to display file selection dialog on top)
  ipcMain.handle('hide-window-temporarily', async event => {
    try {
      if (windows.toast && !windows.toast.isDestroyed()) {
        // Turn off alwaysOnTop property so dialog can appear on top
        windows.toast.setAlwaysOnTop(false);
        return true;
      }
      return false;
    } catch (error) {
      logger.error('Error disabling alwaysOnTop temporarily:', error);
      return false;
    }
  });

  // Restore alwaysOnTop after dialog is closed
  ipcMain.handle('show-window-after-dialog', async (event, position) => {
    try {
      if (windows.toast && !windows.toast.isDestroyed()) {
        // Move window to saved position (if position information exists)
        if (position && Array.isArray(position) && position.length === 2) {
          windows.toast.setPosition(position[0], position[1]);
        }

        // Restore alwaysOnTop setting
        windows.toast.setAlwaysOnTop(true);

        // Focus the window to bring it to front
        windows.toast.focus();

        return true;
      }
      return false;
    } catch (error) {
      logger.error('Error restoring alwaysOnTop after dialog:', error);
      return false;
    }
  });

  // Execute an action
  ipcMain.handle('execute-action', async (event, action) => {
    try {
      return await executeAction(action);
    } catch (error) {
      return {
        success: false,
        message: `Error executing action: ${error.message}`,
        error: error.toString(),
      };
    }
  });

  // Test an action without executing it
  ipcMain.handle('validate-action', async (event, action) => {
    try {
      return await validateAction(action);
    } catch (error) {
      return {
        valid: false,
        message: `Error validating action: ${error.message}`,
        error: error.toString(),
      };
    }
  });

  // Get configuration
  ipcMain.handle('get-config', (event, key) => {
    try {
      if (key) {
        return config.get(key);
      } else {
        return config.store;
      }
    } catch (error) {
      logger.error('Error getting config:', error);
      return null;
    }
  });

  // Get environment variable
  ipcMain.handle('get-env', (event, key) => {
    try {
      const { getEnv } = require('./config/env');
      return getEnv(key);
    } catch (error) {
      logger.error('Error getting environment variable:', error);
      return null;
    }
  });

  // Set configuration
  ipcMain.handle('set-config', (event, key, value) => {
    try {
      if (key === null && typeof value === 'object') {
        // Set entire config
        Object.keys(value).forEach(k => {
          config.set(k, value[k]);
        });
      } else if (key === 'subscription' && typeof value === 'object') {
        // sanitizeSubscription 함수를 사용하여 객체 정리
        const { sanitizeSubscription } = require('./config');
        const subscriptionValue = sanitizeSubscription(value);

        // 정리된 subscription 객체 저장
        config.set(key, subscriptionValue);
      } else {
        // Set specific key
        config.set(key, value);
      }

      // Immediately notify toast window when settings change
      if (windows.toast && !windows.toast.isDestroyed()) {
        // If entire settings or specific section is updated
        if (key === null || key === 'appearance' || key === 'advanced' || key === 'pages') {
          // sanitizeSubscription 함수를 사용하여 subscription 객체 정리
          const { sanitizeSubscription } = require('./config');
          const subscription = sanitizeSubscription(config.get('subscription'));

          windows.toast.webContents.send('config-updated', {
            pages: config.get('pages'),
            appearance: config.get('appearance'),
            subscription: subscription,
          });
        }

        // Update window properties if window settings are affected
        if (key === 'appearance' || key === 'appearance.opacity' || key === 'appearance.size') {
          const opacity = config.get('appearance.opacity') || 0.95;
          windows.toast.setOpacity(opacity);

          // Change window size (if needed)
          const size = config.get('appearance.size') || 'medium';
          updateToastWindowSize(windows.toast, size);
        }

        // Update position if window position settings are affected
        if (key === 'appearance' || key === 'appearance.position') {
          const { positionToastWindow } = require('./shortcuts');
          positionToastWindow(windows.toast, config);
        }
      }

      return true;
    } catch (error) {
      logger.error('Error setting config:', error);
      return false;
    }
  });

  /**
   * Update toast window size
   */
  function updateToastWindowSize(window, size) {
    let width, height;

    switch (size) {
      case 'small':
        width = 500;
        height = 350;
        break;
      case 'large':
        width = 800;
        height = 550;
        break;
      case 'medium':
      default:
        width = 700;
        height = 500;
        break;
    }

    window.setSize(width, height);
  }

  // Save configuration (specific changes)
  ipcMain.handle('save-config', (event, changes) => {
    try {
      if (typeof changes === 'object') {
        // Apply each change to config
        Object.keys(changes).forEach(key => {
          config.set(key, changes[key]);
        });

        // Immediately notify toast window when settings change
        if (windows.toast && !windows.toast.isDestroyed()) {
          // sanitizeSubscription 함수를 사용하여 subscription 객체 정리
          const { sanitizeSubscription } = require('./config');
          const subscription = sanitizeSubscription(config.get('subscription'));

          windows.toast.webContents.send('config-updated', {
            pages: config.get('pages'),
            appearance: config.get('appearance'),
            subscription: subscription,
          });

          // Update toast window appearance if appearance settings change
          if (changes.appearance) {
            if (changes.appearance.opacity) {
              windows.toast.setOpacity(changes.appearance.opacity);
            }

            if (changes.appearance.size) {
              updateToastWindowSize(windows.toast, changes.appearance.size);
            }

            if (changes.appearance.position) {
              const { positionToastWindow } = require('./shortcuts');
              positionToastWindow(windows.toast, config);
            }
          }
        }

        return true;
      }
      return false;
    } catch (error) {
      logger.error('Error saving config:', error);
      return false;
    }
  });

  // Reset configuration to defaults
  ipcMain.handle('reset-config', async () => {
    try {
      const { resetToDefaults } = require('./config');
      resetToDefaults(config);

      // Send change notification to toast window after settings reset
      if (windows.toast && !windows.toast.isDestroyed()) {
        // sanitizeSubscription 함수를 사용하여 subscription 객체 정리
        const { sanitizeSubscription } = require('./config');
        const subscription = sanitizeSubscription(config.get('subscription'));

        windows.toast.webContents.send('config-updated', {
          pages: config.get('pages'),
          appearance: config.get('appearance'),
          subscription: subscription,
        });
      }

      return true;
    } catch (error) {
      logger.error('Error resetting config:', error);
      return false;
    }
  });

  // Import configuration from file
  ipcMain.handle('import-config', async (event, filePath) => {
    try {
      const { importConfig } = require('./config');
      return await importConfig(config, filePath);
    } catch (error) {
      logger.error('Error importing config:', error);
      return false;
    }
  });

  // Export configuration to file
  ipcMain.handle('export-config', async (event, filePath) => {
    try {
      const { exportConfig } = require('./config');
      return await exportConfig(config, filePath);
    } catch (error) {
      logger.error('Error exporting config:', error);
      return false;
    }
  });

  // Show toast window
  ipcMain.on('show-toast', () => {
    if (windows.toast) {
      windows.toast.show();
      windows.toast.focus();
    }
  });

  // Show window (handle for renderer calls)
  ipcMain.handle('show-window', () => {
    try {
      if (windows.toast && !windows.toast.isDestroyed()) {
        windows.toast.show();
        windows.toast.focus();
        return true;
      }
      return false;
    } catch (error) {
      logger.error('Error showing window:', error);
      return false;
    }
  });

  // Hide toast window
  ipcMain.on('hide-toast', () => {
    if (windows.toast && windows.toast.isVisible()) {
      windows.toast.hide();
    }
  });

  // Show settings window
  ipcMain.on('show-settings', () => {
    const { showSettingsWindow } = require('./windows');
    const { createConfigStore } = require('./config');
    showSettingsWindow(createConfigStore());
  });

  // Show settings window with specific tab selected
  ipcMain.on('show-settings-tab', (event, tabName) => {
    const { showSettingsWindow } = require('./windows');
    const { createConfigStore } = require('./config');

    // tabName 매개변수를 직접 전달하여 설정 창 열기
    showSettingsWindow(createConfigStore(), tabName);

    // 로그에 탭 선택 요청을 기록
    logger.info(`settings-tab 이벤트 발생, 대상 탭: ${tabName}`);
  });

  // Close settings window
  ipcMain.on('close-settings', () => {
    if (windows.settings && !windows.settings.isDestroyed()) {
      // First hide the window then close to prevent flashing
      windows.settings.hide();
      // Close the window after a slight delay
      setTimeout(() => {
        if (windows.settings && !windows.settings.isDestroyed()) {
          windows.settings.close();
        }
      }, 500);
    }
  });

  // Restart application
  ipcMain.on('restart-app', () => {
    const { app } = require('electron');
    app.relaunch();
    app.exit(0);
  });

  // Quit application
  ipcMain.on('quit-app', () => {
    const { app } = require('electron');
    app.quit();
  });

  // Authentication related handlers

  // Start login process
  ipcMain.handle('initiate-login', async () => {
    return await authManager.initiateLogin();
  });

  // Exchange authentication code for token
  ipcMain.handle('exchange-code-for-token', async (event, code) => {
    return await authManager.exchangeCodeForToken(code);
  });

  // Logout
  ipcMain.handle('logout', async () => {
    return await authManager.logout();
  });

  // Get user profile information
  ipcMain.handle('fetch-user-profile', async () => {
    return await authManager.fetchUserProfile();
  });

  // Get user settings information
  ipcMain.handle('get-user-settings', async () => {
    return await authManager.getUserSettings();
  });

  // Get subscription information
  ipcMain.handle('fetch-subscription', async () => {
    return await authManager.fetchSubscription();
  });

  // Return current authentication token
  ipcMain.handle('get-auth-token', async () => {
    return await authManager.getAccessToken();
  });

  // Cloud synchronization related handlers

  // Check if synchronization is possible
  ipcMain.handle('is-cloud-sync-enabled', async () => {
    // const cloudSync = require('./cloud-sync');
    // return await cloudSync.isCloudSyncEnabled();
    return true;
  });

  // Cloud Sync Manager 저장 변수
  let cloudSyncManager = null;

  // 윈도우 초기화 이후 Cloud Sync Manager 초기화
  const cloudSync = require('./cloud-sync');
  cloudSyncManager = cloudSync.initCloudSync(authManager, userDataManager);

  // Settings Synced 이벤트 핸들러 전달
  ipcMain.on('settings-synced', (event, data) => {
    if (windows.toast && !windows.toast.isDestroyed()) {
      windows.toast.webContents.send('settings-synced', data);
    }
    if (windows.settings && !windows.settings.isDestroyed()) {
      windows.settings.webContents.send('settings-synced', data);
    }
  });

  // Get sync status
  ipcMain.handle('get-sync-status', async () => {
    try {
      // 이미 초기화된 cloudSyncManager 사용
      if (cloudSyncManager) {
        // getCurrentStatus() 메서드로 현재 상태 조회
        return cloudSyncManager.getCurrentStatus();
      } else {
        logger.warn('Cloud sync manager not initialized, returning default status');
        return {
          enabled: false,
          deviceId: getDeviceIdentifier(),
          lastSyncTime: 0,
          lastChangeType: null,
        };
      }
    } catch (error) {
      logger.error('Error getting sync status:', error);
      return {
        enabled: false,
        deviceId: getDeviceIdentifier(),
        lastSyncTime: Date.now(),
      };
    }
  });

  // Set cloud sync enabled/disabled
  ipcMain.handle('set-cloud-sync-enabled', async (event, enabled) => {
    try {
      // 동기화 설정 변경 로그
      logger.info(`Setting cloud sync to ${enabled ? 'enabled' : 'disabled'}`);

      // 이미 초기화된 cloudSyncManager 사용
      if (cloudSyncManager) {
        // enable/disable 메서드를 사용하여 클라우드 동기화 활성화/비활성화
        if (enabled) {
          cloudSyncManager.enable();
        } else {
          cloudSyncManager.disable();
        }

        // 구성 저장소에도 설정 저장
        config.set('cloudSync.enabled', enabled);

        // 현재 상태 반환
        return {
          success: true,
          status: cloudSyncManager.getCurrentStatus(),
        };
      } else {
        // 매니저가 초기화되지 않은 경우
        logger.warn('Cloud sync manager not initialized, cannot enable/disable');
        return {
          success: false,
          error: 'Cloud sync manager not initialized',
        };
      }
    } catch (error) {
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

      // 이미 초기화된 cloudSyncManager 사용
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
          if (windows.toast && !windows.toast.isDestroyed()) {
            windows.toast.webContents.send('config-updated', configData);
          }
          if (windows.settings && !windows.settings.isDestroyed()) {
            windows.settings.webContents.send('config-updated', configData);
          }
        }

        return result;
      } else {
        // 매니저가 초기화되지 않은 경우
        logger.warn('Cloud sync manager not initialized, cannot perform manual sync');
        return {
          success: false,
          error: 'Cloud sync manager not initialized',
        };
      }
    } catch (error) {
      logger.error(`Error performing manual sync (${action}):`, error);
      return {
        success: false,
        error: error.message || 'Unknown error',
      };
    }
  });

  // Open URL in external browser
  ipcMain.handle('open-url', async (event, url) => {
    try {
      await shell.openExternal(url);
      return true;
    } catch (error) {
      logger.error('Error opening URL:', error);
      return false;
    }
  });

  // Handlers for shortcut recording
  // Temporarily disable all shortcuts
  ipcMain.handle('temporarily-disable-shortcuts', () => {
    try {
      // Disable all currently set global shortcuts
      unregisterGlobalShortcuts();
      return true;
    } catch (error) {
      logger.error('Error disabling shortcuts:', error);
      return false;
    }
  });

  // Restore shortcuts
  ipcMain.handle('restore-shortcuts', () => {
    try {
      // Register global shortcuts again
      return registerGlobalShortcuts(config, windows);
    } catch (error) {
      logger.error('Error restoring shortcuts:', error);
      return false;
    }
  });

  // Show open dialog
  ipcMain.handle('show-open-dialog', async (event, options) => {
    try {
      // Set modal and parent to ensure dialog appears above toast window
      const modalOptions = {
        ...options,
        modal: true,
        parent: windows.toast,
      };
      return await dialog.showOpenDialog(windows.toast, modalOptions);
    } catch (error) {
      logger.error('Error showing open dialog:', error);
      return { canceled: true, error: error.toString() };
    }
  });

  // Show save dialog
  ipcMain.handle('show-save-dialog', async (event, options) => {
    try {
      // Add modal: true to options to display as modal
      const modalOptions = {
        ...options,
        modal: true,
        // Set toast window as parent to always display above toast window
        parent: windows.toast,
      };
      return await dialog.showSaveDialog(modalOptions);
    } catch (error) {
      logger.error('Error showing save dialog:', error);
      return { canceled: true, error: error.toString() };
    }
  });

  // Show message box
  ipcMain.handle('show-message-box', async (event, options) => {
    try {
      // Add modal: true to options to display as modal
      const modalOptions = {
        ...options,
        modal: true,
        // Set toast window as parent to always display above toast window
        parent: windows.toast,
      };
      return await dialog.showMessageBox(modalOptions);
    } catch (error) {
      logger.error('Error showing message box:', error);
      return { response: 0, error: error.toString() };
    }
  });

  // Get app version
  ipcMain.handle('get-app-version', () => {
    try {
      const { app } = require('electron');
      return app.getVersion();
    } catch (error) {
      return '0.0.0';
    }
  });

  // 업데이트 확인 - electron-updater 사용
  ipcMain.handle('check-latest-version', async () => {
    logger.info('IPC: check-latest-version called');
    // 대신 updater.js의 checkForUpdates를 직접 사용 (silent=false로 설정)
    return await updater.checkForUpdates(false);
  });

  // check-for-updates 핸들러 추가 (electron-updater와 함께 사용)
  ipcMain.handle('check-for-updates', async (event, silent = false) => {
    logger.info('IPC: check-for-updates called, silent:', silent);
    return await updater.checkForUpdates(silent);
  });

  // Download application update - electron-updater 사용
  ipcMain.handle('download-update', async () => {
    logger.info('IPC: download-update called');
    // 대신 updater.js의 downloadUpdate를 직접 사용
    return await updater.downloadUpdate();
  });

  // 자동 업데이트 다운로드 핸들러 추가
  ipcMain.handle('download-auto-update', async () => {
    logger.info('IPC: download-auto-update called');

    try {
      // 먼저 업데이트 확인 (silent=true로 설정하여 UI에 알림 표시 안 함)
      const checkResult = await updater.checkForUpdates(true);

      if (!checkResult || !checkResult.success) {
        logger.warn(
          '업데이트 확인 실패, 다운로드를 진행할 수 없습니다:',
          checkResult?.error || '알 수 없는 오류',
        );
        return {
          success: false,
          error: checkResult?.error || '업데이트 확인에 실패했습니다. 잠시 후 다시 시도해 주세요.',
        };
      }

      if (!checkResult.hasUpdate) {
        logger.info('이미 최신 버전을 사용 중입니다. 다운로드할 업데이트가 없습니다.');
        return {
          success: false,
          error: '이미 최신 버전을 사용 중입니다.',
        };
      }

      // 업데이트가 확인되면 다운로드 진행
      return await updater.downloadUpdate();
    } catch (error) {
      logger.error('자동 업데이트 다운로드 중 오류 발생:', error);
      return {
        success: false,
        error: `자동 업데이트 다운로드 중 오류가 발생했습니다: ${error.message || error}`,
      };
    }
  });

  // 수동 업데이트 다운로드 핸들러 추가 (이전 버전과의 호환성을 위해)
  ipcMain.handle('download-manual-update', async () => {
    logger.info('IPC: download-manual-update called');

    try {
      // 먼저 업데이트 확인 (silent=false로 설정하여 UI에 알림 표시)
      const checkResult = await updater.checkForUpdates(false);

      if (!checkResult || !checkResult.success) {
        logger.warn(
          '업데이트 확인 실패, 다운로드를 진행할 수 없습니다:',
          checkResult?.error || '알 수 없는 오류',
        );
        return {
          success: false,
          error: checkResult?.error || '업데이트 확인에 실패했습니다. 잠시 후 다시 시도해 주세요.',
        };
      }

      if (!checkResult.hasUpdate) {
        logger.info('이미 최신 버전을 사용 중입니다. 다운로드할 업데이트가 없습니다.');
        return {
          success: false,
          error: '이미 최신 버전을 사용 중입니다.',
        };
      }

      // 업데이트가 확인되면 다운로드 진행
      return await updater.downloadUpdate();
    } catch (error) {
      logger.error('수동 업데이트 다운로드 중 오류 발생:', error);
      return {
        success: false,
        error: `수동 업데이트 다운로드 중 오류가 발생했습니다: ${error.message || error}`,
      };
    }
  });

  // Install application update - electron-updater 사용
  ipcMain.handle('install-update', async () => {
    logger.info('IPC: install-update called');
    // 대신 updater.js의 installUpdate를 직접 사용
    return await updater.installUpdate();
  });

  // 자동 업데이트 설치 핸들러 추가
  ipcMain.handle('install-auto-update', async () => {
    logger.info('IPC: install-auto-update called');
    return await updater.installUpdate();
  });

  // 로깅 핸들러 추가
  ipcMain.handle('log-info', (event, message, ...args) => {
    return handleIpcLogging('info', message, ...args);
  });

  ipcMain.handle('log-warn', (event, message, ...args) => {
    return handleIpcLogging('warn', message, ...args);
  });

  ipcMain.handle('log-error', (event, message, ...args) => {
    return handleIpcLogging('error', message, ...args);
  });

  ipcMain.handle('log-debug', (event, message, ...args) => {
    return handleIpcLogging('debug', message, ...args);
  });

  // Test an action (for settings UI)
  ipcMain.handle('test-action', async (event, action) => {
    try {
      // First validate the action
      const validation = await validateAction(action);
      if (!validation.valid) {
        return {
          success: false,
          message: `Invalid action: ${validation.message}`,
        };
      }

      // Then execute it
      return await executeAction(action);
    } catch (error) {
      return {
        success: false,
        message: `Error testing action: ${error.message}`,
        error: error.toString(),
      };
    }
  });

  // Extract app icon from application path
  ipcMain.handle('extract-app-icon', async (event, applicationPath, forceRefresh = false) => {
    try {
      const appName = extractAppNameFromPath(applicationPath);
      if (!appName) {
        return { success: false, error: '앱 이름을 추출할 수 없습니다' };
      }

      const iconPath = await extractAppIcon(appName, null, forceRefresh);
      if (!iconPath) {
        return { success: false, error: '아이콘을 추출할 수 없습니다' };
      }

      return {
        success: true,
        iconUrl: `file://${iconPath}`,
        iconPath,
        appName
      };
    } catch (err) {
      return {
        success: false,
        error: `아이콘 추출 중 오류 발생: ${err.message}`
      };
    }
  });
}

module.exports = {
  setupIpcHandlers,
  isModalOpened,
};
