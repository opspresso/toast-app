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
const state = {
  lastSyncTime: 0,
  isSyncing: false,
  lastSyncStatus: {
    success: false,
    timestamp: 0,
    error: null
  }
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

    // cloud_sync 기능이 활성화되어 있는지 확인
    let hasSyncFeature = false;

    // 다양한 구독 정보 형식 지원
    if (subscription.isSubscribed === true ||
      subscription.active === true ||
      subscription.is_subscribed === true) {
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
 * @param {Object} [params.directData] - 서버에 직접 업로드할 데이터
 * @returns {Promise<Object>} 업로드 결과
 */
async function uploadSettings({ hasValidToken, onUnauthorized, configStore, directData }) {
  console.log('API 설정 업로드 시작...');

  // 이미 동기화 중이면 스킵
  if (state.isSyncing) {
    console.log('이미 동기화 중, 요청 스킵됨');
    return { success: false, error: 'Already syncing' };
  }

  state.isSyncing = true;

  try {
    // 유효한 데이터 확인
    if (!directData) {
      console.error('업로드할 유효한 데이터가 없습니다');
      throw new Error('Invalid data');
    }

    // API 요청
    return await authenticatedRequest(async () => {
      const headers = getAuthHeaders();
      const apiClient = createApiClient();

      console.log('서버에 요청 데이터 전송:', {
        endpoint: ENDPOINTS.SETTINGS,
        dataSize: JSON.stringify(directData).length,
        dataFields: Object.keys(directData),
      });

      const response = await apiClient.put(ENDPOINTS.SETTINGS, directData, { headers });

      // 동기화 완료 시간 기록
      state.lastSyncTime = Date.now();
      state.lastSyncStatus = {
        success: true,
        timestamp: state.lastSyncTime,
        error: null
      };

      console.log('설정 업로드 성공:', response.data);
      return { success: true, data: response.data };
    }, { onUnauthorized });
  } catch (error) {
    console.error('설정 업로드 오류:', error);

    state.lastSyncStatus = {
      success: false,
      timestamp: Date.now(),
      error: error.message || '알 수 없는 오류'
    };

    return {
      success: false,
      error: error.message || '알 수 없는 오류'
    };
  } finally {
    state.isSyncing = false;
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

  // 이미 동기화 중이면 스킵
  if (state.isSyncing) {
    console.log('이미 동기화 중, 다운로드 스킵됨');
    return { success: false, error: 'Already syncing' };
  }

  state.isSyncing = true;

  try {
    // API 요청
    return await authenticatedRequest(async () => {
      const headers = getAuthHeaders();
      console.log('서버에서 설정 다운로드 중...');

      const apiClient = createApiClient();
      const response = await apiClient.get(ENDPOINTS.SETTINGS, { headers });

      const settings = response.data;
      console.log('서버에서 받은 설정 데이터 구조:', Object.keys(settings));

      // 유효성 검사
      if (!settings) {
        throw new Error('유효하지 않은 설정 데이터: 응답이 비어있음');
      }

      // 다양한 데이터 구조 처리
      let pagesData = null;

      // settings.data.pages 형식
      if (settings.data && Array.isArray(settings.data.pages)) {
        console.log('데이터 구조: settings.data.pages');
        pagesData = settings.data.pages;
      }
      // settings.pages 형식
      else if (Array.isArray(settings.pages)) {
        console.log('데이터 구조: settings.pages');
        pagesData = settings.pages;
      }
      // settings 자체가 배열 형식
      else if (Array.isArray(settings)) {
        console.log('데이터 구조: settings 배열');
        pagesData = settings;
      }
      // 객체 배열 형태의 필드 찾기
      else {
        const arrayFields = Object.entries(settings)
          .filter(([key, value]) => Array.isArray(value))
          .map(([key, value]) => ({ key, value }));

        if (arrayFields.length > 0) {
          console.log(`데이터 구조: ${arrayFields[0].key} 배열`);
          pagesData = arrayFields[0].value;
        }
      }

      // 페이지 데이터를 찾지 못한 경우
      if (!pagesData) {
        console.error('페이지 데이터를 찾을 수 없음:', JSON.stringify(settings));
        throw new Error('유효하지 않은 설정 데이터: 페이지 정보 없음');
      }

      // 페이지 데이터 저장
      console.log(`서버에서 받은 페이지 ${pagesData.length}개:`,
        pagesData.map(p => ({ id: p.id, name: p.name })));

      configStore.set('pages', pagesData);

      // 외관 및 고급 설정도 존재하면 저장
      if (settings.appearance) {
        configStore.set('appearance', settings.appearance);
      }

      if (settings.advanced) {
        configStore.set('advanced', settings.advanced);
      }

      // 동기화 완료 시간 기록
      state.lastSyncTime = Date.now();
      state.lastSyncStatus = {
        success: true,
        timestamp: state.lastSyncTime,
        error: null
      };

      console.log('설정 다운로드 성공');
      return { success: true, data: settings };
    }, { onUnauthorized });
  } catch (error) {
    console.error('설정 다운로드 오류:', error);

    state.lastSyncStatus = {
      success: false,
      timestamp: Date.now(),
      error: error.message || '알 수 없는 오류'
    };

    return {
      success: false,
      error: error.message || '알 수 없는 오류'
    };
  } finally {
    state.isSyncing = false;
  }
}

/**
 * 마지막 동기화 상태 가져오기
 * @returns {Object} 마지막 동기화 상태
 */
function getLastSyncStatus() {
  return { ...state.lastSyncStatus };
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
  getLastSyncStatus
};
