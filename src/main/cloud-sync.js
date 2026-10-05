/** Synchronize one account's local settings against a revisioned cloud snapshot. */
const { isDeepStrictEqual: equal } = require('util');
const { createLogger } = require('./logger');
const { sync: apiSync } = require('./api');
const { createConfigStore, schema, getDeviceId, generateDataHash, hasUnsyncedChanges } = require('./config');
const { sanitizeRemotePages, recordRemoteChanges } = require('./action-approval');
const { normalizeLocalIcons } = require('./utils/icon-normalizer');
const { mergeSettings, SyncConflict } = require('./cloud-sync/merge');

const logger = createLogger('CloudSync');
const SYNC_INTERVAL_MS = 15 * 60 * 1000;
const SYNC_DEBOUNCE_MS = 5000;
const MAX_ATTEMPTS = 3;
const SECTIONS = ['pages', 'snippets', 'appearance', 'advanced'];
const clone = value => JSON.parse(JSON.stringify(value));

function computeRetryDelay(attempt) {
  const delay = Math.min(5000 * 2 ** (attempt - 1), 30000);
  return Math.round(delay * (1 + 0.2 * Math.random()));
}

function createSyncManager(auth, config) {
  let enabled = config.get('cloudSync.enabled') !== false;
  let suspended = false;
  let accountId = null;
  let generation = 0;
  let applyingRemote = false;
  let inFlight = null;
  let pending = false;
  let periodicTimer = null;
  let debounceTimer = null;
  let retryTimer = null;
  let retryCount = 0;
  let lastChangeType = null;
  let lastSyncTime = config.get('_sync')?.lastSyncedAt || 0;
  let lastError = null;
  const listeners = [];
  const deviceId = getDeviceId();

  const metadata = () => config.get('_sync') || {};
  const readSettings = () => clone(Object.fromEntries(SECTIONS.map(key => [key, config.get(key) ?? schema[key].default])));
  const defaults = () => clone(Object.fromEntries(SECTIONS.map(key => {
    const section = schema[key];
    const value = section.properties
      ? { ...Object.fromEntries(Object.entries(section.properties).map(([name, field]) => [name, field.default])), ...section.default }
      : section.default;
    return [key, value];
  })));
  const cloudSettings = sections => {
    const values = defaults();
    return {
      ...values,
      ...sections,
      appearance: { ...values.appearance, ...sections.appearance },
      advanced: { ...values.advanced, ...sections.advanced },
    };
  };
  const isCurrent = epoch => enabled && !suspended && epoch === generation;
  const canceled = () => ({ success: false, canceled: true, error: 'Synchronization stopped or account changed' });

  function notify() {
    auth?.notifySettingsSynced?.({ ...readSettings(), subscription: config.get('subscription') });
  }

  function persist(settings, syncMetadata, replaceMetadata = false) {
    applyingRemote = true;
    try {
      // electron-store validates and persists this object in one write. Listeners
      // never observe pages from one revision alongside snippets from another.
      if (settings) {
        recordRemoteChanges(config, settings.pages);
      }
      config.set({ ...(settings || {}), _sync: { ...(replaceMetadata ? {} : metadata()), ...syncMetadata } });
    }
    finally {
      applyingRemote = false;
    }
    if (settings) {
      notify();
    }
  }

  function schedule() {
    if (!enabled || suspended) {
      return;
    }
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      debounceTimer = null;
      retryCount = 0;
      void runAutomatic();
    }, SYNC_DEBOUNCE_MS);
  }

  function stopPeriodicSync() {
    suspended = true;
    generation++;
    clearInterval(periodicTimer);
    clearTimeout(debounceTimer);
    clearTimeout(retryTimer);
    periodicTimer = debounceTimer = retryTimer = null;
    pending = false;
  }

  function startPeriodicSync() {
    suspended = false;
    clearInterval(periodicTimer);
    if (enabled) {
      periodicTimer = setInterval(() => {
        void runAutomatic();
      }, SYNC_INTERVAL_MS);
    }
  }

  async function performSync(action, epoch) {
    if (!isCurrent(epoch)) {
      return canceled();
    }
    if (!auth || !(await apiSync.isCloudSyncEnabled({ hasValidToken: auth.hasValidToken, configStore: config }))) {
      return { success: false, statusCode: 403, error: 'Cloud sync requires a signed-in account with cloud sync access' };
    }
    if (!isCurrent(epoch)) {
      return canceled();
    }
    if (!accountId) {
      const profile = await auth.fetchUserProfile();
      if (!isCurrent(epoch)) {
        return canceled();
      }
      if (!profile?.email) {
        return { success: false, error: 'Cannot identify the cloud sync account' };
      }
      accountId = profile.email.toLowerCase();
    }

    const previous = metadata();
    if (previous.accountId && previous.accountId !== accountId) {
      // Keep each account's offline edits and baseline on this device. Switching
      // accounts must neither upload the old account nor discard its pending work.
      const previousMetadata = { ...previous };
      delete previousMetadata.accountBackups;
      const backups = {
        ...(previous.accountBackups || {}),
        [previous.accountId]: { settings: readSettings(), metadata: previousMetadata },
      };
      const saved = backups[accountId];
      lastSyncTime = saved?.metadata.lastSyncedAt || 0;
      persist(saved?.settings || defaults(), {
        ...schema._sync.default,
        ...(saved?.metadata || {}),
        accountId,
        accountBackups: backups,
      }, true);
    }

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      const beforeFetch = readSettings();
      const result = await apiSync.downloadSettings({ onUnauthorized: auth.refreshAccessToken });
      if (!isCurrent(epoch)) {
        return canceled();
      }
      if (!result.success) {
        return result;
      }
      const remote = cloudSettings(result.normalized);
      const revision = result.syncMetadata.revision;
      const meta = metadata();
      const sameAccount = meta.accountId === accountId;
      const base = sameAccount ? meta.baseSnapshot : null;
      const local = readSettings();
      const switchingAccount = !!meta.accountId && !sameAccount;
      let candidate;
      let backup;

      if (action === 'upload' && !switchingAccount) {
        candidate = local;
      }
      else if (action === 'download' || !base) {
        if (action !== 'download' && !switchingAccount && meta.lastSyncedAt > 0 && !base && hasUnsyncedChanges(config)) {
          throw new SyncConflict('legacy local settings without a sync baseline');
        }
        candidate = switchingAccount || action === 'download' ? remote : cloudSettings({ ...local, ...result.normalized });
        // First sync downloads existing cloud data. Keep the previous local copy
        // for recovery, and preserve edits made while that download was pending.
        if (!equal(local, candidate)) {
          backup = { accountId: meta.accountId || null, savedAt: Date.now(), settings: local };
        }
        candidate = mergeSettings(beforeFetch, local, candidate);
      }
      else {
        candidate = mergeSettings(base, local, remote);
      }

      const sanitizedPages = await sanitizeRemotePages(candidate.pages);
      if (!equal(candidate.pages, sanitizedPages)) {
        return { success: false, error: 'Cloud settings contain invalid actions; no settings were replaced' };
      }
      if (!isCurrent(epoch)) {
        return canceled();
      }
      if (!equal(candidate, remote)) {
        const icons = await normalizeLocalIcons(candidate.pages, { onUnauthorized: auth.refreshAccessToken });
        if (icons.failures) {
          return { success: false, error: 'Could not upload button icons; local settings are preserved' };
        }
        candidate = { ...candidate, pages: icons.pages };
      }
      if (!isCurrent(epoch)) {
        return canceled();
      }
      if (!equal(readSettings(), local)) {
        pending = true;
        return { success: false, deferred: true, error: 'Settings changed during sync; another sync is scheduled' };
      }

      const snapshotMetadata = {
        accountId,
        baseRevision: revision,
        baseSnapshot: remote,
        dataHash: generateDataHash(remote),
        isConflicted: false,
        ...(backup ? { bootstrapBackup: backup } : {}),
      };
      persist(equal(candidate, local) ? null : candidate, snapshotMetadata);

      if (!equal(candidate, remote)) {
        const uploaded = await apiSync.uploadSettings({
          onUnauthorized: auth.refreshAccessToken,
          directData: { ...candidate, baseRevision: revision, lastSyncedDevice: deviceId, lastModifiedDevice: deviceId },
        });
        if (!isCurrent(epoch)) {
          return canceled();
        }
        if (!uploaded.success) {
          if (uploaded.statusCode === 409) {
            // Another writer won the conditional update. Read its new revision
            // and merge again under the same lock, without waiting on a timer.
            continue;
          }
          return uploaded;
        }
        snapshotMetadata.baseRevision = uploaded.syncMetadata.revision;
        snapshotMetadata.baseSnapshot = cloudSettings(uploaded.normalized);
        snapshotMetadata.dataHash = generateDataHash(snapshotMetadata.baseSnapshot);
      }

      lastSyncTime = Date.now();
      // A user may edit during PUT. Acknowledge the exact uploaded snapshot;
      // never mark those later edits as synced or overwrite them with the response.
      persist(null, { ...snapshotMetadata, lastSyncedAt: lastSyncTime, lastSyncedDevice: deviceId });
      if (!equal(readSettings(), snapshotMetadata.baseSnapshot)) {
        pending = true;
      }
      notify();
      return { success: true, revision: snapshotMetadata.baseRevision };
    }
    return { success: false, statusCode: 409, error: 'Cloud settings kept changing; try syncing again' };
  }

  function syncSettings(action = 'resolve') {
    if (!['resolve', 'upload', 'download'].includes(action)) {
      return Promise.resolve({ success: false, error: 'Invalid synchronization action' });
    }
    if (inFlight) {
      if (action === 'resolve') {
        pending = true;
        return inFlight;
      }
      return inFlight.then(() => syncSettings(action));
    }
    const epoch = generation;
    inFlight = performSync(action, epoch).catch(error => {
      if (!isCurrent(epoch)) {
        return canceled();
      }
      if (error instanceof SyncConflict) {
        persist(null, { isConflicted: true });
      }
      logger.warn('Cloud synchronization failed:', error.message);
      return { success: false, statusCode: error instanceof SyncConflict ? 409 : undefined, error: error.message };
    }).then(result => {
      if (isCurrent(epoch)) {
        lastError = result.success ? null : result.error;
      }
      return result;
    }).finally(() => {
      inFlight = null;
      if (pending && isCurrent(epoch)) {
        pending = false;
        schedule();
      }
    });
    return inFlight;
  }

  async function runAutomatic() {
    const epoch = generation;
    const result = await syncSettings();
    if (!isCurrent(epoch) || result.canceled || result.deferred) {
      return;
    }
    const retryable = !result.success && (!result.statusCode || result.statusCode === 429 || result.statusCode >= 500);
    if (retryable && retryCount < MAX_ATTEMPTS) {
      clearTimeout(retryTimer);
      retryTimer = setTimeout(() => {
        retryTimer = null;
        void runAutomatic();
      }, computeRetryDelay(++retryCount));
    }
    else {
      retryCount = 0;
    }
  }

  function setEnabled(value) {
    enabled = value === true;
    config.set('cloudSync.enabled', enabled);
    if (enabled) {
      startPeriodicSync();
      void runAutomatic();
    }
    else {
      stopPeriodicSync();
    }
  }

  for (const key of SECTIONS) {
    listeners.push(config.onDidChange(key, () => {
      if (applyingRemote) {
        return;
      }
      lastChangeType = key;
      config.set('_sync', { ...metadata(), lastModifiedAt: Date.now(), lastModifiedDevice: deviceId });
      // A plain debounce keeps the latest edit; no duplicate-hash cache or
      // minimum scheduling window can drop an edit or block a retry.
      schedule();
    }));
  }

  const manager = {
    manualSync: syncSettings,
    enable: () => setEnabled(true),
    disable: () => setEnabled(false),
    updateCloudSyncSettings: setEnabled,
    startPeriodicSync,
    stopPeriodicSync,
    syncAfterLogin: async userId => {
      stopPeriodicSync();
      const loginGeneration = generation;
      if (inFlight) {
        await inFlight;
      }
      if (loginGeneration !== generation) {
        return canceled();
      }
      accountId = typeof userId === 'string' ? userId.toLowerCase() : null;
      startPeriodicSync();
      return syncSettings();
    },
    setAuthManager: manager => {
      stopPeriodicSync();
      auth = manager;
      accountId = null;
    },
    getLastSyncStatus: () => ({ success: lastSyncTime > 0 && !lastError, timestamp: lastSyncTime, error: lastError }),
    getCurrentStatus: () => ({ enabled, deviceId, lastChangeType, lastSyncTime, isSyncing: !!inFlight, error: lastError, isConflicted: !!metadata().isConflicted }),
    unsubscribe: () => {
      stopPeriodicSync();
      for (const unsubscribe of listeners) {
        unsubscribe?.();
      }
    },
  };
  startPeriodicSync();
  return manager;
}

let syncManager = null;
function initCloudSync(auth, _userDataManager, config = createConfigStore()) {
  if (!syncManager) {
    syncManager = createSyncManager(auth, config);
  }
  return syncManager;
}

module.exports = {
  createSyncManager,
  initCloudSync,
  getSyncManager: () => syncManager,
  setAuthManager: auth => syncManager?.setAuthManager(auth),
  startPeriodicSync: () => syncManager?.startPeriodicSync(),
  stopPeriodicSync: () => syncManager?.stopPeriodicSync(),
  uploadSettings: () => syncManager?.manualSync('upload'),
  downloadSettings: () => syncManager?.manualSync('download'),
  syncSettings: action => syncManager?.manualSync(action),
  updateCloudSyncSettings: enabled => syncManager?.updateCloudSyncSettings(enabled),
  computeRetryDelay,
};
