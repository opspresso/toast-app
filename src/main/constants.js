/**
 * Toast App - Common Constants Module
 *
 * Defines constants used throughout the application.
 */

// Constants for the number of page groups based on subscription level
const PAGE_GROUPS = {
  ANONYMOUS: 1, // Unauthenticated users
  AUTHENTICATED: 3, // Authenticated users
  PREMIUM: 9 // Subscribers or VIP users
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
    page_groups: PAGE_GROUPS.ANONYMOUS
  },
  features_array: ['basic_shortcuts'],
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  expiresAt: null,
  subscribed_until: null,
  isVip: false
};

// Default profile information for anonymous users
const DEFAULT_ANONYMOUS = {
  id: 'anonymous',
  email: 'anonymous@user.com',
  name: 'Guest User',
  image: 'https://app.toast.sh/logo192.png',
  slug: 'guest',
  is_authenticated: false,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  subscription: DEFAULT_ANONYMOUS_SUBSCRIPTION
};

module.exports = {
  PAGE_GROUPS,
  DEFAULT_ANONYMOUS,
  DEFAULT_ANONYMOUS_SUBSCRIPTION
};
