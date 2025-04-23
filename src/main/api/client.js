/**
 * Toast API - API 클라이언트 기본 모듈
 *
 * 모든 API 호출의 기본이 되는 클라이언트 설정과 공통 함수를 제공합니다.
 */

const axios = require('axios');
const { getEnv } = require('../config/env');
const { DEFAULT_ANONYMOUS_SUBSCRIPTION } = require('../constants');

// 기본 URL 및 엔드포인트 설정
const TOAST_URL = getEnv('TOAST_URL', 'https://app.toast.sh');
const API_BASE_URL = `${TOAST_URL}/api`;

// API 엔드포인트
const ENDPOINTS = {
  // OAuth 관련
  OAUTH_AUTHORIZE: `${API_BASE_URL}/oauth/authorize`,
  OAUTH_TOKEN: `${API_BASE_URL}/oauth/token`,
  OAUTH_REVOKE: `${API_BASE_URL}/oauth/revoke`,

  // 사용자 관련
  USER_PROFILE: `${API_BASE_URL}/users/profile`,
  // 구독 정보는 프로필 API로 통합됨

  // 설정 관련
  SETTINGS: `${API_BASE_URL}/users/settings`
};

// 토큰 관리 (메모리)
let currentToken = null;
let currentRefreshToken = null;

/**
 * 액세스 토큰 설정
 * @param {string} token - 설정할 액세스 토큰
 */
function setAccessToken(token) {
  currentToken = token;
}

/**
 * 리프레시 토큰 설정
 * @param {string} token - 설정할 리프레시 토큰
 */
function setRefreshToken(token) {
  currentRefreshToken = token;
}

/**
 * 현재 액세스 토큰 가져오기
 * @returns {string|null} 현재 액세스 토큰 또는 null
 */
function getAccessToken() {
  return currentToken;
}

/**
 * 현재 리프레시 토큰 가져오기
 * @returns {string|null} 현재 리프레시 토큰 또는 null
 */
function getRefreshToken() {
  return currentRefreshToken;
}

/**
 * 토큰 초기화 (로그아웃)
 */
function clearTokens() {
  currentToken = null;
  currentRefreshToken = null;
}

/**
 * API 요청을 위한 인증 헤더 생성
 * @returns {Object} 인증 헤더
 */
function getAuthHeaders() {
  if (!currentToken) {
    throw new Error('No authentication token available');
  }

  return {
    'Authorization': `Bearer ${currentToken}`,
    'Content-Type': 'application/json'
  };
}

/**
 * 기본 API 클라이언트 인스턴스 생성
 * @param {Object} options - axios 인스턴스 생성 옵션
 * @returns {AxiosInstance} axios 인스턴스
 */
function createApiClient(options = {}) {
  const defaultOptions = {
    baseURL: API_BASE_URL,
    timeout: 10000,
    headers: {
      'Content-Type': 'application/json'
    }
  };

  const clientOptions = { ...defaultOptions, ...options };
  return axios.create(clientOptions);
}

// Track token refresh attempts to prevent infinite loops
const tokenRefreshTracking = {
  requestsAfterRefresh: 0,
  maxRequestsAfterRefresh: 3, // Maximum allowed consecutive requests after refresh
  lastRefreshTime: 0,
  refreshCooldownMs: 10000 // 10 seconds minimum between refresh attempts
};

/**
 * Common function to handle authenticated API requests
 * @param {Function} apiCall - API call function
 * @param {Object} options - Options
 * @returns {Promise<any>} API response
 */
async function authenticatedRequest(apiCall, options = {}) {
  const {
    allowUnauthenticated = false,
    defaultValue = null,
    isSubscriptionRequest = false,
    onUnauthorized = null
  } = options;

  // Default subscription response
  const defaultSubscription = DEFAULT_ANONYMOUS_SUBSCRIPTION;

  if (!currentToken) {
    console.error('No access token available');

    if (allowUnauthenticated && defaultValue) {
      return defaultValue;
    }

    return {
      error: {
        code: 'NO_TOKEN',
        message: 'Authentication required. Please log in.'
      }
    };
  }

  try {
    return await apiCall();
  } catch (error) {
    console.log('API call error:', error.response?.status, error.message);

    // Handle 401 unauthorized error
    if (error.response && error.response.status === 401) {
      console.log('401 error detected, token issue suspected');

      // Special handling for subscription API requests
      if (isSubscriptionRequest) {
        return defaultSubscription;
      }

      // Prevent infinite refresh loops
      const now = Date.now();
      const timeSinceLastRefresh = now - tokenRefreshTracking.lastRefreshTime;

      if (timeSinceLastRefresh < tokenRefreshTracking.refreshCooldownMs) {
        console.warn(`Token refresh attempted too soon (${Math.floor(timeSinceLastRefresh / 1000)}s ago). Skipping to prevent loop.`);

        if (allowUnauthenticated && defaultValue) {
          return defaultValue;
        }

        return {
          error: {
            code: 'AUTH_REFRESH_RATE_LIMIT',
            message: 'Authentication refresh rate limit exceeded. Please try again later.'
          }
        };
      }

      if (tokenRefreshTracking.requestsAfterRefresh >= tokenRefreshTracking.maxRequestsAfterRefresh) {
        console.error(`Too many consecutive auth failures (${tokenRefreshTracking.requestsAfterRefresh}). Possible refresh loop detected.`);

        // Reset token to force re-login
        clearTokens();

        return {
          error: {
            code: 'AUTH_REFRESH_LOOP',
            message: 'Authentication failure loop detected. Please log in again.',
            requireRelogin: true
          }
        };
      }

      // Call re-authentication callback
      if (onUnauthorized && typeof onUnauthorized === 'function') {
        console.log('Attempting token refresh...');
        tokenRefreshTracking.lastRefreshTime = now;

        const refreshResult = await onUnauthorized();

        if (refreshResult && refreshResult.success) {
          try {
            // Increment counter for requests after refresh
            tokenRefreshTracking.requestsAfterRefresh++;

            const result = await apiCall();

            // Reset counter after successful request
            tokenRefreshTracking.requestsAfterRefresh = 0;

            return result;
          } catch (retryError) {
            console.error('API request failed after token refresh:', retryError.message);

            if (allowUnauthenticated && defaultValue) {
              return defaultValue;
            }

            return {
              error: {
                code: 'AUTH_REFRESH_FAILED',
                message: 'Authentication failed even after token refresh. Please log in again.',
                requireRelogin: true
              }
            };
          }
        } else {
          console.error('Token refresh failed:', refreshResult?.error || 'Unknown error');

          // Reset tokens on refresh failure
          clearTokens();

          return {
            error: {
              code: 'AUTH_REFRESH_FAILED',
              message: 'Failed to refresh authentication. Please log in again.',
              requireRelogin: true
            }
          };
        }
      }

      if (allowUnauthenticated && defaultValue) {
        return defaultValue;
      }
    }

    // Handle errors for subscription API
    if (isSubscriptionRequest) {
      return defaultSubscription;
    }

    if (allowUnauthenticated && defaultValue) {
      return defaultValue;
    }

    return {
      error: {
        code: error.response?.status ? `HTTP_${error.response.status}` : 'API_ERROR',
        message: error.message,
        statusCode: error.response?.status
      }
    };
  }
}

module.exports = {
  TOAST_URL,
  API_BASE_URL,
  ENDPOINTS,
  createApiClient,
  setAccessToken,
  setRefreshToken,
  getAccessToken,
  getRefreshToken,
  clearTokens,
  getAuthHeaders,
  authenticatedRequest
};
