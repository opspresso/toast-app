/**
 * Toast - Window Management
 *
 * This module handles the creation and management of application windows.
 */

const { BrowserWindow, app } = require('electron');
const path = require('path');
const { positionToastWindow } = require('./shortcuts');
const { isModalOpened } = require('./ipc');

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
      width = 700;
      height = 500;
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

    // 모달이 열려있지 않고 hideOnBlur 설정이 활성화된 경우에만 창 숨김
    if (hideOnBlur !== false && !isModalOpened()) {
      // 창이 숨겨지기 전에 편집 모드 종료를 위한 이벤트 발생
      toastWindow.webContents.send('before-hide');
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
      pages: config.get('pages'),
      appearance: config.get('appearance'),
      subscription: config.get('subscription')
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
    // Position the settings window on the same display as the toast window
    positionSettingsWindowOnToastDisplay(windows.settings);
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
 * Position the Settings window on the same display as the Toast window
 * @param {BrowserWindow} settingsWindow - Settings window
 */
function positionSettingsWindowOnToastDisplay(settingsWindow) {
  if (!settingsWindow) {
    return;
  }

  const { screen } = require('electron');

  // Get the toast window display if it exists and is visible
  let targetDisplay;
  if (windows.toast && !windows.toast.isDestroyed() && windows.toast.isVisible()) {
    // Get the toast window position
    const toastPosition = windows.toast.getPosition();
    // Find the display containing the toast window
    targetDisplay = screen.getDisplayNearestPoint({ x: toastPosition[0], y: toastPosition[1] });
  } else {
    // Fallback to the cursor's current display if toast window is not available
    const cursorPosition = screen.getCursorScreenPoint();
    targetDisplay = screen.getDisplayNearestPoint(cursorPosition);
  }

  // Get the settings window size
  const windowBounds = settingsWindow.getBounds();

  // Get the target display work area
  const displayWorkArea = targetDisplay.workArea;

  // Center the settings window on the target display
  const x = displayWorkArea.x + Math.round((displayWorkArea.width - windowBounds.width) / 2);
  const y = displayWorkArea.y + Math.round((displayWorkArea.height - windowBounds.height) / 2);

  // Set the window position
  settingsWindow.setPosition(x, y);
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
    // Position the settings window on the same display as the toast window
    positionSettingsWindowOnToastDisplay(windows.settings);
    // Show and focus it
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
  windows,
  positionSettingsWindowOnToastDisplay
};
