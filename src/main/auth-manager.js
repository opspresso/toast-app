/**
 * Toast - Authentication Manager Module
 *
 * This module is for synchronizing authentication state between settings window and toast window.
 * It centralizes login/logout processing and sends events to both windows.
 * It is implemented using the common API module.
 */

const { createLogger } = require('./logger');
const auth = require('./auth');
const userDataManager = require('./user-data-manager');

// Create logger for this module
const logger = createLogger('AuthManager');
const { createConfigStore, seedDefaultSnippets } = require('./config');
const client = require('./api/client');
const { DEFAULT_ANONYMOUS, PAGE_GROUPS } = require('./constants');
const { normalizeSubscription } = require('./subscription');
const { isDeepStrictEqual: equal } = require('util');
const { broadcastToWindows } = require('./broadcast');

// Store window references
let windows = null;
// Cloud synchronization object
let syncManager = null;

// Incremented on every login/logout so a background task started by one (e.g. the
// fire-and-forget post-login sync below) can tell whether a more recent auth event has
// since happened and skip sending a now-stale notification.
let authSequence = 0;

// A dead session can be discovered through more than one path at once — e.g. auth.js's
// own session-expired handler (fire-and-forget) and this module's requireRelogin checks
// in refreshAccessToken/fetchUserProfile/fetchSubscription all call logout() for the same
// underlying event. Sharing one in-flight promise (mirrors auth.js's refreshPromise dedup)
// keeps logout() safe to call from all of them without revoking the token or notifying
// both windows more than once per actual logout.
let isLoggingOut = false;
let logoutPromise = null;

/**
 * Set up cloud synchronization manager
 * @param {Object} syncMgr - Synchronization manager instance
 */
function setSyncManager(syncMgr) {
  syncManager = syncMgr;
  logger.info('Sync manager initialized successfully');
}

/**
 * Initialize authentication manager
 * @param {Object} windowsRef - Application windows reference object
 */
function initialize(windowsRef) {
  windows = windowsRef;

  // Initialize user data manager
  userDataManager.initialize(client, {
    getAccessToken,
    hasValidToken,
    fetchUserProfile: () => auth.fetchUserProfile(),
  });

  // Run the full app-level logout when auth.js detects a dead session on its own (e.g.
  // hasValidToken's automatic refresh), not just when profile/subscription fetch or an
  // explicit refresh call surfaces requireRelogin.
  auth.setSessionExpiredHandler(() => logout());
}

/**
 * Start login process
 * @returns {Promise<boolean>} Whether process started successfully
 */
async function initiateLogin() {
  try {
    return await auth.initiateLogin();
  }
  catch (error) {
    logger.error('Error initiating login:', error);
    return false;
  }
}

/**
 * Exchange authentication code for token
 * @param {string} code - OAuth authentication code
 * @returns {Promise<Object>} Token exchange result
 */
async function exchangeCodeForToken(code) {
  try {
    const result = await auth.exchangeCodeForToken(code);
    return result;
  }
  catch (error) {
    logger.error('Error exchanging code for token:', error);
    return {
      success: false,
      error: error.message || 'Failed to exchange code for token',
    };
  }
}

/**
 * Exchange authentication code for token and update profile/settings/subscription information
 * @param {string} code - OAuth authentication code
 * @returns {Promise<Object>} Processing result
 */
async function exchangeCodeForTokenAndUpdateSubscription(code) {
  const sequence = ++authSequence;
  syncManager?.stopPeriodicSync?.();
  try {
    const result = await auth.exchangeCodeForToken(code);
    if (sequence !== authSequence) {
      return { success: false, error: 'The account changed during login' };
    }
    if (!result.success) {
      notifyLoginError(result.error || 'Login failed');
      return result;
    }
    userDataManager.cleanupOnLogout();
    const profile = await fetchUserProfile(true);
    if (sequence !== authSequence) {
      return { success: false, error: 'The account changed during login' };
    }
    if (profile?.error || !profile?.isAuthenticated) {
      const error = profile?.error?.message || 'Could not verify the account profile';
      notifyLoginError(error);
      return { success: false, authenticated: true, error };
    }
    notifyLoginSuccess(profile.subscription);
    // Report credentials and profile immediately. The sync manager separately
    // reports whether the cloud download succeeds, fails, or is disabled.
    notifyConfigUpdated(createConfigStore().store);
    void synchronizeProfile(profile, sequence).catch(error => logger.warn('Login synchronization failed:', error.message));
    return { success: true, subscription: profile.subscription };
  }
  catch (error) {
    if (sequence === authSequence) {
      notifyLoginError(error.message || 'Login failed');
    }
    return { success: false, error: error.message || 'Login failed' };
  }
  finally {
    // A temporary profile error must not leave the scheduler permanently suspended.
    if (sequence === authSequence) {
      syncManager?.startPeriodicSync?.();
    }
  }
}

async function synchronizeProfile(profile, sequence) {
  const config = createConfigStore();
  // Seed before downloading: an intentionally empty cloud list remains empty.
  seedDefaultSnippets(config, profile.email);
  const result = syncManager ? await syncManager.syncAfterLogin() : { success: false, error: 'Sync is not initialized' };
  if (sequence !== authSequence) {
    return { success: false, canceled: true };
  }
  if (!result.success) {
    logger.warn('Cloud synchronization:', result.error);
  }
  notifyAuthStateChange({ isAuthenticated: true, profile, settings: { pages: config.get('pages'), snippets: config.get('snippets') } });
  return result;
}

async function reloadAccount() {
  if (!await auth.hasValidToken()) {
    return { success: await initiateLogin() };
  }
  return restoreSession();
}

/** Restore a stored session without allowing a late startup response to replace a newer login. */
async function restoreSession() {
  const sequence = authSequence;
  const profile = await fetchUserProfile(true);
  if (sequence !== authSequence || profile?.error) {
    return { success: false, error: profile?.error?.message || 'The account changed' };
  }
  if (!profile?.isAuthenticated) {
    seedDefaultSnippets(createConfigStore());
    notifyAuthStateChange({ isAuthenticated: false });
    return { success: true };
  }
  return synchronizeProfile(profile, sequence);
}

/**
 * Process logout (delete local tokens and reset environment data)
 * @returns {Promise<boolean>} Whether logout was successful
 */
async function logout() {
  // Another trigger (e.g. auth.js's session-expired handler) already has a logout in
  // flight — share its result instead of running the whole flow (server revoke, user data
  // cleanup, window notifications) a second time for the same underlying event.
  if (isLoggingOut && logoutPromise) {
    logger.info('Logout already in progress; sharing in-flight result');
    return logoutPromise;
  }

  isLoggingOut = true;
  authSequence += 1;
  // Invalidate in-flight responses before token revocation performs network I/O.
  syncManager?.stopPeriodicSync?.();

  logoutPromise = (async () => {
    try {
      logger.info('Starting logout process');
      const result = await auth.logout();

      // Clean up user data when logout is successful
      if (result) {
        userDataManager.cleanupOnLogout();
        logger.info('User data cleanup completed due to logout');

        // Get current configuration
        const config = createConfigStore();

        // Reset subscription information only. pages/appearance/advanced are left untouched —
        // they are the user's actual content and this device may hold the only unsynced copy
        // (offline edits, sync disabled, or the upload debounce hadn't fired). Deleting them
        // locally on logout is unrecoverable if the copy was never uploaded.
        config.set('subscription', {
          isAuthenticated: false,
          isSubscribed: false,
          expiresAt: '',
          pageGroups: PAGE_GROUPS.ANONYMOUS, // Reset to anonymous user default
        });

        notifyConfigUpdated({ pages: config.get('pages'), snippets: config.get('snippets'), subscription: config.get('subscription') });
        logger.info('Subscription reset to anonymous defaults on logout');

        // Send app authentication state change notification
        notifyAuthStateChange({
          isAuthenticated: false,
          profile: DEFAULT_ANONYMOUS,
          settings: null,
        });
        logger.info('Authentication state change notification sent');
      }

      // Send notification to both windows when logout is successful
      if (result) {
        notifyLogout();
      }

      return result;
    }
    catch (error) {
      logger.error('Error logging out:', error);
      return false;
    }
    finally {
      isLoggingOut = false;
      logoutPromise = null;
    }
  })();

  return logoutPromise;
}

/**
 * Get user profile information
 * @param {boolean} forceRefresh - Whether to force a refresh from API (default: false)
 * @returns {Promise<Object>} User profile information
 */
async function fetchUserProfile(forceRefresh = false) {
  const sequence = authSequence;
  const profile = await userDataManager.getUserProfile(forceRefresh);
  if (sequence !== authSequence) {
    return { error: { code: 'AUTH_SESSION_CHANGED', message: 'The account changed during this request.' } };
  }
  if (profile?.error?.requireRelogin) {
    await logout();
  }
  if (profile?.error) {
    return profile;
  }
  try {
    const subscription = normalizeSubscription(profile?.subscription, profile?.isAuthenticated === true);
    const verified = { ...profile, subscription };
    const config = createConfigStore();
    if (!equal(config.get('subscription'), subscription)) {
      config.set('subscription', subscription);
      notifyConfigUpdated({ subscription });
      notifyAuthStateChange({ isAuthenticated: profile.isAuthenticated === true, profile: verified });
    }
    return verified;
  }
  catch (error) {
    return { error: { code: 'INVALID_PROFILE', message: error.message } };
  }
}

/** Return the subscription from the same profile request, preserving failures. */
async function fetchSubscription(forceRefresh = false) {
  const profile = await fetchUserProfile(forceRefresh);
  return profile?.error ? profile : profile?.subscription || {
    error: { code: 'INVALID_PROFILE', message: 'The server returned no subscription information.' },
  };
}

/**
 * Refresh token
 * @returns {Promise<Object>} Refresh result
 */
async function refreshAccessToken(options) {
  const result = await auth.refreshAccessToken(options);

  // A dead refresh token means the user is effectively logged out; run the
  // full logout flow so cloud sync stops and both windows are notified,
  // instead of silently leaving the app in a stale "logged in" state.
  if (!result.success && result.requireRelogin) {
    logger.warn('Refresh token requires re-login; logging out');
    await logout();
  }

  return result;
}

/**
 * Get current authentication token
 * @returns {Promise<string|null>} Authentication token or null
 */
async function getAccessToken() {
  return await auth.getAccessToken();
}

/**
 * Check if there is a valid token
 * @returns {Promise<boolean>} Whether token is valid
 */
async function hasValidToken() {
  return await auth.hasValidToken();
}

/**
 * Send login success notification to both windows
 * @param {Object} subscription - Subscription information
 */
function notifyLoginSuccess(subscription) {
  if (!windows) {
    return;
  }

  const loginData = {
    isAuthenticated: true,
    isSubscribed: subscription?.active || subscription?.is_subscribed || false,
    pageGroups: subscription?.features?.page_groups || PAGE_GROUPS.AUTHENTICATED,
  };

  broadcastToWindows(windows, 'login-success', loginData);
  logger.info('Login success notification sent to both windows');
}

/**
 * Send login error notification to both windows
 * @param {string} errorMessage - Error message
 */
function notifyLoginError(errorMessage) {
  if (!windows) {
    return;
  }

  const errorData = {
    error: errorMessage,
    message: 'Authentication failed: ' + errorMessage,
  };

  broadcastToWindows(windows, 'login-error', errorData);
  logger.info('Login error notification sent to both windows');
}

/**
 * Send logout notification to both windows
 */
function notifyLogout() {
  if (!windows) {
    return;
  }

  broadcastToWindows(windows, 'logout-success', {});
  logger.info('Logout notification sent to both windows');
}

/**
 * Send settings synchronization notification to both windows
 */
function notifySettingsSynced(configData = null) {
  if (!windows) {
    return;
  }

  const syncData = {
    success: true,
    message: 'Settings have been successfully synchronized with the cloud.',
  };

  // If no config data provided, get it from ConfigStore
  if (!configData) {
    const config = createConfigStore();
    configData = {
      pages: config.get('pages'),
      snippets: config.get('snippets'),
      appearance: config.get('appearance'),
      advanced: config.get('advanced'),
      subscription: config.get('subscription'),
    };
  }

  // Convert to a safely cloneable object for IPC transmission
  try {
    configData = JSON.parse(JSON.stringify(configData));
  }
  catch (error) {
    logger.error('Failed to serialize config data for IPC:', error);
    // Fall back to default values
    configData = {
      pages: [],
      snippets: [],
      appearance: {},
      advanced: {},
      subscription: {},
    };
  }

  logger.info('Settings to be synced to UI:', Object.keys(configData || {}).join(', '));

  // Send settings update notification + UI refresh notification with full config data
  broadcastToWindows(windows, 'settings-synced', syncData);
  broadcastToWindows(windows, 'config-updated', { ...configData, authSessionVersion: client.getSessionVersion() });

  logger.info('Settings synchronization notification sent');
}

function notifyConfigUpdated(configData) {
  broadcastToWindows(windows, 'config-updated', { ...configData, authSessionVersion: client.getSessionVersion() });
}

function notifySyncStatus(status) {
  broadcastToWindows(windows, 'cloud-sync-status', status);
}

/**
 * Process manual synchronization request
 * @param {string} action - Synchronization action ('upload', 'download', 'resolve')
 * @returns {Promise<boolean>} Whether synchronization was successful
 */
async function syncSettings(action = 'resolve') {
  try {
    if (!syncManager) {
      return false;
    }

    const result = await syncManager.manualSync(action);

    if (result && result.success) {
      notifySettingsSynced();
      return true;
    }

    return false;
  }
  catch (error) {
    logger.error('Manual synchronization error:', error);
    return false;
  }
}

/**
 * Update cloud synchronization settings
 * @param {boolean} enabled - Whether to enable synchronization
 * @returns {boolean} Whether settings change was successful
 */
function updateSyncSettings(enabled) {
  try {
    if (!syncManager) {
      return false;
    }

    if (enabled) {
      syncManager.enable();
    }
    else {
      syncManager.disable();
    }

    return true;
  }
  catch (error) {
    logger.error('Error changing synchronization settings:', error);
    return false;
  }
}

/**
 * Send authentication state change notification to both windows
 * @param {Object} authState - Authentication state information
 */
function notifyAuthStateChange(authState) {
  if (!windows) {
    return;
  }

  broadcastToWindows(windows, 'auth-state-changed', authState);
  logger.info('Auth state change notification sent to both windows');
}

module.exports = {
  initialize,
  restoreSession,
  reloadAccount,
  initiateLogin,
  exchangeCodeForToken,
  exchangeCodeForTokenAndUpdateSubscription,
  logout,
  fetchUserProfile,
  fetchSubscription,
  getAccessToken,
  hasValidToken,
  refreshAccessToken,
  notifyLoginSuccess,
  notifyLoginError,
  notifyLogout,
  notifyAuthStateChange,
  notifySettingsSynced,
  notifyConfigUpdated,
  notifySyncStatus,
  syncSettings,
  updateSyncSettings,
  setSyncManager, // Export newly added function
};
