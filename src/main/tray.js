/**
 * Toast - System Tray
 *
 * This module handles the system tray icon and menu.
 */

const { Tray, Menu, app, shell } = require('electron');
const path = require('path');
const { createConfigStore } = require('./config');

let trayInstance = null;
let windowsRef = null;

// Auto-update state (updated by updater.js via setUpdateState)
let updateState = { status: null, version: null };

/**
 * Create the system tray icon
 * @param {Object} windows - Object containing application windows
 * @returns {Tray} Tray instance
 */
function createTray(windows) {
  windowsRef = windows;

  // If tray already exists, return it
  if (trayInstance) {
    return trayInstance;
  }

  // Determine the icon path based on platform
  const iconPath = getTrayIconPath(hasUpdateAvailable());

  // Create the tray icon
  trayInstance = new Tray(iconPath);

  // Set tooltip (mark development instances)
  trayInstance.setToolTip(process.env.NODE_ENV === 'development' ? 'Toast (dev)' : 'Toast');

  // Create context menu
  updateTrayMenu(trayInstance, windows);

  // Set up click behavior (platform-specific)
  setupTrayClickBehavior(trayInstance, windows);

  return trayInstance;
}

/**
 * Get the appropriate tray icon path based on platform and update state
 * @param {boolean} hasUpdate - Whether an update is available/downloading/downloaded
 * @returns {string} Path to tray icon
 */
function getTrayIconPath(hasUpdate) {
  // Use template icons for macOS (auto-adapts to menu bar light/dark mode).
  // Development instances get a badged variant so they are easy to tell
  // apart from the installed (production) app.
  if (process.platform === 'darwin') {
    const isDev = process.env.NODE_ENV === 'development';
    if (isDev) {
      return path.join(__dirname, '../../assets/icons/tray-icon-devTemplate.png');
    }
    return path.join(__dirname, hasUpdate ? '../../assets/icons/tray-icon-updateTemplate.png' : '../../assets/icons/tray-icon-Template.png');
  }

  // Use regular icon for other platforms
  return path.join(__dirname, hasUpdate ? '../../assets/icons/tray-icon-update.png' : '../../assets/icons/tray-icon.png');
}

/**
 * Whether the current update state should be reflected on the tray icon
 * @returns {boolean} True while an update is available, downloading, or downloaded
 */
function hasUpdateAvailable() {
  return updateState.status !== null;
}

/**
 * Update the tray menu
 * @param {Tray} tray - Tray instance
 * @param {Object} windows - Object containing application windows
 */
function updateTrayMenu(tray, windows) {
  // Get the currently configured Global Hotkey
  const config = createConfigStore();
  const configuredHotkey = config.get('globalHotkey') || 'Alt+Space'; // Use default value

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Open Toast',
      accelerator: configuredHotkey,
      click: () => {
        if (windows.toast) {
          windows.toast.show();
          windows.toast.focus();
        }
      },
    },
    { type: 'separator' },
    {
      label: 'How to use',
      click: () => {
        shell.openExternal('https://app.toast.sh/how-to-use');
      },
    },
    {
      label: 'Dashboard',
      click: () => {
        shell.openExternal('https://app.toast.sh/dashboard');
      },
    },
    {
      label: 'Subscription',
      click: () => {
        shell.openExternal('https://app.toast.sh/subscription');
      },
    },
    { type: 'separator' },
    {
      label: 'Settings...',
      accelerator: 'Cmd+,',
      click: () => {
        const { ipcMain } = require('electron');
        // The second argument is the event object
        ipcMain.emit('show-settings', null);
      },
    },
    {
      label: 'About',
      click: () => {
        const { ipcMain } = require('electron');
        // Emit an event to open the settings window and select the about tab
        // The second argument is the event object; additional data follows from the third argument
        ipcMain.emit('show-settings-tab', null, 'about');
      },
    },
    ...buildUpdateMenuItems(),
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);
}

/**
 * Build version/update menu items based on the current update state
 * @returns {Array} Menu item templates
 */
function buildUpdateMenuItems() {
  const { status, version } = updateState;

  if (status === 'available') {
    return [
      {
        label: `⬆ Update to v${version}`,
        click: () => {
          // Load at click time to avoid a circular dependency
          require('./updater').downloadAndInstallUpdate(version);
        },
      },
    ];
  }

  if (status === 'downloading') {
    return [
      {
        label: `Downloading v${version}…`,
        enabled: false,
      },
    ];
  }

  if (status === 'downloaded') {
    return [
      {
        label: `Restart to install v${version}`,
        click: () => {
          require('./updater').installUpdate();
        },
      },
    ];
  }

  return [
    {
      label: `Version: ${app.getVersion()}`,
      enabled: false,
    },
  ];
}

/**
 * Reflect auto-update state in the tray menu
 * @param {string|null} status - 'available' | 'downloading' | 'downloaded' | null
 * @param {string} [version] - Target update version
 */
function setUpdateState(status, version) {
  // Ignore redundant updates to the same state (prevents the menu from being rebuilt on every periodic check)
  if (updateState.status === status && updateState.version === (version || null)) {
    return;
  }

  updateState = { status: status || null, version: version || null };

  if (trayInstance) {
    trayInstance.setImage(getTrayIconPath(hasUpdateAvailable()));
    updateTrayMenu(trayInstance, windowsRef);
  }
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
  setUpdateState,
  destroyTray,
};
