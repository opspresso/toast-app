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
  // The manager is initialized once by src/index.js via initCloudSync; here we only read it
  const getCloudSyncManager = () => require('../cloud-sync').getSyncManager();

  // Forward the Settings Synced event handler
  ipcMain.on('settings-synced', (event, data) => {
    broadcastToWindows(windows, 'settings-synced', data);
  });

  // Get sync status
  ipcMain.handle('get-sync-status', async () => {
    try {
      const cloudSyncManager = getCloudSyncManager();
      if (cloudSyncManager) {
        // Get current status via the getCurrentStatus() method
        return cloudSyncManager.getCurrentStatus();
      }
      else {
        // If CloudSyncManager cannot be initialized, read the actual status from the Config Store
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

      // Even on error, try to read the status from the Config Store
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
      // Log the sync setting change
      logger.info(`Setting cloud sync to ${enabled ? 'enabled' : 'disabled'}`);

      const cloudSyncManager = getCloudSyncManager();
      if (cloudSyncManager) {
        // Enable/disable cloud sync using the enable/disable methods
        if (enabled) {
          cloudSyncManager.enable();
        }
        else {
          cloudSyncManager.disable();
        }

        // Return the current status (CloudSyncManager is the single source of truth)
        return {
          success: true,
          status: cloudSyncManager.getCurrentStatus(),
        };
      }
      else {
        // When the manager is not initialized
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
      // Validation
      if (!['upload', 'download', 'resolve'].includes(action)) {
        throw new Error(`Invalid sync action: ${action}`);
      }

      const cloudSyncManager = getCloudSyncManager();
      if (cloudSyncManager) {
        // Perform manual sync
        logger.info(`Performing manual sync action: ${action}`);
        const result = await cloudSyncManager.manualSync(action);

        // If the sync result is successful, send a UI update message
        if (result.success) {
          // Collect current configuration data
          const configData = {
            pages: config.get('pages'),
            snippets: config.get('snippets'),
            appearance: config.get('appearance'),
            advanced: config.get('advanced'),
            subscription: config.get('subscription'),
          };

          // Sync completion notification (includes configuration data)
          broadcastToWindows(windows, 'config-updated', configData);
        }

        return result;
      }
      else {
        // When the manager is not initialized
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
