/**
 * Settings - Advanced Settings Management
 */

import { hideAfterActionCheckbox, hideOnBlurCheckbox, hideOnEscapeCheckbox, showInTaskbarCheckbox, resetSettingsButton } from './dom-elements.js';
import { config } from './state.js';
import { savePreference, writePreference } from './preference-writes.js';

/**
 * Initialize Advanced Settings tab
 */
export function initializeAdvancedSettings() {
  window.settings.log.info('initializeAdvancedSettings called');

  try {
    // Hide after action setting
    if (hideAfterActionCheckbox) {
      hideAfterActionCheckbox.checked = config.advanced?.hideAfterAction !== false;
    }

    // Hide on blur setting
    if (hideOnBlurCheckbox) {
      hideOnBlurCheckbox.checked = config.advanced?.hideOnBlur !== false;
    }

    // Hide on ESC key setting
    if (hideOnEscapeCheckbox) {
      hideOnEscapeCheckbox.checked = config.advanced?.hideOnEscape !== false;
    }

    // Show in taskbar setting
    if (showInTaskbarCheckbox) {
      showInTaskbarCheckbox.checked = config.advanced?.showInTaskbar || false;
    }

    window.settings.log.info('Advanced settings tab initialization complete');
  }
  catch (error) {
    window.settings.log.error('Error occurred while initializing Advanced settings tab:', error);
  }
}

/**
 * Setup advanced settings event listeners
 */
export function setupAdvancedEventListeners() {
  // Advanced settings
  if (hideAfterActionCheckbox) {
    hideAfterActionCheckbox.addEventListener('change', () => {
      window.settings.log.info('Hide after action setting changed:', hideAfterActionCheckbox.checked);
      savePreference('advanced.hideAfterAction', hideAfterActionCheckbox.checked, initializeAdvancedSettings);
    });
  }

  if (hideOnBlurCheckbox) {
    hideOnBlurCheckbox.addEventListener('change', () => {
      window.settings.log.info('Hide on blur setting changed:', hideOnBlurCheckbox.checked);
      savePreference('advanced.hideOnBlur', hideOnBlurCheckbox.checked, initializeAdvancedSettings);
    });
  }

  if (hideOnEscapeCheckbox) {
    hideOnEscapeCheckbox.addEventListener('change', () => {
      window.settings.log.info('Hide on ESC key setting changed:', hideOnEscapeCheckbox.checked);
      savePreference('advanced.hideOnEscape', hideOnEscapeCheckbox.checked, initializeAdvancedSettings);
    });
  }

  if (showInTaskbarCheckbox) {
    showInTaskbarCheckbox.addEventListener('change', () => {
      window.settings.log.info('Show in taskbar setting changed:', showInTaskbarCheckbox.checked);
      savePreference('advanced.showInTaskbar', showInTaskbarCheckbox.checked, initializeAdvancedSettings);
    });
  }

  if (resetSettingsButton) {
    resetSettingsButton.addEventListener('click', async () => {
      if (!confirm('Do you want to reset all settings to default values?')) {
        return;
      }
      resetSettingsButton.disabled = true;
      try {
        if (await writePreference(() => window.settings.resetConfig(), 'Could not reset or apply settings. Please try again.', initializeAdvancedSettings)) {
          alert('Settings have been reset.');
        }
      }
      finally {
        resetSettingsButton.disabled = false;
      }
    });
  }
}
