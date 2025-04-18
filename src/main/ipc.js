/**
 * Toast App - IPC Handlers
 *
 * This module sets up IPC (Inter-Process Communication) handlers for
 * communication between the main process and renderer processes.
 */

const { ipcMain } = require('electron');
const { executeAction, validateAction } = require('./executor');
const config = require('./config').createConfigStore();
const path = require('path');
const fs = require('fs');
const { dialog } = require('electron');

/**
 * Set up IPC handlers
 * @param {Object} windows - Object containing application windows
 */
function setupIpcHandlers(windows) {
  // Execute an action
  ipcMain.handle('execute-action', async (event, action) => {
    try {
      return await executeAction(action);
    } catch (error) {
      return {
        success: false,
        message: `Error executing action: ${error.message}`,
        error: error.toString()
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
        error: error.toString()
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
      console.error('Error getting config:', error);
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
      } else {
        // Set specific key
        config.set(key, value);
      }
      return true;
    } catch (error) {
      console.error('Error setting config:', error);
      return false;
    }
  });

  // Reset configuration to defaults
  ipcMain.handle('reset-config', async () => {
    try {
      const { resetToDefaults } = require('./config');
      resetToDefaults(config);
      return true;
    } catch (error) {
      console.error('Error resetting config:', error);
      return false;
    }
  });

  // Import configuration from file
  ipcMain.handle('import-config', async (event, filePath) => {
    try {
      const { importConfig } = require('./config');
      return await importConfig(config, filePath);
    } catch (error) {
      console.error('Error importing config:', error);
      return false;
    }
  });

  // Export configuration to file
  ipcMain.handle('export-config', async (event, filePath) => {
    try {
      const { exportConfig } = require('./config');
      return await exportConfig(config, filePath);
    } catch (error) {
      console.error('Error exporting config:', error);
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

  // Close settings window
  ipcMain.on('close-settings', () => {
    if (windows.settings && !windows.settings.isDestroyed()) {
      // 먼저 창을 숨기고 나서 닫아 깜빡임 방지
      windows.settings.hide();
      // 약간의 지연 후 실제로 창 닫기
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

  // Show open dialog
  ipcMain.handle('show-open-dialog', async (event, options) => {
    try {
      return await dialog.showOpenDialog(options);
    } catch (error) {
      console.error('Error showing open dialog:', error);
      return { canceled: true, error: error.toString() };
    }
  });

  // Show save dialog
  ipcMain.handle('show-save-dialog', async (event, options) => {
    try {
      return await dialog.showSaveDialog(options);
    } catch (error) {
      console.error('Error showing save dialog:', error);
      return { canceled: true, error: error.toString() };
    }
  });

  // Show message box
  ipcMain.handle('show-message-box', async (event, options) => {
    try {
      return await dialog.showMessageBox(options);
    } catch (error) {
      console.error('Error showing message box:', error);
      return { response: 0, error: error.toString() };
    }
  });

  // Test an action (for settings UI)
  ipcMain.handle('test-action', async (event, action) => {
    try {
      // First validate the action
      const validation = await validateAction(action);
      if (!validation.valid) {
        return {
          success: false,
          message: `Invalid action: ${validation.message}`
        };
      }

      // Then execute it
      return await executeAction(action);
    } catch (error) {
      return {
        success: false,
        message: `Error testing action: ${error.message}`,
        error: error.toString()
      };
    }
  });
}

module.exports = {
  setupIpcHandlers
};
