/**
 * Toast API - 인증 관련 API 모듈
 *
 * 로그인, 토큰 관리, 사용자 정보 조회 등 인증 관련 API를 처리합니다.
 */

const { URL } = require('url');
const { v4: uuidv4 } = require('uuid');
const Store = require('electron-store');
const {
  ENDPOINTS,
  createApiClient,
  getAuthHeaders,
  authenticatedRequest,
  clearTokens
} = require('./client');

// 인증 관련 상수
const REDIRECT_URI = 'toast-app://auth';

// 로그아웃 상태 추적
let isLoggedOut = false;
let logoutTimestamp = 0;
const LOGOUT_COOLDOWN_MS = 5000; // 로그아웃 후 5초 동안 인증 요청 방지

// 상태 저장소 (CSRF 보호용)
const stateStore = new Store({
  name: 'auth-state',
  encryptionKey: 'toast-app-auth-state',
  clearInvalidConfig: true
});

/**
 * CSRF 방지를 위한 인증 상태 값 저장
 * @param {string} state - 저장할 상태 값
 */
function storeStateParam(state) {
  try {
    // 로그아웃 상태에서는 상태 저장 방지
    if (isInLogoutCooldown()) {
      console.log('로그아웃 후 일정 시간 동안 인증 요청이 제한됩니다.');
      return false;
    }

    stateStore.set('oauth-state', state);
    stateStore.set('state-created-at', Date.now());
    console.log('Auth state stored:', state);
    return true;
  } catch (error) {
    console.error('Failed to store state parameter:', error);
    throw error;
  }
}

/**
 * 저장된 인증 상태 값 가져오기
 * @returns {string|null} 저장된 상태 값 또는 null
 */
function retrieveStoredState() {
  try {
    const state = stateStore.get('oauth-state');
    const createdAt = stateStore.get('state-created-at') || 0;

    // 5분 이상 경과된 상태 값은 만료 처리
    const isExpired = Date.now() - createdAt > 5 * 60 * 1000;

    if (isExpired) {
      console.log('Auth state expired, clearing');
      stateStore.delete('oauth-state');
      stateStore.delete('state-created-at');
      return null;
    }

    return state;
  } catch (error) {
    console.error('Failed to retrieve stored state:', error);
    return null;
  }
}

/**
 * 로그아웃 상태에서 인증 요청 냉각기간 중인지 확인
 * @returns {boolean} 냉각기간 중이면 true
 */
function isInLogoutCooldown() {
  if (!isLoggedOut) return false;

  const elapsed = Date.now() - logoutTimestamp;
  if (elapsed > LOGOUT_COOLDOWN_MS) {
    // 냉각기간이 지나면 플래그 초기화
    isLoggedOut = false;
    return false;
  }

  return true;
}

/**
 * 로그인 프로세스를 시작합니다 (OAuth 인증 페이지 열기)
 * @param {string} clientId - OAuth 클라이언트 ID
 * @returns {Promise<Object>} 로그인 프로세스 시작 결과 {url: string, state: string}
 */
function initiateLogin(clientId) {
  try {
    // 로그아웃 상태에서는 인증 요청 거부
    if (isInLogoutCooldown()) {
      console.log('로그아웃 후 일정 시간 동안 인증 요청이 제한됩니다.');
      return {
        success: false,
        error: '로그아웃 후 잠시 후에 다시 시도해주세요.'
      };
    }

    // 상태 값은 CSRF 공격 방지를 위해 사용됨
    const state = uuidv4();

    // 상태 값 저장
    const stored = storeStateParam(state);
    if (!stored) {
      return {
        success: false,
        error: '로그아웃 후 잠시 후에 다시 시도해주세요.'
      };
    }

    // 인증 URL 구성
    const authUrl = new URL(ENDPOINTS.OAUTH_AUTHORIZE);
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('client_id', clientId);
    authUrl.searchParams.append('redirect_uri', REDIRECT_URI);
    authUrl.searchParams.append('scope', 'profile subscription');
    authUrl.searchParams.append('state', state);

    // 인증 URL 로깅
    console.log('====== 인증 요청 정보 ======');
    console.log('인증 요청 전체 URL:', authUrl.toString());
    console.log('==========================');

    return {
      success: true,
      url: authUrl.toString(),
      state
    };
  } catch (error) {
    console.error('Failed to initiate login:', error);
    return {
      success: false,
      error: error.message || 'Unknown error'
    };
  }
}

/**
 * 인증 코드를 토큰으로 교환합니다
 * @param {Object} params - 토큰 교환 파라미터
 * @param {string} params.code - OAuth 인증 코드
 * @param {string} params.clientId - OAuth 클라이언트 ID
 * @param {string} params.clientSecret - OAuth 클라이언트 시크릿
 * @returns {Promise<Object>} 토큰 교환 결과
 */
async function exchangeCodeForToken({ code, clientId, clientSecret }) {
  try {
    // 로그아웃 상태에서는 토큰 교환 거부
    if (isInLogoutCooldown()) {
      console.log('로그아웃 후 일정 시간 동안 인증 요청이 제한됩니다.');
      return {
        success: false,
        error: '로그아웃 후 잠시 후에 다시 시도해주세요.'
      };
    }

    console.log('인증 코드를 토큰으로 교환 시작:', code.substring(0, 8) + '...');

    const apiClient = createApiClient();

    // 토큰 요청 데이터 준비
    const data = new URLSearchParams();
    data.append('grant_type', 'authorization_code');
    data.append('code', code);
    data.append('client_id', clientId);
    data.append('client_secret', clientSecret);
    data.append('redirect_uri', REDIRECT_URI);

    console.log('토큰 요청 URL:', ENDPOINTS.OAUTH_TOKEN);
    console.log('요청 데이터:', {
      grant_type: 'authorization_code',
      code: code.substring(0, 8) + '...',
      client_id: clientId,
      redirect_uri: REDIRECT_URI
    });

    // 토큰 요청
    const response = await apiClient.post(ENDPOINTS.OAUTH_TOKEN, data, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    console.log('토큰 요청 성공! 응답 상태:', response.status);
    const { access_token, refresh_token, expires_in } = response.data;

    if (!access_token) {
      console.error('서버에서 액세스 토큰을 반환하지 않음!');
      return {
        success: false,
        error: 'No access token returned from server'
      };
    }

    // 로그인 성공 시 로그아웃 상태 초기화
    isLoggedOut = false;

    return {
      success: true,
      access_token,
      refresh_token,
      expires_in
    };
  } catch (error) {
    console.error('토큰 교환 중 오류 발생:', error);
    console.error('상세 오류 정보:', error.response?.data || '상세 정보 없음');

    return {
      success: false,
      error: error.response?.data?.error || error.message,
      error_details: error.response?.data
    };
  }
}

/**
 * 리프레시 토큰을 사용하여 새 액세스 토큰을 얻습니다
 * @param {Object} params - 토큰 리프레시 파라미터
 * @param {string} params.refreshToken - 리프레시 토큰
 * @param {string} params.clientId - OAuth 클라이언트 ID
 * @param {string} params.clientSecret - OAuth 클라이언트 시크릿
 * @returns {Promise<Object>} 토큰 리프레시 결과
 */
async function refreshAccessToken({ refreshToken, clientId, clientSecret }) {
  try {
    // 로그아웃 상태에서는 토큰 갱신 거부
    if (isInLogoutCooldown()) {
      console.log('로그아웃 후 일정 시간 동안 인증 요청이 제한됩니다.');
      return {
        success: false,
        error: '로그아웃 후 잠시 후에 다시 시도해주세요.',
        code: 'LOGOUT_COOLDOWN'
      };
    }

    console.log('토큰 리프레시 프로세스 시작');

    if (!refreshToken) {
      console.error('리프레시 토큰이 없음');
      return {
        success: false,
        error: 'No refresh token available',
        code: 'NO_REFRESH_TOKEN'
      };
    }

    const apiClient = createApiClient();

    // 토큰 갱신 요청 데이터 준비
    const data = new URLSearchParams();
    data.append('grant_type', 'refresh_token');
    data.append('refresh_token', refreshToken);
    data.append('client_id', clientId);
    data.append('client_secret', clientSecret);

    // 요청 데이터 로깅 (민감 정보 제외)
    console.log('토큰 리프레시 요청:', {
      url: ENDPOINTS.OAUTH_TOKEN,
      grant_type: 'refresh_token',
      client_id: clientId
    });

    try {
      // 토큰 갱신 요청
      const response = await apiClient.post(ENDPOINTS.OAUTH_TOKEN, data, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      console.log('토큰 갱신 응답 상태:', response.status);
      const { access_token, refresh_token } = response.data;

      if (!access_token) {
        console.error('응답에 액세스 토큰 누락');
        return {
          success: false,
          error: 'No access token in response',
          code: 'NO_ACCESS_TOKEN'
        };
      }

      console.log('새 액세스 토큰 수신:', access_token.substring(0, 10) + '...');

      return {
        success: true,
        access_token,
        refresh_token
      };
    } catch (tokenRequestError) {
      console.error('토큰 갱신 요청 실패:', tokenRequestError.message);

      if (tokenRequestError.response?.status === 401) {
        console.log('리프레시 토큰이 만료되었습니다. 재로그인 필요');

        return {
          success: false,
          error: '로그인 세션이 만료되었습니다. 다시 로그인해 주세요.',
          code: 'SESSION_EXPIRED',
          requireRelogin: true
        };
      }

      const errorMessage = tokenRequestError.response?.data?.error ||
        tokenRequestError.message ||
        'Unknown error during token refresh';

      console.log('오류 메시지:', errorMessage);
      return {
        success: false,
        error: errorMessage,
        code: 'REFRESH_FAILED'
      };
    }
  } catch (error) {
    console.error('토큰 리프레시 과정 중 예외 발생:', error);

    // 치명적인 오류이지만 앱 실행은 유지
    const errorMessage = error.message || 'Unknown error in refresh token process';
    return {
      success: false,
      error: errorMessage,
      code: 'REFRESH_EXCEPTION'
    };
  }
}

/**
 * 인증 URL로부터 받은 리디렉션 처리
 * @param {Object} params - 리디렉션 처리 파라미터
 * @param {string} params.url - 리디렉션 URL
 * @param {Function} params.onCodeExchange - 코드 교환 처리 함수
 * @returns {Promise<Object>} 처리 결과
 */
async function handleAuthRedirect({ url, onCodeExchange }) {
  try {
    console.log('Processing auth redirect:', url);

    // 로그아웃 상태에서는 리디렉션 처리 거부
    if (isInLogoutCooldown()) {
      console.log('로그아웃 후 일정 시간 동안 인증 요청이 제한됩니다.');
      return {
        success: false,
        error: '로그아웃 후 잠시 후에 다시 시도해주세요.'
      };
    }

    const urlObj = new URL(url);

    // 인증 코드 추출
    const code = urlObj.searchParams.get('code');
    const state = urlObj.searchParams.get('state');
    const error = urlObj.searchParams.get('error');
    const token = urlObj.searchParams.get('token');
    const action = urlObj.searchParams.get('action');

    // action 파라미터가 있는 경우 특별 처리
    if (action === 'reload_auth') {
      console.log('Auth reload action detected');
      return { success: true, action: 'reload_auth', token };
    }

    // 오류 파라미터가 있는 경우
    if (error) {
      console.error('Auth error from server:', error);
      return {
        success: false,
        error: error || 'Unknown error'
      };
    }

    // 코드가 없는 경우
    if (!code) {
      console.error('No auth code in redirect URL');
      return {
        success: false,
        error: 'Missing authorization code'
      };
    }

    // 상태 값 검증 (CSRF 방지)
    const storedState = retrieveStoredState();
    if (!storedState || state !== storedState) {
      console.error('State mismatch. Possible CSRF attack');
      return {
        success: false,
        error: 'state_mismatch',
        message: 'State parameter mismatch. Security validation failed.'
      };
    }

    // 콜백 함수가 있으면 호출하여 코드 교환 처리
    if (onCodeExchange && typeof onCodeExchange === 'function') {
      return await onCodeExchange(code);
    }

    return {
      success: true,
      code
    };
  } catch (error) {
    console.error('Failed to handle auth redirect:', error);
    return {
      success: false,
      error: error.message || 'Unknown error'
    };
  }
}

/**
 * 사용자 프로필 정보를 가져옵니다
 * @param {Function} onUnauthorized - 인증 실패 시 호출할 콜백 함수
 * @returns {Promise<Object>} 사용자 프로필 정보
 */
async function fetchUserProfile(onUnauthorized) {
  // 로그아웃 상태에서는 프로필 정보 요청 거부
  if (isInLogoutCooldown()) {
    console.log('로그아웃 후 일정 시간 동안 인증 요청이 제한됩니다.');
    return {
      error: {
        code: 'LOGOUT_COOLDOWN',
        message: '로그아웃 후 잠시 후에 다시 시도해주세요.'
      }
    };
  }

  return authenticatedRequest(async () => {
    const headers = getAuthHeaders();
    console.log('프로필 API 호출:', ENDPOINTS.USER_PROFILE);

    const apiClient = createApiClient();
    const response = await apiClient.get(ENDPOINTS.USER_PROFILE, { headers });
    console.log('프로필 API 응답 상태:', response.status);

    // API 응답 형식이 apiSuccess({ ... }) 형태인 경우 data 필드 추출
    if (response.data && response.data.success === true && response.data.data) {
      return response.data.data;
    }

    return response.data;
  }, { onUnauthorized });
}

/**
 * 구독 정보를 가져옵니다
 * @param {Function} onUnauthorized - 인증 실패 시 호출할 콜백 함수
 * @returns {Promise<Object>} 구독 정보
 */
async function fetchSubscription(onUnauthorized) {
  // 로그아웃 상태에서는 구독 정보 요청 거부
  if (isInLogoutCooldown()) {
    console.log('로그아웃 후 일정 시간 동안 인증 요청이 제한됩니다.');
    return {
      error: {
        code: 'LOGOUT_COOLDOWN',
        message: '로그아웃 후 잠시 후에 다시 시도해주세요.'
      }
    };
  }

  // 구독 API에 대한 기본 응답 (인증 실패나 오류 발생 시 사용)
  const defaultSubscription = {
    id: 'sub_free_anonymous',
    userId: 'anonymous',
    plan: 'free',
    status: 'active',
    active: false,
    is_subscribed: false,
    features: {
      page_groups: 1
    },
    features_array: ['basic_shortcuts'],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    expiresAt: null,
    subscribed_until: null,
    isVip: false
  };

  const options = {
    allowUnauthenticated: true,
    defaultValue: defaultSubscription,
    isSubscriptionRequest: true,
    onUnauthorized
  };

  return authenticatedRequest(async () => {
    try {
      const headers = getAuthHeaders();
      console.log('구독 API 호출:', ENDPOINTS.USER_SUBSCRIPTION);

      const apiClient = createApiClient();
      const response = await apiClient.get(ENDPOINTS.USER_SUBSCRIPTION, { headers });
      console.log('구독 API 응답 상태:', response.status);

      // API 응답 형식이 apiSuccess({ ... }) 형태인 경우 data 필드 추출
      let subscriptionData;
      if (response.data && response.data.success === true && response.data.data) {
        subscriptionData = response.data.data;
      } else {
        subscriptionData = response.data;
      }

      console.log('구독 데이터 수신:', JSON.stringify(subscriptionData, null, 2));

      // 구독 데이터 검증 및 필드 호환성 보장
      const normalizedSubscription = {
        ...defaultSubscription,
        ...subscriptionData,
        // 활성 여부 필드 동기화 (is_subscribed 또는 active)
        active: subscriptionData.active || subscriptionData.is_subscribed || false,
        is_subscribed: subscriptionData.is_subscribed || subscriptionData.active || false,
        // 만료일 필드 동기화 (expiresAt 또는 subscribed_until)
        expiresAt: subscriptionData.expiresAt || subscriptionData.subscribed_until || null,
        subscribed_until: subscriptionData.subscribed_until || subscriptionData.expiresAt || null,
        // VIP 상태 보존 (기본값은 false)
        isVip: subscriptionData.isVip === true
      };

      // VIP 사용자면 프리미엄 페이지 그룹 및 기능 보장
      if (normalizedSubscription.isVip) {
        console.log('VIP 사용자 확인됨 - 프리미엄 혜택 적용');
        normalizedSubscription.active = true;
        normalizedSubscription.is_subscribed = true;
        normalizedSubscription.plan = 'premium';
      }

      // features 객체가 없으면 기본값 사용
      if (!normalizedSubscription.features) {
        normalizedSubscription.features = defaultSubscription.features;
      }

      // features_array 필드가 없으면 기본값 사용
      if (!normalizedSubscription.features_array) {
        normalizedSubscription.features_array = defaultSubscription.features_array;
      }

      return normalizedSubscription;
    } catch (error) {
      console.error('구독 정보 조회 중 오류 발생:', error);
      return defaultSubscription;
    }
  }, options);
}

/**
 * 로그아웃 처리 (서버 호출 없이 로컬 토큰만 초기화)
 * @returns {Promise<Object>} 로그아웃 결과
 */
async function logout() {
  try {
    // 메모리에서 토큰 초기화 (서버 호출 없음)
    clearTokens();
    console.log('메모리 토큰 초기화 완료');

    // 로그아웃 상태 설정
    isLoggedOut = true;
    logoutTimestamp = Date.now();
    console.log(`로그아웃 후 ${LOGOUT_COOLDOWN_MS/1000}초 동안 인증 요청이 제한됩니다.`);

    return {
      success: true,
      message: '로그아웃 성공'
    };
  } catch (error) {
    console.error('로그아웃 중 오류 발생:', error);
    return {
      success: false,
      error: error.message || '로그아웃 중 오류가 발생했습니다'
    };
  }
}

module.exports = {
  initiateLogin,
  exchangeCodeForToken,
  refreshAccessToken,
  handleAuthRedirect,
  fetchUserProfile,
  fetchSubscription,
  logout
};
