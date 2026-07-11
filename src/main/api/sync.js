/**
 * Toast API - Settings Sync API Module
 *
 * Fetches and uploads Toast-App settings (pages, button information, etc.) to/from the
 * Toast-Web server. Returns normalized data; callers in cloud-sync.js own persisting it
 * to the ConfigStore (via conflict resolution) and are responsible for sync-loop suppression.
 */

const os = require('os');
const { createLogger } = require('../logger');
const { ENDPOINTS, createApiClient, getAuthHeaders, authenticatedRequest } = require('./client');
const { isCloudSyncAllowed } = require('../subscription');

// Create a module-specific logger
const logger = createLogger('ApiSync');

// Sync state management
const state = {
  lastSyncTime: 0,
  isSyncing: false,
  lastSyncStatus: {
    success: false,
    timestamp: 0,
    error: null,
  },
};

/**
 * Check whether cloud sync is available
 * @param {Object} params - Sync availability parameters
 * @param {Function} params.hasValidToken - Function to check for a valid token
 * @param {Object} params.configStore - Settings store
 * @returns {Promise<boolean>} Whether sync is available
 */
async function isCloudSyncEnabled({ hasValidToken, configStore }) {
  try {
    // Log the function call
    logger.info('isCloudSyncEnabled: Checking whether cloud sync is available');

    // Check authentication status
    const isAuthenticated = await hasValidToken();
    if (!isAuthenticated) {
      logger.info('isCloudSyncEnabled: No authentication token, sync not available');
      return false;
    }

    logger.info('isCloudSyncEnabled: Valid authentication token confirmed');

    // Check subscription information
    const subscription = configStore.get('subscription') || {};
    logger.info(
      'isCloudSyncEnabled: Checking subscription information:',
      JSON.stringify({
        plan: subscription.plan,
        active: subscription.active,
        isSubscribed: subscription.isSubscribed,
        cloud_sync: subscription.features?.cloud_sync,
      }),
    );

    // Sync eligibility rules (see subscription.js)
    const hasSyncFeature = isCloudSyncAllowed(subscription, {
      isDevelopment: process.env.NODE_ENV === 'development',
    });

    logger.info(`isCloudSyncEnabled: Sync feature ${hasSyncFeature ? 'enabled' : 'disabled'}`, {
      plan: subscription.plan,
    });
    return hasSyncFeature;
  }
  catch (error) {
    logger.error('Error while checking sync availability:', error);
    return false;
  }
}

/**
 * Upload current settings to the server
 * @param {Object} params - Upload parameters
 * @param {Function} params.hasValidToken - Function to check for a valid token
 * @param {Function} params.onUnauthorized - Callback invoked on authentication failure
 * @param {Object} params.configStore - Settings store
 * @param {Object} [params.directData] - Data to upload directly to the server
 * @returns {Promise<Object>} Upload result
 */
async function uploadSettings({ hasValidToken: _hasValidToken, onUnauthorized, configStore: _configStore, directData }) {
  // Skip if sync is already in progress
  if (state.isSyncing) {
    return { success: false, error: 'Sync already in progress' };
  }

  state.isSyncing = true;

  try {
    // Validate the data
    if (!directData) {
      throw new Error('Invalid data');
    }

    // API request
    return await authenticatedRequest(
      async () => {
        const headers = getAuthHeaders();
        const apiClient = createApiClient();

        const response = await apiClient.put(ENDPOINTS.SETTINGS, directData, { headers });

        // Record the sync completion time
        state.lastSyncTime = Date.now();
        state.lastSyncStatus = {
          success: true,
          timestamp: state.lastSyncTime,
          error: null,
        };

        return { success: true, data: response.data };
      },
      { onUnauthorized },
    );
  }
  catch (error) {
    logger.error('Settings upload error:', error);

    state.lastSyncStatus = {
      success: false,
      timestamp: Date.now(),
      error: error.message || 'Unknown error',
    };

    // Process the error object in more detail
    let errorMessage = error.message || 'Unknown error';
    let errorDetails = null;

    // Handle response errors
    if (error.response) {
      if (error.response.data) {
        if (typeof error.response.data === 'object') {
          errorDetails = JSON.stringify(error.response.data);
          if (error.response.data.message) {
            errorMessage = error.response.data.message;
          }
          else if (error.response.data.error) {
            errorMessage = error.response.data.error;
          }
        }
        else if (typeof error.response.data === 'string') {
          errorMessage = error.response.data;
        }
      }
      errorMessage = `${errorMessage} (HTTP ${error.response.status || 'Error'})`;
    }

    logger.error('Settings upload error details:', {
      message: errorMessage,
      details: errorDetails,
      status: error.response?.status,
    });

    return {
      success: false,
      error: errorMessage,
      errorDetails,
      statusCode: error.response?.status,
    };
  }
  finally {
    state.isSyncing = false;
  }
}

/**
 * Download settings from the server
 * @param {Object} params - Download parameters
 * @param {Function} params.hasValidToken - Function to check for a valid token
 * @param {Function} params.onUnauthorized - Callback invoked on authentication failure
 * @returns {Promise<Object>} Download result
 */
async function downloadSettings({ hasValidToken: _hasValidToken, onUnauthorized }) {
  // Skip if sync is already in progress
  if (state.isSyncing) {
    return { success: false, error: 'Sync already in progress' };
  }

  state.isSyncing = true;

  try {
    // API request
    return await authenticatedRequest(
      async () => {
        const headers = getAuthHeaders();

        const apiClient = createApiClient();
        const response = await apiClient.get(ENDPOINTS.SETTINGS, { headers });

        const settings = response.data;

        // Detailed debugging log
        logger.info(
          'Cloud sync - Downloaded settings structure:',
          Object.keys(settings || {}).length > 0 ? `Contains these keys: ${Object.keys(settings).join(', ')}` : 'Empty or invalid response',
        );

        // Validation
        if (!settings) {
          throw new Error('Invalid settings data: Response is empty');
        }

        // Extract normalized data
        let pagesData = null;
        let snippetsData = null;
        let appearanceData = null;
        let advancedData = null;
        const syncMetadata = {
          lastSyncedAt: Date.now(),
          lastSyncedDevice: getDeviceInfo(),
        };

        // 1. Parse the server response data structure
        // 1.1 Check the standard structure (latest API format)
        if (settings.pages && Array.isArray(settings.pages)) {
          logger.info('Standard page structure found');
          pagesData = settings.pages;
          snippetsData = Array.isArray(settings.snippets) ? settings.snippets : null;
          appearanceData = settings.appearance || null;
          advancedData = settings.advanced || null;

          // Extract metadata
          if (settings.lastSyncedAt) {
            syncMetadata.lastSyncedAt = settings.lastSyncedAt;
          }
          if (settings.lastModifiedAt) {
            syncMetadata.lastModifiedAt = settings.lastModifiedAt;
          }
          if (settings.lastSyncedDevice) {
            syncMetadata.lastSyncedDevice = settings.lastSyncedDevice;
          }
          if (settings.lastModifiedDevice) {
            syncMetadata.lastModifiedDevice = settings.lastModifiedDevice;
          }
        }
        else if (settings.data) {
          // 1.2 Handle a nested data object (legacy API format)
          logger.info('Nested data structure found');
          const data = settings.data;

          if (Array.isArray(data.pages)) {
            pagesData = data.pages;
          }
          else if (Array.isArray(data)) {
            pagesData = data;
          }

          snippetsData = Array.isArray(data.snippets) ? data.snippets : Array.isArray(settings.snippets) ? settings.snippets : null;
          appearanceData = data.appearance || settings.appearance || null;
          advancedData = data.advanced || settings.advanced || null;

          // Extract metadata
          if (data.lastSyncedAt) {
            syncMetadata.lastSyncedAt = data.lastSyncedAt;
          }
          if (data.lastModifiedAt) {
            syncMetadata.lastModifiedAt = data.lastModifiedAt;
          }
          if (data.lastSyncedDevice) {
            syncMetadata.lastSyncedDevice = data.lastSyncedDevice;
          }
          if (data.lastModifiedDevice) {
            syncMetadata.lastModifiedDevice = data.lastModifiedDevice;
          }
        }
        else if (Array.isArray(settings)) {
          // 1.3 When the array itself is the response (simple API format)
          logger.info('Array-only structure found');
          pagesData = settings;
        }
        else {
          // 1.4 Other structures - search all array fields
          logger.info('Searching for the page array in an unknown structure');
          const arrayFields = Object.entries(settings)
            .filter(([_key, value]) => Array.isArray(value))
            .map(([key, value]) => ({ key, value }));

          if (arrayFields.length > 0) {
            // Use the first array presumed to be the page data
            const pagesField =
              arrayFields.find(field => field.key === 'pages' || (field.value.length > 0 && field.value[0].name && field.value[0].buttons)) || arrayFields[0];

            logger.info(`Using the '${pagesField.key}' array field as page data`);
            pagesData = pagesField.value;
          }

          // Search for appearance and advanced settings
          Object.entries(settings).forEach(([key, value]) => {
            if (key === 'appearance' && typeof value === 'object') {
              appearanceData = value;
            }
            else if (key === 'advanced' && typeof value === 'object') {
              advancedData = value;
            }
            else if (key === 'snippets' && Array.isArray(value)) {
              snippetsData = value;
            }
          });
        }

        // Validate the page data
        if (!pagesData) {
          logger.error('Could not find page data in the response:', JSON.stringify(settings));
          throw new Error('Invalid settings data: Could not find page information in any expected format');
        }

        // Validate the page data structure
        const isValidPageData =
          Array.isArray(pagesData) &&
          pagesData.every(page => typeof page === 'object' && page !== null && (page.name !== undefined || page.buttons !== undefined));

        if (!isValidPageData) {
          logger.error('Invalid page data structure:', JSON.stringify(pagesData.slice(0, 2)));
          throw new Error('Invalid settings data: Page structure does not match expected format');
        }

        logger.info(`Found ${pagesData.length} pages in the sync data`);

        // Update the sync status
        state.lastSyncTime = syncMetadata.lastSyncedAt;
        state.lastSyncStatus = {
          success: true,
          timestamp: state.lastSyncTime,
          error: null,
        };

        logger.info('Settings download completed successfully');

        // Return the server response together with the metadata
        // `data` is the raw response; `normalized` holds the sections parsed regardless of response structure.
        // The merge path uses `normalized` so it does not lose data with nested/array shapes.
        return {
          success: true,
          data: settings,
          normalized: {
            pages: pagesData,
            snippets: Array.isArray(snippetsData) ? snippetsData : [],
            appearance: appearanceData || {},
            advanced: advancedData || {},
          },
          syncMetadata,
        };
      },
      { onUnauthorized },
    );
  }
  catch (error) {
    logger.error('Settings download error:', error);

    state.lastSyncStatus = {
      success: false,
      timestamp: Date.now(),
      error: error.message || 'Unknown error',
    };

    // Process the error object in more detail
    let errorMessage = error.message || 'Unknown error';
    let errorDetails = null;

    // Handle response errors
    if (error.response) {
      if (error.response.data) {
        if (typeof error.response.data === 'object') {
          errorDetails = JSON.stringify(error.response.data);
          if (error.response.data.message) {
            errorMessage = error.response.data.message;
          }
          else if (error.response.data.error) {
            errorMessage = error.response.data.error;
          }
        }
        else if (typeof error.response.data === 'string') {
          errorMessage = error.response.data;
        }
      }
      errorMessage = `${errorMessage} (HTTP ${error.response.status || 'Error'})`;
    }

    logger.error('Settings download error details:', {
      message: errorMessage,
      details: errorDetails,
      status: error.response?.status,
    });

    return {
      success: false,
      error: errorMessage,
      errorDetails,
      statusCode: error.response?.status,
    };
  }
  finally {
    state.isSyncing = false;
  }
}

/**
 * Get the last sync status
 * @returns {Object} Last sync status
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
  getLastSyncStatus,
};
