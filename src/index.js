/**
 * Toast App - Main Entry Point
 *
 * This is the main entry point for the Toast App application.
 * It initializes the Electron app, creates windows, and sets up event listeners.
 */

const { app } = require('electron');
const path = require('path');
const fs = require('fs');

// Import modules
const { createConfigStore } = require('./main/config');
const { registerGlobalShortcuts, unregisterGlobalShortcuts } = require('./main/shortcuts');
const { createTray, destroyTray } = require('./main/tray');
const { createToastWindow, createSettingsWindow, showSettingsWindow, closeAllWindows, windows } = require('./main/windows');
const { setupIpcHandlers } = require('./main/ipc');

// Prevent multiple instances of the app
if (!app.requestSingleInstanceLock()) {
  app.quit();
  process.exit(0);
}

// Create configuration store
const config = createConfigStore();

// Flag to track if the app is quitting
let isQuitting = false;

/**
 * Initialize the application
 */
function initialize() {
  // Create necessary directories
  const appDataPath = app.getPath('userData');
  const configPath = path.join(appDataPath, 'config');

  if (!fs.existsSync(configPath)) {
    fs.mkdirSync(configPath, { recursive: true });
  }

  // Set up auto launch
  app.setLoginItemSettings({
    openAtLogin: config.get('advanced.launchAtLogin') || false
  });

  // Create windows
  createToastWindow(config);

  // Create the tray icon
  createTray(windows);

  // Register global shortcuts
  registerGlobalShortcuts(config, windows);

  // Set up IPC handlers
  setupIpcHandlers(windows);

  // Set quitting flag on app
  app.isQuitting = false;
}

// When Electron has finished initialization
app.whenReady().then(() => {
  initialize();

  // Show the settings window on first launch if this is a new installation
  const isFirstLaunch = !config.has('firstLaunchCompleted');
  if (isFirstLaunch) {
    // Set first launch flag
    config.set('firstLaunchCompleted', true);

    // Show settings window on first launch
    showSettingsWindow(config);
  }
});

// Handle second instance
app.on('second-instance', () => {
  // Focus the toast window if it exists
  if (windows.toast) {
    if (windows.toast.isMinimized()) {
      windows.toast.restore();
    }
    windows.toast.show();
    windows.toast.focus();
  }
});

// Quit when all windows are closed, except on macOS
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// On macOS, re-create the window when the dock icon is clicked
app.on('activate', () => {
  if (!windows.toast || windows.toast.isDestroyed()) {
    createToastWindow(config);
  }
});

// Clean up before quitting
app.on('before-quit', () => {
  app.isQuitting = true;
  unregisterGlobalShortcuts();
  destroyTray();
  closeAllWindows();
});
