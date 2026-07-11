/**
 * Toast - Cloud Sync UI Module
 *
 * Module that handles cloud sync UI-related features.
 * This module is used in the Cloud Sync tab of the Settings window.
 */

// State management
const cloudSyncState = {
  enabled: false,
  isLoading: false,
  deviceId: null,
  lastSyncTime: 0,
  hasPermission: false,
  eventListenersInitialized: false, // Track event listener initialization state
};

// DOM element references
const DOM = {
  // Sync status elements
  syncStatusBadge: null,
  syncStatusText: null,
  lastSyncedTime: null,
  syncDeviceInfo: null,

  // Control elements
  enableCloudSyncCheckbox: null,
  manualSyncUploadButton: null,
  manualSyncDownloadButton: null,
  manualSyncResolveButton: null,
  syncLoading: null,
};

/**
 * Initialize DOM elements
 */
function initElements() {
  DOM.syncStatusBadge = document.getElementById('sync-status-badge');
  DOM.syncStatusText = document.getElementById('sync-status-text');
  DOM.lastSyncedTime = document.getElementById('last-synced-time');
  DOM.syncDeviceInfo = document.getElementById('sync-device-info');
  DOM.enableCloudSyncCheckbox = document.getElementById('enable-cloud-sync');
  DOM.manualSyncUploadButton = document.getElementById('manual-sync-upload');
  DOM.manualSyncDownloadButton = document.getElementById('manual-sync-download');
  DOM.manualSyncResolveButton = document.getElementById('manual-sync-resolve');
  DOM.syncLoading = document.getElementById('sync-loading');
}

/**
 * Initialize the cloud sync UI
 * @param {Object} config - App settings
 * @param {Object} authState - Authentication state
 * @param {Object} logger - Logger
 */
function initializeCloudSyncUI(config, authState, logger) {
  try {
    logger.info('Starting cloud sync UI initialization');
    initElements();

    // Premium subscription users always have the Cloud Sync feature enabled
    if (authState.subscription?.plan) {
      const plan = authState.subscription.plan.toLowerCase();
      if (plan.includes('premium')) {
        DOM.enableCloudSyncCheckbox.disabled = false;

        // Enable the cloud_sync feature in the subscription info
        ensureCloudSyncFeature(authState.subscription);

        logger.info('Premium subscription user verified - cloud sync enabled');
      }
    }

    // Check for VIP user
    if (authState.subscription?.isVip || authState.subscription?.vip) {
      DOM.enableCloudSyncCheckbox.disabled = false;
      logger.info('VIP user verified - cloud sync enabled');
    }

    // Get the current sync status (single source of truth)
    window.settings
      .getSyncStatus()
      .then(status => {
        logger.info('Sync status query result:', status);
        logger.info(`Cloud sync initial state: ${status.enabled ? 'enabled' : 'disabled'}`);
        // Set the checkbox to the actual state
        DOM.enableCloudSyncCheckbox.checked = status.enabled;
        updateSyncStatusUI(status, authState, logger);
      })
      .catch(error => {
        logger.error('Error getting sync status:', error);
        // Fall back to default on error
        DOM.enableCloudSyncCheckbox.checked = false;
        logger.info('Cloud sync initial state: disabled (fallback due to error)');
      });

    // Set up event listeners
    setupEventListeners(authState, logger);

    logger.info('Cloud sync UI initialization completed');
  }
  catch (error) {
    logger.error('Cloud sync UI initialization error:', error);
  }
}

/**
 * Check whether the Cloud Sync feature is included in the subscription and add it if not
 * @param {Object} subscription - Subscription info
 */
function ensureCloudSyncFeature(subscription) {
  if (!subscription.features) {
    subscription.features = {};
  }
  subscription.features.cloud_sync = true;

  if (!subscription.additionalFeatures) {
    subscription.additionalFeatures = {};
  }
  subscription.additionalFeatures.cloudSync = true;
}

/**
 * Set up event listeners
 * @param {Object} authState - Authentication state
 * @param {Object} logger - Logger
 */
function setupEventListeners(authState, logger) {
  // Prevent duplicate registration if event listeners are already registered
  if (cloudSyncState.eventListenersInitialized) {
    logger.info('Cloud sync event listeners already initialized, skipping duplicate registration');
    return;
  }

  // Cloud sync enable/disable toggle
  if (DOM.enableCloudSyncCheckbox) {
    DOM.enableCloudSyncCheckbox.addEventListener('change', () => {
      handleCloudSyncToggle(authState, logger);
    });
  }

  // Manual sync buttons
  if (DOM.manualSyncUploadButton) {
    DOM.manualSyncUploadButton.addEventListener('click', () => {
      handleManualSyncUpload(logger);
    });
  }

  if (DOM.manualSyncDownloadButton) {
    DOM.manualSyncDownloadButton.addEventListener('click', () => {
      handleManualSyncDownload(logger);
    });
  }

  if (DOM.manualSyncResolveButton) {
    DOM.manualSyncResolveButton.addEventListener('click', () => {
      handleManualSyncResolve(logger);
    });
  }

  // Mark event listener initialization as complete
  cloudSyncState.eventListenersInitialized = true;
  logger.info('Cloud sync event listeners registered successfully');
}

/**
 * Update the sync status UI
 * @param {Object} status - Sync status
 * @param {Object} authState - Authentication state
 * @param {Object} logger - Logger
 */
function updateSyncStatusUI(status, authState, logger) {
  try {
    // Save state
    cloudSyncState.enabled = status.enabled;
    cloudSyncState.deviceId = status.deviceId;
    cloudSyncState.lastSyncTime = status.lastSyncTime;

    // Check sync permission
    const hasCloudSyncPermission = checkCloudSyncPermission(authState);
    cloudSyncState.hasPermission = hasCloudSyncPermission;

    const canUseCloudSync = hasCloudSyncPermission && authState.isLoggedIn;
    logger.info(`Sync permission check: permission=${hasCloudSyncPermission}, logged in=${authState.isLoggedIn}`);

    // Disable the UI if there is no permission
    if (!canUseCloudSync) {
      logger.info('No cloud sync permission - UI disabled');
      disableCloudSyncUI(logger);
      return;
    }

    // Update the sync status badge
    updateStatusBadge(status.enabled);

    // Update the status text
    DOM.syncStatusText.textContent = status.enabled ? 'Cloud Sync Enabled' : 'Cloud Sync Disabled';

    // Update the last sync time
    updateLastSyncTime(status.lastSyncTime);

    // Update the device info
    DOM.syncDeviceInfo.textContent = status.deviceId ? `Current Device: ${status.deviceId}` : 'Current Device: Unknown';

    // Enable/disable controls
    DOM.enableCloudSyncCheckbox.disabled = !canUseCloudSync;
    DOM.enableCloudSyncCheckbox.checked = status.enabled;

    // Enable/disable sync buttons
    const buttonDisabled = !canUseCloudSync || !status.enabled;
    DOM.manualSyncUploadButton.disabled = buttonDisabled;
    DOM.manualSyncDownloadButton.disabled = buttonDisabled;
    DOM.manualSyncResolveButton.disabled = buttonDisabled;

    // Update button styles
    updateButtonStyles(buttonDisabled);

    logger.info('Sync status UI update completed');
  }
  catch (error) {
    logger.error('Sync status UI update error:', error);
  }
}

/**
 * Update the status badge
 * @param {boolean} enabled - Whether sync is enabled
 */
function updateStatusBadge(enabled) {
  if (enabled) {
    // Enabled state - show animated spinner
    DOM.syncStatusBadge.textContent = '';
    DOM.syncStatusBadge.className = 'badge premium badge-with-spinner';

    const spinner = document.createElement('div');
    spinner.className = 'spinner-inline';
    DOM.syncStatusBadge.appendChild(spinner);
  }
  else {
    // Disabled state - show stop icon
    DOM.syncStatusBadge.textContent = '⏹️';
    DOM.syncStatusBadge.className = 'badge secondary';
  }
}

/**
 * Update the last sync time
 * @param {number} lastSyncTime - Last sync time
 */
function updateLastSyncTime(lastSyncTime) {
  const syncTime = lastSyncTime ? new Date(lastSyncTime) : new Date();
  const formattedDate = formatDate(syncTime);

  DOM.lastSyncedTime.textContent = lastSyncTime ? `Last Synced: ${formattedDate}` : `Sync Status: Ready to sync (${formattedDate})`;
}

/**
 * Format a date
 * @param {Date} date - Date object
 * @returns {string} Formatted date string
 */
function formatDate(date) {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Update button styles
 * @param {boolean} disabled - Whether disabled
 */
function updateButtonStyles(disabled) {
  const buttons = [DOM.manualSyncUploadButton, DOM.manualSyncDownloadButton, DOM.manualSyncResolveButton];

  buttons.forEach(button => {
    if (disabled) {
      button.style.backgroundColor = '#cccccc';
      button.style.color = '#666666';
      button.style.cursor = 'not-allowed';
    }
    else {
      button.style.backgroundColor = '';
      button.style.color = '';
      button.style.cursor = '';
    }
  });
}

/**
 * Disable the cloud sync UI
 * @param {Object} logger - Logger
 */
function disableCloudSyncUI(logger) {
  try {
    DOM.syncStatusBadge.textContent = '⏹️';
    DOM.syncStatusBadge.className = 'badge secondary';
    DOM.syncStatusText.textContent = 'Cloud Sync Disabled';

    // Show the current date
    const currentDate = new Date();
    const formattedDate = formatDate(currentDate);
    DOM.lastSyncedTime.textContent = `Sync Status: Not synced (${formattedDate})`;
    DOM.syncDeviceInfo.textContent = 'Current Device: -';

    // Disable the checkbox
    DOM.enableCloudSyncCheckbox.checked = false;
    DOM.enableCloudSyncCheckbox.disabled = true;

    // Disable all buttons
    DOM.manualSyncUploadButton.disabled = true;
    DOM.manualSyncDownloadButton.disabled = true;
    DOM.manualSyncResolveButton.disabled = true;

    // Update button styles
    updateButtonStyles(true);

    logger.info('Cloud sync UI disable completed');
  }
  catch (error) {
    logger.error('Cloud sync UI disable error:', error);
  }
}

/**
 * Check cloud sync permission from the subscription info
 * @param {Object} authState - Authentication state
 * @returns {boolean} Whether cloud sync is permitted
 */
function checkCloudSyncPermission(authState) {
  let hasPermission = false;

  // No permission if there is no subscription info
  if (!authState.subscription) {
    return false;
  }

  // 1. Check the direct subscription status
  if (authState.subscription.isSubscribed === true || authState.subscription.active === true || authState.subscription.is_subscribed === true) {
    hasPermission = true;
  }

  // 2. Check for VIP user
  if (authState.subscription.isVip || authState.subscription.vip) {
    hasPermission = true;
  }

  // 3. Check for Premium plan
  if (authState.subscription.plan) {
    const plan = authState.subscription.plan.toLowerCase();
    if (plan.includes('premium')) {
      hasPermission = true;
    }
  }

  // 4. Check specific features
  if (authState.subscription.features?.cloud_sync === true || authState.subscription.additionalFeatures?.cloudSync === true) {
    hasPermission = true;
  }

  return hasPermission;
}

/**
 * Set the loading state
 * @param {boolean} isLoading - Whether loading is in progress
 */
function setLoading(isLoading) {
  cloudSyncState.isLoading = isLoading;

  if (isLoading) {
    DOM.syncLoading.classList.remove('hidden');
  }
  else {
    DOM.syncLoading.classList.add('hidden');
  }
}

/**
 * Disable all sync buttons
 */
function disableSyncButtons() {
  DOM.manualSyncUploadButton.disabled = true;
  DOM.manualSyncDownloadButton.disabled = true;
  DOM.manualSyncResolveButton.disabled = true;
}

/**
 * Restore the sync button state
 */
function resetSyncButtons() {
  // Restore button text
  DOM.manualSyncUploadButton.textContent = 'Upload to Server';
  DOM.manualSyncDownloadButton.textContent = 'Download from Server';
  DOM.manualSyncResolveButton.textContent = 'Resolve Conflicts';

  // Enable/disable buttons based on permission
  const buttonDisabled = !cloudSyncState.hasPermission || !cloudSyncState.enabled;
  DOM.manualSyncUploadButton.disabled = buttonDisabled;
  DOM.manualSyncDownloadButton.disabled = buttonDisabled;
  DOM.manualSyncResolveButton.disabled = buttonDisabled;
}

/**
 * Handle enabling/disabling cloud sync
 * @param {Object} authState - Authentication state
 * @param {Object} logger - Logger
 */
function handleCloudSyncToggle(authState, logger) {
  const enabled = DOM.enableCloudSyncCheckbox.checked;
  logger.info(`Cloud sync status change: ${enabled ? 'enabled' : 'disabled'}`);

  // Show loading and disable the checkbox
  setLoading(true);
  DOM.enableCloudSyncCheckbox.disabled = true;

  // Sync the state to the server
  window.settings
    .setCloudSyncEnabled(enabled)
    .then(() =>
      // Refresh the UI after the state update
      window.settings.getSyncStatus(),
    )
    .then(status => {
      // Update the UI
      updateSyncStatusUI(status, authState, logger);
      logger.info('Cloud sync status change successful');
    })
    .catch(error => {
      logger.error('Cloud sync status change error:', error);
      // Restore the state on error
      DOM.enableCloudSyncCheckbox.checked = !enabled;
    })
    .finally(() => {
      // Hide loading and enable controls
      setLoading(false);
      DOM.enableCloudSyncCheckbox.disabled = false;
    });
}

/**
 * Handle uploading settings to the server
 * @param {Object} logger - Logger
 */
function handleManualSyncUpload(logger) {
  logger.info('Manual sync - upload started');

  // Show loading and disable buttons
  setLoading(true);
  disableSyncButtons();

  // Run the upload
  window.settings
    .manualSync('upload')
    .then(result => {
      if (result.success) {
        logger.info('Settings upload successful');
        DOM.manualSyncUploadButton.textContent = 'Upload Complete!';
      }
      else {
        logger.error('Settings upload failed:', result.error);
        // If the error is an object, convert it to a JSON string or use its message property
        let errorMessage = 'Unknown error';
        if (result.error) {
          if (typeof result.error === 'object') {
            errorMessage = result.error.message || JSON.stringify(result.error);
          }
          else {
            errorMessage = result.error;
          }
        }
        throw new Error(errorMessage);
      }
    })
    .catch(error => {
      logger.error('Settings upload error:', error);
      DOM.manualSyncUploadButton.textContent = 'Upload Failed';
    })
    .finally(() => {
      // Restore state
      setLoading(false);

      setTimeout(() => {
        resetSyncButtons();
      }, 1500);
    });
}

/**
 * Handle downloading settings from the server
 * @param {Object} logger - Logger
 */
function handleManualSyncDownload(logger) {
  logger.info('Manual sync - download started');

  // Confirmation dialog
  if (!confirm('Downloading settings from the server will overwrite your local settings. Do you want to continue?')) {
    logger.info('User canceled the download');
    return;
  }

  // Show loading and disable buttons
  setLoading(true);
  disableSyncButtons();

  // Run the download
  window.settings
    .manualSync('download')
    .then(result => {
      if (result.success) {
        logger.info('Settings download successful');
        DOM.manualSyncDownloadButton.textContent = 'Download Complete!';

        // Reload the settings
        return window.settings.getConfig();
      }
      else {
        logger.error('Settings download failed:', result.error);
        // If the error is an object, convert it to a JSON string or use its message property
        let errorMessage = 'Unknown error';
        if (result.error) {
          if (typeof result.error === 'object') {
            errorMessage = result.error.message || JSON.stringify(result.error);
          }
          else {
            errorMessage = result.error;
          }
        }
        throw new Error(errorMessage);
      }
    })
    .then(loadedConfig => {
      // Dispatch event - settings loaded
      window.dispatchEvent(new CustomEvent('config-loaded', { detail: loadedConfig }));
      logger.info('New settings loaded and event triggered');
    })
    .catch(error => {
      logger.error('Settings download error:', error);
      DOM.manualSyncDownloadButton.textContent = 'Download Failed';
    })
    .finally(() => {
      // Restore state
      setLoading(false);

      setTimeout(() => {
        resetSyncButtons();
      }, 1500);
    });
}

/**
 * Handle settings conflict resolution
 * @param {Object} logger - Logger
 */
function handleManualSyncResolve(logger) {
  logger.info('Manual sync - conflict resolution started');

  // Confirmation dialog
  if (
    !confirm('This will resolve conflicts between local and server settings. Settings with more recent timestamps will be applied. Do you want to continue?')
  ) {
    logger.info('User canceled the conflict resolution');
    return;
  }

  // Show loading and disable buttons
  setLoading(true);
  disableSyncButtons();

  // Run the conflict resolution
  window.settings
    .manualSync('resolve')
    .then(result => {
      if (result.success) {
        logger.info('Settings conflict resolution successful');
        DOM.manualSyncResolveButton.textContent = 'Resolved!';

        // Reload the settings
        return window.settings.getConfig();
      }
      else {
        logger.error('Settings conflict resolution failed:', result.error);
        // If the error is an object, convert it to a JSON string or use its message property
        let errorMessage = 'Unknown error';
        if (result.error) {
          if (typeof result.error === 'object') {
            errorMessage = result.error.message || JSON.stringify(result.error);
          }
          else {
            errorMessage = result.error;
          }
        }
        throw new Error(errorMessage);
      }
    })
    .then(loadedConfig => {
      // Dispatch event - settings loaded
      window.dispatchEvent(new CustomEvent('config-loaded', { detail: loadedConfig }));
      logger.info('Merged settings loaded and event triggered');
    })
    .catch(error => {
      logger.error('Settings conflict resolution error:', error);
      DOM.manualSyncResolveButton.textContent = 'Resolution Failed';
    })
    .finally(() => {
      // Restore state
      setLoading(false);

      setTimeout(() => {
        resetSyncButtons();
      }, 1500);
    });
}

// Export module
export { initializeCloudSyncUI, updateSyncStatusUI, disableCloudSyncUI };
