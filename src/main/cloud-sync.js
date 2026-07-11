/**
 * Toast - Cloud Synchronization Module
 *
 * The cloud synchronization system follows the "single source of truth" principle:
 * - Using ConfigStore as the single source
 * - UserSettings file only stores metadata
 * - User changes → ConfigStore save → Metadata update → API upload
 * - API download → Direct ConfigStore update → Metadata update
 */

const { createLogger } = require('./logger');
const { sync: apiSync } = require('./api');
const { createConfigStore, markAsModified, markAsSynced, hasUnsyncedChanges, getSyncMetadata, getDeviceId, updateSyncMetadata } = require('./config');
const { sanitizeRemotePages, recordRemoteChanges } = require('./action-approval');
const { analyzeConflict, mergePages, mergeSnippets, mergeAppearance, mergeAdvanced } = require('./cloud-sync/conflict-resolver');
const { normalizeLocalIcons } = require('./utils/icon-normalizer');

// Create logger for this module
const logger = createLogger('CloudSync');

// Synchronization related constants
const SYNC_INTERVAL_MS = 15 * 60 * 1000; // Auto-sync every 15 minutes
const SYNC_DEBOUNCE_MS = 5000; // Sync 5 seconds after the last change (increased from 2s)
const MAX_RETRY_COUNT = 3; // Maximum number of retry attempts
const RETRY_DELAY_MS = 5000; // Base retry interval (5 seconds)
const MAX_RETRY_DELAY_MS = 30000; // Cap for exponential backoff

/**
 * Exponential backoff with jitter for upload retries: base * 2^(retryCount-1),
 * capped, plus up to 20% random jitter. Without jitter, multiple devices that
 * fail at the same moment (e.g. a shared network blip) would all retry in
 * lockstep and collide again.
 * @param {number} retryCount - 1-based retry attempt number
 * @returns {number} Delay in milliseconds
 */
function computeRetryDelay(retryCount) {
  const exponential = RETRY_DELAY_MS * 2 ** (retryCount - 1);
  const capped = Math.min(exponential, MAX_RETRY_DELAY_MS);
  const jitter = capped * 0.2 * Math.random();
  return Math.round(capped + jitter);
}

// Synchronization module state
const state = {
  enabled: true, // Whether sync is enabled
  isSyncing: false, // Whether sync is currently in progress
  applyingRemote: false, // Whether remote data is being written to ConfigStore (suppresses re-upload)
  lastSyncTime: 0, // Last synchronization time
  lastChangeType: null, // Last change type
  pendingSync: false, // Whether there's a pending sync
  retryCount: 0, // Current retry count
  deviceId: null, // Device identifier
  lastChangeHash: null, // Hash of last processed change to prevent duplicates
  lastScheduleTime: 0, // Last time a sync was scheduled to prevent rapid scheduling
  timers: {
    sync: null, // Periodic sync timer
    debounce: null, // Debounce timer
    retry: null, // Upload retry timer
    reconcile: null, // Stale-write (409) reconciliation timer
  },
};

// External module references
let configStore = null;
let authManager = null;

// Initialized sync manager (initCloudSync is guarded to run once)
let syncManagerInstance = null;

// Cache for isCloudSyncEnabled to reduce API calls
const cloudSyncCache = {
  enabled: null,
  timestamp: 0,
  cacheDurationMs: 30000, // Cache for 30 seconds
};

// Device ID and timestamp functions moved to config.js

/**
 * Clear the cloud sync cache
 */
function clearCloudSyncCache() {
  cloudSyncCache.enabled = null;
  cloudSyncCache.timestamp = 0;
  logger.info('Cloud sync cache cleared');
}

/**
 * Check if synchronization is possible (with caching)
 * @returns {Promise<boolean>} Whether synchronization is possible
 */
async function canSync() {
  logger.info('=== canSync() called ===');
  logger.info('state.enabled:', state.enabled);
  logger.info('authManager exists:', !!authManager);

  if (!state.enabled) {
    logger.info('Cannot synchronize: sync is disabled');
    return false;
  }

  if (!authManager) {
    logger.info('Cannot synchronize: auth manager is missing');
    return false;
  }

  try {
    const hasToken = await authManager.hasValidToken();
    logger.info('hasValidToken result:', hasToken);

    // Check cache first
    const now = Date.now();
    if (cloudSyncCache.enabled !== null && now - cloudSyncCache.timestamp < cloudSyncCache.cacheDurationMs) {
      logger.info('Using cached isCloudSyncEnabled result:', cloudSyncCache.enabled);
      return cloudSyncCache.enabled;
    }

    const result = await apiSync.isCloudSyncEnabled({
      hasValidToken: authManager.hasValidToken,
      configStore,
    });

    // Update cache
    cloudSyncCache.enabled = result;
    cloudSyncCache.timestamp = now;

    logger.info('isCloudSyncEnabled result (cached):', result);
    return result;
  }
  catch (error) {
    logger.error('Error checking if sync is possible:', error);
    return false;
  }
}

/**
 * Start periodic settings synchronization
 */
function startPeriodicSync() {
  stopPeriodicSync();

  state.timers.sync = setInterval(async () => {
    if (await canSync()) {
      logger.info('Performing periodic settings synchronization');
      // Route through conflict resolution (not a blind downloadSettings()):
      // downloadSettings() unconditionally overwrites local pages/snippets with
      // the server copy, with no check for local edits that have not been
      // uploaded yet (e.g. still inside the upload debounce window).
      await syncSettings('resolve');
    }
  }, SYNC_INTERVAL_MS);

  logger.info(`Periodic synchronization started (${Math.floor(SYNC_INTERVAL_MS / 60000)} minute interval)`);
}

/**
 * Stop periodic settings synchronization
 */
function stopPeriodicSync() {
  if (state.timers.sync) {
    clearInterval(state.timers.sync);
    state.timers.sync = null;
    logger.info('Periodic synchronization stopped');
  }
  if (state.timers.retry) {
    clearTimeout(state.timers.retry);
    state.timers.retry = null;
    logger.info('Pending upload retry canceled');
  }
  if (state.timers.reconcile) {
    clearTimeout(state.timers.reconcile);
    state.timers.reconcile = null;
    logger.info('Pending stale-write reconciliation canceled');
  }
}

/**
 * Schedule synchronization on settings change
 * @param {string} changeType - Change type (e.g. 'page added', 'button modified', etc.)
 */
function scheduleSync(changeType) {
  // Generate a hash of the current settings to prevent duplicate changes (excluding _sync metadata)
  const currentData = {
    appearance: configStore.get('appearance'),
    pages: configStore.get('pages'),
    snippets: configStore.get('snippets'),
    advanced: configStore.get('advanced'),
    // The _sync field is intentionally excluded (prevents false positives from metadata changes)
  };
  const currentHash = JSON.stringify(currentData);

  // Check if it's the same change
  if (state.lastChangeHash === currentHash && state.lastChangeType === changeType) {
    logger.info(`Duplicate ${changeType} change detected, ignoring sync request`);
    return;
  }

  // Completely ignore if sync is currently in progress (do not wait)
  if (state.isSyncing) {
    logger.info(`${changeType} change detected but sync in progress, ignoring request`);
    return;
  }

  // Prevent overly rapid consecutive changes (minimum 1 second interval)
  const now = Date.now();
  if (state.lastScheduleTime && now - state.lastScheduleTime < 1000) {
    logger.info(`${changeType} change detected too quickly, ignoring request`);
    return;
  }

  state.lastChangeType = changeType;
  state.lastChangeHash = currentHash;
  state.lastScheduleTime = now;

  // Cancel previously scheduled sync
  if (state.timers.debounce) {
    clearTimeout(state.timers.debounce);
  }

  // Schedule new sync
  state.timers.debounce = setTimeout(async () => {
    logger.info(`Starting settings upload for '${changeType}' change`);
    state.retryCount = 0; // Reset retry count
    await uploadSettingsWithRetry();
  }, SYNC_DEBOUNCE_MS);

  logger.info(`${changeType} change detected, synchronization scheduled in ${SYNC_DEBOUNCE_MS / 1000} seconds`);
}

/**
 * Upload settings with retry logic
 */
async function uploadSettingsWithRetry() {
  if (state.isSyncing) {
    logger.info('Already syncing, request ignored');
    return;
  }

  try {
    state.isSyncing = true;
    const result = await uploadSettings(true); // Indicate this is an internal call

    if (result.success) {
      logger.info(`Cloud synchronization successful for '${state.lastChangeType}' change`);
      state.retryCount = 0;
      state.pendingSync = false;
      state.lastChangeHash = null; // Reset hash on success
    }
    else if (result.skipped) {
      // Skipped because there are no pages to upload (empty pages guard) — not a failure, so no retry
      logger.info('Upload skipped (no page data); not retrying');
      state.retryCount = 0;
      state.pendingSync = false;
      state.lastChangeHash = null;
    }
    else if (result.statusCode === 409) {
      // Rejected because the server has newer data (stale write) — a plain download would
      // overwrite and lose local changes, so reconcile via the merge path (resolve) to preserve them
      logger.warn('Upload rejected as stale (409); scheduling conflict resolution to preserve local changes');
      state.retryCount = 0;
      state.pendingSync = false;
      state.lastChangeHash = null;
      // Schedule the merge reconciliation to run after isSyncing is released (finally).
      // Use a reconcile slot separate from the retry slot so they don't overwrite each other.
      if (state.timers.reconcile) {
        clearTimeout(state.timers.reconcile);
      }
      state.timers.reconcile = setTimeout(() => {
        state.timers.reconcile = null;
        reconcileStaleUpload();
      }, RETRY_DELAY_MS);
    }
    else if (result.statusCode === 400) {
      // Payload validation failed — retrying would fail identically, so stop
      logger.error(`Upload rejected as invalid (400), not retrying: ${result.error}`);
      state.retryCount = 0;
      state.pendingSync = false;
      state.lastChangeHash = null;
    }
    else {
      state.retryCount++;

      logger.info(`Synchronization failed reason: ${result.error}`);

      if (state.retryCount <= MAX_RETRY_COUNT) {
        const delay = computeRetryDelay(state.retryCount);
        logger.info(`Upload failed, retry ${state.retryCount}/${MAX_RETRY_COUNT} scheduled in ${Math.round(delay / 1000)} seconds`);

        // Schedule retry (track timer so it can be cleaned up on shutdown)
        state.timers.retry = setTimeout(() => {
          state.timers.retry = null;
          uploadSettingsWithRetry();
        }, delay);
      }
      else {
        logger.error(`Maximum retry count (${MAX_RETRY_COUNT}) exceeded, upload failed: ${result.error}`);
        state.retryCount = 0;
        state.pendingSync = false;
      }
    }
  }
  catch (error) {
    logger.error('Error occurred during settings upload:', error);
    state.retryCount++;

    if (state.retryCount <= MAX_RETRY_COUNT) {
      const delay = computeRetryDelay(state.retryCount);
      logger.info(`Upload failed due to exception, retry ${state.retryCount}/${MAX_RETRY_COUNT} scheduled in ${Math.round(delay / 1000)} seconds`);

      // Schedule retry (track timer so it can be cleaned up on shutdown)
      state.timers.retry = setTimeout(() => {
        state.timers.retry = null;
        uploadSettingsWithRetry();
      }, delay);
    }
    else {
      logger.error(`Maximum retry count (${MAX_RETRY_COUNT}) exceeded, upload canceled`);
      state.retryCount = 0;
      state.pendingSync = false;
    }
  }
  finally {
    state.isSyncing = false;

    // Process any pending sync
    if (state.pendingSync) {
      logger.info('Processing pending sync request');
      state.pendingSync = false;
      setTimeout(() => {
        if (state.lastChangeType) {
          scheduleSync(state.lastChangeType);
        }
      }, 1000); // Retry after 1 second
    }
  }
}

/**
 * Upload current settings to the server (improved version)
 * @param {boolean} isInternalCall - Whether this is an internal call (called from uploadSettingsWithRetry)
 * @returns {Promise<Object>} Upload result
 */
async function uploadSettings(isInternalCall = false) {
  logger.info('Starting settings upload');

  // Check sync state
  if (!state.enabled) {
    logger.info('Cloud synchronization is disabled, skipping upload');
    return { success: false, error: 'Cloud sync disabled' };
  }

  // Check whether sync is possible
  if (!(await canSync())) {
    return { success: false, error: 'Cloud sync not enabled' };
  }

  // Only check and manage sync state for non-internal calls
  if (!isInternalCall) {
    if (state.isSyncing) {
      logger.info('Already syncing, skipping upload');
      return { success: false, error: 'Sync already in progress' };
    }
    state.isSyncing = true;
  }

  try {
    // Extract data directly from ConfigStore (single source)
    const advanced = configStore.get('advanced');
    const appearance = configStore.get('appearance');
    let pages = configStore.get('pages') || [];
    const snippets = configStore.get('snippets') || [];
    const syncMeta = getSyncMetadata(configStore);

    // Normalize local file:// icons to server URLs (one-time migration to share icons across devices)
    try {
      const normalized = await normalizeLocalIcons(pages, {
        onUnauthorized: authManager ? authManager.refreshAccessToken : null,
      });
      if (normalized.changed) {
        // Suppress so the internal write doesn't trigger an onDidChange re-upload (same pattern as downloadSettings)
        state.applyingRemote = true;
        try {
          configStore.set('pages', normalized.pages);
        }
        finally {
          state.applyingRemote = false;
        }
        pages = normalized.pages;
        logger.info('Local file:// icons were uploaded and replaced with server URLs');
      }
    }
    catch (normalizeError) {
      logger.warn(`Icon normalization skipped due to error: ${normalizeError.message}`);
    }

    // If both pages and snippets are empty it could delete valid server data, so skip (a skip, not a failure)
    if (pages.length === 0 && snippets.length === 0) {
      logger.warn('No page or snippet data to upload; skipping upload to avoid clobbering server data');
      return { success: false, skipped: true, error: 'No data to upload' };
    }

    // Current timestamp
    const timestamp = Date.now();

    // Prepare upload data - including metadata
    // The server rejects empty pages, so include them only when pages exist (supports snippet-only users)
    const uploadData = {
      ...(pages.length > 0 ? { pages } : {}),
      snippets,
      appearance,
      advanced,
      // Include metadata
      lastModifiedAt: syncMeta.lastModifiedAt || timestamp,
      lastModifiedDevice: syncMeta.lastModifiedDevice || getDeviceId(),
      lastSyncedAt: timestamp,
      lastSyncedDevice: getDeviceId(),
    };

    logger.info(`Uploading settings to server with ${pages.length} pages`);
    logger.info(`Last modified: ${new Date(syncMeta.lastModifiedAt).toISOString()} on ${syncMeta.lastModifiedDevice}`);

    // API call
    const result = await apiSync.uploadSettings({
      hasValidToken: authManager.hasValidToken,
      onUnauthorized: authManager.refreshAccessToken,
      configStore,
      directData: uploadData,
    });

    // On success, update the sync metadata in ConfigStore
    if (result.success) {
      state.lastSyncTime = timestamp;

      // Mark sync complete in ConfigStore
      markAsSynced(configStore);

      logger.info('Settings upload successful and sync metadata updated in ConfigStore');
      return result;
    }

    // apiSync returns HTTP errors in a nested { error: { statusCode } } form, so
    // normalize it to a top-level statusCode that the retry logic (uploadSettingsWithRetry) references
    const errorInfo = result.error && typeof result.error === 'object' ? result.error : null;
    const errorMessage = errorInfo ? errorInfo.message || errorInfo.code : result.error;
    logger.error('Upload failed:', errorMessage);
    return {
      success: false,
      error: errorMessage,
      statusCode: errorInfo ? errorInfo.statusCode : result.statusCode,
    };
  }
  catch (error) {
    logger.error('Settings upload error:', error);
    return {
      success: false,
      error: error.message || 'Unknown error',
    };
  }
  finally {
    // Only release sync state for non-internal calls
    if (!isInternalCall) {
      state.isSyncing = false;
    }
  }
}

/**
 * Download settings from the server (improved version)
 * @returns {Promise<Object>} Download result
 */
async function downloadSettings() {
  logger.info('Starting settings download');

  // Check sync state
  if (!state.enabled) {
    logger.info('Cloud synchronization is disabled, skipping download');
    return { success: false, error: 'Cloud sync disabled' };
  }

  // Check whether sync is possible
  if (!(await canSync())) {
    return { success: false, error: 'Cloud sync not enabled' };
  }

  if (state.isSyncing) {
    logger.info('Already syncing, skipping download');
    return { success: false, error: 'Sync already in progress' };
  }

  try {
    state.isSyncing = true;

    logger.info('Requesting settings from server...');

    // Do not suppress change detection during the network fetch (user edits in this window should still be queued normally).
    // Only fetch the data first, then suppress briefly during the ConfigStore save section below.
    const result = await apiSync.downloadSettings({
      hasValidToken: authManager.hasValidToken,
      onUnauthorized: authManager.refreshAccessToken,
    });

    if (!result.success) {
      logger.error('Settings download failed:', result.error);
      return result;
    }

    const timestamp = Date.now();
    const normalized = result.normalized || {};
    const serverMetadata = result.syncMetadata || result.data;

    // Suppress onDidChange re-upload only during the short window of applying remote data to ConfigStore.
    state.applyingRemote = true;
    try {
      if (Array.isArray(normalized.pages)) {
        // Validate remote action structure + register new risky actions for approval, then save
        const sanitizedPages = await sanitizeRemotePages(normalized.pages);
        recordRemoteChanges(configStore, sanitizedPages);
        configStore.set('pages', sanitizedPages);
        logger.info(`Saved ${sanitizedPages.length} pages to ConfigStore`);
      }
      if (Array.isArray(normalized.snippets)) {
        // Snippets have no code execution so no approval gate is needed, but validate structure before saving
        const safeSnippets = normalized.snippets.filter(
          s => s && typeof s.keyword === 'string' && typeof s.content === 'string',
        );
        configStore.set('snippets', safeSnippets);
        logger.info(`Saved ${safeSnippets.length} snippets to ConfigStore`);
      }
      if (normalized.appearance && Object.keys(normalized.appearance).length > 0) {
        configStore.set('appearance', normalized.appearance);
      }
      if (normalized.advanced && Object.keys(normalized.advanced).length > 0) {
        configStore.set('advanced', normalized.advanced);
      }

      // Apply metadata received from the server
      if (serverMetadata) {
        updateSyncMetadata(configStore, {
          lastSyncedAt: timestamp,
          lastSyncedDevice: getDeviceId(),
          lastModifiedAt: serverMetadata.lastModifiedAt || timestamp,
          lastModifiedDevice: serverMetadata.lastModifiedDevice || 'server',
          isConflicted: false,
        });
        logger.info(`Server data synced - last modified: ${new Date(serverMetadata.lastModifiedAt || timestamp).toISOString()}`);
      }
      else {
        logger.info('No server metadata found, marking as synced with current timestamp');
        markAsSynced(configStore);
      }
    }
    finally {
      state.applyingRemote = false;
    }

    // Update state
    state.lastSyncTime = timestamp;

    // Send UI update notification through the auth manager
    if (authManager && typeof authManager.notifySettingsSynced === 'function') {
      const configData = {
        pages: configStore.get('pages'),
        snippets: configStore.get('snippets'),
        appearance: configStore.get('appearance'),
        advanced: configStore.get('advanced'),
        subscription: configStore.get('subscription'),
      };

      authManager.notifySettingsSynced(configData);
      logger.info('UI update notification sent to toast window');
    }

    return result;
  }
  catch (error) {
    logger.error('Settings download error:', error);
    return {
      success: false,
      error: error.message || 'Unknown error',
    };
  }
  finally {
    state.isSyncing = false;
  }
}

/**
 * Resolve settings conflicts and synchronize (improved version)
 * @param {string} action - Sync action ('upload', 'download', 'resolve')
 * @returns {Promise<Object>} Synchronization result
 */
async function syncSettings(action = 'resolve') {
  logger.info(`Manual synchronization request: ${action}`);

  try {
    if (action === 'upload') {
      return await uploadAndReconcile();
    }
    else if (action === 'download') {
      return await downloadSettings();
    }
    else {
      // Smart conflict resolution (based on hash and timestamp)
      logger.info('Starting intelligent conflict resolution');

      // 1. Check current local state
      const localSyncMeta = getSyncMetadata(configStore);
      const hasLocalChanges = hasUnsyncedChanges(configStore);

      logger.info(`Local state - Modified: ${new Date(localSyncMeta.lastModifiedAt).toISOString()}, Has changes: ${hasLocalChanges}`);

      // 2. Temporarily download server settings (do not save to ConfigStore)
      const serverResult = await apiSync.downloadSettings({
        hasValidToken: authManager.hasValidToken,
        onUnauthorized: authManager.refreshAccessToken,
      });

      if (!serverResult.success) {
        logger.error('Server settings download failed:', serverResult.error);
        return serverResult;
      }

      // Prefer normalized sections (prevents data loss even with nested/array response shapes)
      const serverData = serverResult.normalized || serverResult.data || {};
      const serverMeta = serverResult.syncMetadata || serverResult.data || {};

      logger.info(`Server state - Modified: ${new Date(serverMeta.lastModifiedAt || 0).toISOString()}`);

      // 3. Detect conflict and determine resolution strategy
      const conflictResolution = analyzeConflict(localSyncMeta, serverMeta, hasLocalChanges);

      logger.info(`Conflict resolution strategy: ${conflictResolution.action}`);

      if (conflictResolution.action === 'upload_local') {
        // Local is newer - upload to server
        logger.info('Local changes are newer, uploading to server');
        return await uploadAndReconcile();
      }
      else if (conflictResolution.action === 'download_server') {
        // Server is newer - download from server
        logger.info('Server changes are newer, downloading from server');
        return await downloadSettings();
      }
      else if (conflictResolution.action === 'merge_required') {
        // Merge required
        logger.info('Complex conflict detected, performing merge');

        const mergeResult = await performIntelligentMerge(serverData, serverMeta);
        if (mergeResult.success) {
          // Upload to server after merge
          return await uploadAndReconcile();
        }
        return mergeResult;
      }
      else {
        // No changes
        logger.info('No synchronization needed');
        return { success: true, message: 'No changes to synchronize' };
      }
    }
  }
  catch (error) {
    logger.error('Manual synchronization error:', error);
    return {
      success: false,
      error: error.message || 'Unknown error',
    };
  }
}

/**
 * After a 409 (stale write) rejection, merge with server data and re-upload while preserving local changes
 * @returns {Promise<Object>} Reconciliation result
 */
/**
 * Upload for the manual/conflict-resolution path. Unlike the automatic path (uploadSettingsWithRetry), it returns
 * the result immediately, but on a 409 (stale) response it reconciles by merging with the server to preserve local changes.
 * @returns {Promise<Object>} Upload or reconciliation result
 */
async function uploadAndReconcile() {
  const result = await uploadSettings();
  if (result.success || result.skipped) {
    return result;
  }
  if (result.statusCode === 409) {
    logger.warn('Upload rejected as stale (409); reconciling with server merge to preserve local changes');
    return await reconcileStaleUpload();
  }
  return result;
}

async function reconcileStaleUpload() {
  // Serialize with other syncs (e.g. periodic download) so ConfigStore writes don't interleave.
  // (If they overlap, the applyingRemote suppression flag could be released early, causing a download→re-upload loop)
  if (state.isSyncing) {
    logger.info('Sync in progress; deferring stale-upload reconciliation');
    if (state.timers.reconcile) {
      clearTimeout(state.timers.reconcile);
    }
    state.timers.reconcile = setTimeout(() => {
      state.timers.reconcile = null;
      reconcileStaleUpload();
    }, RETRY_DELAY_MS);
    return { success: false, deferred: true, error: 'Sync in progress' };
  }

  try {
    state.isSyncing = true;
    logger.info('Reconciling stale upload: fetching server data for merge');

    const serverResult = await apiSync.downloadSettings({
      hasValidToken: authManager.hasValidToken,
      onUnauthorized: authManager.refreshAccessToken,
    });

    if (!serverResult.success) {
      logger.error('Stale-write reconciliation failed to fetch server data:', serverResult.error);
      return serverResult;
    }

    // Prefer normalized sections (prevents data loss even with nested/array response shapes)
    const serverData = serverResult.normalized || serverResult.data || {};
    const serverMeta = serverResult.syncMetadata || serverResult.data || {};

    const mergeResult = await performIntelligentMerge(serverData, serverMeta);
    if (!mergeResult.success) {
      return mergeResult;
    }

    // Internal call (isSyncing is managed by this function, so pass true to avoid being blocked by the re-entry guard)
    return await uploadSettings(true);
  }
  catch (error) {
    logger.error('Stale-write reconciliation error:', error);
    return { success: false, error: error.message || 'Unknown error' };
  }
  finally {
    state.isSyncing = false;
  }
}

/**
 * Perform intelligent settings merge
 * @param {Object} serverData - Server data
 * @param {Object} serverMeta - Server metadata
 * @returns {Promise<Object>} Merge result
 */
async function performIntelligentMerge(serverData, serverMeta) {
  try {
    logger.info('Starting intelligent merge process');

    // 1. Back up current local data
    const localBackup = {
      pages: configStore.get('pages'),
      snippets: configStore.get('snippets'),
      appearance: configStore.get('appearance'),
      advanced: configStore.get('advanced'),
      _sync: getSyncMetadata(configStore),
    };

    // 2. Normalize server data structure
    const normalizedServerData = {
      pages: serverData.pages || [],
      snippets: serverData.snippets || [],
      appearance: serverData.appearance || {},
      advanced: serverData.advanced || {},
    };

    // 3. Merge by section
    const mergedData = {
      pages: mergePages(localBackup.pages, normalizedServerData.pages),
      snippets: mergeSnippets(localBackup.snippets, normalizedServerData.snippets),
      appearance: mergeAppearance(localBackup.appearance, normalizedServerData.appearance),
      advanced: mergeAdvanced(localBackup.advanced, normalizedServerData.advanced),
    };

    // 4. Apply merged data to ConfigStore (remote actions get structure validation + register new risky actions for approval)
    mergedData.pages = await sanitizeRemotePages(mergedData.pages);
    recordRemoteChanges(configStore, mergedData.pages);
    // Suppress so onDidChange doesn't trigger a duplicate upload while applying the merge result
    // (the merge_required path explicitly calls uploadSettings right after)
    state.applyingRemote = true;
    try {
      configStore.set('pages', mergedData.pages);
      configStore.set('snippets', mergedData.snippets);
      configStore.set('appearance', mergedData.appearance);
      configStore.set('advanced', mergedData.advanced);
    }
    finally {
      state.applyingRemote = false;
    }

    // 5. Update merge metadata
    markAsModified(configStore);

    // If the server timestamp is ahead of the local clock (clock skew), bump above it
    // to prevent the re-upload from being rejected as stale (409) again
    const serverModifiedAt = Number(serverMeta && serverMeta.lastModifiedAt) || 0;
    const mergedMeta = getSyncMetadata(configStore);
    if (serverModifiedAt >= mergedMeta.lastModifiedAt) {
      updateSyncMetadata(configStore, { lastModifiedAt: serverModifiedAt + 1 });
    }

    logger.info('Intelligent merge completed successfully');
    return {
      success: true,
      message: 'Settings merged successfully',
      merged: {
        pages: mergedData.pages.length,
        snippets: mergedData.snippets.length,
        appearance: Object.keys(mergedData.appearance).length,
        advanced: Object.keys(mergedData.advanced).length,
      },
    };
  }
  catch (error) {
    logger.error('Intelligent merge failed:', error);
    return {
      success: false,
      error: 'Merge operation failed: ' + error.message,
    };
  }
}

/**
 * Enable/disable synchronization feature
 * @param {boolean} enabled - Whether to enable
 */
function setEnabled(enabled) {
  state.enabled = enabled;
  // When the enabled state changes, the canSync cache becomes stale, so invalidate it (prevents stale false right after login)
  clearCloudSyncCache();
  logger.info(`Cloud synchronization ${enabled ? 'enabled' : 'disabled'}`);

  // Sync with Config Store (CloudSyncManager is the single source of truth)
  if (configStore) {
    configStore.set('cloudSync.enabled', enabled);
    logger.info('Config store updated with sync enabled state');
  }

  if (enabled) {
    startPeriodicSync();
  }
  else {
    stopPeriodicSync();
  }
}

/**
 * Register event listeners for settings changes (improved version)
 */
function setupConfigListeners() {
  // Settings change detection function (common logic)
  async function handleConfigChange(changeType, _key) {
    logger.debug(`${changeType} change detected`);

    // Ignore while applying remote data (prevents download→upload feedback loop)
    if (state.applyingRemote) {
      logger.info('Ignoring config change while applying remote data');
      return;
    }

    // Check whether sync is possible
    if (!state.enabled) {
      logger.info('Sync disabled - state.enabled is false');
      return;
    }

    if (!(await canSync())) {
      logger.info('Cannot sync - canSync() returned false');
      return;
    }

    logger.info(`${changeType} settings change confirmed (onDidChange event fired), proceeding with sync`);

    // The onDidChange event firing is evidence that a value actually changed
    // Skip the hasUnsyncedChanges check and proceed directly with sync

    // Reflect the change in ConfigStore metadata
    markAsModified(configStore);

    // Schedule sync
    scheduleSync(changeType);
  }

  // Detect page settings changes
  logger.info('Registering onDidChange listener for pages...');
  configStore.onDidChange('pages', async (newValue, oldValue) => {
    logger.info('🎯 onDidChange event fired for pages!');
    logger.info('Event triggered at:', new Date().toISOString());
    logger.info('NewValue length:', Array.isArray(newValue) ? newValue.length : 'Not array');
    logger.info('OldValue length:', Array.isArray(oldValue) ? oldValue.length : 'Not array');

    // Detect change type in detail
    let changeType = 'pages_modified';
    if (Array.isArray(newValue) && Array.isArray(oldValue)) {
      if (newValue.length > oldValue.length) {
        changeType = 'page_added';
      }
      else if (newValue.length < oldValue.length) {
        changeType = 'page_deleted';
      }
    }

    logger.info(`Change type detected: ${changeType}`);
    await handleConfigChange(changeType, 'pages');
  });
  logger.info('onDidChange listener for pages registered successfully');

  // Detect snippet changes
  configStore.onDidChange('snippets', async () => {
    await handleConfigChange('snippets_modified', 'snippets');
  });

  // Detect appearance settings changes
  configStore.onDidChange('appearance', async () => {
    await handleConfigChange('appearance', 'appearance');
  });

  // Detect advanced settings changes
  configStore.onDidChange('advanced', async () => {
    await handleConfigChange('advanced', 'advanced');
  });

  // Ignore _sync metadata changes (prevents infinite loop)
  configStore.onDidChange('_sync', () => {
    logger.debug('Sync metadata updated - not triggering sync');
  });

  logger.info('Config change listeners registered with improved logic');
}

/**
 * Initialize cloud synchronization
 * @param {Object} authManagerInstance - Auth manager instance
 * @param {Object} _userDataManagerInstance - User data manager instance (kept for compatibility)
 * @param {Object} configStoreInstance - Config store instance (optional)
 * @returns {Object} Synchronization manager object
 */
function initCloudSync(authManagerInstance, _userDataManagerInstance, configStoreInstance = null) {
  // Re-initialization guard: prevents duplicate listener/timer registration and reuses the existing manager
  if (syncManagerInstance) {
    logger.info('Cloud sync already initialized - reusing existing manager');
    if (authManagerInstance) {
      setAuthManager(authManagerInstance);
    }
    return syncManagerInstance;
  }

  logger.info('Starting cloud synchronization initialization');

  // Set up auth manager reference
  setAuthManager(authManagerInstance);

  // Set up config store (use an externally provided instance or create a new one)
  if (configStoreInstance) {
    configStore = configStoreInstance;
    logger.info('Using provided config store instance - ID:', configStore.path || 'unknown');
  }
  else {
    configStore = createConfigStore();
    logger.info('Created new config store instance - ID:', configStore.path || 'unknown');
  }

  // Initialize device information
  state.deviceId = getDeviceId();
  logger.info(`Device ID: ${state.deviceId}`);

  // Initialize sync state (read from Config Store or use default)
  const savedEnabled = configStore.get('cloudSync.enabled');
  state.enabled = savedEnabled !== undefined ? savedEnabled : true;
  logger.info(`Cloud sync initialized: ${state.enabled ? 'enabled' : 'disabled'} (from ${savedEnabled !== undefined ? 'config' : 'default'})`);

  // Register settings change detection events
  setupConfigListeners();

  // Conditionally start periodic sync
  if (state.enabled) {
    logger.info('Starting periodic sync (enabled)');
    startPeriodicSync();
  }
  else {
    logger.info('Periodic sync not started (disabled)');
  }

  // Create interface object
  const syncManager = {
    // Base interface
    unsubscribe: () => {
      // Stop timers
      stopPeriodicSync();

      // Cancel debounce timer
      if (state.timers.debounce) {
        clearTimeout(state.timers.debounce);
        state.timers.debounce = null;
      }

      logger.info('Cloud synchronization unsubscribed');
    },
    enable: () => {
      setEnabled(true);
    },
    disable: () => {
      setEnabled(false);
    },
    getLastSyncStatus: () => ({
      success: state.lastSyncTime > 0,
      timestamp: state.lastSyncTime,
    }),
    syncAfterLogin: async () => {
      logger.info('Performing cloud synchronization after login');

      // Sync via the conflict resolution path (not an unconditional download): if there are local changes
      // edited while offline between logins, upload/merge them to the server, otherwise receive server data as before.
      const result = await syncSettings('resolve');

      // Additional UI update after successful download
      if (result.success) {
        // Pass current settings to settings-window for UI update
        if (authManager && typeof authManager.notifySettingsSynced === 'function') {
          // Collect current settings data
          const configData = {
            pages: configStore.get('pages'),
            snippets: configStore.get('snippets'),
            appearance: configStore.get('appearance'),
            advanced: configStore.get('advanced'),
            subscription: configStore.get('subscription'),
          };

          // Send notification to UI - for updating toast window buttons/pages
          authManager.notifySettingsSynced(configData);
          logger.info('Login sync: UI update notification sent for current settings');
        }
      }

      // Enable synchronization
      if (state.enabled) {
        startPeriodicSync();
      }

      return result;
    },
    manualSync: async (action = 'resolve') => await syncSettings(action),
    updateCloudSyncSettings: enabled => {
      logger.info(`updateCloudSyncSettings called with enabled: ${enabled}`);
      setEnabled(enabled);
    },

    // Additional interface
    startPeriodicSync,
    stopPeriodicSync,
    getCurrentStatus: () => ({
      enabled: state.enabled,
      deviceId: state.deviceId,
      lastChangeType: state.lastChangeType,
      lastSyncTime: state.lastSyncTime,
    }),
  };

  syncManagerInstance = syncManager;
  return syncManager;
}

/**
 * Return the initialized sync manager (available after initCloudSync)
 * @returns {Object|null} Sync manager or null
 */
function getSyncManager() {
  return syncManagerInstance;
}

/**
 * Set up auth manager reference
 * @param {Object} manager - Auth manager instance
 */
function setAuthManager(manager) {
  authManager = manager;
  clearCloudSyncCache(); // Clear cache when auth manager changes
  logger.info('Authentication manager reference setup complete');
}

/**
 * Update cloud synchronization settings (kept for backward compatibility)
 * @param {boolean} enabled - Whether to enable
 */
function updateCloudSyncSettings(enabled) {
  setEnabled(enabled);
}

module.exports = {
  initCloudSync,
  getSyncManager,
  setAuthManager,
  startPeriodicSync,
  stopPeriodicSync,
  uploadSettings,
  downloadSettings,
  syncSettings,
  updateCloudSyncSettings,
  computeRetryDelay,
};
