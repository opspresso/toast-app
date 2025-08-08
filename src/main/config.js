/**
 * Toast - Configuration Module
 *
 * This module handles the application configuration using electron-store.
 */

const Store = require('electron-store');
const { createLogger } = require('./logger');

// 모듈별 로거 생성
const logger = createLogger('Config');

// Default configuration schema
const schema = {
  globalHotkey: {
    type: 'string',
    default: 'Alt+Space',
  },
  pages: {
    type: 'array',
    default: [],
  },
  appearance: {
    type: 'object',
    properties: {
      theme: {
        type: 'string',
        enum: ['light', 'dark', 'system'],
        default: 'system',
      },
      position: {
        type: 'string',
        enum: ['center', 'top', 'bottom', 'cursor'],
        default: 'center',
      },
      monitorPositions: {
        type: 'object',
        default: {},
        description: 'Saved window positions for each monitor',
      },
      size: {
        type: 'string',
        enum: ['small', 'medium', 'large'],
        default: 'medium',
      },
      opacity: {
        type: 'number',
        minimum: 0.1,
        maximum: 1.0,
        default: 0.95,
      },
      buttonLayout: {
        type: 'string',
        enum: ['grid', 'list'],
        default: 'grid',
      },
    },
    default: {
      theme: 'system',
      position: 'center',
      size: 'medium',
      opacity: 0.95,
      buttonLayout: 'grid',
    },
  },
  advanced: {
    type: 'object',
    properties: {
      launchAtLogin: {
        type: 'boolean',
        default: false,
      },
      hideAfterAction: {
        type: 'boolean',
        default: true,
      },
      hideOnBlur: {
        type: 'boolean',
        default: true,
      },
      hideOnEscape: {
        type: 'boolean',
        default: true,
      },
      showInTaskbar: {
        type: 'boolean',
        default: false,
      },
    },
    default: {
      launchAtLogin: false,
      hideAfterAction: true,
      hideOnBlur: true,
      hideOnEscape: true,
      showInTaskbar: false,
    },
  },
  subscription: {
    type: 'object',
    properties: {
      isSubscribed: {
        type: 'boolean',
        default: false,
      },
      isAuthenticated: {
        type: 'boolean',
        default: false,
      },
      expiresAt: {
        type: 'string',
        default: '',
      },
      pageGroups: {
        type: 'number',
        default: 1,
        description: 'Number of page groups: 1 for free users, 3 for authenticated users, 9 for subscribers',
      },
    },
    default: {
      isSubscribed: false,
      isAuthenticated: false,
      expiresAt: '',
      pageGroups: 1,
    },
  },
  firstLaunchCompleted: {
    type: 'boolean',
    default: false,
  },
};

/**
 * Create a configuration store
 * @returns {Store} Configuration store instance
 */
function createConfigStore() {
  try {
    // 먼저 스키마 검증 없이 구성을 로드하여 마이그레이션
    const migrationStore = new Store({
      schema: null, // 스키마 검증 비활성화
      clearInvalidConfig: false,
    });

    // 구독 정보 마이그레이션 시도
    try {
      const subscription = migrationStore.get('subscription');
      if (subscription) {
        // 구독 정보 타입 정리
        const sanitizedSubscription = sanitizeSubscription(subscription);

        // 변경된 데이터 저장 (스키마 검증 전)
        migrationStore.set('subscription', sanitizedSubscription);

        logger.info('Legacy subscription data migrated successfully');
      }
    } catch (migrationError) {
      logger.error('Error during subscription data migration:', migrationError);
      // 마이그레이션 오류 발생시 구독 정보 재설정
      try {
        migrationStore.set('subscription', schema.subscription.default);
        logger.info('Reset subscription data to defaults due to migration error');
      } catch (resetError) {
        logger.error('Failed to reset subscription data:', resetError);
      }
    }

    // 이제 정상적인 스키마 검증으로 Store 객체 생성
    return new Store({ schema });
  } catch (error) {
    // 최악의 경우 스키마 검증을 비활성화하고 Store 객체 생성
    logger.error('Error creating config store with schema, falling back to schema-less store:', error);
    return new Store({
      schema: null,
      clearInvalidConfig: false,
    });
  }
}

/**
 * Reset configuration to default values
 * @param {Store} config - Configuration store instance
 */
function resetToDefaults(config) {
  // Preserve current pages settings
  const currentPages = config.get('pages');

  // Clear all existing settings
  config.clear();

  // Set default values for each key
  config.set('globalHotkey', schema.globalHotkey.default);

  // Preserve pages if they exist, otherwise use the default (empty array)
  config.set('pages', currentPages || schema.pages.default);

  config.set('appearance', schema.appearance.default);
  config.set('advanced', schema.advanced.default);
  config.set('firstLaunchCompleted', false);
}

/**
 * Import configuration from a file
 * @param {Store} config - Configuration store instance
 * @param {string} filePath - Path to the configuration file
 * @returns {boolean} Success status
 */
function importConfig(config, filePath) {
  try {
    const fs = require('fs');
    const importedConfig = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    // Validate imported configuration
    if (!importedConfig || typeof importedConfig !== 'object') {
      throw new Error('Invalid configuration format');
    }

    // Clear existing configuration
    config.clear();

    // Import each section with validation
    if (importedConfig.globalHotkey && typeof importedConfig.globalHotkey === 'string') {
      config.set('globalHotkey', importedConfig.globalHotkey);
    } else {
      config.set('globalHotkey', schema.globalHotkey.default);
    }

    if (Array.isArray(importedConfig.pages)) {
      config.set('pages', importedConfig.pages);
    } else {
      config.set('pages', schema.pages.default);
    }

    if (importedConfig.appearance && typeof importedConfig.appearance === 'object') {
      config.set('appearance', {
        ...schema.appearance.default,
        ...importedConfig.appearance,
      });
    } else {
      config.set('appearance', schema.appearance.default);
    }

    if (importedConfig.advanced && typeof importedConfig.advanced === 'object') {
      config.set('advanced', {
        ...schema.advanced.default,
        ...importedConfig.advanced,
      });
    } else {
      config.set('advanced', schema.advanced.default);
    }

    return true;
  } catch (error) {
    logger.error('Error importing configuration:', error);
    return false;
  }
}

/**
 * Export configuration to a file
 * @param {Store} config - Configuration store instance
 * @param {string} filePath - Path to save the configuration file
 * @returns {boolean} Success status
 */
function exportConfig(config, filePath) {
  try {
    const fs = require('fs');
    const configData = {
      globalHotkey: config.get('globalHotkey'),
      pages: config.get('pages'),
      appearance: config.get('appearance'),
      advanced: config.get('advanced'),
    };

    fs.writeFileSync(filePath, JSON.stringify(configData, null, 2), 'utf8');
    return true;
  } catch (error) {
    logger.error('Error exporting configuration:', error);
    return false;
  }
}

/**
 * Ensure subscription object has correct types according to schema
 * @param {Object} subscription - Subscription object to validate/fix
 * @returns {Object} - Subscription object with correct types
 */
function sanitizeSubscription(subscription) {
  // 없거나 객체가 아닌 경우 기본값 반환
  if (!subscription || typeof subscription !== 'object') {
    return schema.subscription.default;
  }

  const result = { ...subscription };

  // boolean 타입 필드 정리
  result.isSubscribed = Boolean(result.isSubscribed);
  result.isAuthenticated = Boolean(result.isAuthenticated);

  // expiresAt 필드는 반드시 문자열이어야 함
  if (result.expiresAt !== undefined) {
    if (typeof result.expiresAt === 'string') {
      // 이미 문자열이면 그대로 사용
    } else if (result.expiresAt instanceof Date) {
      // Date 객체인 경우 ISO 문자열로 변환
      result.expiresAt = result.expiresAt.toISOString();
    } else if (typeof result.expiresAt === 'number') {
      // 숫자(타임스탬프)인 경우 ISO 문자열로 변환
      result.expiresAt = new Date(result.expiresAt).toISOString();
    } else {
      // 기타 타입은 빈 문자열로 설정
      result.expiresAt = '';
    }
  } else {
    // undefined인 경우 빈 문자열로 설정
    result.expiresAt = '';
  }

  // 이전 버전과의 호환성을 위해 subscribedUntil이 존재할 경우 expiresAt으로 이동
  if (result.subscribedUntil !== undefined) {
    if (!result.expiresAt && result.subscribedUntil) {
      result.expiresAt = result.subscribedUntil;
    }
    delete result.subscribedUntil;
  }

  // pageGroups 필드는 숫자여야 함
  if (result.pageGroups !== undefined) {
    result.pageGroups = Number(result.pageGroups) || schema.subscription.properties.pageGroups.default;
  } else {
    result.pageGroups = schema.subscription.properties.pageGroups.default;
  }

  return result;
}

module.exports = {
  schema,
  createConfigStore,
  resetToDefaults,
  importConfig,
  exportConfig,
  sanitizeSubscription,
};
