/**
 * Toast API - API Client Base Module
 *
 * Provides client configuration and common functions for all API calls.
 */

const axios = require('axios');
const { getEnv } = require('../config/env');
const { DEFAULT_ANONYMOUS_SUBSCRIPTION } = require('../constants');

// Base URL and endpoint configuration
const TOAST_URL = getEnv('TOAST_URL', 'https://app.toast.sh');
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
};

// Token management (in memory)
let currentToken = null;
let currentRefreshToken = null;

/**
 * Set access token
 * @param {string} token - Access token to set
 */
function setAccessToken(token) {
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

  const clientOptions = { ...defaultOptions, ...options };
  return axios.create(clientOptions);
}

// Track token refresh attempts to prevent infinite loops
const tokenRefreshTracking = {
  requestsAfterRefresh: 0,
  maxRequestsAfterRefresh: 3, // Maximum allowed consecutive requests after refresh
  lastRefreshTime: 0,
  refreshCooldownMs: 10000, // 10 seconds minimum between refresh attempts
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
    onUnauthorized = null,
  } = options;

  // Default subscription response
  const defaultSubscription = DEFAULT_ANONYMOUS_SUBSCRIPTION;

  if (!currentToken) {
    if (allowUnauthenticated && defaultValue) {
      return defaultValue;
    }

    return {
      error: {
        code: 'NO_TOKEN',
        message: 'Authentication required. Please log in.',
      },
    };
  }

  try {
    return await apiCall();
  } catch (error) {
    // Handle 401 unauthorized error
    if (error.response && error.response.status === 401) {
      // Special handling for subscription API requests
      if (isSubscriptionRequest) {
        return defaultSubscription;
      }

      // Prevent infinite refresh loops
      const now = Date.now();
      const timeSinceLastRefresh = now - tokenRefreshTracking.lastRefreshTime;

      if (timeSinceLastRefresh < tokenRefreshTracking.refreshCooldownMs) {
        if (allowUnauthenticated && defaultValue) {
          return defaultValue;
        }

        return {
          error: {
            code: 'AUTH_REFRESH_RATE_LIMIT',
            message: 'Authentication refresh rate limit exceeded. Please try again later.',
          },
        };
      }

      if (
        tokenRefreshTracking.requestsAfterRefresh >= tokenRefreshTracking.maxRequestsAfterRefresh
      ) {
        // Reset token to force re-login
        clearTokens();

        return {
          error: {
            code: 'AUTH_REFRESH_LOOP',
            message: 'Authentication failure loop detected. Please log in again.',
            requireRelogin: true,
          },
        };
      }

      // Call re-authentication callback
      if (onUnauthorized && typeof onUnauthorized === 'function') {
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
            if (allowUnauthenticated && defaultValue) {
              return defaultValue;
            }

            return {
              error: {
                code: 'AUTH_REFRESH_FAILED',
                message: 'Authentication failed even after token refresh. Please log in again.',
                requireRelogin: true,
              },
            };
          }
        } else {
          // Reset tokens on refresh failure
          clearTokens();

          return {
            error: {
              code: 'AUTH_REFRESH_FAILED',
              message: 'Failed to refresh authentication. Please log in again.',
              requireRelogin: true,
            },
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
        statusCode: error.response?.status,
      },
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
  authenticatedRequest,
};
