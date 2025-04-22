/**
 * Toast App - Authentication Manager Module
 *
 * This module is for synchronizing authentication state between settings window and toast window.
 * It centralizes login/logout processing and sends events to both windows.
 * It is implemented using the common API module.
 */

const auth = require('./auth');
const cloudSync = require('./cloud-sync');
const userDataManager = require('./user-data-manager');
const { createConfigStore } = require('./config');
const { client } = require('./api');
const { DEFAULT_ANONYMOUS_SUBSCRIPTION, DEFAULT_ANONYMOUS } = require('./constants');

// Store window references
let windows = null;
// Cloud synchronization object
let syncManager = null;

/**
 * Initialize authentication manager
 * @param {Object} windowsRef - Application windows reference object
 */
function initialize(windowsRef) {
  windows = windowsRef;

  // Initialize cloud synchronization
  syncManager = cloudSync.initCloudSync();

  // Set authManager reference - pass an object containing only the necessary methods to avoid circular references
  cloudSync.setAuthManager({
    getAccessToken,
    hasValidToken,
    refreshAccessToken: () => auth.refreshAccessToken()
  });

  // Initialize user data manager
  userDataManager.initialize(client, {
    getAccessToken,
    hasValidToken,
    fetchUserProfile: () => auth.fetchUserProfile(),
    fetchSubscription: () => auth.fetchSubscription()
  });

  // Set user data manager reference in cloud synchronization module
  cloudSync.setUserDataManager(userDataManager);
}

/**
 * Start login process
 * @returns {Promise<boolean>} Whether process started successfully
 */
async function initiateLogin() {
  try {
    return await auth.initiateLogin();
  } catch (error) {
    console.error('Error initiating login:', error);
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
  } catch (error) {
    console.error('Error exchanging code for token:', error);
    return {
      success: false,
      error: error.message || 'Failed to exchange code for token'
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
    console.log('Starting exchange of authentication code for token and update of profile/settings');
    const result = await auth.exchangeCodeForTokenAndUpdateSubscription(code);

    // Notify both windows on login success
    if (result.success) {
      notifyLoginSuccess(result.subscription);

      // 1. 로그인 성공 시 한 번만 프로필 정보 가져오기
      console.log('Getting user profile information after successful login');
      const userProfile = await auth.fetchUserProfile();

      // 구독 정보 로깅
      if (userProfile) {
        const userEmail = userProfile.email || result.subscription?.userId || 'unknown';
        const userName = userProfile.name || result.subscription?.name || 'unknown user';
        const userPlan = result.subscription?.plan || 'free';
        const isVip = result.subscription?.isVip || false;

        console.log('====== Account Info ======');
        console.log('User email:', userEmail);
        console.log('User name:', userName);
        console.log('Subscription plan:', userPlan);
        console.log('VIP status:', isVip ? 'VIP user' : 'Regular user');
        console.log('=========================');
      }

      // 2. 클라우드 동기화 기능 설정
      let hasSyncFeature = false;
      if (syncManager) {
        console.log('Starting cloud synchronization after successful login');

        // 디버깅 정보 추가
        console.log('서브스크립션 정보 전체:', JSON.stringify(result.subscription || {}));

        // Check if features object exists
        if (result.subscription?.features && typeof result.subscription.features === 'object') {
          hasSyncFeature = result.subscription.features.cloud_sync === true;
          console.log('Checking cloud_sync feature in subscription features:', hasSyncFeature);
        }
        // Check in features_array (alternative method)
        else if (Array.isArray(result.subscription?.features_array)) {
          hasSyncFeature = result.subscription.features_array.includes('cloud_sync');
          console.log('Checking cloud_sync feature in features_array:', hasSyncFeature);
        }
        // Subscribers can use cloud_sync by default
        else if (result.subscription?.isSubscribed === true ||
          result.subscription?.active === true ||
          result.subscription?.is_subscribed === true) {
          hasSyncFeature = true;
          console.log('Cloud_sync feature enabled due to active subscription status');
        }

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

          // Save updated subscription info to settings store
          const config = createConfigStore();
          config.set('subscription', updatedSubscription);
          console.log('Updated subscription information saved:', JSON.stringify(updatedSubscription));
        }

        console.log('Cloud synchronization feature status set:', hasSyncFeature);
        cloudSync.updateCloudSyncSettings(hasSyncFeature);
      }

      // 3. 통합된 동기화 처리 - 프로필과 설정 정보를 한 번에 처리
      const syncPromise = new Promise(async (resolve) => {
        try {
          // 프로필 정보를 파일에 저장 (API 호출 중복 방지)
          if (userProfile) {
            await userDataManager.getUserProfile(true, userProfile); // API 결과를 직접 전달하여 중복 호출 방지
            console.log('User profile information saved successfully');
          }

          // 사용자 설정 정보 가져오기
          console.log('Getting user settings after successful login');
          const userSettings = await getUserSettings(true);

          if (userSettings) {
            console.log('User settings saved successfully');
          }

          // 인증 상태 변경 알림 전송 (프로필 및 설정 포함)
          notifyAuthStateChange({
            isAuthenticated: true,
            profile: userProfile || null,
            settings: userSettings || null
          });
          console.log('Authentication state change notification sent');

          // 클라우드 동기화 실행
          if (syncManager && hasSyncFeature) {
            console.log('Cloud synchronization feature is enabled. Getting settings from server...');

            // 동기화 실행 및 결과 처리
            const syncResult = await syncManager.syncAfterLogin();
            console.log('Cloud synchronization result after login:', syncResult);

            if (syncResult && syncResult.success) {
              // 동기화 성공 시 알림
              notifySettingsSynced();
            } else {
              console.log('Synchronization failed after login:', syncResult?.error || 'Unknown error');
            }
          } else {
            console.log('Cloud synchronization feature is disabled. Please check your subscription status.');
          }

          resolve(true);
        } catch (err) {
          console.error('Error during synchronization:', err);
          resolve(false);
        }
      });

      // 백그라운드에서 동기화 처리
      syncPromise.then((success) => {
        console.log('Login synchronization process completed:', success ? 'successfully' : 'with errors');
      });

    } else {
      notifyLoginError(result.error || 'Unknown error');
    }

    return result;
  } catch (error) {
    console.error('Error in exchangeCodeForTokenAndUpdateSubscription:', error);

    // Send error notification to both windows
    notifyLoginError(error.message || 'Unknown error');

    return {
      success: false,
      error: error.message || 'Unknown error'
    };
  }
}

/**
 * Process logout (delete local tokens and reset environment data)
 * @returns {Promise<boolean>} Whether logout was successful
 */
async function logout() {
  try {
    console.log('Starting logout process');
    const result = await auth.logout();

    // Stop periodic synchronization and update cloud sync settings when logout is successful
    if (result && syncManager) {
      // Disable synchronization feature and stop periodic synchronization
      cloudSync.updateCloudSyncSettings(false);
      cloudSync.stopPeriodicSync();

      console.log('Cloud synchronization disabled and periodic synchronization stopped due to logout');
    }

    // Clean up user data when logout is successful
    if (result) {
      userDataManager.cleanupOnLogout();
      console.log('User data cleanup completed due to logout');

      // Reset subscription information (change to anonymous state)
      const config = createConfigStore();
      config.set('subscription', {
        isAuthenticated: false,
        isSubscribed: false,
        subscribedUntil: '',
        pageGroups: DEFAULT_ANONYMOUS_SUBSCRIPTION.features.page_groups
      });
      console.log('Subscription information reset complete');

      // Send app authentication state change notification
      notifyAuthStateChange({
        isAuthenticated: false,
        profile: DEFAULT_ANONYMOUS,
        settings: null
      });
      console.log('Authentication state change notification sent');
    }

    // Send notification to both windows when logout is successful
    if (result) {
      notifyLogout();
    }

    return result;
  } catch (error) {
    console.error('Error logging out:', error);
    return false;
  }
}

/**
 * Logout and reset page group settings
 * @returns {Promise<boolean>} Whether logout was successful
 */
async function logoutAndResetPageGroups() {
  try {
    console.log('Starting logout and page group reset process');
    const result = await auth.logoutAndResetPageGroups();

    // Stop periodic synchronization and update cloud sync settings when logout is successful
    if (result && syncManager) {
      // Disable synchronization feature and stop periodic synchronization
      cloudSync.updateCloudSyncSettings(false);
      cloudSync.stopPeriodicSync();

      console.log('Cloud synchronization disabled and periodic synchronization stopped due to logout');
    }

    // Clean up user data when logout is successful
    if (result) {
      userDataManager.cleanupOnLogout();
      console.log('User data cleanup completed due to logout');

      // Reset subscription information (change to anonymous state)
      const config = createConfigStore();
      config.set('subscription', {
        isAuthenticated: false,
        isSubscribed: false,
        subscribedUntil: '',
        pageGroups: DEFAULT_ANONYMOUS_SUBSCRIPTION.features.page_groups
      });
      console.log('Subscription information reset complete');

      // Send app authentication state change notification
      notifyAuthStateChange({
        isAuthenticated: false,
        profile: DEFAULT_ANONYMOUS,
        settings: null
      });
      console.log('Authentication state change notification sent');
    }

    // Send notification to both windows when logout is successful
    if (result) {
      notifyLogout();
    }

    return result;
  } catch (error) {
    console.error('Error in logoutAndResetPageGroups:', error);
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
  } else {
    return DEFAULT_ANONYMOUS_SUBSCRIPTION;
  }
}

/**
 * Refresh token
 * @returns {Promise<Object>} Refresh result
 */
async function refreshAccessToken() {
  return await auth.refreshAccessToken();
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
  if (!windows) return;

  const loginData = {
    isAuthenticated: true,
    isSubscribed: subscription?.active || subscription?.is_subscribed || false,
    pageGroups: subscription?.features?.page_groups || 3
  };

  // Send notification to toast window
  if (windows.toast && !windows.toast.isDestroyed()) {
    windows.toast.webContents.send('login-success', loginData);
  }

  // Send notification to settings window
  if (windows.settings && !windows.settings.isDestroyed()) {
    windows.settings.webContents.send('login-success', loginData);
  }

  console.log('Login success notification sent to both windows');
}

/**
 * Send login error notification to both windows
 * @param {string} errorMessage - Error message
 */
function notifyLoginError(errorMessage) {
  if (!windows) return;

  const errorData = {
    error: errorMessage,
    message: 'Authentication failed: ' + errorMessage
  };

  // Send notification to toast window
  if (windows.toast && !windows.toast.isDestroyed()) {
    windows.toast.webContents.send('login-error', errorData);
  }

  // Send notification to settings window
  if (windows.settings && !windows.settings.isDestroyed()) {
    windows.settings.webContents.send('login-error', errorData);
  }

  console.log('Login error notification sent to both windows');
}

/**
 * Send logout notification to both windows
 */
function notifyLogout() {
  if (!windows) return;

  // Send notification to toast window
  if (windows.toast && !windows.toast.isDestroyed()) {
    windows.toast.webContents.send('logout-success', {});
  }

  // Send notification to settings window
  if (windows.settings && !windows.settings.isDestroyed()) {
    windows.settings.webContents.send('logout-success', {});
  }

  console.log('Logout notification sent to both windows');
}

/**
 * Send settings synchronization notification to both windows
 */
function notifySettingsSynced() {
  if (!windows) return;

  const syncData = {
    success: true,
    message: 'Settings have been successfully synchronized with the cloud.'
  };

  // Send notification to toast window
  if (windows.toast && !windows.toast.isDestroyed()) {
    windows.toast.webContents.send('settings-synced', syncData);
  }

  // Send notification to settings window
  if (windows.settings && !windows.settings.isDestroyed()) {
    windows.settings.webContents.send('settings-synced', syncData);
  }

  console.log('Settings synchronization notification sent');
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
  } catch (error) {
    console.error('Manual synchronization error:', error);
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
    } else {
      syncManager.disable();
    }

    return true;
  } catch (error) {
    console.error('Error changing synchronization settings:', error);
    return false;
  }
}

/**
 * Send authentication state change notification to both windows
 * @param {Object} authState - Authentication state information
 */
function notifyAuthStateChange(authState) {
  if (!windows) return;

  // Send notification to toast window
  if (windows.toast && !windows.toast.isDestroyed()) {
    windows.toast.webContents.send('auth-state-changed', authState);
  }

  // Send notification to settings window
  if (windows.settings && !windows.settings.isDestroyed()) {
    windows.settings.webContents.send('auth-state-changed', authState);
  }

  console.log('Auth state change notification sent to both windows');
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
  logoutAndResetPageGroups,
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
  updateSyncSettings
};
