/**
 * Settings - General Settings Management
 */

import { globalHotkeyInput, recordHotkeyButton, clearHotkeyButton, launchAtLoginCheckbox } from './dom-elements.js';
import { config, isRecordingHotkey, setRecordingHotkey, markUnsavedChanges } from './state.js';

/**
 * Initialize General Settings tab
 */
export function initializeGeneralSettings() {
  window.settings.log.info('initializeGeneralSettings called');

  try {
    // Global hotkey setting
    if (globalHotkeyInput) {
      globalHotkeyInput.value = config.globalHotkey || '';
    }

    // Launch at login setting
    if (launchAtLoginCheckbox) {
      launchAtLoginCheckbox.checked = config.advanced?.launchAtLogin || false;
    }

    window.settings.log.info('General settings tab initialized');
  }
  catch (error) {
    window.settings.log.error('Error initializing general settings tab:', error);
  }
}

/**
 * Start recording hotkey
 */
export function startRecordingHotkey() {
  window.settings.log.info('Hotkey recording started');

  // Temporarily disable global shortcuts before recording starts
  window.settings
    .temporarilyDisableShortcuts()
    .then(success => {
      window.settings.log.info('Global shortcuts temporarily disabled:', success ? 'success' : 'failure');
    })
    .catch(error => {
      window.settings.log.error('Error disabling global shortcuts:', error);
    });

  setRecordingHotkey(true);
  if (globalHotkeyInput) {
    globalHotkeyInput.value = 'Waiting for hotkey input...';
    globalHotkeyInput.classList.add('recording');
  }

  if (recordHotkeyButton) {
    recordHotkeyButton.disabled = true;
  }

  // Detect changes
  markUnsavedChanges();
}

/**
 * Clear the hotkey. Used both by the "Clear" button (no recording in
 * progress — the hotkey must actually be emptied and persisted) and by
 * Escape during recording (cancel — the previously saved hotkey must be
 * restored, not wiped).
 */
export function clearHotkey() {
  window.settings.log.info('Clearing hotkey');

  const wasRecording = isRecordingHotkey;

  if (globalHotkeyInput) {
    globalHotkeyInput.value = '';
    globalHotkeyInput.classList.remove('recording');
  }

  setRecordingHotkey(false);

  if (recordHotkeyButton) {
    recordHotkeyButton.disabled = false;
  }

  if (wasRecording) {
    // Cancel recording: restore the previously saved hotkey as-is.
    window.settings
      .restoreShortcuts()
      .then(success => {
        window.settings.log.info('Global shortcuts restored:', success ? 'success' : 'failure');
      })
      .catch(error => {
        window.settings.log.error('Error restoring global shortcuts:', error);
      });
  }
  else {
    // "Clear" button: actually empty and save the hotkey, then unregister it.
    window.settings
      .setConfig('globalHotkey', '')
      .then(() => window.settings.restoreShortcuts())
      .then(() => {
        window.settings.log.info('Global hotkey cleared');
      })
      .catch(error => {
        window.settings.log.error('Error clearing global hotkey:', error);
      });
  }

  // Detect changes
  markUnsavedChanges();
}

/**
 * Handle hotkey recording
 */
export function handleHotkeyRecording(event) {
  if (!isRecordingHotkey) {
    return;
  }

  // Handle key combination
  if (event.key === 'Escape') {
    // ESC key cancels recording
    clearHotkey();
    return;
  }

  // Build hotkey combination
  const modifiers = [];
  if (event.ctrlKey) {
    modifiers.push('Ctrl');
  }
  if (event.shiftKey) {
    modifiers.push('Shift');
  }
  if (event.altKey) {
    modifiers.push('Alt');
  }
  if (event.metaKey) {
    modifiers.push('Meta');
  }

  // Handle regular key
  let key = event.key;

  // Ignore when only a modifier key is pressed - Alt, Shift, Control, Meta alone are not valid
  if (key === 'Alt' || key === 'Shift' || key === 'Control' || key === 'Meta') {
    // Keep recording state and return if only a modifier key is pressed
    return;
  }

  // Key code debugging log
  window.settings.log.debug(`Key input detected - key: "${key}", keyCode: ${event.keyCode}, code: ${event.code}`);

  // Handle special keys (using code check)
  if (event.code === 'Space') {
    key = 'Space';
    window.settings.log.debug('Space key detected and converted');
  }
  else if (key.length === 1) {
    key = key.toUpperCase();
  }

  // Handle special keys (arrows, etc.)
  if (key === 'ArrowUp') {
    key = 'Up';
  }
  if (key === 'ArrowDown') {
    key = 'Down';
  }
  if (key === 'ArrowLeft') {
    key = 'Left';
  }
  if (key === 'ArrowRight') {
    key = 'Right';
  }
  if (key === 'Enter') {
    key = 'Return';
  }
  if (key === 'Tab') {
    key = 'Tab';
  }
  if (key === 'Backspace') {
    key = 'Backspace';
  }
  if (key === 'Delete') {
    key = 'Delete';
  }
  if (key === 'Home') {
    key = 'Home';
  }
  if (key === 'End') {
    key = 'End';
  }
  if (key === 'PageUp') {
    key = 'PageUp';
  }
  if (key === 'PageDown') {
    key = 'PageDown';
  }
  if (key === 'Escape') {
    key = 'Escape';
  }

  // At least one modifier and one regular key are required
  if (modifiers.length === 0) {
    window.settings.log.warn('Invalid hotkey: a modifier key is required.');
    return;
  }

  // Build hotkey text
  const hotkey = [...modifiers, key].join('+');

  // Validate that the hotkey is valid
  if (hotkey.includes('Alt+Alt') || hotkey.includes('Shift+Shift') || hotkey.includes('Ctrl+Ctrl') || hotkey.includes('Meta+Meta')) {
    window.settings.log.warn('Invalid hotkey combination detected:', hotkey);
    return;
  }

  // Update input field
  if (globalHotkeyInput) {
    globalHotkeyInput.value = hotkey;
    globalHotkeyInput.classList.remove('recording');
  }

  setRecordingHotkey(false);
  if (recordHotkeyButton) {
    recordHotkeyButton.disabled = false;
  }

  // Prevent default event behavior
  event.preventDefault();

  // Save setting immediately
  window.settings
    .setConfig('globalHotkey', hotkey)
    .then(() => {
      window.settings.log.info('Global hotkey setting changed:', hotkey);

      // Register the hotkey immediately after recording so it can be tested
      return window.settings.restoreShortcuts();
    })
    .then(success => {
      window.settings.log.info('Global shortcuts restored:', success ? 'success' : 'failure');
      if (!success) {
        // Registration failure usually means the OS/another app already claimed the same
        // combination. The input field already shows the new value, so without notifying the
        // user they might mistakenly believe a hotkey that isn't actually registered is working.
        alert(`Failed to register hotkey "${hotkey}". It may already be in use by another application.`);
      }
    })
    .catch(error => {
      window.settings.log.error('Error setting and restoring global hotkey:', error);
    });
}
