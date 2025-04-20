/**
 * Toast App - Authentication Module
 *
 * OAuth 2.0 인증과 구독 관리를 위한 모듈입니다.
 */

const { app, shell, BrowserWindow } = require('electron');
const keytar = require('keytar');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const { URL } = require('url');
const path = require('path');
const os = require('os');
const Store = require('electron-store');
const { createConfigStore } = require('./config');

// 보안 상수
const AUTH_SERVICE_NAME = 'toast-app';
const AUTH_ACCOUNT = 'user';
const TOKEN_KEY = 'auth-token';
const REFRESH_TOKEN_KEY = 'refresh-token';

// OAuth 설정
const { getEnv } = require('./config/env');
const CLIENT_ID = getEnv('CLIENT_ID', 'toast-app-client');
const CLIENT_SECRET = getEnv('CLIENT_SECRET', 'toast-app-secret');

// API 엔드포인트
const TOAST_URL = getEnv('TOAST_URL', 'https://web.toast.sh');
// 개발 환경에서 로컬 URL 사용 가능하도록 설정
const isLocal = process.env.NODE_ENV === 'development' && getEnv('USE_LOCAL_API', 'false') === 'true';
const API_HOST = isLocal ? 'http://localhost:3000' : TOAST_URL;
const API_BASE_URL = `${API_HOST}/api`;
const OAUTH_AUTHORIZE_URL = `${API_BASE_URL}/oauth/authorize`;
const OAUTH_TOKEN_URL = `${API_BASE_URL}/oauth/token`;
const OAUTH_REVOKE_URL = `${API_BASE_URL}/oauth/revoke`;
const USER_PROFILE_URL = `${API_BASE_URL}/users/profile`;
const USER_SUBSCRIPTION_URL = `${API_BASE_URL}/users/subscription`;

console.log('API 엔드포인트 설정:', {
  TOAST_URL,
  API_HOST,
  API_BASE_URL,
  USER_SUBSCRIPTION_URL
});
const REDIRECT_URI = 'toast-app://auth';

// 토큰 저장소 (메모리)
let currentToken = null;
let currentRefreshToken = null;

/**
 * 인증 토큰을 안전한 저장소에서 가져옵니다
 * @returns {Promise<string|null>} 저장된 토큰이나 없으면 null
 */
async function getStoredToken() {
  try {
    return await keytar.getPassword(AUTH_SERVICE_NAME, TOKEN_KEY);
  } catch (error) {
    console.error('Failed to get token from secure storage:', error);
    return null;
  }
}

/**
 * 리프레시 토큰을 안전한 저장소에서 가져옵니다
 * @returns {Promise<string|null>} 저장된 리프레시 토큰이나 없으면 null
 */
async function getStoredRefreshToken() {
  try {
    return await keytar.getPassword(AUTH_SERVICE_NAME, REFRESH_TOKEN_KEY);
  } catch (error) {
    console.error('Failed to get refresh token from secure storage:', error);
    return null;
  }
}

/**
 * 토큰을 안전한 저장소에 저장합니다
 * @param {string} token - 저장할 인증 토큰
 * @returns {Promise<void>}
 */
async function storeToken(token) {
  try {
    currentToken = token;
    await keytar.setPassword(AUTH_SERVICE_NAME, TOKEN_KEY, token);
  } catch (error) {
    console.error('Failed to store token in secure storage:', error);
    throw error;
  }
}

/**
 * 리프레시 토큰을 안전한 저장소에 저장합니다
 * @param {string} refreshToken - 저장할 리프레시 토큰
 * @returns {Promise<void>}
 */
async function storeRefreshToken(refreshToken) {
  try {
    currentRefreshToken = refreshToken;
    await keytar.setPassword(AUTH_SERVICE_NAME, REFRESH_TOKEN_KEY, refreshToken);
  } catch (error) {
    console.error('Failed to store refresh token in secure storage:', error);
    throw error;
  }
}

/**
 * 토큰과 리프레시 토큰을 안전한 저장소에서 삭제합니다
 * @returns {Promise<void>}
 */
async function clearTokens() {
  try {
    currentToken = null;
    currentRefreshToken = null;
    await keytar.deletePassword(AUTH_SERVICE_NAME, TOKEN_KEY);
    await keytar.deletePassword(AUTH_SERVICE_NAME, REFRESH_TOKEN_KEY);
  } catch (error) {
    console.error('Failed to clear tokens from secure storage:', error);
    throw error;
  }
}

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
    stateStore.set('oauth-state', state);
    stateStore.set('state-created-at', Date.now());
    console.log('Auth state stored:', state);
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
 * 로그인 프로세스를 시작합니다 (OAuth 인증 페이지 열기)
 * @returns {Promise<boolean>} 프로세스가 시작되었으면 true
 */
async function initiateLogin() {
  try {
    // 상태 값은 CSRF 공격 방지를 위해 사용됨
    const state = uuidv4();

    // 상태 값 저장
    storeStateParam(state);

    // 인증 URL 구성
    const authUrl = new URL(OAUTH_AUTHORIZE_URL);
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('client_id', CLIENT_ID);
    authUrl.searchParams.append('redirect_uri', REDIRECT_URI);
    authUrl.searchParams.append('scope', 'profile subscription');
    authUrl.searchParams.append('state', state);

    // 기본 브라우저에서 인증 페이지 열기
    await shell.openExternal(authUrl.toString());

    return true;
  } catch (error) {
    console.error('Failed to initiate login:', error);
    throw error;
  }
}

/**
 * 인증 URL로부터 받은 리디렉션 처리
 * @param {string} url - 리디렉션 URL
 * @returns {Promise<Object>} 처리 결과
 */
async function handleAuthRedirect(url) {
  try {
    console.log('Processing auth redirect:', url);
    const urlObj = new URL(url);

    // 인증 코드 추출
    const code = urlObj.searchParams.get('code');
    const state = urlObj.searchParams.get('state');
    const error = urlObj.searchParams.get('error');

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

    // 토큰으로 교환
    const result = await exchangeCodeForTokenAndUpdateSubscription(code);
    return result;
  } catch (error) {
    console.error('Failed to handle auth redirect:', error);
    return {
      success: false,
      error: error.message || 'Unknown error'
    };
  }
}

/**
 * 인증 코드를 토큰으로 교환합니다
 * @param {string} code - OAuth 인증 코드
 * @returns {Promise<Object>} 토큰 교환 결과
 */
async function exchangeCodeForToken(code) {
  try {
    console.log('인증 코드를 토큰으로 교환 시작:', code.substring(0, 8) + '...');

    // 토큰 요청 데이터 준비
    const data = new URLSearchParams();
    data.append('grant_type', 'authorization_code');
    data.append('code', code);
    data.append('client_id', CLIENT_ID);
    data.append('client_secret', CLIENT_SECRET);
    data.append('redirect_uri', REDIRECT_URI);

    console.log('토큰 요청 URL:', OAUTH_TOKEN_URL);
    console.log('요청 데이터:', {
      grant_type: 'authorization_code',
      code: code.substring(0, 8) + '...',
      client_id: CLIENT_ID,
      redirect_uri: REDIRECT_URI
    });

    // 토큰 요청
    const response = await axios.post(OAUTH_TOKEN_URL, data, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    console.log('토큰 요청 성공! 응답 상태:', response.status);
    const { access_token, refresh_token, expires_in } = response.data;

    console.log('액세스 토큰 수신:', access_token ? (access_token.substring(0, 15) + '...') : 'none');
    console.log('리프레시 토큰 수신:', refresh_token ? 'yes' : 'no');
    console.log('만료 시간:', expires_in || 'not specified');

    // 토큰 저장
    if (!access_token) {
      console.error('서버에서 액세스 토큰을 반환하지 않음!');
      return {
        success: false,
        error: 'No access token returned from server'
      };
    }

    // 메모리와 안전한 저장소에 토큰 저장
    currentToken = access_token; // 먼저 메모리에 저장
    await storeToken(access_token);
    console.log('액세스 토큰 저장 완료');

    // 리프레시 토큰 저장 (있는 경우)
    if (refresh_token) {
      currentRefreshToken = refresh_token; // 먼저 메모리에 저장
      await storeRefreshToken(refresh_token);
      console.log('리프레시 토큰 저장 완료');
    }

    // 토큰이 정상적으로 저장되었는지 검증
    const storedToken = await getStoredToken();
    if (!storedToken) {
      console.error('토큰 저장 확인 실패. 저장소에서 토큰을 찾을 수 없음');
    } else {
      console.log('토큰 저장 확인 성공');
    }

    return {
      success: true,
      access_token: access_token,
      refresh_token: refresh_token,
      expires_in: expires_in
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
 * @returns {Promise<object>} 토큰 새로고침 결과 (success: boolean, error?: string)
 */
async function refreshAccessToken() {
  try {
    console.log('토큰 리프레시 프로세스 시작');

    // 리프레시 토큰 가져오기
    const refreshToken = currentRefreshToken || await getStoredRefreshToken();

    if (!refreshToken) {
      console.error('리프레시 토큰이 없음');
      return {
        success: false,
        error: 'No refresh token available'
      };
    }

    console.log('리프레시 토큰 존재, 교환 시도 중');

    // 토큰 갱신 요청 데이터 준비
    const data = new URLSearchParams();
    data.append('grant_type', 'refresh_token');
    data.append('refresh_token', refreshToken);
    data.append('client_id', CLIENT_ID);
    data.append('client_secret', CLIENT_SECRET);

    // 요청 데이터 로깅 (민감 정보 제외)
    console.log('토큰 리프레시 요청:', {
      url: OAUTH_TOKEN_URL,
      grant_type: 'refresh_token',
      client_id: CLIENT_ID
    });

    // 401 리프레시 실패 시에도 토큰 초기화 없이 진행
    try {
      // 토큰 갱신 요청
      const response = await axios.post(OAUTH_TOKEN_URL, data, {
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
          error: 'No access token in response'
        };
      }

      console.log('새 액세스 토큰 수신:', access_token.substring(0, 10) + '...');

      // 새 토큰 저장
      currentToken = access_token; // 먼저 메모리에 저장
      await storeToken(access_token);
      console.log('새 액세스 토큰 저장 완료');

      // 새 리프레시 토큰 저장 (있는 경우)
      if (refresh_token) {
        currentRefreshToken = refresh_token; // 먼저 메모리에 저장
        await storeRefreshToken(refresh_token);
        console.log('새 리프레시 토큰 저장 완료');
      }

      return { success: true };
    } catch (tokenRequestError) {
      console.error('토큰 갱신 요청 실패:', tokenRequestError.message);
      console.log('상태 코드:', tokenRequestError.response?.status);

      if (tokenRequestError.response?.status === 401) {
        console.log('리프레시 토큰이 만료되었습니다. 재로그인 필요');

        // 리프레시 토큰 만료 시 토큰 초기화
        await clearTokens();
        console.log('만료된 토큰 초기화 완료');
      }

      const errorMessage = tokenRequestError.response?.data?.error ||
                         tokenRequestError.message ||
                         'Unknown error during token refresh';

      console.log('오류 메시지:', errorMessage);
      return {
        success: false,
        error: errorMessage
      };
    }
  } catch (error) {
    console.error('토큰 리프레시 과정 중 예외 발생:', error);

    // 치명적인 오류이지만 앱 실행은 유지
    const errorMessage = error.message || 'Unknown error in refresh token process';
    return {
      success: false,
      error: errorMessage
    };
  }
}

/**
 * 로그아웃 처리 (토큰 무효화)
 * @returns {Promise<boolean>} 로그아웃 성공 여부
 */
async function logout() {
  try {
    const token = currentToken || await getStoredToken();

    if (token) {
      // 토큰 무효화 요청
      try {
        const data = new URLSearchParams();
        data.append('token', token);
        data.append('client_id', CLIENT_ID);
        data.append('client_secret', CLIENT_SECRET);

        await axios.post(OAUTH_REVOKE_URL, data, {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        });
      } catch (revokeError) {
        console.error('Failed to revoke token:', revokeError);
        // 토큰 무효화에 실패하더라도 계속 진행
      }
    }

    // 로컬 토큰 삭제
    await clearTokens();

    return true;
  } catch (error) {
    console.error('Logout error:', error);
    return false;
  }
}

/**
 * API 요청을 위한 헤더를 생성합니다
 * @returns {Promise<Object>} 인증 헤더를 포함한 요청 헤더
 */
async function getAuthHeaders() {
  // 현재 토큰이 없으면 저장소에서 가져오기
  if (!currentToken) {
    currentToken = await getStoredToken();
  }

  if (!currentToken) {
    throw new Error('No authentication token available');
  }

  return {
    'Authorization': `Bearer ${currentToken}`,
    'Content-Type': 'application/json'
  };
}

/**
 * 인증이 필요한 API 호출을 처리하는 함수
 * @param {Function} apiCall - API 호출 함수
 * @param {Object} options - 옵션
 * @param {boolean} options.allowUnauthenticated - 인증 실패 시 기본값 반환 허용
 * @param {Object} options.defaultValue - 인증 실패 시 반환할 기본값
 * @returns {Promise<any>} API 응답
 */
async function authenticatedRequest(apiCall, options = {}) {
  const {
    allowUnauthenticated = false,
    defaultValue = null,
    isSubscriptionRequest = false
  } = options;

  // 인증된 API 요청 준비 및 토큰 상태 확인
  if (!currentToken) {
    const storedToken = await getStoredToken();
    if (storedToken) {
      console.log('저장된 토큰을 메모리로 로드');
      currentToken = storedToken;
    } else {
      console.error('액세스 토큰이 없음: 메모리와 안전 저장소 모두 확인 실패');

      // 인증 허용 설정이면 기본값 반환
      if (allowUnauthenticated && defaultValue) {
        console.log('인증 없이 기본값 반환');
        return defaultValue;
      }

      return {
        error: {
          code: 'NO_TOKEN',
          message: '인증 정보가 없습니다. 로그인이 필요합니다.'
        }
      };
    }
  }

  // 구독 API에 대한 기본 응답
  const defaultSubscriptionResponse = {
    active: false,
    plan: 'free',
    status: 'active',
    features: ['basic_shortcuts', 'standard_actions'],
    expiresAt: null
  };

  try {
    // API 호출 시도
    const result = await apiCall();
    return result;
  } catch (error) {
    console.log('API 호출 오류:', error.response?.status, error.message);
    console.log('오류 URL:', error.config?.url);

    // 401 오류 (Unauthorized) 특별 처리
    if (error.response && error.response.status === 401) {
      console.log('401 오류 발생, 토큰 문제 감지');

      // 구독 API 요청이거나 isSubscriptionRequest 플래그가 설정된 경우
      if (isSubscriptionRequest ||
          (error.config && error.config.url && error.config.url.includes('/users/subscription'))) {
        console.log('구독 API 401 응답을 기본 인증 사용자로 처리');
        // 기본 구독 정보 반환 (인증은 되었으나 구독은 없음)
        return defaultSubscriptionResponse;
      }

      // 토큰 갱신 시도
      console.log('토큰 갱신 시도 시작');
      let refreshSuccess = false;

      try {
        const refreshResult = await refreshAccessToken();
        refreshSuccess = refreshResult.success;

        if (refreshSuccess) {
          console.log('토큰 갱신 성공, API 재호출');
          try {
            // 갱신된 토큰으로 API 호출 재시도
            return await apiCall();
          } catch (retryError) {
            console.error('토큰 갱신 후 API 재호출 실패:', retryError.message);

            // 재시도 실패 시 구독 API라면 기본 응답 반환
            if (isSubscriptionRequest ||
                (retryError.config && retryError.config.url &&
                 retryError.config.url.includes('/users/subscription'))) {
              console.log('재시도 실패했지만 구독 API이므로 기본 응답 반환');
              return defaultSubscriptionResponse;
            }

            // 그 외 API는 오류 전파
            throw retryError;
          }
        }

        // 토큰 갱신 실패
        console.error('토큰 갱신 실패:', refreshResult.error);
      } catch (refreshError) {
        console.error('토큰 갱신 중 예외 발생:', refreshError);
      }

      // 토큰 갱신에 실패했거나 예외가 발생한 경우

      // 구독 API 요청이거나 unAuthenticated 허용 설정이면 기본값 반환
      if (isSubscriptionRequest ||
          (error.config && error.config.url && error.config.url.includes('/users/subscription'))) {
        console.log('토큰 갱신 실패했지만 구독 API이므로 기본 응답 반환');
        return defaultSubscriptionResponse;
      }

      if (allowUnauthenticated && defaultValue) {
        console.log('토큰 갱신 실패, 기본값으로 응답');
        return defaultValue;
      }

      // 그 외 API는 오류 객체 반환
      return {
        error: {
          code: 'AUTH_ERROR',
          message: '인증 세션이 만료되었습니다. 다시 로그인해 주세요.',
          originalError: refreshSuccess ? '토큰 갱신 후 API 호출 실패' : '토큰 갱신 실패'
        }
      };
    }

    // 구독 API에 대한 모든 유형의 오류 처리
    if (isSubscriptionRequest ||
        (error.config && error.config.url && error.config.url.includes('/users/subscription'))) {
      console.log('구독 API 일반 오류를 기본 인증 사용자로 처리');
      // 기본 구독 정보 반환 (인증은 되었으나 구독은 없음)
      return defaultSubscriptionResponse;
    }

    // allowUnauthenticated 설정이면 기본값 반환
    if (allowUnauthenticated && defaultValue) {
      console.log('오류 발생, 기본값으로 응답');
      return defaultValue;
    }

    // 다른 오류는 자세한 오류 객체로 반환
    console.error('처리되지 않은 API 오류:', error.message);
    return {
      error: {
        code: error.response?.status ? `HTTP_${error.response.status}` : 'API_ERROR',
        message: error.message,
        statusCode: error.response?.status,
        url: error.config?.url
      }
    };
  }
}

/**
 * 사용자 프로필 정보를 가져옵니다
 * @returns {Promise<Object>} 사용자 프로필 정보
 */
async function fetchUserProfile() {
  return authenticatedRequest(async () => {
    const headers = await getAuthHeaders();
    console.log('프로필 API 호출:', USER_PROFILE_URL);
    console.log('사용 중인 인증 헤더:', {
      authorization: headers.Authorization ? `Bearer ${headers.Authorization.substring(7, 15)}...` : 'none',
      contentType: headers['Content-Type']
    });

    const response = await axios.get(USER_PROFILE_URL, { headers });
    console.log('프로필 API 응답 상태:', response.status);
    return response.data;
  });
}

/**
 * 구독 정보를 가져옵니다
 * @returns {Promise<Object>} 구독 정보
 */
async function fetchSubscription() {
  // 기본 구독 정보 (인증 실패나 오류 발생 시 사용)
  const defaultSubscription = {
    active: false,
    plan: 'free',
    status: 'active',
    features: ['basic_shortcuts', 'standard_actions'],
    expiresAt: null,
    isVip: false
  };

  // 인증이 안된 경우 바로 기본 구독 정보 반환
  if (!currentToken && !(await getStoredToken())) {
    console.log('토큰 없음: 기본 무료 구독 정보 반환');
    return defaultSubscription;
  }

  // authenticatedRequest 함수 사용하여 API 호출 (오류 처리 내장)
  return authenticatedRequest(async () => {
    const headers = await getAuthHeaders();
    console.log('구독 정보 API 호출:', USER_SUBSCRIPTION_URL);
    console.log('사용 중인 인증 헤더:', {
      authorization: headers.Authorization ? `Bearer ${headers.Authorization.substring(7, 15)}...` : 'none',
      contentType: headers['Content-Type']
    });

    const response = await axios.get(USER_SUBSCRIPTION_URL, { headers });
    console.log('구독 정보 API 응답 상태:', response.status);
    console.log('구독 정보 API 응답 헤더:', response.headers);

    if (!response.data) {
      console.log('응답에 데이터 없음');
      return defaultSubscription;
    }

    // API 포맷: { success: true, data: {...} }
    if (response.data.success === false) {
      console.log('API 오류 응답:', response.data.error);
      return defaultSubscription;
    }

    // 응답 구조 확인 및 정규화
    // 웹에서는 apiSuccess({...}) 형태로 응답하므로 data.data 또는 data 구조 모두 처리
    let subscriptionData = {};

    if (response.data.success === true && response.data.data) {
      // toast-web의 apiSuccess 형식 응답: { success: true, data: {...} }
      console.log('apiSuccess 형식 응답 확인됨');
      subscriptionData = response.data.data;
    } else if (typeof response.data === 'object') {
      // 직접 객체를 반환하는 형식
      console.log('직접 객체 반환 형식 응답 확인됨');
      subscriptionData = response.data;
    } else {
      // 알 수 없는 형식은 기본값 사용
      console.log('알 수 없는 응답 형식, 기본값 사용');
      return defaultSubscription;
    }
    console.log('구독 정보 수신:', subscriptionData.plan || 'unknown',
                'VIP:', subscriptionData.isVip || false);

    // VIP이거나 활성화된 구독이 있는 경우 페이지 그룹 수를 9로 설정
    const isActive = subscriptionData.active === true;
    const isVip = subscriptionData.isVip === true;
    const isPremium = isActive &&
                     (subscriptionData.plan === 'premium' ||
                      subscriptionData.plan === 'pro' ||
                      isVip);

    if (isPremium) {
      console.log('프리미엄 또는 VIP 사용자 구독 혜택 적용');
      subscriptionData.pageGroups = 9;
    } else {
      console.log('일반 인증 사용자 기본 혜택 적용');
      subscriptionData.pageGroups = 3;
    }

    return subscriptionData;
  }, {
    allowUnauthenticated: true,
    defaultValue: defaultSubscription,
    isSubscriptionRequest: true
  });
}

/**
 * OAuth 리디렉션을 처리하는 프로토콜 핸들러 등록
 */
function registerProtocolHandler() {
  // 이미 등록된 프로토콜인지 확인
  if (process.defaultApp) {
    // 개발 모드에서는 앱 인수에 URL 스킴을 명시적으로 추가
    if (process.argv.length >= 2) {
      app.setAsDefaultProtocolClient('toast-app', process.execPath, [
        path.resolve(process.argv[1])
      ]);
    }
  } else {
    // 프로덕션 빌드에서는 간단하게 등록
    app.setAsDefaultProtocolClient('toast-app');
  }
}

/**
 * 현재 토큰 상태를 확인합니다
 * @returns {Promise<boolean>} 유효한 토큰이 있으면 true
 */
async function hasValidToken() {
  try {
    if (!currentToken) {
      currentToken = await getStoredToken();
    }

    return !!currentToken;
  } catch (error) {
    console.error('Error checking token validity:', error);
    return false;
  }
}

/**
 * 현재 액세스 토큰을 반환합니다
 * @returns {Promise<string|null>} 현재 액세스 토큰 또는 null
 */
async function getAccessToken() {
  if (!currentToken) {
    currentToken = await getStoredToken();
  }

  return currentToken;
}

/**
 * 인증 상태와 구독 정보에 따라 페이지 그룹 개수를 업데이트합니다
 * @returns {Promise<Object>} 업데이트된 구독 정보 (성공 여부 포함)
 */
async function updatePageGroupSettings() {
  try {
    console.log('페이지 그룹 설정 업데이트 시작');
    const config = createConfigStore();

    // 토큰 유효성 체크
    if (!currentToken) {
      currentToken = await getStoredToken();
    }

    const isAuthenticated = !!currentToken;
    console.log('토큰 검증 결과:', isAuthenticated ? '토큰 있음' : '토큰 없음');

    // 사용자 권한별 페이지 그룹 수 설정:
    // 1. 인증되지 않은 사용자: 1개 페이지
    // 2. 인증된 사용자: 3개 페이지
    // 3. 구독 또는 VIP 사용자: 9개 페이지

    // 기본값 설정: 인증되지 않은 사용자는 1개 페이지
    let pageGroups = 1;
    let isSubscribed = false;
    let subscribedUntil = '';
    let authError = false;

    // 인증된 사용자인 경우
    if (isAuthenticated) {
      // 인증된 상태 설정 (기본 3개 페이지)
      pageGroups = 3;
      console.log('인증된 사용자: 기본 3개 페이지 설정');

      try {
        // 구독 정보 가져오기
        console.log('구독 정보 조회 시작');
        const subscription = await fetchSubscription();
        console.log('구독 정보 조회 결과:', subscription);

        // 구독 정보가 오류 객체인지 확인
        if (subscription && subscription.error) {
          // 인증 오류인 경우
          if (subscription.error.code === 'AUTH_ERROR') {
            console.error('구독 정보 조회 중 인증 오류:', subscription.error.message);
            console.log('인증 오류이지만 기본 사용자로 유지 (3개 페이지)');
            // 인증 오류가 있지만 이미 토큰이 있으므로 인증 상태는 유지
            // 구독 혜택만 제외
          } else {
            console.error('구독 정보 조회 중 일반 오류:', subscription.error);
            // 다른 오류는 인증된 사용자 기본값 유지 (3개 페이지)
          }
        } else if (subscription && (subscription.active === true || subscription.is_subscribed === true)) {
          // 구독 활성화 여부 확인 (active 또는 is_subscribed 필드로)
          console.log('활성 구독 발견: 9개 페이지 설정');
          isSubscribed = true;

          // subscribed_until 또는 expiresAt 필드 확인
          subscribedUntil = subscription.subscribed_until || subscription.expiresAt || '';

          // page_groups 필드가 있으면 사용, 없으면 구독자에게 9페이지 제공
          if (subscription.features && subscription.features.page_groups) {
            pageGroups = subscription.features.page_groups;
            console.log(`페이지 그룹 수를 서버에서 제공한 ${pageGroups}로 설정`);
          } else {
            pageGroups = 9; // 구독자 또는 VIP 사용자는 9개 페이지
          }
        } else {
          console.log('활성 구독 없음: 기본 인증 사용자 유지 (3개 페이지)');
        }
      } catch (error) {
        console.error('구독 정보 조회 중 예외 발생:', error);
        console.log('구독 정보 오류이지만 기본 사용자로 유지 (3개 페이지)');
        // 구독 정보 오류가 있어도 인증된 사용자로 간주 (기본 3페이지)
        // 최소한의 기능을 계속 제공
      }
    } else {
      console.log('비인증 사용자: 1개 페이지로 설정');
    }

    // 구성 파일 업데이트
    const subscriptionSettings = {
      isAuthenticated,
      isSubscribed,
      subscribedUntil,
      pageGroups
    };

    console.log('최종 구독 설정:', subscriptionSettings);
    config.set('subscription', subscriptionSettings);

    console.log(`Page group settings updated: authenticated=${isAuthenticated}, subscribed=${isSubscribed}, pages=${pageGroups}`);

    return {
      success: true,
      isAuthenticated,
      isSubscribed,
      subscribedUntil,
      pageGroups,
      authError
    };
  } catch (error) {
    console.error('페이지 그룹 설정 업데이트 실패:', error);
    // 오류 시에도 기본 설정으로 응답
    return {
      success: true,
      isAuthenticated: !!currentToken,
      isSubscribed: false,
      subscribedUntil: '',
      pageGroups: currentToken ? 3 : 1,
      error: error.message || 'Unknown error updating page group settings'
    };
  }
}

/**
 * 인증 코드를 토큰으로 교환하고 구독 상태를 업데이트합니다
 * @param {string} code - OAuth 인증 코드
 * @returns {Promise<Object>} 토큰 교환 및 구독 업데이트 결과
 */
async function exchangeCodeForTokenAndUpdateSubscription(code) {
  try {
    console.log('인증 코드 처리 및 구독 업데이트 시작');

    // 1. 먼저 토큰 교환
    console.log('1단계: 코드를 토큰으로 교환');
    const tokenResult = await exchangeCodeForToken(code);

    if (!tokenResult.success) {
      console.error('토큰 교환 실패:', tokenResult.error);
      return tokenResult;
    }

    console.log('토큰 교환 성공, 토큰 받음');

    // 토큰이 잘 저장되었는지 한번 더 확인
    if (!currentToken) {
      console.log('현재 메모리에 토큰이 없어 저장소에서 확인');
      currentToken = await getStoredToken();

      if (!currentToken) {
        console.error('토큰이 제대로 저장되지 않음! 오류 반환');
        return {
          success: false,
          error: '인증 토큰 저장에 실패했습니다.'
        };
      }
    }

    // 2. 지연을 두고 페이지 그룹 설정 업데이트
    console.log('2단계: 페이지 그룹 설정 업데이트 (약간의 지연 후)');

    // 서버에 구독 정보가 반영될 시간을 확보하기 위해 잠시 지연
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 구독 정보 및 페이지 그룹 설정 업데이트
    const updateResult = await updatePageGroupSettings();
    console.log('페이지 그룹 설정 업데이트 결과:', updateResult);

    // 페이지 그룹 설정이 실패해도 토큰은 이미 획득했으므로 성공으로 처리
    const response = {
      success: true,
      isAuthenticated: true,
      isSubscribed: updateResult.isSubscribed || false,
      subscribedUntil: updateResult.subscribedUntil || '',
      pageGroups: updateResult.pageGroups || 3 // 최소 기본값
    };

    console.log('최종 응답:', response);
    return response;
  } catch (error) {
    console.error('인증 코드 처리 중 예외 발생:', error);

    // 토큰은 얻었지만 구독 업데이트 과정에서 오류 발생
    // 그래도 인증은 성공했으므로 인증 성공으로 처리
    if (currentToken) {
      console.log('토큰은 있으므로 기본 인증 사용자로 처리');
      return {
        success: true,
        isAuthenticated: true,
        isSubscribed: false,
        pageGroups: 3,
        warning: '인증은 성공했지만 구독 정보 처리 중 오류가 발생했습니다.'
      };
    }

    // 정말 치명적인 오류
    return {
      success: false,
      error: error.message || '인증 처리 중 오류가 발생했습니다.',
      details: error.stack
    };
  }
}

/**
 * 로그아웃 후 페이지 그룹 설정을 초기화합니다
 * @returns {Promise<boolean>} 로그아웃 성공 여부
 */
async function logoutAndResetPageGroups() {
  try {
    // 로그아웃 처리
    const logoutSuccess = await logout();

    if (logoutSuccess) {
      // 페이지 그룹 설정 초기화
      const config = createConfigStore();
      config.set('subscription', {
        isAuthenticated: false,
        isSubscribed: false,
        subscribedUntil: '',
        pageGroups: 1
      });

      console.log('Logged out and reset page group settings to defaults');
    }

    return logoutSuccess;
  } catch (error) {
    console.error('Logout and reset page groups error:', error);
    return false;
  }
}

module.exports = {
  initiateLogin,
  exchangeCodeForToken,
  exchangeCodeForTokenAndUpdateSubscription,
  logout,
  logoutAndResetPageGroups,
  fetchUserProfile,
  fetchSubscription,
  registerProtocolHandler,
  handleAuthRedirect,
  hasValidToken,
  getAccessToken,
  updatePageGroupSettings
};
