/**
 * Toast - Auto Update Manager (Improved)
 *
 * This module handles automatic updates using electron-updater.
 * Improvement includes better error handling, more detailed logging,
 * and enhanced update workflow.
 */

const { app, dialog } = require('electron');
const { autoUpdater } = require('electron-updater');
const { createLogger } = require('./logger');
const { broadcastToWindows } = require('./broadcast');
const path = require('path');
const fs = require('fs');

// Create module-specific logger
const logger = createLogger('Updater');

// Periodic update check interval
const UPDATE_CHECK_INTERVAL_MS = 4 * 60 * 60 * 1000; // 4 hours

// Variables storing the auto-update state and window references
let windowsRef = null;
let updateCheckInProgress = false;
let updateDownloadInProgress = false;
let updateDownloaded = false;
let lastCheckTime = 0;
let updateConfig = null;

/**
 * Initialize auto-update
 * @param {Object} windows - Application window object
 */
function initAutoUpdater(windows) {
  if (!windows) {
    throw new Error('windows reference is required');
  }

  // Store the window object itself (reference the object, not a snapshot, since the settings window is recreated each time it opens)
  windowsRef = windows;

  // Configure logging
  configureLogging();

  // Configure the updater
  configureUpdater();

  // Register update event handlers
  setupAutoUpdaterEvents();

  // Validate the configuration file
  validateUpdateConfig();

  // Check for updates at startup (not run in the development environment)
  scheduleUpdateCheck();

  return {
    checkForUpdates,
    downloadUpdate,
    installUpdate,
    getLastCheckTime: () => lastCheckTime,
    isUpdateCheckInProgress: () => updateCheckInProgress,
    isUpdateDownloadInProgress: () => updateDownloadInProgress,
  };
}

/**
 * Configure logging
 */
function configureLogging() {
  // Attach the logging function to autoUpdater
  autoUpdater.logger = logger;

  // Record the startup log
  logger.info('Auto update module initializing...');
  logger.info(`App version: ${app.getVersion()}`);
  logger.info(`Running in ${process.env.NODE_ENV || 'production'} mode`);
  logger.info(`Platform: ${process.platform} (${process.arch})`);
}

/**
 * Configure the updater
 */
function configureUpdater() {
  // Explicitly set the app ID
  autoUpdater.appId = 'com.opspresso.toast-app';
  logger.info(`Using appId: ${autoUpdater.appId}`);

  // Allow update checks even in the development environment
  autoUpdater.forceDevUpdateConfig = true;

  // Allow downgrade (for testing during development)
  autoUpdater.allowDowngrade = process.env.NODE_ENV === 'development';

  // Allow prerelease versions (development environment only)
  autoUpdater.allowPrerelease = process.env.NODE_ENV === 'development';

  // Disable automatic download (download after user confirmation)
  autoUpdater.autoDownload = false;

  // Enable automatic install on app quit
  autoUpdater.autoInstallOnAppQuit = true;

  // Configure the update channel
  autoUpdater.channel = 'latest';

  // Add logging
  logger.info(`Update cache directory: ${app.getPath('userData')}/toast-app-updater`);
  logger.info(`Full app path: ${app.getAppPath()}`);
}

/**
 * Validate the update configuration file
 */
function validateUpdateConfig() {
  try {
    // In release mode, check the app-update.yml file
    if (app.isPackaged) {
      const updateConfigPath = path.join(app.getAppPath(), 'app-update.yml');
      logger.info(`updateConfigPath: ${updateConfigPath}`);
      if (fs.existsSync(updateConfigPath)) {
        updateConfig = require('yaml').parse(fs.readFileSync(updateConfigPath, 'utf8'));
        logger.info('Found app-update.yml configuration:', JSON.stringify(updateConfig));
      }
      else {
        logger.warn('app-update.yml not found in packaged app');
      }
    }
    else {
      // In development mode, check the dev-app-update.yml file
      const devUpdateConfigPath = path.join(process.cwd(), 'dev-app-update.yml');
      logger.info(`devUpdateConfigPath: ${devUpdateConfigPath}`);
      if (fs.existsSync(devUpdateConfigPath)) {
        updateConfig = require('yaml').parse(fs.readFileSync(devUpdateConfigPath, 'utf8'));
        logger.info('Found dev-app-update.yml configuration:', JSON.stringify(updateConfig));
      }
      else {
        logger.warn('dev-app-update.yml not found in development mode');
      }
    }

    // Check required configuration fields
    if (updateConfig) {
      const requiredFields = ['provider', 'owner', 'repo'];
      const missingFields = requiredFields.filter(field => !updateConfig[field]);

      if (missingFields.length > 0) {
        logger.warn(`Update configuration missing required fields: ${missingFields.join(', ')}`);
      }
    }
  }
  catch (error) {
    logger.error('Error validating update configuration:', error.toString());
  }
}

/**
 * Schedule update checks at startup and periodically
 */
function scheduleUpdateCheck() {
  if (process.env.NODE_ENV !== 'development') {
    // Check for updates a few seconds after the app starts (allow time for initialization)
    // (unref: so this timer does not hold up process exit)
    logger.info('Scheduling initial update check in 5 seconds');
    setTimeout(() => {
      checkForUpdates(true); // Automatic check at startup in silent mode
    }, 5000).unref();

    // Afterward, check for new versions in the background at a fixed interval
    // (unref: so this timer does not hold up process exit)
    logger.info(`Scheduling periodic update check every ${UPDATE_CHECK_INTERVAL_MS / (60 * 60 * 1000)} hours`);
    setInterval(() => {
      checkForUpdates(true);
    }, UPDATE_CHECK_INTERVAL_MS).unref();
  }
  else {
    logger.info('Skipping automatic update check in development mode');
  }
}

/**
 * Reflect the update state in the tray menu
 * (load the tray module at call time to avoid a module-load circular dependency)
 * @param {string|null} status - 'available' | 'downloading' | 'downloaded' | null
 * @param {string} [version] - Target version
 */
function notifyTrayUpdateState(status, version) {
  try {
    require('./tray').setUpdateState(status, version);
  }
  catch (error) {
    logger.error('Failed to update tray menu state:', error.toString());
  }
}

/**
 * Configure auto-update events
 */
function setupAutoUpdaterEvents() {
  // Update check started
  autoUpdater.on('checking-for-update', () => {
    logger.info('Checking for updates...');
    updateCheckInProgress = true;
    sendStatusToWindows('checking-for-update', { status: 'checking' });
  });

  // Update available
  autoUpdater.on('update-available', info => {
    logger.info(`Update available: version ${info.version}`);
    updateCheckInProgress = false;
    lastCheckTime = Date.now();

    // Do not revert the downloading/downloaded state back to available
    if (!updateDownloadInProgress && !updateDownloaded) {
      notifyTrayUpdateState('available', info.version);
    }

    sendStatusToWindows('update-available', {
      status: 'available',
      info: {
        version: info.version,
        releaseDate: info.releaseDate,
        releaseNotes: info.releaseNotes,
        files: info.files?.map(f => ({ name: f.name, size: f.size })) || [],
        path: info.path,
      },
    });
  });

  // No update available
  autoUpdater.on('update-not-available', info => {
    logger.info(`No updates available (latest: ${info.version || 'unknown'})`);
    updateCheckInProgress = false;
    lastCheckTime = Date.now();

    notifyTrayUpdateState(null);

    sendStatusToWindows('update-not-available', {
      status: 'not-available',
      info: {
        version: info.version,
        releaseDate: info.releaseDate,
        currentVersion: app.getVersion(),
      },
    });
  });

  // Update download progress
  autoUpdater.on('download-progress', progressObj => {
    const logMessage =
      `Download progress: ${Math.round(progressObj.percent)}% ` +
      `(${formatBytes(progressObj.transferred)}/${formatBytes(progressObj.total)}) ` +
      `@ ${formatBytes(progressObj.bytesPerSecond)}/s`;

    logger.info(logMessage);

    sendStatusToWindows('download-progress', {
      status: 'downloading',
      progress: {
        percent: progressObj.percent,
        bytesPerSecond: progressObj.bytesPerSecond,
        transferred: progressObj.transferred,
        total: progressObj.total,
        formattedPercent: `${Math.round(progressObj.percent)}%`,
        formattedTransferred: formatBytes(progressObj.transferred),
        formattedTotal: formatBytes(progressObj.total),
        formattedSpeed: `${formatBytes(progressObj.bytesPerSecond)}/s`,
      },
    });
  });

  // Update download completed
  autoUpdater.on('update-downloaded', info => {
    logger.info(`Update downloaded: ${info.version}`);
    updateDownloadInProgress = false;
    updateDownloaded = true;

    notifyTrayUpdateState('downloaded', info.version);

    sendStatusToWindows('update-downloaded', {
      status: 'downloaded',
      info: {
        version: info.version,
        releaseDate: info.releaseDate,
        releaseNotes: info.releaseNotes,
        files: info.files?.map(f => ({ name: f.name, size: f.size })) || [],
        path: info.path,
      },
    });

    // Optionally ask the user whether to install
    if (process.env.AUTO_INSTALL_UPDATES === 'true') {
      logger.info('Auto-install is enabled, prompting user to restart and install');
      promptUserToInstall(info.version);
    }
  });

  // Update error
  autoUpdater.on('error', err => {
    logger.error('Update error:', err.toString());

    if (err.stack) {
      logger.error('Error stack:', err.stack);
    }

    if (err.code) {
      logger.error('Error code:', err.code);
    }

    updateCheckInProgress = false;
    updateDownloadInProgress = false;

    notifyTrayUpdateState(null);

    // Generate a user-friendly message for specific error codes
    let userFriendlyMessage = err.message;
    if (err.code === 'ERR_UPDATER_NO_PUBLISHED_VERSIONS') {
      userFriendlyMessage = 'No updates are currently released. Please check again later.';
      logger.info('Providing user-friendly message for no published versions error');
    }

    sendStatusToWindows('update-error', {
      status: 'error',
      error: err.toString(),
      code: err.code,
      details: userFriendlyMessage,
    });
  });
}

/**
 * Ask the user whether to install the update
 * @param {string} version - Update version to install
 */
function promptUserToInstall(version) {
  const mainWindow = windowsRef && windowsRef.toast;
  if (mainWindow && !mainWindow.isDestroyed()) {
    dialog
      .showMessageBox(mainWindow, {
        type: 'info',
        title: 'Update ready',
        message: `Toast version ${version} has been downloaded.`,
        detail: 'Do you want to restart the app to install the update?',
        buttons: ['Restart now', 'Later'],
        defaultId: 0,
        cancelId: 1,
      })
      .then(result => {
        if (result.response === 0) {
          logger.info('User confirmed update installation');
          installUpdate();
        }
        else {
          logger.info('User postponed update installation');
        }
      })
      .catch(err => {
        logger.error('Error showing update dialog:', err.toString());
      });
  }
}

/**
 * Check for updates
 * @param {boolean} silent - Check quietly without notifying the user (default: false)
 * @returns {Promise} Result object
 */
async function checkForUpdates(silent = false) {
  // Prevent duplication if a check is already in progress
  if (updateCheckInProgress) {
    logger.info('Update check already in progress, skipping');
    return {
      success: false,
      error: 'Update check already in progress',
      versionInfo: {
        current: app.getVersion(),
      },
    };
  }

  try {
    updateCheckInProgress = true;

    if (!silent) {
      sendStatusToWindows('checking-for-update', { status: 'checking' });
    }

    // Check for updates via electron-updater
    logger.info('Checking for updates via electron-updater');
    const result = await autoUpdater.checkForUpdates();

    if (result && result.updateInfo) {
      const currentVersion = app.getVersion();
      const latestVersion = result.updateInfo.version;

      logger.info(`Update check result: Current version ${currentVersion}, Latest version ${latestVersion}`);

      // Strengthened version comparison logic
      const hasUpdate = compareVersions(latestVersion, currentVersion) > 0;

      if (hasUpdate) {
        logger.info(`Update is available (${currentVersion} → ${latestVersion})`);
      }
      else {
        logger.info(`No update needed, current version is ${currentVersion}`);
      }

      return {
        success: true,
        updateInfo: result.updateInfo,
        versionInfo: {
          current: currentVersion,
          latest: latestVersion,
        },
        hasUpdate,
        files: result.updateInfo.files,
      };
    }
    else {
      // When there is no update information
      logger.info('Update information not found');

      if (!silent) {
        sendStatusToWindows('update-not-available', {
          status: 'not-available',
          info: {
            version: app.getVersion(),
          },
        });
      }

      return {
        success: false,
        error: 'Update information not found',
        versionInfo: {
          current: app.getVersion(),
          latest: null,
        },
        hasUpdate: false,
      };
    }
  }
  catch (error) {
    logger.error('Update check error:', error.toString());

    // Notify of the error (only when not in silent mode)
    if (!silent) {
      sendStatusToWindows('update-error', {
        status: 'error',
        error: error.toString(),
      });
    }

    return {
      success: false,
      error: error.toString(),
      versionInfo: {
        current: app.getVersion(),
        latest: null,
      },
    };
  }
  finally {
    updateCheckInProgress = false;
    lastCheckTime = Date.now();
  }
}

/**
 * Download the update
 * @returns {Promise} Result object
 */
async function downloadUpdate() {
  // Prevent duplication if a download is already in progress
  if (updateDownloadInProgress) {
    logger.info('Update download already in progress, skipping');
    return {
      success: false,
      error: 'Update download already in progress',
      alreadyInProgress: true,
    };
  }

  try {
    updateDownloadInProgress = true;

    // Start the download
    sendStatusToWindows('download-started', { status: 'downloading' });

    // Check whether an update is currently available
    let updateCheckResult;

    try {
      // First verify the update information
      logger.info('Verifying update information before download');
      updateCheckResult = await autoUpdater.checkForUpdates();

      if (!updateCheckResult || !updateCheckResult.updateInfo) {
        throw new Error('Cannot verify update information');
      }

      const currentVersion = app.getVersion();
      const updateVersion = updateCheckResult.updateInfo.version;

      // Version comparison - warn if the version is the same as or lower than the current version
      if (compareVersions(updateVersion, currentVersion) <= 0 && process.env.NODE_ENV !== 'development') {
        logger.warn(`Warning: Update version (${updateVersion}) is not newer than current version (${currentVersion})`);
      }
    }
    catch (checkError) {
      logger.error('Error verifying update before download:', checkError.toString());
      throw new Error(`Update verification failed: ${checkError.message}`);
    }

    // Log the latest version information
    logger.info(`Update information confirmed: Version ${updateCheckResult.updateInfo.version}`);
    logger.info(`Files to download: ${JSON.stringify(updateCheckResult.updateInfo.files)}`);

    // Wait briefly before starting the download (prevents timing issues)
    await new Promise(resolve => setTimeout(resolve, 500));

    // Log download information - the downloadUpdateInfo function is not supported in electron-updater version 6
    logger.info('Preparing to download update package');

    // Start the update download
    logger.info('Starting update download');
    logger.info(`Download target app ID: ${autoUpdater.appId}`);
    logger.info(`Download cache directory: ${app.getPath('userData')}/toast-app-updater`);

    try {
      // Perform the actual download
      await autoUpdater.downloadUpdate();
      updateDownloaded = true;
      logger.info('Update download completed successfully');
    }
    catch (downloadError) {
      // Log detailed information when an error occurs during download
      logger.error(`Download error: ${downloadError.toString()}`);

      if (downloadError.stack) {
        logger.error(`Error stack: ${downloadError.stack}`);
      }

      if (downloadError.code) {
        logger.error(`Error code: ${downloadError.code}`);
      }

      throw downloadError;
    }

    return {
      success: true,
      message: 'Update download completed successfully',
      version: updateCheckResult.updateInfo.version,
    };
  }
  catch (error) {
    logger.error('Update download error:', error.toString());

    sendStatusToWindows('update-error', {
      status: 'error',
      error: error.toString(),
    });

    return {
      success: false,
      error: error.toString(),
    };
  }
  finally {
    // Always clear the flag when the download ends (success/failure) — if the flag
    // gets stuck due to conditional clearing, subsequent downloads return early forever
    updateDownloadInProgress = false;
  }
}

/**
 * Install the downloaded update
 * @returns {Promise} Result object
 */
async function installUpdate() {
  try {
    // Start the installation
    sendStatusToWindows('install-started', { status: 'installing' });

    // Check whether an update has been downloaded
    // (electron-updater has no isUpdateDownloaded() API, so use a flag based on the update-downloaded event)
    if (!updateDownloaded) {
      logger.warn('Attempting to install update, but no update is downloaded');

      // Show a message to the user
      sendStatusToWindows('update-error', {
        status: 'error',
        error: 'No update has been downloaded to install',
      });

      return {
        success: false,
        error: 'No update has been downloaded to install',
      };
    }

    // Notify all windows of the shutdown before calling quitAndInstall
    sendStatusToWindows('app-closing', {
      status: 'closing',
      message: 'Application is closing to install update',
    });

    // Install after a short delay (allow time for the UI message to appear)
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Call quitAndInstall (the isSilent, isForceRunAfter options are available)
    // On macOS the app quits and the new version is installed automatically
    logger.info('Closing app to install update...');

    // quitAndInstall closes the windows first, but if isQuitting is false the
    // window's close handler blocks the quit via preventDefault, so the restart does not happen
    app.isQuitting = true;

    // isSilent: false - show the shutdown notification to the user
    // isForceRunAfter: true - automatically restart the app after installation
    autoUpdater.quitAndInstall(false, true);

    return {
      success: true,
    };
  }
  catch (error) {
    logger.error('Update installation error:', error.toString());

    sendStatusToWindows('update-error', {
      status: 'error',
      error: error.toString(),
    });

    return {
      success: false,
      error: error.toString(),
    };
  }
}

/**
 * Download and immediately install the update (for the tray menu's one-click upgrade)
 * @param {string} [version] - Target version (for tray display)
 * @returns {Promise} Result object
 */
async function downloadAndInstallUpdate(version) {
  // If an update has already been downloaded, install it right away
  if (updateDownloaded) {
    logger.info('Update already downloaded, installing immediately');
    return await installUpdate();
  }

  notifyTrayUpdateState('downloading', version);

  const downloadResult = await downloadUpdate();
  if (!downloadResult.success) {
    if (downloadResult.alreadyInProgress) {
      // A download triggered by an earlier click is still running; leave the
      // tray showing 'downloading' instead of reverting it to 'available',
      // which would look like that download had failed or been cancelled.
      logger.info('One-click upgrade skipped: a download is already in progress');
      return downloadResult;
    }

    logger.error('One-click upgrade failed during download:', downloadResult.error);
    notifyTrayUpdateState('available', version);
    return downloadResult;
  }

  return await installUpdate();
}

/**
 * Send status updates to all windows
 * @param {string} channel - Event channel name
 * @param {Object} data - Status data
 */
function sendStatusToWindows(channel, data) {
  // Send the event to the toast/settings windows (destroyed windows are skipped automatically)
  broadcastToWindows(windowsRef, channel, data);

  // Log every event (for debugging)
  logger.debug(`Sent event to windows: ${channel}`, data);
}

/**
 * Convert a byte count into a human-readable format
 * @param {number} bytes - Number of bytes
 * @returns {string} Converted string (e.g. 1.5 MB)
 */
function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) {
    return '0 Bytes';
  }

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Semantic version comparison
 * @param {string} v1 - Version 1
 * @param {string} v2 - Version 2
 * @returns {number} 1 if v1 > v2, -1 if v1 < v2, 0 if equal
 */
function compareVersions(v1, v2) {
  const v1Parts = v1.split('.').map(Number);
  const v2Parts = v2.split('.').map(Number);

  for (let i = 0; i < Math.max(v1Parts.length, v2Parts.length); i++) {
    const v1Part = v1Parts[i] || 0;
    const v2Part = v2Parts[i] || 0;

    if (v1Part > v2Part) {
      return 1;
    }
    if (v1Part < v2Part) {
      return -1;
    }
  }

  return 0;
}

// Module exports
module.exports = {
  initAutoUpdater,
  checkForUpdates,
  downloadUpdate,
  installUpdate,
  downloadAndInstallUpdate,
};
