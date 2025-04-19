/**
 * Toast App - Settings Window JavaScript
 *
 * This script handles the functionality of the Settings window.
 */

// DOM Elements - Tabs
const tabLinks = document.querySelectorAll('.settings-nav li');
const tabContents = document.querySelectorAll('.settings-tab');

// DOM Elements - General Settings
const globalHotkeyInput = document.getElementById('global-hotkey');
const recordHotkeyButton = document.getElementById('record-hotkey');
const clearHotkeyButton = document.getElementById('clear-hotkey');
const launchAtLoginCheckbox = document.getElementById('launch-at-login');

// DOM Elements - Appearance Settings
const themeSelect = document.getElementById('theme');
const positionSelect = document.getElementById('position');
const sizeSelect = document.getElementById('size');
const opacityRange = document.getElementById('opacity');
const opacityValue = document.getElementById('opacity-value');
const buttonLayoutSelect = document.getElementById('button-layout');

// DOM Elements - Advanced Settings
const hideAfterActionCheckbox = document.getElementById('hide-after-action');
const hideOnBlurCheckbox = document.getElementById('hide-on-blur');
const hideOnEscapeCheckbox = document.getElementById('hide-on-escape');
const showInTaskbarCheckbox = document.getElementById('show-in-taskbar');
const resetSettingsButton = document.getElementById('reset-settings');

// DOM Elements - Main Buttons
const saveButton = document.getElementById('save-button');
const cancelButton = document.getElementById('cancel-button');

// State
let config = {};
let isRecordingHotkey = false;
let unsavedChanges = false;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  // Load configuration
  window.addEventListener('config-loaded', (event) => {
    config = event.detail;

    // Initialize UI with config values
    initializeUI();

    // Set up event listeners
    setupEventListeners();
  });

  // Load config
  window.settings.getConfig().then(loadedConfig => {
    config = loadedConfig;
    initializeUI();
  });
});

/**
 * Initialize UI with config values
 */
function initializeUI() {
  // General settings
  globalHotkeyInput.value = config.globalHotkey || '';
  launchAtLoginCheckbox.checked = config.advanced?.launchAtLogin || false;

  // Appearance settings
  themeSelect.value = config.appearance?.theme || 'system';
  positionSelect.value = config.appearance?.position || 'center';
  sizeSelect.value = config.appearance?.size || 'medium';
  opacityRange.value = config.appearance?.opacity || 0.95;
  opacityValue.textContent = opacityRange.value;
  buttonLayoutSelect.value = config.appearance?.buttonLayout || 'grid';

  // Advanced settings
  hideAfterActionCheckbox.checked = config.advanced?.hideAfterAction !== false;
  hideOnBlurCheckbox.checked = config.advanced?.hideOnBlur !== false;
  hideOnEscapeCheckbox.checked = config.advanced?.hideOnEscape !== false;
  showInTaskbarCheckbox.checked = config.advanced?.showInTaskbar || false;
}

/**
 * Set up event listeners
 */
function setupEventListeners() {
  // Tab navigation
  tabLinks.forEach(link => {
    link.addEventListener('click', () => {
      const tabId = link.getAttribute('data-tab');
      switchTab(tabId);
    });
  });

  // General settings
  recordHotkeyButton.addEventListener('click', startRecordingHotkey);
  clearHotkeyButton.addEventListener('click', clearHotkey);
  launchAtLoginCheckbox.addEventListener('change', () => {
    markUnsavedChanges();
  });

  // Appearance settings
  themeSelect.addEventListener('change', markUnsavedChanges);
  positionSelect.addEventListener('change', markUnsavedChanges);
  sizeSelect.addEventListener('change', markUnsavedChanges);
  buttonLayoutSelect.addEventListener('change', markUnsavedChanges);

  opacityRange.addEventListener('input', () => {
    opacityValue.textContent = opacityRange.value;
    markUnsavedChanges();
  });

  // Advanced settings
  hideAfterActionCheckbox.addEventListener('change', markUnsavedChanges);
  hideOnBlurCheckbox.addEventListener('change', markUnsavedChanges);
  hideOnEscapeCheckbox.addEventListener('change', markUnsavedChanges);
  showInTaskbarCheckbox.addEventListener('change', markUnsavedChanges);

  resetSettingsButton.addEventListener('click', confirmResetSettings);

  // Main buttons
  saveButton.addEventListener('click', saveSettings);
  cancelButton.addEventListener('click', confirmCancel);

  // Hotkey recording
  document.addEventListener('keydown', handleHotkeyRecording);
}

/**
 * Switch between tabs
 * @param {string} tabId - ID of the tab to switch to
 */
function switchTab(tabId) {
  // Update tab links
  tabLinks.forEach(link => {
    link.classList.toggle('active', link.getAttribute('data-tab') === tabId);
  });

  // Update tab contents
  tabContents.forEach(content => {
    content.classList.toggle('active', content.id === tabId);
  });
}

/**
 * Start recording a hotkey
 */
function startRecordingHotkey() {
  isRecordingHotkey = true;
  globalHotkeyInput.value = 'Press a key combination...';
  globalHotkeyInput.classList.add('recording');
  recordHotkeyButton.disabled = true;
}

/**
 * Handle hotkey recording
 * @param {KeyboardEvent} event - Keyboard event
 */
function handleHotkeyRecording(event) {
  if (!isRecordingHotkey) return;

  // Prevent default behavior
  event.preventDefault();

  // Get modifier keys
  const modifiers = [];
  if (event.ctrlKey) modifiers.push('Ctrl');
  if (event.altKey) modifiers.push('Alt');
  if (event.shiftKey) modifiers.push('Shift');
  if (event.metaKey) modifiers.push(process.platform === 'darwin' ? 'Cmd' : 'Super');

  // Get the key
  let key = event.key;

  // Skip if only modifier keys are pressed
  if (['Control', 'Alt', 'Shift', 'Meta'].includes(key)) {
    return;
  }

  // Format key name
  if (key === ' ') key = 'Space';
  else if (key.length === 1) key = key.toUpperCase();
  else key = key.charAt(0).toUpperCase() + key.slice(1);

  // Create hotkey string
  const hotkey = [...modifiers, key].join('+');

  // Set the hotkey
  globalHotkeyInput.value = hotkey;
  globalHotkeyInput.classList.remove('recording');
  recordHotkeyButton.disabled = false;
  isRecordingHotkey = false;

  // Mark as unsaved
  markUnsavedChanges();
}

/**
 * Clear the hotkey
 */
function clearHotkey() {
  globalHotkeyInput.value = '';
  isRecordingHotkey = false;
  globalHotkeyInput.classList.remove('recording');
  recordHotkeyButton.disabled = false;

  // Mark as unsaved
  markUnsavedChanges();
}

/**
 * Confirm resetting settings
 */
function confirmResetSettings() {
  if (confirm('Are you sure you want to reset all settings to their default values? This cannot be undone.')) {
    resetSettings();
  }
}

/**
 * Reset settings to defaults
 */
async function resetSettings() {
  try {
    const success = await window.settings.resetConfig();

    if (success) {
      // Reload config
      const newConfig = await window.settings.getConfig();
      config = newConfig;

      // Update UI
      initializeUI();

      alert('Settings reset to defaults');
    } else {
      alert('Failed to reset settings');
    }
  } catch (error) {
    alert(`Error resetting settings: ${error.message || 'Unknown error'}`);
  }
}

/**
 * Save settings
 */
async function saveSettings() {
  // Save the original button text
  const originalButtonText = saveButton.textContent;

  // Collect settings
  const settings = {
    globalHotkey: globalHotkeyInput.value,
    appearance: {
      theme: themeSelect.value,
      position: positionSelect.value,
      size: sizeSelect.value,
      opacity: parseFloat(opacityRange.value),
      buttonLayout: buttonLayoutSelect.value
    },
    advanced: {
      launchAtLogin: launchAtLoginCheckbox.checked,
      hideAfterAction: hideAfterActionCheckbox.checked,
      hideOnBlur: hideOnBlurCheckbox.checked,
      hideOnEscape: hideOnEscapeCheckbox.checked,
      showInTaskbar: showInTaskbarCheckbox.checked
    }
  };

  // Save settings
  try {
    // Disable button and change text to "Saving..."
    saveButton.disabled = true;

    // Save each section
    await window.settings.setConfig('globalHotkey', settings.globalHotkey);
    await window.settings.setConfig('appearance', settings.appearance);
    await window.settings.setConfig('advanced', settings.advanced);

    // Update config
    config = await window.settings.getConfig();

    // Clear unsaved changes flag
    unsavedChanges = false;

    // Change button text to "Saved!"
    saveButton.textContent = "Saved!";

    // Restore original text after 3 seconds
    setTimeout(() => {
      saveButton.textContent = originalButtonText;
      saveButton.disabled = false;
    }, 1000);

    // Close window
    window.settings.closeWindow();
  } catch (error) {
    alert(`Error saving settings: ${error.message || 'Unknown error'}`);
    saveButton.textContent = originalButtonText;
    saveButton.disabled = false;
  }
}

/**
 * Confirm canceling changes
 */
async function confirmCancel() {
  // Close window without saving changes
  unsavedChanges = false;
  window.settings.closeWindow();
}

/**
 * Mark settings as having unsaved changes
 */
function markUnsavedChanges() {
  unsavedChanges = true;
}
