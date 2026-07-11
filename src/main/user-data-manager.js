/**
 * Toast - User Data Management Module
 *
 * Provides functionality to save and retrieve user profile, subscription info, settings, etc. to/from files.
 * Focuses on metadata management for cloud synchronization.
 */

const { app } = require('electron');
const path = require('path');
const fs = require('fs');
const { createLogger, maskEmail, maskName } = require('./logger');
const { DEFAULT_ANONYMOUS } = require('./constants');

// Create logger for this module
const logger = createLogger('UserDataManager');

// Define file path constants
const USER_DATA_PATH = app.getPath('userData');
const PROFILE_FILE_PATH = path.join(USER_DATA_PATH, 'user-profile.json');
const SETTINGS_FILE_PATH = path.join(USER_DATA_PATH, 'user-settings.json');

// Store API references
let apiClientRef = null;
let authManagerRef = null;

/**
 * Check if file exists
 * @param {string} filePath - File path to check
 * @returns {boolean} Whether the file exists
 */
function fileExists(filePath) {
  try {
    return fs.existsSync(filePath);
  }
  catch (error) {
    logger.error(`Error checking file existence (${filePath}):`, error);
    return false;
  }
}

/**
 * Read data from file
 * @param {string} filePath - File path to read
 * @returns {Object|null} File contents or null on failure
 */
function readFromFile(filePath) {
  try {
    if (!fileExists(filePath)) {
      logger.info(`File does not exist: ${filePath}`);
      return null;
    }

    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  }
  catch (error) {
    logger.error(`File read error (${filePath}):`, error);
    return null;
  }
}

/**
 * Save data to file
 * @param {string} filePath - File path to save to
 * @param {Object} data - Data to save
 * @returns {boolean} Whether the save was successful
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
  }
  catch (error) {
    logger.error(`File save error (${filePath}):`, error);
    return false;
  }
}

/**
 * Get user profile and subscription information
 * @param {boolean} forceRefresh - Whether to force a refresh (true: API call, false: file first)
 * @param {Object} [profileDataInput] - Already-fetched profile info (to avoid duplicate API calls)
 * @returns {Promise<Object>} User profile and subscription information
 */
async function getUserProfile(forceRefresh = false, profileDataInput = null) {
  try {
    logger.info(`Getting user profile info (force refresh: ${forceRefresh ? 'yes' : 'no'})`);

    // Check authentication state
    if (!authManagerRef) {
      logger.error('Auth manager not initialized');
      // Try reading from file (test compatibility)
      const profileData = readFromFile(PROFILE_FILE_PATH);
      return profileData; // null or parsed data
    }

    const hasToken = await authManagerRef.hasValidToken();
    if (!hasToken) {
      logger.info('No valid token, returning anonymous profile');
      return DEFAULT_ANONYMOUS;
    }

    // 1. If profile info is provided (avoid duplicate API calls)
    if (profileDataInput && !profileDataInput.error) {
      logger.info('Using provided profile info (avoiding duplicate API call)');

      // Add authentication state (copy rather than mutate the caller's object)
      const profileData = { ...profileDataInput, is_authenticated: true, isAuthenticated: true };

      // Add log
      logger.info('Processing profile info:', {
        name: maskName(profileData.name) || 'No name',
        email: maskEmail(profileData.email) || 'No email',
        hasSubscription: profileData.subscription?.active || profileData.subscription?.is_subscribed,
        plan: profileData.subscription?.plan || 'free',
      });

      // Save to file
      writeToFile(PROFILE_FILE_PATH, profileData);
      logger.info('Profile info saved to file');

      return profileData;
    }

    // 2. Check local file (if not force refresh)
    if (!forceRefresh && fileExists(PROFILE_FILE_PATH)) {
      const profileData = readFromFile(PROFILE_FILE_PATH);
      if (profileData) {
        // Add authentication state if missing in local file
        if (profileData.is_authenticated === undefined || profileData.isAuthenticated === undefined) {
          profileData.is_authenticated = true;
          profileData.isAuthenticated = true;
          writeToFile(PROFILE_FILE_PATH, profileData);
          logger.info('Authentication state added to profile loaded from file');
        }
        logger.info('Profile info loaded from file successfully');

        // Subscription info log
        if (profileData.subscription) {
          const plan = profileData.subscription.plan || 'free';
          const isSubscribed = profileData.subscription.active || profileData.subscription.is_subscribed || false;
          const pageGroups = profileData.subscription.features?.page_groups || 1;
          logger.info(`Loaded subscription info: plan=${plan}, subscription status=${isSubscribed ? 'active' : 'inactive'}, pages=${pageGroups}`);
        }

        return profileData;
      }
    }

    // 3. Get profile from API
    logger.info('Getting profile info from API...');
    const profileData = await authManagerRef.fetchUserProfile();

    // If API response has an error, try from file
    if (profileData?.error) {
      logger.error('API profile query error:', profileData.error);

      // Try returning existing data saved in file
      const savedProfileData = readFromFile(PROFILE_FILE_PATH);
      if (savedProfileData) {
        logger.info('Returning previously saved profile info');
        return savedProfileData;
      }

      return null;
    }

    // 4. On successful query, explicitly add authentication state and save to file
    if (profileData && !profileData.error) {
      // Add authentication state (copy rather than mutate the fetched object)
      const profileWithAuthState = { ...profileData, is_authenticated: true, isAuthenticated: true };

      // Add log
      logger.info('Profile info retrieved from API:', {
        name: maskName(profileWithAuthState.name) || 'No name',
        email: maskEmail(profileWithAuthState.email) || 'No email',
        hasSubscription: profileWithAuthState.subscription?.active || profileWithAuthState.subscription?.is_subscribed,
        plan: profileWithAuthState.subscription?.plan || 'free',
      });

      // Save to file
      writeToFile(PROFILE_FILE_PATH, profileWithAuthState);
      logger.info('Profile info saved to file');

      return profileWithAuthState;
    }

    return profileData;
  }
  catch (error) {
    logger.error('Error getting profile info:', error);

    // Try from file if error occurs
    const savedProfileData = readFromFile(PROFILE_FILE_PATH);
    if (savedProfileData) {
      logger.info('Returning previously saved profile info');
      return savedProfileData;
    }

    return null;
  }
}

/**
 * Get user settings information
 * @param {boolean} forceRefresh - Whether to force a refresh (true: API call, false: file first)
 * @returns {Promise<Object>} User settings information
 */
async function getUserSettings(forceRefresh = false) {
  try {
    logger.info(`Getting user settings info (force refresh: ${forceRefresh ? 'yes' : 'no'})`);

    // Check authentication state
    if (!authManagerRef) {
      logger.error('Auth manager not initialized');
      // Try reading from file (test compatibility)
      const settingsData = readFromFile(SETTINGS_FILE_PATH);
      return settingsData; // null or parsed data
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
        if (settingsData.is_authenticated === undefined || settingsData.isAuthenticated === undefined) {
          settingsData.is_authenticated = true;
          settingsData.isAuthenticated = true;
          writeToFile(SETTINGS_FILE_PATH, settingsData);
          logger.info('Authentication state added to settings loaded from file');
        }

        // Add log
        logger.info('Settings loaded from file successfully:', {
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
    logger.info('Getting settings info from API...');
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

      // Explicitly add authentication state
      if (settingsData) {
        // Set is_authenticated to true if missing or false
        settingsData.is_authenticated = true;
        settingsData.isAuthenticated = true;

        writeToFile(SETTINGS_FILE_PATH, settingsData);

        // Add log
        logger.info('Settings retrieved from API and saved:', {
          dataFields: Object.keys(settingsData),
          timestamp: new Date().toISOString(),
        });
      }

      return settingsData;
    }

    logger.info('Failed to get settings from API, returning default settings');
    return { isAuthenticated: false };
  }
  catch (error) {
    logger.error('Error getting settings info:', error);

    // Try from file if error occurs
    const savedSettingsData = readFromFile(SETTINGS_FILE_PATH);
    if (savedSettingsData) {
      logger.info('Returning previously saved settings info');
      return savedSettingsData;
    }

    logger.info('No saved settings info either, returning default settings');
    return { isAuthenticated: false };
  }
}

/**
 * Initialize user data manager
 * @param {Object} apiClient - API client reference
 * @param {Object} authManager - Auth manager reference
 */
function initialize(apiClient, authManager) {
  apiClientRef = apiClient;
  authManagerRef = authManager;

  logger.info('User data manager initialization complete');
}

/**
 * Clean up data on logout
 * @returns {boolean} Whether the cleanup was successful
 */
function cleanupOnLogout() {
  try {
    logger.info('Logout: starting user data cleanup');

    // 1. Check current state before cleanup
    const profileExists = fileExists(PROFILE_FILE_PATH);
    const settingsExists = fileExists(SETTINGS_FILE_PATH);

    logger.info('Current state:', {
      profileFileExists: profileExists,
      settingsFileExists: settingsExists,
    });

    // 2. Delete both profile file and settings file
    if (profileExists) {
      fs.unlinkSync(PROFILE_FILE_PATH);
      logger.info('Profile file deleted successfully');
    }
    else {
      logger.info('Profile file does not exist - no need to delete');
    }

    if (settingsExists) {
      fs.unlinkSync(SETTINGS_FILE_PATH);
      logger.info('Settings file deleted successfully');
    }
    else {
      logger.info('Settings file does not exist - no need to delete');
    }

    // 3. Verify final result
    const profileStillExists = fileExists(PROFILE_FILE_PATH);

    if (profileStillExists) {
      logger.error('Profile file still exists');
      return false;
    }

    logger.info('User data cleanup complete');
    return true;
  }
  catch (error) {
    logger.error('Error cleaning up data on logout:', error);
    return false;
  }
}

module.exports = {
  initialize,
  getUserProfile,
  getUserSettings,
  cleanupOnLogout,
};
