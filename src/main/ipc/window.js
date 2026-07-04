/**
 * Toast - Window IPC Handlers
 *
 * Window control, modal state, and always-on-top handlers.
 */

const { ipcMain } = require('electron');
const { createLogger } = require('../logger');

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
 * Set up window IPC handlers
 * @param {Object} windows - Object containing application windows
 */
function setupWindowHandlers(windows) {
  // Handle button edit modal state change
  ipcMain.on('modal-state-changed', (event, open) => {
    isModalOpen = open;
  });

  // Handler to return current modal state
  ipcMain.handle('is-modal-open', () => isModalOpen);

  // Set window's alwaysOnTop property
  ipcMain.handle('set-always-on-top', (event, value) => {
    try {
      if (windows.toast && !windows.toast.isDestroyed()) {
        windows.toast.setAlwaysOnTop(value);
        return true;
      }
      return false;
    }
    catch (error) {
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
    }
    catch (error) {
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
    }
    catch (error) {
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
    }
    catch (error) {
      logger.error('Error restoring alwaysOnTop after dialog:', error);
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
    }
    catch (error) {
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
    const { showSettingsWindow } = require('../windows');
    const { createConfigStore } = require('../config');
    showSettingsWindow(createConfigStore());
  });

  // Show settings window with specific tab selected
  ipcMain.on('show-settings-tab', (event, tabName) => {
    const { showSettingsWindow } = require('../windows');
    const { createConfigStore } = require('../config');

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
}

module.exports = {
  setupWindowHandlers,
  isModalOpened,
};
