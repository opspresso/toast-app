/**
 * Toast - Subscription Helpers
 *
 * Single home for subscription-derived decisions that were previously
 * duplicated across auth.js, auth-manager.js and api/sync.js.
 *
 * Note: cloud sync eligibility is intentionally evaluated with two different
 * rules — see determineCloudSyncFeature (login time, grants and persists the
 * feature flag) and isCloudSyncAllowed (sync time, re-validates stored data).
 */

const { PAGE_GROUPS } = require('./constants');

/**
 * Whether the subscription is active. Accepts every alias used across the
 * codebase (`active`, `is_subscribed`, `isSubscribed`) — writers keep these
 * fields in sync, so the union is the intended semantics.
 * @param {Object} subscription - Subscription object
 * @returns {boolean}
 */
function isSubscriptionActive(subscription) {
  if (!subscription || typeof subscription !== 'object') {
    return false;
  }
  return subscription.active === true || subscription.is_subscribed === true || subscription.isSubscribed === true;
}

/**
 * Calculate the number of page groups for a subscription.
 * @param {Object} subscription - Subscription object
 * @returns {number}
 */
function calculatePageGroups(subscription) {
  if (!subscription || typeof subscription !== 'object') {
    return PAGE_GROUPS.ANONYMOUS;
  }
  const isActive = isSubscriptionActive(subscription);
  const isVip = subscription.isVip || false;

  if (isActive || isVip) {
    if (isVip || /^premium/i.test(subscription.plan)) {
      return PAGE_GROUPS.PREMIUM;
    }
    return PAGE_GROUPS.AUTHENTICATED;
  }
  if (subscription.userId && subscription.userId !== 'anonymous') {
    // User is authenticated but has no active subscription
    return PAGE_GROUPS.AUTHENTICATED;
  }
  return PAGE_GROUPS.ANONYMOUS;
}

/**
 * Normalize an expiry value to a string for the config schema.
 * @param {*} value - Raw expiry value (string, number, Date, undefined...)
 * @returns {string}
 */
function normalizeExpiryString(value) {
  if (value === undefined || value === null) {
    return '';
  }
  const str = typeof value === 'string' ? value : String(value);
  return str === 'undefined' || str === 'null' ? '' : str;
}

/**
 * Login-time rule: decide whether the cloud_sync feature should be granted
 * and persisted for this subscription. Active subscribers without an explicit
 * feature flag are granted sync by default.
 * @param {Object} subscription - Subscription object (fresh from the server)
 * @param {Object} [options]
 * @param {boolean} [options.isDevelopment] - NODE_ENV === 'development'
 * @returns {boolean}
 */
function determineCloudSyncFeature(subscription, { isDevelopment = false } = {}) {
  if (!subscription || typeof subscription !== 'object') {
    return false;
  }

  let hasSyncFeature = false;
  if (subscription.features && typeof subscription.features === 'object' && 'cloud_sync' in subscription.features) {
    // Server explicitly specified cloud_sync — honor its value
    hasSyncFeature = subscription.features.cloud_sync === true;
  }
  else if (Array.isArray(subscription.features_array)) {
    hasSyncFeature = subscription.features_array.includes('cloud_sync');
  }
  else if (isSubscriptionActive(subscription)) {
    // No explicit feature flag (including an empty features object): active subscribers get sync by default
    hasSyncFeature = true;
  }

  // In development mode, enable cloud_sync for Basic plan users for testing
  if (!hasSyncFeature && isDevelopment && subscription.plan === 'Basic') {
    hasSyncFeature = true;
  }

  return hasSyncFeature;
}

/**
 * Sync-time rule: re-validate stored subscription data before syncing.
 * Requires an active subscription plus either an explicit cloud sync feature
 * flag or a premium/VIP plan.
 * @param {Object} subscription - Subscription object (from the config store)
 * @param {Object} [options]
 * @param {boolean} [options.isDevelopment] - NODE_ENV === 'development'
 * @returns {boolean}
 */
function isCloudSyncAllowed(subscription, { isDevelopment = false } = {}) {
  if (!subscription || typeof subscription !== 'object') {
    return false;
  }

  const isSubscribed = isSubscriptionActive(subscription);
  const hasCloudSyncFeature = subscription.features?.cloud_sync === true || subscription.additionalFeatures?.cloudSync === true;
  const isPremiumPlan = subscription.isVip === true || (subscription.plan && /^(premium|vip)/i.test(subscription.plan));

  if (isSubscribed && (hasCloudSyncFeature || isPremiumPlan)) {
    return true;
  }
  // In development mode, allow Basic plan users with the feature flag
  return isDevelopment && hasCloudSyncFeature && subscription.plan === 'Basic';
}

module.exports = {
  isSubscriptionActive,
  calculatePageGroups,
  normalizeExpiryString,
  determineCloudSyncFeature,
  isCloudSyncAllowed,
};
