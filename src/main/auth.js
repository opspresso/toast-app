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
const CLIENT_ID = getEnv('CLIENT_ID', process.env.NODE_ENV === 'production' ? '' : 'toast-app-client');
const CLIENT_SECRET = getEnv('CLIENT_SECRET', process.env.NODE_ENV === 'production' ? '' : 'toast-app-secret');

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

// 구독 등급에 따른 페이지 그룹 수 상수
const PAGE_GROUPS = {
  ANONYMOUS: 1, // 인증되지 않은 사용자
  AUTHENTICATED: 3, // 인증된 사용자
  PREMIUM: 9 // 구독 또는 VIP 사용자
};

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
        error: 'No refresh token available',
        code: 'NO_REFRESH_TOKEN'
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
          error: 'No access token in response',
          code: 'NO_ACCESS_TOKEN'
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

  // 구독 API에 대한 기본 응답
  const defaultSubscriptionResponse = {
    active: false,
    is_subscribed: false,
    plan: 'free',
    status: 'active',
    features: {
      page_groups: PAGE_GROUPS.ANONYMOUS
    },
    features_array: ['basic_shortcuts'],
    expiresAt: null,
    subscribed_until: null,
    isVip: false
  };

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
        return {
          ...defaultSubscriptionResponse,
          features: {
            page_groups: PAGE_GROUPS.AUTHENTICATED
          },
          features_array: ['basic_shortcuts', 'standard_actions']
        };
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
              return {
                ...defaultSubscriptionResponse,
                features: {
                  page_groups: PAGE_GROUPS.AUTHENTICATED
                },
                features_array: ['basic_shortcuts', 'standard_actions']
              };
            }

            // 그 외 API는 오류 전파
            throw retryError;
          }
        }

        // 토큰 갱신 실패
        console.error('토큰 갱신 실패:', refreshResult.error);

        // 재로그인이 필요한 경우
        if (refreshResult.requireRelogin) {
          return {
            error: {
              code: 'SESSION_EXPIRED',
              message: '로그인 세션이 만료되었습니다. 다시 로그인해 주세요.',
              requireRelogin: true
            }
          };
        }
      } catch (refreshError) {
        console.error('토큰 갱신 중 예외 발생:', refreshError);
      }

      // 토큰 갱신에 실패했거나 예외가 발생한 경우

      // 구독 API 요청이거나 unAuthenticated 허용 설정이면 기본값 반환
      if (isSubscriptionRequest ||
          (error.config && error.config.url && error.config.url.includes('/users/subscription'))) {
        console.log('토큰 갱신 실패했지만 구독 API이므로 기본 응답 반환');
        return {
          ...defaultSubscriptionResponse,
          features: {
            page_groups: PAGE_GROUPS.AUTHENTICATED
          },
          features_array: ['basic_shortcuts', 'standard_actions']
        };
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
          originalError: refreshSuccess ? '토큰 갱신 후 API 호출 실패' : '토큰 갱신 실패',
          requireRelogin: true
        }
      };
    }

    // 구독 API에 대한 모든 유형의 오류 처리
    if (isSubscriptionRequest ||
        (error.config && error.config.url && error.config.url.includes('/users/subscription'))) {
      console.log('구독 API 일반 오류를 기본 인증 사용자로 처리');
      // 기본 구독 정보 반환 (인증은 되었으나 구독은 없음)
      return {
        ...defaultSubscriptionResponse,
        features: {
          page_groups: PAGE_GROUPS.AUTHENTICATED
        },
        features_array: ['basic_shortcuts', 'standard_actions']
      };
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

    // API 응답 형식이 apiSuccess({ ... }) 형태인 경우 data 필드 추출
    if (response.data && response.data.success === true && response.data.data) {
      return response.data.data;
    }

    return response.data;
  });
}

/**
 * 구독 정보를 가져옵니다
 * @returns {Promise<Object>} 구독 정보
 */
async function fetchSubscription() {
  // 구독 API에 대한 기본 응답 (인증 실패나 오류 발생 시 사용)
  const defaultSubscription = {
    id: 'sub_free_anonymous',
    userId: 'anonymous',
    plan: 'free',
    status: 'active',
    active: false,
    is_subscribed: false,
    features: {
      page_groups: PAGE_GROUPS.ANONYMOUS
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
    isSubscriptionRequest: true
  };

  return authenticatedRequest(async () => {
    try {
      const headers = await getAuthHeaders();
      console.log('구독 API 호출:', USER_SUBSCRIPTION_URL);

      const response = await axios.get(USER_SUBSCRIPTION_URL, { headers });
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
        subscribed_until: subscriptionData.subscribed_until || subscriptionData.expiresAt || null
      };

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
 * 인증 코드를 토큰으로 교환하고 구독 정보를 업데이트합니다
 * @param {string} code - OAuth 인증 코드
 * @returns {Promise<Object>} 처리 결과
 */
async function exchangeCodeForTokenAndUpdateSubscription(code) {
  try {
    // 토큰 교환
    const tokenResult = await exchangeCodeForToken(code);
    if (!tokenResult.success) {
      return tokenResult;
    }

    // 구독 정보 가져오기
    try {
      const subscription = await fetchSubscription();
      console.log('구독 정보 조회 성공');

      // 구독 정보를 config에 저장
      await updatePageGroupSettings(subscription);

      return {
        success: true,
        subscription
      };
    } catch (subError) {
      console.error('구독 정보 조회 실패:', subError);

      // 토큰 교환은 성공했으므로 성공으로 처리하고 경고만 함
      return {
        success: true,
        warning: '로그인은 성공했으나 구독 정보를 가져오지 못했습니다.',
        error_details: subError.message
      };
    }
  } catch (error) {
    console.error('인증 코드 교환 및 구독 업데이트 중 오류 발생:', error);
    return {
      success: false,
      error: error.message || '인증 처리 중 오류가 발생했습니다.',
      details: error.stack
    };
  }
}

/**
 * URI 프로토콜 핸들러를 등록합니다 (toast-app:// 프로토콜)
 * @returns {void}
 */
function registerProtocolHandler() {
  if (process.platform === 'darwin' || process.platform === 'win32') {
    app.setAsDefaultProtocolClient('toast-app');
  }
}

/**
 * 유효한 액세스 토큰이 있는지 확인합니다
 * @returns {Promise<boolean>} 토큰이 있으면 true
 */
async function hasValidToken() {
  try {
    const token = currentToken || await getStoredToken();
    return !!token;
  } catch (error) {
    console.error('Token validation error:', error);
    return false;
  }
}

/**
 * 현재 액세스 토큰을 가져옵니다
 * @returns {Promise<string|null>} 액세스 토큰 또는 null
 */
async function getAccessToken() {
  return currentToken || await getStoredToken();
}

/**
 * 구독 정보에 따라 페이지 그룹 설정을 업데이트합니다
 * @param {Object} subscription - 구독 정보
 * @returns {Promise<void>}
 */
async function updatePageGroupSettings(subscription) {
  try {
    const config = createConfigStore();

    // 활성 상태 및 구독 여부 확인
    const isActive = subscription.active || subscription.is_subscribed || false;
    const isVip = subscription.isVip || false;

    // 페이지 그룹 수 계산
    let pageGroups = PAGE_GROUPS.ANONYMOUS;
    if (isActive || isVip) {
      if (subscription.plan === 'premium' || subscription.plan === 'pro' || isVip) {
        pageGroups = PAGE_GROUPS.PREMIUM;
      } else {
        pageGroups = PAGE_GROUPS.AUTHENTICATED;
      }
    } else if (subscription.userId && subscription.userId !== 'anonymous') {
      // 비활성 사용자지만 로그인은 된 경우
      pageGroups = PAGE_GROUPS.AUTHENTICATED;
    }

    // 구독 정보 저장
    // subscribedUntil 값이 항상 문자열인지 확인
    let subscribedUntilStr = '';
    if (subscription.subscribed_until) {
      subscribedUntilStr = String(subscription.subscribed_until);
    } else if (subscription.expiresAt) {
      subscribedUntilStr = String(subscription.expiresAt);
    }

    config.set('subscription', {
      isAuthenticated: true,
      isSubscribed: isActive,
      plan: subscription.plan || 'free',
      subscribedUntil: subscribedUntilStr,
      pageGroups: subscription.features?.page_groups || pageGroups,
      isVip: isVip,
      additionalFeatures: {
        advancedActions: subscription.features?.advanced_actions || false,
        cloudSync: subscription.features?.cloud_sync || false
      }
    });

    console.log('구독 설정 업데이트 완료:', {
      isAuthenticated: true,
      isSubscribed: isActive,
      plan: subscription.plan || 'free',
      pageGroups: subscription.features?.page_groups || pageGroups
    });
  } catch (error) {
    console.error('페이지 그룹 설정 업데이트 오류:', error);
    throw error;
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
