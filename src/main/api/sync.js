/**
 * Toast API - 설정 동기화 API 모듈
 *
 * Toast-App의 설정(페이지와 버튼 정보 등)을 Toast-Web 서버와 동기화합니다.
 */

const os = require('os');
const {
  ENDPOINTS,
  createApiClient,
  getAuthHeaders,
  authenticatedRequest
} = require('./client');

// 동기화 상태 관리
let lastSyncTime = 0;
let isSyncing = false;
let lastSyncStatus = {
  success: false,
  timestamp: 0,
  error: null
};

/**
 * 클라우드 동기화 가능 여부 확인
 * @param {Object} params - 동기화 가능 여부 파라미터
 * @param {Function} params.hasValidToken - 유효한 토큰 확인 함수
 * @param {Object} params.configStore - 설정 저장소
 * @returns {Promise<boolean>} 동기화 가능 여부
 */
async function isCloudSyncEnabled({ hasValidToken, configStore }) {
  try {
    // 인증 여부 확인
    const isAuthenticated = await hasValidToken();
    if (!isAuthenticated) {
      console.log('유효한 인증 토큰이 없습니다. 로그인이 필요합니다.');
      return false;
    }

    // 구독 정보 확인
    const subscription = configStore.get('subscription') || {};
    console.log('현재 구독 정보:', JSON.stringify(subscription));

    // cloud_sync 기능이 활성화되어 있는지 직접 확인
    let hasSyncFeature = false;

    // features 객체가 있는지 확인
    if (subscription.features && typeof subscription.features === 'object') {
      hasSyncFeature = subscription.features.cloud_sync === true;
    }
    // features_array 배열에서 확인 (대체 방법)
    else if (Array.isArray(subscription.features_array)) {
      hasSyncFeature = subscription.features_array.includes('cloud_sync');
    }
    // 구독자는 기본적으로 cloud_sync 가능
    else if (subscription.isSubscribed === true || subscription.active === true || subscription.is_subscribed === true) {
      hasSyncFeature = true;
    }

    console.log('클라우드 동기화 기능 활성화 여부:', hasSyncFeature);
    return hasSyncFeature;
  } catch (error) {
    console.error('동기화 가능 여부 확인 오류:', error);
    return false;
  }
}

/**
 * 현재 설정을 서버에 업로드
 * @param {Object} params - 업로드 파라미터
 * @param {Function} params.hasValidToken - 유효한 토큰 확인 함수
 * @param {Function} params.onUnauthorized - 인증 실패 시 호출할 콜백 함수
 * @param {Object} params.configStore - 설정 저장소
 * @returns {Promise<Object>} 업로드 결과
 */
async function uploadSettings({ hasValidToken, onUnauthorized, configStore }) {
  console.log('설정 업로드 시작...');

  // 동기화 가능 여부 다시 확인
  const canSync = await isCloudSyncEnabled({ hasValidToken, configStore });
  if (!canSync) {
    console.log('클라우드 동기화 불가: 동기화 기능이 비활성화되었거나 구독이 없음');
    return { success: false, error: 'Cloud sync not enabled' };
  }

  // 이미 동기화 중이면 스킵
  if (isSyncing) {
    console.log('이미 동기화 중, 요청 스킵됨');
    return { success: false, error: 'Already syncing' };
  }

  isSyncing = true;
  console.log('동기화 잠금 설정됨');

  try {
    // 페이지 설정 가져오기
    const pages = configStore.get('pages') || [];
    const deviceInfo = getDeviceInfo();

    // 서버에 설정 업로드
    console.log(`서버에 ${pages.length}개 페이지 설정 업로드 중...`);

    return await authenticatedRequest(async () => {
      const headers = getAuthHeaders();
      const apiClient = createApiClient();

      const response = await apiClient.put(ENDPOINTS.SETTINGS, {
        pages,
        lastSyncedDevice: deviceInfo,
        lastSyncedAt: Date.now()
      }, { headers });

      // 동기화 완료 시간 기록
      lastSyncTime = Date.now();
      lastSyncStatus = {
        success: true,
        timestamp: lastSyncTime,
        error: null
      };

      console.log('페이지 설정 업로드 성공:', response.data);
      return { success: true, data: response.data };
    }, { onUnauthorized });
  } catch (error) {
    console.error('페이지 설정 업로드 오류:', error);

    lastSyncStatus = {
      success: false,
      timestamp: Date.now(),
      error: error.message || '알 수 없는 오류'
    };

    return {
      success: false,
      error: error.message || '알 수 없는 오류'
    };
  } finally {
    isSyncing = false;
  }
}

/**
 * 서버에서 설정 다운로드
 * @param {Object} params - 다운로드 파라미터
 * @param {Function} params.hasValidToken - 유효한 토큰 확인 함수
 * @param {Function} params.onUnauthorized - 인증 실패 시 호출할 콜백 함수
 * @param {Object} params.configStore - 설정 저장소
 * @returns {Promise<Object>} 다운로드 결과
 */
async function downloadSettings({ hasValidToken, onUnauthorized, configStore }) {
  console.log('설정 다운로드 시작...');

  // 동기화 가능 여부 다시 확인
  const canSync = await isCloudSyncEnabled({ hasValidToken, configStore });
  if (!canSync) {
    console.log('클라우드 동기화 불가: 동기화 기능이 비활성화되었거나 구독이 없음');
    return { success: false, error: 'Cloud sync not enabled' };
  }

  // 이미 동기화 중이면 스킵
  if (isSyncing) {
    console.log('이미 동기화 중, 다운로드 스킵됨');
    return { success: false, error: 'Already syncing' };
  }

  isSyncing = true;
  console.log('동기화 잠금 설정됨 (다운로드)');

  try {
    return await authenticatedRequest(async () => {
      const headers = getAuthHeaders();
      console.log('서버에서 설정 다운로드 중...');

      const apiClient = createApiClient();
      const response = await apiClient.get(ENDPOINTS.SETTINGS, { headers });

      const settings = response.data;

      // 유효성 검사
      if (!settings || !settings.data || !Array.isArray(settings.data.pages)) {
        throw new Error('유효하지 않은 설정 데이터');
      }

      // 서버에서 받은 페이지 설정을 로컬에 적용
      lastSyncTime = Date.now();
      configStore.set('pages', settings.data.pages);

      lastSyncStatus = {
        success: true,
        timestamp: lastSyncTime,
        error: null
      };

      console.log('설정 다운로드 성공:', settings);
      return { success: true, data: settings };
    }, { onUnauthorized });
  } catch (error) {
    console.error('설정 다운로드 오류:', error);

    lastSyncStatus = {
      success: false,
      timestamp: Date.now(),
      error: error.message || '알 수 없은 오류'
    };

    return {
      success: false,
      error: error.message || '알 수 없는 오류'
    };
  } finally {
    isSyncing = false;
  }
}

/**
 * 동기화 충돌 해결 (기본 전략: 서버 데이터 우선)
 * @param {Object} params - 충돌 해결 파라미터
 * @param {Function} params.hasValidToken - 유효한 토큰 확인 함수
 * @param {Function} params.onUnauthorized - 인증 실패 시 호출할 콜백 함수
 * @param {Object} params.configStore - 설정 저장소
 * @returns {Promise<Object>} 해결 결과
 */
async function resolveSync({ hasValidToken, onUnauthorized, configStore }) {
  // 기본 전략: 서버 데이터 우선
  return downloadSettings({ hasValidToken, onUnauthorized, configStore });
}

/**
 * 수동 동기화 수행
 * @param {Object} params - 수동 동기화 파라미터
 * @param {string} params.action - 동기화 액션 ('upload', 'download', 'resolve')
 * @param {Function} params.hasValidToken - 유효한 토큰 확인 함수
 * @param {Function} params.onUnauthorized - 인증 실패 시 호출할 콜백 함수
 * @param {Object} params.configStore - 설정 저장소
 * @returns {Promise<Object>} 동기화 결과
 */
async function manualSync({ action = 'resolve', hasValidToken, onUnauthorized, configStore }) {
  console.log(`수동 동기화 요청: ${action}`);

  if (action === 'upload') {
    return await uploadSettings({ hasValidToken, onUnauthorized, configStore });
  } else if (action === 'download') {
    return await downloadSettings({ hasValidToken, onUnauthorized, configStore });
  } else {
    // 'resolve' - 가장 최신 데이터 사용 (기본 동작)
    return await resolveSync({ hasValidToken, onUnauthorized, configStore });
  }
}

/**
 * 로그인 후 동기화 수행
 * @param {Object} params - 로그인 후 동기화 파라미터
 * @param {Function} params.hasValidToken - 유효한 토큰 확인 함수
 * @param {Function} params.onUnauthorized - 인증 실패 시 호출할 콜백 함수
 * @param {Object} params.configStore - 설정 저장소
 * @returns {Promise<Object>} 동기화 결과
 */
async function syncAfterLogin({ hasValidToken, onUnauthorized, configStore }) {
  console.log('로그인 후 클라우드 동기화 수행 중...');
  // 로그인 후에는 기본적으로 다운로드 우선 (서버 데이터 우선)
  return await downloadSettings({ hasValidToken, onUnauthorized, configStore });
}

/**
 * 마지막 동기화 상태 가져오기
 * @returns {Object} 마지막 동기화 상태
 */
function getLastSyncStatus() {
  return { ...lastSyncStatus };
}

/**
 * 현재 장치 정보 가져오기
 * @returns {string} 장치 정보 문자열
 */
function getDeviceInfo() {
  const platform = process.platform;
  const hostname = os.hostname();
  const username = os.userInfo().username;

  return `${platform}-${hostname}-${username}`;
}

module.exports = {
  isCloudSyncEnabled,
  uploadSettings,
  downloadSettings,
  manualSync,
  syncAfterLogin,
  getLastSyncStatus
};
