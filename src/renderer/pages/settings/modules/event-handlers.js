/** Register settings controls once; preferences persist immediately. */
import { launchAtLoginCheckbox, recordHotkeyButton, clearHotkeyButton } from './dom-elements.js';
import { isRecordingHotkey } from './state.js';
import { switchTab } from './tabs.js';
import { startRecordingHotkey, clearHotkey, handleHotkeyRecording, initializeGeneralSettings } from './general-settings.js';
import { savePreference } from './preference-writes.js';
import { setupAppearanceEventListeners } from './appearance-settings.js';
import { setupAdvancedEventListeners } from './advanced-settings.js';
import { setupAccountEventListeners } from './account-settings.js';
import { setupAboutEventListeners } from './about-settings.js';
import { setupSnippetsEventListeners } from './snippets-settings.js';

let eventListenersInitialized = false;

export function setupEventListeners() {
  if (eventListenersInitialized) {
    return;
  }
  eventListenersInitialized = true;
  const navigation = document.querySelector('.settings-nav');
  navigation?.addEventListener('click', event => {
    const target = event.target.closest('li[data-tab]');
    if (target && navigation.contains(target)) {
      event.preventDefault();
      switchTab(target.dataset.tab);
    }
  });
  document.addEventListener('keydown', event => {
    if (isRecordingHotkey) {
      handleHotkeyRecording(event);
    }
    else if (event.key === 'Escape' && !event.defaultPrevented) {
      event.preventDefault();
      window.settings.closeWindow();
    }
  });
  recordHotkeyButton?.addEventListener('click', startRecordingHotkey);
  clearHotkeyButton?.addEventListener('click', clearHotkey);
  launchAtLoginCheckbox?.addEventListener('change', () => {
    savePreference('advanced.launchAtLogin', launchAtLoginCheckbox.checked, initializeGeneralSettings);
  });
  setupAppearanceEventListeners();
  setupAdvancedEventListeners();
  setupAccountEventListeners();
  setupAboutEventListeners();
  setupSnippetsEventListeners();
}
