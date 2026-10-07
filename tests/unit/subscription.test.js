const { isSubscriptionActive, calculatePageGroups, normalizeExpiryString, determineCloudSyncFeature, isCloudSyncAllowed, normalizeSubscription } = require('../../src/main/subscription');

describe('Server subscription contract', () => {
  test.each([
    [{ active: true }, true], [{ is_subscribed: true }, true], [{ isSubscribed: true }, true],
    [{ active: false, is_subscribed: true }, false], [{}, false], [null, false],
    [{ active: true, expiresAt: 'invalid' }, false],
    [{ active: true, expiresAt: '2000-01-01' }, false],
    [{ active: true, expiresAt: '2099-01-01' }, true],
  ])('active status %j -> %s', (value, expected) => expect(isSubscriptionActive(value)).toBe(expected));

  test('expiry boundary is exclusive and milliseconds normalize to ISO', () => {
    const now = Date.now();
    expect(isSubscriptionActive({ active: true, expiresAt: now })).toBe(false);
    expect(normalizeExpiryString(now)).toBe(new Date(now).toISOString());
    expect(normalizeExpiryString(new Date(now))).toBe(new Date(now).toISOString());
  });
  test.each([null, undefined, ''])('missing expiry %j is empty', value => expect(normalizeExpiryString(value)).toBe(''));
  test.each(['broken', 'null', 'undefined', NaN])('invalid expiry %j is rejected', value => expect(() => normalizeExpiryString(value)).toThrow('Invalid subscription expiry'));
  test.each([
    [{ features: { cloud_sync: true } }, true],
    [{ features: { cloud_sync: false }, plan: 'Premium', additionalFeatures: { cloudSync: true } }, false],
    [{ features_array: ['cloud_sync'] }, true], [{ features_array: [] }, false],
    [{ additionalFeatures: { cloudSync: true } }, true], [{ plan: 'VIP' }, true],
    [{ active: true }, false], [{ plan: 'Basic' }, false], [null, false],
  ])('feature %j -> %s', (value, expected) => expect(determineCloudSyncFeature(value)).toBe(expected));
  test('development uses the same explicit entitlement as production', () => {
    const value = { active: true, plan: 'Premium', features: { cloud_sync: false } };
    expect(isCloudSyncAllowed(value, { isDevelopment: true })).toBe(false);
    expect(isCloudSyncAllowed({ plan: 'Basic', features: { cloud_sync: true } }, { isDevelopment: true })).toBe(false);
  });
  test('sync requires both active status and the feature', () => {
    expect(isCloudSyncAllowed({ active: true, features: { cloud_sync: true } })).toBe(true);
    expect(isCloudSyncAllowed({ active: false, features: { cloud_sync: true } })).toBe(false);
    expect(isCloudSyncAllowed({ active: true, plan: 'Premium' })).toBe(true);
  });
  test('limits pages without deleting stored content', () => {
    expect(calculatePageGroups({ isAuthenticated: true })).toBe(3);
    expect(calculatePageGroups({ active: true, plan: 'Premium' })).toBe(9);
    expect(calculatePageGroups({ isVip: true })).toBe(1);
    expect(normalizeSubscription({ active: false, features: { page_groups: 9 } }).pageGroups).toBe(3);
    expect(normalizeSubscription({ active: true, features: { page_groups: 9 } }, false).pageGroups).toBe(1);
  });
  test('returns complete mirrors without mutating server data', () => {
    const value = { active: true, plan: 'Premium', features: { page_groups: 9, cloud_sync: true } };
    expect(normalizeSubscription(value)).toMatchObject({ active: true, isSubscribed: true, is_subscribed: true, isAuthenticated: true, pageGroups: 9, expiresAt: '', additionalFeatures: { advancedActions: false, cloudSync: true } });
    expect(value).not.toHaveProperty('additionalFeatures');
  });
});
