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
const { createLogger } = require('./main/logger');

// 모듈별 로거 생성
const logger = createLogger('Main');

// Load environment variables
loadEnv();

// Import modules
const { createConfigStore } = require('./main/config');
const { registerGlobalShortcuts, unregisterGlobalShortcuts } = require('./main/shortcuts');
const { createTray, destroyTray } = require('./main/tray');
const { createToastWindow, showSettingsWindow, closeAllWindows, windows } = require('./main/windows');
const { setupIpcHandlers } = require('./main/ipc');
const authManager = require('./main/auth-manager');
const auth = require('./main/auth');
const cloudSync = require('./main/cloud-sync');
const userDataManager = require('./main/user-data-manager');

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
  logger.info('Starting to load environment configuration files...');
  try {
    // 1. Load authentication token
    const hasToken = await auth.hasValidToken();
    logger.info('Authentication token check result:', hasToken ? 'Token exists' : 'No token');

    // 2. Load user profile
    if (hasToken) {
      const userProfile = await authManager.fetchUserProfile();
      logger.info('User profile loading complete:', userProfile ? 'Success' : 'Failed');

      // 3. Load user settings
      const userSettings = await authManager.getUserSettings();
      logger.info('User settings loading complete:', userSettings ? 'Success' : 'Failed');

      // Authentication state notification
      if (userProfile) {
        authManager.notifyAuthStateChange({
          isAuthenticated: true,
          profile: userProfile,
          settings: userSettings,
        });
        logger.info('Authentication state update notification sent');
      }
    } else {
      logger.info('No valid token, initializing authentication state');
      authManager.notifyAuthStateChange({
        isAuthenticated: false,
      });
    }
  } catch (error) {
    logger.error('Error loading environment configuration files:', error);
  }
  logger.info('Environment configuration files loading complete');
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
    openAtLogin: config.get('advanced.launchAtLogin') || false,
  });

  // Create windows
  createToastWindow(config);

  // Create the tray icon
  createTray(windows);

  // Register global shortcuts
  registerGlobalShortcuts(config, windows);

  // Set up IPC handlers
  setupIpcHandlers(windows);

  // Initialize authentication manager and cloud sync
  authManager.initialize(windows);

  // Initialize cloud sync and connect with auth manager (중요: config 인스턴스 전달)
  const syncManager = cloudSync.initCloudSync(authManager, userDataManager, config);
  authManager.setSyncManager(syncManager);
  logger.info('Cloud sync module initialized and connected to auth manager with shared config');

  // Load environment configuration files and apply to app
  loadEnvironmentConfig();

  // Register protocol handler (calling function in auth module)
  auth.registerProtocolHandler();

  // Set up URL protocol request handling function
  global.handleProtocolRequest = url => {
    logger.info('Processing protocol request:', url);

    // Directly extract authentication code from URL
    if (url.startsWith('toast-app://auth')) {
      try {
        const urlObj = new URL(url);
        const code = urlObj.searchParams.get('code');
        const error = urlObj.searchParams.get('error');
        const token = urlObj.searchParams.get('token');
        const userId = urlObj.searchParams.get('userId');
        const action = urlObj.searchParams.get('action');

        logger.info('Code extraction from protocol:', code ? 'Exists' : 'None');

        if (error) {
          logger.error('Authentication error parameter:', error);
          authManager.notifyLoginError(error);
          return;
        }

        if (code) {
          // 기존 OAuth 코드 처리 로직
          logger.info('Starting authentication code exchange:', code.substring(0, 6) + '...');
          authManager
            .exchangeCodeForTokenAndUpdateSubscription(code)
            .then(result => {
              logger.info('Authentication code exchange result:', result.success ? 'Success' : 'Failed');
            })
            .catch(err => {
              logger.error('Authentication code exchange error:', err);
              authManager.notifyLoginError(err.message || 'An error occurred during authentication processing');
            });
        } else if (action === 'reload_auth' && token && userId) {
          // connect 페이지에서 온 딥링크 처리
          logger.info('Processing auth reload request with token:', token);
          auth
            .handleAuthRedirect(url)
            .then(result => {
              logger.info('Auth reload result:', result.success ? 'Success' : 'Failed');
            })
            .catch(err => {
              logger.error('Auth reload error:', err);
              authManager.notifyLoginError(err.message || 'An error occurred during auth reload');
            });
        } else {
          logger.error('Authentication code or reload parameters are not in the URL');
          authManager.notifyLoginError('Authentication parameters are missing');
          return;
        }
      } catch (error) {
        logger.error('URL parsing error:', error);
        authManager.notifyLoginError(error.message || 'An error occurred while processing the URL');
      }
    } else {
      logger.info('Non-authentication URL protocol request:', url);
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
      logger.info('Checking for update...');
    });

    autoUpdater.on('update-available', info => {
      logger.info('Update available:', info.version);
    });

    autoUpdater.on('update-not-available', () => {
      logger.info('Update not available');
    });

    autoUpdater.on('error', err => {
      logger.error('Error in auto-updater:', err);
    });

    autoUpdater.on('download-progress', progressObj => {
      logger.info(`Download progress: ${progressObj.percent.toFixed(2)}%`);
    });

    autoUpdater.on('update-downloaded', () => {
      logger.info('Update downloaded. Will install on restart.');
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
app.on('second-instance', (_, commandLine) => {
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

// On macOS, re-create the window when the dock icon is clicked or show it if already created
app.on('activate', () => {
  if (!windows.toast || windows.toast.isDestroyed()) {
    createToastWindow(config);
  } else {
    // 이미 창이 존재하면 표시하고 포커스를 줌
    const { showToastWindow } = require('./main/windows');
    showToastWindow(config);
  }
});

// Clean up before quitting
app.on('before-quit', () => {
  app.isQuitting = true;
  unregisterGlobalShortcuts();
  destroyTray();
  closeAllWindows();
});
