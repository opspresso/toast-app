/**
 * Toast API - Settings Synchronization API Module
 *
 * Synchronizes Toast-App settings (pages and button information, etc.) with the Toast-Web server.
 */

const os = require('os');
const {
  ENDPOINTS,
  createApiClient,
  getAuthHeaders,
  authenticatedRequest
} = require('./client');

// Synchronization state management
const state = {
  lastSyncTime: 0,
  isSyncing: false,
  lastSyncStatus: {
    success: false,
    timestamp: 0,
    error: null
  }
};

/**
 * Check if cloud synchronization is possible
 * @param {Object} params - Synchronization possibility parameters
 * @param {Function} params.hasValidToken - Function to check for valid token
 * @param {Object} params.configStore - Configuration store
 * @returns {Promise<boolean>} Whether synchronization is possible
 */
async function isCloudSyncEnabled({ hasValidToken, configStore }) {
  try {
    // Check authentication status
    const isAuthenticated = await hasValidToken();
    if (!isAuthenticated) {
      return false;
    }

    // Check subscription information
    const subscription = configStore.get('subscription') || {};

    // Check if cloud_sync feature is enabled
    let hasSyncFeature = false;

    // Support for various subscription information formats
    if (subscription.isSubscribed === true ||
      subscription.active === true ||
      subscription.is_subscribed === true) {
      hasSyncFeature = true;
    }

    return hasSyncFeature;
  } catch (error) {
    console.error('Error checking synchronization availability:', error);
    return false;
  }
}

/**
 * Upload current settings to server
 * @param {Object} params - Upload parameters
 * @param {Function} params.hasValidToken - Function to check for valid token
 * @param {Function} params.onUnauthorized - Callback function for authentication failure
 * @param {Object} params.configStore - Configuration store
 * @param {Object} [params.directData] - Data to upload directly to server
 * @returns {Promise<Object>} Upload result
 */
async function uploadSettings({ hasValidToken, onUnauthorized, configStore, directData }) {
  // Skip if already syncing
  if (state.isSyncing) {
    return { success: false, error: 'Already syncing' };
  }

  state.isSyncing = true;

  try {
    // Check for valid data
    if (!directData) {
      throw new Error('Invalid data');
    }

    // API request
    return await authenticatedRequest(async () => {
      const headers = getAuthHeaders();
      const apiClient = createApiClient();


      const response = await apiClient.put(ENDPOINTS.SETTINGS, directData, { headers });

      // Record synchronization completion time
      state.lastSyncTime = Date.now();
      state.lastSyncStatus = {
        success: true,
        timestamp: state.lastSyncTime,
        error: null
      };

      return { success: true, data: response.data };
    }, { onUnauthorized });
  } catch (error) {
    console.error('Settings upload error:', error);

    state.lastSyncStatus = {
      success: false,
      timestamp: Date.now(),
      error: error.message || 'Unknown error'
    };

    return {
      success: false,
      error: error.message || 'Unknown error'
    };
  } finally {
    state.isSyncing = false;
  }
}

/**
 * Download settings from server
 * @param {Object} params - Download parameters
 * @param {Function} params.hasValidToken - Function to check for valid token
 * @param {Function} params.onUnauthorized - Callback function for authentication failure
 * @param {Object} params.configStore - Configuration store
 * @returns {Promise<Object>} Download result
 */
async function downloadSettings({ hasValidToken, onUnauthorized, configStore }) {
  // Skip if already syncing
  if (state.isSyncing) {
    return { success: false, error: 'Already syncing' };
  }

  state.isSyncing = true;

  try {
    // API request
    return await authenticatedRequest(async () => {
      const headers = getAuthHeaders();

      const apiClient = createApiClient();
      const response = await apiClient.get(ENDPOINTS.SETTINGS, { headers });

      const settings = response.data;

      // Validation check
      if (!settings) {
        throw new Error('Invalid settings data: Response is empty');
      }

      // Handle various data structures
      let pagesData = null;

      // settings.data.pages format
      if (settings.data && Array.isArray(settings.data.pages)) {
        pagesData = settings.data.pages;
      }
      // settings.pages format
      else if (Array.isArray(settings.pages)) {
        pagesData = settings.pages;
      }
      // settings itself is an array
      else if (Array.isArray(settings)) {
        pagesData = settings;
      }
      // Search for field with array of objects
      else {
        const arrayFields = Object.entries(settings)
          .filter(([key, value]) => Array.isArray(value))
          .map(([key, value]) => ({ key, value }));

        if (arrayFields.length > 0) {
          pagesData = arrayFields[0].value;
        }
      }

      // Case where page data cannot be found
      if (!pagesData) {
        console.error('Page data not found:', JSON.stringify(settings));
        throw new Error('Invalid settings data: No page information');
      }

      // Save page data

      configStore.set('pages', pagesData);

      // Save appearance and advanced settings if they exist
      if (settings.appearance) {
        configStore.set('appearance', settings.appearance);
      }

      if (settings.advanced) {
        configStore.set('advanced', settings.advanced);
      }

      // Record synchronization completion time
      state.lastSyncTime = Date.now();
      state.lastSyncStatus = {
        success: true,
        timestamp: state.lastSyncTime,
        error: null
      };

      return { success: true, data: settings };
    }, { onUnauthorized });
  } catch (error) {
    console.error('Settings download error:', error);

    state.lastSyncStatus = {
      success: false,
      timestamp: Date.now(),
      error: error.message || 'Unknown error'
    };

    return {
      success: false,
      error: error.message || 'Unknown error'
    };
  } finally {
    state.isSyncing = false;
  }
}

/**
 * Get last synchronization status
 * @returns {Object} Last synchronization status
 */
function getLastSyncStatus() {
  return { ...state.lastSyncStatus };
}

/**
 * Get current device information
 * @returns {string} Device information string
 */
function getDeviceInfo() {
  const platform = process.platform;
  const hostname = os.hostname();
  const username = os.userInfo().username;

  return `${platform}-${hostname}-${username}`;
}

module.exports = {
  isCloudSyncEnabled,
  uploadSettings,
  downloadSettings,
  getLastSyncStatus
};
