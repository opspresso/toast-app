/**
 * Toast App - Window Management
 *
 * This module handles the creation and management of application windows.
 */

const { BrowserWindow, app } = require('electron');
const path = require('path');
const { positionToastWindow } = require('./shortcuts');

// Store window references to prevent garbage collection
const windows = {
  toast: null,
  settings: null
};

/**
 * Create the Toast popup window
 * @param {Object} config - Configuration store
 * @returns {BrowserWindow} Toast window
 */
function createToastWindow(config) {
  // If window already exists, return it
  if (windows.toast && !windows.toast.isDestroyed()) {
    return windows.toast;
  }

  // Get appearance settings
  const opacity = config.get('appearance.opacity') || 0.95;
  const showInTaskbar = config.get('advanced.showInTaskbar') || false;
  const size = config.get('appearance.size') || 'medium';

  // Determine window size based on configuration
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
      width = 650;
      height = 450;
      break;
  }

  // Create the browser window
  windows.toast = new BrowserWindow({
    width,
    height,
    frame: false,
    transparent: true,
    resizable: false,
    skipTaskbar: !showInTaskbar,
    show: false,
    alwaysOnTop: true,
    webPreferences: {
      preload: path.join(__dirname, '../renderer/preload/toast.js'),
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false
    }
  });

  // Load the toast UI
  windows.toast.loadFile(path.join(__dirname, '../renderer/pages/toast/index.html'));

  // Set window opacity
  windows.toast.setOpacity(opacity);

  // Position the window
  positionToastWindow(windows.toast, config);

  // Handle window events
  setupToastWindowEvents(windows.toast, config);

  // Open DevTools in development mode
  if (process.env.NODE_ENV === 'development') {
    windows.toast.webContents.openDevTools({ mode: 'detach' });
  }

  return windows.toast;
}

/**
 * Set up event handlers for the Toast window
 * @param {BrowserWindow} toastWindow - Toast window
 * @param {Object} config - Configuration store
 */
function setupToastWindowEvents(toastWindow, config) {
  // Hide window when it loses focus if hideOnBlur is enabled
  toastWindow.on('blur', () => {
    const hideOnBlur = config.get('advanced.hideOnBlur');
    if (hideOnBlur !== false) {
      toastWindow.hide();
    }
  });

  // Prevent window from being destroyed, just hide it
  toastWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      toastWindow.hide();
    }
  });

  // When the window is shown, send the configuration to the renderer
  toastWindow.on('show', () => {
    toastWindow.webContents.send('config-updated', {
      buttons: config.get('buttons'),
      appearance: config.get('appearance')
    });
  });
}

/**
 * Create the Settings window
 * @param {Object} config - Configuration store
 * @returns {BrowserWindow} Settings window
 */
function createSettingsWindow(config) {
  // If window already exists, return it
  if (windows.settings && !windows.settings.isDestroyed()) {
    return windows.settings;
  }

  // Create the browser window
  windows.settings = new BrowserWindow({
    width: 800,
    height: 600,
    minWidth: 600,
    minHeight: 400,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, '../renderer/preload/settings.js'),
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false
    }
  });

  // Load the settings UI
  windows.settings.loadFile(path.join(__dirname, '../renderer/pages/settings/index.html'));

  // Show window when it's ready
  windows.settings.once('ready-to-show', () => {
    windows.settings.show();
  });

  // Handle window events
  setupSettingsWindowEvents(windows.settings);

  // Open DevTools in development mode
  if (process.env.NODE_ENV === 'development') {
    windows.settings.webContents.openDevTools({ mode: 'detach' });
  }

  return windows.settings;
}

/**
 * Set up event handlers for the Settings window
 * @param {BrowserWindow} settingsWindow - Settings window
 */
function setupSettingsWindowEvents(settingsWindow) {
  // Handle window close
  settingsWindow.on('closed', () => {
    windows.settings = null;
  });
}

/**
 * Show the Toast window
 * @param {Object} config - Configuration store
 */
function showToastWindow(config) {
  // Create the window if it doesn't exist
  if (!windows.toast || windows.toast.isDestroyed()) {
    createToastWindow(config);
  }

  // Position the window
  positionToastWindow(windows.toast, config);

  // Show and focus the window
  windows.toast.show();
  windows.toast.focus();
}

/**
 * Hide the Toast window
 */
function hideToastWindow() {
  if (windows.toast && !windows.toast.isDestroyed() && windows.toast.isVisible()) {
    windows.toast.hide();
  }
}

/**
 * Show the Settings window
 * @param {Object} config - Configuration store
 */
function showSettingsWindow(config) {
  // Create the window if it doesn't exist
  if (!windows.settings || windows.settings.isDestroyed()) {
    createSettingsWindow(config);
  } else {
    // Otherwise, show and focus it
    windows.settings.show();
    windows.settings.focus();
  }
}

/**
 * Close all windows
 */
function closeAllWindows() {
  // Set the quitting flag to prevent windows from being hidden
  app.isQuitting = true;

  // Close all windows
  BrowserWindow.getAllWindows().forEach(window => {
    if (!window.isDestroyed()) {
      window.close();
    }
  });
}

module.exports = {
  createToastWindow,
  createSettingsWindow,
  showToastWindow,
  hideToastWindow,
  showSettingsWindow,
  closeAllWindows,
  windows
};
