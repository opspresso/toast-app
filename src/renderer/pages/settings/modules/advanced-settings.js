/**
 * Settings - Advanced Settings Management
 */

import { hideAfterActionCheckbox, hideOnBlurCheckbox, hideOnEscapeCheckbox, showInTaskbarCheckbox, resetSettingsButton } from './dom-elements.js';
import { config, updateConfig } from './state.js';

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
      window.settings.setConfig('advanced.hideAfterAction', hideAfterActionCheckbox.checked);
    });
  }

  if (hideOnBlurCheckbox) {
    hideOnBlurCheckbox.addEventListener('change', () => {
      window.settings.log.info('Hide on blur setting changed:', hideOnBlurCheckbox.checked);
      window.settings.setConfig('advanced.hideOnBlur', hideOnBlurCheckbox.checked);
    });
  }

  if (hideOnEscapeCheckbox) {
    hideOnEscapeCheckbox.addEventListener('change', () => {
      window.settings.log.info('Hide on ESC key setting changed:', hideOnEscapeCheckbox.checked);
      window.settings.setConfig('advanced.hideOnEscape', hideOnEscapeCheckbox.checked);
    });
  }

  if (showInTaskbarCheckbox) {
    showInTaskbarCheckbox.addEventListener('change', () => {
      window.settings.log.info('Show in taskbar setting changed:', showInTaskbarCheckbox.checked);
      window.settings.setConfig('advanced.showInTaskbar', showInTaskbarCheckbox.checked);
    });
  }

  if (resetSettingsButton) {
    resetSettingsButton.addEventListener('click', () => {
      if (confirm('Do you want to reset all settings to default values?')) {
        window.settings
          .resetConfig()
          .then(() =>
            // Reload settings
            window.settings.getConfig(),
          )
          .then(loadedConfig => {
            updateConfig(loadedConfig);
            // UI initialization handled via dynamic import
            import('../index.js').then(({ initializeUI }) => {
              initializeUI();
            });
            alert('Settings have been reset.');
          })
          .catch(error => {
            window.settings.log.error('Settings reset error:', error);
            alert('An error occurred while resetting settings.');
          });
      }
    });
  }
}
