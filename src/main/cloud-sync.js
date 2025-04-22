/**
 * Toast - Cloud Synchronization Module
 *
 * 이 모듈은 Toast-App의 설정(페이지와 버튼 정보 등)을 Toast-Web 서버와 동기화합니다.
 * 동기화 시점:
 * 1. 로그인 성공 시 (서버에서 다운로드)
 * 2. 설정 변경 시 (로컬 저장 후 서버 업로드)
 * 3. 주기적 동기화 (15분 간격)
 * 4. 앱 시작 시 (이미 로그인된 상태인 경우)
 * 5. 네트워크 복구 시
 * 6. 수동 동기화 요청 시
 */

const { app } = require('electron');
const os = require('os');
const { sync: apiSync } = require('./api');
const { createConfigStore } = require('./config');

// 동기화 관련 상수
const SYNC_INTERVAL_MS = 15 * 60 * 1000; // 15분마다 자동 동기화
const SYNC_DEBOUNCE_MS = 2000; // 마지막 변경 후 2초 후에 동기화
const NETWORK_CHECK_INTERVAL_MS = 60 * 1000; // 1분마다 네트워크 상태 확인
const MAX_RETRY_COUNT = 3; // 최대 재시도 횟수
const RETRY_DELAY_MS = 5000; // 재시도 간격 (5초)

// 동기화 모듈 상태
const state = {
  enabled: true,
  isOnline: true,
  isSyncing: false,
  lastSyncTime: 0,
  lastChangeType: null,
  pendingSync: false,
  retryCount: 0,
  deviceId: null,
  timers: {
    sync: null,
    debounce: null,
    network: null
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
 * 온라인 상태인지 확인
 * @returns {boolean} 온라인 상태 여부
 */
function isOnline() {
  try {
    // DNS 조회 테스트
    const dns = require('dns');
    dns.lookupSync('google.com');
    return true;
  } catch (error) {
    try {
      // 네트워크 연결 테스트
      const { execSync } = require('child_process');
      const pingCmd = process.platform === 'win32'
        ? 'ping -n 1 -w 1000 8.8.8.8'
        : 'ping -c 1 -W 1 8.8.8.8';

      execSync(pingCmd, { stdio: 'ignore' });
      return true;
    } catch (err) {
      return false;
    }
  }
}

/**
 * 동기화가 가능한지 확인
 * @returns {Promise<boolean>} 동기화 가능 여부
 */
async function canSync() {
  if (!state.enabled || !state.isOnline || !authManager) {
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
 * 네트워크 상태 모니터링 시작
 */
function startNetworkMonitoring() {
  stopNetworkMonitoring();

  // 첫 실행 즉시 체크
  checkNetworkStatus(true);

  // 주기적으로 네트워크 상태 확인
  state.timers.network = setInterval(() => {
    checkNetworkStatus(false);
  }, NETWORK_CHECK_INTERVAL_MS);

  console.log('네트워크 상태 모니터링 시작');
}

/**
 * 네트워크 상태 모니터링 중지
 */
function stopNetworkMonitoring() {
  if (state.timers.network) {
    clearInterval(state.timers.network);
    state.timers.network = null;
    console.log('네트워크 상태 모니터링 중지');
  }
}

/**
 * 네트워크 상태 확인 및 변경 처리
 * @param {boolean} forceSync - 강제 동기화 여부
 */
async function checkNetworkStatus(forceSync = false) {
  const online = isOnline();
  const previousState = state.isOnline;

  // 상태가 변경된 경우에만 처리
  if (online !== previousState) {
    console.log(`네트워크 상태 변경: ${previousState ? '온라인' : '오프라인'} → ${online ? '온라인' : '오프라인'}`);

    // 오프라인→온라인 전환 시 동기화 실행
    if (online && !previousState) {
      console.log('네트워크 복구 감지: 동기화 시작');
      await downloadSettings();
    }

    state.isOnline = online;
  }

  // 강제 동기화가 요청되고 온라인 상태인 경우
  if (forceSync && online && state.pendingSync) {
    console.log('보류 중이던 동기화 작업 실행');
    state.pendingSync = false;
    await uploadSettings();
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

  console.log(`${changeType} 변경 감지, ${SYNC_DEBOUNCE_MS/1000}초 후 동기화 예약됨`);
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

      // 오프라인 상태에서 동기화 실패 처리
      if (result.error === 'Offline') {
        console.log('오프라인 상태에서 동기화 실패, 다음 네트워크 복구 시 동기화 예약');
        state.pendingSync = true;
      } else {
        console.log(`동기화 실패 원인: ${result.error}`);
      }

      if (state.retryCount <= MAX_RETRY_COUNT) {
        console.log(`업로드 실패, ${state.retryCount}/${MAX_RETRY_COUNT}번째 재시도 ${RETRY_DELAY_MS/1000}초 후 시작`);

        // 재시도 예약
        setTimeout(() => {
          uploadSettingsWithRetry();
        }, RETRY_DELAY_MS);
      } else {
        console.error(`최대 재시도 횟수(${MAX_RETRY_COUNT}) 초과, 업로드 실패: ${result.error}`);
        state.retryCount = 0;

        // 네트워크 문제인 경우 보류 상태 유지
        if (result.error === 'Offline') {
          state.pendingSync = true;
        }
      }
    }
  } catch (error) {
    console.error('설정 업로드 중 오류 발생:', error);
    state.retryCount++;

    if (state.retryCount <= MAX_RETRY_COUNT) {
      console.log(`예외로 인한 업로드 실패, ${state.retryCount}/${MAX_RETRY_COUNT}번째 재시도 ${RETRY_DELAY_MS/1000}초 후 시작`);

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

  if (!state.isOnline) {
    console.log('오프라인 상태: 설정 업로드 스킵');
    return { success: false, error: 'Offline' };
  }

  if (!await canSync()) {
    return { success: false, error: 'Cloud sync not enabled' };
  }

  try {
    // 사용자 설정 파일에서 데이터 가져오기
    const settings = await userDataManager.getUserSettings();
    if (!settings) {
      return { success: false, error: 'Settings not found' };
    }

    // 필요한 데이터 추출
    const pages = Array.isArray(settings.pages) ? settings.pages : [];

    if (pages.length === 0) {
      console.warn('업로드할 페이지 데이터가 없습니다');
    }

    // 타임스탬프 업데이트
    const timestamp = getCurrentTimestamp();

    // 업로드할 데이터 구성
    const uploadData = {
      pages,
      lastSyncedDevice: state.deviceId,
      lastSyncedAt: timestamp,
      appearance: configStore.get('appearance'),
      advanced: configStore.get('advanced')
    };

    console.log(`서버에 ${pages.length}개 페이지 설정 업로드 중`);

    // API 호출
    const result = await apiSync.uploadSettings({
      hasValidToken: authManager.hasValidToken,
      onUnauthorized: authManager.refreshAccessToken,
      configStore,
      directData: uploadData
    });

    // 성공 시 마지막 동기화 시간 업데이트
    if (result.success) {
      state.lastSyncTime = timestamp;

      // 설정 파일 업데이트
      const updatedSettings = {
        ...settings,
        lastSyncedAt: timestamp
      };

      userDataManager.updateSettings(updatedSettings);
      console.log('설정 업로드 성공 및 마지막 동기화 시간 업데이트 완료');
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

  if (!state.isOnline) {
    console.log('오프라인 상태: 설정 다운로드 스킵');
    return { success: false, error: 'Offline' };
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

    const result = await apiSync.downloadSettings({
      hasValidToken: authManager.hasValidToken,
      onUnauthorized: authManager.refreshAccessToken,
      configStore
    });

    if (result.success) {
      state.lastSyncTime = getCurrentTimestamp();

      // 사용자 설정 파일 업데이트
      try {
        const currentSettings = await userDataManager.getUserSettings();
        const timestamp = getCurrentTimestamp();

        if (currentSettings) {
          const updatedSettings = {
            ...currentSettings,
            lastSyncedAt: timestamp
          };

          userDataManager.updateSettings(updatedSettings);
          console.log('설정 다운로드 성공 및 마지막 동기화 시간 업데이트 완료');
        }
      } catch (error) {
        console.error('설정 파일 업데이트 오류:', error);
      }
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

  if (!await canSync()) {
    return { success: false, error: '클라우드 동기화가 비활성화 되었거나 구독이 없습니다' };
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

      // 2. 서버 설정 다운로드
      const serverResult = await apiSync.downloadSettings({
        hasValidToken: authManager.hasValidToken,
        onUnauthorized: authManager.refreshAccessToken,
        configStore
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
    startNetworkMonitoring();
  } else {
    stopPeriodicSync();
    stopNetworkMonitoring();
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

    // 사용자 설정 파일 업데이트
    try {
      const currentSettings = await userDataManager.getUserSettings();

      if (currentSettings) {
        const timestamp = getCurrentTimestamp();
        const updatedSettings = {
          ...currentSettings,
          pages: newValue,
          lastModifiedAt: timestamp,
          lastModifiedDevice: state.deviceId
        };

        userDataManager.updateSettings(updatedSettings);
        console.log('설정 파일에 페이지 데이터 업데이트 완료');
      }

      // 동기화 예약
      scheduleSync(changeType);
    } catch (error) {
      console.error('설정 파일 업데이트 오류:', error);
    }
  });

  // 외관 설정 변경 감지
  configStore.onDidChange('appearance', async (newValue, oldValue) => {
    if (!state.enabled || !await canSync()) {
      return;
    }

    console.log('외관 설정 변경 감지됨');

    // 사용자 설정 파일 업데이트
    try {
      const currentSettings = await userDataManager.getUserSettings();

      if (currentSettings) {
        const timestamp = getCurrentTimestamp();
        const updatedSettings = {
          ...currentSettings,
          appearance: newValue,
          lastModifiedAt: timestamp,
          lastModifiedDevice: state.deviceId
        };

        userDataManager.updateSettings(updatedSettings);
        console.log('설정 파일에 외관 설정 업데이트 완료');
      }

      // 동기화 예약
      scheduleSync('외관 설정 변경');
    } catch (error) {
      console.error('설정 파일 업데이트 오류:', error);
    }
  });

  // 고급 설정 변경 감지
  configStore.onDidChange('advanced', async (newValue, oldValue) => {
    if (!state.enabled || !await canSync()) {
      return;
    }

    console.log('고급 설정 변경 감지됨');

    // 사용자 설정 파일 업데이트
    try {
      const currentSettings = await userDataManager.getUserSettings();

      if (currentSettings) {
        const timestamp = getCurrentTimestamp();
        const updatedSettings = {
          ...currentSettings,
          advanced: newValue,
          lastModifiedAt: timestamp,
          lastModifiedDevice: state.deviceId
        };

        userDataManager.updateSettings(updatedSettings);
        console.log('설정 파일에 고급 설정 업데이트 완료');
      }

      // 동기화 예약
      scheduleSync('고급 설정 변경');
    } catch (error) {
      console.error('설정 파일 업데이트 오류:', error);
    }
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

  // 초기 네트워크 상태 감지
  state.isOnline = isOnline();
  console.log(`초기 네트워크 상태: ${state.isOnline ? '온라인' : '오프라인'}`);

  // 인터페이스 객체 생성
  const syncManager = {
    // 기본 인터페이스
    unsubscribe: () => {
      // 타이머 중지
      stopPeriodicSync();
      stopNetworkMonitoring();

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
      timestamp: state.lastSyncTime,
      isOnline: state.isOnline
    }),
    syncAfterLogin: async () => {
      console.log('로그인 후 클라우드 동기화 수행');

      // 로그인 후에는 다운로드 우선
      const result = await downloadSettings();

      // 동기화 활성화
      if (state.enabled) {
        startPeriodicSync();
        startNetworkMonitoring();
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
      online: state.isOnline,
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
