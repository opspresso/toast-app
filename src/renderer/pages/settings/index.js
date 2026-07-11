/**
 * Toast - Settings Window JavaScript (Modularized)
 *
 * This script handles the functionality of the Settings window.
 */

import { updateConfig, config } from './modules/state.js';
import { applyTheme, applyAccentColor } from './modules/utils.js';
import { switchTab } from './modules/tabs.js';
import { setupEventListeners } from './modules/event-handlers.js';
import { initializeGeneralSettings } from './modules/general-settings.js';
import { initializeAppearanceSettings } from './modules/appearance-settings.js';
import { initializeAccountSettings } from './modules/account-settings.js';
import { initializeAdvancedSettings } from './modules/advanced-settings.js';
import { initializeCloudSyncUI } from './modules/cloud-sync-settings.js';
import { initializeAboutSettings } from './modules/about-settings.js';
import { initializeSnippetsSettings } from './modules/snippets-settings.js';

/**
 * Initialize UI with config values - performs only essential work
 */
export function initializeUI() {
  window.settings.log.info('initializeUI called - initializing all required settings');

  // Analysis before full initialization - log progress
  window.settings.log.info('Task analysis: initializing all tabs (optimized approach)');

  // Requirement: all settings must be initialized

  // General settings - required setting
  window.settings.log.info('Initializing general settings');
  initializeGeneralSettings();

  // Appearance settings - required setting (theme, etc.)
  window.settings.log.info('Initializing appearance settings');
  initializeAppearanceSettings();

  // Advanced settings - required setting
  window.settings.log.info('Initializing advanced settings');
  initializeAdvancedSettings();

  // Account settings
  window.settings.log.info('Initializing account settings');
  initializeAccountSettings();

  // Cloud Sync settings
  window.settings.log.info('Initializing cloud sync settings');
  initializeCloudSyncUI();

  // Snippets settings
  window.settings.log.info('Initializing snippets settings');
  initializeSnippetsSettings();

  // About settings
  window.settings.log.info('Initializing about tab');
  initializeAboutSettings();

  // All tab content initialization complete
  window.settings.log.info('All tab content has been initialized.');
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  window.settings.log.info('DOMContentLoaded event fired - starting initialization');

  // Load configuration from main process
  window.settings
    .getConfig()
    .then(loadedConfig => {
      try {
        // Initialize settings
        window.settings.log.info('Settings load complete');
        updateConfig(loadedConfig);

        // Apply theme (handled with the highest priority)
        window.settings.log.info('Applying theme...');
        applyTheme(config.appearance?.theme || 'system');
        applyAccentColor(config.appearance?.accentColor);

        // Set up event listeners - handled before UI initialization
        window.settings.log.info('Setting up event listeners...');
        setupEventListeners();

        // Full UI initialization (handles all required settings at once)
        window.settings.log.info('Initializing entire UI...');
        initializeUI();

        // Select the first tab (must be after UI initialization)
        window.settings.log.info('Selecting the first tab...');
        const firstTabLink = document.querySelector('.settings-nav li');
        if (firstTabLink) {
          const firstTabId = firstTabLink.getAttribute('data-tab');
          window.settings.log.info(`Selecting default tab: ${firstTabId}`);
          switchTab(firstTabId);
        }

        window.settings.log.info('Initialization complete');
      }
      catch (error) {
        window.settings.log.error('Initialization error:', error);
      }
    })
    .catch(error => {
      window.settings.log.error('Settings load error:', error);
    });

  // Tab selection listener - when the main process requests a specific tab (e.g., tray About menu)
  window.addEventListener('select-settings-tab', event => {
    const tabName = event.detail;
    window.settings.log.info(`select-settings-tab event received - switching tab: ${tabName}`);
    if (tabName) {
      switchTab(tabName);
    }
  });

  // Config update listener - optimized to update only the necessary settings
  window.addEventListener('config-loaded', event => {
    window.settings.log.info('config-loaded event received - using optimized update');
    applyConfigUpdate(event.detail);
  });

  // Apply the same when the main process broadcasts config-updated due to background
  // cloud sync merges, etc. (otherwise this window keeps holding the old config and,
  // on the next save, overwrites the merged changes)
  window.addEventListener('config-updated', event => {
    window.settings.log.info('config-updated event received - reflecting background changes');
    applyConfigUpdate(event.detail);
  });
});

/**
 * Apply a new config payload to already-initialized tabs (without full UI re-initialization)
 * @param {Object} newConfig - Updated settings object
 */
function applyConfigUpdate(newConfig) {
  // Compare the previous and new settings and update only the necessary elements
  if (!newConfig) {
    return;
  }

  try {
    // Some config-updated broadcasts (manual sync, post-login sync, etc.) send a partial
    // snapshot that does not include snippets. Merge instead of fully replacing so that
    // missing fields do not wipe out existing values.
    updateConfig({ ...config, ...newConfig });

    // Snippets are snapshotted into local state at tab initialization time, so if changes
    // merged by background sync are not reflected here, they get overwritten on the next edit.
    initializeSnippetsSettings();

    // Update only the currently active tab (prevents full UI initialization)
    const activeTab = Array.from(document.querySelectorAll('.settings-tab')).find(tab => tab.classList.contains('active'));
    if (activeTab) {
      const tabId = activeTab.id;
      window.settings.log.info(`Selectively updating only the currently active tab "${tabId}"`);

      // Selectively update only the necessary settings (unified Settings tab = General/Appearance/Advanced sections)
      if (tabId === 'settings') {
        const globalHotkeyInput = document.getElementById('global-hotkey');
        const launchAtLoginCheckbox = document.getElementById('launch-at-login');

        if (globalHotkeyInput) {
          globalHotkeyInput.value = config.globalHotkey || '';
        }
        if (launchAtLoginCheckbox) {
          launchAtLoginCheckbox.checked = config.advanced?.launchAtLogin || false;
        }

        const themeSelect = document.getElementById('theme');
        const positionSelect = document.getElementById('position');
        const sizeSelect = document.getElementById('size');
        const opacityRange = document.getElementById('opacity');
        const opacityValue = document.getElementById('opacity-value');

        if (themeSelect) {
          themeSelect.value = config.appearance?.theme || 'system';
        }
        if (positionSelect) {
          positionSelect.value = config.appearance?.position || 'center';
        }
        if (sizeSelect) {
          sizeSelect.value = config.appearance?.size || 'medium';
        }
        if (opacityRange) {
          opacityRange.value = config.appearance?.opacity || 0.95;
          if (opacityValue) {
            opacityValue.textContent = opacityRange.value;
          }
        }

        const hideAfterActionCheckbox = document.getElementById('hide-after-action');
        const hideOnBlurCheckbox = document.getElementById('hide-on-blur');
        const hideOnEscapeCheckbox = document.getElementById('hide-on-escape');
        const showInTaskbarCheckbox = document.getElementById('show-in-taskbar');

        if (hideAfterActionCheckbox) {
          hideAfterActionCheckbox.checked = config.advanced?.hideAfterAction !== false;
        }
        if (hideOnBlurCheckbox) {
          hideOnBlurCheckbox.checked = config.advanced?.hideOnBlur !== false;
        }
        if (hideOnEscapeCheckbox) {
          hideOnEscapeCheckbox.checked = config.advanced?.hideOnEscape !== false;
        }
        if (showInTaskbarCheckbox) {
          showInTaskbarCheckbox.checked = config.advanced?.showInTaskbar || false;
        }
      }
    }
  }
  catch (error) {
    window.settings.log.error('applyConfigUpdate error:', error);
  }
}
