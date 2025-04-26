/**
 * Toast - Cloud Synchronization Module
 *
 * This module synchronizes Toast-App settings (pages and button information, etc.) with the Toast-Web server.
 * Synchronization points:
 * 1. On successful login (download from server)
 * 2. When settings change (local save then server upload)
 * 3. Periodic synchronization (15-minute intervals)
 * 4. At app startup (if already logged in)
 * 5. On manual synchronization request
 */

const os = require('os');
const { createLogger } = require('./logger');
const { sync: apiSync } = require('./api');
const { createConfigStore } = require('./config');

// 모듈별 로거 생성
const logger = createLogger('CloudSync');

// Synchronization related constants
const SYNC_INTERVAL_MS = 15 * 60 * 1000; // Automatic sync every 15 minutes
const SYNC_DEBOUNCE_MS = 2000; // Sync 2 seconds after the last change
const MAX_RETRY_COUNT = 3; // Maximum retry count
const RETRY_DELAY_MS = 5000; // Retry interval (5 seconds)

// Synchronization module state
const state = {
  enabled: true,
  isSyncing: false,
  lastSyncTime: 0,
  lastChangeType: null,
  pendingSync: false,
  retryCount: 0,
  deviceId: null,
  timers: {
    sync: null,
    debounce: null,
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
  if (!state.enabled || !authManager) {
    logger.info('Synchronization disabled or no authentication manager, sync not possible');
    return false;
  }

  try {
    return await apiSync.isCloudSyncEnabled({
      hasValidToken: authManager.hasValidToken,
      configStore,
    });
  } catch (error) {
    logger.error('Error checking synchronization availability:', error);
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
    `Periodic synchronization started (${Math.floor(SYNC_INTERVAL_MS / 60000)}-minute interval)`,
  );
}

/**
 * Stop periodic settings synchronization
 */
function stopPeriodicSync() {
  if (state.timers.sync) {
    clearInterval(state.timers.sync);
    state.timers.sync = null;
    logger.info('Periodic synchronization stopped');
  }
}

/**
 * Schedule synchronization when settings change
 * @param {string} changeType - Change type (e.g., 'Page added', 'Button modified', etc.)
 */
function scheduleSync(changeType) {
  state.lastChangeType = changeType;

  // Cancel previously scheduled synchronization
  if (state.timers.debounce) {
    clearTimeout(state.timers.debounce);
  }

  // Schedule new synchronization
  state.timers.debounce = setTimeout(async () => {
    logger.info(`Starting settings upload for change type '${changeType}'`);
    state.retryCount = 0; // Reset retry count
    await uploadSettingsWithRetry();
  }, SYNC_DEBOUNCE_MS);

  logger.info(
    `${changeType} change detected, synchronization scheduled in ${SYNC_DEBOUNCE_MS / 1000} seconds`,
  );
}

/**
 * Upload settings to server with retry logic
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
      logger.info(`Cloud sync successful for '${state.lastChangeType}' change`);
      state.retryCount = 0;
      state.pendingSync = false;
    } else {
      state.retryCount++;

      logger.info(`Sync failed reason: ${result.error}`);

      if (state.retryCount <= MAX_RETRY_COUNT) {
        logger.info(
          `Upload failed, retry ${state.retryCount}/${MAX_RETRY_COUNT} scheduled in ${RETRY_DELAY_MS / 1000} seconds`,
        );

        // Schedule retry
        setTimeout(() => {
          uploadSettingsWithRetry();
        }, RETRY_DELAY_MS);
      } else {
        logger.error(
          `Exceeded maximum retry count (${MAX_RETRY_COUNT}), upload failed: ${result.error}`,
        );
        state.retryCount = 0;
      }
    }
  } catch (error) {
    logger.error('Error during settings upload:', error);
    state.retryCount++;

    if (state.retryCount <= MAX_RETRY_COUNT) {
      logger.info(
        `Upload failed due to exception, retry ${state.retryCount}/${MAX_RETRY_COUNT} scheduled in ${RETRY_DELAY_MS / 1000} seconds`,
      );

      // Schedule retry
      setTimeout(() => {
        uploadSettingsWithRetry();
      }, RETRY_DELAY_MS);
    } else {
      logger.error(`Exceeded maximum retry count (${MAX_RETRY_COUNT}), upload aborted`);
      state.retryCount = 0;
    }
  } finally {
    state.isSyncing = false;
  }
}

/**
 * Upload current settings to server
 * @returns {Promise<Object>} Upload result
 */
async function uploadSettings() {
  logger.info('Starting settings upload');

  // Check sync state
  if (!state.enabled) {
    logger.info('Cloud sync disabled, skipping upload');
    return { success: false, error: 'Cloud sync disabled' };
  }

  // Verify sync capability
  if (!(await canSync())) {
    return { success: false, error: 'Cloud sync not enabled' };
  }

  if (state.isSyncing) {
    logger.info('Already syncing, skipping upload');
    return { success: false, error: 'Already syncing' };
  }

  try {
    state.isSyncing = true;

    // Extract data directly from configStore (single source of truth)
    const advanced = configStore.get('advanced');
    const appearance = configStore.get('appearance');
    const pages = configStore.get('pages') || [];

    if (pages.length === 0) {
      logger.warn('No page data to upload');
    }

    // Update timestamp
    const timestamp = getCurrentTimestamp();

    // Prepare upload data - expose pages array directly to support multiple formats
    const uploadData = {
      advanced,
      appearance,
      lastSyncedAt: timestamp,
      lastSyncedDevice: state.deviceId,
      pages,
    };

    logger.info(`Uploading settings with ${pages.length} pages to server`);

    // API call
    const result = await apiSync.uploadSettings({
      hasValidToken: authManager.hasValidToken,
      onUnauthorized: authManager.refreshAccessToken,
      configStore,
      directData: uploadData,
    });

    // Update last sync time on success
    if (result.success) {
      state.lastSyncTime = timestamp;

      // Update sync metadata only
      userDataManager.updateSyncMetadata({
        lastSyncedAt: timestamp,
        lastSyncedDevice: state.deviceId,
      });

      logger.info('Settings upload successful and sync metadata updated');
    }

    return result;
  } catch (error) {
    logger.error('Settings upload error:', error);
    return {
      success: false,
      error: error.message || 'Unknown error',
    };
  } finally {
    state.isSyncing = false;
  }
}

/**
 * Download settings from server
 * @returns {Promise<Object>} Download result
 */
async function downloadSettings() {
  logger.info('Starting settings download');

  // Check sync state
  if (!state.enabled) {
    logger.info('Cloud sync disabled, skipping download');
    return { success: false, error: 'Cloud sync disabled' };
  }

  // Verify sync capability
  if (!(await canSync())) {
    return { success: false, error: 'Cloud sync not enabled' };
  }

  if (state.isSyncing) {
    logger.info('Already syncing, skipping download');
    return { success: false, error: 'Already syncing' };
  }

  try {
    state.isSyncing = true;

    // Pass empty object to maintain consistent data format
    const result = await apiSync.downloadSettings({
      hasValidToken: authManager.hasValidToken,
      onUnauthorized: authManager.refreshAccessToken,
      configStore,
      directData: {}, // Empty object is ignored in GET request
    });

    if (result.success) {
      // 서버에서 받은 메타데이터가 있는 경우 활용
      let syncMetadata = {};

      if (result.syncMetadata) {
        logger.info('Using sync metadata from server response');
        syncMetadata = {
          lastSyncedAt: result.syncMetadata.lastSyncedAt || getCurrentTimestamp(),
          lastSyncedDevice: state.deviceId,
        };

        // 서버에서 마지막 수정 정보가 있으면 그대로 사용
        if (result.syncMetadata.lastModifiedAt) {
          syncMetadata.lastModifiedAt = result.syncMetadata.lastModifiedAt;
          syncMetadata.lastModifiedDevice = result.syncMetadata.lastModifiedDevice || 'server';
        }
      } else {
        logger.info('No sync metadata in server response, using current timestamp');
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
    logger.error('Settings download error:', error);
    return {
      success: false,
      error: error.message || 'Unknown error',
    };
  } finally {
    state.isSyncing = false;
  }
}

/**
 * Resolve settings conflicts and synchronize
 * @param {string} action - Synchronization action ('upload', 'download', 'resolve')
 * @returns {Promise<Object>} Synchronization result
 */
async function syncSettings(action = 'resolve') {
  logger.info(`Manual synchronization request: ${action}`);

  // // Additional debugging information
  // const syncCheckResult = await canSync();
  // logger.debug('Manual sync canSync result:', syncCheckResult);

  // if (!syncCheckResult) {
  //   return { success: false, error: 'Cloud sync not enabled' };
  // }

  try {
    if (action === 'upload') {
      return await uploadSettings();
    } else if (action === 'download') {
      return await downloadSettings();
    } else {
      // Conflict resolution (timestamp-based)

      // 1. Get current local settings
      const localSettings = await userDataManager.getUserSettings();

      // 2. Download server settings - standardize as data object format
      const serverResult = await apiSync.downloadSettings({
        hasValidToken: authManager.hasValidToken,
        onUnauthorized: authManager.refreshAccessToken,
        configStore,
        directData: {}, // Empty object is ignored in GET request
      });

      if (!serverResult.success) {
        logger.error('Server settings download failed:', serverResult.error);
        return serverResult;
      }

      // 3. Merge settings
      const serverSettings = serverResult.data;
      const mergedSettings = mergeSettings(localSettings, serverSettings);

      // 4. Save merged settings
      userDataManager.updateSettings(mergedSettings);

      // 5. Upload merged settings if needed
      if (localSettings && localSettings.lastModifiedAt > (serverSettings?.lastModifiedAt || 0)) {
        logger.info('Local settings are more recent. Uploading merged settings to server.');
        await uploadSettings();
      }

      return { success: true, message: 'Settings synchronization complete' };
    }
  } catch (error) {
    logger.error('Manual synchronization error:', error);
    return {
      success: false,
      error: error.message || 'Unknown error',
    };
  }
}

/**
 * Resolve conflicts and merge settings
 * @param {Object} localSettings - Local settings
 * @param {Object} serverSettings - Server settings
 * @returns {Object} Merged settings
 */
function mergeSettings(localSettings, serverSettings) {
  if (!localSettings) return serverSettings;
  if (!serverSettings) return localSettings;

  // Timestamp-based conflict resolution
  const localTime = localSettings.lastModifiedAt || 0;
  const serverTime = serverSettings.lastModifiedAt || 0;

  logger.info(
    `Settings merge: Local(${new Date(localTime).toISOString()}) vs Server(${new Date(serverTime).toISOString()})`,
  );

  // If server settings are more recent
  if (serverTime > localTime) {
    logger.info('Server settings are more recent. Applying server settings with priority');
    return {
      ...localSettings,
      ...serverSettings,
      lastSyncedAt: getCurrentTimestamp(),
    };
  }

  // If local settings are more recent
  logger.info('Local settings are more recent. Applying local settings with priority');
  return {
    ...serverSettings,
    ...localSettings,
    lastSyncedAt: getCurrentTimestamp(),
  };
}

/**
 * Enable/disable synchronization feature
 * @param {boolean} enabled - Whether to enable
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
 * Register event listeners for config changes
 */
function setupConfigListeners() {
  // Page settings change detection
  configStore.onDidChange('pages', async (newValue, oldValue) => {
    // Skip synchronization if disabled or not logged in
    if (!state.enabled || !(await canSync())) {
      return;
    }

    // Detect change type
    let changeType = 'Unknown change';

    if (Array.isArray(newValue) && Array.isArray(oldValue)) {
      if (newValue.length > oldValue.length) {
        changeType = 'Page added';
      } else if (newValue.length < oldValue.length) {
        changeType = 'Page deleted';
      } else {
        changeType = 'Button modified';
      }
    }

    logger.info(`Page settings change detected (${changeType})`);

    // Update metadata only
    const timestamp = getCurrentTimestamp();
    userDataManager.updateSyncMetadata({
      lastModifiedAt: timestamp,
      lastModifiedDevice: state.deviceId,
    });

    logger.info('Settings file metadata update complete');

    // Schedule synchronization
    scheduleSync(changeType);
  });

  // Appearance settings change detection
  configStore.onDidChange('appearance', async (newValue, oldValue) => {
    if (!state.enabled || !(await canSync())) {
      return;
    }

    logger.info('Appearance settings change detected');

    // Update metadata only
    const timestamp = getCurrentTimestamp();
    userDataManager.updateSyncMetadata({
      lastModifiedAt: timestamp,
      lastModifiedDevice: state.deviceId,
    });

    logger.info('Settings file metadata update complete');

    // Schedule synchronization
    scheduleSync('Appearance change');
  });

  // Advanced settings change detection
  configStore.onDidChange('advanced', async (newValue, oldValue) => {
    if (!state.enabled || !(await canSync())) {
      return;
    }

    logger.info('Advanced settings change detected');

    // Update metadata only
    const timestamp = getCurrentTimestamp();
    userDataManager.updateSyncMetadata({
      lastModifiedAt: timestamp,
      lastModifiedDevice: state.deviceId,
    });

    logger.info('Settings file metadata update complete');

    // Schedule synchronization
    scheduleSync('Advanced settings change');
  });
}

/**
 * Initialize cloud synchronization
 * @returns {Object} Synchronization manager object
 */
function initCloudSync(authManager, userDataManager) {
  logger.info('Starting cloud synchronization initialization');

  // Set authentication manager reference
  setAuthManager(authManager);

  // Set user data manager reference
  setUserDataManager(userDataManager);

  // Create configuration store
  configStore = createConfigStore();

  // Initialize device information
  state.deviceId = getDeviceIdentifier();
  logger.info(`Device ID: ${state.deviceId}`);

  // Register settings change detection events
  setupConfigListeners();

  // Create interface object
  const syncManager = {
    // Basic interface
    unsubscribe: () => {
      // Stop timer
      stopPeriodicSync();

      // Cancel debounce timer
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

      // Prioritize download after login
      const result = await downloadSettings();

      // 다운로드 성공 후 추가적인 UI 업데이트를 위한 처리
      if (result.success) {
        // settings-window에 현재 설정을 전달하여 UI 업데이트
        if (authManager && typeof authManager.notifySettingsSynced === 'function') {
          // 현재 설정 데이터 수집
          const configData = {
            pages: configStore.get('pages'),
            appearance: configStore.get('appearance'),
            advanced: configStore.get('advanced'),
            subscription: configStore.get('subscription'),
          };

          // UI에 알림 전송 - 이것은 토스트 창의 버튼/페이지를 업데이트하기 위함
          authManager.notifySettingsSynced(configData);
          logger.info('Login sync: UI update notification sent for current settings');
        }
      }

      // Enable synchronization
      if (state.enabled) {
        startPeriodicSync();
      }

      return result;
    },
    manualSync: async (action = 'resolve') => {
      return await syncSettings(action);
    },

    // Additional interface
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
 * Set authentication manager reference
 * @param {Object} manager - Authentication manager instance
 */
function setAuthManager(manager) {
  authManager = manager;
  logger.info('Authentication manager reference setup complete');
}

/**
 * Set user data manager reference
 * @param {Object} manager - User data manager instance
 */
function setUserDataManager(manager) {
  userDataManager = manager;
  logger.info('User data manager reference setup complete');
}

/**
 * Update cloud synchronization settings (maintain compatibility with previous versions)
 * @param {boolean} enabled - Whether to enable synchronization
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
