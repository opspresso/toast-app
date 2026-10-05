/**
 * Toast API - API Client Base Module
 *
 * Provides client configuration and common functions for all API calls.
 */

const axios = require('axios');
const { version: APP_VERSION } = require('../../../package.json');
const { getEnv } = require('../config/env');
const { DEFAULT_ANONYMOUS_SUBSCRIPTION } = require('../constants');

// Base URL and endpoint configuration
const TOAST_URL = getEnv('TOAST_URL', 'https://toastapp.dev');
const API_BASE_URL = `${TOAST_URL}/api`;

// API endpoints
const ENDPOINTS = {
  // OAuth related
  OAUTH_AUTHORIZE: `${API_BASE_URL}/oauth/authorize`,
  OAUTH_TOKEN: `${API_BASE_URL}/oauth/token`,
  OAUTH_REVOKE: `${API_BASE_URL}/oauth/revoke`,

  // User related
  USER_PROFILE: `${API_BASE_URL}/users/profile`,
  // Subscription information is integrated with the profile API

  // Settings related
  SETTINGS: `${API_BASE_URL}/users/settings`,

  // Button icon upload
  USER_ICONS: `${API_BASE_URL}/users/icons`,
};

// Token management (in memory)
let currentToken = null;
let currentRefreshToken = null;
let sessionVersion = 0;

/**
 * Set access token
 * @param {string} token - Access token to set
 */
function setAccessToken(token, { refresh = false } = {}) {
  if (!refresh && token !== currentToken) {
    sessionVersion++;
  }
  currentToken = token;
}

/**
 * Set refresh token
 * @param {string} token - Refresh token to set
 */
function setRefreshToken(token) {
  currentRefreshToken = token;
}

/**
 * Get current access token
 * @returns {string|null} Current access token or null
 */
function getAccessToken() {
  return currentToken;
}

/**
 * Get current refresh token
 * @returns {string|null} Current refresh token or null
 */
function getRefreshToken() {
  return currentRefreshToken;
}

/**
 * Clear tokens (logout)
 */
function clearTokens() {
  sessionVersion++;
  currentToken = null;
  currentRefreshToken = null;
}

/**
 * Generate authentication headers for API requests
 * @returns {Object} Authentication headers
 */
function getAuthHeaders() {
  if (!currentToken) {
    throw new Error('No authentication token available');
  }

  return {
    Authorization: `Bearer ${currentToken}`,
    'Content-Type': 'application/json',
  };
}

/**
 * Create a base API client instance
 * @param {Object} options - Options for creating an axios instance
 * @returns {AxiosInstance} Axios instance
 */
function createApiClient(options = {}) {
  const defaultOptions = {
    baseURL: API_BASE_URL,
    timeout: 10000,
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const clientOptions = {
    ...defaultOptions,
    ...options,
    headers: {
      ...(options.headers || defaultOptions.headers),
      'X-Toast-App-Version': APP_VERSION,
    },
  };
  return axios.create(clientOptions);
}

/** Retry one unauthorized request after a shared refresh, within the same session. */
async function authenticatedRequest(apiCall, options = {}) {
  const { allowUnauthenticated = false, defaultValue = null, isSubscriptionRequest = false, onUnauthorized } = options;
  const version = sessionVersion;
  const token = currentToken;
  const changedSession = () => ({ error: { code: 'AUTH_SESSION_CHANGED', statusCode: 401, message: 'The account changed during this request.' } });
  const failure = (error, extra = {}) => {
    if (allowUnauthenticated && defaultValue) {
      return defaultValue;
    }
    if (isSubscriptionRequest) {
      return DEFAULT_ANONYMOUS_SUBSCRIPTION;
    }
    const statusCode = error?.response?.status;
    return { error: { code: statusCode ? `HTTP_${statusCode}` : 'API_ERROR', message: error?.message || 'API request failed', statusCode, ...extra } };
  };
  if (!token) {
    if (allowUnauthenticated && defaultValue) {
      return defaultValue;
    }
    return { error: { code: 'NO_TOKEN', message: 'Authentication required. Please log in.' } };
  }

  try {
    const result = await apiCall();
    return version === sessionVersion ? result : changedSession();
  }
  catch (error) {
    if (version !== sessionVersion) {
      return changedSession();
    }
    if (error.response?.status !== 401) {
      return failure(error);
    }
    // A sibling request may have refreshed the token while this request was in flight.
    if (currentToken === token) {
      if (typeof onUnauthorized !== 'function') {
        return failure(error);
      }
      let refreshed;
      try {
        refreshed = await onUnauthorized({ force: true });
      }
      catch (refreshError) {
        return version === sessionVersion ? failure(refreshError, { code: 'AUTH_REFRESH_FAILED', requireRelogin: false }) : changedSession();
      }
      if (version !== sessionVersion) {
        return changedSession();
      }
      if (!refreshed?.success) {
        if (refreshed?.requireRelogin) {
          clearTokens();
        }
        return failure(error, {
          code: 'AUTH_REFRESH_FAILED',
          message: refreshed?.requireRelogin ? 'Your session expired. Please log in again.' : 'Could not refresh authentication. Please try again later.',
          requireRelogin: refreshed?.requireRelogin === true,
          statusCode: refreshed?.requireRelogin ? 401 : refreshed?.statusCode,
        });
      }
    }
    if (!currentToken) {
      return changedSession();
    }
    try {
      const result = await apiCall();
      return version === sessionVersion ? result : changedSession();
    }
    catch (retryError) {
      if (version !== sessionVersion) {
        return changedSession();
      }
      return failure(retryError, retryError.response?.status === 401
        ? { code: 'AUTH_REFRESH_FAILED', requireRelogin: true }
        : {});
    }
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
  authenticatedRequest,
};
