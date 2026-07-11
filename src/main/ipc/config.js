/**
 * Toast - Configuration IPC Handlers
 *
 * Handlers for reading, writing, importing, exporting, and resetting config.
 */

const { app, ipcMain } = require('electron');
const crypto = require('crypto');
const { createLogger } = require('../logger');

// Log config values as short hashes, not plaintext, so secrets/commands
// (e.g. exec/script actions in `pages`, auth state in `subscription`) are not leaked.
const hashOfValue = value => crypto.createHash('sha256').update(JSON.stringify(value) ?? 'undefined').digest('hex').slice(0, 12);

const logger = createLogger('IPC');

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
        return config.store;
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
      logger.info('=== set-config called ===');
      logger.info('Key:', key);
      if (key === 'pages') {
        logger.info('Pages being updated. Length:', Array.isArray(value) ? value.length : 'Not array');
      }
      if (key === null && typeof value === 'object') {
        // Set entire config
        Object.keys(value).forEach(k => {
          config.set(k, value[k]);
        });
      }
      else if (key === 'subscription' && typeof value === 'object') {
        // Sanitize the object using the sanitizeSubscription function
        const { sanitizeSubscription } = require('../config');
        const subscriptionValue = sanitizeSubscription(value);

        // Store the sanitized subscription object
        config.set(key, subscriptionValue);
      }
      else {
        // Set specific key
        config.set(key, value);
      }

      // Actions saved locally by the user are trusted on this device
      if (key === null || key === 'pages') {
        const { trustCurrentConfig } = require('../action-approval');
        trustCurrentConfig(config);
      }

      // Apply OS-level settings immediately instead of waiting for the next launch
      if (key === null || key === 'advanced' || key === 'advanced.launchAtLogin') {
        app.setLoginItemSettings({ openAtLogin: config.get('advanced.launchAtLogin') || false });
      }
      if (
        (key === null || key === 'advanced' || key === 'advanced.showInTaskbar')
        && windows.toast
        && !windows.toast.isDestroyed()
      ) {
        windows.toast.setSkipTaskbar(!(config.get('advanced.showInTaskbar') || false));
      }

      // Immediately notify toast window when settings change
      if (windows.toast && !windows.toast.isDestroyed()) {
        // If entire settings or specific section is updated
        if (key === null || key === 'appearance' || key === 'advanced' || key === 'pages' || (typeof key === 'string' && key.startsWith('appearance.'))) {
          // Sanitize the subscription object using the sanitizeSubscription function
          const { sanitizeSubscription } = require('../config');
          const subscription = sanitizeSubscription(config.get('subscription'));

          windows.toast.webContents.send('config-updated', {
            pages: config.get('pages'),
            appearance: config.get('appearance'),
            subscription,
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
          const { positionToastWindow } = require('../shortcuts');
          positionToastWindow(windows.toast, config);
        }
      }

      return true;
    }
    catch (error) {
      logger.error('Error setting config:', error);
      return false;
    }
  });

  // Save configuration (specific changes) with duplicate prevention
  let lastSaveTime = 0;
  let lastSaveData = null;

  ipcMain.handle('save-config', (event, changes) => {
    try {
      logger.info('=== save-config called ===');

      // Prevent rapid duplicates (within 100ms)
      const now = Date.now();
      const dataString = JSON.stringify(changes);
      if (now - lastSaveTime < 100 && lastSaveData === dataString) {
        logger.info('Duplicate save-config call detected, ignoring');
        return true;
      }

      lastSaveTime = now;
      lastSaveData = dataString;

      logger.info('Changes keys:', Object.keys(changes || {}));
      if (changes && changes.pages) {
        logger.info('Pages being updated via save-config. Length:', Array.isArray(changes.pages) ? changes.pages.length : 'Not array');
      }
      if (typeof changes === 'object') {
        // Apply each change to config
        Object.keys(changes).forEach(key => {
          const oldHash = hashOfValue(config.get(key));
          config.set(key, changes[key]);
          const newHash = hashOfValue(config.get(key));
          logger.info(`IPC: Setting config key "${key}" (old=${oldHash}, new=${newHash}, changed=${oldHash !== newHash})`);
        });

        // Actions saved locally by the user are trusted on this device
        if (changes.pages) {
          const { trustCurrentConfig } = require('../action-approval');
          trustCurrentConfig(config);
        }

        // Immediately notify toast window when settings change
        if (windows.toast && !windows.toast.isDestroyed()) {
          // Sanitize the subscription object using the sanitizeSubscription function
          const { sanitizeSubscription } = require('../config');
          const subscription = sanitizeSubscription(config.get('subscription'));

          windows.toast.webContents.send('config-updated', {
            pages: config.get('pages'),
            appearance: config.get('appearance'),
            subscription,
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
              const { positionToastWindow } = require('../shortcuts');
              positionToastWindow(windows.toast, config);
            }
          }
        }

        return true;
      }
      return false;
    }
    catch (error) {
      logger.error('Error saving config:', error);
      return false;
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

      // Apply OS-level settings immediately, matching set-config's behavior
      app.setLoginItemSettings({ openAtLogin: config.get('advanced.launchAtLogin') || false });
      if (windows.toast && !windows.toast.isDestroyed()) {
        windows.toast.setSkipTaskbar(!(config.get('advanced.showInTaskbar') || false));
      }

      // Send change notification to toast window after settings reset
      if (windows.toast && !windows.toast.isDestroyed()) {
        // Sanitize the subscription object using the sanitizeSubscription function
        const { sanitizeSubscription } = require('../config');
        const subscription = sanitizeSubscription(config.get('subscription'));

        windows.toast.webContents.send('config-updated', {
          pages: config.get('pages'),
          appearance: config.get('appearance'),
          subscription,
        });
      }

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
