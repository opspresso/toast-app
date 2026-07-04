/**
 * Toast - System IPC Handlers
 *
 * Handlers for dialogs, shell, shortcuts, app version, logging, and icon extraction.
 */

const { ipcMain, dialog, shell } = require('electron');
const { unregisterGlobalShortcuts, registerGlobalShortcuts } = require('../shortcuts');
const { createLogger, handleIpcLogging } = require('../logger');
const { extractAppIcon, extractAppNameFromPath, convertToTildePath, resolveTildePath } = require('../utils/app-icon-extractor');

const logger = createLogger('IPC');

/**
 * Set up system IPC handlers
 * @param {Object} windows - Object containing application windows
 * @param {Object} config - Shared config store
 */
function setupSystemHandlers(windows, config) {
  // Open URL in external browser
  ipcMain.handle('open-url', async (event, url) => {
    try {
      await shell.openExternal(url);
      return true;
    }
    catch (error) {
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
    }
    catch (error) {
      logger.error('Error disabling shortcuts:', error);
      return false;
    }
  });

  // Restore shortcuts
  ipcMain.handle('restore-shortcuts', () => {
    try {
      // Register global shortcuts again
      return registerGlobalShortcuts(config, windows);
    }
    catch (error) {
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
    }
    catch (error) {
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
    }
    catch (error) {
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
    }
    catch (error) {
      logger.error('Error showing message box:', error);
      return { response: 0, error: error.toString() };
    }
  });

  // Get app version
  ipcMain.handle('get-app-version', () => {
    try {
      const { app } = require('electron');
      return app.getVersion();
    }
    catch (error) {
      return '0.0.0';
    }
  });

  // 로깅 핸들러 추가
  ipcMain.handle('log-info', (event, message, ...args) => handleIpcLogging('info', message, ...args));

  ipcMain.handle('log-warn', (event, message, ...args) => handleIpcLogging('warn', message, ...args));

  ipcMain.handle('log-error', (event, message, ...args) => handleIpcLogging('error', message, ...args));

  ipcMain.handle('log-debug', (event, message, ...args) => handleIpcLogging('debug', message, ...args));

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

      const tildePath = convertToTildePath(iconPath);
      return {
        success: true,
        iconUrl: `file://${iconPath}`,
        iconPath: tildePath,
        appName,
      };
    }
    catch (err) {
      return {
        success: false,
        error: `아이콘 추출 중 오류 발생: ${err.message}`,
      };
    }
  });

  // Resolve tilde path to absolute path
  ipcMain.handle('resolve-tilde-path', (event, tildePath) => {
    try {
      return resolveTildePath(tildePath);
    }
    catch (err) {
      logger.error(`Failed to resolve tilde path: ${err.message}`);
      return tildePath; // Return original path if resolution fails
    }
  });
}

module.exports = {
  setupSystemHandlers,
};
