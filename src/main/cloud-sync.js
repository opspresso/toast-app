/**
 * Toast - Cloud Synchronization Module
 *
 * The cloud synchronization system follows the "single source of truth" principle:
 * - Using ConfigStore as the single source
 * - UserSettings file only stores metadata
 * - User changes → ConfigStore save → Metadata update → API upload
 * - API download → Direct ConfigStore update → Metadata update
 */

const os = require('os');
const { createLogger } = require('./logger');
const { sync: apiSync } = require('./api');
const { createConfigStore } = require('./config');

// Create logger for this module
const logger = createLogger('CloudSync');

// Synchronization related constants
const SYNC_INTERVAL_MS = 15 * 60 * 1000; // Auto-sync every 15 minutes
const SYNC_DEBOUNCE_MS = 2000; // Sync 2 seconds after the last change
const MAX_RETRY_COUNT = 3; // Maximum number of retry attempts
const RETRY_DELAY_MS = 5000; // Retry interval (5 seconds)

// Synchronization module state
const state = {
  enabled: true, // Whether sync is enabled
  isSyncing: false, // Whether sync is currently in progress
  lastSyncTime: 0, // Last synchronization time
  lastChangeType: null, // Last change type
  pendingSync: false, // Whether there's a pending sync
  retryCount: 0, // Current retry count
  deviceId: null, // Device identifier
  timers: {
    sync: null, // Periodic sync timer
    debounce: null, // Debounce timer
  },
};

// External module references
let configStore = null;
let authManager = null;
let userDataManager = null;

/**
 * Generate device identifier
 * @returns {string} Device identifier
 */
function getDeviceIdentifier() {
  const platform = process.platform;
  const hostname = os.hostname();
  const username = os.userInfo().username;
  return `${platform}-${hostname}-${username}`;
}

/**
 * Get current timestamp
 * @returns {number} Current timestamp (milliseconds)
 */
function getCurrentTimestamp() {
  return Date.now();
}

/**
 * Check if synchronization is possible
 * @returns {Promise<boolean>} Whether synchronization is possible
 */
async function canSync() {
  logger.info('=== canSync() called ===');
  logger.info('state.enabled:', state.enabled);
  logger.info('authManager exists:', !!authManager);
  
  if (!state.enabled) {
    logger.info('Cannot synchronize: sync is disabled');
    return false;
  }
  
  if (!authManager) {
    logger.info('Cannot synchronize: auth manager is missing');
    return false;
  }

  try {
    const hasToken = await authManager.hasValidToken();
    logger.info('hasValidToken result:', hasToken);
    
    const result = await apiSync.isCloudSyncEnabled({
      hasValidToken: authManager.hasValidToken,
      configStore,
    });
    logger.info('isCloudSyncEnabled result:', result);
    
    return result;
  } catch (error) {
    logger.error('Error checking if sync is possible:', error);
    return false;
  }
}

/**
 * Start periodic settings synchronization
 */
function startPeriodicSync() {
  stopPeriodicSync();

  state.timers.sync = setInterval(async () => {
    if (await canSync()) {
      logger.info('Performing periodic settings synchronization');
      await downloadSettings();
    }
  }, SYNC_INTERVAL_MS);

  logger.info(
    `Periodic synchronization started (${Math.floor(SYNC_INTERVAL_MS / 60000)} minute interval)`,
  );
}

/**
 * 주기적 설정 동기화 중지
 */
function stopPeriodicSync() {
  if (state.timers.sync) {
    clearInterval(state.timers.sync);
    state.timers.sync = null;
    logger.info('Periodic synchronization stopped');
  }
}

/**
 * 설정 변경 시 동기화 예약
 * @param {string} changeType - 변경 유형 (예: '페이지 추가됨', '버튼 수정됨' 등)
 */
function scheduleSync(changeType) {
  state.lastChangeType = changeType;

  // 이전에 예약된 동기화 취소
  if (state.timers.debounce) {
    clearTimeout(state.timers.debounce);
  }

  // 새로운 동기화 예약
  state.timers.debounce = setTimeout(async () => {
    logger.info(`Starting settings upload for '${changeType}' change`);
    state.retryCount = 0; // 재시도 횟수 초기화
    await uploadSettingsWithRetry();
  }, SYNC_DEBOUNCE_MS);

  logger.info(
    `${changeType} change detected, synchronization scheduled in ${SYNC_DEBOUNCE_MS / 1000} seconds`,
  );
}

/**
 * 재시도 로직이 포함된 설정 업로드
 */
async function uploadSettingsWithRetry() {
  if (state.isSyncing) {
    logger.info('Already syncing, request ignored');
    return;
  }

  try {
    state.isSyncing = true;
    const result = await uploadSettings();

    if (result.success) {
      logger.info(`Cloud synchronization successful for '${state.lastChangeType}' change`);
      state.retryCount = 0;
      state.pendingSync = false;
    } else {
      state.retryCount++;

      logger.info(`Synchronization failed reason: ${result.error}`);

      if (state.retryCount <= MAX_RETRY_COUNT) {
        logger.info(
          `Upload failed, retry ${state.retryCount}/${MAX_RETRY_COUNT} scheduled in ${RETRY_DELAY_MS / 1000} seconds`,
        );

        // 재시도 예약
        setTimeout(() => {
          uploadSettingsWithRetry();
        }, RETRY_DELAY_MS);
      } else {
        logger.error(
          `Maximum retry count (${MAX_RETRY_COUNT}) exceeded, upload failed: ${result.error}`,
        );
        state.retryCount = 0;
      }
    }
  } catch (error) {
    logger.error('설정 업로드 중 오류 발생:', error);
    state.retryCount++;

    if (state.retryCount <= MAX_RETRY_COUNT) {
      logger.info(
        `Upload failed due to exception, retry ${state.retryCount}/${MAX_RETRY_COUNT} scheduled in ${RETRY_DELAY_MS / 1000} seconds`,
      );

      // 재시도 예약
      setTimeout(() => {
        uploadSettingsWithRetry();
      }, RETRY_DELAY_MS);
    } else {
      logger.error(`Maximum retry count (${MAX_RETRY_COUNT}) exceeded, upload canceled`);
      state.retryCount = 0;
    }
  } finally {
    state.isSyncing = false;
  }
}

/**
 * 현재 설정을 서버에 업로드
 * @returns {Promise<Object>} 업로드 결과
 */
async function uploadSettings() {
  logger.info('Starting settings upload');

  // 동기화 상태 확인
  if (!state.enabled) {
    logger.info('Cloud synchronization is disabled, skipping upload');
    return { success: false, error: 'Cloud sync disabled' };
  }

  // 동기화 가능 여부 확인
  if (!(await canSync())) {
    return { success: false, error: 'Cloud sync not enabled' };
  }

  if (state.isSyncing) {
    logger.info('Already syncing, skipping upload');
    return { success: false, error: 'Sync already in progress' };
  }

  try {
    state.isSyncing = true;

    // ConfigStore에서 직접 데이터 추출 (단일 소스)
    const advanced = configStore.get('advanced');
    const appearance = configStore.get('appearance');
    const pages = configStore.get('pages') || [];

    if (pages.length === 0) {
      logger.warn('No page data to upload');
    }

    // 타임스탬프 업데이트
    const timestamp = getCurrentTimestamp();

    // 업로드 데이터 준비 - 다양한 형식 지원을 위해 pages 배열 직접 노출
    const uploadData = {
      advanced,
      appearance,
      lastSyncedAt: timestamp,
      lastSyncedDevice: state.deviceId,
      pages,
    };

    logger.info(`Uploading settings to server with ${pages.length} pages`);

    // API 호출
    const result = await apiSync.uploadSettings({
      hasValidToken: authManager.hasValidToken,
      onUnauthorized: authManager.refreshAccessToken,
      configStore,
      directData: uploadData,
    });

    // 성공 시 마지막 동기화 시간 업데이트
    if (result.success) {
      state.lastSyncTime = timestamp;

      // 동기화 메타데이터만 업데이트
      userDataManager.updateSyncMetadata({
        lastSyncedAt: timestamp,
        lastSyncedDevice: state.deviceId,
      });

      logger.info('Settings upload successful and sync metadata updated');
    }

    return result;
  } catch (error) {
    logger.error('설정 업로드 오류:', error);
    return {
      success: false,
      error: error.message || 'Unknown error',
    };
  } finally {
    state.isSyncing = false;
  }
}

/**
 * 서버에서 설정 다운로드
 * @returns {Promise<Object>} 다운로드 결과
 */
async function downloadSettings() {
  logger.info('Starting settings download');

  // 동기화 상태 확인
  if (!state.enabled) {
    logger.info('Cloud synchronization is disabled, skipping download');
    return { success: false, error: 'Cloud sync disabled' };
  }

  // 동기화 가능 여부 확인
  if (!(await canSync())) {
    return { success: false, error: 'Cloud sync not enabled' };
  }

  if (state.isSyncing) {
    logger.info('Already syncing, skipping download');
    return { success: false, error: 'Sync already in progress' };
  }

  try {
    state.isSyncing = true;

    // 일관된 데이터 형식 유지를 위해 빈 객체 전달
    const result = await apiSync.downloadSettings({
      hasValidToken: authManager.hasValidToken,
      onUnauthorized: authManager.refreshAccessToken,
      configStore,
      directData: {}, // GET 요청에서는 무시됨
    });

    if (result.success) {
      // 서버에서 받은 메타데이터 활용
      let syncMetadata = {};

      if (result.syncMetadata) {
        logger.info('Using sync metadata from server response');
        syncMetadata = {
          lastSyncedAt: result.syncMetadata.lastSyncedAt || getCurrentTimestamp(),
          lastSyncedDevice: state.deviceId,
        };

        // 서버에 마지막 수정 정보가 있으면 그대로 사용
        if (result.syncMetadata.lastModifiedAt) {
          syncMetadata.lastModifiedAt = result.syncMetadata.lastModifiedAt;
          syncMetadata.lastModifiedDevice = result.syncMetadata.lastModifiedDevice || 'server';
        }
      } else {
        logger.info('No metadata in server response, using current timestamp');
        // 서버 응답에 메타데이터가 없는 경우 현재 시간으로 설정
        const timestamp = getCurrentTimestamp();
        syncMetadata = {
          lastSyncedAt: timestamp,
          lastModifiedAt: timestamp,
          lastSyncedDevice: state.deviceId,
          lastModifiedDevice: state.deviceId,
        };
      }

      // 시간 정보 업데이트
      state.lastSyncTime = syncMetadata.lastSyncedAt;

      // 메타데이터 업데이트
      userDataManager.updateSyncMetadata(syncMetadata);

      logger.info('Settings download successful and sync metadata updated:', syncMetadata);

      // 인증 관리자를 통해 UI 업데이트 알림 전송
      if (authManager && typeof authManager.notifySettingsSynced === 'function') {
        // 다운로드된 설정으로 UI 업데이트
        const configData = {
          pages: configStore.get('pages'),
          appearance: configStore.get('appearance'),
          advanced: configStore.get('advanced'),
          subscription: configStore.get('subscription'),
        };

        authManager.notifySettingsSynced(configData);
        logger.info('UI update notification sent to toast window');
      }
    } else {
      logger.error('Settings download failed:', result.error);
    }

    return result;
  } catch (error) {
    logger.error('설정 다운로드 오류:', error);
    return {
      success: false,
      error: error.message || 'Unknown error',
    };
  } finally {
    state.isSyncing = false;
  }
}

/**
 * 설정 충돌 해결 및 동기화
 * @param {string} action - 동기화 동작 ('upload', 'download', 'resolve')
 * @returns {Promise<Object>} 동기화 결과
 */
async function syncSettings(action = 'resolve') {
  logger.info(`Manual synchronization request: ${action}`);

  try {
    if (action === 'upload') {
      return await uploadSettings();
    } else if (action === 'download') {
      return await downloadSettings();
    } else {
      // 충돌 해결 (타임스탬프 기반)

      // 1. 현재 로컬 설정 가져오기
      const localSettings = await userDataManager.getUserSettings();

      // 2. 서버 설정 다운로드
      const serverResult = await apiSync.downloadSettings({
        hasValidToken: authManager.hasValidToken,
        onUnauthorized: authManager.refreshAccessToken,
        configStore,
        directData: {}, // GET 요청에서는 무시됨
      });

      if (!serverResult.success) {
        logger.error('Server settings download failed:', serverResult.error);
        return serverResult;
      }

      // 3. 설정 병합
      const serverSettings = serverResult.data;
      const mergedSettings = mergeSettings(localSettings, serverSettings);

      // 4. 병합된 설정 저장
      userDataManager.updateSettings(mergedSettings);

      // 5. 필요한 경우 병합된 설정 업로드
      if (localSettings && localSettings.lastModifiedAt > (serverSettings?.lastModifiedAt || 0)) {
        logger.info('Local settings are more recent. Uploading merged settings to the server.');
        await uploadSettings();
      }

      return { success: true, message: 'Settings synchronization completed' };
    }
  } catch (error) {
    logger.error('수동 동기화 오류:', error);
    return {
      success: false,
      error: error.message || 'Unknown error',
    };
  }
}

/**
 * 충돌 해결 및 설정 병합
 * @param {Object} localSettings - 로컬 설정
 * @param {Object} serverSettings - 서버 설정
 * @returns {Object} 병합된 설정
 */
function mergeSettings(localSettings, serverSettings) {
  if (!localSettings) return serverSettings;
  if (!serverSettings) return localSettings;

  // 타임스탬프 기반 충돌 해결
  const localTime = localSettings.lastModifiedAt || 0;
  const serverTime = serverSettings.lastModifiedAt || 0;

  logger.info(
    `Settings merge: Local(${new Date(localTime).toISOString()}) vs Server(${new Date(serverTime).toISOString()})`,
  );

  // 서버 설정이 더 최신인 경우
  if (serverTime > localTime) {
    logger.info('Server settings are more recent. Applying server settings with priority.');
    return {
      ...localSettings,
      ...serverSettings,
      lastSyncedAt: getCurrentTimestamp(),
    };
  }

  // 로컬 설정이 더 최신인 경우
  logger.info('Local settings are more recent. Applying local settings with priority.');
  return {
    ...serverSettings,
    ...localSettings,
    lastSyncedAt: getCurrentTimestamp(),
  };
}

/**
 * 동기화 기능 활성화/비활성화
 * @param {boolean} enabled - 활성화 여부
 */
function setEnabled(enabled) {
  state.enabled = enabled;
  logger.info(`Cloud synchronization ${enabled ? 'enabled' : 'disabled'}`);

  if (enabled) {
    startPeriodicSync();
  } else {
    stopPeriodicSync();
  }
}

/**
 * 설정 변경에 대한 이벤트 리스너 등록
 */
function setupConfigListeners() {
  // 페이지 설정 변경 감지
  configStore.onDidChange('pages', async (newValue, oldValue) => {
    logger.info('=== Pages change detected ===');
    logger.info('Sync state.enabled:', state.enabled);
    logger.info('Old pages length:', Array.isArray(oldValue) ? oldValue.length : 'Not array');
    logger.info('New pages length:', Array.isArray(newValue) ? newValue.length : 'Not array');
    
    // 동기화 가능 여부 확인
    const canSyncResult = await canSync();
    logger.info('canSync() result:', canSyncResult);
    
    // 동기화가 비활성화되었거나 로그인하지 않은 경우 동기화 건너뛰기
    if (!state.enabled) {
      logger.info('Sync disabled - state.enabled is false');
      return;
    }
    
    if (!canSyncResult) {
      logger.info('Cannot sync - canSync() returned false');
      return;
    }

    // 변경 유형 감지 (더 정확한 deep comparison 포함)
    let changeType = 'unknown_change';
    let hasRealChange = false;

    if (Array.isArray(newValue) && Array.isArray(oldValue)) {
      if (newValue.length > oldValue.length) {
        changeType = 'page_added';
        hasRealChange = true;
      } else if (newValue.length < oldValue.length) {
        changeType = 'page_deleted';
        hasRealChange = true;
      } else {
        // 길이가 같은 경우 deep comparison으로 실제 변경사항 확인
        const oldJson = JSON.stringify(oldValue);
        const newJson = JSON.stringify(newValue);
        
        if (oldJson !== newJson) {
          changeType = 'page_content_modified';
          hasRealChange = true;
          
          // 더 자세한 변경 유형 감지
          for (let i = 0; i < newValue.length; i++) {
            const oldPage = oldValue[i] || {};
            const newPage = newValue[i] || {};
            
            if (JSON.stringify(oldPage) !== JSON.stringify(newPage)) {
              logger.info(`Page ${i} modified:`);
              logger.info('Old page buttons:', oldPage.buttons?.length || 0);
              logger.info('New page buttons:', newPage.buttons?.length || 0);
              
              if (oldPage.buttons?.length !== newPage.buttons?.length) {
                changeType = 'button_added_or_removed';
              } else {
                changeType = 'button_modified';
              }
              break;
            }
          }
        }
      }
    }
    
    logger.info('Change type:', changeType);
    logger.info('Has real change:', hasRealChange);
    
    // 실제 변경사항이 없으면 동기화 건너뛰기
    if (!hasRealChange) {
      logger.info('No real changes detected, skipping sync');
      return;
    }

    logger.info(`Page settings change detected (${changeType})`);

    // 메타데이터만 업데이트
    const timestamp = getCurrentTimestamp();
    userDataManager.updateSyncMetadata({
      lastModifiedAt: timestamp,
      lastModifiedDevice: state.deviceId,
    });

    logger.info('Settings file metadata update completed');

    // 동기화 예약
    scheduleSync(changeType);
  });

  // 외관 설정 변경 감지
  configStore.onDidChange('appearance', async (newValue, oldValue) => {
    if (!state.enabled || !(await canSync())) {
      return;
    }

    logger.info('Appearance settings change detected');

    // 메타데이터만 업데이트
    const timestamp = getCurrentTimestamp();
    userDataManager.updateSyncMetadata({
      lastModifiedAt: timestamp,
      lastModifiedDevice: state.deviceId,
    });

    logger.info('Settings file metadata update completed');

    // 동기화 예약
    scheduleSync('appearance_changed');
  });

  // 고급 설정 변경 감지
  configStore.onDidChange('advanced', async (newValue, oldValue) => {
    if (!state.enabled || !(await canSync())) {
      return;
    }

    logger.info('Advanced settings change detected');

    // 메타데이터만 업데이트
    const timestamp = getCurrentTimestamp();
    userDataManager.updateSyncMetadata({
      lastModifiedAt: timestamp,
      lastModifiedDevice: state.deviceId,
    });

    logger.info('Settings file metadata update completed');

    // 동기화 예약
    scheduleSync('advanced_settings_changed');
  });
}

/**
 * 클라우드 동기화 초기화
 * @param {Object} authManagerInstance - 인증 관리자 인스턴스
 * @param {Object} userDataManagerInstance - 사용자 데이터 관리자 인스턴스
 * @param {Object} configStoreInstance - 설정 저장소 인스턴스 (선택적)
 * @returns {Object} 동기화 관리자 객체
 */
function initCloudSync(authManagerInstance, userDataManagerInstance, configStoreInstance = null) {
  logger.info('Starting cloud synchronization initialization');

  // 인증 관리자 참조 설정
  setAuthManager(authManagerInstance);

  // 사용자 데이터 관리자 참조 설정
  setUserDataManager(userDataManagerInstance);

  // 설정 저장소 설정 (외부에서 전달받은 인스턴스 사용 또는 새로 생성)
  if (configStoreInstance) {
    configStore = configStoreInstance;
    logger.info('Using provided config store instance');
  } else {
    configStore = createConfigStore();
    logger.info('Created new config store instance');
  }

  // 장치 정보 초기화
  state.deviceId = getDeviceIdentifier();
  logger.info(`Device ID: ${state.deviceId}`);

  // 동기화 기본 활성화 (중요: 기본값을 true로 설정)
  state.enabled = true;
  logger.info('Cloud sync enabled by default');

  // 설정 변경 감지 이벤트 등록
  setupConfigListeners();

  // 주기적 동기화 자동 시작 (중요!)
  logger.info('Starting periodic sync automatically');
  startPeriodicSync();

  // 인터페이스 객체 생성
  const syncManager = {
    // 기본 인터페이스
    unsubscribe: () => {
      // 타이머 중지
      stopPeriodicSync();

      // 디바운스 타이머 취소
      if (state.timers.debounce) {
        clearTimeout(state.timers.debounce);
        state.timers.debounce = null;
      }

      logger.info('Cloud synchronization unsubscribed');
    },
    enable: () => {
      setEnabled(true);
    },
    disable: () => {
      setEnabled(false);
    },
    getLastSyncStatus: () => ({
      success: state.lastSyncTime > 0,
      timestamp: state.lastSyncTime,
    }),
    syncAfterLogin: async () => {
      logger.info('Performing cloud synchronization after login');

      // 로그인 후 다운로드 우선
      const result = await downloadSettings();

      // 다운로드 성공 후 추가 UI 업데이트
      if (result.success) {
        // settings-window에 현재 설정 전달하여 UI 업데이트
        if (authManager && typeof authManager.notifySettingsSynced === 'function') {
          // 현재 설정 데이터 수집
          const configData = {
            pages: configStore.get('pages'),
            appearance: configStore.get('appearance'),
            advanced: configStore.get('advanced'),
            subscription: configStore.get('subscription'),
          };

          // UI에 알림 전송 - 토스트 창의 버튼/페이지 업데이트 위함
          authManager.notifySettingsSynced(configData);
          logger.info('Login sync: UI update notification sent for current settings');
        }
      }

      // 동기화 활성화
      if (state.enabled) {
        startPeriodicSync();
      }

      return result;
    },
    manualSync: async (action = 'resolve') => {
      return await syncSettings(action);
    },

    // 추가 인터페이스
    startPeriodicSync,
    stopPeriodicSync,
    getCurrentStatus: () => ({
      enabled: state.enabled,
      deviceId: state.deviceId,
      lastChangeType: state.lastChangeType,
      lastSyncTime: state.lastSyncTime,
    }),
  };

  return syncManager;
}

/**
 * 인증 관리자 참조 설정
 * @param {Object} manager - 인증 관리자 인스턴스
 */
function setAuthManager(manager) {
  authManager = manager;
  logger.info('Authentication manager reference setup complete');
}

/**
 * 사용자 데이터 관리자 참조 설정
 * @param {Object} manager - 사용자 데이터 관리자 인스턴스
 */
function setUserDataManager(manager) {
  userDataManager = manager;
  logger.info('User data manager reference setup complete');
}

/**
 * 클라우드 동기화 설정 업데이트 (이전 버전과의 호환성 유지)
 * @param {boolean} enabled - 활성화 여부
 */
function updateCloudSyncSettings(enabled) {
  setEnabled(enabled);
}

module.exports = {
  initCloudSync,
  setAuthManager,
  setUserDataManager,
  startPeriodicSync,
  stopPeriodicSync,
  uploadSettings,
  downloadSettings,
  syncSettings,
  updateCloudSyncSettings,
};
