/**
 * Settings - DOM Elements
 */

// DOM Elements - Tabs
export const tabLinks = document.querySelectorAll('.settings-nav li');
export const tabContents = document.querySelectorAll('.settings-tab');

// DOM Elements - General Settings
export const globalHotkeyInput = document.getElementById('global-hotkey');
export const recordHotkeyButton = document.getElementById('record-hotkey');
export const clearHotkeyButton = document.getElementById('clear-hotkey');
export const launchAtLoginCheckbox = document.getElementById('launch-at-login');

// DOM Elements - Appearance Settings
export const themeSelect = document.getElementById('theme');
export const positionSelect = document.getElementById('position');
export const sizeSelect = document.getElementById('size');
export const opacityRange = document.getElementById('opacity');
export const opacityValue = document.getElementById('opacity-value');

// DOM Elements - Account & Subscription
export const loginSection = document.getElementById('login-section');
export const profileSection = document.getElementById('profile-section');
export const subscriptionSection = document.getElementById('subscription-section');
export const loginButton = document.getElementById('login-button');
export const logoutButton = document.getElementById('logout-button');
export const userAvatar = document.getElementById('user-avatar');
export const userName = document.getElementById('user-name');
export const userEmail = document.getElementById('user-email');
export const subscriptionBadge = document.getElementById('subscription-badge');
export const subscriptionStatus = document.getElementById('subscription-status');
export const subscriptionExpiry = document.getElementById('subscription-expiry');
export const subscriptionFeatures = document.getElementById('subscription-features');
export const manageSubscriptionButton = document.getElementById('manage-subscription');
export const refreshSubscriptionButton = document.getElementById('refresh-subscription');
export const authLoading = document.getElementById('auth-loading');
export const subscriptionLoading = document.getElementById('subscription-loading');

// DOM Elements - Advanced Settings
export const hideAfterActionCheckbox = document.getElementById('hide-after-action');
export const hideOnBlurCheckbox = document.getElementById('hide-on-blur');
export const hideOnEscapeCheckbox = document.getElementById('hide-on-escape');
export const showInTaskbarCheckbox = document.getElementById('show-in-taskbar');
export const resetSettingsButton = document.getElementById('reset-settings');

// DOM Elements - Cloud Sync
export const syncStatusBadge = document.getElementById('sync-status-badge');
export const syncStatusText = document.getElementById('sync-status-text');
export const lastSyncedTime = document.getElementById('last-synced-time');
export const syncDeviceInfo = document.getElementById('sync-device-info');
export const enableCloudSyncCheckbox = document.getElementById('enable-cloud-sync');
export const manualSyncUploadButton = document.getElementById('manual-sync-upload');
export const manualSyncDownloadButton = document.getElementById('manual-sync-download');
export const manualSyncResolveButton = document.getElementById('manual-sync-resolve');
export const syncLoading = document.getElementById('sync-loading');

// DOM Elements - About Tab
export const appVersionElement = document.getElementById('app-version');
export const homepageButton = document.getElementById('homepage-link');
export const checkUpdatesButton = document.getElementById('check-updates');
export const updateMessage = document.getElementById('update-message');
export const updateStatus = document.getElementById('update-status');
export const updateActions = document.getElementById('update-actions');
export const alternativeUpdates = document.getElementById('alternative-updates');
export const copyBrewCommand = document.getElementById('copy-brew-command');
export const githubReleaseLink = document.getElementById('github-release-link');
export const downloadUpdateButton = document.getElementById('download-update');
export const installUpdateButton = document.getElementById('install-update');
export const updateLoading = document.getElementById('update-loading');

// DOM Elements - Main Buttons
export const cancelButton = document.getElementById('cancel-button');
