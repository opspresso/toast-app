/**
 * Toast - System Tray
 *
 * This module handles the system tray icon and menu.
 */

const { Tray, Menu, app } = require('electron');
const path = require('path');

let trayInstance = null;

/**
 * Create the system tray icon
 * @param {Object} windows - Object containing application windows
 * @returns {Tray} Tray instance
 */
function createTray(windows) {
  // If tray already exists, return it
  if (trayInstance) {
    return trayInstance;
  }

  // Determine the icon path based on platform
  const iconPath = getTrayIconPath();

  // Create the tray icon
  trayInstance = new Tray(iconPath);

  // Set tooltip
  trayInstance.setToolTip('Toast');

  // Create context menu
  updateTrayMenu(trayInstance, windows);

  // Set up click behavior (platform-specific)
  setupTrayClickBehavior(trayInstance, windows);

  return trayInstance;
}

/**
 * Get the appropriate tray icon path based on platform
 * @returns {string} Path to tray icon
 */
function getTrayIconPath() {
  // Use template icon for macOS (supports dark mode)
  if (process.platform === 'darwin') {
    return path.join(__dirname, '../../assets/icons/tray-icon-Template.png');
  }

  // Use regular icon for other platforms
  return path.join(__dirname, '../../assets/icons/tray-icon.png');
}

/**
 * Update the tray menu
 * @param {Tray} tray - Tray instance
 * @param {Object} windows - Object containing application windows
 */
function updateTrayMenu(tray, windows) {
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Open Toast',
      click: () => {
        if (windows.toast) {
          windows.toast.show();
          windows.toast.focus();
        }
      }
    },
    { type: 'separator' },
    {
      label: 'Settings',
      click: () => {
        const { ipcMain } = require('electron');
        ipcMain.emit('show-settings');
      }
    },
    { type: 'separator' },
    {
      label: 'About Toast',
      click: () => {
        showAboutDialog();
      }
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        app.quit();
      }
    }
  ]);

  tray.setContextMenu(contextMenu);
}

/**
 * Set up platform-specific click behavior for the tray icon
 * @param {Tray} tray - Tray instance
 * @param {Object} windows - Object containing application windows
 */
function setupTrayClickBehavior(tray, windows) {
  // On macOS, clicking the tray icon will show the context menu instead of toggling the window
  // This is consistent with the default behavior on Windows

  // No need to set up custom behavior, as we want to use the default behavior
  // (right-click on macOS and left-click on Windows shows the context menu)
}

/**
 * Show the about dialog
 */
function showAboutDialog() {
  const { dialog } = require('electron');

  dialog.showMessageBox({
    type: 'info',
    title: 'About Toast',
    message: 'Toast',
    detail: `Version: ${app.getVersion()}\n\nA customizable shortcut launcher for macOS and Windows.`,
    buttons: ['OK'],
    icon: path.join(__dirname, '../../assets/icons/icon.png')
  });
}

/**
 * Destroy the tray icon
 */
function destroyTray() {
  if (trayInstance) {
    trayInstance.destroy();
    trayInstance = null;
  }
}

module.exports = {
  createTray,
  updateTrayMenu,
  destroyTray
};
