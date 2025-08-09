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

    // 구독 활성화 상태 확인 (간소화된 로직)
    let hasSyncFeature = false;

    // 1. 구독 활성화 여부 확인
    const isSubscribed = subscription.isSubscribed === true || subscription.active === true;

    // 2. cloud_sync 기능 확인 (features 객체 우선, additionalFeatures 대체)
    const hasCloudSyncFeature = subscription.features?.cloud_sync === true || subscription.additionalFeatures?.cloudSync === true;

    // 3. Premium/Pro/VIP 플랜 확인
    const isPremiumPlan = subscription.isVip === true || (subscription.plan && ['premium', 'pro', 'vip'].includes(subscription.plan.toLowerCase()));

    // 구독자이고 cloud_sync 기능이 있거나 Premium 플랜인 경우 활성화
    if (isSubscribed && (hasCloudSyncFeature || isPremiumPlan)) {
      hasSyncFeature = true;
      logger.info('isCloudSyncEnabled: 클라우드 동기화 활성화 - 구독 활성화 및 기능 확인됨');
    }
    // 개발 모드에서 cloud_sync 기능이 활성화된 경우 허용
    else if (process.env.NODE_ENV === 'development' && hasCloudSyncFeature && subscription.plan === 'Basic') {
      hasSyncFeature = true;
      logger.info('isCloudSyncEnabled: 클라우드 동기화 활성화 - 개발 모드에서 Basic 플랜 허용됨');
    }

    // 결과 반환
    logger.info(`isCloudSyncEnabled: 동기화 기능 ${hasSyncFeature ? '활성화됨' : '비활성화됨'}`, {
      isSubscribed,
      hasCloudSyncFeature,
      isPremiumPlan,
      plan: subscription.plan,
    });
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
async function uploadSettings({ hasValidToken: _hasValidToken, onUnauthorized, configStore: _configStore, directData }) {
  // 이미 동기화 중이면 건너뜀
  if (state.isSyncing) {
    return { success: false, error: 'Sync already in progress' };
  }

  state.isSyncing = true;

  try {
    // 유효한 데이터 확인
    if (!directData) {
      throw new Error('Invalid data');
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

    // 오류 객체를 더 자세히 처리
    let errorMessage = error.message || '알 수 없는 오류';
    let errorDetails = null;

    // 응답 오류 처리
    if (error.response) {
      if (error.response.data) {
        if (typeof error.response.data === 'object') {
          errorDetails = JSON.stringify(error.response.data);
          if (error.response.data.message) {
            errorMessage = error.response.data.message;
          } else if (error.response.data.error) {
            errorMessage = error.response.data.error;
          }
        } else if (typeof error.response.data === 'string') {
          errorMessage = error.response.data;
        }
      }
      errorMessage = `${errorMessage} (HTTP ${error.response.status || 'Error'})`;
    }

    logger.error('설정 업로드 오류 상세 정보:', {
      message: errorMessage,
      details: errorDetails,
      status: error.response?.status,
    });

    return {
      success: false,
      error: errorMessage,
      errorDetails,
      statusCode: error.response?.status,
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
async function downloadSettings({ hasValidToken: _hasValidToken, onUnauthorized, configStore }) {
  // 이미 동기화 중이면 건너뜀
  if (state.isSyncing) {
    return { success: false, error: 'Sync already in progress' };
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
          Object.keys(settings || {}).length > 0 ? `다음 키 포함: ${Object.keys(settings).join(', ')}` : '빈 응답 또는 유효하지 않은 응답',
        );

        // 유효성 검사
        if (!settings) {
          throw new Error('Invalid settings data: Response is empty');
        }

        // 표준화된 데이터 추출
        let pagesData = null;
        let appearanceData = null;
        let advancedData = null;
        const syncMetadata = {
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
          if (settings.lastSyncedAt) {
            syncMetadata.lastSyncedAt = settings.lastSyncedAt;
          }
          if (settings.lastModifiedAt) {
            syncMetadata.lastModifiedAt = settings.lastModifiedAt;
          }
          if (settings.lastSyncedDevice) {
            syncMetadata.lastSyncedDevice = settings.lastSyncedDevice;
          }
          if (settings.lastModifiedDevice) {
            syncMetadata.lastModifiedDevice = settings.lastModifiedDevice;
          }
        } else if (settings.data) {
        // 1.2 중첩된 data 객체 처리 (레거시 API 형식)
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
          if (data.lastSyncedAt) {
            syncMetadata.lastSyncedAt = data.lastSyncedAt;
          }
          if (data.lastModifiedAt) {
            syncMetadata.lastModifiedAt = data.lastModifiedAt;
          }
          if (data.lastSyncedDevice) {
            syncMetadata.lastSyncedDevice = data.lastSyncedDevice;
          }
          if (data.lastModifiedDevice) {
            syncMetadata.lastModifiedDevice = data.lastModifiedDevice;
          }
        } else if (Array.isArray(settings)) {
        // 1.3 배열 자체가 응답인 경우 (단순 API 형식)
          logger.info('배열 전용 구조 발견');
          pagesData = settings;
        } else {
        // 1.4 기타 구조 - 모든 배열 필드 검색
          logger.info('알 수 없는 구조에서 페이지 배열 검색 중');
          const arrayFields = Object.entries(settings)
            .filter(([_key, value]) => Array.isArray(value))
            .map(([key, value]) => ({ key, value }));

          if (arrayFields.length > 0) {
            // 페이지 데이터로 추정되는 첫 번째 배열 사용
            const pagesField =
              arrayFields.find(field => field.key === 'pages' || (field.value.length > 0 && field.value[0].name && field.value[0].buttons)) || arrayFields[0];

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
          throw new Error('Invalid settings data: Could not find page information in any expected format');
        }

        // 페이지 데이터 구조 검증
        const isValidPageData =
          Array.isArray(pagesData) &&
          pagesData.every(page => typeof page === 'object' && page !== null && (page.name !== undefined || page.buttons !== undefined));

        if (!isValidPageData) {
          logger.error('유효하지 않은 페이지 데이터 구조:', JSON.stringify(pagesData.slice(0, 2)));
          throw new Error('Invalid settings data: Page structure does not match expected format');
        }

        logger.info(`동기화 데이터에서 ${pagesData.length}개의 페이지 발견`);

        // ConfigStore에 직접 데이터 저장 (configStore가 제공된 경우만)
        if (configStore) {
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
        } else {
          logger.info('ConfigStore not provided - data downloaded but not saved locally');
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

    // 오류 객체를 더 자세히 처리
    let errorMessage = error.message || '알 수 없는 오류';
    let errorDetails = null;

    // 응답 오류 처리
    if (error.response) {
      if (error.response.data) {
        if (typeof error.response.data === 'object') {
          errorDetails = JSON.stringify(error.response.data);
          if (error.response.data.message) {
            errorMessage = error.response.data.message;
          } else if (error.response.data.error) {
            errorMessage = error.response.data.error;
          }
        } else if (typeof error.response.data === 'string') {
          errorMessage = error.response.data;
        }
      }
      errorMessage = `${errorMessage} (HTTP ${error.response.status || 'Error'})`;
    }

    logger.error('설정 다운로드 오류 상세 정보:', {
      message: errorMessage,
      details: errorDetails,
      status: error.response?.status,
    });

    return {
      success: false,
      error: errorMessage,
      errorDetails,
      statusCode: error.response?.status,
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
