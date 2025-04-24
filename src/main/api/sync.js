/**
 * Toast API - Settings Synchronization API Module
 *
 * Synchronizes Toast-App settings (pages and button information, etc.) with the Toast-Web server.
 */

const os = require('os');
const {
  ENDPOINTS,
  createApiClient,
  getAuthHeaders,
  authenticatedRequest
} = require('./client');

// Synchronization state management
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
 * Check if cloud synchronization is possible
 * @param {Object} params - Synchronization possibility parameters
 * @param {Function} params.hasValidToken - Function to check for valid token
 * @param {Object} params.configStore - Configuration store
 * @returns {Promise<boolean>} Whether synchronization is possible
 */
async function isCloudSyncEnabled({ hasValidToken, configStore }) {
  try {
    // 로그에 함수 호출 기록
    console.log('isCloudSyncEnabled: 클라우드 동기화 가능 여부 확인 중');

    // 인증 상태 확인
    const isAuthenticated = await hasValidToken();
    if (!isAuthenticated) {
      console.log('isCloudSyncEnabled: 인증 토큰 없음, 동기화 불가');
      return false;
    }

    console.log('isCloudSyncEnabled: 유효한 인증 토큰 확인됨');

    // 구독 정보 확인
    const subscription = configStore.get('subscription') || {};
    console.log('isCloudSyncEnabled: 구독 정보 확인:', JSON.stringify(subscription));

    // 구독 활성화 상태 확인 (다양한 형식 지원)
    let hasSyncFeature = false;

    // 1. 직접적인 구독 상태 확인
    if (subscription.isSubscribed === true ||
        subscription.active === true ||
        subscription.is_subscribed === true) {
      hasSyncFeature = true;
      console.log('isCloudSyncEnabled: 활성화된 구독 발견');
    }

    // 2. features 객체에서 cloud_sync 기능 확인
    if (subscription.features &&
        typeof subscription.features === 'object' &&
        subscription.features.cloud_sync === true) {
      hasSyncFeature = true;
      console.log('isCloudSyncEnabled: features 객체에서 cloud_sync=true 발견');
    }

    // 3. features_array에서 cloud_sync 기능 확인
    if (Array.isArray(subscription.features_array) &&
        subscription.features_array.includes('cloud_sync')) {
      hasSyncFeature = true;
      console.log('isCloudSyncEnabled: features_array에서 cloud_sync 발견');
    }

    // 4. additionalFeatures 객체 확인
    if (subscription.additionalFeatures &&
        typeof subscription.additionalFeatures === 'object' &&
        subscription.additionalFeatures.cloudSync === true) {
      hasSyncFeature = true;
      console.log('isCloudSyncEnabled: additionalFeatures에서 cloudSync=true 발견');
    }

    // 5. 계정이 구독자이면 기본적으로 동기화 기능 활성화
    if (subscription.plan &&
        (subscription.plan.toLowerCase().includes('premium') ||
         subscription.plan.toLowerCase().includes('pro'))) {
      hasSyncFeature = true;
      console.log('isCloudSyncEnabled: premium/pro 플랜 발견, 동기화 기능 활성화');
    }

    // 결과 반환
    console.log(`isCloudSyncEnabled: 동기화 기능 ${hasSyncFeature ? '활성화됨' : '비활성화됨'}`);
    return hasSyncFeature;
  } catch (error) {
    console.error('Error checking synchronization availability:', error);
    return false;
  }
}

/**
 * Upload current settings to server
 * @param {Object} params - Upload parameters
 * @param {Function} params.hasValidToken - Function to check for valid token
 * @param {Function} params.onUnauthorized - Callback function for authentication failure
 * @param {Object} params.configStore - Configuration store
 * @param {Object} [params.directData] - Data to upload directly to server
 * @returns {Promise<Object>} Upload result
 */
async function uploadSettings({ hasValidToken, onUnauthorized, configStore, directData }) {
  // Skip if already syncing
  if (state.isSyncing) {
    return { success: false, error: 'Already syncing' };
  }

  state.isSyncing = true;

  try {
    // Check for valid data
    if (!directData) {
      throw new Error('Invalid data');
    }

    // API request
    return await authenticatedRequest(async () => {
      const headers = getAuthHeaders();
      const apiClient = createApiClient();


      const response = await apiClient.put(ENDPOINTS.SETTINGS, directData, { headers });

      // Record synchronization completion time
      state.lastSyncTime = Date.now();
      state.lastSyncStatus = {
        success: true,
        timestamp: state.lastSyncTime,
        error: null
      };

      return { success: true, data: response.data };
    }, { onUnauthorized });
  } catch (error) {
    console.error('Settings upload error:', error);

    state.lastSyncStatus = {
      success: false,
      timestamp: Date.now(),
      error: error.message || 'Unknown error'
    };

    return {
      success: false,
      error: error.message || 'Unknown error'
    };
  } finally {
    state.isSyncing = false;
  }
}

/**
 * Download settings from server
 * @param {Object} params - Download parameters
 * @param {Function} params.hasValidToken - Function to check for valid token
 * @param {Function} params.onUnauthorized - Callback function for authentication failure
 * @param {Object} params.configStore - Configuration store
 * @returns {Promise<Object>} Download result
 */
async function downloadSettings({ hasValidToken, onUnauthorized, configStore }) {
  // Skip if already syncing
  if (state.isSyncing) {
    return { success: false, error: 'Already syncing' };
  }

  state.isSyncing = true;

  try {
    // API request
    return await authenticatedRequest(async () => {
      const headers = getAuthHeaders();

      const apiClient = createApiClient();
      const response = await apiClient.get(ENDPOINTS.SETTINGS, { headers });

      const settings = response.data;

      // 상세 디버깅 로그
      console.log('Cloud sync - Downloaded settings structure:',
        Object.keys(settings || {}).length > 0
        ? `Contains keys: ${Object.keys(settings).join(', ')}`
        : 'Empty or invalid response');

      // Validation check
      if (!settings) {
        throw new Error('Invalid settings data: Response is empty');
      }

      // 표준화된 데이터 추출 시도
      let pagesData = null;
      let appearanceData = null;
      let advancedData = null;
      let syncMetadata = {
        lastSyncedAt: Date.now(),
        lastSyncedDevice: getDeviceInfo()
      };

      // 1. 서버 응답 데이터 구조 파싱
      // 1.1 표준 구조 확인 (최신 API 형식)
      if (settings.pages && Array.isArray(settings.pages)) {
        console.log('Found standard pages structure');
        pagesData = settings.pages;
        appearanceData = settings.appearance || null;
        advancedData = settings.advanced || null;

        // 메타데이터 추출
        if (settings.lastSyncedAt) syncMetadata.lastSyncedAt = settings.lastSyncedAt;
        if (settings.lastModifiedAt) syncMetadata.lastModifiedAt = settings.lastModifiedAt;
        if (settings.lastSyncedDevice) syncMetadata.lastSyncedDevice = settings.lastSyncedDevice;
        if (settings.lastModifiedDevice) syncMetadata.lastModifiedDevice = settings.lastModifiedDevice;
      }
      // 1.2 중첩된 data 객체 처리 (레거시 API 형식)
      else if (settings.data) {
        console.log('Found nested data structure');
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
        console.log('Found array-only structure');
        pagesData = settings;
      }
      // 1.4 기타 구조 - 모든 배열 필드 검색
      else {
        console.log('Searching for page array in unknown structure');
        const arrayFields = Object.entries(settings)
          .filter(([key, value]) => Array.isArray(value))
          .map(([key, value]) => ({ key, value }));

        if (arrayFields.length > 0) {
          // 페이지 데이터로 추정되는 첫 번째 배열 사용
          const pagesField = arrayFields.find(field =>
            field.key === 'pages' ||
            (field.value.length > 0 && field.value[0].name && field.value[0].buttons)
          ) || arrayFields[0];

          console.log(`Using array field '${pagesField.key}' as pages data`);
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
        console.error('Page data not found in response:', JSON.stringify(settings));
        throw new Error('Invalid settings data: No page information found in any expected format');
      }

      // 페이지 데이터 구조 검증
      const isValidPageData = Array.isArray(pagesData) && pagesData.every(page =>
        typeof page === 'object' && page !== null &&
        (page.name !== undefined || page.buttons !== undefined)
      );

      if (!isValidPageData) {
        console.error('Invalid page data structure:', JSON.stringify(pagesData.slice(0, 2)));
        throw new Error('Invalid settings data: Page structure is not in expected format');
      }

      console.log(`Found ${pagesData.length} pages in sync data`);

      // configStore에 데이터 저장
      configStore.set('pages', pagesData);
      console.log('Pages data saved to config store');

      // appearance 설정 저장 (있는 경우)
      if (appearanceData) {
        configStore.set('appearance', appearanceData);
        console.log('Appearance settings saved to config store');
      }

      // advanced 설정 저장 (있는 경우)
      if (advancedData) {
        configStore.set('advanced', advancedData);
        console.log('Advanced settings saved to config store');
      }

      // 동기화 상태 업데이트
      state.lastSyncTime = syncMetadata.lastSyncedAt;
      state.lastSyncStatus = {
        success: true,
        timestamp: state.lastSyncTime,
        error: null
      };

      console.log('Settings download completed successfully');

      // 서버 응답과 메타데이터를 함께 반환
      return {
        success: true,
        data: settings,
        syncMetadata
      };
    }, { onUnauthorized });
  } catch (error) {
    console.error('Settings download error:', error);

    state.lastSyncStatus = {
      success: false,
      timestamp: Date.now(),
      error: error.message || 'Unknown error'
    };

    return {
      success: false,
      error: error.message || 'Unknown error'
    };
  } finally {
    state.isSyncing = false;
  }
}

/**
 * Get last synchronization status
 * @returns {Object} Last synchronization status
 */
function getLastSyncStatus() {
  return { ...state.lastSyncStatus };
}

/**
 * Get current device information
 * @returns {string} Device information string
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
