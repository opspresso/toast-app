/**
 * Toast - Cloud Synchronization Module
 *
 * 클라우드 동기화 시스템은 "단일 데이터 소스" 원칙을 따릅니다:
 * - ConfigStore를 단일 소스로 사용
 * - UserSettings 파일은 메타데이터만 저장
 * - 사용자 변경 → ConfigStore 저장 → 메타데이터 갱신 → API 업로드
 * - API 다운로드 → ConfigStore 직접 갱신 → 메타데이터 갱신
 */

const os = require('os');
const { createLogger } = require('./logger');
const { sync: apiSync } = require('./api');
const { createConfigStore } = require('./config');

// 모듈별 로거 생성
const logger = createLogger('CloudSync');

// 동기화 관련 상수
const SYNC_INTERVAL_MS = 15 * 60 * 1000; // 15분마다 자동 동기화
const SYNC_DEBOUNCE_MS = 2000; // 마지막 변경 후 2초 후에 동기화
const MAX_RETRY_COUNT = 3; // 최대 재시도 횟수
const RETRY_DELAY_MS = 5000; // 재시도 간격 (5초)

// 동기화 모듈 상태
const state = {
  enabled: true, // 동기화 활성화 여부
  isSyncing: false, // 현재 동기화 진행 중인지 여부
  lastSyncTime: 0, // 마지막 동기화 시간
  lastChangeType: null, // 마지막 변경 유형
  pendingSync: false, // 대기 중인 동기화가 있는지 여부
  retryCount: 0, // 현재 재시도 횟수
  deviceId: null, // 장치 식별자
  timers: {
    sync: null, // 주기적 동기화 타이머
    debounce: null, // 디바운스 타이머
  },
};

// 외부 모듈 참조
let configStore = null;
let authManager = null;
let userDataManager = null;

/**
 * 장치 식별자 생성
 * @returns {string} 장치 식별자
 */
function getDeviceIdentifier() {
  const platform = process.platform;
  const hostname = os.hostname();
  const username = os.userInfo().username;
  return `${platform}-${hostname}-${username}`;
}

/**
 * 현재 타임스탬프 가져오기
 * @returns {number} 현재 타임스탬프 (밀리초)
 */
function getCurrentTimestamp() {
  return Date.now();
}

/**
 * 동기화 가능 여부 확인
 * @returns {Promise<boolean>} 동기화 가능 여부
 */
async function canSync() {
  if (!state.enabled || !authManager) {
    logger.info('동기화가 비활성화되었거나 인증 관리자가 없어 동기화할 수 없습니다');
    return false;
  }

  try {
    return await apiSync.isCloudSyncEnabled({
      hasValidToken: authManager.hasValidToken,
      configStore,
    });
  } catch (error) {
    logger.error('동기화 가능 여부 확인 중 오류 발생:', error);
    return false;
  }
}

/**
 * 주기적 설정 동기화 시작
 */
function startPeriodicSync() {
  stopPeriodicSync();

  state.timers.sync = setInterval(async () => {
    if (await canSync()) {
      logger.info('주기적 설정 동기화 수행 중');
      await downloadSettings();
    }
  }, SYNC_INTERVAL_MS);

  logger.info(
    `주기적 동기화 시작됨 (${Math.floor(SYNC_INTERVAL_MS / 60000)}분 간격)`,
  );
}

/**
 * 주기적 설정 동기화 중지
 */
function stopPeriodicSync() {
  if (state.timers.sync) {
    clearInterval(state.timers.sync);
    state.timers.sync = null;
    logger.info('주기적 동기화 중지됨');
  }
}

/**
 * 설정 변경 시 동기화 예약
 * @param {string} changeType - 변경 유형 (예: '페이지 추가됨', '버튼 수정됨' 등)
 */
function scheduleSync(changeType) {
  state.lastChangeType = changeType;

  // 이전에 예약된 동기화 취소
  if (state.timers.debounce) {
    clearTimeout(state.timers.debounce);
  }

  // 새로운 동기화 예약
  state.timers.debounce = setTimeout(async () => {
    logger.info(`'${changeType}' 변경에 대한 설정 업로드 시작`);
    state.retryCount = 0; // 재시도 횟수 초기화
    await uploadSettingsWithRetry();
  }, SYNC_DEBOUNCE_MS);

  logger.info(
    `${changeType} 변경 감지됨, ${SYNC_DEBOUNCE_MS / 1000}초 후 동기화 예약됨`,
  );
}

/**
 * 재시도 로직이 포함된 설정 업로드
 */
async function uploadSettingsWithRetry() {
  if (state.isSyncing) {
    logger.info('이미 동기화 중, 요청 무시됨');
    return;
  }

  try {
    state.isSyncing = true;
    const result = await uploadSettings();

    if (result.success) {
      logger.info(`'${state.lastChangeType}' 변경에 대한 클라우드 동기화 성공`);
      state.retryCount = 0;
      state.pendingSync = false;
    } else {
      state.retryCount++;

      logger.info(`동기화 실패 이유: ${result.error}`);

      if (state.retryCount <= MAX_RETRY_COUNT) {
        logger.info(
          `업로드 실패, 재시도 ${state.retryCount}/${MAX_RETRY_COUNT} ${RETRY_DELAY_MS / 1000}초 후 예약됨`,
        );

        // 재시도 예약
        setTimeout(() => {
          uploadSettingsWithRetry();
        }, RETRY_DELAY_MS);
      } else {
        logger.error(
          `최대 재시도 횟수(${MAX_RETRY_COUNT})를 초과했습니다, 업로드 실패: ${result.error}`,
        );
        state.retryCount = 0;
      }
    }
  } catch (error) {
    logger.error('설정 업로드 중 오류 발생:', error);
    state.retryCount++;

    if (state.retryCount <= MAX_RETRY_COUNT) {
      logger.info(
        `예외로 인한 업로드 실패, 재시도 ${state.retryCount}/${MAX_RETRY_COUNT} ${RETRY_DELAY_MS / 1000}초 후 예약됨`,
      );

      // 재시도 예약
      setTimeout(() => {
        uploadSettingsWithRetry();
      }, RETRY_DELAY_MS);
    } else {
      logger.error(`최대 재시도 횟수(${MAX_RETRY_COUNT})를 초과했습니다, 업로드 중단됨`);
      state.retryCount = 0;
    }
  } finally {
    state.isSyncing = false;
  }
}

/**
 * 현재 설정을 서버에 업로드
 * @returns {Promise<Object>} 업로드 결과
 */
async function uploadSettings() {
  logger.info('설정 업로드 시작');

  // 동기화 상태 확인
  if (!state.enabled) {
    logger.info('클라우드 동기화가 비활성화되어 업로드를 건너뜁니다');
    return { success: false, error: 'Cloud sync disabled' };
  }

  // 동기화 가능 여부 확인
  if (!(await canSync())) {
    return { success: false, error: 'Cloud sync not enabled' };
  }

  if (state.isSyncing) {
    logger.info('이미 동기화 중, 업로드 건너뜀');
    return { success: false, error: 'Sync already in progress' };
  }

  try {
    state.isSyncing = true;

    // ConfigStore에서 직접 데이터 추출 (단일 소스)
    const advanced = configStore.get('advanced');
    const appearance = configStore.get('appearance');
    const pages = configStore.get('pages') || [];

    if (pages.length === 0) {
      logger.warn('업로드할 페이지 데이터가 없습니다');
    }

    // 타임스탬프 업데이트
    const timestamp = getCurrentTimestamp();

    // 업로드 데이터 준비 - 다양한 형식 지원을 위해 pages 배열 직접 노출
    const uploadData = {
      advanced,
      appearance,
      lastSyncedAt: timestamp,
      lastSyncedDevice: state.deviceId,
      pages,
    };

    logger.info(`${pages.length}개의 페이지가 포함된 설정을 서버에 업로드 중`);

    // API 호출
    const result = await apiSync.uploadSettings({
      hasValidToken: authManager.hasValidToken,
      onUnauthorized: authManager.refreshAccessToken,
      configStore,
      directData: uploadData,
    });

    // 성공 시 마지막 동기화 시간 업데이트
    if (result.success) {
      state.lastSyncTime = timestamp;

      // 동기화 메타데이터만 업데이트
      userDataManager.updateSyncMetadata({
        lastSyncedAt: timestamp,
        lastSyncedDevice: state.deviceId,
      });

      logger.info('설정 업로드 성공 및 동기화 메타데이터 업데이트됨');
    }

    return result;
  } catch (error) {
    logger.error('설정 업로드 오류:', error);
    return {
      success: false,
      error: error.message || '알 수 없는 오류',
    };
  } finally {
    state.isSyncing = false;
  }
}

/**
 * 서버에서 설정 다운로드
 * @returns {Promise<Object>} 다운로드 결과
 */
async function downloadSettings() {
  logger.info('설정 다운로드 시작');

  // 동기화 상태 확인
  if (!state.enabled) {
    logger.info('클라우드 동기화가 비활성화되어 다운로드를 건너뜁니다');
    return { success: false, error: 'Cloud sync disabled' };
  }

  // 동기화 가능 여부 확인
  if (!(await canSync())) {
    return { success: false, error: 'Cloud sync not enabled' };
  }

  if (state.isSyncing) {
    logger.info('이미 동기화 중, 다운로드 건너뜀');
    return { success: false, error: 'Sync already in progress' };
  }

  try {
    state.isSyncing = true;

    // 일관된 데이터 형식 유지를 위해 빈 객체 전달
    const result = await apiSync.downloadSettings({
      hasValidToken: authManager.hasValidToken,
      onUnauthorized: authManager.refreshAccessToken,
      configStore,
      directData: {}, // GET 요청에서는 무시됨
    });

    if (result.success) {
      // 서버에서 받은 메타데이터 활용
      let syncMetadata = {};

      if (result.syncMetadata) {
        logger.info('서버 응답에서 동기화 메타데이터 사용');
        syncMetadata = {
          lastSyncedAt: result.syncMetadata.lastSyncedAt || getCurrentTimestamp(),
          lastSyncedDevice: state.deviceId,
        };

        // 서버에 마지막 수정 정보가 있으면 그대로 사용
        if (result.syncMetadata.lastModifiedAt) {
          syncMetadata.lastModifiedAt = result.syncMetadata.lastModifiedAt;
          syncMetadata.lastModifiedDevice = result.syncMetadata.lastModifiedDevice || 'server';
        }
      } else {
        logger.info('서버 응답에 메타데이터가 없어 현재 타임스탬프 사용');
        // 서버 응답에 메타데이터가 없는 경우 현재 시간으로 설정
        const timestamp = getCurrentTimestamp();
        syncMetadata = {
          lastSyncedAt: timestamp,
          lastModifiedAt: timestamp,
          lastSyncedDevice: state.deviceId,
          lastModifiedDevice: state.deviceId,
        };
      }

      // 시간 정보 업데이트
      state.lastSyncTime = syncMetadata.lastSyncedAt;

      // 메타데이터 업데이트
      userDataManager.updateSyncMetadata(syncMetadata);

      logger.info('설정 다운로드 성공 및 동기화 메타데이터 업데이트됨:', syncMetadata);

      // 인증 관리자를 통해 UI 업데이트 알림 전송
      if (authManager && typeof authManager.notifySettingsSynced === 'function') {
        // 다운로드된 설정으로 UI 업데이트
        const configData = {
          pages: configStore.get('pages'),
          appearance: configStore.get('appearance'),
          advanced: configStore.get('advanced'),
          subscription: configStore.get('subscription'),
        };

        authManager.notifySettingsSynced(configData);
        logger.info('토스트 창에 UI 업데이트 알림 전송됨');
      }
    } else {
      logger.error('설정 다운로드 실패:', result.error);
    }

    return result;
  } catch (error) {
    logger.error('설정 다운로드 오류:', error);
    return {
      success: false,
      error: error.message || '알 수 없는 오류',
    };
  } finally {
    state.isSyncing = false;
  }
}

/**
 * 설정 충돌 해결 및 동기화
 * @param {string} action - 동기화 동작 ('upload', 'download', 'resolve')
 * @returns {Promise<Object>} 동기화 결과
 */
async function syncSettings(action = 'resolve') {
  logger.info(`수동 동기화 요청: ${action}`);

  try {
    if (action === 'upload') {
      return await uploadSettings();
    } else if (action === 'download') {
      return await downloadSettings();
    } else {
      // 충돌 해결 (타임스탬프 기반)

      // 1. 현재 로컬 설정 가져오기
      const localSettings = await userDataManager.getUserSettings();

      // 2. 서버 설정 다운로드
      const serverResult = await apiSync.downloadSettings({
        hasValidToken: authManager.hasValidToken,
        onUnauthorized: authManager.refreshAccessToken,
        configStore,
        directData: {}, // GET 요청에서는 무시됨
      });

      if (!serverResult.success) {
        logger.error('서버 설정 다운로드 실패:', serverResult.error);
        return serverResult;
      }

      // 3. 설정 병합
      const serverSettings = serverResult.data;
      const mergedSettings = mergeSettings(localSettings, serverSettings);

      // 4. 병합된 설정 저장
      userDataManager.updateSettings(mergedSettings);

      // 5. 필요한 경우 병합된 설정 업로드
      if (localSettings && localSettings.lastModifiedAt > (serverSettings?.lastModifiedAt || 0)) {
        logger.info('Local settings are more recent. Uploading merged settings to the server.');
        await uploadSettings();
      }

      return { success: true, message: 'Settings synchronization completed' };
    }
  } catch (error) {
    logger.error('수동 동기화 오류:', error);
    return {
      success: false,
      error: error.message || '알 수 없는 오류',
    };
  }
}

/**
 * 충돌 해결 및 설정 병합
 * @param {Object} localSettings - 로컬 설정
 * @param {Object} serverSettings - 서버 설정
 * @returns {Object} 병합된 설정
 */
function mergeSettings(localSettings, serverSettings) {
  if (!localSettings) return serverSettings;
  if (!serverSettings) return localSettings;

  // 타임스탬프 기반 충돌 해결
  const localTime = localSettings.lastModifiedAt || 0;
  const serverTime = serverSettings.lastModifiedAt || 0;

  logger.info(
    `설정 병합: 로컬(${new Date(localTime).toISOString()}) 대 서버(${new Date(serverTime).toISOString()})`,
  );

  // 서버 설정이 더 최신인 경우
  if (serverTime > localTime) {
    logger.info('Server settings are more recent. Applying server settings with priority.');
    return {
      ...localSettings,
      ...serverSettings,
      lastSyncedAt: getCurrentTimestamp(),
    };
  }

  // 로컬 설정이 더 최신인 경우
  logger.info('Local settings are more recent. Applying local settings with priority.');
  return {
    ...serverSettings,
    ...localSettings,
    lastSyncedAt: getCurrentTimestamp(),
  };
}

/**
 * 동기화 기능 활성화/비활성화
 * @param {boolean} enabled - 활성화 여부
 */
function setEnabled(enabled) {
  state.enabled = enabled;
  logger.info(`클라우드 동기화 ${enabled ? '활성화됨' : '비활성화됨'}`);

  if (enabled) {
    startPeriodicSync();
  } else {
    stopPeriodicSync();
  }
}

/**
 * 설정 변경에 대한 이벤트 리스너 등록
 */
function setupConfigListeners() {
  // 페이지 설정 변경 감지
  configStore.onDidChange('pages', async (newValue, oldValue) => {
    // 동기화가 비활성화되었거나 로그인하지 않은 경우 동기화 건너뛰기
    if (!state.enabled || !(await canSync())) {
      return;
    }

    // 변경 유형 감지
    let changeType = 'unknown_change';

    if (Array.isArray(newValue) && Array.isArray(oldValue)) {
      if (newValue.length > oldValue.length) {
        changeType = 'page_added';
      } else if (newValue.length < oldValue.length) {
        changeType = 'page_deleted';
      } else {
        changeType = 'button_modified';
      }
    }

    logger.info(`페이지 설정 변경 감지됨 (${changeType})`);

    // 메타데이터만 업데이트
    const timestamp = getCurrentTimestamp();
    userDataManager.updateSyncMetadata({
      lastModifiedAt: timestamp,
      lastModifiedDevice: state.deviceId,
    });

    logger.info('설정 파일 메타데이터 업데이트 완료');

    // 동기화 예약
    scheduleSync(changeType);
  });

  // 외관 설정 변경 감지
  configStore.onDidChange('appearance', async (newValue, oldValue) => {
    if (!state.enabled || !(await canSync())) {
      return;
    }

    logger.info('외관 설정 변경 감지됨');

    // 메타데이터만 업데이트
    const timestamp = getCurrentTimestamp();
    userDataManager.updateSyncMetadata({
      lastModifiedAt: timestamp,
      lastModifiedDevice: state.deviceId,
    });

    logger.info('설정 파일 메타데이터 업데이트 완료');

    // 동기화 예약
    scheduleSync('appearance_changed');
  });

  // 고급 설정 변경 감지
  configStore.onDidChange('advanced', async (newValue, oldValue) => {
    if (!state.enabled || !(await canSync())) {
      return;
    }

    logger.info('고급 설정 변경 감지됨');

    // 메타데이터만 업데이트
    const timestamp = getCurrentTimestamp();
    userDataManager.updateSyncMetadata({
      lastModifiedAt: timestamp,
      lastModifiedDevice: state.deviceId,
    });

    logger.info('설정 파일 메타데이터 업데이트 완료');

    // 동기화 예약
    scheduleSync('advanced_settings_changed');
  });
}

/**
 * 클라우드 동기화 초기화
 * @returns {Object} 동기화 관리자 객체
 */
function initCloudSync(authManagerInstance, userDataManagerInstance) {
  logger.info('클라우드 동기화 초기화 시작');

  // 인증 관리자 참조 설정
  setAuthManager(authManagerInstance);

  // 사용자 데이터 관리자 참조 설정
  setUserDataManager(userDataManagerInstance);

  // 설정 저장소 생성
  configStore = createConfigStore();

  // 장치 정보 초기화
  state.deviceId = getDeviceIdentifier();
  logger.info(`장치 ID: ${state.deviceId}`);

  // 설정 변경 감지 이벤트 등록
  setupConfigListeners();

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

      logger.info('클라우드 동기화 구독 해제됨');
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
      logger.info('로그인 후 클라우드 동기화 수행 중');

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
          logger.info('로그인 동기화: 현재 설정에 대한 UI 업데이트 알림 전송됨');
        }
      }

      // 동기화 활성화
      if (state.enabled) {
        startPeriodicSync();
      }

      return result;
    },
    manualSync: async (action = 'resolve') => {
      return await syncSettings(action);
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

  return syncManager;
}

/**
 * 인증 관리자 참조 설정
 * @param {Object} manager - 인증 관리자 인스턴스
 */
function setAuthManager(manager) {
  authManager = manager;
  logger.info('인증 관리자 참조 설정 완료');
}

/**
 * 사용자 데이터 관리자 참조 설정
 * @param {Object} manager - 사용자 데이터 관리자 인스턴스
 */
function setUserDataManager(manager) {
  userDataManager = manager;
  logger.info('사용자 데이터 관리자 참조 설정 완료');
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
  setAuthManager,
  setUserDataManager,
  startPeriodicSync,
  stopPeriodicSync,
  uploadSettings,
  downloadSettings,
  syncSettings,
  updateCloudSyncSettings,
};
