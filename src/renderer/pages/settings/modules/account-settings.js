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
import { authState, updateAuthState } from './state.js';
import { setLoading, getInitials } from './utils.js';
import * as cloudSyncUI from '../cloud-sync.js';

let accountGeneration = 0;
let observedSession = null;
let loadingProfile = null;
let refreshLabelTimer = null;
const refreshLabel = refreshSubscriptionButton?.textContent || 'Refresh Status';

function showAccountError(error) {
  window.settings.log.error('Account request failed:', error.message);
  const alert = document.getElementById('account-error');
  alert.textContent = error.message || 'Could not load account information.';
  alert.classList.remove('hidden');
}

function applyProfile(profile) {
  document.getElementById('account-error').classList.add('hidden');
  if (!profile?.isAuthenticated) {
    updateAuthStateUI(false);
    return;
  }
  if (observedSession !== profile.authSessionVersion) {
    accountGeneration++;
    observedSession = profile.authSessionVersion;
  }
  updateAuthState({ profile, subscription: profile.subscription });
  updateProfileDisplay(profile);
  updateSubscriptionUI(profile.subscription);
  updateAuthStateUI(true);
}

export function initializeAccountSettings() {
  void initializeAuthState();
}

export async function initializeAuthState() {
  try {
    await loadUserDataEfficiently();
  }
  catch (error) {
    showAccountError(error);
  }
}

export async function loadUserDataEfficiently(forceRefresh = false) {
  setLoading(authLoading, true);
  setLoading(subscriptionLoading, true);
  try {
    return await fetchUserProfile(forceRefresh);
  }
  finally {
    setLoading(authLoading, false);
    setLoading(subscriptionLoading, false);
  }
}

export function updateAuthStateUI(isLoggedIn) {
  updateAuthState({ isLoggedIn });
  loginSection.classList.toggle('hidden', isLoggedIn);
  profileSection.classList.toggle('hidden', !isLoggedIn);
  subscriptionSection.classList.toggle('hidden', !isLoggedIn);
  if (isLoggedIn) {
    void window.settings.getSyncStatus().then(status => {
      cloudSyncUI.updateSyncStatusUI(status, authState, window.settings.log);
    }).catch(error => window.settings.log.error('Could not load sync status:', error.message));
  }
  else {
    updateAuthState({ profile: null, subscription: null });
    userAvatar.replaceChildren();
    userName.textContent = '-';
    userEmail.textContent = '-';
    subscriptionBadge.textContent = 'Free';
    subscriptionBadge.className = 'badge free';
    subscriptionStatus.textContent = '-';
    subscriptionExpiry.textContent = '';
    subscriptionFeatures.textContent = '';
    cloudSyncUI.disableCloudSyncUI(window.settings.log);
  }
}

export async function handleLogin() {
  setLoading(authLoading, true);
  loginButton.disabled = true;
  try {
    if (!await window.settings.initiateLogin()) {
      throw new Error('Could not start login.');
    }
  }
  catch (error) {
    finishLogin();
    showAccountError(error);
  }
}

function finishLogin() {
  setLoading(authLoading, false);
  loginButton.disabled = false;
}

export async function handleLogout() {
  try {
    if (!await window.settings.logout()) {
      throw new Error('Could not finish logout.');
    }
    accountGeneration++;
    observedSession = null;
    updateAuthStateUI(false);
  }
  catch (error) {
    showAccountError(error);
  }
}

export function handleManageSubscription() {
  window.settings.openUrl('https://toastapp.dev/subscription');
}

export async function handleRefreshSubscription() {
  clearTimeout(refreshLabelTimer);
  refreshSubscriptionButton.disabled = true;
  refreshSubscriptionButton.textContent = 'Refreshing...';
  try {
    await fetchSubscriptionInfo(true);
    refreshSubscriptionButton.textContent = 'Refresh Complete!';
  }
  catch (error) {
    showAccountError(error);
    refreshSubscriptionButton.textContent = 'Refresh Failed';
  }
  finally {
    refreshSubscriptionButton.disabled = false;
    refreshLabelTimer = setTimeout(() => {
      refreshSubscriptionButton.textContent = refreshLabel;
    }, 1500);
  }
}

export async function fetchUserProfile(forceRefresh = false) {
  const generation = accountGeneration;
  if (!loadingProfile || forceRefresh || loadingProfile.generation !== generation) {
    const request = { generation };
    request.promise = window.settings.fetchUserProfile(forceRefresh).then(profile => {
      if (profile?.error) {
        throw new Error(profile.error.message || profile.error.code);
      }
      // A current auth-state event can arrive before this IPC response. Only
      // accept it when the response still belongs to that observed session.
      if (generation !== accountGeneration && profile?.authSessionVersion !== observedSession) {
        throw new Error('The account changed during this request.');
      }
      applyProfile(profile);
      return profile;
    }).finally(() => {
      if (loadingProfile === request) {
        loadingProfile = null;
      }
    });
    loadingProfile = request;
  }
  return loadingProfile.promise;
}

export async function fetchSubscriptionInfo(forceRefresh = false) {
  setLoading(subscriptionLoading, true);
  try {
    const profile = await fetchUserProfile(forceRefresh);
    if (!profile?.isAuthenticated || !profile.subscription) {
      throw new Error('Sign in to refresh subscription information.');
    }
    return profile.subscription;
  }
  finally {
    setLoading(subscriptionLoading, false);
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

export function setupAccountEventListeners() {
  loginButton?.addEventListener('click', handleLogin);
  logoutButton?.addEventListener('click', handleLogout);
  manageSubscriptionButton?.addEventListener('click', handleManageSubscription);
  refreshSubscriptionButton?.addEventListener('click', handleRefreshSubscription);

  window.addEventListener('login-success', () => {
    finishLogin();
    void loadUserDataAndUpdateUI().catch(showAccountError);
  });
  window.addEventListener('login-error', event => {
    finishLogin();
    showAccountError(new Error(event.detail?.message || event.detail?.error || 'Login failed.'));
  });
  window.addEventListener('logout-success', () => {
    accountGeneration++;
    observedSession = null;
    updateAuthStateUI(false);
  });
  window.addEventListener('auth-state-changed', event => {
    const data = event.detail;
    if (data?.isAuthenticated === false) {
      accountGeneration++;
      observedSession = null;
      updateAuthStateUI(false);
    }
    else if (data?.profile) {
      applyProfile(data.profile);
    }
  });
}

export async function loadUserDataAndUpdateUI() {
  return loadUserDataEfficiently();
}
