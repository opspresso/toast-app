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
