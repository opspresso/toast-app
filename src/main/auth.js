/**
 * Toast - Authentication Module
 *
 * This module is for OAuth 2.0 authentication and subscription management.
 * Handles token storage, retrieval, validation, and high-level authentication flow.
 * Uses the API authentication module for direct API communications.
 */

const { app, shell, safeStorage } = require('electron');
const path = require('path');
const fs = require('fs');
const { createLogger, maskAuthUrl } = require('./logger');
const { createConfigStore } = require('./config');

// Create logger for this module
const logger = createLogger('Auth');

// Import API modules
const client = require('./api/client');
const apiAuth = require('./api/auth');

// ENV
const { getEnv } = require('./config/env');
// Security: Do not use hardcoded default credentials
// These must be provided via environment variables or .env file
const CLIENT_ID = getEnv('CLIENT_ID', '');
const CLIENT_SECRET = getEnv('CLIENT_SECRET', '');
// Set token expiration time to unlimited (set to a very long duration)
const DEFAULT_TOKEN_EXPIRES_IN = 31536000; // 1 year (365 days), in seconds
const TOKEN_EXPIRES_IN = parseInt(getEnv('TOKEN_EXPIRES_IN', String(DEFAULT_TOKEN_EXPIRES_IN)), 10); // Can be overridden in environment variables

/**
 * Resolve the token lifetime to persist.
 * Priority: the server's expires_in (reflects actual JWT expiration), then
 * the TOKEN_EXPIRES_IN env var, then the 1-year default.
 * @param {number} [serverExpiresIn] - expires_in from the token/refresh response
 * @returns {number} Expiration lifetime in seconds
 */
function resolveExpiresIn(serverExpiresIn) {
  return serverExpiresIn || TOKEN_EXPIRES_IN || DEFAULT_TOKEN_EXPIRES_IN;
}
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
const { isSubscriptionActive, calculatePageGroups, normalizeExpiryString } = require('./subscription');

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
  }
  catch (error) {
    logger.error('Error initializing tokens:', error);
    return { accessToken: null, refreshToken: null };
  }
}

/**
 * Read token data from local file. Token files are stored as plaintext JSON;
 * a file encrypted by a previous version (via OS keychain/safeStorage) is
 * transparently decrypted here and immediately migrated to plaintext, so the
 * Keychain is consulted at most once rather than on every future read.
 * @returns {Object|null} Token data object or null
 */
function readTokenFile() {
  try {
    if (!fs.existsSync(TOKEN_FILE_PATH)) {
      return null;
    }

    // Tighten permissions on files created before the 0600 policy
    try {
      fs.chmodSync(TOKEN_FILE_PATH, 0o600);
    }
    catch (chmodError) {
      logger.error('Error setting token file permissions:', chmodError);
    }

    const raw = fs.readFileSync(TOKEN_FILE_PATH);
    try {
      // Legacy plaintext files parse directly; encrypted files do not.
      return JSON.parse(raw.toString('utf8'));
    }
    catch (parseError) {
      if (!safeStorage.isEncryptionAvailable()) {
        throw parseError;
      }
      const tokenData = JSON.parse(safeStorage.decryptString(raw));
      // Migrate now instead of waiting for the next login/refresh, which may
      // not happen for a long time (TOKEN_EXPIRES_IN defaults to 1 year).
      if (!writeTokenFile(tokenData)) {
        logger.error('Failed to migrate encrypted token file to plaintext');
      }
      return tokenData;
    }
  }
  catch (error) {
    logger.error('Error reading token file:', error);
    return null;
  }
}

/**
 * Save token data to local file using atomic write operation to prevent corruption.
 * Stored as plaintext JSON with owner-only file permissions (0600).
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

    const json = JSON.stringify(tokenData, null, 2);

    // First write to a temporary file (owner read/write only)
    fs.writeFileSync(tempFilePath, json, { mode: 0o600 });

    // Verify the written data is valid
    try {
      const verifyRaw = fs.readFileSync(tempFilePath);
      JSON.parse(verifyRaw.toString('utf8'));
    }
    catch (verifyError) {
      logger.error('Error verifying written token data:', verifyError);
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
        }
        catch (unlinkError) {
          logger.error('Error removing existing token file:', unlinkError);
        }
      }
    }

    fs.renameSync(tempFilePath, TOKEN_FILE_PATH);

    // Tighten permissions on files created before the 0600 policy
    try {
      fs.chmodSync(TOKEN_FILE_PATH, 0o600);
    }
    catch (chmodError) {
      logger.error('Error setting token file permissions:', chmodError);
    }

    return true;
  }
  catch (error) {
    logger.error('Error saving token file:', error);
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
  }
  catch (error) {
    logger.error('Failed to get token from local file:', error);
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
  }
  catch (error) {
    logger.error('Failed to get refresh token from local file:', error);
    return null;
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
  }
  catch (error) {
    logger.error('Failed to get token expiration time:', error);
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

    // Treat unlimited tokens (very distant future date) as not expired
    if (expiresAt >= 8640000000000000) {
      logger.info('Token is set to unlimited expiration');
      return false;
    }

    // Compare with current time to check expiration
    const now = Date.now();

    // Consider expired if within safety margin (30 seconds before actual expiry)
    const safetyMargin = 30 * 1000; // 30 seconds
    const isNearExpiry = now >= expiresAt - safetyMargin;

    if (isNearExpiry) {
      logger.info('Token is about to expire or already expired');
      return true;
    }

    // Log remaining time for valid tokens
    const remainingMinutes = Math.floor((expiresAt - now) / (60 * 1000));
    logger.info(`Current token validity: approximately ${remainingMinutes} minutes remaining`);

    return false;
  }
  catch (error) {
    logger.error('Error checking token expiration:', error);
    // Consider expired if error occurs, for safety
    return true;
  }
}

/**
 * Store the access token and (optionally) a rotated refresh token in a single
 * atomic write. The server rotates the refresh token on every refresh and
 * revokes the previous one immediately, so writing them in two separate file
 * operations left a window where a crash/quit between the two could strand
 * the local file on the now-revoked refresh token, forcing a re-login.
 * @param {string} token - Authentication token to store
 * @param {string} [refreshToken] - Refresh token to store, if a new one was issued
 * @param {number} expiresIn - Token expiration time in seconds
 * @returns {Promise<void>}
 */
async function storeTokens(token, refreshToken, expiresIn = DEFAULT_TOKEN_EXPIRES_IN) {
  try {
    // Set tokens in client
    client.setAccessToken(token);
    if (refreshToken) {
      client.setRefreshToken(refreshToken);
    }

    // Read existing token data
    const tokenData = readTokenFile() || {};

    // Store new token
    tokenData[TOKEN_KEY] = token;
    if (refreshToken) {
      tokenData[REFRESH_TOKEN_KEY] = refreshToken;
    }

    // Calculate and store expiration time
    let expiresAt;
    if (expiresIn <= 0) {
      // Treat negative or zero values as unlimited expiration time (use a very distant future date)
      expiresAt = 8640000000000000; // Maximum date supported by JavaScript (about 270 million years)
      logger.info('Token expiration time set to unlimited.');
    }
    else {
      expiresAt = Date.now() + expiresIn * 1000;
    }
    tokenData[TOKEN_EXPIRES_KEY] = expiresAt;

    // Save to file
    if (!writeTokenFile(tokenData)) {
      throw new Error('Failed to save token file');
    }

    logger.info(`Token saved successfully, expiration time: ${new Date(expiresAt).toLocaleString()}`);
  }
  catch (error) {
    logger.error('Failed to save token:', error);
    throw error;
  }
}

/**
 * Delete tokens from local file
 * @returns {Promise<void>}
 */
async function clearLocalTokenStorage() {
  try {
    // Delete token file if it exists
    if (fs.existsSync(TOKEN_FILE_PATH)) {
      fs.unlinkSync(TOKEN_FILE_PATH);
      logger.info('Local token file cleared');
    }
  }
  catch (error) {
    logger.error('Failed to delete local token file:', error);
    throw error;
  }
}

/**
 * Start login process (open OAuth authentication page)
 * @returns {Promise<boolean>} Returns true if process is started
 */
async function initiateLogin() {
  try {
    // Verify CLIENT_ID is configured
    if (!CLIENT_ID) {
      logger.error('CLIENT_ID is not configured. Please set CLIENT_ID in environment variables or .env file.');
      throw new Error('OAuth client configuration is missing. Please contact support.');
    }

    // Generate login URL through common module
    const loginResult = apiAuth.initiateLogin(CLIENT_ID);

    if (!loginResult.success) {
      throw new Error(loginResult.error || 'Failed to start login process');
    }

    // Open authentication page in default browser
    await shell.openExternal(loginResult.url);

    return true;
  }
  catch (error) {
    logger.error('Failed to initiate login:', error);
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
    logger.info('Processing auth redirect:', maskAuthUrl(url));

    // Extract parameters directly from the URL
    const urlObj = new URL(url);
    const code = urlObj.searchParams.get('code');
    const token = urlObj.searchParams.get('token');
    const userId = urlObj.searchParams.get('userId');
    const action = urlObj.searchParams.get('action');

    // Handle deep link from the Connect page (using token, userId, action parameters)
    if (action === 'reload_auth' && token && userId) {
      logger.info('Auth reload action detected with token from connect page');

      // Check current authentication status
      const hasToken = await hasValidToken();

      if (hasToken) {
        // If already authenticated, just refresh subscription information
        logger.info('Already authenticated, refreshing subscription info');
        const refreshResult = await refreshSubscriptionSettings();

        return {
          ...refreshResult,
          message: refreshResult.success ? 'Authentication refreshed' : undefined,
        };
      }
      else {
        // If not authenticated, start login process
        logger.info('Not authenticated, initiating login process');
        // initiateLogin() resolves to a boolean, but handleAuthRedirect's contract
        // (and its caller's result.success check) expects an object.
        const started = await initiateLogin();
        return { success: started };
      }
    }

    // Existing OAuth code handling logic
    if (code) {
      const redirectResult = await apiAuth.handleAuthRedirect({
        url,
        onCodeExchange: async code =>
          // Exchange code for token and update subscription information
          await exchangeCodeForTokenAndUpdateSubscription(code),
      });

      // Process 'reload_auth' action
      if (redirectResult.success && redirectResult.action === 'reload_auth') {
        logger.info('Auth reload action detected from OAuth flow');

        // Check if token exists
        if (!redirectResult.token) {
          logger.error('No token provided for auth reload');
          return {
            success: false,
            error: 'Missing token for auth reload',
          };
        }

        // Check current authentication status
        const hasToken = await hasValidToken();

        if (hasToken) {
          // If already authenticated, just refresh subscription information
          logger.info('Already authenticated, refreshing subscription info');
          const refreshResult = await refreshSubscriptionSettings();

          return {
            ...refreshResult,
            message: refreshResult.success ? 'Authentication refreshed' : undefined,
          };
        }
        else {
          // If not authenticated, start login process
          logger.info('Not authenticated, initiating login process');
          // initiateLogin() resolves to a boolean, but handleAuthRedirect's contract
          // (and its caller's result.success check) expects an object.
          const started = await initiateLogin();
          return { success: started };
        }
      }

      return redirectResult;
    }

    return {
      success: false,
      error: 'Invalid URL parameters',
    };
  }
  catch (error) {
    logger.error('Failed to handle auth redirect:', error);
    return {
      success: false,
      error: error.message || 'Unknown error',
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
    if (isLoggingOut) {
      logger.info('Logout in progress; aborting code exchange');
      return { success: false, error: 'Logout in progress' };
    }

    // Verify OAuth credentials are configured
    if (!CLIENT_ID || !CLIENT_SECRET) {
      logger.error('OAuth credentials are not configured. Please set CLIENT_ID and CLIENT_SECRET in environment variables or .env file.');
      return {
        success: false,
        error: 'OAuth client configuration is missing. Please contact support.',
      };
    }

    logger.info('Starting exchange of authentication code for token:', code.substring(0, 8) + '...');

    const exchangeStartGeneration = logoutGeneration;

    // Exchange code for token through common module
    const tokenResult = await apiAuth.exchangeCodeForToken({
      code,
      clientId: CLIENT_ID,
      clientSecret: CLIENT_SECRET,
    });

    if (!tokenResult.success) {
      return tokenResult;
    }

    // A logout may have completed while the exchange above was in flight — storing these
    // tokens now would resurrect a session the user just ended (and this refresh token,
    // issued after logout's revoke call, was never revoked on the server).
    if (logoutGeneration !== exchangeStartGeneration) {
      logger.warn('Logout occurred during code exchange; discarding issued tokens');
      return { success: false, error: 'Logged out during authentication' };
    }

    // Store tokens
    const { access_token, refresh_token, expires_in } = tokenResult;

    // Store the access and refresh token together in one atomic write.
    const tokenExpiresIn = resolveExpiresIn(expires_in);
    await storeTokens(access_token, refresh_token, tokenExpiresIn);
    logger.info(`Access token saved successfully (expiration period: ${tokenExpiresIn / 86400} days)`);

    // Verify token was saved correctly
    const storedToken = await getStoredToken();
    if (!storedToken) {
      logger.error('Failed to verify token storage. Token not found in storage');
    }
    else {
      logger.info('Token storage verification successful');
    }

    return tokenResult;
  }
  catch (error) {
    // Full error (including any server response body) goes to the log only;
    // callers only need a human-readable message, not raw server internals.
    logger.error('Error occurred during token exchange:', error, error.response?.data);

    return {
      success: false,
      error: error.message || 'Unknown error',
    };
  }
}

// Token refresh limit settings
const TOKEN_REFRESH_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes limit for refresh requests
let lastTokenRefresh = 0;
let isRefreshing = false;
let refreshPromise = null;

// Invoked when a refresh discovers the session itself is dead (SESSION_EXPIRED), so callers
// that reach refreshAccessToken outside auth-manager's own requireRelogin checks (e.g.
// hasValidToken's automatic refresh) still trigger a full app-level logout instead of
// silently leaving the app in a stale "logged in" state.
let sessionExpiredHandler = null;
function setSessionExpiredHandler(fn) {
  sessionExpiredHandler = fn;
}

// True for the duration of logout() (from the moment it's called until it fully
// completes), so a refresh that would otherwise start mid-logout is stopped before it
// ever contacts the server — see the early guard below.
let isLoggingOut = false;

// Incremented when logout() actually deletes the local token file, so a refresh that was
// already in flight *before* logout began (and therefore passed the isLoggingOut guard
// above) can still detect — right before it would persist new tokens — that a logout has
// since completed, and avoid resurrecting the file logout just deleted.
let logoutGeneration = 0;

/**
 * Get new access token using refresh token
 * @returns {Promise<object>} Token refresh result (success: boolean, error?: string)
 */
async function refreshAccessToken() {
  try {
    logger.info('Starting token refresh process');

    if (isLoggingOut) {
      logger.info('Logout in progress; skipping token refresh');
      return { success: false, error: 'Logout in progress', code: 'LOGOUT_IN_PROGRESS' };
    }

    // If already refreshing, return the ongoing refresh promise instead of starting a new
    // one. Checked before the throttle window below so a second caller sharing the same
    // in-flight refresh isn't misrouted into REFRESH_THROTTLED.
    if (isRefreshing && refreshPromise) {
      logger.info('Token refresh already in progress. Returning existing promise to prevent duplicate requests.');
      return refreshPromise;
    }

    // Throttling: Skip if not enough time has passed since last refresh request
    const now = Date.now();
    const timeSinceLastRefresh = now - lastTokenRefresh;

    if (timeSinceLastRefresh < TOKEN_REFRESH_COOLDOWN_MS && lastTokenRefresh > 0) {
      logger.info(`Recent token refresh attempt (${Math.floor(timeSinceLastRefresh / 1000)} seconds ago). Skipping to prevent duplicate requests.`);

      // Check if the current token is still valid
      const isExpired = await isTokenExpired();
      if (!isExpired) {
        // If the token is valid, treat as success
        logger.info('Current token is still valid. Returning success.');
        return { success: true, throttled: true, tokenValid: true };
      }
      else {
        // If the token is expired but throttled, return an error
        logger.warn('Token is expired but refresh is throttled. Returning error.');
        return {
          success: false,
          throttled: true,
          error: 'Token refresh is throttled. Please try again later.',
          code: 'REFRESH_THROTTLED',
        };
      }
    }

    // Set refresh state and create a promise that will be shared across concurrent calls
    isRefreshing = true;
    lastTokenRefresh = now;
    const refreshStartGeneration = logoutGeneration;

    // Create a new shared promise for this refresh operation
    refreshPromise = (async () => {
      try {
        // Check if token is actually expired
        const isExpired = await isTokenExpired();
        if (!isExpired) {
          logger.info('Token is still valid. Refresh not needed.');
          return { success: true, refreshNeeded: false };
        }

        // Get refresh token
        const refreshToken = client.getRefreshToken() || (await getStoredRefreshToken());

        if (!refreshToken) {
          logger.error('No refresh token available');
          return {
            success: false,
            error: 'No refresh token available',
            code: 'NO_REFRESH_TOKEN',
          };
        }

        logger.info('Refresh token exists, attempting exchange');

        // Verify OAuth credentials are configured
        if (!CLIENT_ID || !CLIENT_SECRET) {
          logger.error('OAuth credentials are not configured for token refresh.');
          return {
            success: false,
            error: 'OAuth client configuration is missing.',
            code: 'NO_CREDENTIALS',
          };
        }

        // Exchange refresh token through common module
        const refreshResult = await apiAuth.refreshAccessToken({
          refreshToken,
          clientId: CLIENT_ID,
          clientSecret: CLIENT_SECRET,
        });

        if (!refreshResult.success) {
          // If failed with 401 error, reset tokens
          if (refreshResult.code === 'SESSION_EXPIRED') {
            // Reset API tokens
            const apiLogoutResult = await apiAuth.logout();
            if (!apiLogoutResult.success) {
              logger.warn('API logout warning during token reset:', apiLogoutResult.error);
            }

            // Delete local token file
            await clearLocalTokenStorage();
            logger.info('Expired tokens reset complete');

            // Notify the app-level logout handler so callers that reach this refresh
            // directly (e.g. hasValidToken) also stop cloud sync and update the UI,
            // instead of only clearing local token storage.
            if (sessionExpiredHandler) {
              Promise.resolve(sessionExpiredHandler()).catch(handlerError => {
                logger.error('Session-expired handler failed:', handlerError);
              });
            }
          }

          // Only a successful refresh should start the cooldown — leaving it set after a
          // failure (e.g. a transient network error) would lock out retries for the full
          // cooldown window even though the very next attempt might succeed.
          lastTokenRefresh = 0;

          return refreshResult;
        }

        // On success, store new tokens — unless a logout completed while this refresh was
        // in flight, in which case the token file was already deleted and this response's
        // rotated token was never revoked; writing it back would silently undo the logout.
        // Comparing generations (bumped only when logout actually deletes the file) rather
        // than timestamps correctly catches this regardless of which of the two started
        // first — a start-time comparison would miss a logout that began before this
        // refresh but finished after it.
        if (logoutGeneration !== refreshStartGeneration) {
          logger.warn('Logout occurred during token refresh; discarding refreshed tokens');
          return {
            success: false,
            error: 'Logged out during token refresh',
            code: 'LOGGED_OUT_DURING_REFRESH',
          };
        }

        const { access_token, refresh_token, expires_in } = refreshResult;

        const tokenExpiresIn = resolveExpiresIn(expires_in);
        await storeTokens(access_token, refresh_token, tokenExpiresIn);
        logger.info(`New token(s) saved successfully (expiration period: ${tokenExpiresIn / 86400} days)`);

        return { success: true };
      }
      catch (error) {
        logger.error('Exception in token refresh:', error);
        lastTokenRefresh = 0;
        return {
          success: false,
          error: error.message || 'Unknown error in token refresh',
          code: 'REFRESH_EXCEPTION',
        };
      }
      finally {
        // Reset refresh state
        isRefreshing = false;
        refreshPromise = null;
      }
    })(); // Execute the async function immediately and store its promise

    // Return the shared promise
    return refreshPromise;
  }
  catch (error) {
    logger.error('Exception occurred during token refresh process:', error);
    isRefreshing = false; // Reset state even on error

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
 * Handle logout (delete tokens and reset page group settings)
 * @returns {Promise<boolean>} Whether logout was successful
 */
async function logout() {
  // Set synchronously, before any await, so a refreshAccessToken() call made anywhere
  // in this logout's duration is stopped by the early guard instead of racing it.
  isLoggingOut = true;
  try {
    // Revoke the refresh token on the server before deleting it locally, so
    // it cannot be used to mint new access tokens after logout.
    const refreshToken = await getStoredRefreshToken();
    const revokeResult = await apiAuth.revokeToken({ refreshToken, clientId: CLIENT_ID, clientSecret: CLIENT_SECRET });
    if (!revokeResult.success) {
      logger.warn('Refresh token revocation warning:', revokeResult.error);
    }

    // Call API logout to clear memory tokens
    const apiLogoutResult = await apiAuth.logout();
    if (!apiLogoutResult.success) {
      logger.warn('API logout warning:', apiLogoutResult.error);
    }

    // Delete local token storage
    if (fs.existsSync(TOKEN_FILE_PATH)) {
      fs.unlinkSync(TOKEN_FILE_PATH);
      logger.info('Local token file deleted successfully');
    }

    // Local token state is now finalized as logged-out; bump the generation so a refresh
    // that was already in flight before this logout began (and so passed the early guard)
    // discards its result instead of resurrecting the file just deleted above.
    logoutGeneration += 1;

    // Reset page group settings
    const config = createConfigStore();
    config.set('subscription', {
      isAuthenticated: false,
      isSubscribed: false,
      expiresAt: '',
      pageGroups: PAGE_GROUPS.ANONYMOUS,
    });

    logger.info('Logged out and reset page group settings to defaults');

    return true;
  }
  catch (error) {
    logger.error('Logout error:', error);
    return false;
  }
  finally {
    isLoggingOut = false;
  }
}

/**
 * Get user profile information
 * @returns {Promise<Object>} User profile information
 */
async function fetchUserProfile() {
  try {
    return await apiAuth.fetchUserProfile(refreshAccessToken);
  }
  catch (error) {
    logger.error('Error retrieving profile information:', error);
    return {
      error: {
        code: 'PROFILE_ERROR',
        message: error.message || 'Unable to retrieve profile information.',
      },
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
      const result = await refreshSubscriptionSettings();
      if (!result.success) {
        return result;
      }
      logger.info('Successfully retrieved subscription information');

      return {
        success: true,
        subscription: result.subscription,
      };
    }
    catch (subError) {
      logger.error('Failed to retrieve subscription information:', subError);

      // Token exchange was successful, so treat as success with warning
      return {
        success: true,
        warning: 'Login was successful, but failed to retrieve subscription information.',
        error_details: subError.message,
      };
    }
  }
  catch (error) {
    // Stack trace goes to the log only; callers only need a human-readable message.
    logger.error('Error during authentication code exchange and subscription update:', error);
    return {
      success: false,
      error: error.message || 'An error occurred during authentication processing.',
    };
  }
}

/**
 * Register URI protocol handler (toast-app:// protocol)
 * @returns {void}
 */
function registerProtocolHandler() {
  // In unpackaged (dev) mode, registering would point the toast-app:// scheme at the
  // bare Electron binary: the OAuth callback then launches an empty Electron window
  // instead of reaching this instance, and the installed app loses the scheme.
  // Deep-link login only works in packaged builds, so skip registration in dev.
  if (!app.isPackaged) {
    logger.warn('Skipping toast-app:// protocol registration in dev mode; deep-link login requires a packaged build');
    return;
  }

  // Register protocol handler for all platforms (macOS, Windows, Linux)
  app.setAsDefaultProtocolClient('toast-app');
}

/**
 * Check if there is a valid access token
 * @returns {Promise<boolean>} Returns true if token is valid
 */
async function hasValidToken() {
  try {
    const token = client.getAccessToken() || (await getStoredToken());
    if (!token) {
      return false;
    }

    // If token exists, also check expiration
    const isExpired = await isTokenExpired();
    if (isExpired) {
      // Attempt automatic refresh for expired tokens. If we only returned false
      // without refreshing, callers gated on hasValidToken (cloud sync, icon
      // upload) would never send the request, so 401-based refresh would never
      // happen either.
      logger.info('Token has expired. Attempting automatic refresh.');
      const refreshResult = await refreshAccessToken();
      if (refreshResult && refreshResult.success) {
        return true;
      }
      logger.warn('Automatic token refresh failed:', refreshResult && (refreshResult.code || refreshResult.error));
      return false;
    }

    return true;
  }
  catch (error) {
    logger.error('Token validation error:', error);
    return false;
  }
}

/**
 * Get current access token
 * @returns {Promise<string|null>} Access token or null
 */
async function getAccessToken() {
  return client.getAccessToken() || (await getStoredToken());
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
    const isActive = isSubscriptionActive(subscription);
    const isVip = subscription.isVip || false;

    // Calculate number of page groups
    const pageGroups = calculatePageGroups(subscription);

    // Process expiresAt value - always convert to string
    const expiresAtStr = normalizeExpiryString(subscription.subscribed_until || subscription.expiresAt);

    logger.info('Verifying subscription information before saving:', {
      plan: subscription.plan || 'free',
      expiresAt: expiresAtStr,
      expiresAtType: typeof expiresAtStr,
      pageGroups: subscription.features?.page_groups || pageGroups,
    });

    // Safely save subscription information
    config.set('subscription', {
      isAuthenticated: true,
      isSubscribed: isActive,
      active: isActive, // Add active field for compatibility
      plan: subscription.plan || 'free',
      expiresAt: expiresAtStr, // Safely converted to string
      pageGroups: subscription.features?.page_groups || pageGroups,
      isVip,
      features: {
        page_groups: subscription.features?.page_groups || pageGroups,
        advanced_actions: subscription.features?.advanced_actions || false,
        cloud_sync: subscription.features?.cloud_sync || false,
      },
      additionalFeatures: {
        advancedActions: subscription.features?.advanced_actions || false,
        cloudSync: subscription.features?.cloud_sync || false,
      },
    });

    logger.info('Subscription settings update complete:', {
      isAuthenticated: true,
      isSubscribed: isActive,
      plan: subscription.plan || 'free',
      pageGroups: subscription.features?.page_groups || pageGroups,
    });
  }
  catch (error) {
    logger.error('Error updating page group settings:', error);
    throw error;
  }
}

/**
 * Fetch the latest subscription and persist it as an authenticated ConfigStore write —
 * unless a logout completed while the fetch was in flight, in which case the write is
 * skipped so it can't resurrect config state the logout just reset to anonymous.
 * @returns {Promise<{success: boolean, subscription?: object, error?: string}>}
 */
async function refreshSubscriptionSettings() {
  const startGeneration = logoutGeneration;
  const subscription = await fetchSubscription();

  if (logoutGeneration !== startGeneration) {
    logger.warn('Logout occurred during subscription fetch; discarding subscription update');
    return { success: false, error: 'Logged out during authentication' };
  }

  // fetchSubscription() returns the error-shaped profileData as-is on failure (see its
  // own else-if branch below), not a subscription object — writing it through as if it
  // were one would mark the config authenticated despite the fetch having failed.
  if (!subscription || subscription.error) {
    logger.error('Failed to retrieve subscription information:', subscription?.error);
    return { success: false, error: subscription?.error?.message || 'Failed to retrieve subscription information' };
  }

  await updatePageGroupSettings(subscription);
  return { success: true, subscription };
}

// Initialization: Load stored tokens into memory
initializeTokensFromStorage().then(() => {
  logger.info('Token state initialization complete');
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
    }
    else if (profileData.error) {
      // Error case
      return profileData;
    }
    else {
      // Profile exists but no subscription information, return default
      return DEFAULT_ANONYMOUS_SUBSCRIPTION;
    }
  }
  catch (error) {
    logger.error('Failed to retrieve subscription information:', error);
    // Handle as anonymous user if error occurs
    return DEFAULT_ANONYMOUS_SUBSCRIPTION;
  }
}

module.exports = {
  initiateLogin,
  exchangeCodeForToken,
  exchangeCodeForTokenAndUpdateSubscription,
  logout,
  fetchUserProfile,
  fetchSubscription,
  registerProtocolHandler,
  handleAuthRedirect,
  validateStateParam: apiAuth.validateStateParam,
  hasValidToken,
  getAccessToken,
  updatePageGroupSettings,
  refreshAccessToken,
  setSessionExpiredHandler,
};
