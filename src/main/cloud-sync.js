/**
 * Toast - Cloud Synchronization Module
 *
 * 이 모듈은 Toast-App의 설정(페이지와 버튼 정보 등)을 Toast-Web 서버와 동기화합니다.
 * 동기화 시점:
 * 1. 로그인 성공 시 (서버에서 다운로드)
 * 2. 설정 변경 시 (로컬 저장 후 서버 업로드)
 * 3. 주기적 동기화 (15분 간격)
 * 4. 앱 시작 시 (이미 로그인된 상태인 경우)
 * 5. 수동 동기화 요청 시
 */

const { app } = require('electron');
const os = require('os');
const { sync: apiSync } = require('./api');
const { createConfigStore } = require('./config');

// 동기화 관련 상수
const SYNC_INTERVAL_MS = 15 * 60 * 1000; // 15분마다 자동 동기화
const SYNC_DEBOUNCE_MS = 2000; // 마지막 변경 후 2초 후에 동기화
const MAX_RETRY_COUNT = 3; // 최대 재시도 횟수
const RETRY_DELAY_MS = 5000; // 재시도 간격 (5초)

// 동기화 모듈 상태
const state = {
  enabled: true,
  isSyncing: false,
  lastSyncTime: 0,
  lastChangeType: null,
  pendingSync: false,
  retryCount: 0,
  deviceId: null,
  timers: {
    sync: null,
    debounce: null
  }
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
 * 현재 시간 타임스탬프 가져오기
 * @returns {number} 현재 시간 타임스탬프 (밀리초)
 */
function getCurrentTimestamp() {
  return Date.now();
}

/**
 * 동기화가 가능한지 확인
 * @returns {Promise<boolean>} 동기화 가능 여부
 */
async function canSync() {
  if (!state.enabled || !authManager) {
    return false;
  }

  try {
    return await apiSync.isCloudSyncEnabled({
      hasValidToken: authManager.hasValidToken,
      configStore
    });
  } catch (error) {
    console.error('동기화 가능 여부 확인 오류:', error);
    return false;
  }
}

/**
 * 주기적인 설정 동기화 시작
 */
function startPeriodicSync() {
  stopPeriodicSync();

  state.timers.sync = setInterval(async () => {
    if (await canSync()) {
      console.log('주기적 설정 동기화 수행');
      await downloadSettings();
    }
  }, SYNC_INTERVAL_MS);

  console.log(`주기적 동기화 시작 (${Math.floor(SYNC_INTERVAL_MS / 60000)}분 간격)`);
}

/**
 * 주기적인 설정 동기화 중지
 */
function stopPeriodicSync() {
  if (state.timers.sync) {
    clearInterval(state.timers.sync);
    state.timers.sync = null;
    console.log('주기적 동기화 중지');
  }
}

/**
 * 설정 변경 시 동기화 예약
 * @param {string} changeType - 변경 유형 (예: '페이지 추가', '버튼 수정' 등)
 */
function scheduleSync(changeType) {
  state.lastChangeType = changeType;

  // 이전 예약된 동기화 취소
  if (state.timers.debounce) {
    clearTimeout(state.timers.debounce);
  }

  // 새로운 동기화 예약
  state.timers.debounce = setTimeout(async () => {
    console.log(`변경 유형 '${changeType}'에 대한 설정 업로드 시작`);
    state.retryCount = 0; // 재시도 횟수 초기화
    await uploadSettingsWithRetry();
  }, SYNC_DEBOUNCE_MS);

  console.log(`${changeType} 변경 감지, ${SYNC_DEBOUNCE_MS / 1000}초 후 동기화 예약됨`);
}

/**
 * 설정을 서버에 업로드 (재시도 로직 포함)
 */
async function uploadSettingsWithRetry() {
  if (state.isSyncing) {
    console.log('이미 동기화 중, 요청 무시');
    return;
  }

  try {
    state.isSyncing = true;
    const result = await uploadSettings();

    if (result.success) {
      console.log(`'${state.lastChangeType}' 변경에 대한 클라우드 동기화 성공`);
      state.retryCount = 0;
      state.pendingSync = false;
    } else {
      state.retryCount++;

      console.log(`동기화 실패 원인: ${result.error}`);

      if (state.retryCount <= MAX_RETRY_COUNT) {
        console.log(`업로드 실패, ${state.retryCount}/${MAX_RETRY_COUNT}번째 재시도 ${RETRY_DELAY_MS / 1000}초 후 시작`);

        // 재시도 예약
        setTimeout(() => {
          uploadSettingsWithRetry();
        }, RETRY_DELAY_MS);
      } else {
        console.error(`최대 재시도 횟수(${MAX_RETRY_COUNT}) 초과, 업로드 실패: ${result.error}`);
        state.retryCount = 0;
      }
    }
  } catch (error) {
    console.error('설정 업로드 중 오류 발생:', error);
    state.retryCount++;

    if (state.retryCount <= MAX_RETRY_COUNT) {
      console.log(`예외로 인한 업로드 실패, ${state.retryCount}/${MAX_RETRY_COUNT}번째 재시도 ${RETRY_DELAY_MS / 1000}초 후 시작`);

      // 재시도 예약
      setTimeout(() => {
        uploadSettingsWithRetry();
      }, RETRY_DELAY_MS);
    } else {
      console.error(`최대 재시도 횟수(${MAX_RETRY_COUNT}) 초과, 업로드 중단`);
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
  console.log('설정 업로드 시작');

  if (!state.enabled) {
    console.log('클라우드 동기화 비활성화됨, 업로드 스킵');
    return { success: false, error: 'Cloud sync disabled' };
  }

  if (!await canSync()) {
    return { success: false, error: 'Cloud sync not enabled' };
  }

  try {
    // configStore에서 직접 데이터 추출
    const advanced = configStore.get('advanced');
    const appearance = configStore.get('appearance');
    const pages = configStore.get('pages') || [];

    if (pages.length === 0) {
      console.warn('업로드할 페이지 데이터가 없습니다');
    }

    // 타임스탬프 업데이트
    const timestamp = getCurrentTimestamp();

    // 업로드할 데이터 구성 - 두 가지 형식 모두 대응하기 위해 pages 배열 직접 노출
    const uploadData = {
      advanced,
      appearance,
      lastSyncedAt: timestamp,
      lastSyncedDevice: state.deviceId,
      pages,
    };

    console.log(`서버에 ${pages.length}개 페이지 설정 업로드 중`);

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
        lastSyncedDevice: state.deviceId
      });

      console.log('설정 업로드 성공 및 동기화 메타데이터 업데이트 완료');
    }

    return result;
  } catch (error) {
    console.error('설정 업로드 오류:', error);
    return {
      success: false,
      error: error.message || '알 수 없는 오류'
    };
  }
}

/**
 * 서버에서 설정 다운로드
 * @returns {Promise<Object>} 다운로드 결과
 */
async function downloadSettings() {
  console.log('설정 다운로드 시작');

  if (!state.enabled) {
    console.log('클라우드 동기화 비활성화됨, 다운로드 스킵');
    return { success: false, error: 'Cloud sync disabled' };
  }

  if (!await canSync()) {
    return { success: false, error: 'Cloud sync not enabled' };
  }

  if (state.isSyncing) {
    console.log('이미 동기화 중, 다운로드 스킵');
    return { success: false, error: 'Already syncing' };
  }

  try {
    state.isSyncing = true;

    // 데이터 형식을 일관되게 맞추기 위해 빈 객체 전달
    const result = await apiSync.downloadSettings({
      hasValidToken: authManager.hasValidToken,
      onUnauthorized: authManager.refreshAccessToken,
      configStore,
      directData: {} // 빈 객체를 전달해도 API에서는 GET 요청이므로 무시됨
    });

    if (result.success) {
      state.lastSyncTime = getCurrentTimestamp();

      // 동기화 메타데이터만 업데이트
      const timestamp = getCurrentTimestamp();
      userDataManager.updateSyncMetadata({
        lastSyncedAt: timestamp,
        lastModifiedAt: timestamp,
        lastModifiedDevice: state.deviceId
      });

      console.log('설정 다운로드 성공 및 동기화 메타데이터 업데이트 완료');
    }

    return result;
  } catch (error) {
    console.error('설정 다운로드 오류:', error);
    return {
      success: false,
      error: error.message || '알 수 없는 오류'
    };
  } finally {
    state.isSyncing = false;
  }
}

/**
 * 설정 충돌 해결 및 동기화
 * @param {string} action - 동기화 액션 ('upload', 'download', 'resolve')
 * @returns {Promise<Object>} 동기화 결과
 */
async function syncSettings(action = 'resolve') {
  console.log(`수동 동기화 요청: ${action}`);

  // 추가 디버깅 정보
  const syncCheckResult = await canSync();
  console.log('수동 동기화 canSync 결과:', syncCheckResult);

  if (!syncCheckResult) {
    const configStore = createConfigStore();
    const subscription = configStore.get('subscription') || {};
    console.log('수동 동기화 구독 정보 확인:', JSON.stringify(subscription));

    // 구독 정보에 따른 상세 오류 메시지
    let errorMessage = '클라우드 동기화가 비활성화 되었거나 구독이 없습니다';

    // 로그인 상태 확인
    const isAuthenticated = await authManager.hasValidToken();
    if (!isAuthenticated) {
      errorMessage = '로그인이 필요합니다';
    }
    // 구독 정보 확인 (sync.js에 추가한 것과 동일한 조건들을 확인)
    else {
      let hasSyncFeature = false;

      // 다양한 구독 정보 형식 검사
      if (subscription.features && typeof subscription.features === 'object') {
        hasSyncFeature = subscription.features.cloud_sync === true;
      } else if (Array.isArray(subscription.features_array)) {
        hasSyncFeature = subscription.features_array.includes('cloud_sync');
      } else if (subscription.isSubscribed === true ||
        subscription.active === true ||
        subscription.is_subscribed === true) {
        hasSyncFeature = true;
      }

      // additionalFeatures 확인 (설정 페이지에서 저장하는 형식)
      if (!hasSyncFeature && subscription.additionalFeatures &&
        typeof subscription.additionalFeatures === 'object') {
        hasSyncFeature = subscription.additionalFeatures.cloudSync === true;
      }

      // 구독 유형 확인 (최후의 수단)
      if (!hasSyncFeature && subscription.plan && (
        subscription.plan.toLowerCase().includes('premium') ||
        subscription.plan.toLowerCase().includes('pro')
      )) {
        hasSyncFeature = true;

        // 구독은 프리미엄인데 동기화 권한이 없는 경우 - 내부 오류일 가능성 높음
        errorMessage = '구독 정보가 올바르게, 반영되지 않았습니다. 앱을 재시작하거나 로그아웃 후 다시 로그인해 주세요.';
      }
    }

    return { success: false, error: errorMessage };
  }

  try {
    if (action === 'upload') {
      return await uploadSettings();
    } else if (action === 'download') {
      return await downloadSettings();
    } else {
      // 충돌 해결 (타임스탬프 기반)

      // 1. 현재 로컬 설정 가져오기
      const localSettings = await userDataManager.getUserSettings();

      // 2. 서버 설정 다운로드 - data 객체 형식으로 일관화
      const serverResult = await apiSync.downloadSettings({
        hasValidToken: authManager.hasValidToken,
        onUnauthorized: authManager.refreshAccessToken,
        configStore,
        directData: {} // 빈 객체를 전달해도 API에서는 GET 요청이므로 무시됨
      });

      if (!serverResult.success) {
        console.error('서버 설정 다운로드 실패:', serverResult.error);
        return serverResult;
      }

      // 3. 설정 병합
      const serverSettings = serverResult.data;
      const mergedSettings = mergeSettings(localSettings, serverSettings);

      // 4. 병합된 설정 저장
      userDataManager.updateSettings(mergedSettings);

      // 5. 필요시 병합된 설정 업로드
      if (localSettings && localSettings.lastModifiedAt > (serverSettings?.lastModifiedAt || 0)) {
        console.log('로컬 설정이 더 최신입니다. 병합된 설정을 서버에 업로드합니다.');
        await uploadSettings();
      }

      return { success: true, message: '설정 동기화 완료' };
    }
  } catch (error) {
    console.error('수동 동기화 오류:', error);
    return {
      success: false,
      error: error.message || '알 수 없는 오류'
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

  console.log(`설정 병합: 로컬(${new Date(localTime).toISOString()}) vs 서버(${new Date(serverTime).toISOString()})`);

  // 서버 설정이 더 최신인 경우
  if (serverTime > localTime) {
    console.log('서버 설정이 더 최신입니다. 서버 설정 우선 적용');
    return {
      ...localSettings,
      ...serverSettings,
      lastSyncedAt: getCurrentTimestamp()
    };
  }

  // 로컬 설정이 더 최신인 경우
  console.log('로컬 설정이 더 최신입니다. 로컬 설정 우선 적용');
  return {
    ...serverSettings,
    ...localSettings,
    lastSyncedAt: getCurrentTimestamp()
  };
}

/**
 * 동기화 기능 활성화/비활성화
 * @param {boolean} enabled - 활성화 여부
 */
function setEnabled(enabled) {
  state.enabled = enabled;
  console.log(`클라우드 동기화 ${enabled ? '활성화' : '비활성화'}`);

  if (enabled) {
    startPeriodicSync();
  } else {
    stopPeriodicSync();
  }
}

/**
 * 설정 변경 감지 이벤트 등록
 */
function setupConfigListeners() {
  // 페이지 설정 변경 감지
  configStore.onDidChange('pages', async (newValue, oldValue) => {
    // 동기화가 비활성화되었거나 로그인하지 않은 경우 동기화 스킵
    if (!state.enabled || !await canSync()) {
      return;
    }

    // 변경 유형 감지
    let changeType = '알 수 없는 변경';

    if (Array.isArray(newValue) && Array.isArray(oldValue)) {
      if (newValue.length > oldValue.length) {
        changeType = '페이지 추가';
      } else if (newValue.length < oldValue.length) {
        changeType = '페이지 삭제';
      } else {
        changeType = '버튼 수정';
      }
    }

    console.log(`페이지 설정 변경 감지됨 (${changeType})`);

    // 메타데이터만 업데이트
    const timestamp = getCurrentTimestamp();
    userDataManager.updateSyncMetadata({
      lastModifiedAt: timestamp,
      lastModifiedDevice: state.deviceId
    });

    console.log('설정 파일 메타데이터 업데이트 완료');

    // 동기화 예약
    scheduleSync(changeType);
  });

  // 외관 설정 변경 감지
  configStore.onDidChange('appearance', async (newValue, oldValue) => {
    if (!state.enabled || !await canSync()) {
      return;
    }

    console.log('외관 설정 변경 감지됨');

    // 메타데이터만 업데이트
    const timestamp = getCurrentTimestamp();
    userDataManager.updateSyncMetadata({
      lastModifiedAt: timestamp,
      lastModifiedDevice: state.deviceId
    });

    console.log('설정 파일 메타데이터 업데이트 완료');

    // 동기화 예약
    scheduleSync('외관 설정 변경');
  });

  // 고급 설정 변경 감지
  configStore.onDidChange('advanced', async (newValue, oldValue) => {
    if (!state.enabled || !await canSync()) {
      return;
    }

    console.log('고급 설정 변경 감지됨');

    // 메타데이터만 업데이트
    const timestamp = getCurrentTimestamp();
    userDataManager.updateSyncMetadata({
      lastModifiedAt: timestamp,
      lastModifiedDevice: state.deviceId
    });

    console.log('설정 파일 메타데이터 업데이트 완료');

    // 동기화 예약
    scheduleSync('고급 설정 변경');
  });
}

/**
 * 클라우드 동기화 초기화
 * @returns {Object} 동기화 관리자 객체
 */
function initCloudSync() {
  console.log('클라우드 동기화 초기화 시작');

  // 설정 스토어 생성
  configStore = createConfigStore();

  // 디바이스 정보 초기화
  state.deviceId = getDeviceIdentifier();
  console.log(`장치 ID: ${state.deviceId}`);

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

      console.log('클라우드 동기화 구독 해제됨');
    },
    enable: () => {
      setEnabled(true);
    },
    disable: () => {
      setEnabled(false);
    },
    getLastSyncStatus: () => ({
      success: state.lastSyncTime > 0,
      timestamp: state.lastSyncTime
    }),
    syncAfterLogin: async () => {
      console.log('로그인 후 클라우드 동기화 수행');

      // 로그인 후에는 다운로드 우선
      const result = await downloadSettings();

      // 동기화 활성화
      if (state.enabled) {
        startPeriodicSync();
      }

      return result;
    },
    manualSync: async (action = 'resolve') => {
      console.log(`수동 동기화 요청: ${action}`);
      return await syncSettings(action);
    },

    // 추가 인터페이스
    startPeriodicSync,
    stopPeriodicSync,
    getCurrentStatus: () => ({
      enabled: state.enabled,
      deviceId: state.deviceId,
      lastChangeType: state.lastChangeType,
      lastSyncTime: state.lastSyncTime
    })
  };

  return syncManager;
}

/**
 * 인증 관리자 참조 설정
 * @param {Object} manager - 인증 관리자 인스턴스
 */
function setAuthManager(manager) {
  authManager = manager;
  console.log('인증 관리자 참조 설정 완료');
}

/**
 * 사용자 데이터 관리자 참조 설정
 * @param {Object} manager - 사용자 데이터 관리자 인스턴스
 */
function setUserDataManager(manager) {
  userDataManager = manager;
  console.log('사용자 데이터 관리자 참조 설정 완료');
}

/**
 * 클라우드 동기화 설정 업데이트 (이전 버전과의 호환성 유지)
 * @param {boolean} enabled - 동기화 활성화 여부
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
  updateCloudSyncSettings
};
