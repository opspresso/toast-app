/**
 * Settings - About Settings Management
 */

import {
  appVersionElement,
  homepageButton,
  checkUpdatesButton,
  updateMessage,
  updateStatus,
  updateActions,
  alternativeUpdates,
  copyBrewCommand,
  downloadUpdateButton,
  installUpdateButton,
  updateLoading,
} from './dom-elements.js';
import { formatFileSize } from './utils.js';

/**
 * Initialize About tab with version information
 */
export function initializeAboutSettings() {
  window.settings.log.info('initializeAboutSettings called');

  try {
    // Display version
    if (appVersionElement) {
      // Get app version
      window.settings
        .getVersion()
        .then(version => {
          // Display version information
          appVersionElement.innerHTML = `<strong>${version}</strong>`;
          window.settings.log.info(`App version info: ${version}`);
        })
        .catch(error => {
          window.settings.log.error('Error occurred while getting version information:', error);
          appVersionElement.innerHTML = '<strong>Version information unavailable</strong>';
        });
    }

    // Reset update status
    resetUpdateUI();
  }
  catch (error) {
    window.settings.log.error('Error occurred while initializing About tab:', error);
  }
}

/**
 * Reset update UI
 */
export function resetUpdateUI() {
  // Reset update status area
  if (updateStatus) {
    updateStatus.className = 'update-status hidden';
  }

  // Reset update message
  if (updateMessage) {
    updateMessage.textContent = '';
  }

  // Hide update actions area
  if (updateActions) {
    updateActions.className = 'update-actions hidden';
  }

  // Hide alternative update methods section
  if (alternativeUpdates) {
    alternativeUpdates.className = 'alternative-updates hidden';
  }

  // Hide loading indicator
  if (updateLoading) {
    updateLoading.className = 'loading-indicator hidden';
  }

  // Hide update buttons
  if (downloadUpdateButton) {
    downloadUpdateButton.style.display = 'none';
  }

  if (installUpdateButton) {
    installUpdateButton.style.display = 'none';
  }
}

/**
 * Handle check for updates button click
 */
export function handleCheckForUpdates() {
  window.settings.log.info('Checking for updates started');

  // Reset update UI
  resetUpdateUI();

  // Show update status area
  if (updateStatus) {
    updateStatus.className = 'update-status';
  }

  // Show loading
  if (updateLoading) {
    updateLoading.className = 'loading-indicator';
  }

  // Disable button
  if (checkUpdatesButton) {
    checkUpdatesButton.disabled = true;
  }

  // Show status message
  if (updateMessage) {
    updateMessage.textContent = 'Checking for updates...';
  }

  // After checking for updates, if a new version exists, automatically proceed with download → install → restart without prompting
  window.settings
    .checkForUpdates()
    .then(result => {
      window.settings.log.info('Check for updates result:', result);

      if (result.hasUpdate) {
        const latestVersion = result.versionInfo?.latest || result.updateInfo?.version || 'new version';
        const currentVersion = result.versionInfo?.current || 'current';

        if (updateMessage) {
          let messageText = `New version available (${currentVersion} → ${latestVersion}). Downloading...`;
          if (result.files && Array.isArray(result.files) && result.files.length > 0) {
            messageText += ` (${formatFileSize(result.files[0].size || 0)})`;
          }
          updateMessage.textContent = messageText;
        }

        // Automatically proceed with download → install → restart (check button stays disabled)
        handleDownloadUpdate(latestVersion);
      }
      else {
        // No update available
        if (updateMessage) {
          updateMessage.textContent = 'You are using the latest version.';
        }
        finishCheckFlow();
      }
    })
    .catch(error => {
      window.settings.log.error('Check for updates error:', error);

      // Show error message
      if (updateMessage) {
        updateMessage.textContent = 'Error checking for updates: ' + (error.message || 'Unknown error');
      }
      finishCheckFlow();
    });
}

/**
 * Finish check/auto-update flow (hide loading + re-enable button)
 */
function finishCheckFlow() {
  if (updateLoading) {
    updateLoading.className = 'loading-indicator hidden';
  }
  if (checkUpdatesButton) {
    checkUpdatesButton.disabled = false;
  }
}

/**
 * Download update
 */
export function handleDownloadUpdate(version) {
  // Called both directly with a real version string and as a DOM click
  // handler (the "Try Again" button), which passes a MouseEvent as the
  // first argument — only treat an actual string as a version to display.
  version = typeof version === 'string' ? version : undefined;

  window.settings.log.info('Update download started');

  // Show loading
  if (updateLoading) {
    updateLoading.className = 'loading-indicator';
  }

  // Disable button
  if (downloadUpdateButton) {
    downloadUpdateButton.disabled = true;
    downloadUpdateButton.textContent = 'Downloading...';
  }

  // Update message
  if (updateMessage) {
    updateMessage.textContent = version ? `Downloading update ${version}...` : 'Downloading update...';
  }

  // Add element to display progress
  const progressElement = document.createElement('div');
  progressElement.className = 'download-progress-bar';
  progressElement.innerHTML = `
    <div class="progress-container">
      <div class="progress-bar" style="width: 0%"></div>
    </div>
    <div class="progress-text">0%</div>
  `;
  updateMessage.appendChild(progressElement);

  // Add download progress event listener (preload re-emits as CustomEvent, so extract data from detail)
  const progressListener = event => {
    const data = event.detail;
    if (data && data.progress && progressElement) {
      const percent = Math.round(data.progress.percent);
      const progressBar = progressElement.querySelector('.progress-bar');
      const progressText = progressElement.querySelector('.progress-text');

      if (progressBar) {
        progressBar.style.width = `${percent}%`;
      }
      if (progressText) {
        progressText.textContent = data.progress.formattedPercent ? `${data.progress.formattedPercent} (${data.progress.formattedSpeed || ''})` : `${percent}%`;
      }
    }
  };

  // Register event listener
  window.addEventListener('download-progress', progressListener);

  // Download update
  window.settings
    .downloadUpdate()
    .then(result => {
      window.settings.log.info('Update download result:', result);

      if (result.success) {
        // Download succeeded → proceed directly to install/restart without prompting
        if (updateMessage) {
          // Remove progress display element
          if (progressElement && progressElement.parentNode) {
            progressElement.parentNode.removeChild(progressElement);
          }

          updateMessage.textContent = `Download complete (${result.version || version || 'new version'}). Installing...`;
        }

        handleInstallUpdate();
      }
      else {
        // Download failed
        // If the error is an object, convert to a JSON string or use the message property
        let errorMessage = 'Failed to download update';
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
      window.settings.log.error('Update download error:', error);

      // Show error message
      if (updateMessage) {
        // Remove progress display element
        if (progressElement && progressElement.parentNode) {
          progressElement.parentNode.removeChild(progressElement);
        }

        updateMessage.textContent = 'Error occurred while downloading update: ' + (error.message || 'Unknown error');
      }

      // Show retry button + re-enable check button
      if (downloadUpdateButton) {
        downloadUpdateButton.style.display = 'inline-block';
        downloadUpdateButton.textContent = 'Try Again';
        downloadUpdateButton.disabled = false;
      }
      finishCheckFlow();
    })
    .finally(() => {
      // Remove event listener
      window.removeEventListener('download-progress', progressListener);

      // Hide loading
      if (updateLoading) {
        updateLoading.className = 'loading-indicator hidden';
      }
    });
}

/**
 * Handle update installation (restart)
 */
export function handleInstallUpdate() {
  window.settings.log.info('Update installation started (restart)');

  // Disable install button (if exposed via error recovery path)
  if (installUpdateButton) {
    installUpdateButton.disabled = true;
    installUpdateButton.textContent = 'Restarting...';
  }

  // Show loading
  if (updateLoading) {
    updateLoading.className = 'loading-indicator';
  }

  // Update message
  if (updateMessage) {
    updateMessage.textContent = 'Installing update...';
  }

  // Show install waiting state - installation preparation (Squirrel staging) has no
  // progress events, so show an indeterminate progress bar and message until the app closes
  const closingMessage = document.createElement('div');
  closingMessage.className = 'update-closing-message';
  closingMessage.innerHTML = `
    <div class="download-progress-bar">
      <div class="progress-container">
        <div class="progress-bar indeterminate"></div>
      </div>
      <div class="progress-text">Installing... The app will close and restart automatically. This may take up to 30 seconds.</div>
    </div>
  `;
  if (updateMessage.parentNode) {
    updateMessage.parentNode.appendChild(closingMessage);
  }

  try {
    // Install update (restart app) — proceed directly without prompting
    window.settings
      .installUpdate()
      .then(result => {
        // Also treat cases where the main process returns a failure via resolve as errors
        if (result && result.success === false) {
          window.settings.log.error('Update installation failed:', result.error);
          handleInstallError(new Error(result.error || 'Failed to install update'));
        }
      })
      .catch(error => {
        window.settings.log.error('Update installation error:', error);
        handleInstallError(error);
      });
  }
  catch (error) {
    window.settings.log.error('Exception occurred during update installation:', error);
    handleInstallError(error);
  }
}

/**
 * Handle update installation error
 */
export function handleInstallError(error) {
  // Remove installation display (countdown/indeterminate progress bar)
  document.querySelectorAll('.update-closing-message').forEach(el => el.remove());

  // Show error message
  if (updateMessage) {
    // Save existing message content
    const originalContent = updateMessage.textContent;

    // Set error message
    updateMessage.textContent = '';
    const errorLabel = document.createElement('span');
    errorLabel.className = 'error-message';
    errorLabel.textContent = 'Error occurred while installing update:';
    updateMessage.appendChild(errorLabel);
    updateMessage.appendChild(document.createTextNode(` ${error.message || 'Unknown error'}`));

    // Show additional help
    const helpText = document.createElement('p');
    helpText.className = 'error-help-text';
    helpText.textContent = 'Try closing the app manually and restart it.';
    updateMessage.appendChild(helpText);

    // Show technical error information (for developers)
    if (error.stack) {
      const techDetails = document.createElement('details');
      techDetails.className = 'error-technical-details';

      const summary = document.createElement('summary');
      summary.textContent = 'Technical error details (for developers)';
      techDetails.appendChild(summary);

      const pre = document.createElement('pre');
      pre.textContent = error.stack;
      techDetails.appendChild(pre);

      updateMessage.appendChild(techDetails);
    }
  }

  // Restore install button state
  if (installUpdateButton) {
    installUpdateButton.textContent = 'Restart to Install';
    installUpdateButton.disabled = false;
  }

  // Also re-show the download button to allow retrying
  if (downloadUpdateButton) {
    downloadUpdateButton.style.display = 'inline-block';
    downloadUpdateButton.textContent = 'Download Update Again';
    downloadUpdateButton.disabled = false;
  }

  // Hide loading + re-enable check button
  finishCheckFlow();

  // Log error details
  window.settings.log.error('Update installation error details:', {
    message: error.message,
    name: error.name,
    stack: error.stack,
    code: error.code,
  });
}

/**
 * Setup about settings event listeners
 */
export function setupAboutEventListeners() {
  // About tab buttons
  if (homepageButton) {
    homepageButton.addEventListener('click', () => {
      window.settings.openUrl('https://app.toast.sh');
    });
  }

  if (checkUpdatesButton) {
    checkUpdatesButton.addEventListener('click', handleCheckForUpdates);
  }

  if (downloadUpdateButton) {
    downloadUpdateButton.addEventListener('click', handleDownloadUpdate);
  }

  if (installUpdateButton) {
    installUpdateButton.addEventListener('click', handleInstallUpdate);
  }

  // Alternative update method buttons
  if (copyBrewCommand) {
    copyBrewCommand.addEventListener('click', () => {
      const command = 'brew upgrade opspresso/tap/toast';
      navigator.clipboard
        .writeText(command)
        .then(() => {
          copyBrewCommand.textContent = 'Copied!';
          setTimeout(() => {
            copyBrewCommand.textContent = 'Copy';
          }, 2000);
        })
        .catch(err => {
          window.settings.log.error('Clipboard copy error:', err);
          alert('Error occurred while copying the command.');
        });
    });
  }
}
