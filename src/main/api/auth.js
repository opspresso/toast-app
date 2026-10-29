/**
 * Toast API - Authentication API Module
 *
 * Handles authentication related API calls only.
 * This module focuses on direct API communication and does not handle token storage or system-level auth functions.
 */

const { URL } = require('url');
const { randomUUID, randomBytes, createHash } = require('crypto');
const Store = require('electron-store');
const { createLogger, maskAuthUrl } = require('../logger');
const { ENDPOINTS, createApiClient, getAuthHeaders, authenticatedRequest, clearTokens } = require('./client');
const { getEnv } = require('../config/env');

// Create a module-specific logger
const logger = createLogger('ApiAuth');

// Authentication related constants
const REDIRECT_URI = 'toast-app://auth';

// Login state management

// Login progress tracking
let isLoginInProgress = false;
let loginStartTimestamp = 0;
const LOGIN_TIMEOUT_MS = 60000; // Maximum login timeout of 1 minute

// State store (for CSRF protection). Plain JSON, protected only by file
// permissions — an encryptionKey here would be checked into source control
// and give no real confidentiality, the same reasoning that led to storing
// auth tokens as plaintext instead of a fake-encrypted file.
const configSuffix = getEnv('CONFIG_SUFFIX', '');
const stateStore = new Store({
  name: configSuffix ? `auth-state-${configSuffix}` : 'auth-state',
  clearInvalidConfig: true,
});

const STATE_KEYS = ['oauth-state', 'oauth-code-verifier', 'state-created-at'];
const STATE_TTL_MS = 5 * 60 * 1000;

/**
 * Store the CSRF state and PKCE verifier for one pending login.
 * @param {string} state - State value sent to the authorize endpoint
 * @param {string} codeVerifier - PKCE verifier kept only on this device
 */
/**
 * Readable message from a Toast Web error response.
 * The server returns `{ error: { code, message } }`; older responses return `{ error: string }`.
 * @param {Error} error - Request error
 * @returns {string} Error message
 */
function serverErrorMessage(error) {
  const serverError = error.response?.data?.error;
  if (typeof serverError === 'string') {
    return serverError;
  }
  return serverError?.message || serverError?.code || error.message;
}

function storeAuthorizationState(state, codeVerifier) {
  stateStore.set({ 'oauth-state': state, 'oauth-code-verifier': codeVerifier, 'state-created-at': Date.now() });
  logger.info('Auth state stored');
}

/**
 * Validate the state received on the OAuth redirect (CSRF prevention) and
 * consume the pending login so a state cannot be replayed.
 * @param {string} receivedState - state parameter from the redirect URL
 * @returns {string|null} The PKCE code verifier when the state matches the stored, unexpired value; otherwise null
 */
function consumeAuthorizationState(receivedState) {
  let codeVerifier = null;
  try {
    const storedState = stateStore.get('oauth-state');
    const createdAt = stateStore.get('state-created-at') || 0;
    const verifier = stateStore.get('oauth-code-verifier');
    if (Date.now() - createdAt > STATE_TTL_MS) {
      logger.info('Auth state expired');
    }
    else if (storedState && receivedState === storedState && typeof verifier === 'string' && verifier) {
      codeVerifier = verifier;
    }
  }
  catch (error) {
    logger.error('Failed to read auth state:', error);
  }

  // One-time use: clear regardless of outcome so a leaked/guessed state
  // cannot be replayed on a subsequent redirect.
  try {
    for (const key of STATE_KEYS) {
      stateStore.delete(key);
    }
  }
  catch (error) {
    logger.error('Failed to clear auth state after validation:', error);
  }

  if (!codeVerifier) {
    logger.error('Auth redirect state is missing, expired, or mismatched. Possible CSRF attack');
  }
  return codeVerifier;
}

/**
 * Check if login process is currently active
 * @returns {boolean} True if login is in progress
 */
function isLoginProcessActive() {
  if (!isLoginInProgress) {
    return false;
  }

  // Check login time limit
  const elapsed = Date.now() - loginStartTimestamp;
  if (elapsed > LOGIN_TIMEOUT_MS) {
    // Reset login state if timeout has passed
    isLoginInProgress = false;
    return false;
  }

  return true;
}

/**
 * Set login progress state
 * @param {boolean} status - Active (true) or inactive (false)
 */
function setLoginInProgress(status) {
  isLoginInProgress = status;

  if (status) {
    // Record login start time
    loginStartTimestamp = Date.now();
    logger.info('Login process started');
  }
  else {
    logger.info('Login process ended');
  }
}

/**
 * Start login process (open OAuth authentication page)
 * @param {string} clientId - OAuth client ID
 * @returns {Promise<Object>} Login process start result {url: string, state: string}
 */
function initiateLogin(clientId) {
  try {
    // State prevents CSRF. PKCE (RFC 7636, S256) binds the code to this device:
    // the bundled client secret is not confidential, so an app that intercepts
    // the toast-app:// redirect must not be able to redeem the code.
    const state = randomUUID();
    const codeVerifier = randomBytes(32).toString('base64url');
    const codeChallenge = createHash('sha256').update(codeVerifier).digest('base64url');
    storeAuthorizationState(state, codeVerifier);

    // Build authentication URL
    const authUrl = new URL(ENDPOINTS.OAUTH_AUTHORIZE);
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('client_id', clientId);
    authUrl.searchParams.append('redirect_uri', REDIRECT_URI);
    authUrl.searchParams.append('scope', 'profile'); // subscription is integrated into profile
    authUrl.searchParams.append('state', state);
    authUrl.searchParams.append('code_challenge', codeChallenge);
    authUrl.searchParams.append('code_challenge_method', 'S256');

    // Log authentication URL
    logger.info('====== Authentication Request Info ======');
    logger.info('Authentication request URL:', maskAuthUrl(authUrl.toString()));
    logger.info('========================================');

    // Activate login progress state
    setLoginInProgress(true);

    return {
      success: true,
      url: authUrl.toString(),
      state,
    };
  }
  catch (error) {
    logger.error('Failed to initiate login:', error);

    // Reset login state if error occurs
    setLoginInProgress(false);

    return {
      success: false,
      error: error.message || 'Unknown error',
    };
  }
}

/**
 * Exchange authorization code for token
 * @param {Object} params - Token exchange parameters
 * @param {string} params.code - OAuth authorization code
 * @param {string} params.clientId - OAuth client ID
 * @param {string} params.clientSecret - OAuth client secret
 * @param {string} params.codeVerifier - PKCE verifier returned by consumeAuthorizationState
 * @returns {Promise<Object>} Token exchange result
 */
async function exchangeCodeForToken({ code, clientId, clientSecret, codeVerifier }) {
  try {
    logger.info('Starting exchange of authorization code for token');

    const apiClient = createApiClient();

    // Prepare token request data
    const data = new URLSearchParams();
    data.append('grant_type', 'authorization_code');
    data.append('code', code);
    data.append('client_id', clientId);
    data.append('client_secret', clientSecret);
    data.append('redirect_uri', REDIRECT_URI);
    data.append('code_verifier', codeVerifier);

    logger.info('Token request URL:', ENDPOINTS.OAUTH_TOKEN);
    logger.info('Request data:', {
      grant_type: 'authorization_code',
      client_id: clientId,
      redirect_uri: REDIRECT_URI,
    });

    // Token request
    const response = await apiClient.post(ENDPOINTS.OAUTH_TOKEN, data, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    logger.info('Token request successful! Response status:', response.status);
    const { access_token, refresh_token, expires_in } = response.data;

    if (!access_token) {
      logger.error('No access token returned from server!');
      setLoginInProgress(false); // Reset login state
      return {
        success: false,
        error: 'No access token returned from server',
      };
    }

    // End login progress state
    setLoginInProgress(false);

    return {
      success: true,
      access_token,
      refresh_token,
      expires_in,
    };
  }
  catch (error) {
    logger.error('Error exchanging token:', error.message, { status: error.response?.status });

    // Reset login state if error occurs
    setLoginInProgress(false);

    return {
      success: false,
      error: serverErrorMessage(error),
      error_details: error.response?.data,
    };
  }
}

/**
 * Use refresh token to obtain a new access token
 * @param {Object} params - Token refresh parameters
 * @param {string} params.refreshToken - Refresh token
 * @param {string} params.clientId - OAuth client ID
 * @param {string} params.clientSecret - OAuth client secret
 * @returns {Promise<Object>} Token refresh result
 */
async function refreshAccessToken({ refreshToken, clientId, clientSecret }) {
  try {
    logger.info('Starting token refresh process');

    if (!refreshToken) {
      logger.error('No refresh token available');
      return {
        success: false,
        error: 'No refresh token available',
        code: 'NO_REFRESH_TOKEN',
      };
    }

    const apiClient = createApiClient();

    // Prepare token renewal request data
    const data = new URLSearchParams();
    data.append('grant_type', 'refresh_token');
    data.append('refresh_token', refreshToken);
    data.append('client_id', clientId);
    data.append('client_secret', clientSecret);

    // Log request data (excluding sensitive information)
    logger.info('Token refresh request:', {
      url: ENDPOINTS.OAUTH_TOKEN,
      grant_type: 'refresh_token',
      client_id: clientId,
    });

    try {
      // Token renewal request
      const response = await apiClient.post(ENDPOINTS.OAUTH_TOKEN, data, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      logger.info('Token renewal response status:', response.status);
      const { access_token, refresh_token, expires_in } = response.data;

      if (!access_token) {
        logger.error('Access token missing in response');
        return {
          success: false,
          error: 'No access token in response',
          code: 'NO_ACCESS_TOKEN',
        };
      }

      logger.info('New access token received');

      return {
        success: true,
        access_token,
        refresh_token,
        expires_in,
      };
    }
    catch (tokenRequestError) {
      logger.error('Token renewal request failed:', tokenRequestError.message);

      // The server returns 400 INVALID_GRANT when the refresh token itself is
      // expired, already used, or otherwise invalid; 401 INVALID_CLIENT is
      // reserved for a bad client_id/client_secret. Either way the current
      // tokens can't be used again, so treat both as a session expiry.
      const errorCode = tokenRequestError.response?.data?.error?.code;
      if (errorCode === 'INVALID_GRANT' || tokenRequestError.response?.status === 401) {
        logger.info('Refresh token has expired. Re-login required');

        return {
          success: false,
          error: 'Your login session has expired. Please log in again.',
          code: 'SESSION_EXPIRED',
          requireRelogin: true,
        };
      }

      const errorMessage = serverErrorMessage(tokenRequestError) || 'Unknown error during token refresh';

      logger.info('Error message:', errorMessage);
      return {
        success: false,
        error: errorMessage,
        code: 'REFRESH_FAILED',
      };
    }
  }
  catch (error) {
    logger.error('Exception occurred during token refresh process:', error);

    // Critical error but keep app running
    const errorMessage = error.message || 'Unknown error in refresh token process';
    return {
      success: false,
      error: errorMessage,
      code: 'REFRESH_EXCEPTION',
    };
  }
}

/**
 * Get user profile information
 * @param {Function} onUnauthorized - Callback function to call when unauthorized
 * @returns {Promise<Object>} User profile information
 */
async function fetchUserProfile(onUnauthorized) {
  return authenticatedRequest(
    async () => {
      const headers = getAuthHeaders();
      logger.info('Profile API call:', ENDPOINTS.USER_PROFILE);

      const apiClient = createApiClient();
      const response = await apiClient.get(ENDPOINTS.USER_PROFILE, { headers });
      logger.info('Profile API response status:', response.status);

      // Extract data field if API response format is apiSuccess({ ... })
      if (response.data && response.data.success === true && response.data.data) {
        return response.data.data;
      }

      return response.data;
    },
    { onUnauthorized },
  );
}

/**
 * Revoke a refresh token on the server (RFC 7009), so it cannot be used to
 * mint new access tokens after logout.
 * @param {Object} params
 * @param {string} params.refreshToken - Refresh token to revoke
 * @param {string} params.clientId - OAuth client id
 * @param {string} params.clientSecret - OAuth client secret
 * @returns {Promise<Object>} Revocation result
 */
async function revokeToken({ refreshToken, clientId, clientSecret }) {
  if (!refreshToken) {
    return { success: true, message: 'No refresh token to revoke' };
  }

  try {
    const apiClient = createApiClient();
    const data = new URLSearchParams();
    data.append('token', refreshToken);
    data.append('client_id', clientId);
    data.append('client_secret', clientSecret);

    await apiClient.post(ENDPOINTS.OAUTH_REVOKE, data, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    logger.info('Refresh token revoked on server');
    return { success: true };
  }
  catch (error) {
    // Revocation failure must not block local logout — log and continue.
    logger.warn('Failed to revoke refresh token on server:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * API logout (clear memory tokens only)
 * @returns {Promise<Object>} Logout result
 */
async function logout() {
  try {
    // Only clear memory tokens (main auth module handles file storage)
    clearTokens();
    logger.info('API memory token cleared');

    // Cancel if login was in progress
    isLoginInProgress = false;

    return {
      success: true,
      message: 'API logout successful',
    };
  }
  catch (error) {
    logger.error('Error during API logout:', error);
    return {
      success: false,
      error: error.message || 'An error occurred during API logout',
    };
  }
}

module.exports = {
  initiateLogin,
  exchangeCodeForToken,
  refreshAccessToken,
  revokeToken,
  consumeAuthorizationState,
  fetchUserProfile,
  logout,
  isLoginProcessActive, // Export function to check if login is in progress
};
