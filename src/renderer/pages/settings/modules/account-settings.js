/**
 * Settings - Account Settings Management
 */

import {
  loginSection,
  profileSection,
  subscriptionSection,
  loginButton,
  logoutButton,
  userAvatar,
  userName,
  userEmail,
  subscriptionBadge,
  subscriptionStatus,
  subscriptionExpiry,
  subscriptionFeatures,
  manageSubscriptionButton,
  refreshSubscriptionButton,
  authLoading,
  subscriptionLoading,
} from './dom-elements.js';
import {
  authState,
  authStateInitialized,
  profileDataFetchInProgress,
  updateAuthState,
  setAuthStateInitialized,
  setProfileDataFetchInProgress,
} from './state.js';
import { setLoading, getInitials, saveSubscriptionToConfig, handleTokenExpired } from './utils.js';
import * as cloudSyncUI from '../cloud-sync.js';

/**
 * Initialize Account Settings tab
 */
export function initializeAccountSettings() {
  window.settings.log.info('initializeAccountSettings called');

  try {
    // Only initialize auth state to prevent duplicate calls
    // initializeAuthState() already loads the necessary profile and subscription info internally
    initializeAuthState();
  }
  catch (error) {
    window.settings.log.error('Error occurred while initializing account settings:', error);
  }
}

/**
 * Initialize authentication state - prevent duplicate calls and optimize
 */
export async function initializeAuthState() {
  if (authStateInitialized) {
    window.settings.log.info('Auth state is already initialized, skipping duplicate initialization.');
    return;
  }

  // Mark initialization in progress
  setAuthStateInitialized(true);

  try {
    // Check if we have authentication tokens
    const token = await window.settings.getAuthToken();

    if (token) {
      // Update logged-in state UI
      updateAuthStateUI(true);

      // Load profile and subscription info (prevent duplicate calls)
      if (!profileDataFetchInProgress && !authState.profile) {
        await loadUserDataEfficiently();
      }
    }
    else {
      // No tokens, show login UI
      updateAuthStateUI(false);
    }
  }
  catch (error) {
    window.settings.log.error('Failed to initialize auth state:', error);
    // Show login UI when error occurs
    updateAuthStateUI(false);
    // Reset initialization state on error
    setAuthStateInitialized(false);
  }
}

/**
 * Efficiently load profile and subscription info (prevent duplicate calls)
 */
export async function loadUserDataEfficiently() {
  // Skip if data is already loading
  if (profileDataFetchInProgress) {
    window.settings.log.info('Profile data load is already in progress.');
    return;
  }

  setProfileDataFetchInProgress(true);

  try {
    window.settings.log.info('Starting efficient load of user profile and subscription info');

    // Show loading
    if (authLoading) {
      setLoading(authLoading, true);
    }
    if (subscriptionLoading) {
      setLoading(subscriptionLoading, true);
    }

    // Load profile info
    await fetchUserProfile();

    // Load subscription info (prevent duplicate request if profile already exists)
    await fetchSubscriptionInfo();

    // Hide loading
    if (authLoading) {
      setLoading(authLoading, false);
    }
    if (subscriptionLoading) {
      setLoading(subscriptionLoading, false);
    }

    window.settings.log.info('User profile and subscription info load complete');
  }
  catch (error) {
    window.settings.log.error('Error occurred while loading user data:', error);
    if (authLoading) {
      setLoading(authLoading, false);
    }
    if (subscriptionLoading) {
      setLoading(subscriptionLoading, false);
    }
  }
  finally {
    // Mark data load complete
    setProfileDataFetchInProgress(false);
  }
}

/**
 * Update UI based on authentication state
 * @param {boolean} isLoggedIn - Whether the user is logged in
 */
export function updateAuthStateUI(isLoggedIn) {
  updateAuthState({ isLoggedIn });

  if (isLoggedIn) {
    // Show profile and subscription sections, hide login section
    loginSection.classList.add('hidden');
    profileSection.classList.remove('hidden');
    subscriptionSection.classList.remove('hidden');

    // Update Cloud Sync UI as well (will only show if user has permission)
    window.settings
      .getSyncStatus()
      .then(status => {
        cloudSyncUI.updateSyncStatusUI(status, authState, window.settings.log);
      })
      .catch(error => {
        window.settings.log.error('Error getting sync status:', error);
      });
  }
  else {
    // Clear the cached profile/subscription so the next login re-fetches
    // fresh data. Without this, fetchUserProfile()/fetchSubscriptionInfo()'s
    // `if (authState.profile) return authState.profile;` cache check would
    // keep returning the previous account's data after a different user logs
    // in during the same session.
    updateAuthState({ profile: null, subscription: null });

    // Show login section, hide profile and subscription sections
    loginSection.classList.remove('hidden');
    profileSection.classList.add('hidden');
    subscriptionSection.classList.add('hidden');

    // Reset profile and subscription UI
    userAvatar.src = '';
    userName.textContent = '-';
    userEmail.textContent = '-';
    subscriptionBadge.textContent = 'Free';
    subscriptionBadge.className = 'badge free';
    subscriptionStatus.textContent = '-';
    subscriptionExpiry.textContent = '-';
    subscriptionFeatures.textContent = '-';

    // Disable Cloud Sync UI
    cloudSyncUI.disableCloudSyncUI(window.settings.log);
  }
}

/**
 * Handle login button click
 */
export function handleLogin() {
  window.settings.log.info('Login started');

  try {
    // Show loading
    if (authLoading) {
      setLoading(authLoading, true);
    }
    if (loginButton) {
      loginButton.disabled = true;
    }

    // Start login
    window.settings
      .initiateLogin()
      .then(success => {
        if (!success) {
          // Login failed
          if (authLoading) {
            setLoading(authLoading, false);
          }
          if (loginButton) {
            loginButton.disabled = false;
          }
          window.settings.log.error('Failed to start login');
        }
      })
      .catch(error => {
        // Handle error
        window.settings.log.error('Login error:', error);
        if (authLoading) {
          setLoading(authLoading, false);
        }
        if (loginButton) {
          loginButton.disabled = false;
        }
      });
  }
  catch (error) {
    window.settings.log.error('Error occurred while processing login:', error);
    if (authLoading) {
      setLoading(authLoading, false);
    }
    if (loginButton) {
      loginButton.disabled = false;
    }
  }
}

/**
 * Handle logout button click
 */
export function handleLogout() {
  window.settings.log.info('Logout started');

  try {
    window.settings
      .logout()
      .then(() => {
        // Update UI on successful logout
        updateAuthStateUI(false);
        window.settings.log.info('Logout successful');
      })
      .catch(error => {
        window.settings.log.error('Logout error:', error);
      });
  }
  catch (error) {
    window.settings.log.error('Error occurred while processing logout:', error);
  }
}

/**
 * Handle manage subscription button click
 */
export function handleManageSubscription() {
  window.settings.log.info('Opening subscription management page');
  window.settings.openUrl('https://app.toast.sh/subscription');
}

/**
 * Handle refresh subscription button click
 */
export function handleRefreshSubscription() {
  window.settings.log.info('Refreshing subscription info');

  try {
    // Disable button and show loading
    if (refreshSubscriptionButton) {
      refreshSubscriptionButton.disabled = true;
      refreshSubscriptionButton.textContent = 'Refreshing...';
    }

    if (subscriptionLoading) {
      setLoading(subscriptionLoading, true);
    }

    // Reload subscription info
    fetchSubscriptionInfo()
      .then(() => {
        // Show success message
        if (refreshSubscriptionButton) {
          refreshSubscriptionButton.textContent = 'Refresh Complete!';
          setTimeout(() => {
            refreshSubscriptionButton.textContent = 'Refresh Subscription Info';
            refreshSubscriptionButton.disabled = false;
          }, 1500);
        }
      })
      .catch(error => {
        window.settings.log.error('Subscription info refresh error:', error);

        // Show error message
        if (refreshSubscriptionButton) {
          refreshSubscriptionButton.textContent = 'Refresh Failed';
          setTimeout(() => {
            refreshSubscriptionButton.textContent = 'Refresh Subscription Info';
            refreshSubscriptionButton.disabled = false;
          }, 1500);
        }
      });
  }
  catch (error) {
    window.settings.log.error('Error occurred while processing subscription info refresh:', error);

    // Restore button and loading state on error
    if (subscriptionLoading) {
      setLoading(subscriptionLoading, false);
    }
    if (refreshSubscriptionButton) {
      refreshSubscriptionButton.textContent = 'Refresh Subscription Info';
      refreshSubscriptionButton.disabled = false;
    }
  }
}

/**
 * Fetch user profile information - prevent duplicate requests
 */
export async function fetchUserProfile() {
  try {
    // Prevent duplicate request if profile info already exists
    if (authState.profile) {
      window.settings.log.info('Using existing profile info (preventing duplicate request)');
      updateProfileDisplay(authState.profile);
      return authState.profile;
    }

    // Check if token exists first
    const token = await window.settings.getAuthToken();
    if (!token) {
      window.settings.log.info('No auth token available, skipping profile fetch');
      return null;
    }

    window.settings.log.info('Requesting profile info anew');
    const profile = await window.settings.fetchUserProfile();
    if (profile) {
      updateAuthState({ profile });

      // Update UI with profile information
      updateProfileDisplay(profile);
      return profile;
    }
    return null;
  }
  catch (error) {
    window.settings.log.error('Failed to fetch user profile:', error);
    // Handle token expired case
    if (error.message && error.message.includes('token expired')) {
      handleTokenExpired();
    }
    return null;
  }
}

/**
 * Update profile display with user information
 * @param {Object} profile - User profile information
 */
export function updateProfileDisplay(profile) {
  // Clear previous content
  userAvatar.innerHTML = '';

  if (profile.avatar_url || profile.profile_image || profile.avatar || profile.image) {
    // If profile image exists
    const img = document.createElement('img');
    img.src = profile.avatar_url || profile.profile_image || profile.avatar || profile.image;
    img.alt = 'Profile';

    // Handle image load error
    img.onerror = function () {
      // Use initials as fallback if image load fails
      const initials = getInitials(profile.name || profile.display_name || 'User');
      userAvatar.textContent = initials;
    };

    userAvatar.appendChild(img);
  }
  else {
    // Display initials if no image available
    const initials = getInitials(profile.name || profile.display_name || 'User');
    userAvatar.textContent = initials;
  }

  // Set name and email
  userName.textContent = profile.name || profile.display_name || 'User';
  userEmail.textContent = profile.email || '';
}

/**
 * Fetch subscription information - prevent duplicate requests and unnecessary API calls
 */
export async function fetchSubscriptionInfo() {
  try {
    // Prevent duplicate request if subscription info already exists
    if (authState.subscription) {
      window.settings.log.info('Using existing subscription info (preventing duplicate request)');
      updateSubscriptionUI(authState.subscription);
      return authState.subscription;
    }

    // Check if token exists first
    const token = await window.settings.getAuthToken();
    if (!token) {
      window.settings.log.info('No auth token available, skipping subscription fetch');
      setLoading(subscriptionLoading, false);
      return null;
    }

    // Log for subscription info check
    window.settings.log.info('Starting subscription info request');

    // Reuse profile info if it already exists, otherwise fetch it
    let profile = authState.profile;
    if (!profile) {
      profile = await fetchUserProfile();
    }

    // Reuse subscription info if the profile already contains it
    if (profile && profile.subscription) {
      window.settings.log.info('Using subscription info from profile:', JSON.stringify(profile.subscription));
      updateAuthState({ subscription: profile.subscription });
      updateSubscriptionUI(profile.subscription);
      saveSubscriptionToConfig(profile.subscription);
      return profile.subscription;
    }

    // Make a separate request only if the profile has no subscription info
    window.settings.log.info('Making separate subscription info request');
    const subscription = await window.settings.fetchSubscription();
    window.settings.log.info('Subscription info received:', subscription ? 'success' : 'failure');

    if (subscription) {
      window.settings.log.info('Received subscription info:', JSON.stringify({ plan: subscription.plan, active: subscription.active, isSubscribed: subscription.isSubscribed }));

      // Add cloud_sync info if missing from subscription info (for premium users)
      if (subscription.plan && subscription.plan.toLowerCase().includes('premium')) {
        if (!subscription.features) {
          subscription.features = {};
        }
        // Enable cloud_sync feature for premium users
        subscription.features.cloud_sync = true;
        window.settings.log.info('Premium subscription detected, enabling cloud_sync');
      }

      updateAuthState({ subscription });

      // Update subscription UI
      updateSubscriptionUI(subscription);

      // Save subscription info to config
      saveSubscriptionToConfig(subscription);

      // Save subscription info directly to config
      await window.settings.setConfig('subscription', subscription);

      return subscription;
    }

    return null;
  }
  catch (error) {
    window.settings.log.error('Failed to fetch subscription info:', error);

    // Handle token expired case
    if (error.message && error.message.includes('token expired')) {
      handleTokenExpired();
    }

    return null;
  }
  finally {
    // Hide loading state
    setLoading(subscriptionLoading, false);
  }
}

/**
 * Update subscription UI with subscription information
 * @param {Object} subscription - Subscription information
 */
export function updateSubscriptionUI(subscription) {
  // Update subscription badge
  if (subscription.is_subscribed) {
    subscriptionBadge.textContent = subscription.plan || 'Premium';
    subscriptionBadge.className = 'badge premium';
    subscriptionStatus.textContent = 'Active';
  }
  else {
    subscriptionBadge.textContent = 'Free';
    subscriptionBadge.className = 'badge free';
    subscriptionStatus.textContent = 'Free Plan';
  }

  // Update subscription expiry
  if (subscription.expiresAt || subscription.subscribed_until) {
    const expiryValue = subscription.expiresAt || subscription.subscribed_until;
    const expiryDate = new Date(expiryValue);
    subscriptionExpiry.textContent = `Subscription valid until: ${expiryDate.toLocaleDateString()}`;
  }
  else {
    subscriptionExpiry.textContent = '';
  }

  // Update subscription features
  const featuresText = [];
  if (subscription.features) {
    if (subscription.features.page_groups) {
      featuresText.push(`${subscription.features.page_groups} page groups`);
    }
    if (subscription.features.advanced_actions) {
      featuresText.push('Advanced actions');
    }
    if (subscription.features.cloud_sync) {
      featuresText.push('Cloud sync');
    }
  }

  subscriptionFeatures.textContent = featuresText.length > 0 ? `Features: ${featuresText.join(', ')}` : 'Basic features';
}

/**
 * Setup account settings event listeners
 */
export function setupAccountEventListeners() {
  // Account buttons
  if (loginButton) {
    loginButton.addEventListener('click', handleLogin);
  }

  if (logoutButton) {
    logoutButton.addEventListener('click', handleLogout);
  }

  if (manageSubscriptionButton) {
    manageSubscriptionButton.addEventListener('click', handleManageSubscription);
  }

  if (refreshSubscriptionButton) {
    refreshSubscriptionButton.addEventListener('click', handleRefreshSubscription);
  }

  // Subscription-related events
  window.addEventListener('login-success', event => {
    window.settings.log.info('Login success event received in settings window');
    // Load user data and update UI when login is successful
    loadUserDataAndUpdateUI();
  });
}

/**
 * Load user profile information and update UI - uses efficient data loading
 */
export async function loadUserDataAndUpdateUI() {
  window.settings.log.info('loadUserDataAndUpdateUI called');

  // Call the optimized data load function
  await loadUserDataEfficiently();

  // Update auth state UI
  updateAuthStateUI(true);
}
