/**
 * Toast - Subscription Helpers Tests
 *
 * 구독 파생 판정(활성 여부, 페이지 그룹, cloud_sync 자격)에 대한 단위 테스트
 */

const { PAGE_GROUPS } = require('../../src/main/constants');
const {
  isSubscriptionActive,
  calculatePageGroups,
  normalizeExpiryString,
  determineCloudSyncFeature,
  isCloudSyncAllowed,
} = require('../../src/main/subscription');

describe('Subscription Helpers', () => {
  describe('isSubscriptionActive', () => {
    test.each([
      [{ active: true }, true],
      [{ is_subscribed: true }, true],
      [{ isSubscribed: true }, true],
      [{ active: false, is_subscribed: false, isSubscribed: false }, false],
      [{}, false],
      [null, false],
    ])('%j -> %s', (subscription, expected) => {
      expect(isSubscriptionActive(subscription)).toBe(expected);
    });
  });

  describe('calculatePageGroups', () => {
    test('premium plan gets premium page groups', () => {
      expect(calculatePageGroups({ active: true, plan: 'premium' })).toBe(PAGE_GROUPS.PREMIUM);
    });

    test('VIP gets premium page groups even without active flag', () => {
      expect(calculatePageGroups({ isVip: true })).toBe(PAGE_GROUPS.PREMIUM);
    });

    test('active non-premium subscriber gets authenticated page groups', () => {
      expect(calculatePageGroups({ active: true, plan: 'basic' })).toBe(PAGE_GROUPS.AUTHENTICATED);
    });

    test('authenticated user without subscription gets authenticated page groups', () => {
      expect(calculatePageGroups({ userId: 'user-1' })).toBe(PAGE_GROUPS.AUTHENTICATED);
    });

    test('anonymous user gets anonymous page groups', () => {
      expect(calculatePageGroups({ userId: 'anonymous' })).toBe(PAGE_GROUPS.ANONYMOUS);
      expect(calculatePageGroups({})).toBe(PAGE_GROUPS.ANONYMOUS);
    });
  });

  describe('normalizeExpiryString', () => {
    test.each([
      ['2026-01-01', '2026-01-01'],
      [12345, '12345'],
      [undefined, ''],
      [null, ''],
      ['undefined', ''],
      ['null', ''],
    ])('%j -> %j', (value, expected) => {
      expect(normalizeExpiryString(value)).toBe(expected);
    });
  });

  describe('determineCloudSyncFeature (login-time rule)', () => {
    test('explicit features.cloud_sync flag wins', () => {
      expect(determineCloudSyncFeature({ features: { cloud_sync: true } })).toBe(true);
      expect(determineCloudSyncFeature({ features: { cloud_sync: false } })).toBe(false);
    });

    test('features_array is checked when features object is missing', () => {
      expect(determineCloudSyncFeature({ features_array: ['cloud_sync'] })).toBe(true);
      expect(determineCloudSyncFeature({ features_array: [] })).toBe(false);
    });

    test('active subscribers get sync by default when no feature info exists', () => {
      expect(determineCloudSyncFeature({ active: true })).toBe(true);
      expect(determineCloudSyncFeature({ active: false })).toBe(false);
    });

    test('development mode enables Basic plan', () => {
      expect(determineCloudSyncFeature({ plan: 'Basic' }, { isDevelopment: true })).toBe(true);
      expect(determineCloudSyncFeature({ plan: 'Basic' }, { isDevelopment: false })).toBe(false);
    });

    test('handles null subscription', () => {
      expect(determineCloudSyncFeature(null)).toBe(false);
    });
  });

  describe('isCloudSyncAllowed (sync-time rule)', () => {
    test('active subscriber with cloud_sync feature is allowed', () => {
      expect(isCloudSyncAllowed({ active: true, features: { cloud_sync: true } })).toBe(true);
    });

    test('active subscriber with additionalFeatures.cloudSync is allowed', () => {
      expect(isCloudSyncAllowed({ isSubscribed: true, additionalFeatures: { cloudSync: true } })).toBe(true);
    });

    test('active premium/vip plan is allowed without feature flag', () => {
      expect(isCloudSyncAllowed({ active: true, plan: 'premium' })).toBe(true);
      expect(isCloudSyncAllowed({ active: true, plan: 'VIP-yearly' })).toBe(true);
      expect(isCloudSyncAllowed({ active: true, isVip: true })).toBe(true);
    });

    test('active subscriber without feature or premium plan is not allowed', () => {
      expect(isCloudSyncAllowed({ active: true, plan: 'basic' })).toBe(false);
    });

    test('inactive subscription is not allowed even with feature flag', () => {
      expect(isCloudSyncAllowed({ active: false, features: { cloud_sync: true } })).toBe(false);
    });

    test('development mode allows Basic plan only with the feature flag', () => {
      expect(isCloudSyncAllowed({ plan: 'Basic', features: { cloud_sync: true } }, { isDevelopment: true })).toBe(true);
      expect(isCloudSyncAllowed({ plan: 'Basic' }, { isDevelopment: true })).toBe(false);
    });

    test('handles null subscription', () => {
      expect(isCloudSyncAllowed(null)).toBe(false);
    });
  });
});
