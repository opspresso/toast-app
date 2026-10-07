/**
 * Toast - Snippets / Text Expander IPC Handlers
 *
 * Status, permission, enable/disable, save, and validation handlers for the
 * inline text expansion feature.
 */

const { ipcMain, shell } = require('electron');
const textExpander = require('../text-expander');
const { changeSnippet } = require('../snippets');
const { broadcastToWindows } = require('../broadcast');
const { createLogger } = require('../logger');

const logger = createLogger('IPC');

// macOS System Settings deep links for the relevant privacy panes.
const PRIVACY_URLS = {
  accessibility: 'x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility',
  inputMonitoring: 'x-apple.systempreferences:com.apple.preference.security?Privacy_ListenEvent',
};

/**
 * Set up text-expander IPC handlers
 * @param {Object} windows - Object containing application windows
 * @param {Object} config - Shared config store
 */
function setupSnippetsHandlers(windows, config) {
  // Current feature/permission status for the settings UI
  ipcMain.handle('text-expander:get-status', () => {
    try {
      return textExpander.getStatus();
    }
    catch (error) {
      logger.error('Error getting text expander status:', error);
      return { supported: false, enabled: false, running: false, permissions: { accessibility: false } };
    }
  });

  // Trigger the macOS Accessibility prompt / register the app in the list
  ipcMain.handle('text-expander:request-permission', () => {
    try {
      return textExpander.checkAccessibilityPermission(true);
    }
    catch (error) {
      logger.error('Error requesting accessibility permission:', error);
      return false;
    }
  });

  // Open the relevant macOS privacy settings pane
  ipcMain.handle('text-expander:open-privacy-settings', async (event, section) => {
    try {
      const url = PRIVACY_URLS[section] || PRIVACY_URLS.accessibility;

      // Release alwaysOnTop so System Settings is not hidden behind the settings
      // window; restore it when the settings window regains focus
      const settingsWindow = windows.settings && !windows.settings.isDestroyed() ? windows.settings : null;
      if (settingsWindow) {
        settingsWindow.setAlwaysOnTop(false);
        settingsWindow.once('focus', () => {
          if (!settingsWindow.isDestroyed()) {
            settingsWindow.setAlwaysOnTop(true, 'screen-saver');
          }
        });
      }

      await shell.openExternal(url);
      return true;
    }
    catch (error) {
      logger.error('Error opening privacy settings:', error);
      return false;
    }
  });

  // Enable/disable the feature (also starts/stops the hook)
  ipcMain.handle('text-expander:set-enabled', (event, enabled) => {
    try {
      return textExpander.setEnabled(enabled);
    }
    catch (error) {
      logger.error('Error setting text expander enabled state:', error);
      return textExpander.getStatus();
    }
  });

  // Validate and apply one edit against the current main-process snapshot.
  ipcMain.handle('text-expander:change-snippet', (_event, change) => {
    try {
      const result = changeSnippet(config.get('snippets') || [], change);
      if (!result.success) {
        return result;
      }
      config.set('snippets', result.snippets);
      // The text expander refreshes through the shared store's onDidChange listener.
      broadcastToWindows(windows, 'config-updated', { snippets: result.snippets });
      return result;
    }
    catch (error) {
      logger.error('Error saving snippet:', error.message);
      return { success: false, error: 'Could not save the snippet. Your changes were not saved.' };
    }
  });
}

module.exports = { setupSnippetsHandlers };
