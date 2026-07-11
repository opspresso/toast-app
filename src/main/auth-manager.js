/**
 * Toast - Authentication Manager Module
 *
 * This module is for synchronizing authentication state between settings window and toast window.
 * It centralizes login/logout processing and sends events to both windows.
 * It is implemented using the common API module.
 */

const { createLogger, maskEmail, maskName } = require('./logger');
const auth = require('./auth');
const userDataManager = require('./user-data-manager');

// 모듈별 로거 생성
const logger = createLogger('AuthManager');
const { createConfigStore, markAsSynced } = require('./config');
const client = require('./api/client');
const { DEFAULT_ANONYMOUS_SUBSCRIPTION, DEFAULT_ANONYMOUS, PAGE_GROUPS } = require('./constants');
const { determineCloudSyncFeature, normalizeExpiryString, calculatePageGroups, isSubscriptionActive } = require('./subscription');
const { broadcastToWindows } = require('./broadcast');

// Store window references
let windows = null;
// Cloud synchronization object
let syncManager = null;

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
    fetchSubscription: () => auth.fetchSubscription(),
  });
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
  try {
    logger.info('Starting exchange of authentication code for token and update of profile/settings');
    const result = await auth.exchangeCodeForTokenAndUpdateSubscription(code);

    // Notify both windows on login success
    if (result.success) {
      // 1. Get profile information only once after successful login
      logger.info('Getting user profile information after successful login');
      const userProfile = await auth.fetchUserProfile();

      // Persist the profile to the local cache before notifying renderers so their
      // profile/subscription IPC requests hit the cache instead of re-calling the API
      if (userProfile) {
        await userDataManager.getUserProfile(true, userProfile);
      }

      // Notify both windows on login success (profile cache is now warm)
      notifyLoginSuccess(result.subscription);

      // Log subscription information
      if (userProfile) {
        const userEmail = userProfile.email || result.subscription?.userId || 'unknown';
        const userName = userProfile.name || result.subscription?.name || 'unknown user';
        const userPlan = result.subscription?.plan || 'free';
        const isVip = result.subscription?.isVip || false;

        logger.info('====== Account Info ======');
        logger.info('User email:', maskEmail(userEmail));
        logger.info('User name:', maskName(userName));
        logger.info('Subscription plan:', userPlan);
        logger.info('VIP status:', isVip ? 'VIP user' : 'Regular user');
        logger.info('=========================');
      }

      // 2. Set up cloud synchronization feature
      let hasSyncFeature = false;
      if (syncManager) {
        logger.info('Starting cloud synchronization after successful login');

        // Add debugging information
        logger.info(
          'Subscription summary:',
          JSON.stringify({ plan: result.subscription?.plan, active: result.subscription?.active, isVip: result.subscription?.isVip }),
        );

        hasSyncFeature = determineCloudSyncFeature(result.subscription, {
          isDevelopment: process.env.NODE_ENV === 'development',
        });
        logger.info('Cloud_sync feature determined from subscription:', hasSyncFeature);

        // Force add cloud_sync feature to subscription info (for debugging)
        if (result.subscription && typeof result.subscription === 'object') {
          // Copy existing subscription info
          const updatedSubscription = { ...result.subscription };

          // Create features object if it doesn't exist
          if (!updatedSubscription.features || typeof updatedSubscription.features !== 'object') {
            updatedSubscription.features = {};
          }

          // Set cloud_sync feature
          updatedSubscription.features.cloud_sync = hasSyncFeature;

          // Ensure expiry fields are strings (prevent schema violation)
          updatedSubscription.expiresAt = normalizeExpiryString(updatedSubscription.expiresAt);
          if (updatedSubscription.subscribed_until !== undefined) {
            updatedSubscription.subscribed_until = normalizeExpiryString(updatedSubscription.subscribed_until);
          }

          // This write replaces the whole 'subscription' config key, so it must
          // include every field the schema/rest of the app relies on (pageGroups,
          // isAuthenticated, isSubscribed, additionalFeatures) — auth.js's own
          // updatePageGroupSettings() writes these too, but whichever write lands
          // last otherwise wins with a partial shape, and electron-store's schema
          // defaults (e.g. pageGroups: 1) silently fill in the gaps.
          const isActive = isSubscriptionActive(updatedSubscription);
          updatedSubscription.isAuthenticated = true;
          updatedSubscription.isSubscribed = isActive;
          updatedSubscription.active = isActive;
          updatedSubscription.pageGroups = updatedSubscription.features.page_groups || calculatePageGroups(updatedSubscription);
          updatedSubscription.additionalFeatures = {
            advancedActions: updatedSubscription.features.advanced_actions || false,
            cloudSync: hasSyncFeature,
          };

          // Save updated subscription info to settings store
          const config = createConfigStore();
          config.set('subscription', updatedSubscription);
          logger.info(
            'Updated subscription information saved:',
            JSON.stringify({
              plan: updatedSubscription.plan,
              active: updatedSubscription.active,
              cloud_sync: updatedSubscription.features?.cloud_sync,
            }),
          );
        }

        logger.info('Cloud synchronization feature status set:', hasSyncFeature);
        // Update cloud sync settings through syncManager
        if (syncManager && typeof syncManager.updateCloudSyncSettings === 'function') {
          syncManager.updateCloudSyncSettings(hasSyncFeature);
        }
        else {
          logger.warn('syncManager not properly initialized or missing updateCloudSyncSettings method');
        }
      }

      // 3. Integrated synchronization processing - handle profile and settings information at once
      const performSync = async () => {
        try {
          // Profile was already persisted to the local cache above, before notifying renderers

          // Get user settings information
          logger.info('Getting user settings after successful login');
          const userSettings = await getUserSettings(true);

          if (userSettings) {
            logger.info('User settings saved successfully');
          }

          // Send authentication state change notification (including profile and settings)
          notifyAuthStateChange({
            isAuthenticated: true,
            profile: userProfile || null,
            settings: userSettings || null,
          });
          logger.info('Authentication state change notification sent');

          // Execute cloud synchronization
          if (syncManager && hasSyncFeature) {
            logger.info('Cloud synchronization feature is enabled. Getting settings from server...');

            // Execute synchronization and process results
            const syncResult = await syncManager.syncAfterLogin();
            logger.info('Cloud synchronization result after login:', syncResult);

            if (syncResult && syncResult.success) {
              // Notification on successful synchronization
              notifySettingsSynced();
            }
            else {
              logger.warn('Synchronization failed after login:', syncResult?.error || 'Unknown error');
            }
          }
          else {
            logger.info('Cloud synchronization feature is disabled. Please check your subscription status.');
          }

          return true;
        }
        catch (err) {
          logger.error('Error during synchronization:', err);
          return false;
        }
      };
      const syncPromise = performSync();

      // Synchronization processing in background
      syncPromise.then(success => {
        logger.info('Login synchronization process completed:', success ? 'successfully' : 'with errors');
      });
    }
    else {
      notifyLoginError(result.error || 'Unknown error');
    }

    return result;
  }
  catch (error) {
    logger.error('Error in exchangeCodeForTokenAndUpdateSubscription:', error);

    // Send error notification to both windows
    notifyLoginError(error.message || 'Unknown error');

    return {
      success: false,
      error: error.message || 'Unknown error',
    };
  }
}

/**
 * Process logout (delete local tokens and reset environment data)
 * @returns {Promise<boolean>} Whether logout was successful
 */
async function logout() {
  try {
    logger.info('Starting logout process');
    const result = await auth.logout();

    // Stop periodic synchronization and update cloud sync settings when logout is successful
    if (result && syncManager) {
      // Disable synchronization feature and stop periodic synchronization
      if (typeof syncManager.updateCloudSyncSettings === 'function') {
        syncManager.updateCloudSyncSettings(false);
      }
      if (typeof syncManager.stopPeriodicSync === 'function') {
        syncManager.stopPeriodicSync();
      }

      logger.info('Cloud synchronization disabled and periodic synchronization stopped due to logout');
    }

    // Clean up user data when logout is successful
    if (result) {
      userDataManager.cleanupOnLogout();
      logger.info('User data cleanup completed due to logout');

      // Get current configuration
      const config = createConfigStore();

      // Reset subscription information and clear all settings
      config.set('subscription', {
        isAuthenticated: false,
        isSubscribed: false,
        expiresAt: '',
        pageGroups: 1, // Reset to anonymous user default
      });

      // Trim pages down to the anonymous entitlement instead of wiping them:
      // this may be the only copy of the user's data if it was never synced
      // (offline edits, sync disabled, or the upload debounce hadn't fired).
      const currentPages = config.get('pages');
      config.set('pages', Array.isArray(currentPages) ? currentPages.slice(0, PAGE_GROUPS.ANONYMOUS) : []);

      // Reset appearance to default
      config.set('appearance', {});

      // Reset advanced settings to default
      config.set('advanced', {});

      // Sync is disabled by this point (updateCloudSyncSettings(false) above), so the
      // 'pages' write above never reached handleConfigChange's markAsModified() call —
      // the _sync hash/timestamps are still whatever the logged-out user last synced.
      // Left stale, the next person to log in on this device would have their sync
      // treat this leftover local page as "unsynced changes" and upload/merge it into
      // their own account. Mark the post-logout state as synced so it reads as current,
      // not as changes belonging to whoever logs in next.
      markAsSynced(config);

      logger.info('All user configuration reset to defaults on logout');

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
}

/**
 * Get user profile information
 * @param {boolean} forceRefresh - Whether to force a refresh from API (default: false)
 * @returns {Promise<Object>} User profile information
 */
async function fetchUserProfile(forceRefresh = false) {
  // First try from stored file, then API call if not available
  const storedProfile = await userDataManager.getUserProfile(forceRefresh);
  if (storedProfile && !forceRefresh) {
    return storedProfile;
  }

  return await auth.fetchUserProfile();
}

/**
 * Get subscription information (provided as part of profile)
 * @param {boolean} forceRefresh - Whether to force a refresh from API (default: false)
 * @returns {Promise<Object>} Subscription information
 */
async function fetchSubscription(forceRefresh = false) {
  // Try to extract subscription information from stored profile
  const storedProfile = await userDataManager.getUserProfile(forceRefresh);
  if (storedProfile && storedProfile.subscription && !forceRefresh) {
    return storedProfile.subscription;
  }

  // Call API if no stored information or force refresh
  const profileData = await auth.fetchUserProfile();

  if (profileData && profileData.subscription) {
    // Successfully retrieved profile data with subscription information
    return profileData.subscription;
  }
  else {
    return DEFAULT_ANONYMOUS_SUBSCRIPTION;
  }
}

/**
 * Refresh token
 * @returns {Promise<Object>} Refresh result
 */
async function refreshAccessToken() {
  const result = await auth.refreshAccessToken();

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
    pageGroups: subscription?.features?.page_groups || 3,
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

  // 설정 데이터가 없으면 ConfigStore에서 가져옴
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

  // IPC 전송을 위해 안전하게 클론 가능한 객체로 변환
  try {
    configData = JSON.parse(JSON.stringify(configData));
  }
  catch (error) {
    logger.error('Failed to serialize config data for IPC:', error);
    // 기본값으로 fallback
    configData = {
      pages: [],
      snippets: [],
      appearance: {},
      advanced: {},
      subscription: {},
    };
  }

  logger.info('Settings to be synced to UI:', Object.keys(configData || {}).join(', '));

  // 설정 업데이트 알림 + 전체 설정 데이터로 UI 갱신 알림 전송
  broadcastToWindows(windows, 'settings-synced', syncData);
  broadcastToWindows(windows, 'config-updated', configData);

  logger.info('Settings synchronization notification sent');
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

/**
 * Get user settings information
 * @param {boolean} forceRefresh - Whether to force a refresh from API (default: false)
 * @returns {Promise<Object>} User settings information
 */
async function getUserSettings(forceRefresh = false) {
  return await userDataManager.getUserSettings(forceRefresh);
}

module.exports = {
  initialize,
  initiateLogin,
  exchangeCodeForToken,
  exchangeCodeForTokenAndUpdateSubscription,
  logout,
  fetchUserProfile,
  fetchSubscription,
  getUserSettings,
  getAccessToken,
  hasValidToken,
  refreshAccessToken,
  notifyLoginSuccess,
  notifyLoginError,
  notifyLogout,
  notifyAuthStateChange,
  notifySettingsSynced,
  syncSettings,
  updateSyncSettings,
  setSyncManager, // Export newly added function
};
