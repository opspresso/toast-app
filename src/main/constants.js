/**
 * Toast - Common Constants Module
 *
 * Defines constants used throughout the application.
 */

// 앱 기본 정보 (package.json 정보를 읽을 수 없을 때 사용)
const APP_DEFAULT_INFO = {
  author: 'nalbam <me@nalbam.com>, bruce <bruce@daangn.com>',
  homepage: 'https://toastapp.io',
  description: 'A customizable shortcut launcher for macOS and Windows',
  license: 'MIT',
  version: 'v0.0.0', // 버전을 가져오지 못할 때 기본값
  name: 'Toast',
  repository: 'https://github.com/opspresso/toast-app',
};

// Constants for the number of page groups based on subscription level
const PAGE_GROUPS = {
  ANONYMOUS: 1, // Unauthenticated free users (ANONYMOUS): Limited to 1 page
  AUTHENTICATED: 3, // Authenticated free users (AUTHENTICATED): Up to 3 pages
  PREMIUM: 9, // Subscribers (PREMIUM): Up to 9 pages
};

// Default subscription information for anonymous users
const DEFAULT_ANONYMOUS_SUBSCRIPTION = {
  id: 'sub_free_anonymous',
  userId: 'anonymous',
  plan: 'free',
  status: 'active',
  active: false,
  is_subscribed: false,
  features: {
    page_groups: PAGE_GROUPS.ANONYMOUS,
  },
  features_array: ['basic_shortcuts'],
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  expiresAt: null,
  subscribed_until: null,
  isVip: false,
};

// Default profile information for anonymous users
const DEFAULT_ANONYMOUS = {
  id: 'anonymous',
  email: 'anonymous@user.com',
  name: 'Guest User',
  image: 'https://toastapp.io/logo192.png',
  slug: 'guest',
  is_authenticated: false,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  subscription: DEFAULT_ANONYMOUS_SUBSCRIPTION,
};

module.exports = {
  APP_DEFAULT_INFO,
  PAGE_GROUPS,
  DEFAULT_ANONYMOUS,
  DEFAULT_ANONYMOUS_SUBSCRIPTION,
};
