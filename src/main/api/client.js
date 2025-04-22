/**
 * Toast API - API 클라이언트 기본 모듈
 *
 * 모든 API 호출의 기본이 되는 클라이언트 설정과 공통 함수를 제공합니다.
 */

const axios = require('axios');
const { getEnv } = require('../config/env');
const { DEFAULT_ANONYMOUS_SUBSCRIPTION } = require('../constants');

// 기본 URL 및 엔드포인트 설정
const TOAST_URL = getEnv('TOAST_URL', 'https://web.toast.sh');
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

/**
 * 인증이 필요한 API 요청 공통 처리 함수
 * @param {Function} apiCall - API 호출 함수
 * @param {Object} options - 옵션
 * @returns {Promise<any>} API 응답
 */
async function authenticatedRequest(apiCall, options = {}) {
  const {
    allowUnauthenticated = false,
    defaultValue = null,
    isSubscriptionRequest = false,
    onUnauthorized = null
  } = options;

  // 기본 구독 응답
  const defaultSubscription = DEFAULT_ANONYMOUS_SUBSCRIPTION;

  if (!currentToken) {
    console.error('액세스 토큰이 없음');

    if (allowUnauthenticated && defaultValue) {
      return defaultValue;
    }

    return {
      error: {
        code: 'NO_TOKEN',
        message: '인증 정보가 없습니다. 로그인이 필요합니다.'
      }
    };
  }

  try {
    return await apiCall();
  } catch (error) {
    console.log('API 호출 오류:', error.response?.status, error.message);

    // 401 오류 처리
    if (error.response && error.response.status === 401) {
      console.log('401 오류 발생, 토큰 문제 감지');

      // 구독 API 요청 특별 처리
      if (isSubscriptionRequest) {
        return defaultSubscription;
      }

      // 재인증 콜백 호출
      if (onUnauthorized && typeof onUnauthorized === 'function') {
        const refreshResult = await onUnauthorized();

        if (refreshResult && refreshResult.success) {
          try {
            return await apiCall();
          } catch (retryError) {
            console.error('토큰 갱신 후 API 재호출 실패:', retryError.message);
            throw retryError;
          }
        }
      }

      if (allowUnauthenticated && defaultValue) {
        return defaultValue;
      }
    }

    // 구독 API에 대한 모든 유형의 오류 처리
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
