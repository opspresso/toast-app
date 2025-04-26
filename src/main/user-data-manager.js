/**
 * Toast App - User Data Manager Module
 *
 * Provides functionality to save and retrieve user profiles, subscription information, and settings as files.
 * Handles periodic data updates and file management.
 */

const { app } = require('electron');
const path = require('path');
const fs = require('fs');
const { createLogger } = require('./logger');
const { DEFAULT_ANONYMOUS } = require('./constants');

// 모듈별 로거 생성
const logger = createLogger('UserDataManager');

// Define file path constants
const USER_DATA_PATH = app.getPath('userData');
const PROFILE_FILE_PATH = path.join(USER_DATA_PATH, 'user-profile.json');
const SETTINGS_FILE_PATH = path.join(USER_DATA_PATH, 'user-settings.json');

// Periodic refresh settings
const REFRESH_INTERVAL_MS = 30 * 60 * 1000; // Refresh every 30 minutes
let profileRefreshTimer = null;
let settingsRefreshTimer = null;

// Store API references
let apiClientRef = null;
let authManagerRef = null;

/**
 * Check if file exists
 * @param {string} filePath - Path of file to check
 * @returns {boolean} Whether file exists
 */
function fileExists(filePath) {
  try {
    return fs.existsSync(filePath);
  } catch (error) {
    logger.error(`Error checking file existence (${filePath}):`, error);
    return false;
  }
}

/**
 * Read data from file
 * @param {string} filePath - Path of file to read
 * @returns {Object|null} File content or null if failed
 */
function readFromFile(filePath) {
  try {
    if (!fileExists(filePath)) {
      logger.info(`File does not exist: ${filePath}`);
      return null;
    }

    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    logger.error(`Error reading file (${filePath}):`, error);
    return null;
  }
}

/**
 * Save data to file
 * @param {string} filePath - Path of file to save
 * @param {Object} data - Data to save
 * @returns {boolean} Whether save was successful
 */
function writeToFile(filePath, data) {
  try {
    const dirPath = path.dirname(filePath);

    // Create directory if it doesn't exist
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }

    // Save to file in JSON format
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    logger.info(`File saved successfully: ${filePath}`);
    return true;
  } catch (error) {
    logger.error(`Error saving file (${filePath}):`, error);
    return false;
  }
}

/**
 * Delete file
 * @param {string} filePath - Path of file to delete
 * @returns {boolean} Whether deletion was successful
 */
function deleteFile(filePath) {
  try {
    if (fileExists(filePath)) {
      fs.unlinkSync(filePath);
      logger.info(`File deleted successfully: ${filePath}`);
      return true;
    }
    return false;
  } catch (error) {
    logger.error(`Error deleting file (${filePath}):`, error);
    return false;
  }
}

/**
 * Get user profile and subscription information
 * @param {boolean} forceRefresh - Whether to force refresh (true: API call, false: file first)
 * @param {Object} [profileDataInput] - Profile information already obtained (to prevent duplicate API calls)
 * @returns {Promise<Object>} User profile and subscription information
 */
async function getUserProfile(forceRefresh = false, profileDataInput = null) {
  try {
    logger.info(`Getting user profile information (Force refresh: ${forceRefresh ? 'Yes' : 'No'})`);

    // Check authentication state
    if (!authManagerRef) {
      logger.error('Authentication manager not initialized');
      return null;
    }

    const hasToken = await authManagerRef.hasValidToken();
    if (!hasToken) {
      logger.info('No valid token, returning anonymous profile');
      return DEFAULT_ANONYMOUS;
    }

    // 1. If profile information is provided (prevent duplicate API calls)
    if (profileDataInput && !profileDataInput.error) {
      logger.info('Using provided profile information (preventing duplicate API calls)');

      // Add authentication state
      profileDataInput.is_authenticated = true;
      profileDataInput.isAuthenticated = true;

      // Add logs
      logger.info('Processing profile information:', {
        name: profileDataInput.name || 'No name',
        email: profileDataInput.email || 'No email',
        hasSubscription:
          profileDataInput.subscription?.active || profileDataInput.subscription?.is_subscribed,
        plan: profileDataInput.subscription?.plan || 'free',
      });

      // Save to file
      writeToFile(PROFILE_FILE_PATH, profileDataInput);
      logger.info('Profile information saved to file');

      return profileDataInput;
    }

    // 2. Check local file (if not force refresh)
    if (!forceRefresh && fileExists(PROFILE_FILE_PATH)) {
      const profileData = readFromFile(PROFILE_FILE_PATH);
      if (profileData) {
        // Add authentication state if missing in local file
        if (
          profileData.is_authenticated === undefined ||
          profileData.isAuthenticated === undefined
        ) {
          profileData.is_authenticated = true;
          profileData.isAuthenticated = true;
          writeToFile(PROFILE_FILE_PATH, profileData);
          logger.info('Added authentication state to profile loaded from file');
        }
        logger.info('Successfully loaded profile information from file');

        // Log subscription information
        if (profileData.subscription) {
          const plan = profileData.subscription.plan || 'free';
          const isSubscribed =
            profileData.subscription.active || profileData.subscription.is_subscribed || false;
          const pageGroups = profileData.subscription.features.page_groups || 1;
          logger.info(
            `Loaded subscription info: plan=${plan}, subscription status=${isSubscribed ? 'active' : 'inactive'}, pages=${pageGroups}`,
          );
        }

        return profileData;
      }
    }

    // 3. Get profile from API
    logger.info('Getting profile information from API...');
    const profileData = await authManagerRef.fetchUserProfile();

    // Try from file if API response has error
    if (profileData?.error) {
      logger.error('API profile query error:', profileData.error);

      // Try to return existing data saved in file
      const savedProfileData = readFromFile(PROFILE_FILE_PATH);
      if (savedProfileData) {
        logger.info('Returning previously saved profile information');
        return savedProfileData;
      }

      return null;
    }

    // 4. Add authentication state explicitly and save to file if query successful
    if (profileData && !profileData.error) {
      // Add authentication state (set both is_authenticated and isAuthenticated)
      profileData.is_authenticated = true;
      profileData.isAuthenticated = true;

      // Add logs
      logger.info('Profile information from API:', {
        name: profileData.name || 'No name',
        email: profileData.email || 'No email',
        hasSubscription:
          profileData.subscription?.active || profileData.subscription?.is_subscribed,
        plan: profileData.subscription?.plan || 'free',
      });

      // Save to file
      writeToFile(PROFILE_FILE_PATH, profileData);
      logger.info('Profile information saved to file');
    }

    return profileData;
  } catch (error) {
    logger.error('Error getting profile information:', error);

    // Try from file in case of error
    const savedProfileData = readFromFile(PROFILE_FILE_PATH);
    if (savedProfileData) {
      logger.info('Returning previously saved profile information');
      return savedProfileData;
    }

    return null;
  }
}

/**
 * Get user settings information
 * @param {boolean} forceRefresh - Whether to force refresh (true: API call, false: file first)
 * @returns {Promise<Object>} User settings information
 */
async function getUserSettings(forceRefresh = false) {
  try {
    logger.info(
      `Getting user settings information (Force refresh: ${forceRefresh ? 'Yes' : 'No'})`,
    );

    // Check authentication state
    if (!authManagerRef) {
      logger.error('Authentication manager not initialized');
      return null;
    }

    const hasToken = await authManagerRef.hasValidToken();
    if (!hasToken) {
      logger.info('No valid token, returning default settings');
      return { isAuthenticated: false };
    }

    // 1. Check local file first (if not force refresh)
    if (!forceRefresh && fileExists(SETTINGS_FILE_PATH)) {
      const settingsData = readFromFile(SETTINGS_FILE_PATH);
      if (settingsData) {
        // Add authentication state if missing in local file
        if (
          settingsData.is_authenticated === undefined ||
          settingsData.isAuthenticated === undefined
        ) {
          settingsData.is_authenticated = true;
          settingsData.isAuthenticated = true;
          writeToFile(SETTINGS_FILE_PATH, settingsData);
          logger.info('Added authentication state to settings loaded from file');
        }

        // Add logs
        logger.info('Successfully loaded settings from file:', {
          dataFields: Object.keys(settingsData),
          timestamp: new Date().toISOString(),
        });

        return settingsData;
      }
    }

    // 2. Check API reference
    if (!apiClientRef) {
      logger.error('API client not initialized');
      return null;
    }

    // 3. Get settings from API
    logger.info('Getting settings information from API...');
    const token = await authManagerRef.getAccessToken();

    if (!token) {
      logger.error('No valid access token');
      return { isAuthenticated: false };
    }

    // API request
    const headers = { Authorization: `Bearer ${token}` };
    const apiClient = apiClientRef.createApiClient();
    const response = await apiClient.get(apiClientRef.ENDPOINTS.SETTINGS, { headers });

    if (response.data) {
      const settingsData = response.data.data || response.data;

      // Add authentication state explicitly
      if (settingsData) {
        // Set is_authenticated to true if missing or false
        settingsData.is_authenticated = true;
        settingsData.isAuthenticated = true;

        writeToFile(SETTINGS_FILE_PATH, settingsData);

        // Add logs
        logger.info('Successfully retrieved and saved settings from API:', {
          dataFields: Object.keys(settingsData),
          timestamp: new Date().toISOString(),
        });
      }

      return settingsData;
    }

    logger.info('Failed to get settings from API, returning default settings');
    return { isAuthenticated: false };
  } catch (error) {
    logger.error('Error getting settings information:', error);

    // Try from file in case of error
    const savedSettingsData = readFromFile(SETTINGS_FILE_PATH);
    if (savedSettingsData) {
      logger.info('Returning previously saved settings information');
      return savedSettingsData;
    }

    logger.info('No saved settings information either, returning default settings');
    return { isAuthenticated: false };
  }
}

/**
 * Update settings with improved error handling and atomic file operations
 * @param {Object} settings - Settings to save
 * @returns {boolean} Whether update was successful
 */
function updateSettings(settings) {
  try {
    if (!settings) {
      logger.error('No settings to update');
      return false;
    }

    // Create a temporary file path
    const tempFilePath = `${SETTINGS_FILE_PATH}.temp`;

    try {
      // First write to a temporary file
      fs.writeFileSync(tempFilePath, JSON.stringify(settings, null, 2), 'utf8');

      // Verify the written data is valid
      try {
        const verifyData = fs.readFileSync(tempFilePath, 'utf8');
        JSON.parse(verifyData); // Ensure it's valid JSON
      } catch (verifyError) {
        logger.error('Error verifying written settings data:', verifyError);
        // Clean up corrupted temp file
        try {
          fs.unlinkSync(tempFilePath);
        } catch (cleanupError) {
          logger.error('Error cleaning up temporary file:', cleanupError);
        }
        return false;
      }

      // Use atomic rename operation
      if (fs.existsSync(SETTINGS_FILE_PATH)) {
        // On Windows, need to unlink existing file first
        if (process.platform === 'win32') {
          try {
            fs.unlinkSync(SETTINGS_FILE_PATH);
          } catch (unlinkError) {
            logger.error('Error removing existing settings file:', unlinkError);
          }
        }
      }

      fs.renameSync(tempFilePath, SETTINGS_FILE_PATH);
      logger.info('Settings file updated successfully using atomic operation');
      return true;
    } catch (fileError) {
      logger.error('File operation error during settings update:', fileError);
      return false;
    }
  } catch (error) {
    logger.error('Settings update error:', error);
    return false;
  }
}

/**
 * Update synchronization metadata with improved validation and error recovery
 * @param {Object} metadata - Metadata to update
 * @returns {boolean} Whether update was successful
 */
function updateSyncMetadata(metadata) {
  try {
    if (!metadata) {
      logger.error('No metadata to update');
      return false;
    }

    // Read current settings file
    const currentSettings = readFromFile(SETTINGS_FILE_PATH);

    // If current settings file doesn't exist or is corrupted, create a new minimal one
    if (!currentSettings) {
      logger.warn('Current settings file missing or corrupted, creating new baseline');

      // Create minimal settings structure
      const newSettings = {
        lastSyncedAt: metadata.lastSyncedAt || Date.now(),
        lastModifiedAt: metadata.lastModifiedAt || Date.now(),
        lastSyncedDevice: metadata.lastSyncedDevice || 'unknown',
        lastModifiedDevice: metadata.lastModifiedDevice || 'unknown',
      };

      // Save new baseline settings
      return updateSettings(newSettings);
    }

    // Prepare updated settings with metadata
    const updatedSettings = {
      ...currentSettings,
      // Update timestamp information
      lastSyncedAt: metadata.lastSyncedAt || currentSettings.lastSyncedAt,
      lastModifiedAt: metadata.lastModifiedAt || currentSettings.lastModifiedAt,
      lastSyncedDevice: metadata.lastSyncedDevice || currentSettings.lastSyncedDevice,
      lastModifiedDevice: metadata.lastModifiedDevice || currentSettings.lastModifiedDevice,
    };

    // Save using atomic file operation
    const result = updateSettings(updatedSettings);

    if (result) {
      logger.info('Sync metadata updated successfully');
      return true;
    } else {
      logger.error('Failed to update sync metadata');
      return false;
    }
  } catch (error) {
    logger.error('Error updating sync metadata:', error);
    return false;
  }
}

/**
 * Start periodic profile refresh
 */
function startProfileRefresh() {
  // Stop existing timer if running
  stopProfileRefresh();

  logger.info(
    `Starting periodic profile refresh (${Math.floor(REFRESH_INTERVAL_MS / 60000)}-minute interval)`,
  );

  // Run once immediately before starting timer
  getUserProfile(true).then(profile => {
    if (profile) {
      logger.info('Initial profile refresh complete');
    }
  });

  // Set up periodic refresh timer
  profileRefreshTimer = setInterval(async () => {
    try {
      const profile = await getUserProfile(true);
      if (profile) {
        logger.info('Periodic profile refresh complete');
      }
    } catch (error) {
      logger.error('Periodic profile refresh error:', error);
    }
  }, REFRESH_INTERVAL_MS);
}

/**
 * Stop periodic profile refresh
 */
function stopProfileRefresh() {
  if (profileRefreshTimer) {
    clearInterval(profileRefreshTimer);
    profileRefreshTimer = null;
    logger.info('Periodic profile refresh stopped');
  }
}

/**
 * Start periodic settings refresh
 */
function startSettingsRefresh() {
  // Stop existing timer if running
  stopSettingsRefresh();

  logger.info(
    `Starting periodic settings refresh (${Math.floor(REFRESH_INTERVAL_MS / 60000)}-minute interval)`,
  );

  // Run once immediately before starting timer
  getUserSettings(true).then(settings => {
    if (settings) {
      logger.info('Initial settings refresh complete');
    }
  });

  // Set up periodic refresh timer
  settingsRefreshTimer = setInterval(async () => {
    try {
      const settings = await getUserSettings(true);
      if (settings) {
        logger.info('Periodic settings refresh complete');
      }
    } catch (error) {
      logger.error('Periodic settings refresh error:', error);
    }
  }, REFRESH_INTERVAL_MS);
}

/**
 * Stop periodic settings refresh
 */
function stopSettingsRefresh() {
  if (settingsRefreshTimer) {
    clearInterval(settingsRefreshTimer);
    settingsRefreshTimer = null;
    logger.info('Periodic settings refresh stopped');
  }
}

/**
 * Initialize user data manager
 * @param {Object} apiClient - API client reference
 * @param {Object} authManager - Authentication manager reference
 */
function initialize(apiClient, authManager) {
  apiClientRef = apiClient;
  authManagerRef = authManager;

  logger.info('User data manager initialization complete');
}

/**
 * Start data synchronization and periodic refresh after successful login
 */
async function syncAfterLogin() {
  try {
    logger.info('Starting user data synchronization after login');

    // Update profile and settings information
    const profile = await getUserProfile(true);
    const settings = await getUserSettings(true);

    if (profile) {
      logger.info('Profile update after login successful');
    }

    if (settings) {
      logger.info('Settings update after login successful');
    }

    // Start periodic refresh
    startProfileRefresh();
    startSettingsRefresh();

    return { profile, settings };
  } catch (error) {
    logger.error('Error synchronizing data after login:', error);
    return { error: error.message };
  }
}

/**
 * Clean up data on logout
 * @returns {boolean} Whether cleanup was successful
 */
function cleanupOnLogout() {
  try {
    logger.info('Logout: Starting user data cleanup');

    // 1. Check current state before deleting files
    const profileExists = fileExists(PROFILE_FILE_PATH);
    const settingsExists = fileExists(SETTINGS_FILE_PATH);

    logger.info('Current state:', {
      profileFileExists: profileExists,
      settingsFileExists: settingsExists,
      profileRefreshActive: !!profileRefreshTimer,
      settingsRefreshActive: !!settingsRefreshTimer,
    });

    // 2. Stop periodic refresh
    stopProfileRefresh();
    stopSettingsRefresh();
    logger.info('Periodic refresh timers stopped');

    // 3. Delete profile file only (preserve settings)
    const profileDeleted = deleteFile(PROFILE_FILE_PATH);

    logger.info('File deletion results:', {
      profileDeleted: profileDeleted ? 'Success' : 'Failed or file not found',
      settingsPreserved: 'Settings file preserved as requested',
    });

    // 4. Final result report
    const finalCheck = {
      profileFileExists: fileExists(PROFILE_FILE_PATH),
      settingsFileExists: fileExists(SETTINGS_FILE_PATH),
      profileDataCleared: !fileExists(PROFILE_FILE_PATH),
    };

    logger.info('User data cleanup completion status:', finalCheck);

    return finalCheck.profileDataCleared;
  } catch (error) {
    logger.error('Error cleaning up data on logout:', error);
    return false;
  }
}

module.exports = {
  initialize,
  getUserProfile,
  getUserSettings,
  updateSettings,
  updateSyncMetadata,
  syncAfterLogin,
  cleanupOnLogout,
  startProfileRefresh,
  stopProfileRefresh,
  startSettingsRefresh,
  stopSettingsRefresh,
};
