/**
 * Settings - State Management
 */

// State
export let config = {};
export let isRecordingHotkey = false;
export const authState = {
  isLoggedIn: false,
  profile: null,
  subscription: null,
};

// Object for tracking tab initialization state
export const tabInitState = {
  settings: false,
  account: false,
  snippets: false,
  about: false,
};

/**
 * Update config state
 * @param {Object} newConfig - New configuration object
 */
export function updateConfig(newConfig) {
  config = newConfig;
}

/**
 * Set hotkey recording state
 * @param {boolean} recording - Recording state
 */
export function setRecordingHotkey(recording) {
  isRecordingHotkey = recording;
}

/**
 * Update auth state
 * @param {Object} newAuthState - New auth state
 */
export function updateAuthState(newAuthState) {
  Object.assign(authState, newAuthState);
}

/**
 * Set tab initialization state
 * @param {string} tabId - Tab ID
 * @param {boolean} initialized - Initialization state
 */
export function setTabInitState(tabId, initialized) {
  tabInitState[tabId] = initialized;
}
