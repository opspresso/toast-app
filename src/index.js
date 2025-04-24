/**
 * Toast - Main Entry Point
 *
 * This is the main entry point for the Toast application.
 * It initializes the Electron app, creates windows, and sets up event listeners.
 */

const { app } = require('electron');
const { loadEnv } = require('./main/config/env');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const fs = require('fs');

// Load environment variables
loadEnv();

// Import modules
const { createConfigStore } = require('./main/config');
const { registerGlobalShortcuts, unregisterGlobalShortcuts } = require('./main/shortcuts');
const { createTray, destroyTray } = require('./main/tray');
const { createToastWindow, createSettingsWindow, showSettingsWindow, closeAllWindows, windows } = require('./main/windows');
const { setupIpcHandlers } = require('./main/ipc');
const authManager = require('./main/auth-manager');
const auth = require('./main/auth');

// Hide Dock icon on macOS
if (process.platform === 'darwin' && app.dock) {
  app.dock.hide();
}

// Prevent multiple instances of the app
if (!app.requestSingleInstanceLock()) {
  app.quit();
  process.exit(0);
}

// Create configuration store
const config = createConfigStore();

/**
 * Load environment configuration files and apply to app
 */
async function loadEnvironmentConfig() {
  console.log('Starting to load environment configuration files...');
  try {
    // 1. Load authentication token
    const hasToken = await auth.hasValidToken();
    console.log('Authentication token check result:', hasToken ? 'Token exists' : 'No token');

    // 2. Load user profile
    if (hasToken) {
      const userProfile = await authManager.fetchUserProfile();
      console.log('User profile loading complete:', userProfile ? 'Success' : 'Failed');

      // 3. Load user settings
      const userSettings = await authManager.getUserSettings();
      console.log('User settings loading complete:', userSettings ? 'Success' : 'Failed');

      // Authentication state notification
      if (userProfile) {
        authManager.notifyAuthStateChange({
          isAuthenticated: true,
          profile: userProfile,
          settings: userSettings
        });
        console.log('Authentication state update notification sent');
      }
    } else {
      console.log('No valid token, initializing authentication state');
      authManager.notifyAuthStateChange({
        isAuthenticated: false
      });
    }
  } catch (error) {
    console.error('Error loading environment configuration files:', error);
  }
  console.log('Environment configuration files loading complete');
}

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

  // Initialize authentication manager (including cloud sync)
  authManager.initialize(windows);

  // Load environment configuration files and apply to app
  loadEnvironmentConfig();

  // Register protocol handler (calling function in auth module)
  auth.registerProtocolHandler();

  // Set up URL protocol request handling function
  global.handleProtocolRequest = (url) => {
    console.log('Processing protocol request:', url);

    // Directly extract authentication code from URL
    if (url.startsWith('toast-app://auth')) {
      try {
        const urlObj = new URL(url);
        const code = urlObj.searchParams.get('code');
        const error = urlObj.searchParams.get('error');
        const token = urlObj.searchParams.get('token');
        const userId = urlObj.searchParams.get('userId');
        const action = urlObj.searchParams.get('action');

        console.log('Code extraction from protocol:', code ? 'Exists' : 'None');

        if (error) {
          console.error('Authentication error parameter:', error);
          authManager.notifyLoginError(error);
          return;
        }

        if (code) {
          // 기존 OAuth 코드 처리 로직
          console.log('Starting authentication code exchange:', code.substring(0, 6) + '...');
          authManager.exchangeCodeForTokenAndUpdateSubscription(code).then(result => {
            console.log('Authentication code exchange result:', result.success ? 'Success' : 'Failed');
          }).catch(err => {
            console.error('Authentication code exchange error:', err);
            authManager.notifyLoginError(err.message || 'An error occurred during authentication processing');
          });
        } else if (action === 'reload_auth' && token && userId) {
          // connect 페이지에서 온 딥링크 처리
          console.log('Processing auth reload request with token:', token);
          auth.handleAuthRedirect(url).then(result => {
            console.log('Auth reload result:', result.success ? 'Success' : 'Failed');
          }).catch(err => {
            console.error('Auth reload error:', err);
            authManager.notifyLoginError(err.message || 'An error occurred during auth reload');
          });
        } else {
          console.error('Authentication code or reload parameters are not in the URL');
          authManager.notifyLoginError('Authentication parameters are missing');
          return;
        }
      } catch (error) {
        console.error('URL parsing error:', error);
        authManager.notifyLoginError(error.message || 'An error occurred while processing the URL');
      }
    } else {
      console.log('Non-authentication URL protocol request:', url);
    }
  };

  // Set quitting flag on app
  app.isQuitting = false;
}

// Configure auto updater
function setupAutoUpdater() {
  if (process.env.NODE_ENV !== 'development') {
    autoUpdater.checkForUpdatesAndNotify();

    // Log update events
    autoUpdater.on('checking-for-update', () => {
      console.log('Checking for update...');
    });

    autoUpdater.on('update-available', (info) => {
      console.log('Update available:', info.version);
    });

    autoUpdater.on('update-not-available', () => {
      console.log('Update not available');
    });

    autoUpdater.on('error', (err) => {
      console.error('Error in auto-updater:', err);
    });

    autoUpdater.on('download-progress', (progressObj) => {
      console.log(`Download progress: ${progressObj.percent.toFixed(2)}%`);
    });

    autoUpdater.on('update-downloaded', (info) => {
      console.log('Update downloaded. Will install on restart.');
    });
  }
}

// When Electron has finished initialization
app.whenReady().then(() => {
  initialize();
  setupAutoUpdater();

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
app.on('second-instance', (event, commandLine, workingDirectory) => {
  // Focus the toast window if it exists
  if (windows.toast) {
    if (windows.toast.isMinimized()) {
      windows.toast.restore();
    }
    windows.toast.show();
    windows.toast.focus();
  }

  // Handle when second instance is started with protocol URL
  if (process.platform === 'win32' || process.platform === 'linux') {
    // Deep link handling in Windows and Linux
    const url = commandLine.find(arg => arg.startsWith('toast-app://'));
    if (url && global.handleProtocolRequest) {
      global.handleProtocolRequest(url);
    }
  }
});

// Protocol URL handling on macOS
app.on('open-url', (event, url) => {
  event.preventDefault();
  if (url.startsWith('toast-app://') && global.handleProtocolRequest) {
    global.handleProtocolRequest(url);
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
