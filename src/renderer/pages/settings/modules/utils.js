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
    } else {
      loadingElement.classList.add('hidden');
    }
  }
}

/**
 * Extract initials from user name
 * @param {string} name - User name
 * @returns {string} - Initials (up to 2 characters)
 */
export function getInitials(name) {
  return name
    .split(' ')
    .map(part => part.charAt(0))
    .join('')
    .toUpperCase()
    .substring(0, 2);
}

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
  } else if (theme === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
  }

  // Log theme change
  window.settings.log.info('Theme changed to:', theme);
}

/**
 * 파일 크기를 읽기 쉬운 형식으로 변환
 * @param {number} bytes - 바이트 수
 * @returns {string} 변환된 문자열 (예: 1.5 MB)
 */
export function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';

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
  // expiresAt은 문자열이어야 함
  let expiresAtStr = null;
  if (subscription.subscribed_until || subscription.expiresAt) {
    // 먼저 유효한 값이 있는 필드 선택
    const expiresValue = subscription.expiresAt || subscription.subscribed_until;

    // 날짜 객체인 경우 ISO 문자열로 변환
    if (expiresValue instanceof Date) {
      expiresAtStr = expiresValue.toISOString();
    }
    // 숫자(타임스탬프)인 경우 ISO 문자열로 변환
    else if (typeof expiresValue === 'number') {
      expiresAtStr = new Date(expiresValue).toISOString();
    }
    // 이미 문자열인 경우 그대로 사용
    else if (typeof expiresValue === 'string') {
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
  window.settings.log.info('토큰 만료 감지, 로그아웃 처리');
  // Import logout handler dynamically to avoid circular dependency
  import('./account-settings.js').then(({ handleLogout }) => {
    handleLogout();
  });
}
