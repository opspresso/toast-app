/**
 * Toast - Settings Window JavaScript
 *
 * This script handles the functionality of the Settings window.
 */

// DOM Elements - Tabs
const tabLinks = document.querySelectorAll('.settings-nav li');
const tabContents = document.querySelectorAll('.settings-tab');

// DOM Elements - General Settings
const globalHotkeyInput = document.getElementById('global-hotkey');
const recordHotkeyButton = document.getElementById('record-hotkey');
const clearHotkeyButton = document.getElementById('clear-hotkey');
const launchAtLoginCheckbox = document.getElementById('launch-at-login');

// DOM Elements - Appearance Settings
const themeSelect = document.getElementById('theme');
const positionSelect = document.getElementById('position');
const sizeSelect = document.getElementById('size');
const opacityRange = document.getElementById('opacity');
const opacityValue = document.getElementById('opacity-value');

// DOM Elements - Account & Subscription
const loginSection = document.getElementById('login-section');
const profileSection = document.getElementById('profile-section');
const subscriptionSection = document.getElementById('subscription-section');
const loginButton = document.getElementById('login-button');
const logoutButton = document.getElementById('logout-button');
const userAvatar = document.getElementById('user-avatar');
const userName = document.getElementById('user-name');
const userEmail = document.getElementById('user-email');
const subscriptionBadge = document.getElementById('subscription-badge');
const subscriptionStatus = document.getElementById('subscription-status');
const subscriptionExpiry = document.getElementById('subscription-expiry');
const subscriptionFeatures = document.getElementById('subscription-features');
const manageSubscriptionButton = document.getElementById('manage-subscription');
const refreshSubscriptionButton = document.getElementById('refresh-subscription');
const authLoading = document.getElementById('auth-loading');
const subscriptionLoading = document.getElementById('subscription-loading');

// DOM Elements - Advanced Settings
const hideAfterActionCheckbox = document.getElementById('hide-after-action');
const hideOnBlurCheckbox = document.getElementById('hide-on-blur');
const hideOnEscapeCheckbox = document.getElementById('hide-on-escape');
const showInTaskbarCheckbox = document.getElementById('show-in-taskbar');
const resetSettingsButton = document.getElementById('reset-settings');

// DOM Elements - Cloud Sync
const syncStatusBadge = document.getElementById('sync-status-badge');
const syncStatusText = document.getElementById('sync-status-text');
const lastSyncedTime = document.getElementById('last-synced-time');
const syncDeviceInfo = document.getElementById('sync-device-info');
const enableCloudSyncCheckbox = document.getElementById('enable-cloud-sync');
const manualSyncUploadButton = document.getElementById('manual-sync-upload');
const manualSyncDownloadButton = document.getElementById('manual-sync-download');
const manualSyncResolveButton = document.getElementById('manual-sync-resolve');
const syncLoading = document.getElementById('sync-loading');

// DOM Elements - Main Buttons
const saveButton = document.getElementById('save-button');
const cancelButton = document.getElementById('cancel-button');

// State
let config = {};
let isRecordingHotkey = false;
let unsavedChanges = false;
let authState = {
  isLoggedIn: false,
  profile: null,
  subscription: null
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  // Load configuration
  window.addEventListener('config-loaded', (event) => {
    config = event.detail;

    // Initialize UI with config values
    initializeUI();

    // Set up event listeners
    setupEventListeners();
  });

  // Load config
  window.settings.getConfig().then(loadedConfig => {
    config = loadedConfig;
    initializeUI();

    // Apply current theme
    applyTheme(config.appearance?.theme || 'system');

    // Initialize auth state
    initializeAuthState();
  });
});

/**
 * Apply theme to the application
 * @param {string} theme - The theme to apply ('light', 'dark', or 'system')
 */
function applyTheme(theme) {
  // Remove any existing theme classes first
  document.documentElement.classList.remove('theme-light', 'theme-dark');

  // Remove data-theme attribute (used for forced themes)
  document.documentElement.removeAttribute('data-theme');

  // Apply the selected theme
  if (theme === 'light') {
    document.documentElement.setAttribute('data-theme', 'light');
  } else if (theme === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
  }

  // If 'system', we don't set anything and let the media query handle it

  // Log theme change
  console.log('Theme changed to:', theme);
}

/**
 * Initialize UI with config values
 */
function initializeUI() {
  console.log('initializeUI 호출');

  // General settings
  globalHotkeyInput.value = config.globalHotkey || '';
  launchAtLoginCheckbox.checked = config.advanced?.launchAtLogin || false;

  // Appearance settings
  themeSelect.value = config.appearance?.theme || 'system';
  positionSelect.value = config.appearance?.position || 'center';
  sizeSelect.value = config.appearance?.size || 'medium';
  opacityRange.value = config.appearance?.opacity || 0.95;
  opacityValue.textContent = opacityRange.value;

  // Advanced settings
  hideAfterActionCheckbox.checked = config.advanced?.hideAfterAction !== false;
  hideOnBlurCheckbox.checked = config.advanced?.hideOnBlur !== false;
  hideOnEscapeCheckbox.checked = config.advanced?.hideOnEscape !== false;
  showInTaskbarCheckbox.checked = config.advanced?.showInTaskbar || false;

  // Cloud Sync settings
  initializeCloudSyncUI();
}

/**
 * Initialize Cloud Sync UI
 */
function initializeCloudSyncUI() {
  console.log('initializeCloudSyncUI 호출');

  try {
    // Cloud Sync enabled/disabled
    const cloudSyncEnabled = config.cloudSync?.enabled !== false;
    enableCloudSyncCheckbox.checked = cloudSyncEnabled;

    // Get current sync status
    window.settings.getSyncStatus().then(status => {
      console.log('getSyncStatus 호출 결과:', status);
      updateSyncStatusUI(status);
    }).catch(error => {
      console.error('Error getting sync status:', error);
    });
  } catch (error) {
    console.error('Error initializing Cloud Sync UI:', error);
  }
}

/**
 * Initialize authentication state
 */
async function initializeAuthState() {
  try {
    // Check if we have authentication tokens
    const token = await window.settings.getAuthToken();

    if (token) {
      // We have tokens, fetch user profile
      updateAuthStateUI(true);
      fetchUserProfile();
      fetchSubscriptionInfo();
    } else {
      // No tokens, show login UI
      updateAuthStateUI(false);
    }
  } catch (error) {
    console.error('Failed to initialize auth state:', error);
    // Show login UI when error occurs
    updateAuthStateUI(false);
  }
}

/**
 * Update UI based on authentication state
 * @param {boolean} isLoggedIn - Whether the user is logged in
 */
function updateAuthStateUI(isLoggedIn) {
  authState.isLoggedIn = isLoggedIn;

  if (isLoggedIn) {
    // Show profile and subscription sections, hide login section
    loginSection.classList.add('hidden');
    profileSection.classList.remove('hidden');
    subscriptionSection.classList.remove('hidden');

    // Update Cloud Sync UI as well (will only show if user has permission)
    window.settings.getSyncStatus().then(status => {
      updateSyncStatusUI(status);
    }).catch(error => {
      console.error('Error getting sync status:', error);
    });
  } else {
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
    disableCloudSyncUI();
  }
}

/**
 * Update Cloud Sync status UI
 * @param {Object} status - Cloud Sync status object
 */
function updateSyncStatusUI(status) {
  if (!status) {
    disableCloudSyncUI();
    return;
  }

  // Update sync status badge
  if (status.enabled) {
    syncStatusBadge.textContent = 'Enabled';
    syncStatusBadge.className = 'badge premium';
  } else {
    syncStatusBadge.textContent = 'Disabled';
    syncStatusBadge.className = 'badge secondary';
  }

  // Update sync status text
  syncStatusText.textContent = status.enabled
    ? 'Cloud Sync Enabled'
    : 'Cloud Sync Disabled';

  // Update last synced time
  const lastSyncTime = status.timestamp ? new Date(status.timestamp) : null;
  lastSyncedTime.textContent = lastSyncTime
    ? `Last Synced: ${lastSyncTime.toLocaleString()}`
    : 'Last Synced: Not yet synchronized';

  // Update device info
  syncDeviceInfo.textContent = status.deviceId
    ? `Current Device: ${status.deviceId}`
    : 'Current Device: Unknown';

  // Enable/disable buttons based on status
  let hasCloudSyncPermission = false;

  // // Check subscription in various formats
  // if (
  //   authState.subscription?.isSubscribed === true ||
  //   authState.subscription?.active === true ||
  //   authState.subscription?.is_subscribed === true
  // ) {
  //   hasCloudSyncPermission = true;
  // }

  const canUseCloudSync = hasCloudSyncPermission;

  console.log('canUseCloudSync:', canUseCloudSync);

  enableCloudSyncCheckbox.disabled = !hasCloudSyncPermission;
  enableCloudSyncCheckbox.checked = status.enabled;

  // manualSyncUploadButton.disabled = !canUseCloudSync || !status.enabled;
  // manualSyncDownloadButton.disabled = !canUseCloudSync || !status.enabled;
  // manualSyncResolveButton.disabled = !canUseCloudSync || !status.enabled;
}

/**
 * Disable Cloud Sync UI
 */
function disableCloudSyncUI() {
  syncStatusBadge.textContent = 'Disabled';
  syncStatusBadge.className = 'badge secondary';
  syncStatusText.textContent = 'Cloud Sync Disabled';
  lastSyncedTime.textContent = 'Last Synced: -';
  syncDeviceInfo.textContent = 'Current Device: -';

  enableCloudSyncCheckbox.checked = false;
  enableCloudSyncCheckbox.disabled = true;

  manualSyncUploadButton.disabled = true;
  manualSyncDownloadButton.disabled = true;
  manualSyncResolveButton.disabled = true;
}

/**
 * Fetch user profile information
 */
async function fetchUserProfile() {
  try {
    // Check if token exists first
    const token = await window.settings.getAuthToken();
    if (!token) {
      console.log('No auth token available, skipping profile fetch');
      return;
    }

    const profile = await window.settings.fetchUserProfile();
    if (profile) {
      authState.profile = profile;

      // Update UI with profile information
      updateProfileDisplay(profile);
    }
  } catch (error) {
    console.error('Failed to fetch user profile:', error);
    // Handle token expired case
    if (error.message && error.message.includes('token expired')) {
      handleTokenExpired();
    }
  }
}

/**
 * Update profile display with user information
 * @param {Object} profile - User profile information
 */
function updateProfileDisplay(profile) {
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
  } else {
    // Display initials if no image available
    const initials = getInitials(profile.name || profile.display_name || 'User');
    userAvatar.textContent = initials;
  }

  // Set name and email
  userName.textContent = profile.name || profile.display_name || 'User';
  userEmail.textContent = profile.email || '';
}

/**
 * Extract initials from user name
 * @param {string} name - User name
 * @returns {string} - Initials (up to 2 characters)
 */
function getInitials(name) {
  return name
    .split(' ')
    .map(part => part.charAt(0))
    .join('')
    .toUpperCase()
    .substring(0, 2);
}

/**
 * Fetch subscription information
 * (subscription information is provided by the profile API)
 */
async function fetchSubscriptionInfo() {
  try {
    // Show loading state
    setLoading(subscriptionLoading, true);

    // Check if token exists first
    const token = await window.settings.getAuthToken();
    if (!token) {
      console.log('No auth token available, skipping subscription fetch');
      setLoading(subscriptionLoading, false);
      return;
    }

    // 구독 정보 확인을 위한 로그
    console.log('구독 정보 요청 시작');

    // 프로필 정보를 먼저 가져와 구독 정보 확인
    const profile = await window.settings.fetchUserProfile();
    console.log('프로필 정보 수신:', profile ? '성공' : '실패');

    if (profile && profile.subscription) {
      console.log('프로필에서 구독 정보 발견:', JSON.stringify(profile.subscription));
    }

    // fetchSubscription gets subscription info through the profile API
    const subscription = await window.settings.fetchSubscription();
    console.log('구독 정보 수신:', subscription ? '성공' : '실패');

    if (subscription) {
      console.log('수신된 구독 정보:', JSON.stringify(subscription));

      // 구독 정보에 cloud_sync 정보가 없으면 추가 (프리미엄 사용자면)
      if (subscription.plan && (
        subscription.plan.toLowerCase().includes('premium') ||
        subscription.plan.toLowerCase().includes('pro')
      )) {
        if (!subscription.features) {
          subscription.features = {};
        }
        // 프리미엄/프로 사용자라면 cloud_sync 기능 활성화
        subscription.features.cloud_sync = true;
        console.log('프리미엄 구독 감지, cloud_sync 활성화');
      }

      authState.subscription = subscription;

      // Update subscription UI
      updateSubscriptionUI(subscription);

      // Save subscription info to config
      saveSubscriptionToConfig(subscription);

      // 구독 정보를 설정에 직접 저장
      await window.settings.setConfig('subscription', subscription);
    }

    // Hide loading state
    setLoading(subscriptionLoading, false);
  } catch (error) {
    console.error('Failed to fetch subscription info:', error);
    // Hide loading state
    setLoading(subscriptionLoading, false);

    // Handle token expired case
    if (error.message && error.message.includes('token expired')) {
      handleTokenExpired();
    }
  }
}

/**
 * Update subscription UI with subscription information
 * @param {Object} subscription - Subscription information
 */
function updateSubscriptionUI(subscription) {
  // Update subscription badge
  if (subscription.is_subscribed) {
    subscriptionBadge.textContent = subscription.plan || 'Premium';
    subscriptionBadge.className = 'badge premium';
    subscriptionStatus.textContent = 'Active';
  } else {
    subscriptionBadge.textContent = 'Free';
    subscriptionBadge.className = 'badge free';
    subscriptionStatus.textContent = 'Free Plan';
  }

  // Update subscription expiry
  if (subscription.subscribed_until) {
    const expiryDate = new Date(subscription.subscribed_until);
    subscriptionExpiry.textContent = `Subscription valid until: ${expiryDate.toLocaleDateString()}`;
  } else {
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

  subscriptionFeatures.textContent = featuresText.length > 0
    ? `Features: ${featuresText.join(', ')}`
    : 'Basic features';
}

/**
 * Save subscription information to config
 * @param {Object} subscription - Subscription information
 */
function saveSubscriptionToConfig(subscription) {
  // subscribedUntil은 문자열이어야 함
  let subscribedUntilStr = null;
  if (subscription.subscribed_until) {
    // 날짜 객체인 경우 ISO 문자열로 변환
    if (subscription.subscribed_until instanceof Date) {
      subscribedUntilStr = subscription.subscribed_until.toISOString();
    }
    // 숫자(타임스탬프)인 경우 ISO 문자열로 변환
    else if (typeof subscription.subscribed_until === 'number') {
      subscribedUntilStr = new Date(subscription.subscribed_until).toISOString();
    }
    // 이미 문자열인 경우 그대로 사용
    else if (typeof subscription.subscribed_until === 'string') {
      subscribedUntilStr = subscription.subscribed_until;
    }
  }

  const subscriptionConfig = {
    isSubscribed: subscription.is_subscribed,
    plan: subscription.plan,
    subscribedUntil: subscribedUntilStr,
    pageGroups: subscription.features?.page_groups || 1,
    additionalFeatures: {
      advancedActions: subscription.features?.advanced_actions || false,
      cloudSync: subscription.features?.cloud_sync || false
    }
  };

  window.settings.setConfig('subscription', subscriptionConfig);
}

/**
 * Handle token expiration
 */
function handleTokenExpired() {
  // Show token expired notification
  alert('Your session has expired. Please sign in again.');

  // Log out
  handleLogout();
}

/**
 * Show/hide loading state
 * @param {HTMLElement} loadingElement - Loading indicator element
 * @param {boolean} isLoading - Loading state
 */
function setLoading(loadingElement, isLoading) {
  if (isLoading) {
    loadingElement.classList.remove('hidden');
  } else {
    loadingElement.classList.add('hidden');
  }
}

/**
 * Load user profile information and update UI
 * @returns {Promise<void>}
 */
async function loadUserDataAndUpdateUI() {
  try {
    // Load profile information (now querying all information through profile API)
    await fetchUserProfile();

    // Update UI after loading data
    updateAuthStateUI(true);

    // Hide loading indicator
    setLoading(authLoading, false);
    loginButton.disabled = false;
  } catch (error) {
    console.error('Error loading user data:', error);

    // Return to login state if error occurs
    updateAuthStateUI(false);
    setLoading(authLoading, false);
    loginButton.disabled = false;

    // Notify user of error
    alert(`Data loading failed: ${error.message || 'Unknown error'}`);
  }
}

/**
 * Handle login button click
 */
async function handleLogin() {
  try {
    // Show loading state and disable button
    setLoading(authLoading, true);
    loginButton.disabled = true;

    // Call the main process to initiate the OAuth flow
    const success = await window.settings.initiateLogin();

    if (success) {
      // Authentication successful - load user data and update UI
      // Note: UI is updated in loadUserDataAndUpdateUI after data loading
      await loadUserDataAndUpdateUI();
    } else {
      // Login process start failed
      setLoading(authLoading, false);
      loginButton.disabled = false;
    }
  } catch (error) {
    console.error('Login error:', error);
    alert(`Login failed: ${error.message || 'Unknown error'}`);
    // Hide loading state and enable button
    setLoading(authLoading, false);
    loginButton.disabled = false;
  }
}

/**
 * Handle logout button click
 */
async function handleLogout() {
  try {
    // Call the main process to log out (logout only locally)
    await window.settings.logoutAndResetPageGroups();

    // Update UI
    updateAuthStateUI(false);
  } catch (error) {
    console.error('Logout error:', error);
    alert(`Logout failed: ${error.message || 'Unknown error'}`);
  }
}

/**
 * Handle manage subscription button click
 */
function handleManageSubscription() {
  // Open subscription management page in browser
  window.settings.openUrl('https://app.toast.sh/dashboard');
}

/**
 * Handle refresh subscription button click
 */
async function handleRefreshSubscription() {
  try {
    // Disable button and show loading
    refreshSubscriptionButton.disabled = true;
    refreshSubscriptionButton.textContent = 'Refreshing...';
    setLoading(subscriptionLoading, true);

    // Fetch latest subscription info
    await fetchSubscriptionInfo();

    // Show success message and restore button
    refreshSubscriptionButton.textContent = 'Refreshed!';
    setTimeout(() => {
      refreshSubscriptionButton.textContent = 'Refresh Status';
      refreshSubscriptionButton.disabled = false;
    }, 2000);
  } catch (error) {
    console.error('Failed to refresh subscription:', error);
    // Hide loading state
    setLoading(subscriptionLoading, false);

    // Show error message and restore button
    refreshSubscriptionButton.textContent = 'Refresh Failed';
    setTimeout(() => {
      refreshSubscriptionButton.textContent = 'Refresh Status';
      refreshSubscriptionButton.disabled = false;
    }, 2000);
  }
}

/**
 * Set up event listeners
 */
function setupEventListeners() {
  // Tab navigation
  tabLinks.forEach(link => {
    link.addEventListener('click', () => {
      const tabId = link.getAttribute('data-tab');
      switchTab(tabId);
    });
  });

  // General settings
  recordHotkeyButton.addEventListener('click', startRecordingHotkey);
  clearHotkeyButton.addEventListener('click', clearHotkey);
  launchAtLoginCheckbox.addEventListener('change', () => {
    markUnsavedChanges();
  });

  // Appearance settings
  themeSelect.addEventListener('change', () => {
    // Apply theme locally
    applyTheme(themeSelect.value);

    // // Also apply theme to Toast window immediately (show Toast window)
    // window.settings.setConfig('appearance', {
    //   ...config.appearance,
    //   theme: themeSelect.value
    // }).then(() => {
    //   // Show Toast window (to verify theme change)
    //   window.settings.showToast();
    // });

    markUnsavedChanges();
  });
  positionSelect.addEventListener('change', markUnsavedChanges);
  sizeSelect.addEventListener('change', markUnsavedChanges);

  opacityRange.addEventListener('input', () => {
    opacityValue.textContent = opacityRange.value;
    markUnsavedChanges();
  });

  // Account & Subscription
  loginButton.addEventListener('click', handleLogin);
  logoutButton.addEventListener('click', handleLogout);
  manageSubscriptionButton.addEventListener('click', handleManageSubscription);
  refreshSubscriptionButton.addEventListener('click', handleRefreshSubscription);

  // Advanced settings
  hideAfterActionCheckbox.addEventListener('change', markUnsavedChanges);
  hideOnBlurCheckbox.addEventListener('change', markUnsavedChanges);
  hideOnEscapeCheckbox.addEventListener('change', markUnsavedChanges);
  showInTaskbarCheckbox.addEventListener('change', markUnsavedChanges);

  resetSettingsButton.addEventListener('click', confirmResetSettings);

  // Cloud Sync settings
  enableCloudSyncCheckbox.addEventListener('change', handleCloudSyncToggle);
  manualSyncUploadButton.addEventListener('click', handleManualSyncUpload);
  manualSyncDownloadButton.addEventListener('click', handleManualSyncDownload);
  manualSyncResolveButton.addEventListener('click', handleManualSyncResolve);

  // Main buttons
  saveButton.addEventListener('click', saveSettings);
  cancelButton.addEventListener('click', confirmCancel);

  // Hotkey recording
  document.addEventListener('keydown', handleHotkeyRecording);

  // Close settings window with ESC key
  document.addEventListener('keydown', (event) => {
    // Only process if ESC key is pressed and not in hotkey recording mode
    if (event.key === 'Escape' && !isRecordingHotkey) {
      // Confirm save if there are unsaved changes
      if (unsavedChanges) {
        if (confirm('You have unsaved changes. Close without saving?')) {
          window.settings.closeWindow();
        }
      } else {
        // Close directly if no changes
        window.settings.closeWindow();
      }
    }
  });

  // Custom protocol handler for OAuth redirect
  window.addEventListener('protocol-data', (event) => {
    // Handle the OAuth redirect with auth code
    if (event.detail && event.detail.includes('code=')) {
      const code = extractAuthCode(event.detail);
      if (code) {
        handleAuthCode(code);
      }
    }
  });

  // Login success event listener
  window.addEventListener('login-success', (event) => {
    console.log('Login success event received in settings window:', event.detail);
    // Load user data and update UI when login is successful
    loadUserDataAndUpdateUI();
  });

  // Login error event listener
  window.addEventListener('login-error', (event) => {
    console.error('Login error event received in settings window:', event.detail);
    // Update UI when login fails
    updateAuthStateUI(false);
    alert(`Login failed: ${event.detail.message || event.detail.error || 'Unknown error'}`);
  });

  // Logout success event listener
  window.addEventListener('logout-success', (event) => {
    console.log('Logout success event received in settings window');
    // Update UI when logout is successful
    updateAuthStateUI(false);
  });

  // Authentication state change event listener
  window.addEventListener('auth-state-changed', (event) => {
    console.log('Auth state changed event received in settings window:', event.detail);

    // Handle based on authentication state change type
    if (event.detail.type === 'auth-reload') {
      // Load user data and update UI when authentication info is refreshed
      loadUserDataAndUpdateUI();
    }
  });
}

/**
 * Extract authentication code from redirect URI
 * @param {string} uri - Redirect URI containing auth code
 * @returns {string|null} - Extracted auth code or null
 */
function extractAuthCode(uri) {
  const match = uri.match(/[?&]code=([^&]+)/);
  return match ? match[1] : null;
}

/**
 * Handle authentication code
 * @param {string} code - Authentication code
 */
async function handleAuthCode(code) {
  try {
    // Show loading state
    setLoading(authLoading, true);

    // Exchange code for token
    const tokenResult = await window.settings.exchangeCodeForToken(code);

    if (tokenResult.success) {
      // Token exchange successful - load user data and update UI
      // Note: UI is updated in loadUserDataAndUpdateUI after data loading
      await loadUserDataAndUpdateUI();
    } else {
      throw new Error(tokenResult.error || 'Failed to exchange code for token');
    }
  } catch (error) {
    console.error('Authentication error:', error);
    alert(`Authentication failed: ${error.message || 'Unknown error'}`);
    updateAuthStateUI(false);
    // Hide loading state
    setLoading(authLoading, false);
  }
}

/**
 * Switch between tabs
 * @param {string} tabId - ID of the tab to switch to
 */
function switchTab(tabId) {
  // Update tab links
  tabLinks.forEach(link => {
    link.classList.toggle('active', link.getAttribute('data-tab') === tabId);
  });

  // Update tab contents
  tabContents.forEach(content => {
    content.classList.toggle('active', content.id === tabId);
  });
}

/**
 * Start recording a hotkey
 */
function startRecordingHotkey() {
  // Temporarily disable existing shortcuts (prevent other shortcuts from working during recording)
  window.settings.temporarilyDisableShortcuts()
    .then(() => {
      console.log('Shortcuts temporarily disabled for recording');

      isRecordingHotkey = true;
      globalHotkeyInput.value = 'Press a key combination...';
      globalHotkeyInput.classList.add('recording');
      recordHotkeyButton.disabled = true;
    })
    .catch(err => {
      console.error('Failed to disable shortcuts for recording:', err);
    });
}

/**
 * Handle hotkey recording
 * @param {KeyboardEvent} event - Keyboard event
 */
function handleHotkeyRecording(event) {
  if (!isRecordingHotkey) return;

  // Prevent default behavior
  event.preventDefault();
  event.stopPropagation();

  // Get modifier keys (convert to Electron accelerator format)
  const modifiers = [];
  if (event.ctrlKey) modifiers.push('CommandOrControl');
  if (event.altKey) modifiers.push('Alt');
  if (event.shiftKey) modifiers.push('Shift');
  if (event.metaKey) modifiers.push('Super');

  // Get the key (convert to Electron accelerator format)
  let key = event.key;
  let code = event.code;

  // Skip if only modifier keys are pressed
  if (['Control', 'Alt', 'Shift', 'Meta'].includes(key)) {
    return;
  }

  // Format key name for Electron accelerator
  if (key === ' ' || code === 'Space' || key === 'Spacebar' || key === 'Space') {
    key = 'Space';
  } else if (key.length === 1) {
    key = key.toUpperCase();
  } else if (code.startsWith('Key')) {
    // Use the code for letter keys (KeyA, KeyB, etc)
    key = code.slice(3);
  } else if (code.startsWith('Digit')) {
    // Use the code for number keys (Digit0, Digit1, etc)
    key = code.slice(5);
  } else {
    // Handle special keys
    const keyMap = {
      'Escape': 'Esc',
      'ArrowUp': 'Up',
      'ArrowDown': 'Down',
      'ArrowLeft': 'Left',
      'ArrowRight': 'Right',
      'Enter': 'Return'
    };
    key = keyMap[key] || key;
  }

  // Create hotkey string in Electron accelerator format
  const hotkey = [...modifiers, key].join('+');

  // Debug information (log to console)
  console.log('Recorded hotkey:', hotkey, 'from key:', event.key, 'code:', event.code);

  // Set the hotkey
  globalHotkeyInput.value = hotkey;
  globalHotkeyInput.classList.remove('recording');
  recordHotkeyButton.disabled = false;
  isRecordingHotkey = false;

  // Re-enable shortcuts
  window.settings.restoreShortcuts()
    .then(() => console.log('Shortcuts restored after recording'))
    .catch(err => console.error('Failed to restore shortcuts:', err));

  // Mark as unsaved
  markUnsavedChanges();
}

/**
 * Clear the hotkey
 */
function clearHotkey() {
  globalHotkeyInput.value = '';
  isRecordingHotkey = false;
  globalHotkeyInput.classList.remove('recording');
  recordHotkeyButton.disabled = false;

  // Mark as unsaved
  markUnsavedChanges();
}

/**
 * Confirm resetting settings
 */
function confirmResetSettings() {
  if (confirm('Are you sure you want to reset all settings to their default values? This cannot be undone.')) {
    resetSettings();
  }
}

/**
 * Reset settings to defaults
 */
async function resetSettings() {
  try {
    const success = await window.settings.resetConfig();

    if (success) {
      // Reload config
      const newConfig = await window.settings.getConfig();
      config = newConfig;

      // Update UI
      initializeUI();

      alert('Settings reset to defaults');
    } else {
      alert('Failed to reset settings');
    }
  } catch (error) {
    alert(`Error resetting settings: ${error.message || 'Unknown error'}`);
  }
}

/**
 * Save settings
 */
async function saveSettings() {
  // Save the original button text
  const originalButtonText = saveButton.textContent;

  // Collect settings
  const settings = {
    globalHotkey: globalHotkeyInput.value,
    appearance: {
      theme: themeSelect.value,
      position: positionSelect.value,
      size: sizeSelect.value,
      opacity: parseFloat(opacityRange.value)
    },
    advanced: {
      launchAtLogin: launchAtLoginCheckbox.checked,
      hideAfterAction: hideAfterActionCheckbox.checked,
      hideOnBlur: hideOnBlurCheckbox.checked,
      hideOnEscape: hideOnEscapeCheckbox.checked,
      showInTaskbar: showInTaskbarCheckbox.checked
    }
  };

  // Save settings
  try {
    // Disable button and change text to "Saving..."
    saveButton.disabled = true;
    // saveButton.textContent = "Saving...";

    // Save changes first
    await window.settings.setConfig('globalHotkey', settings.globalHotkey);
    await window.settings.setConfig('appearance', settings.appearance);
    await window.settings.setConfig('advanced', settings.advanced);

    // Update config
    config = await window.settings.getConfig();

    // Clear unsaved changes flag
    unsavedChanges = false;

    // Change to saved message
    saveButton.textContent = "Saved!";

    // Apply theme to Toast window immediately
    if (settings.appearance && settings.appearance.theme) {
      // Apply theme to Toast window immediately (display Toast window)
      window.settings.setConfig('appearance.theme', settings.appearance.theme);
    }

    // // Show toast window to demonstrate the setting changes
    // window.settings.showToast();

    // Close window after a delay to let user see the changes
    setTimeout(() => {
      // Restore original button text
      saveButton.textContent = originalButtonText;
      saveButton.disabled = false;

      // // Close settings window
      // window.settings.closeWindow();
    }, 1500);
  } catch (error) {
    alert(`Error saving settings: ${error.message || 'Unknown error'}`);
    saveButton.textContent = originalButtonText;
    saveButton.disabled = false;
  }
}

/**
 * Confirm canceling changes
 */
async function confirmCancel() {
  // Close window without saving changes
  unsavedChanges = false;
  window.settings.closeWindow();
}

/**
 * Mark settings as having unsaved changes
 */
function markUnsavedChanges() {
  unsavedChanges = true;
}

/**
 * Handle Cloud Sync toggle
 */
async function handleCloudSyncToggle() {
  // 원래 체크박스 상태 저장
  const originalChecked = enableCloudSyncCheckbox.checked;

  // 체크박스 상태 텍스트
  const statusText = originalChecked ? "Enabling..." : "Disabling...";

  try {
    // Show loading state
    setLoading(syncLoading, true);
    enableCloudSyncCheckbox.disabled = true;
    manualSyncDisabled();

    // 체크박스 레이블 근처에 있는 sync-status-text 업데이트하여 상태 표시
    const originalStatusText = syncStatusText.textContent;
    syncStatusText.textContent = statusText;

    // Check if user has subscription permission
    let hasCloudSyncPermission = false;

    // Check subscription in various formats
    if (authState.subscription?.features && typeof authState.subscription.features === 'object') {
      hasCloudSyncPermission = authState.subscription.features.cloud_sync === true;
    } else if (Array.isArray(authState.subscription?.features_array)) {
      hasCloudSyncPermission = authState.subscription.features_array.includes('cloud_sync');
    } else if (
      authState.subscription?.isSubscribed === true ||
      authState.subscription?.active === true ||
      authState.subscription?.is_subscribed === true
    ) {
      hasCloudSyncPermission = true;
    }

    if (!hasCloudSyncPermission) {
      syncStatusText.textContent = "Premium subscription required";
      enableCloudSyncCheckbox.checked = false;

      // 일정 시간 후 원래 상태로 복원
      setTimeout(() => {
        syncStatusText.textContent = originalStatusText;
        enableCloudSyncCheckbox.disabled = false;
        manualSyncEnabled();
      }, 1500);

      setLoading(syncLoading, false);
      return;
    }

    // Enable/disable cloud sync
    const enabled = originalChecked;

    // Update cloud sync configuration
    await window.settings.setCloudSyncEnabled(enabled);

    // Update UI based on new status
    const status = await window.settings.getSyncStatus();

    // Hide loading state
    setLoading(syncLoading, false);

    // 성공 메시지 표시
    syncStatusText.textContent = enabled ? "Sync enabled successfully!" : "Sync disabled successfully!";

    // 일정 시간 후 UI 업데이트 및 원래 상태로 복원
    setTimeout(() => {
      updateSyncStatusUI(status);
      enableCloudSyncCheckbox.disabled = false;
      manualSyncEnabled();
    }, 1500);

  } catch (error) {
    console.error('Cloud sync toggle error:', error);

    // Hide loading state
    setLoading(syncLoading, false);

    // Show error in status text
    syncStatusText.textContent = `Error: ${error.message || 'Unknown error'}`;

    // Restore checkbox state
    enableCloudSyncCheckbox.checked = !originalChecked;

    // Restore original state after a delay
    setTimeout(() => {
      window.settings.getSyncStatus().then(status => {
        updateSyncStatusUI(status);
        enableCloudSyncCheckbox.disabled = false;
        manualSyncEnabled();
      });
    }, 2000);

    // Log error
    console.error(`Cloud sync configuration error: ${error.message || 'Unknown error'}`);
  }
}

/**
 * Disable manual sync buttons
 */
function manualSyncDisabled() {
  manualSyncUploadButton.disabled = true;
  manualSyncDownloadButton.disabled = true;
  manualSyncResolveButton.disabled = true;
}

/**
 * Enable manual sync buttons
 */
function manualSyncEnabled() {
  manualSyncUploadButton.disabled = false;
  manualSyncDownloadButton.disabled = false;
  manualSyncResolveButton.disabled = false;
}

/**
 * Handle manual sync upload
 */
async function handleManualSyncUpload() {
  try {
    // Save the original button text
    const originalButtonText = manualSyncUploadButton.textContent;

    // Disable buttons and show loading
    setLoading(syncLoading, true);
    manualSyncDisabled();
    manualSyncUploadButton.textContent = "Uploading...";

    // Upload settings to server
    const result = await window.settings.manualSync('upload');

    // Hide loading state
    setLoading(syncLoading, false);

    // Update UI based on new status
    const status = await window.settings.getSyncStatus();
    updateSyncStatusUI(status);

    if (result.success) {
      // Show success message in button
      manualSyncUploadButton.textContent = "Upload Complete!";

      // Enable only the current button to show the success message
      manualSyncUploadButton.disabled = false;

      // Reset button after delay
      setTimeout(() => {
        manualSyncUploadButton.textContent = originalButtonText;
        manualSyncEnabled();
      }, 1500);
    } else {
      throw new Error(result.error || '업로드 실패');
    }
  } catch (error) {
    console.error('Manual sync upload error:', error);

    // Hide loading state
    setLoading(syncLoading, false);

    // Show error in button
    manualSyncUploadButton.textContent = "Upload Failed";
    manualSyncUploadButton.disabled = false;

    // Re-enable buttons after delay
    setTimeout(() => {
      manualSyncUploadButton.textContent = "Upload to Server";
      manualSyncEnabled();
    }, 1500);

    // Log error to console
    console.error(`Settings upload error: ${error.message || 'Unknown error'}`);
  }
}

/**
 * Handle manual sync download
 */
async function handleManualSyncDownload() {
  try {
    // Save the original button text
    const originalButtonText = manualSyncDownloadButton.textContent;

    // Show loading state
    setLoading(syncLoading, true);
    manualSyncDisabled();

    // Confirm download (will overwrite local settings)
    if (!confirm('Downloading settings from the server will overwrite your local settings. Continue?')) {
      setLoading(syncLoading, false);

      // Re-enable buttons
      const status = await window.settings.getSyncStatus();
      updateSyncStatusUI(status);
      return;
    }

    // Update button text
    manualSyncDownloadButton.textContent = "Downloading...";

    // Download settings from server
    const result = await window.settings.manualSync('download');

    // Hide loading state
    setLoading(syncLoading, false);

    // Update UI based on new status
    const status = await window.settings.getSyncStatus();
    updateSyncStatusUI(status);

    if (result.success) {
      // Show success in button
      manualSyncDownloadButton.textContent = "Download Complete!";
      manualSyncDownloadButton.disabled = false;

      // Reload config
      const newConfig = await window.settings.getConfig();
      config = newConfig;

      // Update UI to reflect new settings
      initializeUI();

      // Reset button after delay
      setTimeout(() => {
        manualSyncDownloadButton.textContent = originalButtonText;
        manualSyncEnabled();
      }, 1500);
    } else {
      throw new Error(result.error || '다운로드 실패');
    }
  } catch (error) {
    console.error('Manual sync download error:', error);

    // Hide loading state
    setLoading(syncLoading, false);

    // Show error in button
    manualSyncDownloadButton.textContent = "Download Failed";
    manualSyncDownloadButton.disabled = false;

    // Reset button after delay
    setTimeout(() => {
      manualSyncDownloadButton.textContent = originalButtonText;
      manualSyncEnabled();
    }, 1500);

    // Log error to console
    console.error(`Settings download error: ${error.message || 'Unknown error'}`);
  }
}

/**
 * Handle manual sync resolve
 */
async function handleManualSyncResolve() {
  try {
    // Save the original button text
    const originalButtonText = manualSyncResolveButton.textContent;

    // Show loading state
    setLoading(syncLoading, true);
    manualSyncDisabled();

    // Confirm conflict resolution
    if (!confirm('This will resolve conflicts between local and server settings. The most recent settings based on timestamp will be applied. Continue?')) {
      setLoading(syncLoading, false);

      // Re-enable buttons
      const status = await window.settings.getSyncStatus();
      updateSyncStatusUI(status);
      return;
    }

    // Update button text
    manualSyncResolveButton.textContent = "Resolving Conflicts...";

    // Resolve conflicts
    const result = await window.settings.manualSync('resolve');

    // Hide loading state
    setLoading(syncLoading, false);

    // Update UI based on new status
    const status = await window.settings.getSyncStatus();
    updateSyncStatusUI(status);

    if (result.success) {
      // Show success in button
      manualSyncResolveButton.textContent = "Conflicts Resolved!";
      manualSyncResolveButton.disabled = false;

      // Reload config
      const newConfig = await window.settings.getConfig();
      config = newConfig;

      // Update UI to reflect new settings
      initializeUI();

      // Reset button after delay
      setTimeout(() => {
        manualSyncResolveButton.textContent = originalButtonText;
        manualSyncEnabled();
      }, 1500);
    } else {
      throw new Error(result.error || '충돌 해결 실패');
    }
  } catch (error) {
    console.error('Manual sync resolve error:', error);

    // Hide loading state
    setLoading(syncLoading, false);

    // Show error in button
    manualSyncResolveButton.textContent = "Resolution Failed";
    manualSyncResolveButton.disabled = false;

    // Reset button after delay
    setTimeout(() => {
      manualSyncResolveButton.textContent = originalButtonText;
      manualSyncEnabled();
    }, 1500);

    // Log error to console
    console.error(`Settings conflict resolution error: ${error.message || 'Unknown error'}`);
  }
}
