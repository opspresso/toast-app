/**
 * Toast - Settings Window JavaScript
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
  // 기존 단축키 잠시 비활성화 (레코드 중엔 다른 단축키 작동 방지)
  window.settings.temporarilyDisableShortcuts()
    .then(() => {
      console.log('Shortcuts temporarily disabled for recording');

      isRecordingHotkey = true;
      globalHotkeyInput.value = 'Press a key combination...';
      globalHotkeyInput.classList.add('recording');
      recordHotkeyButton.disabled = true;
    })
    .catch(err => {
      console.error('Failed to disable shortcuts for recording:', err);
    });
}

/**
 * Handle hotkey recording
 * @param {KeyboardEvent} event - Keyboard event
 */
function handleHotkeyRecording(event) {
  if (!isRecordingHotkey) return;

  // Prevent default behavior
  event.preventDefault();
  event.stopPropagation();

  // Get modifier keys (Electron accelerator 형식으로 변환)
  const modifiers = [];
  if (event.ctrlKey) modifiers.push('CommandOrControl');
  if (event.altKey) modifiers.push('Alt');
  if (event.shiftKey) modifiers.push('Shift');
  if (event.metaKey) modifiers.push('Super');

  // Get the key (Electron accelerator 형식으로 변환)
  let key = event.key;
  let code = event.code;

  // Skip if only modifier keys are pressed
  if (['Control', 'Alt', 'Shift', 'Meta'].includes(key)) {
    return;
  }

  // Format key name for Electron accelerator
  if (key === ' ' || code === 'Space' || key === 'Spacebar' || key === 'Space') {
    key = 'Space';
  } else if (key.length === 1) {
    key = key.toUpperCase();
  } else if (code.startsWith('Key')) {
    // Use the code for letter keys (KeyA, KeyB, etc)
    key = code.slice(3);
  } else if (code.startsWith('Digit')) {
    // Use the code for number keys (Digit0, Digit1, etc)
    key = code.slice(5);
  } else {
    // Handle special keys
    const keyMap = {
      'Escape': 'Esc',
      'ArrowUp': 'Up',
      'ArrowDown': 'Down',
      'ArrowLeft': 'Left',
      'ArrowRight': 'Right',
      'Enter': 'Return'
    };
    key = keyMap[key] || key;
  }

  // Create hotkey string in Electron accelerator format
  const hotkey = [...modifiers, key].join('+');

  // 디버깅 정보 (콘솔에 로깅)
  console.log('Recorded hotkey:', hotkey, 'from key:', event.key, 'code:', event.code);

  // Set the hotkey
  globalHotkeyInput.value = hotkey;
  globalHotkeyInput.classList.remove('recording');
  recordHotkeyButton.disabled = false;
  isRecordingHotkey = false;

  // 단축키 다시 활성화
  window.settings.restoreShortcuts()
    .then(() => console.log('Shortcuts restored after recording'))
    .catch(err => console.error('Failed to restore shortcuts:', err));

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
    saveButton.textContent = "Saving...";

    // Save changes first
    await window.settings.setConfig('globalHotkey', settings.globalHotkey);
    await window.settings.setConfig('appearance', settings.appearance);
    await window.settings.setConfig('advanced', settings.advanced);

    // Update config
    config = await window.settings.getConfig();

    // Clear unsaved changes flag
    unsavedChanges = false;

    // Change to saved message
    saveButton.textContent = "Saved!";

    // Show toast window to demonstrate the setting changes
    window.settings.showToast();

    // Close window after a delay to let user see the changes
    setTimeout(() => {
      // Restore original button text
      saveButton.textContent = originalButtonText;
      saveButton.disabled = false;

      // Close settings window
      window.settings.closeWindow();
    }, 1500);
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
