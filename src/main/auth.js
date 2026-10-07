/**
 * Toast - Authentication Module
 *
 * Stores, loads, validates, and refreshes OAuth credentials.
 * The auth manager owns account state, subscription updates, and window notifications.
 * Uses the API authentication module for direct API communications.
 */

const { app, shell, safeStorage } = require('electron');
const path = require('path');
const fs = require('fs');
const { createLogger } = require('./logger');

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
  return Number.isFinite(serverExpiresIn) && serverExpiresIn >= 0
    ? serverExpiresIn
    : Number.isFinite(TOKEN_EXPIRES_IN) ? TOKEN_EXPIRES_IN : DEFAULT_TOKEN_EXPIRES_IN;
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

// Set tokens in memory
async function initializeTokensFromStorage() {
  const generation = authGeneration;
  try {
    const accessToken = await getStoredToken();
    const refreshToken = await getStoredRefreshToken();

    if (generation !== authGeneration) {
      return { accessToken: null, refreshToken: null };
    }

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

    if (!Number.isFinite(expiresAt) || expiresAt <= 0) {
      // Missing or malformed expiry must not be treated as a valid session
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
async function storeTokens(token, refreshToken, expiresIn = DEFAULT_TOKEN_EXPIRES_IN, isRefresh = false) {
  try {
    // Read existing token data
    const tokenData = isRefresh ? readTokenFile() || {} : {};

    // Store new token
    tokenData[TOKEN_KEY] = token;
    if (refreshToken) {
      tokenData[REFRESH_TOKEN_KEY] = refreshToken;
    }

    // Calculate and store expiration time
    let expiresAt;
    if (expiresIn < 0) {
      // An explicit negative legacy override means unlimited expiration time (use a very distant future date)
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

    // Publish credentials only after the durable write succeeds. Otherwise a
    // failed login could leave memory and disk authenticated as different users.
    if (isRefresh) {
      client.setAccessToken(token, { refresh: true });
    }
    else {
      client.setAccessToken(token);
    }
    if (refreshToken || !isRefresh) {
      client.setRefreshToken(refreshToken || null);
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

    logger.info('Starting exchange of authentication code for token');

    const exchangeStartGeneration = ++authGeneration;

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
    if (authGeneration !== exchangeStartGeneration) {
      logger.warn('Session changed during code exchange; discarding issued tokens');
      return { success: false, error: 'Session changed during authentication' };
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
    // Axios errors contain credential-bearing request bodies; log only the summary.
    logger.error('Error occurred during token exchange:', error.message, { status: error.response?.status });

    return {
      success: false,
      error: error.message || 'Unknown error',
    };
  }
}

// Share refresh requests so a rotating refresh token is consumed only once.
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

// Invalidates asynchronous credential work on both new logins and logout.
let authGeneration = 0;

/**
 * Get new access token using refresh token
 * @returns {Promise<object>} Token refresh result (success: boolean, error?: string)
 */
function refreshAccessToken({ force = false } = {}) {
  if (isLoggingOut) {
    return Promise.resolve({ success: false, error: 'Logout in progress', code: 'LOGOUT_IN_PROGRESS' });
  }
  if (refreshPromise) {
    return refreshPromise;
  }
  const generation = authGeneration;
  refreshPromise = Promise.resolve().then(async () => {
    try {
      if (!force && !(await isTokenExpired())) {
        return { success: true, refreshNeeded: false };
      }
      const refreshToken = client.getRefreshToken() || (await getStoredRefreshToken());
      if (!refreshToken) {
        return { success: false, error: 'No refresh token available', code: 'NO_REFRESH_TOKEN' };
      }
      if (!CLIENT_ID || !CLIENT_SECRET) {
        return { success: false, error: 'OAuth client configuration is missing.', code: 'NO_CREDENTIALS' };
      }
      if (isLoggingOut || generation !== authGeneration) {
        return { success: false, code: 'AUTH_SESSION_CHANGED', error: 'The account changed during token refresh' };
      }
      const result = await apiAuth.refreshAccessToken({ refreshToken, clientId: CLIENT_ID, clientSecret: CLIENT_SECRET });
      if (isLoggingOut || generation !== authGeneration) {
        return { success: false, code: 'LOGGED_OUT_DURING_REFRESH', error: 'The account changed during token refresh' };
      }
      if (!result.success) {
        if (result.code === 'SESSION_EXPIRED') {
          await apiAuth.logout();
          if (generation !== authGeneration) {
            return { success: false, code: 'AUTH_SESSION_CHANGED', error: 'The account changed during token refresh' };
          }
          await clearLocalTokenStorage();
          if (generation !== authGeneration) {
            return { success: false, code: 'AUTH_SESSION_CHANGED', error: 'The account changed during token refresh' };
          }
          if (sessionExpiredHandler) {
            Promise.resolve(sessionExpiredHandler()).catch(error => logger.error('Session-expired handler failed:', error.message));
          }
        }
        return result;
      }
      await storeTokens(result.access_token, result.refresh_token, resolveExpiresIn(result.expires_in), true);
      return { success: true };
    }
    catch (error) {
      logger.error('Token refresh failed:', error.message);
      return { success: false, code: 'REFRESH_EXCEPTION', error: error.message };
    }
  }).finally(() => {
    refreshPromise = null;
  });
  return refreshPromise;
}

/**
 * Revoke and delete credentials; auth-manager owns profile and subscription state.
 * @returns {Promise<boolean>} Whether logout was successful
 */
async function logout() {
  // Set synchronously, before any await, so a refreshAccessToken() call made anywhere
  // in this logout's duration is stopped by the early guard instead of racing it.
  isLoggingOut = true;
  authGeneration++;
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

    logger.info('Local credentials cleared');

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
  const generation = authGeneration;
  try {
    if (isLoggingOut) {
      return false;
    }
    const token = client.getAccessToken() || (await getStoredToken());
    if (!token || generation !== authGeneration || isLoggingOut) {
      return false;
    }
    if (!client.getAccessToken()) {
      client.setAccessToken(token);
    }

    // If token exists, also check expiration
    const isExpired = await isTokenExpired();
    if (generation !== authGeneration || isLoggingOut) {
      return false;
    }
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

// Initialization: Load stored tokens into memory
initializeTokensFromStorage().then(() => {
  logger.info('Token state initialization complete');
});

module.exports = {
  initiateLogin,
  exchangeCodeForToken,
  logout,
  fetchUserProfile,
  registerProtocolHandler,
  validateStateParam: apiAuth.validateStateParam,
  hasValidToken,
  getAccessToken,
  refreshAccessToken,
  setSessionExpiredHandler,
};
