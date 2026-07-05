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
const { analyzeConflict, mergePages, mergeAppearance, mergeAdvanced } = require('./cloud-sync/conflict-resolver');

// Create logger for this module
const logger = createLogger('CloudSync');

// Synchronization related constants
const SYNC_INTERVAL_MS = 15 * 60 * 1000; // Auto-sync every 15 minutes
const SYNC_DEBOUNCE_MS = 5000; // Sync 5 seconds after the last change (increased from 2s)
const MAX_RETRY_COUNT = 3; // Maximum number of retry attempts
const RETRY_DELAY_MS = 5000; // Retry interval (5 seconds)

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
      await downloadSettings();
    }
  }, SYNC_INTERVAL_MS);

  logger.info(`Periodic synchronization started (${Math.floor(SYNC_INTERVAL_MS / 60000)} minute interval)`);
}

/**
 * 주기적 설정 동기화 중지
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
 * 설정 변경 시 동기화 예약
 * @param {string} changeType - 변경 유형 (예: '페이지 추가됨', '버튼 수정됨' 등)
 */
function scheduleSync(changeType) {
  // 현재 설정의 해시를 생성하여 중복 변경 방지 (_sync 메타데이터 제외)
  const currentData = {
    appearance: configStore.get('appearance'),
    pages: configStore.get('pages'),
    advanced: configStore.get('advanced'),
    // _sync 필드는 의도적으로 제외 (메타데이터 변경으로 인한 false positive 방지)
  };
  const currentHash = JSON.stringify(currentData);

  // 동일한 변경사항인지 확인
  if (state.lastChangeHash === currentHash && state.lastChangeType === changeType) {
    logger.info(`Duplicate ${changeType} change detected, ignoring sync request`);
    return;
  }

  // 현재 동기화가 진행 중인 경우 완전 무시 (대기하지 않음)
  if (state.isSyncing) {
    logger.info(`${changeType} change detected but sync in progress, ignoring request`);
    return;
  }

  // 너무 빠른 연속 변경 방지 (최소 1초 간격)
  const now = Date.now();
  if (state.lastScheduleTime && now - state.lastScheduleTime < 1000) {
    logger.info(`${changeType} change detected too quickly, ignoring request`);
    return;
  }

  state.lastChangeType = changeType;
  state.lastChangeHash = currentHash;
  state.lastScheduleTime = now;

  // 이전에 예약된 동기화 취소
  if (state.timers.debounce) {
    clearTimeout(state.timers.debounce);
  }

  // 새로운 동기화 예약
  state.timers.debounce = setTimeout(async () => {
    logger.info(`Starting settings upload for '${changeType}' change`);
    state.retryCount = 0; // 재시도 횟수 초기화
    await uploadSettingsWithRetry();
  }, SYNC_DEBOUNCE_MS);

  logger.info(`${changeType} change detected, synchronization scheduled in ${SYNC_DEBOUNCE_MS / 1000} seconds`);
}

/**
 * 재시도 로직이 포함된 설정 업로드
 */
async function uploadSettingsWithRetry() {
  if (state.isSyncing) {
    logger.info('Already syncing, request ignored');
    return;
  }

  try {
    state.isSyncing = true;
    const result = await uploadSettings(true); // 내부 호출임을 명시

    if (result.success) {
      logger.info(`Cloud synchronization successful for '${state.lastChangeType}' change`);
      state.retryCount = 0;
      state.pendingSync = false;
      state.lastChangeHash = null; // 성공 시 해시 초기화
    }
    else if (result.skipped) {
      // 업로드할 페이지가 없어 스킵됨(빈 pages 가드) — 실패가 아니므로 재시도하지 않음
      logger.info('Upload skipped (no page data); not retrying');
      state.retryCount = 0;
      state.pendingSync = false;
      state.lastChangeHash = null;
    }
    else if (result.statusCode === 409) {
      // 서버에 더 최신 데이터가 있어 거부됨(stale write) — 단순 다운로드는 로컬 변경을
      // 덮어써 유실시키므로, 병합 경로(resolve)로 로컬 변경을 보존하며 재조정한다
      logger.warn('Upload rejected as stale (409); scheduling conflict resolution to preserve local changes');
      state.retryCount = 0;
      state.pendingSync = false;
      state.lastChangeHash = null;
      // isSyncing 해제(finally) 후 병합 재조정이 진행되도록 예약.
      // 재시도(retry) 슬롯과 분리된 reconcile 슬롯을 사용해 서로 덮어쓰지 않게 한다.
      if (state.timers.reconcile) {
        clearTimeout(state.timers.reconcile);
      }
      state.timers.reconcile = setTimeout(() => {
        state.timers.reconcile = null;
        reconcileStaleUpload();
      }, RETRY_DELAY_MS);
    }
    else if (result.statusCode === 400) {
      // 페이로드 검증 실패 — 재시도해도 동일하게 실패하므로 중단
      logger.error(`Upload rejected as invalid (400), not retrying: ${result.error}`);
      state.retryCount = 0;
      state.pendingSync = false;
      state.lastChangeHash = null;
    }
    else {
      state.retryCount++;

      logger.info(`Synchronization failed reason: ${result.error}`);

      if (state.retryCount <= MAX_RETRY_COUNT) {
        logger.info(`Upload failed, retry ${state.retryCount}/${MAX_RETRY_COUNT} scheduled in ${RETRY_DELAY_MS / 1000} seconds`);

        // 재시도 예약 (종료 시 정리할 수 있도록 타이머 추적)
        state.timers.retry = setTimeout(() => {
          state.timers.retry = null;
          uploadSettingsWithRetry();
        }, RETRY_DELAY_MS);
      }
      else {
        logger.error(`Maximum retry count (${MAX_RETRY_COUNT}) exceeded, upload failed: ${result.error}`);
        state.retryCount = 0;
        state.pendingSync = false;
      }
    }
  }
  catch (error) {
    logger.error('설정 업로드 중 오류 발생:', error);
    state.retryCount++;

    if (state.retryCount <= MAX_RETRY_COUNT) {
      logger.info(`Upload failed due to exception, retry ${state.retryCount}/${MAX_RETRY_COUNT} scheduled in ${RETRY_DELAY_MS / 1000} seconds`);

      // 재시도 예약 (종료 시 정리할 수 있도록 타이머 추적)
      state.timers.retry = setTimeout(() => {
        state.timers.retry = null;
        uploadSettingsWithRetry();
      }, RETRY_DELAY_MS);
    }
    else {
      logger.error(`Maximum retry count (${MAX_RETRY_COUNT}) exceeded, upload canceled`);
      state.retryCount = 0;
      state.pendingSync = false;
    }
  }
  finally {
    state.isSyncing = false;

    // 대기 중인 동기화가 있다면 처리
    if (state.pendingSync) {
      logger.info('Processing pending sync request');
      state.pendingSync = false;
      setTimeout(() => {
        if (state.lastChangeType) {
          scheduleSync(state.lastChangeType);
        }
      }, 1000); // 1초 후 재시도
    }
  }
}

/**
 * 현재 설정을 서버에 업로드 (개선된 버전)
 * @param {boolean} isInternalCall - 내부 호출 여부 (uploadSettingsWithRetry에서 호출된 경우)
 * @returns {Promise<Object>} 업로드 결과
 */
async function uploadSettings(isInternalCall = false) {
  logger.info('Starting settings upload');

  // 동기화 상태 확인
  if (!state.enabled) {
    logger.info('Cloud synchronization is disabled, skipping upload');
    return { success: false, error: 'Cloud sync disabled' };
  }

  // 동기화 가능 여부 확인
  if (!(await canSync())) {
    return { success: false, error: 'Cloud sync not enabled' };
  }

  // 내부 호출이 아닌 경우에만 sync 상태 확인 및 관리
  if (!isInternalCall) {
    if (state.isSyncing) {
      logger.info('Already syncing, skipping upload');
      return { success: false, error: 'Sync already in progress' };
    }
    state.isSyncing = true;
  }

  try {
    // ConfigStore에서 직접 데이터 추출 (단일 소스)
    const advanced = configStore.get('advanced');
    const appearance = configStore.get('appearance');
    const pages = configStore.get('pages') || [];
    const syncMeta = getSyncMetadata(configStore);

    // 빈 페이지 업로드는 서버의 정상 데이터를 삭제할 수 있으므로 건너뛴다 (실패가 아닌 스킵)
    if (pages.length === 0) {
      logger.warn('No page data to upload; skipping upload to avoid clobbering server data');
      return { success: false, skipped: true, error: 'No page data to upload' };
    }

    // 현재 타임스탬프
    const timestamp = Date.now();

    // 업로드 데이터 준비 - 메타데이터 포함
    const uploadData = {
      pages,
      appearance,
      advanced,
      // 메타데이터 포함
      lastModifiedAt: syncMeta.lastModifiedAt || timestamp,
      lastModifiedDevice: syncMeta.lastModifiedDevice || getDeviceId(),
      lastSyncedAt: timestamp,
      lastSyncedDevice: getDeviceId(),
    };

    logger.info(`Uploading settings to server with ${pages.length} pages`);
    logger.info(`Last modified: ${new Date(syncMeta.lastModifiedAt).toISOString()} on ${syncMeta.lastModifiedDevice}`);

    // API 호출
    const result = await apiSync.uploadSettings({
      hasValidToken: authManager.hasValidToken,
      onUnauthorized: authManager.refreshAccessToken,
      configStore,
      directData: uploadData,
    });

    // 성공 시 ConfigStore의 동기화 메타데이터 업데이트
    if (result.success) {
      state.lastSyncTime = timestamp;

      // ConfigStore에 동기화 완료 마킹
      markAsSynced(configStore);

      logger.info('Settings upload successful and sync metadata updated in ConfigStore');
      return result;
    }

    // apiSync 는 HTTP 오류를 { error: { statusCode } } 중첩 형태로 반환하므로
    // 재시도 로직(uploadSettingsWithRetry)이 참조하는 최상위 statusCode 로 정규화한다
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
    logger.error('설정 업로드 오류:', error);
    return {
      success: false,
      error: error.message || 'Unknown error',
    };
  }
  finally {
    // 내부 호출이 아닌 경우에만 sync 상태 해제
    if (!isInternalCall) {
      state.isSyncing = false;
    }
  }
}

/**
 * 서버에서 설정 다운로드 (개선된 버전)
 * @returns {Promise<Object>} 다운로드 결과
 */
async function downloadSettings() {
  logger.info('Starting settings download');

  // 동기화 상태 확인
  if (!state.enabled) {
    logger.info('Cloud synchronization is disabled, skipping download');
    return { success: false, error: 'Cloud sync disabled' };
  }

  // 동기화 가능 여부 확인
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

    // 네트워크 fetch 중에는 변경 감지를 억제하지 않는다(이 구간의 사용자 편집은 정상 큐잉되어야 함).
    // 데이터만 받아온 뒤(configStore:null), 아래 ConfigStore 저장 구간에만 짧게 억제한다.
    const result = await apiSync.downloadSettings({
      hasValidToken: authManager.hasValidToken,
      onUnauthorized: authManager.refreshAccessToken,
      configStore: null,
      directData: {}, // GET 요청에서는 무시됨
    });

    if (!result.success) {
      logger.error('Settings download failed:', result.error);
      return result;
    }

    const timestamp = Date.now();
    const normalized = result.normalized || {};
    const serverMetadata = result.syncMetadata || result.data;

    // 원격 데이터를 ConfigStore에 적용하는 짧은 구간에만 onDidChange 재업로드를 억제한다.
    state.applyingRemote = true;
    try {
      if (Array.isArray(normalized.pages)) {
        // 원격 액션 구조 검증 + 신규 위험 액션 승인 대기 등록 후 저장
        const sanitizedPages = await sanitizeRemotePages(normalized.pages);
        recordRemoteChanges(configStore, sanitizedPages);
        configStore.set('pages', sanitizedPages);
        logger.info(`Saved ${sanitizedPages.length} pages to ConfigStore`);
      }
      if (normalized.appearance && Object.keys(normalized.appearance).length > 0) {
        configStore.set('appearance', normalized.appearance);
      }
      if (normalized.advanced && Object.keys(normalized.advanced).length > 0) {
        configStore.set('advanced', normalized.advanced);
      }

      // 서버에서 받은 메타데이터 반영
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

    // 상태 업데이트
    state.lastSyncTime = timestamp;

    // 인증 관리자를 통해 UI 업데이트 알림 전송
    if (authManager && typeof authManager.notifySettingsSynced === 'function') {
      const configData = {
        pages: configStore.get('pages'),
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
    logger.error('설정 다운로드 오류:', error);
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
 * 설정 충돌 해결 및 동기화 (개선된 버전)
 * @param {string} action - 동기화 동작 ('upload', 'download', 'resolve')
 * @returns {Promise<Object>} 동기화 결과
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
      // 스마트 충돌 해결 (해시 및 타임스탬프 기반)
      logger.info('Starting intelligent conflict resolution');

      // 1. 현재 로컬 상태 확인
      const localSyncMeta = getSyncMetadata(configStore);
      const hasLocalChanges = hasUnsyncedChanges(configStore);

      logger.info(`Local state - Modified: ${new Date(localSyncMeta.lastModifiedAt).toISOString()}, Has changes: ${hasLocalChanges}`);

      // 2. 서버 설정을 임시로 다운로드 (ConfigStore에 저장하지 않음)
      const serverResult = await apiSync.downloadSettings({
        hasValidToken: authManager.hasValidToken,
        onUnauthorized: authManager.refreshAccessToken,
        configStore: null, // ConfigStore에 저장하지 않음
        directData: {},
      });

      if (!serverResult.success) {
        logger.error('Server settings download failed:', serverResult.error);
        return serverResult;
      }

      // 정규화된 섹션을 우선 사용(중첩/배열 응답 형태에서도 데이터 유실 방지)
      const serverData = serverResult.normalized || serverResult.data || {};
      const serverMeta = serverResult.syncMetadata || serverResult.data || {};

      logger.info(`Server state - Modified: ${new Date(serverMeta.lastModifiedAt || 0).toISOString()}`);

      // 3. 충돌 감지 및 해결 전략 결정
      const conflictResolution = analyzeConflict(localSyncMeta, serverMeta, hasLocalChanges);

      logger.info(`Conflict resolution strategy: ${conflictResolution.action}`);

      if (conflictResolution.action === 'upload_local') {
        // 로컬이 더 최신 - 서버로 업로드
        logger.info('Local changes are newer, uploading to server');
        return await uploadAndReconcile();
      }
      else if (conflictResolution.action === 'download_server') {
        // 서버가 더 최신 - 서버에서 다운로드
        logger.info('Server changes are newer, downloading from server');
        return await downloadSettings();
      }
      else if (conflictResolution.action === 'merge_required') {
        // 병합 필요
        logger.info('Complex conflict detected, performing merge');

        const mergeResult = await performIntelligentMerge(serverData, serverMeta);
        if (mergeResult.success) {
          // 병합 후 서버에 업로드
          return await uploadAndReconcile();
        }
        return mergeResult;
      }
      else {
        // 변경사항 없음
        logger.info('No synchronization needed');
        return { success: true, message: 'No changes to synchronize' };
      }
    }
  }
  catch (error) {
    logger.error('수동 동기화 오류:', error);
    return {
      success: false,
      error: error.message || 'Unknown error',
    };
  }
}

/**
 * 409(stale write) 거부 후 서버 데이터와 병합하여 로컬 변경을 보존한 채 재업로드
 * @returns {Promise<Object>} 재조정 결과
 */
/**
 * 수동/충돌해결 경로용 업로드. 자동 경로(uploadSettingsWithRetry)와 달리 결과를 즉시 반환하되,
 * 409(stale) 응답 시 서버와 병합 재조정하여 로컬 변경을 보존한다.
 * @returns {Promise<Object>} 업로드 또는 재조정 결과
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
  // 주기적 다운로드 등 다른 동기화와 ConfigStore 쓰기가 교차하지 않도록 직렬화한다.
  // (겹치면 applyingRemote 억제 플래그가 조기 해제되어 다운로드→재업로드 루프가 발생할 수 있음)
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
      configStore: null, // ConfigStore에 저장하지 않고 병합에만 사용
      directData: {},
    });

    if (!serverResult.success) {
      logger.error('Stale-write reconciliation failed to fetch server data:', serverResult.error);
      return serverResult;
    }

    // 정규화된 섹션을 우선 사용(중첩/배열 응답 형태에서도 데이터 유실 방지)
    const serverData = serverResult.normalized || serverResult.data || {};
    const serverMeta = serverResult.syncMetadata || serverResult.data || {};

    const mergeResult = await performIntelligentMerge(serverData, serverMeta);
    if (!mergeResult.success) {
      return mergeResult;
    }

    // 내부 호출(isSyncing 은 이 함수가 관리하므로 재진입 가드에 막히지 않도록)
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
 * 지능형 설정 병합 수행
 * @param {Object} serverData - 서버 데이터
 * @param {Object} serverMeta - 서버 메타데이터
 * @returns {Promise<Object>} 병합 결과
 */
async function performIntelligentMerge(serverData, serverMeta) {
  try {
    logger.info('Starting intelligent merge process');

    // 1. 현재 로컬 데이터 백업
    const localBackup = {
      pages: configStore.get('pages'),
      appearance: configStore.get('appearance'),
      advanced: configStore.get('advanced'),
      _sync: getSyncMetadata(configStore),
    };

    // 2. 서버 데이터 구조 정규화
    const normalizedServerData = {
      pages: serverData.pages || [],
      appearance: serverData.appearance || {},
      advanced: serverData.advanced || {},
    };

    // 3. 섹션별 병합
    const mergedData = {
      pages: mergePages(localBackup.pages, normalizedServerData.pages),
      appearance: mergeAppearance(localBackup.appearance, normalizedServerData.appearance),
      advanced: mergeAdvanced(localBackup.advanced, normalizedServerData.advanced),
    };

    // 4. 병합된 데이터를 ConfigStore에 적용 (원격 액션은 구조 검증 + 신규 위험 액션 승인 대기 등록)
    mergedData.pages = await sanitizeRemotePages(mergedData.pages);
    recordRemoteChanges(configStore, mergedData.pages);
    // 병합 결과 적용 중에는 onDidChange가 중복 업로드를 트리거하지 않도록 억제
    // (merge_required 경로가 직후 uploadSettings를 명시적으로 호출한다)
    state.applyingRemote = true;
    try {
      configStore.set('pages', mergedData.pages);
      configStore.set('appearance', mergedData.appearance);
      configStore.set('advanced', mergedData.advanced);
    }
    finally {
      state.applyingRemote = false;
    }

    // 5. 병합 메타데이터 업데이트
    markAsModified(configStore);

    // 서버 타임스탬프가 로컬 시계보다 앞서 있으면(시계 편차) 그보다 크게 올려
    // 재업로드가 다시 stale(409)로 거부되는 것을 방지한다
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
 * 동기화 기능 활성화/비활성화
 * @param {boolean} enabled - 활성화 여부
 */
function setEnabled(enabled) {
  state.enabled = enabled;
  // 활성화 상태가 바뀌면 canSync 캐시가 오래되므로 무효화 (로그인 직후 stale false 방지)
  clearCloudSyncCache();
  logger.info(`Cloud synchronization ${enabled ? 'enabled' : 'disabled'}`);

  // Config Store와 동기화 (CloudSyncManager가 단일 진실 원천)
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
 * 설정 변경에 대한 이벤트 리스너 등록 (개선된 버전)
 */
function setupConfigListeners() {
  // 설정 변경 감지 함수 (공통 로직)
  async function handleConfigChange(changeType, _key) {
    logger.info(`=== [DEBUG_TEST] ${changeType} change detected ===`);

    // 원격 데이터를 적용하는 중이면 무시 (다운로드→업로드 피드백 루프 방지)
    if (state.applyingRemote) {
      logger.info('Ignoring config change while applying remote data');
      return;
    }

    // 동기화 가능 여부 확인
    if (!state.enabled) {
      logger.info('Sync disabled - state.enabled is false');
      return;
    }

    if (!(await canSync())) {
      logger.info('Cannot sync - canSync() returned false');
      return;
    }

    logger.info(`${changeType} settings change confirmed (onDidChange event fired), proceeding with sync`);
    
    // onDidChange 이벤트가 발생했다는 것은 값이 실제로 변경되었다는 증거
    // hasUnsyncedChanges 체크를 건너뛰고 바로 동기화 진행

    // 변경사항을 ConfigStore 메타데이터에 반영
    markAsModified(configStore);

    // 동기화 예약
    scheduleSync(changeType);
  }

  // 페이지 설정 변경 감지
  logger.info('Registering onDidChange listener for pages...');
  configStore.onDidChange('pages', async (newValue, oldValue) => {
    logger.info('🎯 onDidChange event fired for pages!');
    logger.info('Event triggered at:', new Date().toISOString());
    logger.info('NewValue length:', Array.isArray(newValue) ? newValue.length : 'Not array');
    logger.info('OldValue length:', Array.isArray(oldValue) ? oldValue.length : 'Not array');
    
    // 변경 유형 자세히 감지
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

  // 외관 설정 변경 감지
  configStore.onDidChange('appearance', async () => {
    await handleConfigChange('appearance', 'appearance');
  });

  // 고급 설정 변경 감지
  configStore.onDidChange('advanced', async () => {
    await handleConfigChange('advanced', 'advanced');
  });

  // _sync 메타데이터 변경은 무시 (무한 루프 방지)
  configStore.onDidChange('_sync', () => {
    logger.debug('Sync metadata updated - not triggering sync');
  });

  logger.info('Config change listeners registered with improved logic');
}

/**
 * 클라우드 동기화 초기화
 * @param {Object} authManagerInstance - 인증 관리자 인스턴스
 * @param {Object} _userDataManagerInstance - 사용자 데이터 관리자 인스턴스 (호환성 유지)
 * @param {Object} configStoreInstance - 설정 저장소 인스턴스 (선택적)
 * @returns {Object} 동기화 관리자 객체
 */
function initCloudSync(authManagerInstance, _userDataManagerInstance, configStoreInstance = null) {
  // 재초기화 가드: 리스너/타이머 중복 등록을 막고 기존 매니저를 재사용
  if (syncManagerInstance) {
    logger.info('Cloud sync already initialized - reusing existing manager');
    if (authManagerInstance) {
      setAuthManager(authManagerInstance);
    }
    return syncManagerInstance;
  }

  logger.info('Starting cloud synchronization initialization');

  // 인증 관리자 참조 설정
  setAuthManager(authManagerInstance);

  // 설정 저장소 설정 (외부에서 전달받은 인스턴스 사용 또는 새로 생성)
  if (configStoreInstance) {
    configStore = configStoreInstance;
    logger.info('Using provided config store instance - ID:', configStore.path || 'unknown');
  }
  else {
    configStore = createConfigStore();
    logger.info('Created new config store instance - ID:', configStore.path || 'unknown');
  }

  // 장치 정보 초기화
  state.deviceId = getDeviceId();
  logger.info(`Device ID: ${state.deviceId}`);

  // 동기화 상태 초기화 (Config Store에서 읽어오거나 기본값 사용)
  const savedEnabled = configStore.get('cloudSync.enabled');
  state.enabled = savedEnabled !== undefined ? savedEnabled : true;
  logger.info(`Cloud sync initialized: ${state.enabled ? 'enabled' : 'disabled'} (from ${savedEnabled !== undefined ? 'config' : 'default'})`);

  // 설정 변경 감지 이벤트 등록
  setupConfigListeners();

  // 주기적 동기화 조건부 시작
  if (state.enabled) {
    logger.info('Starting periodic sync (enabled)');
    startPeriodicSync();
  }
  else {
    logger.info('Periodic sync not started (disabled)');
  }

  // 인터페이스 객체 생성
  const syncManager = {
    // 기본 인터페이스
    unsubscribe: () => {
      // 타이머 중지
      stopPeriodicSync();

      // 디바운스 타이머 취소
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

      // 로그인 후 다운로드 우선
      const result = await downloadSettings();

      // 다운로드 성공 후 추가 UI 업데이트
      if (result.success) {
        // settings-window에 현재 설정 전달하여 UI 업데이트
        if (authManager && typeof authManager.notifySettingsSynced === 'function') {
          // 현재 설정 데이터 수집
          const configData = {
            pages: configStore.get('pages'),
            appearance: configStore.get('appearance'),
            advanced: configStore.get('advanced'),
            subscription: configStore.get('subscription'),
          };

          // UI에 알림 전송 - 토스트 창의 버튼/페이지 업데이트 위함
          authManager.notifySettingsSynced(configData);
          logger.info('Login sync: UI update notification sent for current settings');
        }
      }

      // 동기화 활성화
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

    // 추가 인터페이스
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
 * 초기화된 동기화 매니저 반환 (initCloudSync 이후 사용 가능)
 * @returns {Object|null} 동기화 매니저 또는 null
 */
function getSyncManager() {
  return syncManagerInstance;
}

/**
 * 인증 관리자 참조 설정
 * @param {Object} manager - 인증 관리자 인스턴스
 */
function setAuthManager(manager) {
  authManager = manager;
  clearCloudSyncCache(); // Clear cache when auth manager changes
  logger.info('Authentication manager reference setup complete');
}

/**
 * 클라우드 동기화 설정 업데이트 (이전 버전과의 호환성 유지)
 * @param {boolean} enabled - 활성화 여부
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
};
