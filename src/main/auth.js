/**
 * Toast App - Authentication Module
 *
 * This module is for OAuth 2.0 authentication and subscription management.
 * It is implemented using the common API module.
 */

const { app, shell } = require('electron');
const path = require('path');
const os = require('os');
const fs = require('fs');
const { createConfigStore } = require('./config');

// Import common API module
const { client, auth: apiAuth } = require('./api');

// ENV
const { getEnv } = require('./config/env');
const NODE_ENV = getEnv('NODE_ENV', 'development');
const CLIENT_ID = getEnv('CLIENT_ID', NODE_ENV === 'production' ? '' : 'toast-app-client');
const CLIENT_SECRET = getEnv('CLIENT_SECRET', NODE_ENV === 'production' ? '' : 'toast-app-secret');
const TOKEN_EXPIRES_IN = parseInt(getEnv('TOKEN_EXPIRES_IN', '3600'), 10); // Default 1 hour, can be overridden in environment variables
const CONFIG_SUFFIX = getEnv('CONFIG_SUFFIX', '');

// Set token storage file path
const USER_DATA_PATH = app.getPath('userData');
const TOKEN_FILENAME = CONFIG_SUFFIX ? `auth-tokens-${CONFIG_SUFFIX}.json` : 'auth-tokens.json';
const TOKEN_FILE_PATH = path.join(USER_DATA_PATH, TOKEN_FILENAME);

// Token key constants
const TOKEN_KEY = 'auth-token';
const REFRESH_TOKEN_KEY = 'refresh-token';
const TOKEN_EXPIRES_KEY = 'token-expires-at';

// Import common constants
const { PAGE_GROUPS, DEFAULT_ANONYMOUS_SUBSCRIPTION } = require('./constants');


// Set tokens in memory
async function initializeTokensFromStorage() {
  try {
    const accessToken = await getStoredToken();
    const refreshToken = await getStoredRefreshToken();

    if (accessToken) {
      client.setAccessToken(accessToken);
    }

    if (refreshToken) {
      client.setRefreshToken(refreshToken);
    }

    return { accessToken, refreshToken };
  } catch (error) {
    console.error('Error initializing tokens:', error);
    return { accessToken: null, refreshToken: null };
  }
}

/**
 * Read token data from local file
 * @returns {Object|null} Token data object or null
 */
function readTokenFile() {
  try {
    if (!fs.existsSync(TOKEN_FILE_PATH)) {
      return null;
    }

    const data = fs.readFileSync(TOKEN_FILE_PATH, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading token file:', error);
    return null;
  }
}

/**
 * Save token data to local file using atomic write operation to prevent corruption
 * @param {Object} tokenData - Token data object to save
 * @returns {boolean} Whether the save was successful
 */
function writeTokenFile(tokenData) {
  try {
    const dirPath = path.dirname(TOKEN_FILE_PATH);
    const tempFilePath = `${TOKEN_FILE_PATH}.temp`;

    // Create directory if it doesn't exist
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }

    // First write to a temporary file
    fs.writeFileSync(tempFilePath, JSON.stringify(tokenData, null, 2), 'utf8');

    // Verify the written data is valid
    try {
      const verifyData = fs.readFileSync(tempFilePath, 'utf8');
      JSON.parse(verifyData); // Ensure it's valid JSON
    } catch (verifyError) {
      console.error('Error verifying written token data:', verifyError);
      fs.unlinkSync(tempFilePath); // Clean up corrupted temp file
      return false;
    }

    // Use atomic rename operation to replace the actual file
    // This is much safer as it prevents partial writes from corrupting the file
    if (fs.existsSync(TOKEN_FILE_PATH)) {
      // On Windows, we need to unlink the existing file first
      if (process.platform === 'win32') {
        try {
          fs.unlinkSync(TOKEN_FILE_PATH);
        } catch (unlinkError) {
          console.error('Error removing existing token file:', unlinkError);
        }
      }
    }

    fs.renameSync(tempFilePath, TOKEN_FILE_PATH);

    return true;
  } catch (error) {
    console.error('Error saving token file:', error);
    return false;
  }
}

/**
 * Get auth token from local file
 * @returns {Promise<string|null>} Stored token or null if none exists
 */
async function getStoredToken() {
  try {
    const tokenData = readTokenFile();
    return tokenData ? tokenData[TOKEN_KEY] : null;
  } catch (error) {
    console.error('Failed to get token from local file:', error);
    return null;
  }
}

/**
 * Get refresh token from local file
 * @returns {Promise<string|null>} Stored refresh token or null if none exists
 */
async function getStoredRefreshToken() {
  try {
    const tokenData = readTokenFile();
    return tokenData ? tokenData[REFRESH_TOKEN_KEY] : null;
  } catch (error) {
    console.error('Failed to get refresh token from local file:', error);
    return null;
  }
}

/**
 * Store token expiration time
 * @param {number} expiresAt - Token expiration time (milliseconds)
 * @returns {Promise<void>}
 */
async function storeTokenExpiry(expiresAt) {
  try {
    // Read existing token data
    const tokenData = readTokenFile() || {};

    // Store expiration time
    tokenData[TOKEN_EXPIRES_KEY] = expiresAt;

    // Save to file
    if (!writeTokenFile(tokenData)) {
      throw new Error('Failed to save token expiration time');
    }
  } catch (error) {
    console.error('Failed to store token expiration time:', error);
    throw error;
  }
}

/**
 * Get stored token expiration time
 * @returns {Promise<number|null>} Stored token expiration time or null
 */
async function getStoredTokenExpiry() {
  try {
    const tokenData = readTokenFile();
    return tokenData ? tokenData[TOKEN_EXPIRES_KEY] : null;
  } catch (error) {
    console.error('Failed to get token expiration time:', error);
    return null;
  }
}

/**
 * Check if token is expired
 * @returns {Promise<boolean>} Returns true if token is expired
 */
async function isTokenExpired() {
  try {
    const expiresAt = await getStoredTokenExpiry();

    if (!expiresAt) {
      // Consider expired if no expiration time
      return true;
    }

    // Compare with current time to check expiration
    const now = Date.now();
    const isExpired = now >= expiresAt;

    // Consider expired if within safety margin (30 seconds before actual expiry)
    const safetyMargin = 30 * 1000; // 30 seconds
    const isNearExpiry = now >= (expiresAt - safetyMargin);

    if (isNearExpiry) {
      console.log('Token is about to expire or already expired');
      return true;
    }

    // Log remaining time for valid tokens
    const remainingMinutes = Math.floor((expiresAt - now) / (60 * 1000));
    console.log(`Current token validity: approximately ${remainingMinutes} minutes remaining`);

    return false;
  } catch (error) {
    console.error('Error checking token expiration:', error);
    // Consider expired if error occurs, for safety
    return true;
  }
}

/**
 * Store token in local file
 * @param {string} token - Authentication token to store
 * @param {number} expiresIn - Token expiration time in seconds
 * @returns {Promise<void>}
 */
async function storeToken(token, expiresIn = 3600) {
  try {
    // Set token in client
    client.setAccessToken(token);

    // Read existing token data
    const tokenData = readTokenFile() || {};

    // Store new token
    tokenData[TOKEN_KEY] = token;

    // Calculate and store expiration time
    let expiresAt;
    if (expiresIn <= 0) {
      // Treat negative or zero values as unlimited expiration time (use a very distant future date)
      expiresAt = 8640000000000000; // Maximum date supported by JavaScript (about 270 million years)
      console.log('Token expiration time set to unlimited.');
    } else {
      expiresAt = Date.now() + (expiresIn * 1000);
    }
    tokenData[TOKEN_EXPIRES_KEY] = expiresAt;

    // Save to file
    if (!writeTokenFile(tokenData)) {
      throw new Error('Failed to save token file');
    }

    console.log(`Token saved successfully, expiration time: ${new Date(expiresAt).toLocaleString()}`);
  } catch (error) {
    console.error('Failed to save token:', error);
    throw error;
  }
}

/**
 * Store refresh token in local file
 * @param {string} refreshToken - Refresh token to store
 * @returns {Promise<void>}
 */
async function storeRefreshToken(refreshToken) {
  try {
    // Set refresh token in client
    client.setRefreshToken(refreshToken);

    // Read existing token data
    const tokenData = readTokenFile() || {};

    // Store new refresh token
    tokenData[REFRESH_TOKEN_KEY] = refreshToken;

    // Save to file
    if (!writeTokenFile(tokenData)) {
      throw new Error('Failed to save refresh token file');
    }
  } catch (error) {
    console.error('Failed to save refresh token:', error);
    throw error;
  }
}

/**
 * Delete tokens from local file
 * @returns {Promise<void>}
 */
async function clearTokens() {
  try {
    // Reset client tokens
    client.clearTokens();

    // Delete token file if it exists
    if (fs.existsSync(TOKEN_FILE_PATH)) {
      fs.unlinkSync(TOKEN_FILE_PATH);
    }
  } catch (error) {
    console.error('Failed to delete tokens:', error);
    throw error;
  }
}

/**
 * Start login process (open OAuth authentication page)
 * @returns {Promise<boolean>} Returns true if process is started
 */
async function initiateLogin() {
  try {
    // Generate login URL through common module
    const loginResult = apiAuth.initiateLogin(CLIENT_ID);

    if (!loginResult.success) {
      throw new Error(loginResult.error || 'Failed to start login process');
    }

    // Open authentication page in default browser
    await shell.openExternal(loginResult.url);

    return true;
  } catch (error) {
    console.error('Failed to initiate login:', error);
    throw error;
  }
}

/**
 * Process redirection received from authentication URL
 * @param {string} url - Redirection URL
 * @returns {Promise<Object>} Processing result
 */
async function handleAuthRedirect(url) {
  try {
    console.log('Processing auth redirect:', url);

    // 직접 URL에서 파라미터 추출
    const urlObj = new URL(url);
    const code = urlObj.searchParams.get('code');
    const token = urlObj.searchParams.get('token');
    const userId = urlObj.searchParams.get('userId');
    const action = urlObj.searchParams.get('action');

    // Connect 페이지에서의 딥링크 처리 (token, userId, action 파라미터 사용)
    if (action === 'reload_auth' && token && userId) {
      console.log('Auth reload action detected with token from connect page');

      // Check current authentication status
      const hasToken = await hasValidToken();

      if (hasToken) {
        // If already authenticated, just refresh subscription information
        console.log('Already authenticated, refreshing subscription info');
        const subscription = await fetchSubscription();
        await updatePageGroupSettings(subscription);

        return {
          success: true,
          message: 'Authentication refreshed',
          subscription
        };
      } else {
        // If not authenticated, start login process
        console.log('Not authenticated, initiating login process');
        return await initiateLogin();
      }
    }

    // 기존 OAuth 코드 처리 로직
    if (code) {
      const redirectResult = await apiAuth.handleAuthRedirect({
        url,
        onCodeExchange: async (code) => {
          // Exchange code for token and update subscription information
          return await exchangeCodeForTokenAndUpdateSubscription(code);
        }
      });

      // Process 'reload_auth' action
      if (redirectResult.success && redirectResult.action === 'reload_auth') {
        console.log('Auth reload action detected from OAuth flow');

        // Check if token exists
        if (!redirectResult.token) {
          console.error('No token provided for auth reload');
          return {
            success: false,
            error: 'Missing token for auth reload'
          };
        }

        // Check current authentication status
        const hasToken = await hasValidToken();

        if (hasToken) {
          // If already authenticated, just refresh subscription information
          console.log('Already authenticated, refreshing subscription info');
          const subscription = await fetchSubscription();
          await updatePageGroupSettings(subscription);

          return {
            success: true,
            message: 'Authentication refreshed',
            subscription
          };
        } else {
          // If not authenticated, start login process
          console.log('Not authenticated, initiating login process');
          return await initiateLogin();
        }
      }

      return redirectResult;
    }

    return {
      success: false,
      error: 'Invalid URL parameters'
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
 * Exchange authentication code for token
 * @param {string} code - OAuth authentication code
 * @returns {Promise<Object>} Token exchange result
 */
async function exchangeCodeForToken(code) {
  try {
    console.log('Starting exchange of authentication code for token:', code.substring(0, 8) + '...');

    // Exchange code for token through common module
    const tokenResult = await apiAuth.exchangeCodeForToken({
      code,
      clientId: CLIENT_ID,
      clientSecret: CLIENT_SECRET
    });

    if (!tokenResult.success) {
      return tokenResult;
    }

    // Store tokens
    const { access_token, refresh_token, expires_in } = tokenResult;

    // Store token and expiration time in secure storage
    // Use TOKEN_EXPIRES_IN from environment variables first, then server response, otherwise default to 3600 (1 hour)
    await storeToken(access_token, TOKEN_EXPIRES_IN || expires_in || 3600);
    console.log(`Access token saved successfully (expiration period: ${TOKEN_EXPIRES_IN ? TOKEN_EXPIRES_IN / 3600 + ' hours' : expires_in ? expires_in / 3600 + ' hours' : '1 hour'})`);

    // Store refresh token (if available)
    if (refresh_token) {
      await storeRefreshToken(refresh_token);
      console.log('Refresh token saved successfully');
    }

    // Verify token was saved correctly
    const storedToken = await getStoredToken();
    if (!storedToken) {
      console.error('Failed to verify token storage. Token not found in storage');
    } else {
      console.log('Token storage verification successful');
    }

    return tokenResult;
  } catch (error) {
    console.error('Error occurred during token exchange:', error);

    return {
      success: false,
      error: error.message || 'Unknown error',
      error_details: error.response?.data
    };
  }
}

// Token refresh limit settings
const TOKEN_REFRESH_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes limit for refresh requests
let lastTokenRefresh = 0;
let isRefreshing = false;
let refreshPromise = null;

/**
 * Get new access token using refresh token
 * @returns {Promise<object>} Token refresh result (success: boolean, error?: string)
 */
async function refreshAccessToken() {
  try {
    console.log('Starting token refresh process');

    // Throttling: Skip if not enough time has passed since last refresh request
    const now = Date.now();
    const timeSinceLastRefresh = now - lastTokenRefresh;

    if (timeSinceLastRefresh < TOKEN_REFRESH_COOLDOWN_MS && lastTokenRefresh > 0) {
      console.log(`Recent token refresh attempt (${Math.floor(timeSinceLastRefresh / 1000)} seconds ago). Skipping to prevent duplicate requests.`);
      return { success: true, throttled: true };
    }

    // If already refreshing, return the ongoing refresh promise instead of starting a new one
    if (isRefreshing && refreshPromise) {
      console.log('Token refresh already in progress. Returning existing promise to prevent duplicate requests.');
      return refreshPromise;
    }

    // Set refresh state and create a promise that will be shared across concurrent calls
    isRefreshing = true;
    lastTokenRefresh = now;

    // Create a new shared promise for this refresh operation
    refreshPromise = (async () => {
      try {
        // Check if token is actually expired
        const isExpired = await isTokenExpired();
        if (!isExpired) {
          console.log('Token is still valid. Refresh not needed.');
          return { success: true, refreshNeeded: false };
        }

        // Get refresh token
        const refreshToken = client.getRefreshToken() || await getStoredRefreshToken();

        if (!refreshToken) {
          console.error('No refresh token available');
          return {
            success: false,
            error: 'No refresh token available',
            code: 'NO_REFRESH_TOKEN'
          };
        }

        console.log('Refresh token exists, attempting exchange');

        // Exchange refresh token through common module
        const refreshResult = await apiAuth.refreshAccessToken({
          refreshToken,
          clientId: CLIENT_ID,
          clientSecret: CLIENT_SECRET
        });

        if (!refreshResult.success) {
          // If failed with 401 error, reset tokens
          if (refreshResult.code === 'SESSION_EXPIRED') {
            await clearTokens();
            console.log('Expired tokens reset complete');
          }

          return refreshResult;
        }

        // On success, store new tokens
        const { access_token, refresh_token, expires_in } = refreshResult;

        // Use TOKEN_EXPIRES_IN from environment variables first, then server response, otherwise default to 3600 (1 hour)
        await storeToken(access_token, TOKEN_EXPIRES_IN || expires_in || 3600);
        console.log(`New access token saved successfully (expiration period: ${TOKEN_EXPIRES_IN ? TOKEN_EXPIRES_IN / 3600 + ' hours' : expires_in ? expires_in / 3600 + ' hours' : '1 hour'})`);

        // Store new refresh token (if available)
        if (refresh_token) {
          await storeRefreshToken(refresh_token);
          console.log('New refresh token saved successfully');
        }

        return { success: true };
      } catch (error) {
        console.error('Exception in token refresh:', error);
        return {
          success: false,
          error: error.message || 'Unknown error in token refresh',
          code: 'REFRESH_EXCEPTION'
        };
      } finally {
        // Reset refresh state
        isRefreshing = false;
        refreshPromise = null;
      }
    })(); // Execute the async function immediately and store its promise

    // Return the shared promise
    return refreshPromise;
  } catch (error) {
    console.error('Exception occurred during token refresh process:', error);
    isRefreshing = false; // Reset state even on error

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
 * Handle logout (only delete tokens on client side)
 * @returns {Promise<boolean>} Whether logout was successful
 */
async function logout() {
  try {
    // Delete local tokens without server call
    await clearTokens();
    console.log('Local tokens deleted successfully');

    return true;
  } catch (error) {
    console.error('Logout error:', error);
    return false;
  }
}

/**
 * Get user profile information
 * @returns {Promise<Object>} User profile information
 */
async function fetchUserProfile() {
  try {
    return await apiAuth.fetchUserProfile(refreshAccessToken);
  } catch (error) {
    console.error('Error retrieving profile information:', error);
    return {
      error: {
        code: 'PROFILE_ERROR',
        message: error.message || 'Unable to retrieve profile information.'
      }
    };
  }
}

/**
 * Exchange authentication code for token and update profile information
 * @param {string} code - OAuth authentication code
 * @returns {Promise<Object>} Processing result
 */
async function exchangeCodeForTokenAndUpdateSubscription(code) {
  try {
    // Exchange token
    const tokenResult = await exchangeCodeForToken(code);
    if (!tokenResult.success) {
      return tokenResult;
    }

    // Get subscription information
    try {
      const subscription = await fetchSubscription();
      console.log('Successfully retrieved subscription information');

      // Save subscription information to config
      await updatePageGroupSettings(subscription);

      return {
        success: true,
        subscription
      };
    } catch (subError) {
      console.error('Failed to retrieve subscription information:', subError);

      // Token exchange was successful, so treat as success with warning
      return {
        success: true,
        warning: 'Login was successful, but failed to retrieve subscription information.',
        error_details: subError.message
      };
    }
  } catch (error) {
    console.error('Error during authentication code exchange and subscription update:', error);
    return {
      success: false,
      error: error.message || 'An error occurred during authentication processing.',
      details: error.stack
    };
  }
}

/**
 * Register URI protocol handler (toast-app:// protocol)
 * @returns {void}
 */
function registerProtocolHandler() {
  if (process.platform === 'darwin' || process.platform === 'win32') {
    app.setAsDefaultProtocolClient('toast-app');
  }
}

/**
 * Check if there is a valid access token
 * @returns {Promise<boolean>} Returns true if token is valid
 */
async function hasValidToken() {
  try {
    const token = client.getAccessToken() || await getStoredToken();
    if (!token) {
      return false;
    }

    // If token exists, also check expiration
    const isExpired = await isTokenExpired();
    if (isExpired) {
      console.log('Token has expired. Refresh needed.');
      return false;
    }

    return true;
  } catch (error) {
    console.error('Token validation error:', error);
    return false;
  }
}

/**
 * Get current access token
 * @returns {Promise<string|null>} Access token or null
 */
async function getAccessToken() {
  return client.getAccessToken() || await getStoredToken();
}

/**
 * Update page group settings based on subscription information
 * @param {Object} subscription - Subscription information
 * @returns {Promise<void>}
 */
async function updatePageGroupSettings(subscription) {
  try {
    const config = createConfigStore();

    // Check active status and subscription status
    const isActive = subscription.active || subscription.is_subscribed || false;
    const isVip = subscription.isVip || false;

    // Calculate number of page groups
    let pageGroups = PAGE_GROUPS.ANONYMOUS;
    if (isActive || isVip) {
      if (subscription.plan === 'premium' || subscription.plan === 'pro' || isVip) {
        pageGroups = PAGE_GROUPS.PREMIUM;
      } else {
        pageGroups = PAGE_GROUPS.AUTHENTICATED;
      }
    } else if (subscription.userId && subscription.userId !== 'anonymous') {
      // User is authenticated but not active subscription
      pageGroups = PAGE_GROUPS.AUTHENTICATED;
    }

    // Process expiresAt value - always convert to string
    let expiresAtStr = '';
    try {
      if (subscription.subscribed_until) {
        // Explicitly convert to string and verify valid string
        expiresAtStr = typeof subscription.subscribed_until === 'string'
          ? subscription.subscribed_until
          : String(subscription.subscribed_until);
      } else if (subscription.expiresAt) {
        // Explicitly convert to string and verify valid string
        expiresAtStr = typeof subscription.expiresAt === 'string'
          ? subscription.expiresAt
          : String(subscription.expiresAt);
      }

      // Set to empty string if value is undefined or null
      if (expiresAtStr === 'undefined' || expiresAtStr === 'null') {
        expiresAtStr = '';
      }
    } catch (error) {
      console.error('Error converting expiresAt value:', error);
      expiresAtStr = ''; // Use empty string if error occurs
    }

    console.log('Verifying subscription information before saving:', {
      plan: subscription.plan || 'free',
      expiresAt: expiresAtStr,
      expiresAtType: typeof expiresAtStr,
      pageGroups: subscription.features?.page_groups || pageGroups
    });

    // Safely save subscription information
    config.set('subscription', {
      isAuthenticated: true,
      isSubscribed: isActive,
      plan: subscription.plan || 'free',
      expiresAt: expiresAtStr, // Safely converted to string
      pageGroups: subscription.features?.page_groups || pageGroups,
      isVip: isVip,
      additionalFeatures: {
        advancedActions: subscription.features?.advanced_actions || false,
        cloudSync: subscription.features?.cloud_sync || false
      }
    });

    console.log('Subscription settings update complete:', {
      isAuthenticated: true,
      isSubscribed: isActive,
      plan: subscription.plan || 'free',
      pageGroups: subscription.features?.page_groups || pageGroups
    });
  } catch (error) {
    console.error('Error updating page group settings:', error);
    throw error;
  }
}

/**
 * Logout and reset page group settings
 * @returns {Promise<boolean>} Whether logout was successful
 */
async function logoutAndResetPageGroups() {
  try {
    // Process logout
    const logoutSuccess = await logout();

    if (logoutSuccess) {
      // Reset page group settings
      const config = createConfigStore();
      config.set('subscription', {
        isAuthenticated: false,
        isSubscribed: false,
        expiresAt: '',
        pageGroups: PAGE_GROUPS.ANONYMOUS
      });

      console.log('Logged out and reset page group settings to defaults');
    }

    return logoutSuccess;
  } catch (error) {
    console.error('Logout and reset page groups error:', error);
    return false;
  }
}

// Initialization: Load stored tokens into memory
initializeTokensFromStorage().then(() => {
  console.log('Token state initialization complete');
});

/**
 * Get subscription information
 * @returns {Promise<Object>} Subscription information
 */
async function fetchSubscription() {
  try {
    // Call through profile API and extract subscription information
    const profileData = await fetchUserProfile();

    if (profileData && profileData.subscription) {
      // Successfully retrieved profile data with subscription information
      return profileData.subscription;
    } else if (profileData.error) {
      // Error case
      return profileData;
    } else {
      // Profile exists but no subscription information, return default
      return DEFAULT_ANONYMOUS_SUBSCRIPTION;
    }
  } catch (error) {
    console.error('Failed to retrieve subscription information:', error);
    // Handle as anonymous user if error occurs
    return DEFAULT_ANONYMOUS_SUBSCRIPTION;
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
  updatePageGroupSettings,
  refreshAccessToken
};
