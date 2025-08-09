/**
 * Toast - Constants Tests
 *
 * Tests for application constants
 */

const constants = require('../../src/main/constants');

describe('Constants', () => {
  describe('APP_DEFAULT_INFO', () => {
    test('should have required app information', () => {
      expect(constants.APP_DEFAULT_INFO).toEqual({
        name: 'Toast',
        version: 'v0.0.0',
        description: expect.stringContaining('customizable shortcut launcher'),
        homepage: 'https://toastapp.io',
        license: 'MIT',
        repository: 'https://github.com/opspresso/toast-app',
        author: expect.stringContaining('nalbam')
      });
    });

    test('should have author information', () => {
      expect(constants.APP_DEFAULT_INFO.author).toContain('nalbam');
      expect(constants.APP_DEFAULT_INFO.author).toContain('bruce');
      expect(constants.APP_DEFAULT_INFO.author).toContain('me@nalbam.com');
      expect(constants.APP_DEFAULT_INFO.author).toContain('bruce@daangn.com');
    });

    test('should have mutable object structure', () => {
      // JavaScript objects are mutable by default
      const originalName = constants.APP_DEFAULT_INFO.name;
      
      constants.APP_DEFAULT_INFO.name = 'Modified';
      expect(constants.APP_DEFAULT_INFO.name).toBe('Modified');
      
      // Restore original value for other tests
      constants.APP_DEFAULT_INFO.name = originalName;
      expect(constants.APP_DEFAULT_INFO.name).toBe('Toast');
    });
  });

  describe('PAGE_GROUPS', () => {
    test('should have correct subscription tier page limits', () => {
      expect(constants.PAGE_GROUPS).toEqual({
        ANONYMOUS: 1,
        AUTHENTICATED: 3,
        PREMIUM: 9
      });
    });

    test('should have ascending page limits', () => {
      expect(constants.PAGE_GROUPS.ANONYMOUS).toBeLessThan(constants.PAGE_GROUPS.AUTHENTICATED);
      expect(constants.PAGE_GROUPS.AUTHENTICATED).toBeLessThan(constants.PAGE_GROUPS.PREMIUM);
    });

    test('should use positive integers', () => {
      Object.values(constants.PAGE_GROUPS).forEach(value => {
        expect(typeof value).toBe('number');
        expect(value).toBeGreaterThan(0);
        expect(Number.isInteger(value)).toBe(true);
      });
    });
  });

  describe('DEFAULT_ANONYMOUS_SUBSCRIPTION', () => {
    test('should have correct subscription structure', () => {
      const subscription = constants.DEFAULT_ANONYMOUS_SUBSCRIPTION;
      
      expect(subscription).toEqual(expect.objectContaining({
        id: 'sub_free_anonymous',
        userId: 'anonymous',
        plan: 'free',
        status: 'active',
        active: false,
        is_subscribed: false
      }));
    });

    test('should have correct features configuration', () => {
      const subscription = constants.DEFAULT_ANONYMOUS_SUBSCRIPTION;
      
      expect(subscription.features).toEqual(expect.objectContaining({
        page_groups: constants.PAGE_GROUPS.ANONYMOUS
      }));
      expect(subscription.features_array).toEqual(expect.arrayContaining(['basic_shortcuts']));
    });

    test('should have valid timestamps', () => {
      const subscription = constants.DEFAULT_ANONYMOUS_SUBSCRIPTION;
      
      expect(subscription.created_at).toEqual(expect.any(String));
      expect(subscription.updated_at).toEqual(expect.any(String));
      expect(new Date(subscription.created_at)).toBeInstanceOf(Date);
      expect(new Date(subscription.updated_at)).toBeInstanceOf(Date);
      expect(new Date(subscription.created_at).getTime()).not.toBeNaN();
      expect(new Date(subscription.updated_at).getTime()).not.toBeNaN();
    });

    test('should have null expiration fields for free tier', () => {
      const subscription = constants.DEFAULT_ANONYMOUS_SUBSCRIPTION;
      
      expect(subscription.expiresAt).toBeNull();
      expect(subscription.subscribed_until).toBeNull();
      expect(subscription.isVip).toBe(false);
    });

    test('should have array of features', () => {
      const subscription = constants.DEFAULT_ANONYMOUS_SUBSCRIPTION;
      
      expect(Array.isArray(subscription.features_array)).toBe(true);
      expect(subscription.features_array.length).toBeGreaterThan(0);
    });
  });

  describe('DEFAULT_ANONYMOUS', () => {
    test('should have correct user profile structure', () => {
      const anonymous = constants.DEFAULT_ANONYMOUS;
      
      expect(anonymous).toBeDefined();
      expect(anonymous.id).toBe('anonymous');
      expect(anonymous.email).toBe('anonymous@user.com');
      expect(anonymous.name).toBe('Guest User');
      expect(anonymous.slug).toBe('guest');
      expect(anonymous.is_authenticated).toBe(false);
    });

    test('should have valid profile image URL', () => {
      const anonymous = constants.DEFAULT_ANONYMOUS;
      
      expect(anonymous.image).toBeDefined();
      expect(anonymous.image).toContain('toastapp.io');
      expect(anonymous.image).toMatch(/^https?:\/\//);
    });

    test('should include subscription information', () => {
      const anonymous = constants.DEFAULT_ANONYMOUS;
      
      expect(anonymous.subscription).toBeDefined();
      expect(anonymous.subscription).toBe(constants.DEFAULT_ANONYMOUS_SUBSCRIPTION);
    });

    test('should have valid timestamps', () => {
      const anonymous = constants.DEFAULT_ANONYMOUS;
      
      expect(anonymous.created_at).toBeDefined();
      expect(anonymous.updated_at).toBeDefined();
      expect(new Date(anonymous.created_at)).toBeInstanceOf(Date);
      expect(new Date(anonymous.updated_at)).toBeInstanceOf(Date);
    });
  });

  describe('Module Exports', () => {
    test('should export all constants', () => {
      expect(constants.APP_DEFAULT_INFO).toBeDefined();
      expect(constants.PAGE_GROUPS).toBeDefined();
      expect(constants.DEFAULT_ANONYMOUS).toBeDefined();
      expect(constants.DEFAULT_ANONYMOUS_SUBSCRIPTION).toBeDefined();
    });

    test('should not export unexpected properties', () => {
      const expectedKeys = [
        'APP_DEFAULT_INFO',
        'PAGE_GROUPS', 
        'DEFAULT_ANONYMOUS',
        'DEFAULT_ANONYMOUS_SUBSCRIPTION'
      ];
      
      const actualKeys = Object.keys(constants);
      expect(actualKeys.sort()).toEqual(expectedKeys.sort());
    });
  });

  describe('Data Consistency', () => {
    test('should have consistent page groups reference', () => {
      expect(constants.DEFAULT_ANONYMOUS_SUBSCRIPTION.features.page_groups)
        .toBe(constants.PAGE_GROUPS.ANONYMOUS);
    });

    test('should have consistent anonymous user reference', () => {
      expect(constants.DEFAULT_ANONYMOUS.subscription)
        .toBe(constants.DEFAULT_ANONYMOUS_SUBSCRIPTION);
    });

    test('should have consistent user ID references', () => {
      expect(constants.DEFAULT_ANONYMOUS.id)
        .toBe(constants.DEFAULT_ANONYMOUS_SUBSCRIPTION.userId);
    });

    test('should maintain subscription tier logic', () => {
      // Anonymous users should have the lowest page limit
      expect(constants.DEFAULT_ANONYMOUS_SUBSCRIPTION.features.page_groups)
        .toBe(Math.min(...Object.values(constants.PAGE_GROUPS)));
    });
  });

  describe('Edge Cases', () => {
    test('should handle string concatenation', () => {
      const info = constants.APP_DEFAULT_INFO;
      const title = `${info.name} ${info.version}`;
      
      expect(title).toContain(info.name);
      expect(title).toContain(info.version);
    });

    test('should handle URL construction', () => {
      const info = constants.APP_DEFAULT_INFO;
      const fullUrl = `${info.homepage}/about`;
      
      expect(fullUrl).toBe('https://toastapp.io/about');
    });

    test('should handle feature checking', () => {
      const subscription = constants.DEFAULT_ANONYMOUS_SUBSCRIPTION;
      const hasBasicFeatures = subscription.features_array.includes('basic_shortcuts');
      
      expect(hasBasicFeatures).toBe(true);
    });

    test('should handle subscription status checking', () => {
      const user = constants.DEFAULT_ANONYMOUS;
      const isSubscribed = user.subscription.is_subscribed && user.subscription.active;
      
      expect(isSubscribed).toBe(false);
    });
  });
});