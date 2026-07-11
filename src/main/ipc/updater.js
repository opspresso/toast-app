/**
 * Toast - Updater IPC Handlers
 *
 * Handlers for checking, downloading, and installing application updates.
 */

const { ipcMain } = require('electron');
const updater = require('../updater');
const { createLogger } = require('../logger');

const logger = createLogger('IPC');

/**
 * Set up updater IPC handlers
 */
function setupUpdaterHandlers() {
  // Check for updates - using electron-updater
  ipcMain.handle('check-latest-version', async () => {
    logger.info('IPC: check-latest-version called');
    // Use updater.js's checkForUpdates directly instead (with silent=false)
    return await updater.checkForUpdates(false);
  });

  // Add check-for-updates handler (used with electron-updater)
  ipcMain.handle('check-for-updates', async (event, silent = false) => {
    logger.info('IPC: check-for-updates called, silent:', silent);
    return await updater.checkForUpdates(silent);
  });

  // Download application update - using electron-updater
  ipcMain.handle('download-update', async () => {
    logger.info('IPC: download-update called');
    // Use updater.js's downloadUpdate directly instead
    return await updater.downloadUpdate();
  });

  // Add auto-update download handler
  ipcMain.handle('download-auto-update', async () => {
    logger.info('IPC: download-auto-update called');

    try {
      // Check for updates first (with silent=true so no notification is shown in the UI)
      const checkResult = await updater.checkForUpdates(true);

      if (!checkResult || !checkResult.success) {
        logger.warn('Update check failed, cannot proceed with download:', checkResult?.error || 'Unknown error');
        return {
          success: false,
          error: checkResult?.error || 'Failed to check for updates. Please try again later.',
        };
      }

      if (!checkResult.hasUpdate) {
        logger.info('Already on the latest version. No updates to download.');
        return {
          success: false,
          error: 'You are already on the latest version.',
        };
      }

      // Proceed with the download once an update is confirmed
      return await updater.downloadUpdate();
    }
    catch (error) {
      logger.error('Error during auto-update download:', error);
      return {
        success: false,
        error: `An error occurred during the auto-update download: ${error.message || error}`,
      };
    }
  });

  // Add manual update download handler (for backward compatibility)
  ipcMain.handle('download-manual-update', async () => {
    logger.info('IPC: download-manual-update called');

    try {
      // Check for updates first (with silent=false so a notification is shown in the UI)
      const checkResult = await updater.checkForUpdates(false);

      if (!checkResult || !checkResult.success) {
        logger.warn('Update check failed, cannot proceed with download:', checkResult?.error || 'Unknown error');
        return {
          success: false,
          error: checkResult?.error || 'Failed to check for updates. Please try again later.',
        };
      }

      if (!checkResult.hasUpdate) {
        logger.info('Already on the latest version. No updates to download.');
        return {
          success: false,
          error: 'You are already on the latest version.',
        };
      }

      // Proceed with the download once an update is confirmed
      return await updater.downloadUpdate();
    }
    catch (error) {
      logger.error('Error during manual update download:', error);
      return {
        success: false,
        error: `An error occurred during the manual update download: ${error.message || error}`,
      };
    }
  });

  // Install application update - using electron-updater
  ipcMain.handle('install-update', async () => {
    logger.info('IPC: install-update called');
    // Use updater.js's installUpdate directly instead
    return await updater.installUpdate();
  });

  // Add auto-update install handler
  ipcMain.handle('install-auto-update', async () => {
    logger.info('IPC: install-auto-update called');
    return await updater.installUpdate();
  });
}

module.exports = {
  setupUpdaterHandlers,
};
