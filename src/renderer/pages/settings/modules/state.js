/**
 * Settings - State Management
 */

// State
export let config = {};
export let isRecordingHotkey = false;
export let unsavedChanges = false;
export let authState = {
  isLoggedIn: false,
  profile: null,
  subscription: null,
};

// 탭 초기화 상태 추적을 위한 객체
export const tabInitState = {
  general: false,
  appearance: false,
  account: false,
  advanced: false,
  'cloud-sync': false,
  about: false
};

// 중복 호출 방지를 위한 상태 관리
export let authStateInitialized = false;
export let profileDataFetchInProgress = false;

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
 * Mark settings as having unsaved changes
 */
export function markUnsavedChanges() {
  unsavedChanges = true;
}

/**
 * Clear unsaved changes flag
 */
export function clearUnsavedChanges() {
  unsavedChanges = false;
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

/**
 * Set auth state initialization flag
 * @param {boolean} initialized - Initialization state
 */
export function setAuthStateInitialized(initialized) {
  authStateInitialized = initialized;
}

/**
 * Set profile data fetch progress flag
 * @param {boolean} inProgress - Fetch progress state
 */
export function setProfileDataFetchInProgress(inProgress) {
  profileDataFetchInProgress = inProgress;
}
