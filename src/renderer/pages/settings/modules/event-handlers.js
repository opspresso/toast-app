/**
 * Settings - Event Handlers Management
 */

import { launchAtLoginCheckbox } from './dom-elements.js';
import { isRecordingHotkey, unsavedChanges, config, updateConfig } from './state.js';
import { switchTab } from './tabs.js';
import { startRecordingHotkey, clearHotkey, handleHotkeyRecording } from './general-settings.js';
import { setupAppearanceEventListeners } from './appearance-settings.js';
import { setupAdvancedEventListeners } from './advanced-settings.js';
import { setupAccountEventListeners } from './account-settings.js';
import { setupAboutEventListeners } from './about-settings.js';
import { setupSnippetsEventListeners } from './snippets-settings.js';

/**
 * Sets up all event listeners for UI controls, keyboard shortcuts, authentication events, configuration updates, and modal interactions in the Settings window.
 */
export function setupEventListeners() {
  window.settings.log.info('Setting up event listeners...');

  // Global variable to manage event handler registration state
  let eventListenersInitialized = false;

  // Variables to track the last event processing time
  let lastTabClickTime = 0;
  let lastEscKeyTime = 0;

  // Timer variables for event debouncing
  let tabClickTimer = null;
  let escKeyTimer = null;

  // Function that manages all event listeners
  function registerAllEventListeners() {
    // Prevent duplicate registration if already initialized
    if (eventListenersInitialized) {
      window.settings.log.info('Event listeners are already initialized, skipping duplicate registration.');
      return;
    }

    window.settings.log.info('Starting registration of all event listeners...');

    // Use event delegation pattern to handle tab click events
    // Instead of adding events directly to each tab element, add the event to the parent .settings-nav
    const settingsNav = document.querySelector('.settings-nav');
    if (settingsNav) {
      // Clone into a new element to remove all previous event listeners
      const newNav = settingsNav.cloneNode(true);
      if (settingsNav.parentNode) {
        settingsNav.parentNode.replaceChild(newNav, settingsNav);
      }

      // Register event listener using event delegation
      newNav.addEventListener(
        'click',
        function (event) {
          // Check whether an li element or a child of an li was clicked
          let targetLi = event.target;
          while (targetLi && targetLi !== newNav) {
            if (targetLi.tagName === 'LI') {
              break;
            }
            targetLi = targetLi.parentNode;
          }

          // Ignore if the clicked element is not an li
          if (!targetLi || targetLi === newNav) {
            return;
          }

          // Completely block event propagation
          event.preventDefault();
          event.stopImmediatePropagation();

          // Record the current time
          const now = Date.now();
          const tabId = targetLi.getAttribute('data-tab');

          // Cancel any debounce timer already in progress
          if (tabClickTimer) {
            clearTimeout(tabClickTimer);
          }

          // Prevent rapid consecutive clicks (same tab within 300ms)
          if (now - lastTabClickTime < 300) {
            window.settings.log.info(`Rapid consecutive click detected (${tabId}), ignoring.`);
            return;
          }

          // Update time
          lastTabClickTime = now;

          // Debounce handling (merge into one if processing concentrates within 10ms)
          tabClickTimer = setTimeout(() => {
            window.settings.log.info(`Tab click detected: ${tabId}`);
            switchTab(tabId);
            tabClickTimer = null;
          }, 10);
        },
        true,
      );
    }

    // ESC key event handler (global handler)
    function handleEscKey(event) {
      if (event.key !== 'Escape' || isRecordingHotkey) {
        return;
      }

      // Block event propagation
      event.stopImmediatePropagation();

      // Record the current time
      const now = Date.now();

      // Prevent rapid consecutive key input (within 300ms)
      if (now - lastEscKeyTime < 300) {
        window.settings.log.info('Rapid consecutive ESC key detected, ignoring.');
        return;
      }

      // Update time
      lastEscKeyTime = now;

      // Cancel any debounce timer already in progress
      if (escKeyTimer) {
        clearTimeout(escKeyTimer);
      }

      // Debounce handling
      escKeyTimer = setTimeout(() => {
        window.settings.log.info('ESC key detected - attempting to close window');

        if (unsavedChanges) {
          if (confirm('You have unsaved changes. Do you want to close without saving?')) {
            window.settings.closeWindow();
          }
        }
        else {
          window.settings.closeWindow();
        }

        escKeyTimer = null;
      }, 10);
    }

    // Remove existing event listeners, then register anew
    document.removeEventListener('keydown', handleHotkeyRecording);
    document.removeEventListener('keydown', handleEscKey);

    // Register keyboard event listeners
    document.addEventListener('keydown', handleEscKey, { capture: true });
    document.addEventListener('keydown', handleHotkeyRecording);

    // Mark event initialization complete
    eventListenersInitialized = true;
    window.settings.log.info('All event listeners were registered successfully.');
  }

  // Execute event listener registration
  registerAllEventListeners();

  // General settings event listeners
  const recordHotkeyButton = document.getElementById('record-hotkey');
  const clearHotkeyButton = document.getElementById('clear-hotkey');

  if (recordHotkeyButton) {
    recordHotkeyButton.addEventListener('click', startRecordingHotkey);
  }

  if (clearHotkeyButton) {
    clearHotkeyButton.addEventListener('click', clearHotkey);
  }

  // Event listeners to save settings immediately on change
  // General settings
  if (launchAtLoginCheckbox) {
    launchAtLoginCheckbox.addEventListener('change', () => {
      window.settings.log.info('Launch at login setting changed:', launchAtLoginCheckbox.checked);
      window.settings.setConfig('advanced.launchAtLogin', launchAtLoginCheckbox.checked);
    });
  }

  // Set up event listeners for each module
  setupAppearanceEventListeners();
  setupAdvancedEventListeners();
  setupAccountEventListeners();
  setupAboutEventListeners();
  setupSnippetsEventListeners();

  // Hotkey recording event listener is already registered above
  document.addEventListener('keydown', handleHotkeyRecording);

  window.settings.log.info('Event listener setup complete');
}

/**
 * Confirm cancel changes
 */
export function confirmCancel() {
  window.settings.log.info('Cancel settings');

  if (unsavedChanges) {
    if (confirm('You have unsaved changes. Do you want to close without saving?')) {
      window.settings.closeWindow();
    }
  }
  else {
    window.settings.closeWindow();
  }
}

/**
 * Save settings
 */
export function saveSettings() {
  window.settings.log.info('Starting to save settings');

  try {
    const globalHotkeyInput = document.getElementById('global-hotkey');
    const themeSelect = document.getElementById('theme');
    const positionSelect = document.getElementById('position');
    const sizeSelect = document.getElementById('size');
    const opacityRange = document.getElementById('opacity');
    const hideAfterActionCheckbox = document.getElementById('hide-after-action');
    const hideOnBlurCheckbox = document.getElementById('hide-on-blur');
    const hideOnEscapeCheckbox = document.getElementById('hide-on-escape');
    const showInTaskbarCheckbox = document.getElementById('show-in-taskbar');

    // Create settings object
    const settings = {
      globalHotkey: globalHotkeyInput ? globalHotkeyInput.value : '',
      appearance: {
        theme: themeSelect ? themeSelect.value : 'system',
        accentColor: document.querySelector('#accent-color-picker .accent-swatch.selected')?.dataset.accentColor || 'blue',
        position: positionSelect ? positionSelect.value : 'center',
        size: sizeSelect ? sizeSelect.value : 'medium',
        opacity: opacityRange ? parseFloat(opacityRange.value) : 0.95,
      },
      advanced: {
        launchAtLogin: launchAtLoginCheckbox ? launchAtLoginCheckbox.checked : false,
        hideAfterAction: hideAfterActionCheckbox ? hideAfterActionCheckbox.checked : true,
        hideOnBlur: hideOnBlurCheckbox ? hideOnBlurCheckbox.checked : true,
        hideOnEscape: hideOnEscapeCheckbox ? hideOnEscapeCheckbox.checked : true,
        showInTaskbar: showInTaskbarCheckbox ? showInTaskbarCheckbox.checked : false,
      },
    };

    // Save settings
    window.settings.setConfig('globalHotkey', settings.globalHotkey);
    window.settings.setConfig('appearance', settings.appearance);
    window.settings.setConfig('advanced', settings.advanced);

    // Reset the unsaved changes flag
    import('./state.js').then(({ clearUnsavedChanges }) => {
      clearUnsavedChanges();
    });

    window.settings.log.info('Settings saved successfully');
  }
  catch (error) {
    window.settings.log.error('Error occurred while saving settings:', error);
  }
}
