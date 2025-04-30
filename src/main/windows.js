/**
 * Toast - Window Management
 *
 * This module handles the creation and management of application windows.
 */

const { BrowserWindow, app } = require('electron');
const path = require('path');
const { createLogger } = require('./logger');
const { positionToastWindow } = require('./shortcuts');
const { isModalOpened } = require('./ipc');
const { isLoginProcessActive } = require('./api/auth'); // Import function to check login status

// Create module-specific logger
const logger = createLogger('Windows');

// Store window references to prevent garbage collection
const windows = {
  toast: null,
  settings: null,
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
    // 전체 화면 모드에서도 항상 최상위에 표시되도록 설정
    alwaysOnTopLevel: 'screen-saver', // 가장 높은 우선순위 설정
    type: 'panel', // 'panel' 또는 'utility' 타입은 전체 화면 위에 floating window로 표시됨
    hasShadow: false, // 그림자 효과 제거로 더 가벼운 느낌의 창으로 표시
    thickFrame: false, // Windows에서 기본 창 프레임 비활성화
    fullscreen: false,
    fullscreenable: false,
    visibleOnAllWorkspaces: true,
    simpleFullscreen: false, // macOS 전용 속성
    kiosk: false,
    webPreferences: {
      preload: path.join(__dirname, '../renderer/preload/toast.js'),
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
    },
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
 * Save the current window position for the specific monitor
 * @param {BrowserWindow} toastWindow - Toast window
 * @param {Object} config - Configuration store
 */
function saveWindowPositionForMonitor(toastWindow, config) {
  const { screen } = require('electron');

  // Get the window's current position
  const [x, y] = toastWindow.getPosition();

  // Get the display containing the window
  const windowDisplay = screen.getDisplayNearestPoint({ x, y });
  const displayId = `${windowDisplay.id}`;

  // Get current monitor positions or initialize if not exists
  const monitorPositions = config.get('appearance.monitorPositions') || {};

  // Save this position for the current monitor
  monitorPositions[displayId] = { x, y };

  // Update config
  config.set('appearance.monitorPositions', monitorPositions);
}

/**
 * Set up event handlers for the Toast window
 * @param {BrowserWindow} toastWindow - Toast window
 * @param {Object} config - Configuration store
 */
function setupToastWindowEvents(toastWindow, config) {
  // Track window movement and save position when the window is moved
  toastWindow.on('moved', () => {
    saveWindowPositionForMonitor(toastWindow, config);
  });

  // Hide window when it loses focus if hideOnBlur is enabled
  toastWindow.on('blur', () => {
    const hideOnBlur = config.get('advanced.hideOnBlur');

    // Check if login is in progress
    const loginInProgress = isLoginProcessActive();

    if (loginInProgress) {
      return;
    }

    // Only hide window if modal is not open and hideOnBlur setting is enabled
    if (hideOnBlur !== false && !isModalOpened()) {
      // Emit event to exit edit mode before hiding window
      toastWindow.webContents.send('before-hide');
      toastWindow.hide();
    }
  });

  // Prevent window from being destroyed, just hide it
  toastWindow.on('close', event => {
    // Check if login is in progress
    const loginInProgress = isLoginProcessActive();

    if (loginInProgress) {
      event.preventDefault();
      return;
    }

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
      subscription: config.get('subscription'),
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
    alwaysOnTop: true,
    // 전체 화면 모드에서도 항상 최상위에 표시되도록 설정
    alwaysOnTopLevel: 'screen-saver', // 가장 높은 우선순위 설정
    type: 'panel', // 'panel' 또는 'utility' 타입은 전체 화면 위에 floating window로 표시됨
    hasShadow: false, // 그림자 효과 제거로 더 가벼운 느낌의 창으로 표시
    thickFrame: false, // Windows에서 기본 창 프레임 비활성화
    fullscreen: false,
    fullscreenable: false,
    visibleOnAllWorkspaces: true,
    simpleFullscreen: false, // macOS 전용 속성
    kiosk: false,
    webPreferences: {
      preload: path.join(__dirname, '../renderer/preload/settings.js'),
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
    },
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
  // Check if login is in progress when attempting to close window
  settingsWindow.on('close', event => {
    // Check if login is in progress
    const loginInProgress = isLoginProcessActive();

    if (loginInProgress) {
      event.preventDefault();
      return;
    }
  });

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

  // 현재 포커스된 창이 있는지 확인하고 전체 화면 상태를 저장
  const { BrowserWindow } = require('electron');
  const focusedWindow = BrowserWindow.getFocusedWindow();
  const isFullScreen = focusedWindow && focusedWindow.isFullScreen();

  logger.info(`Showing toast window. Focused window is fullscreen: ${isFullScreen}`);

  // Position the window
  positionToastWindow(windows.toast, config);

  // 전체 화면 모드 위에서도 토스트 창이 올바르게 표시되도록 설정
  if (isFullScreen) {
    windows.toast.setAlwaysOnTop(true, 'screen-saver');

    // 전체 화면 모드에서 토스트 창을 모든 작업 공간에 표시
    if (process.platform === 'darwin') { // macOS 전용
      windows.toast.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
    } else if (process.platform === 'win32') { // Windows 전용
      // Windows에서는 높은 zOrder로 창을 설정하여 항상 위에 표시
      windows.toast.setAlwaysOnTop(true, 'screen-saver', 1);
    } else if (process.platform === 'linux') { // Linux 전용
      // Linux에서는 창 타입을 변경하여 전체 화면 위에 표시되도록 할 수 있음
      // 다양한 윈도우 매니저에 따라 다르게 동작할 수 있음
      try {
        windows.toast.setAlwaysOnTop(true, 'screen-saver', 1);
        const win = windows.toast.getNativeWindowHandle();
        if (win) {
          logger.info('Setting special window type for Linux fullscreen');
        }
      } catch (error) {
        logger.error('Error setting Linux fullscreen behavior:', error);
      }
    }
  }

  // Show and focus the window
  windows.toast.show();
  windows.toast.focus();
}

/**
 * Hide the Toast window
 */
function hideToastWindow() {
  // Check if login is in progress
  const loginInProgress = isLoginProcessActive();

  if (loginInProgress) {
    logger.info('Window will not be hidden during login requests.');
    return;
  }

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
 * @param {string} tabName - Optional tab name to select
 * @returns {BrowserWindow} Settings window
 */
function showSettingsWindow(config, tabName) {
  let settingsWindow;

  // Create the window if it doesn't exist
  if (!windows.settings || windows.settings.isDestroyed()) {
    settingsWindow = createSettingsWindow(config);

    // Send tab selection message when window is ready
    if (tabName) {
      windows.settings.webContents.once('did-finish-load', () => {
        setTimeout(() => {
          if (windows.settings && !windows.settings.isDestroyed()) {
            logger.info(`Settings window loaded, sending '${tabName}' tab selection message`);
            windows.settings.webContents.send('select-settings-tab', tabName);
          }
        }, 300); // Add time for complete loading
      });
    }
  } else {
    settingsWindow = windows.settings;

    // 현재 포커스된 창이 있는지 확인하고 전체 화면 상태를 저장
    const { BrowserWindow } = require('electron');
    const focusedWindow = BrowserWindow.getFocusedWindow();
    const isFullScreen = focusedWindow && focusedWindow.isFullScreen();

    logger.info(`Showing settings window. Focused window is fullscreen: ${isFullScreen}`);

    // 전체 화면 모드 위에서도 설정 창이 올바르게 표시되도록 설정
    if (isFullScreen) {
      settingsWindow.setAlwaysOnTop(true, 'screen-saver');

      // 전체 화면 모드에서 창을 모든 작업 공간에 표시
      if (process.platform === 'darwin') { // macOS 전용
        settingsWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
      } else if (process.platform === 'win32') { // Windows 전용
        // Windows에서는 높은 zOrder로 창을 설정하여 항상 위에 표시
        settingsWindow.setAlwaysOnTop(true, 'screen-saver', 1);
      } else if (process.platform === 'linux') { // Linux 전용
        // Linux에서는 창 타입을 변경하여 전체 화면 위에 표시되도록 할 수 있음
        try {
          settingsWindow.setAlwaysOnTop(true, 'screen-saver', 1);
          const win = settingsWindow.getNativeWindowHandle();
          if (win) {
            logger.info('Setting special window type for Linux fullscreen');
          }
        } catch (error) {
          logger.error('Error setting Linux fullscreen behavior for settings window:', error);
        }
      }
    }

    // Position the settings window on the same display as the toast window
    positionSettingsWindowOnToastDisplay(windows.settings);
    // Show and focus it
    windows.settings.show();
    windows.settings.focus();

    // Select tab in already open window
    if (tabName) {
      setTimeout(() => {
        if (windows.settings && !windows.settings.isDestroyed()) {
          logger.info(`Settings window already open, sending '${tabName}' tab selection message`);
          windows.settings.webContents.send('select-settings-tab', tabName);
        }
      }, 100);
    }
  }

  return settingsWindow;
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
  positionSettingsWindowOnToastDisplay,
};
