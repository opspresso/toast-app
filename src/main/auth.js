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

// API 엔드포인트
const API_BASE_URL = 'https://web.toast.sh/api';
const OAUTH_AUTHORIZE_URL = 'https://web.toast.sh/api/oauth/authorize';
const OAUTH_TOKEN_URL = `${API_BASE_URL}/oauth/token`;
const OAUTH_REVOKE_URL = `${API_BASE_URL}/oauth/revoke`;
const USER_PROFILE_URL = `${API_BASE_URL}/users/profile`;
const USER_SUBSCRIPTION_URL = `${API_BASE_URL}/users/subscription`;

// OAuth 설정
const { getEnv } = require('./config/env');
const CLIENT_ID = getEnv('CLIENT_ID', 'toast-app-client');
const CLIENT_SECRET = getEnv('CLIENT_SECRET', 'toast-app-secret');
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

/**
 * 로그인 프로세스를 시작합니다 (OAuth 인증 페이지 열기)
 * @returns {Promise<boolean>} 프로세스가 시작되었으면 true
 */
async function initiateLogin() {
  try {
    // 상태 값은 CSRF 공격 방지를 위해 사용됨
    const state = uuidv4();

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
 * 인증 코드를 토큰으로 교환합니다
 * @param {string} code - OAuth 인증 코드
 * @returns {Promise<Object>} 토큰 교환 결과
 */
async function exchangeCodeForToken(code) {
  try {
    // 토큰 요청 데이터 준비
    const data = new URLSearchParams();
    data.append('grant_type', 'authorization_code');
    data.append('code', code);
    data.append('client_id', CLIENT_ID);
    data.append('client_secret', CLIENT_SECRET);
    data.append('redirect_uri', REDIRECT_URI);

    // 토큰 요청
    const response = await axios.post(OAUTH_TOKEN_URL, data, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    const { access_token, refresh_token, expires_in } = response.data;

    // 토큰 저장
    await storeToken(access_token);

    // 리프레시 토큰 저장 (있는 경우)
    if (refresh_token) {
      await storeRefreshToken(refresh_token);
    }

    return { success: true };
  } catch (error) {
    console.error('Failed to exchange code for token:', error);
    return {
      success: false,
      error: error.response?.data?.error || error.message
    };
  }
}

/**
 * 리프레시 토큰을 사용하여 새 액세스 토큰을 얻습니다
 * @returns {Promise<object>} 토큰 새로고침 결과 (success: boolean, error?: string)
 */
async function refreshAccessToken() {
  try {
    // 리프레시 토큰 가져오기
    const refreshToken = currentRefreshToken || await getStoredRefreshToken();

    if (!refreshToken) {
      console.error('No refresh token available');
      return {
        success: false,
        error: 'No refresh token available'
      };
    }

    // 토큰 갱신 요청 데이터 준비
    const data = new URLSearchParams();
    data.append('grant_type', 'refresh_token');
    data.append('refresh_token', refreshToken);
    data.append('client_id', CLIENT_ID);
    data.append('client_secret', CLIENT_SECRET);

    // 토큰 갱신 요청
    const response = await axios.post(OAUTH_TOKEN_URL, data, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    const { access_token, refresh_token } = response.data;

    // 새 토큰 저장
    await storeToken(access_token);

    // 새 리프레시 토큰 저장 (있는 경우)
    if (refresh_token) {
      await storeRefreshToken(refresh_token);
    }

    return { success: true };
  } catch (error) {
    console.error('Failed to refresh access token:', error);
    const errorMessage = error.response?.data?.error || error.message || 'Unknown error';
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
 * @returns {Promise<any>} API 응답
 */
async function authenticatedRequest(apiCall) {
  try {
    // API 호출 시도
    return await apiCall();
  } catch (error) {
    // 토큰이 만료된 경우 (401 Unauthorized)
    if (error.response && error.response.status === 401) {
      // 토큰 갱신 시도
      const refreshResult = await refreshAccessToken();

      if (refreshResult.success) {
        // 갱신된 토큰으로 API 호출 재시도
        return await apiCall();
      } else {
        // 토큰 갱신 실패 - 상세 에러 메시지 포함
        console.error('Token refresh failed:', refreshResult.error);
        // 사용자 재인증 필요 표시
        throw new Error(`Authentication failed: ${refreshResult.error}. Please login again.`);
      }
    }

    // 다른 오류는 그대로 전파
    throw error;
  }
}

/**
 * 사용자 프로필 정보를 가져옵니다
 * @returns {Promise<Object>} 사용자 프로필 정보
 */
async function fetchUserProfile() {
  return authenticatedRequest(async () => {
    const headers = await getAuthHeaders();
    const response = await axios.get(USER_PROFILE_URL, { headers });
    return response.data;
  });
}

/**
 * 구독 정보를 가져옵니다
 * @returns {Promise<Object>} 구독 정보
 */
async function fetchSubscription() {
  return authenticatedRequest(async () => {
    const headers = await getAuthHeaders();
    const response = await axios.get(USER_SUBSCRIPTION_URL, { headers });
    return response.data;
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
    const config = createConfigStore();
    const isAuthenticated = await hasValidToken();

    // 기본값 설정: 인증되지 않은 사용자는 1개 페이지
    let pageGroups = 1;
    let isSubscribed = false;
    let subscribedUntil = '';
    let authError = false;

    // 인증된 사용자인 경우
    if (isAuthenticated) {
      // 인증된 상태 설정 (최소 3개 페이지)
      pageGroups = 3;

      try {
        // 구독 정보 가져오기
        const subscription = await fetchSubscription();

        // 구독 정보가 오류 객체인지 확인
        if (subscription && subscription.error) {
          // 인증 오류인 경우
          if (subscription.error.code === 'AUTH_ERROR') {
            console.error('Authentication error during subscription update:', subscription.error.message);
            authError = true;
            // 인증 오류 시 비인증 상태로 설정
            isAuthenticated = false;
            pageGroups = 1;
          } else {
            console.error('Error fetching subscription info:', subscription.error);
            // 다른 오류는 인증된 사용자 기본값 유지
          }
        } else if (subscription && subscription.active) {
          // 구독 활성화 여부 확인
          isSubscribed = true;
          subscribedUntil = subscription.expiresAt || '';
          pageGroups = 9; // 구독자는 9개 페이지
        }
      } catch (error) {
        console.error('Error fetching subscription info:', error);

        // 인증 관련 오류인지 확인
        if (error.message && error.message.includes('Authentication failed')) {
          authError = true;
          // 인증 오류 시 비인증 상태로 설정
          isAuthenticated = false;
          pageGroups = 1;
        }
        // 다른 오류는 인증된 사용자 기본값 유지
      }
    }

    // 구성 파일 업데이트
    config.set('subscription', {
      isAuthenticated,
      isSubscribed,
      subscribedUntil,
      pageGroups
    });

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
    console.error('Failed to update page group settings:', error);
    return {
      success: false,
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
    // 토큰 교환
    const tokenResult = await exchangeCodeForToken(code);

    if (tokenResult.success) {
      // 구독 정보 및 페이지 그룹 설정 업데이트
      const updateResult = await updatePageGroupSettings();

      // 업데이트 결과 확인
      if (!updateResult.success) {
        console.error('Failed to update page group settings:', updateResult.error);
        return {
          success: true,
          warning: '토큰이 성공적으로 교환되었지만 구독 정보 업데이트 중 오류가 발생했습니다.'
        };
      }

      // 인증 오류가 있었는지 확인
      if (updateResult.authError) {
        console.error('Authentication error occurred during subscription update');
        return {
          success: false,
          error: '인증 세션이 만료되었습니다. 다시 로그인해 주세요.',
          authError: true
        };
      }

      // 업데이트 결과 합치기
      return {
        success: true,
        isAuthenticated: updateResult.isAuthenticated,
        isSubscribed: updateResult.isSubscribed,
        subscribedUntil: updateResult.subscribedUntil,
        pageGroups: updateResult.pageGroups
      };
    }

    return tokenResult;
  } catch (error) {
    console.error('Failed during token exchange and subscription update:', error);
    return {
      success: false,
      error: error.message || 'Unknown error during token exchange and subscription update'
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
  hasValidToken,
  getAccessToken,
  updatePageGroupSettings
};
