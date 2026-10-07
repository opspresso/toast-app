/** Settings and immediate persistence for the device's global hotkey. */
import { globalHotkeyInput, recordHotkeyButton, clearHotkeyButton, launchAtLoginCheckbox } from './dom-elements.js';
import { config, isRecordingHotkey, setRecordingHotkey } from './state.js';
import { savePreference } from './preference-writes.js';

let hotkeyBusy = false;

export function initializeGeneralSettings() {
  if (globalHotkeyInput && !isRecordingHotkey && !hotkeyBusy) {
    globalHotkeyInput.value = config.globalHotkey || '';
  }
  if (launchAtLoginCheckbox) {
    launchAtLoginCheckbox.checked = config.advanced?.launchAtLogin || false;
  }
}

function updateRecordingControls() {
  if (recordHotkeyButton) {
    recordHotkeyButton.disabled = hotkeyBusy || isRecordingHotkey;
  }
  if (clearHotkeyButton) {
    clearHotkeyButton.disabled = hotkeyBusy;
  }
  globalHotkeyInput?.classList.toggle('recording', isRecordingHotkey);
}

async function restoreHotkey() {
  try {
    const restored = await window.settings.restoreShortcuts();
    if (!restored && config.globalHotkey) {
      alert(`Failed to register hotkey "${config.globalHotkey}". It may already be in use by another application.`);
    }
  }
  catch (error) {
    window.settings.log.error('Error restoring global shortcuts:', error);
    alert('Could not restore the global hotkey. Please try again.');
  }
}

export async function startRecordingHotkey() {
  if (hotkeyBusy || isRecordingHotkey) {
    return;
  }
  hotkeyBusy = true;
  updateRecordingControls();
  try {
    if (await window.settings.temporarilyDisableShortcuts() !== true) {
      throw new Error('Could not disable the current hotkey');
    }
    setRecordingHotkey(true);
    if (globalHotkeyInput) {
      globalHotkeyInput.value = 'Waiting for hotkey input...';
    }
  }
  catch (error) {
    window.settings.log.error('Error starting hotkey recording:', error);
    await restoreHotkey();
    alert('Could not start hotkey recording. Please try again.');
  }
  finally {
    hotkeyBusy = false;
    updateRecordingControls();
    initializeGeneralSettings();
  }
}

async function finishHotkey(value, save) {
  hotkeyBusy = true;
  setRecordingHotkey(false);
  updateRecordingControls();
  try {
    if (save) {
      await savePreference('globalHotkey', value);
    }
    await restoreHotkey();
  }
  finally {
    hotkeyBusy = false;
    updateRecordingControls();
    initializeGeneralSettings();
  }
}

/** Escape restores the saved hotkey; Clear outside recording persists an empty hotkey. */
export function clearHotkey() {
  if (hotkeyBusy) {
    return;
  }
  return finishHotkey('', !isRecordingHotkey);
}

export function handleHotkeyRecording(event) {
  if (!isRecordingHotkey || hotkeyBusy) {
    return;
  }
  event.preventDefault();
  event.stopImmediatePropagation();
  if (event.key === 'Escape') {
    return clearHotkey();
  }
  if (['Alt', 'Shift', 'Control', 'Meta'].includes(event.key)) {
    return;
  }
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
  if (!modifiers.length) {
    return;
  }
  const aliases = { ArrowUp: 'Up', ArrowDown: 'Down', ArrowLeft: 'Left', ArrowRight: 'Right', Enter: 'Return' };
  const key = event.code === 'Space' ? 'Space' : aliases[event.key] || (event.key.length === 1 ? event.key.toUpperCase() : event.key);
  const hotkey = [...modifiers, key].join('+');
  if (globalHotkeyInput) {
    globalHotkeyInput.value = hotkey;
  }
  return finishHotkey(hotkey, true);
}
