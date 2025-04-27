/**
 * Toast API - 설정 동기화 API 모듈
 *
 * Toast-App 설정(페이지 및 버튼 정보 등)을 Toast-Web 서버와 동기화합니다.
 * 단일 데이터 소스 원칙을 따라 ConfigStore를 직접 업데이트합니다.
 */

const os = require('os');
const { createLogger } = require('../logger');
const { ENDPOINTS, createApiClient, getAuthHeaders, authenticatedRequest } = require('./client');

// 모듈별 로거 생성
const logger = createLogger('ApiSync');

// 동기화 상태 관리
const state = {
  lastSyncTime: 0,
  isSyncing: false,
  lastSyncStatus: {
    success: false,
    timestamp: 0,
    error: null,
  },
};

/**
 * 클라우드 동기화 가능 여부 확인
 * @param {Object} params - 동기화 가능 여부 매개변수
 * @param {Function} params.hasValidToken - 유효한 토큰 확인 함수
 * @param {Object} params.configStore - 설정 저장소
 * @returns {Promise<boolean>} 동기화 가능 여부
 */
async function isCloudSyncEnabled({ hasValidToken, configStore }) {
  try {
    // 함수 호출 로깅
    logger.info('isCloudSyncEnabled: 클라우드 동기화 가능 여부 확인 중');

    // 인증 상태 확인
    const isAuthenticated = await hasValidToken();
    if (!isAuthenticated) {
      logger.info('isCloudSyncEnabled: 인증 토큰 없음, 동기화 불가');
      return false;
    }

    logger.info('isCloudSyncEnabled: 유효한 인증 토큰 확인됨');

    // 구독 정보 확인
    const subscription = configStore.get('subscription') || {};
    logger.info('isCloudSyncEnabled: 구독 정보 확인:', JSON.stringify(subscription));

    // 구독 활성화 상태 확인 (다양한 형식 지원)
    let hasSyncFeature = false;

    // 1. 직접적인 구독 상태 확인
    if (
      subscription.isSubscribed === true ||
      subscription.active === true ||
      subscription.is_subscribed === true
    ) {
      hasSyncFeature = true;
      logger.info('isCloudSyncEnabled: 활성화된 구독 발견');
    }

    // 2. features 객체에서 cloud_sync 기능 확인
    if (
      subscription.features &&
      typeof subscription.features === 'object' &&
      subscription.features.cloud_sync === true
    ) {
      hasSyncFeature = true;
      logger.info('isCloudSyncEnabled: features 객체에서 cloud_sync=true 발견');
    }

    // 3. features_array에서 cloud_sync 기능 확인
    if (
      Array.isArray(subscription.features_array) &&
      subscription.features_array.includes('cloud_sync')
    ) {
      hasSyncFeature = true;
      logger.info('isCloudSyncEnabled: features_array에서 cloud_sync 발견');
    }

    // 4. additionalFeatures 객체 확인
    if (
      subscription.additionalFeatures &&
      typeof subscription.additionalFeatures === 'object' &&
      subscription.additionalFeatures.cloudSync === true
    ) {
      hasSyncFeature = true;
      logger.info('isCloudSyncEnabled: additionalFeatures에서 cloudSync=true 발견');
    }

    // 5. 계정이 구독자이면 기본적으로 동기화 기능 활성화
    if (
      subscription.plan &&
      (subscription.plan.toLowerCase().includes('premium') ||
        subscription.plan.toLowerCase().includes('pro'))
    ) {
      hasSyncFeature = true;
      logger.info('isCloudSyncEnabled: premium/pro 플랜 발견, 동기화 기능 활성화');
    }

    // 결과 반환
    logger.info(`isCloudSyncEnabled: 동기화 기능 ${hasSyncFeature ? '활성화됨' : '비활성화됨'}`);
    return hasSyncFeature;
  } catch (error) {
    logger.error('동기화 가능 여부 확인 중 오류 발생:', error);
    return false;
  }
}

/**
 * 현재 설정을 서버에 업로드
 * @param {Object} params - 업로드 매개변수
 * @param {Function} params.hasValidToken - 유효한 토큰 확인 함수
 * @param {Function} params.onUnauthorized - 인증 실패 시 콜백 함수
 * @param {Object} params.configStore - 설정 저장소
 * @param {Object} [params.directData] - 서버에 직접 업로드할 데이터
 * @returns {Promise<Object>} 업로드 결과
 */
async function uploadSettings({ hasValidToken, onUnauthorized, configStore, directData }) {
  // 이미 동기화 중이면 건너뜀
  if (state.isSyncing) {
    return { success: false, error: '이미 동기화 중' };
  }

  state.isSyncing = true;

  try {
    // 유효한 데이터 확인
    if (!directData) {
      throw new Error('유효하지 않은 데이터');
    }

    // API 요청
    return await authenticatedRequest(
      async () => {
        const headers = getAuthHeaders();
        const apiClient = createApiClient();

        const response = await apiClient.put(ENDPOINTS.SETTINGS, directData, { headers });

        // 동기화 완료 시간 기록
        state.lastSyncTime = Date.now();
        state.lastSyncStatus = {
          success: true,
          timestamp: state.lastSyncTime,
          error: null,
        };

        return { success: true, data: response.data };
      },
      { onUnauthorized },
    );
  } catch (error) {
    logger.error('설정 업로드 오류:', error);

    state.lastSyncStatus = {
      success: false,
      timestamp: Date.now(),
      error: error.message || '알 수 없는 오류',
    };

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
 * @param {Object} params - 다운로드 매개변수
 * @param {Function} params.hasValidToken - 유효한 토큰 확인 함수
 * @param {Function} params.onUnauthorized - 인증 실패 시 콜백 함수
 * @param {Object} params.configStore - 설정 저장소
 * @returns {Promise<Object>} 다운로드 결과
 */
async function downloadSettings({ hasValidToken, onUnauthorized, configStore }) {
  // 이미 동기화 중이면 건너뜀
  if (state.isSyncing) {
    return { success: false, error: '이미 동기화 중' };
  }

  state.isSyncing = true;

  try {
    // API 요청
    return await authenticatedRequest(
      async () => {
        const headers = getAuthHeaders();

        const apiClient = createApiClient();
        const response = await apiClient.get(ENDPOINTS.SETTINGS, { headers });

        const settings = response.data;

        // 상세 디버깅 로그
        logger.info(
          '클라우드 동기화 - 다운로드된 설정 구조:',
          Object.keys(settings || {}).length > 0
            ? `다음 키 포함: ${Object.keys(settings).join(', ')}`
            : '빈 응답 또는 유효하지 않은 응답',
        );

        // 유효성 검사
        if (!settings) {
          throw new Error('유효하지 않은 설정 데이터: 응답이 비어 있습니다');
        }

        // 표준화된 데이터 추출
        let pagesData = null;
        let appearanceData = null;
        let advancedData = null;
        let syncMetadata = {
          lastSyncedAt: Date.now(),
          lastSyncedDevice: getDeviceInfo(),
        };

        // 1. 서버 응답 데이터 구조 파싱
        // 1.1 표준 구조 확인 (최신 API 형식)
        if (settings.pages && Array.isArray(settings.pages)) {
          logger.info('표준 페이지 구조 발견');
          pagesData = settings.pages;
          appearanceData = settings.appearance || null;
          advancedData = settings.advanced || null;

          // 메타데이터 추출
          if (settings.lastSyncedAt) syncMetadata.lastSyncedAt = settings.lastSyncedAt;
          if (settings.lastModifiedAt) syncMetadata.lastModifiedAt = settings.lastModifiedAt;
          if (settings.lastSyncedDevice) syncMetadata.lastSyncedDevice = settings.lastSyncedDevice;
          if (settings.lastModifiedDevice)
            syncMetadata.lastModifiedDevice = settings.lastModifiedDevice;
        }
        // 1.2 중첩된 data 객체 처리 (레거시 API 형식)
        else if (settings.data) {
          logger.info('중첩된 데이터 구조 발견');
          const data = settings.data;

          if (Array.isArray(data.pages)) {
            pagesData = data.pages;
          } else if (Array.isArray(data)) {
            pagesData = data;
          }

          appearanceData = data.appearance || settings.appearance || null;
          advancedData = data.advanced || settings.advanced || null;

          // 메타데이터 추출
          if (data.lastSyncedAt) syncMetadata.lastSyncedAt = data.lastSyncedAt;
          if (data.lastModifiedAt) syncMetadata.lastModifiedAt = data.lastModifiedAt;
          if (data.lastSyncedDevice) syncMetadata.lastSyncedDevice = data.lastSyncedDevice;
          if (data.lastModifiedDevice) syncMetadata.lastModifiedDevice = data.lastModifiedDevice;
        }
        // 1.3 배열 자체가 응답인 경우 (단순 API 형식)
        else if (Array.isArray(settings)) {
          logger.info('배열 전용 구조 발견');
          pagesData = settings;
        }
        // 1.4 기타 구조 - 모든 배열 필드 검색
        else {
          logger.info('알 수 없는 구조에서 페이지 배열 검색 중');
          const arrayFields = Object.entries(settings)
            .filter(([key, value]) => Array.isArray(value))
            .map(([key, value]) => ({ key, value }));

          if (arrayFields.length > 0) {
            // 페이지 데이터로 추정되는 첫 번째 배열 사용
            const pagesField =
              arrayFields.find(
                field =>
                  field.key === 'pages' ||
                  (field.value.length > 0 && field.value[0].name && field.value[0].buttons),
              ) || arrayFields[0];

            logger.info(`페이지 데이터로 '${pagesField.key}' 배열 필드 사용`);
            pagesData = pagesField.value;
          }

          // appearance와 advanced 설정 검색
          Object.entries(settings).forEach(([key, value]) => {
            if (key === 'appearance' && typeof value === 'object') {
              appearanceData = value;
            } else if (key === 'advanced' && typeof value === 'object') {
              advancedData = value;
            }
          });
        }

        // 페이지 데이터 검증
        if (!pagesData) {
          logger.error('응답에서 페이지 데이터를 찾을 수 없음:', JSON.stringify(settings));
          throw new Error(
            '유효하지 않은 설정 데이터: 예상되는 어떤 형식으로도 페이지 정보를 찾을 수 없습니다',
          );
        }

        // 페이지 데이터 구조 검증
        const isValidPageData =
          Array.isArray(pagesData) &&
          pagesData.every(
            page =>
              typeof page === 'object' &&
              page !== null &&
              (page.name !== undefined || page.buttons !== undefined),
          );

        if (!isValidPageData) {
          logger.error('유효하지 않은 페이지 데이터 구조:', JSON.stringify(pagesData.slice(0, 2)));
          throw new Error('유효하지 않은 설정 데이터: 페이지 구조가 예상 형식이 아닙니다');
        }

        logger.info(`동기화 데이터에서 ${pagesData.length}개의 페이지 발견`);

        // ConfigStore에 직접 데이터 저장 (단일 소스 원칙)
        configStore.set('pages', pagesData);
        logger.info('페이지 데이터를 ConfigStore에 저장 완료');

        // appearance 설정 저장 (있는 경우)
        if (appearanceData) {
          configStore.set('appearance', appearanceData);
          logger.info('외관 설정을 ConfigStore에 저장 완료');
        }

        // advanced 설정 저장 (있는 경우)
        if (advancedData) {
          configStore.set('advanced', advancedData);
          logger.info('고급 설정을 ConfigStore에 저장 완료');
        }

        // 동기화 상태 업데이트
        state.lastSyncTime = syncMetadata.lastSyncedAt;
        state.lastSyncStatus = {
          success: true,
          timestamp: state.lastSyncTime,
          error: null,
        };

        logger.info('설정 다운로드가 성공적으로 완료되었습니다');

        // 서버 응답과 메타데이터를 함께 반환
        return {
          success: true,
          data: settings,
          syncMetadata,
        };
      },
      { onUnauthorized },
    );
  } catch (error) {
    logger.error('설정 다운로드 오류:', error);

    state.lastSyncStatus = {
      success: false,
      timestamp: Date.now(),
      error: error.message || '알 수 없는 오류',
    };

    return {
      success: false,
      error: error.message || '알 수 없는 오류',
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
  getLastSyncStatus,
};
