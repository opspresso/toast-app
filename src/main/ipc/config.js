/**
 * Toast - Configuration IPC Handlers
 *
 * Handlers for reading, writing, importing, exporting, and resetting config.
 */

const { ipcMain } = require('electron');
const { applyNativePreferences } = require('../native-preferences');
const { getSessionVersion } = require('../api/client');
const { validatePages } = require('../action-validation');
const { mergeSettings, SyncConflict } = require('../cloud-sync/merge');
const { broadcastToWindows } = require('../broadcast');
const { createLogger } = require('../logger');

const logger = createLogger('IPC');

/**
 * Set up configuration IPC handlers
 * @param {Object} windows - Object containing application windows
 * @param {Object} config - Shared config store
 */
function setupConfigHandlers(windows, config) {
  // Get configuration
  ipcMain.handle('get-config', (event, key) => {
    try {
      if (key) {
        return config.get(key);
      }
      else {
        return { ...config.store, authSessionVersion: getSessionVersion() };
      }
    }
    catch (error) {
      logger.error('Error getting config:', error);
      return null;
    }
  });

  // Set configuration
  ipcMain.handle('set-config', (event, key, value) => {
    try {
      const allowed = ['globalHotkey', 'appearance', 'advanced'];
      const keys = key === null && value && typeof value === 'object' ? Object.keys(value) : [key];
      if (keys.some(name => typeof name !== 'string' || !allowed.includes(name.split('.')[0]))) {
        return false;
      }
      logger.info('=== set-config called ===');
      logger.info('Key:', key);
      if (key === null && typeof value === 'object') {
        // Set entire config
        config.set(value);
      }
      else {
        // Set specific key
        config.set(key, value);
      }

      applyNativePreferences(config, windows);
      broadcastToWindows(windows, 'config-updated', { ...config.store, authSessionVersion: getSessionVersion() });

      return true;
    }
    catch (error) {
      logger.error('Error setting config:', error);
      return false;
    }
  });

  ipcMain.handle('save-pages', (_event, pages, base) => {
    try {
      if (!base || base.session !== getSessionVersion() || !Array.isArray(base.pages)) {
        return { success: false, conflict: true, error: 'The account changed. Reopen the page before saving.' };
      }
      const validation = validatePages(pages);
      if (!validation.valid) {
        return { success: false, error: validation.message };
      }
      const current = config.get('pages') || [];
      const merged = mergeSettings({ pages: base.pages }, { pages }, { pages: current }).pages;
      const mergedValidation = validatePages(merged);
      if (!mergedValidation.valid) {
        return { success: false, error: mergedValidation.message };
      }
      const limit = Number(config.get('subscription.pageGroups')) || 1;
      if (merged.length > current.length && merged.length > limit) {
        return { success: false, error: `This account can add up to ${limit} pages.` };
      }
      config.set('pages', merged);
      require('../action-approval').trustCurrentConfig(config);
      broadcastToWindows(windows, 'config-updated', { pages: merged, authSessionVersion: getSessionVersion() });
      return { success: true, pages: merged, session: getSessionVersion() };
    }
    catch (error) {
      const conflict = error instanceof SyncConflict;
      logger.error('Page save failed:', error.name);
      return { success: false, conflict, error: conflict
        ? 'Pages changed while you were editing. Your draft is preserved; reopen the page before saving.'
        : 'Could not save pages. Your draft is preserved.' };
    }
  });

  // Reset configuration to defaults
  ipcMain.handle('reset-config', async () => {
    try {
      const { resetToDefaults } = require('../config');
      resetToDefaults(config);

      // Re-register the global hotkey since it may have changed back to the default
      const { registerGlobalShortcuts, notifyRegistrationFailure } = require('../shortcuts');
      const hotkey = config.get('globalHotkey');
      if (!registerGlobalShortcuts(config, windows) && hotkey) {
        notifyRegistrationFailure(hotkey);
      }

      applyNativePreferences(config, windows);
      broadcastToWindows(windows, 'config-updated', { ...config.store, authSessionVersion: getSessionVersion() });

      return true;
    }
    catch (error) {
      logger.error('Error resetting config:', error);
      return false;
    }
  });

  // Import configuration from file
  ipcMain.handle('import-config', async (event, filePath) => {
    try {
      const { importConfig } = require('../config');
      const result = await importConfig(config, filePath);

      // Actions imported explicitly by the user are trusted on this device
      if (result) {
        const { trustCurrentConfig } = require('../action-approval');
        trustCurrentConfig(config);

        // Re-register the global hotkey since the imported config may set a new one
        const { registerGlobalShortcuts, notifyRegistrationFailure } = require('../shortcuts');
        const hotkey = config.get('globalHotkey');
        if (!registerGlobalShortcuts(config, windows) && hotkey) {
          notifyRegistrationFailure(hotkey);
        }
        applyNativePreferences(config, windows);
        broadcastToWindows(windows, 'config-updated', { ...config.store, authSessionVersion: getSessionVersion() });
      }

      return result;
    }
    catch (error) {
      logger.error('Error importing config:', error);
      return false;
    }
  });

  // Export configuration to file
  ipcMain.handle('export-config', async (event, filePath) => {
    try {
      const { exportConfig } = require('../config');
      return await exportConfig(config, filePath);
    }
    catch (error) {
      logger.error('Error exporting config:', error);
      return false;
    }
  });
}

module.exports = {
  setupConfigHandlers,
};
