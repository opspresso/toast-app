/**
 * Toast - Configuration Module
 *
 * This module handles the application configuration using electron-store.
 */

const Store = require('electron-store');
const { createLogger } = require('./logger');
const { getEnv } = require('./config/env');

// Create module-specific logger
const logger = createLogger('Config');

// Multiple app instances (e.g. running side-by-side for testing) must not share
// a config file — CONFIG_SUFFIX already isolates the auth token file (auth.js),
// so isolate the electron-store file the same way.
const CONFIG_SUFFIX = getEnv('CONFIG_SUFFIX', '');
const CONFIG_STORE_NAME = CONFIG_SUFFIX ? `config-${CONFIG_SUFFIX}` : 'config';

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
  snippets: {
    type: 'array',
    default: [],
    description: 'Text expansion snippets ({ id, keyword, content, enabled, label }); synced like pages',
  },
  textExpander: {
    type: 'object',
    properties: {
      enabled: {
        type: 'boolean',
        default: false,
        description: 'Whether inline text expansion is active on this device (device-local, never synced)',
      },
      seeded: {
        type: 'boolean',
        default: false,
        description: 'Whether the default snippet has been seeded on this device (device-local)',
      },
    },
    default: {
      enabled: false,
      seeded: false,
    },
  },
  cloudSync: {
    type: 'object',
    properties: {
      enabled: {
        type: 'boolean',
        default: true,
        description: 'Whether cloud sync is active on this device (CloudSyncManager is the single source of truth; read/written via cloudSync.enabled)',
      },
    },
    default: {
      enabled: true,
    },
  },
  appearance: {
    type: 'object',
    properties: {
      theme: {
        type: 'string',
        enum: ['light', 'dark', 'system'],
        default: 'system',
      },
      accentColor: {
        type: 'string',
        enum: ['blue', 'red', 'orange', 'green', 'purple', 'mono'],
        default: 'blue',
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
      accentColor: 'blue',
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
  _sync: {
    type: 'object',
    properties: {
      accountBackups: { type: 'object', description: 'Per-account local settings and sync baselines retained when switching accounts' },
      accountId: { type: 'string', description: 'Owner of the acknowledged cloud snapshot' },
      baseRevision: { type: 'integer', minimum: 0 },
      baseSnapshot: { type: 'object', description: 'Last acknowledged cloud settings for three-way merge' },
      bootstrapBackup: { type: 'object', description: 'Local settings preserved before first download' },
      lastModifiedAt: {
        type: 'number',
        default: 0,
        description: 'Timestamp when settings were last modified locally',
      },
      lastModifiedDevice: {
        type: 'string',
        default: '',
        description: 'Device identifier that last modified the settings',
      },
      lastSyncedAt: {
        type: 'number',
        default: 0,
        description: 'Timestamp when settings were last synced with server',
      },
      lastSyncedDevice: {
        type: 'string',
        default: '',
        description: 'Device identifier that last synced with server',
      },
      dataHash: {
        type: 'string',
        default: '',
        description: 'Hash of synced data for change detection',
      },
      isConflicted: {
        type: 'boolean',
        default: false,
        description: 'Whether there is a sync conflict',
      },
    },
    default: {
      lastModifiedAt: 0,
      lastModifiedDevice: '',
      lastSyncedAt: 0,
      lastSyncedDevice: '',
      dataHash: '',
      isConflicted: false,
    },
  },
  security: {
    type: 'object',
    properties: {
      approvalsInitialized: {
        type: 'boolean',
        default: false,
        description: 'Whether the trusted action list has been seeded from the local configuration',
      },
      trustedActions: {
        type: 'array',
        default: [],
        description: 'Fingerprints of exec/script actions approved to run on this device (device-local, never synced)',
      },
      pendingApprovals: {
        type: 'array',
        default: [],
        description: 'Risky actions downloaded from cloud sync awaiting one-time user approval',
      },
    },
    default: {},
  },
};

// Shared store instance — all modules must use the same instance so that
// onDidChange-based behaviors (cloud sync trigger, text expander cache refresh)
// fire from any write path (electron-store events do not propagate across instances)
let sharedStore = null;

/**
 * Create (or return the shared) configuration store
 * @returns {Store} Configuration store instance
 */
function createConfigStore() {
  if (sharedStore) {
    return sharedStore;
  }

  try {
    // First load the configuration without schema validation to migrate it
    const migrationStore = new Store({
      name: CONFIG_STORE_NAME,
      schema: null, // Disable schema validation
      clearInvalidConfig: false,
    });

    // Attempt subscription data migration
    try {
      const subscription = migrationStore.get('subscription');
      if (subscription) {
        // Clean up subscription data types
        const sanitizedSubscription = sanitizeSubscription(subscription);

        // Save the changed data (before schema validation)
        migrationStore.set('subscription', sanitizedSubscription);

        logger.info('Legacy subscription data migrated successfully');
      }
    }
    catch (migrationError) {
      logger.error('Error during subscription data migration:', migrationError);
      // Reset subscription data when a migration error occurs
      try {
        migrationStore.set('subscription', schema.subscription.default);
        logger.info('Reset subscription data to defaults due to migration error');
      }
      catch (resetError) {
        logger.error('Failed to reset subscription data:', resetError);
      }
    }

    // Now create the Store object with normal schema validation
    sharedStore = new Store({ name: CONFIG_STORE_NAME, schema });
    return sharedStore;
  }
  catch (error) {
    // As a last resort, disable schema validation and create the Store object
    logger.error('Error creating config store with schema, falling back to schema-less store:', error);
    sharedStore = new Store({
      name: CONFIG_STORE_NAME,
      schema: null,
      clearInvalidConfig: false,
    });
    return sharedStore;
  }
}

/**
 * Reset configuration to default values
 * @param {Store} config - Configuration store instance
 */
function resetToDefaults(config) {
  config.set({
    globalHotkey: schema.globalHotkey.default,
    appearance: schema.appearance.default,
    advanced: schema.advanced.default,
    textExpander: { ...schema.textExpander.default, ...config.get('textExpander'), enabled: false },
  });
}

// Fallback content for the seeded default snippet when the user is not logged in.
const DEFAULT_SNIPPET_EMAIL = 'email@toastapp.dev';

/**
 * Seed a default example snippet on first run so the feature is discoverable.
 * Runs at most once per device (guarded by textExpander.seeded) and never
 * overwrites existing snippets (e.g. downloaded from cloud sync).
 * @param {Store} config - Configuration store instance
 * @param {string} [loginEmail] - Logged-in user's email, used as the content
 */
function seedDefaultSnippets(config, loginEmail) {
  try {
    const textExpander = config.get('textExpander') || {};
    if (textExpander.seeded) {
      return;
    }

    const existing = config.get('snippets');
    if (!Array.isArray(existing) || existing.length === 0) {
      const content = loginEmail || DEFAULT_SNIPPET_EMAIL;
      config.set('snippets', [{ id: 'default-email', keyword: '!email', content, enabled: true, label: 'Email' }]);
      logger.info('Seeded default snippet');
    }

    config.set('textExpander', { ...textExpander, seeded: true });
  }
  catch (error) {
    logger.error('Error seeding default snippets:', error);
  }
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
    const imported = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    if (!imported || typeof imported !== 'object' || Array.isArray(imported)) {
      return false;
    }
    const updates = {};
    if (Object.hasOwn(imported, 'globalHotkey')) {
      if (typeof imported.globalHotkey !== 'string') {
        return false;
      }
      updates.globalHotkey = imported.globalHotkey;
    }
    if (Object.hasOwn(imported, 'pages')) {
      const { validatePages } = require('./action-validation');
      if (!validatePages(imported.pages).valid) {
        return false;
      }
      updates.pages = imported.pages;
    }
    if (Object.hasOwn(imported, 'snippets')) {
      const { validateSnippets } = require('./snippets');
      if (!validateSnippets(imported.snippets).valid) {
        return false;
      }
      updates.snippets = imported.snippets;
    }
    for (const key of ['appearance', 'advanced']) {
      if (!Object.hasOwn(imported, key)) {
        continue;
      }
      const value = imported[key];
      if (!value || typeof value !== 'object' || Array.isArray(value) ||
        Object.keys(value).some(field => !Object.hasOwn(schema[key].properties, field))) {
        return false;
      }
      updates[key] = { ...schema[key].default, ...value };
    }
    if (!Object.keys(updates).length || Buffer.byteLength(JSON.stringify({ appearance: updates.appearance, advanced: updates.advanced }), 'utf8') > 10000) {
      return false;
    }
    const positions = updates.appearance?.monitorPositions;
    if (positions !== undefined && (!positions || typeof positions !== 'object' || Array.isArray(positions) ||
      Object.values(positions).some(position => !position || !Number.isFinite(position.x) || !Number.isFinite(position.y)))) {
      return false;
    }
    // Validate and persist all requested sections together. Account bindings,
    // approvals, sync baselines, recovery copies, and omitted data stay intact.
    config.set(updates);
    return true;
  }
  catch (error) {
    // Parser/schema errors may contain configuration values; never log that data.
    logger.error('Configuration import failed:', error.name);
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
      snippets: config.get('snippets'),
      appearance: config.get('appearance'),
      advanced: config.get('advanced'),
    };

    fs.writeFileSync(filePath, JSON.stringify(configData, null, 2), 'utf8');
    return true;
  }
  catch (error) {
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
  // Return the default when missing or not an object
  if (!subscription || typeof subscription !== 'object') {
    return schema.subscription.default;
  }

  const result = { ...subscription };

  // Clean up boolean-type fields
  result.isSubscribed = Boolean(result.isSubscribed);
  result.isAuthenticated = Boolean(result.isAuthenticated);

  // The expiresAt field must be a string
  if (result.expiresAt !== undefined) {
    if (typeof result.expiresAt === 'string') {
      // Already a string, use it as-is
    }
    else if (result.expiresAt instanceof Date) {
      // Convert a Date object to an ISO string
      result.expiresAt = result.expiresAt.toISOString();
    }
    else if (typeof result.expiresAt === 'number') {
      // Convert a number (timestamp) to an ISO string
      result.expiresAt = new Date(result.expiresAt).toISOString();
    }
    else {
      // Set any other type to an empty string
      result.expiresAt = '';
    }
  }
  else {
    // Set to an empty string when undefined
    result.expiresAt = '';
  }

  // For backward compatibility, move subscribedUntil to expiresAt if it exists
  if (result.subscribedUntil !== undefined) {
    if (!result.expiresAt && result.subscribedUntil) {
      result.expiresAt = result.subscribedUntil;
    }
    delete result.subscribedUntil;
  }

  // The pageGroups field must be a number
  if (result.pageGroups !== undefined) {
    result.pageGroups = Number(result.pageGroups) || schema.subscription.properties.pageGroups.default;
  }
  else {
    result.pageGroups = schema.subscription.properties.pageGroups.default;
  }

  return result;
}

/**
 * Generate device identifier
 * @returns {string} Device identifier
 */
function getDeviceId() {
  const os = require('os');
  return `${os.hostname()}-${os.platform()}`;
}

/**
 * Deterministically stringify a value: object keys are sorted recursively at every
 * nesting level so semantically identical data always produces the same string,
 * regardless of key insertion order. A plain JSON.stringify(value, arrayOfKeys) does NOT
 * do this — when the replacer argument is an array, it is treated as a property allowlist
 * applied at every level, so nested keys not in that array are silently stripped.
 * @param {*} value - Value to stringify
 * @returns {string} Deterministic JSON string
 */
function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }
  if (value && typeof value === 'object') {
    const keys = Object.keys(value).sort();
    return `{${keys.map(key => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

/**
 * Generate data hash for change detection
 * @param {Object} data - Data to hash
 * @returns {string} Hash string
 */
function generateDataHash(data) {
  const crypto = require('crypto');
  // Only hash the core sync data (pages, snippets, appearance, advanced)
  const coreData = {
    pages: data.pages || [],
    snippets: data.snippets || [],
    appearance: data.appearance || {},
    advanced: data.advanced || {},
  };
  const dataString = stableStringify(coreData);
  return crypto.createHash('sha256').update(dataString).digest('hex');
}

/**
 * Check if settings have changes that need sync
 * @param {Object} config - ConfigStore instance
 * @returns {boolean} Whether settings have unsaved changes
 */
function hasUnsyncedChanges(config) {
  const syncMeta = config.get('_sync') || schema._sync.default;
  const currentData = {
    pages: config.get('pages'),
    snippets: config.get('snippets'),
    appearance: config.get('appearance'),
    advanced: config.get('advanced'),
  };
  const currentHash = generateDataHash(currentData);

  // Debug logging
  const { createLogger } = require('./logger');
  const logger = createLogger('ConfigDebug');

  const hashDifferent = currentHash !== syncMeta.dataHash;
  const timeCondition = syncMeta.lastModifiedAt > syncMeta.lastSyncedAt;
  const result = hashDifferent || timeCondition;

  logger.debug('=== hasUnsyncedChanges Debug ===');
  logger.debug('Current hash:', currentHash);
  logger.debug('Stored hash:', syncMeta.dataHash);
  logger.debug('Hash different:', hashDifferent);
  logger.debug('Last modified:', new Date(syncMeta.lastModifiedAt).toISOString());
  logger.debug('Last synced:', new Date(syncMeta.lastSyncedAt).toISOString());
  logger.debug('Time condition (modified > synced):', timeCondition);
  logger.debug('Final result:', result);

  return result;
}

module.exports = {
  schema,
  createConfigStore,
  resetToDefaults,
  seedDefaultSnippets,
  importConfig,
  exportConfig,
  sanitizeSubscription,
  // Sync metadata management functions
  getDeviceId,
  generateDataHash,
  hasUnsyncedChanges,
};
