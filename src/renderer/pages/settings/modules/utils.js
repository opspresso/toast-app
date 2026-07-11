/**
 * Settings - Utility Functions
 */

/**
 * Show/hide loading state for UI elements
 * @param {HTMLElement} loadingElement - Loading indicator element
 * @param {boolean} isLoading - Loading state
 */
export function setLoading(loadingElement, isLoading) {
  if (loadingElement) {
    if (isLoading) {
      loadingElement.classList.remove('hidden');
    }
    else {
      loadingElement.classList.add('hidden');
    }
  }
}

export { getInitials } from '../../../common/utils.js';

/**
 * Apply theme to the application
 * @param {string} theme - The theme to apply ('light', 'dark', or 'system')
 */
export function applyTheme(theme) {
  // Remove any existing theme classes first
  document.documentElement.classList.remove('theme-light', 'theme-dark');

  // Remove data-theme attribute (used for forced themes)
  document.documentElement.removeAttribute('data-theme');

  // Apply the selected theme
  if (theme === 'light') {
    document.documentElement.setAttribute('data-theme', 'light');
  }
  else if (theme === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
  }

  // Log theme change
  window.settings.log.info('Theme changed to:', theme);
}

/**
 * Apply accent color theme (tokens.css [data-accent] blocks; default is blue)
 * @param {string} accentColor - One of 'blue' | 'red' | 'orange' | 'green' | 'purple' | 'mono'
 */
export function applyAccentColor(accentColor) {
  document.documentElement.setAttribute('data-accent', accentColor || 'blue');
}

/**
 * Convert file size to a human-readable format
 * @param {number} bytes - Number of bytes
 * @returns {string} Converted string (e.g., 1.5 MB)
 */
export function formatFileSize(bytes) {
  if (bytes === 0) {
    return '0 Bytes';
  }

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Save subscription information to config
 * @param {Object} subscription - Subscription information
 */
export function saveSubscriptionToConfig(subscription) {
  // expiresAt must be a string
  let expiresAtStr = null;
  if (subscription.subscribed_until || subscription.expiresAt) {
    // First select the field that has a valid value
    const expiresValue = subscription.expiresAt || subscription.subscribed_until;

    // Convert to ISO string if it is a Date object
    if (expiresValue instanceof Date) {
      expiresAtStr = expiresValue.toISOString();
    }
    else if (typeof expiresValue === 'number') {
      // Convert to ISO string if it is a number (timestamp)
      expiresAtStr = new Date(expiresValue).toISOString();
    }
    else if (typeof expiresValue === 'string') {
      // Use as-is if it is already a string
      expiresAtStr = expiresValue;
    }
  }

  const subscriptionConfig = {
    isSubscribed: subscription.is_subscribed,
    plan: subscription.plan,
    expiresAt: expiresAtStr,
    pageGroups: subscription.features?.page_groups || 1,
    additionalFeatures: {
      advancedActions: subscription.features?.advanced_actions || false,
      cloudSync: subscription.features?.cloud_sync || false,
    },
  };

  window.settings.setConfig('subscription', subscriptionConfig);
}

/**
 * Handle token expiration
 */
export function handleTokenExpired() {
  window.settings.log.info('Token expiration detected, handling logout');
  // Import logout handler dynamically to avoid circular dependency
  import('./account-settings.js').then(({ handleLogout }) => {
    handleLogout();
  });
}
