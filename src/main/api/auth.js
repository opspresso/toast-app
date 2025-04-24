/**
 * Toast API - Authentication Related API Module
 *
 * Handles authentication related APIs such as login, token management, and user information retrieval.
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
const { DEFAULT_ANONYMOUS_SUBSCRIPTION } = require('../constants');

// Authentication related constants
const REDIRECT_URI = 'toast-app://auth';

// Login state management

// Login progress tracking
let isLoginInProgress = false;
let loginStartTimestamp = 0;
const LOGIN_TIMEOUT_MS = 60000; // Maximum login timeout of 1 minute

// State store (for CSRF protection)
const stateStore = new Store({
  name: 'auth-state',
  encryptionKey: 'toast-app-auth-state',
  clearInvalidConfig: true
});

/**
 * Store authentication state value for CSRF prevention
 * @param {string} state - State value to store
 */
function storeStateParam(state) {
  try {
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
 * Retrieve stored authentication state value
 * @returns {string|null} Stored state value or null
 */
function retrieveStoredState() {
  try {
    const state = stateStore.get('oauth-state');
    const createdAt = stateStore.get('state-created-at') || 0;

    // Consider state expired if more than 5 minutes have passed
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
 * Check if login process is currently active
 * @returns {boolean} True if login is in progress
 */
function isLoginProcessActive() {
  if (!isLoginInProgress) return false;

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
    console.log('Login process started');
  } else {
    console.log('Login process ended');
  }
}

/**
 * Start login process (open OAuth authentication page)
 * @param {string} clientId - OAuth client ID
 * @returns {Promise<Object>} Login process start result {url: string, state: string}
 */
function initiateLogin(clientId) {
  try {
    // State value is used to prevent CSRF attacks
    const state = uuidv4();

    // Store state value
    const stored = storeStateParam(state);
    if (!stored) {
      return {
        success: false,
        error: 'Failed to store state value. Please try again.'
      };
    }

    // Build authentication URL
    const authUrl = new URL(ENDPOINTS.OAUTH_AUTHORIZE);
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('client_id', clientId);
    authUrl.searchParams.append('redirect_uri', REDIRECT_URI);
    authUrl.searchParams.append('scope', 'profile'); // subscription is integrated into profile
    authUrl.searchParams.append('state', state);

    // Log authentication URL
    console.log('====== Authentication Request Info ======');
    console.log('Full authentication request URL:', authUrl.toString());
    console.log('========================================');

    // Activate login progress state
    setLoginInProgress(true);

    return {
      success: true,
      url: authUrl.toString(),
      state
    };
  } catch (error) {
    console.error('Failed to initiate login:', error);

    // Reset login state if error occurs
    setLoginInProgress(false);

    return {
      success: false,
      error: error.message || 'Unknown error'
    };
  }
}

/**
 * Exchange authorization code for token
 * @param {Object} params - Token exchange parameters
 * @param {string} params.code - OAuth authorization code
 * @param {string} params.clientId - OAuth client ID
 * @param {string} params.clientSecret - OAuth client secret
 * @returns {Promise<Object>} Token exchange result
 */
async function exchangeCodeForToken({ code, clientId, clientSecret }) {
  try {

    console.log('Starting exchange of authorization code for token:', code.substring(0, 8) + '...');

    const apiClient = createApiClient();

    // Prepare token request data
    const data = new URLSearchParams();
    data.append('grant_type', 'authorization_code');
    data.append('code', code);
    data.append('client_id', clientId);
    data.append('client_secret', clientSecret);
    data.append('redirect_uri', REDIRECT_URI);

    console.log('Token request URL:', ENDPOINTS.OAUTH_TOKEN);
    console.log('Request data:', {
      grant_type: 'authorization_code',
      code: code.substring(0, 8) + '...',
      client_id: clientId,
      redirect_uri: REDIRECT_URI
    });

    // Token request
    const response = await apiClient.post(ENDPOINTS.OAUTH_TOKEN, data, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    console.log('Token request successful! Response status:', response.status);
    const { access_token, refresh_token, expires_in } = response.data;

    if (!access_token) {
      console.error('No access token returned from server!');
      setLoginInProgress(false); // Reset login state
      return {
        success: false,
        error: 'No access token returned from server'
      };
    }

    // End login progress state
    setLoginInProgress(false);

    return {
      success: true,
      access_token,
      refresh_token,
      expires_in
    };
  } catch (error) {
    console.error('Error exchanging token:', error);
    console.error('Detailed error information:', error.response?.data || 'No detailed information');

    // Reset login state if error occurs
    setLoginInProgress(false);

    return {
      success: false,
      error: error.response?.data?.error || error.message,
      error_details: error.response?.data
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

    console.log('Starting token refresh process');

    if (!refreshToken) {
      console.error('No refresh token available');
      return {
        success: false,
        error: 'No refresh token available',
        code: 'NO_REFRESH_TOKEN'
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
    console.log('Token refresh request:', {
      url: ENDPOINTS.OAUTH_TOKEN,
      grant_type: 'refresh_token',
      client_id: clientId
    });

    try {
      // Token renewal request
      const response = await apiClient.post(ENDPOINTS.OAUTH_TOKEN, data, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      console.log('Token renewal response status:', response.status);
      const { access_token, refresh_token } = response.data;

      if (!access_token) {
        console.error('Access token missing in response');
        return {
          success: false,
          error: 'No access token in response',
          code: 'NO_ACCESS_TOKEN'
        };
      }

      console.log('New access token received:', access_token.substring(0, 10) + '...');

      return {
        success: true,
        access_token,
        refresh_token
      };
    } catch (tokenRequestError) {
      console.error('Token renewal request failed:', tokenRequestError.message);

      if (tokenRequestError.response?.status === 401) {
        console.log('Refresh token has expired. Re-login required');

        return {
          success: false,
          error: 'Your login session has expired. Please log in again.',
          code: 'SESSION_EXPIRED',
          requireRelogin: true
        };
      }

      const errorMessage = tokenRequestError.response?.data?.error ||
        tokenRequestError.message ||
        'Unknown error during token refresh';

      console.log('Error message:', errorMessage);
      return {
        success: false,
        error: errorMessage,
        code: 'REFRESH_FAILED'
      };
    }
  } catch (error) {
    console.error('Exception occurred during token refresh process:', error);

    // Critical error but keep app running
    const errorMessage = error.message || 'Unknown error in refresh token process';
    return {
      success: false,
      error: errorMessage,
      code: 'REFRESH_EXCEPTION'
    };
  }
}

/**
 * Process redirection received from authentication URL
 * @param {Object} params - Redirection processing parameters
 * @param {string} params.url - Redirection URL
 * @param {Function} params.onCodeExchange - Code exchange processing function
 * @returns {Promise<Object>} Processing result
 */
async function handleAuthRedirect({ url, onCodeExchange }) {
  try {
    console.log('Processing auth redirect:', url);

    const urlObj = new URL(url);

    // Extract authentication code
    const code = urlObj.searchParams.get('code');
    const state = urlObj.searchParams.get('state');
    const error = urlObj.searchParams.get('error');
    const token = urlObj.searchParams.get('token');
    const action = urlObj.searchParams.get('action');

    // Special processing if action parameter exists
    if (action === 'reload_auth') {
      console.log('Auth reload action detected');
      setLoginInProgress(false); // Reset login state
      return { success: true, action: 'reload_auth', token };
    }

    // If error parameter exists
    if (error) {
      console.error('Auth error from server:', error);
      setLoginInProgress(false); // Reset login state
      return {
        success: false,
        error: error || 'Unknown error'
      };
    }

    // If no code exists
    if (!code) {
      console.error('No auth code in redirect URL');
      setLoginInProgress(false); // Reset login state
      return {
        success: false,
        error: 'Missing authorization code'
      };
    }

    // Validate state value (CSRF prevention)
    const storedState = retrieveStoredState();
    if (!storedState || state !== storedState) {
      console.error('State mismatch. Possible CSRF attack');
      setLoginInProgress(false); // Reset login state
      return {
        success: false,
        error: 'state_mismatch',
        message: 'State parameter mismatch. Security validation failed.'
      };
    }

    // Call callback function for code exchange processing if it exists
    if (onCodeExchange && typeof onCodeExchange === 'function') {
      return await onCodeExchange(code);
    }

    // If no callback exists, reset login state here
    setLoginInProgress(false);

    return {
      success: true,
      code
    };
  } catch (error) {
    console.error('Failed to handle auth redirect:', error);
    setLoginInProgress(false); // Reset login state
    return {
      success: false,
      error: error.message || 'Unknown error'
    };
  }
}

/**
 * Get user profile information
 * @param {Function} onUnauthorized - Callback function to call when unauthorized
 * @returns {Promise<Object>} User profile information
 */
async function fetchUserProfile(onUnauthorized) {

  return authenticatedRequest(async () => {
    const headers = getAuthHeaders();
    console.log('Profile API call:', ENDPOINTS.USER_PROFILE);

    const apiClient = createApiClient();
    const response = await apiClient.get(ENDPOINTS.USER_PROFILE, { headers });
    console.log('Profile API response status:', response.status);

    // Extract data field if API response format is apiSuccess({ ... })
    if (response.data && response.data.success === true && response.data.data) {
      return response.data.data;
    }

    return response.data;
  }, { onUnauthorized });
}

/**
 * Get subscription information
 * @param {Function} onUnauthorized - Callback function to call when unauthorized
 * @returns {Promise<Object>} Subscription information
 */
async function fetchSubscription(onUnauthorized) {

  // Default response for subscription API (used for authentication failures or errors)
  const defaultSubscription = DEFAULT_ANONYMOUS_SUBSCRIPTION;

  const options = {
    allowUnauthenticated: true,
    defaultValue: defaultSubscription,
    isSubscriptionRequest: true,
    onUnauthorized
  };

  return authenticatedRequest(async () => {
    try {
      const headers = getAuthHeaders();
      console.log('Profile API call (including subscription information):', ENDPOINTS.USER_PROFILE);

      const apiClient = createApiClient();
      const response = await apiClient.get(ENDPOINTS.USER_PROFILE, { headers });
      console.log('Profile API response status:', response.status);

      // Extract data field if API response format is apiSuccess({ ... })
      let profileData;
      if (response.data && response.data.success === true && response.data.data) {
        profileData = response.data.data;
      } else {
        profileData = response.data;
      }

      // Extract subscription information from profile data
      let subscriptionData = profileData.subscription || {};

      console.log('Subscription data received:', JSON.stringify(subscriptionData, null, 2));

      // Validate subscription data and ensure field compatibility
      const normalizedSubscription = {
        ...defaultSubscription,
        ...subscriptionData,
        // Add user ID information
        userId: profileData.id || profileData.userId || 'anonymous',
        // Synchronize active status fields (is_subscribed or active)
        active: subscriptionData.active || subscriptionData.is_subscribed || false,
        is_subscribed: subscriptionData.is_subscribed || subscriptionData.active || false,
        // Synchronize expiration date fields (expiresAt or subscribed_until)
        expiresAt: subscriptionData.expiresAt || subscriptionData.subscribed_until || null,
        subscribed_until: subscriptionData.subscribed_until || subscriptionData.expiresAt || null,
        // Preserve VIP status (default is false)
        isVip: subscriptionData.isVip === true
      };

      // Ensure premium page groups and features for VIP users
      if (normalizedSubscription.isVip) {
        console.log('VIP user detected - applying premium benefits');
        normalizedSubscription.active = true;
        normalizedSubscription.is_subscribed = true;
        normalizedSubscription.plan = 'premium';
      }

      // Use default value if features object doesn't exist
      if (!normalizedSubscription.features) {
        normalizedSubscription.features = defaultSubscription.features;
      }

      // Use default value if features_array field doesn't exist
      if (!normalizedSubscription.features_array) {
        normalizedSubscription.features_array = defaultSubscription.features_array;
      }

      return normalizedSubscription;
    } catch (error) {
      console.error('Error retrieving subscription information:', error);
      return defaultSubscription;
    }
  }, options);
}

/**
 * Process logout (initialize only local tokens without server call)
 * @returns {Promise<Object>} Logout result
 */
async function logout() {
  try {
    // Initialize tokens in memory (no server call)
    clearTokens();
    console.log('Memory token initialization complete');

    // Cancel if login was in progress
    isLoginInProgress = false;

    return {
      success: true,
      message: 'Logout successful'
    };
  } catch (error) {
    console.error('Error during logout:', error);
    return {
      success: false,
      error: error.message || 'An error occurred during logout'
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
  logout,
  isLoginProcessActive // Export function to check if login is in progress
};
