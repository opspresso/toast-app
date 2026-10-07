/** Server subscription normalization shared by login, profile refresh, and sync. */
const { PAGE_GROUPS } = require('./constants');

function isSubscriptionActive(subscription) {
  if (!subscription || typeof subscription !== 'object') {
    return false;
  }
  // Explicit false wins over older aliases left in a cached object.
  const active = subscription.active ?? subscription.is_subscribed ?? subscription.isSubscribed;
  if (active !== true) {
    return false;
  }
  const expiry = subscription.subscribed_until ?? subscription.expiresAt;
  if (expiry !== undefined && expiry !== null && expiry !== '') {
    const time = new Date(expiry).getTime();
    return Number.isFinite(time) && time > Date.now();
  }
  return true;
}

function calculatePageGroups(subscription) {
  if (!subscription || typeof subscription !== 'object') {
    return PAGE_GROUPS.ANONYMOUS;
  }
  if (isSubscriptionActive(subscription) && (subscription.isVip === true || /^(premium|vip)/i.test(subscription.plan))) {
    return PAGE_GROUPS.PREMIUM;
  }
  return subscription.isAuthenticated === true || (subscription.userId && subscription.userId !== 'anonymous') || isSubscriptionActive(subscription)
    ? PAGE_GROUPS.AUTHENTICATED : PAGE_GROUPS.ANONYMOUS;
}

function normalizeExpiryString(value) {
  if (value === undefined || value === null || value === '') {
    return '';
  }
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) {
    throw new Error('Invalid subscription expiry');
  }
  return typeof value === 'string' ? value : date.toISOString();
}

function determineCloudSyncFeature(subscription) {
  if (!subscription || typeof subscription !== 'object') {
    return false;
  }
  if (Object.hasOwn(subscription.features || {}, 'cloud_sync')) {
    return subscription.features.cloud_sync === true;
  }
  if (Array.isArray(subscription.features_array)) {
    return subscription.features_array.includes('cloud_sync');
  }
  if (Object.hasOwn(subscription.additionalFeatures || {}, 'cloudSync')) {
    return subscription.additionalFeatures.cloudSync === true;
  }
  // Older servers omitted feature flags for Premium/VIP profiles.
  return subscription.isVip === true || /^(premium|vip)/i.test(subscription.plan || '');
}

function isCloudSyncAllowed(subscription) {
  return isSubscriptionActive(subscription) && determineCloudSyncFeature(subscription);
}

function normalizeSubscription(subscription, isAuthenticated = true) {
  if (!subscription || typeof subscription !== 'object' || Array.isArray(subscription)) {
    throw new Error('Invalid subscription information');
  }
  const source = { ...subscription, isAuthenticated };
  const active = isAuthenticated && isSubscriptionActive(source);
  const requestedPages = source.features?.page_groups;
  const maxPages = isAuthenticated ? (active ? PAGE_GROUPS.PREMIUM : PAGE_GROUPS.AUTHENTICATED) : PAGE_GROUPS.ANONYMOUS;
  const pageGroups = Number.isInteger(requestedPages) && requestedPages >= 1 && requestedPages <= PAGE_GROUPS.PREMIUM
    ? Math.min(requestedPages, maxPages) : Math.min(calculatePageGroups(source), maxPages);
  const cloudSync = active && determineCloudSyncFeature(source);
  const advancedActions = active && source.features?.advanced_actions === true;
  const expiresAt = normalizeExpiryString(source.subscribed_until ?? source.expiresAt);
  return {
    ...source, plan: source.plan || 'free', isVip: source.isVip === true, active, is_subscribed: active, isSubscribed: active, expiresAt, subscribed_until: expiresAt,
    pageGroups,
    features: { ...source.features, page_groups: pageGroups, cloud_sync: cloudSync, advanced_actions: advancedActions },
    additionalFeatures: { advancedActions, cloudSync },
  };
}

module.exports = { isSubscriptionActive, calculatePageGroups, normalizeExpiryString, determineCloudSyncFeature, isCloudSyncAllowed, normalizeSubscription };
