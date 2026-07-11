/**
 * Toast - Main Entry Point
 *
 * This is the main entry point for the Toast application.
 * It initializes the Electron app, creates windows, and sets up event listeners.
 */

const { app, session } = require('electron');
const { loadEnv } = require('./main/config/env');
const path = require('path');
const fs = require('fs');
const { createLogger, maskAuthUrl } = require('./main/logger');

// Create module-specific logger
const logger = createLogger('Main');

// Load environment variables
loadEnv();

// Import modules
const { createConfigStore, seedDefaultSnippets } = require('./main/config');
const { registerGlobalShortcuts, unregisterGlobalShortcuts, notifyRegistrationFailure } = require('./main/shortcuts');
const { createTray, destroyTray } = require('./main/tray');
const { createToastWindow, showSettingsWindow, closeAllWindows, windows } = require('./main/windows');
const { setupIpcHandlers } = require('./main/ipc');
const authManager = require('./main/auth-manager');
const auth = require('./main/auth');
const cloudSync = require('./main/cloud-sync');
const userDataManager = require('./main/user-data-manager');
const { initializeApprovals } = require('./main/action-approval');

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

      // Seed the default snippet with the logged-in email (once, after
      // any cloud-synced snippets have been applied)
      seedDefaultSnippets(config, userProfile && userProfile.email);
    }
    else {
      logger.info('No valid token, initializing authentication state');
      authManager.notifyAuthStateChange({
        isAuthenticated: false,
      });

      // Seed the default snippet with the fallback email when not logged in
      seedDefaultSnippets(config);
    }
  }
  catch (error) {
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

  // Allow remote button icons (e.g. site favicons) in the file:// based UI.
  // Windows are loaded via loadFile, so every https image is cross-origin and
  // Chromium blocks responses that carry Cross-Origin-Resource-Policy headers
  // (e.g. https://claude.ai/favicon.ico sends "same-origin"). Strip the header
  // for image subresources only.
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    if (details.resourceType === 'image' && details.responseHeaders) {
      const responseHeaders = Object.fromEntries(
        Object.entries(details.responseHeaders).filter(
          ([key]) => key.toLowerCase() !== 'cross-origin-resource-policy',
        ),
      );
      callback({ responseHeaders });
      return;
    }
    callback({});
  });

  // Create windows
  createToastWindow(config);

  // Create the tray icon
  createTray(windows);

  // Register global shortcuts
  const hotkey = config.get('globalHotkey');
  if (!registerGlobalShortcuts(config, windows) && hotkey) {
    notifyRegistrationFailure(hotkey);
  }

  // Set up IPC handlers
  setupIpcHandlers(windows);

  // Seed the trusted action list so cloud-synced exec/script actions can be gated
  initializeApprovals(config, windows);

  // Initialize authentication manager and cloud sync
  authManager.initialize(windows);

  // Initialize cloud sync and connect with auth manager (important: pass the config instance)
  const syncManager = cloudSync.initCloudSync(authManager, userDataManager, config);
  authManager.setSyncManager(syncManager);
  logger.info('Cloud sync module initialized and connected to auth manager with shared config');

  // Initialize inline text expansion (starts the global key hook only if the
  // feature is enabled and permission is granted; macOS only)
  try {
    require('./main/text-expander').initTextExpander(config);
    logger.info('Text expander module initialized');
  }
  catch (error) {
    logger.error('Error initializing text expander:', error);
  }

  // Load environment configuration files and apply to app
  loadEnvironmentConfig();

  // Register protocol handler (calling function in auth module)
  auth.registerProtocolHandler();

  // Set up URL protocol request handling function
  global.handleProtocolRequest = url => {
    logger.info('Processing protocol request:', maskAuthUrl(url));

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
          // CSRF protection: only exchange the code after matching the server-returned state against the stored value
          const receivedState = urlObj.searchParams.get('state');
          if (!auth.validateStateParam(receivedState)) {
            logger.error('Auth redirect rejected: state validation failed');
            authManager.notifyLoginError('Security validation failed (state mismatch).');
            return;
          }

          // Existing OAuth code handling logic
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
        }
        else if (action === 'reload_auth' && token && userId) {
          // Handle deep link coming from the connect page
          logger.info('Processing auth reload request with token:', token.substring(0, 8) + '...');
          auth
            .handleAuthRedirect(url)
            .then(result => {
              logger.info('Auth reload result:', result.success ? 'Success' : 'Failed');
              if (result.success) {
                authManager.notifyAuthStateChange({
                  type: 'auth-reload',
                  subscription: result.subscription,
                  message: 'Authentication information has been refreshed.',
                });
              }
              else {
                authManager.notifyLoginError(result.error || 'Auth reload failed');
              }
            })
            .catch(err => {
              logger.error('Auth reload error:', err);
              authManager.notifyLoginError(err.message || 'An error occurred during auth reload');
            });
        }
        else {
          logger.error('Authentication code or reload parameters are not in the URL');
          authManager.notifyLoginError('Authentication parameters are missing');
          return;
        }
      }
      catch (error) {
        logger.error('URL parsing error:', error);
        authManager.notifyLoginError(error.message || 'An error occurred while processing the URL');
      }
    }
    else {
      logger.info('Non-authentication URL protocol request:', url);
      // Deliver other protocol data to the settings window
      if (windows.settings && !windows.settings.isDestroyed()) {
        windows.settings.webContents.send('protocol-data', url);
      }
    }
  };

  // Set quitting flag on app
  app.isQuitting = false;
}

// When Electron has finished initialization
// (auto-update is owned solely by src/main/updater.js — initialized in ipc.js's initAutoUpdater)
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
  }
  else {
    // If the window already exists, show it and give it focus
    const { showToastWindow } = require('./main/windows');
    showToastWindow(config);
  }
});

// Clean up before quitting
app.on('before-quit', () => {
  logger.info('Application quitting, starting cleanup...');
  app.isQuitting = true;

  // Stop cloud synchronization
  try {
    cloudSync.stopPeriodicSync();
    logger.info('Cloud sync stopped');
  }
  catch (error) {
    logger.error('Error stopping cloud sync:', error);
  }

  // Unregister global shortcuts
  try {
    unregisterGlobalShortcuts();
    logger.info('Global shortcuts unregistered');
  }
  catch (error) {
    logger.error('Error unregistering shortcuts:', error);
  }

  // Stop the text expander hook (otherwise the uiohook thread can keep the
  // process alive and hang the quit)
  try {
    require('./main/text-expander').stopExpander();
    logger.info('Text expander stopped');
  }
  catch (error) {
    logger.error('Error stopping text expander:', error);
  }

  // Destroy tray icon
  try {
    destroyTray();
    logger.info('Tray destroyed');
  }
  catch (error) {
    logger.error('Error destroying tray:', error);
  }

  // Close all windows
  try {
    closeAllWindows();
    logger.info('All windows closed');
  }
  catch (error) {
    logger.error('Error closing windows:', error);
  }

  // Clear global protocol handler
  global.handleProtocolRequest = null;

  logger.info('Application cleanup completed');
});
