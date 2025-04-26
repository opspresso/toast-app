/**
 * Toast - Settings Window Preload Script
 *
 * This script runs in the context of the Settings window and provides
 * a bridge between the renderer process and the main process.
 */

const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('settings', {
  // Authentication and subscription
  initiateLogin: () => ipcRenderer.invoke('initiate-login'),
  exchangeCodeForToken: code => ipcRenderer.invoke('exchange-code-for-token', code),
  logout: () => ipcRenderer.invoke('logout'),
  fetchUserProfile: () => ipcRenderer.invoke('fetch-user-profile'),
  fetchSubscription: () => ipcRenderer.invoke('fetch-subscription'),
  getAuthToken: () => ipcRenderer.invoke('get-auth-token'),
  openUrl: url => ipcRenderer.invoke('open-url', url),

  // Configuration
  getConfig: key => ipcRenderer.invoke('get-config', key),
  setConfig: (key, value) => ipcRenderer.invoke('set-config', key, value),
  resetConfig: () => ipcRenderer.invoke('reset-config'),
  importConfig: filePath => ipcRenderer.invoke('import-config', filePath),
  exportConfig: filePath => ipcRenderer.invoke('export-config', filePath),

  // Actions
  testAction: action => ipcRenderer.invoke('test-action', action),
  validateAction: action => ipcRenderer.invoke('validate-action', action),

  // Window control
  showToast: () => ipcRenderer.send('show-toast'),
  closeWindow: () => ipcRenderer.send('close-settings'),

  // Dialog
  showOpenDialog: options => ipcRenderer.invoke('show-open-dialog', options),
  showSaveDialog: options => ipcRenderer.invoke('show-save-dialog', options),
  showMessageBox: options => ipcRenderer.invoke('show-message-box', options),

  // App control
  restartApp: () => ipcRenderer.send('restart-app'),
  quitApp: () => ipcRenderer.send('quit-app'),

  // Shortcuts control for recording
  temporarilyDisableShortcuts: () => ipcRenderer.invoke('temporarily-disable-shortcuts'),
  restoreShortcuts: () => ipcRenderer.invoke('restore-shortcuts'),

  // System information
  getPlatform: () => process.platform,
  getVersion: () => ipcRenderer.invoke('get-app-version'),
  checkLatestVersion: () => ipcRenderer.invoke('check-latest-version'),
  downloadUpdate: () => ipcRenderer.invoke('download-update'),
  installUpdate: () => ipcRenderer.invoke('install-update'),

  // Auto updater
  checkForUpdates: silent => ipcRenderer.invoke('check-for-updates', silent),
  downloadAutoUpdate: () => ipcRenderer.invoke('download-auto-update'),
  installAutoUpdate: () => ipcRenderer.invoke('install-auto-update'),
  downloadManualUpdate: () => ipcRenderer.invoke('download-manual-update'),

  // Logging
  log: {
    info: (message, ...args) => ipcRenderer.invoke('log-info', message, ...args),
    warn: (message, ...args) => ipcRenderer.invoke('log-warn', message, ...args),
    error: (message, ...args) => ipcRenderer.invoke('log-error', message, ...args),
    debug: (message, ...args) => ipcRenderer.invoke('log-debug', message, ...args),
  },

  // Cloud Sync
  getSyncStatus: () => ipcRenderer.invoke('get-sync-status'),
  setCloudSyncEnabled: enabled => ipcRenderer.invoke('set-cloud-sync-enabled', enabled),
  manualSync: action => ipcRenderer.invoke('manual-sync', action),
});

// Notify main process that the window is ready
window.addEventListener('DOMContentLoaded', () => {
  ipcRenderer.invoke('get-config').then(config => {
    // Dispatch a custom event with the configuration
    window.dispatchEvent(
      new CustomEvent('config-loaded', {
        detail: config,
      }),
    );
  });
});

// Event handler for OAuth redirection
ipcRenderer.on('protocol-data', (event, url) => {
  // Trigger event when protocol data is received
  window.dispatchEvent(
    new CustomEvent('protocol-data', {
      detail: url,
    }),
  );
});

// Login success event handler
ipcRenderer.on('login-success', (event, data) => {
  window.dispatchEvent(
    new CustomEvent('login-success', {
      detail: data,
    }),
  );
});

// Login error event handler
ipcRenderer.on('login-error', (event, data) => {
  window.dispatchEvent(
    new CustomEvent('login-error', {
      detail: data,
    }),
  );
});

// Logout success event handler
ipcRenderer.on('logout-success', (event, data) => {
  window.dispatchEvent(
    new CustomEvent('logout-success', {
      detail: data,
    }),
  );
});

// Authentication state change event handler
ipcRenderer.on('auth-state-changed', (event, data) => {
  window.dispatchEvent(
    new CustomEvent('auth-state-changed', {
      detail: data,
    }),
  );
});

// Settings synchronization event handler
ipcRenderer.on('settings-synced', (event, data) => {
  window.dispatchEvent(
    new CustomEvent('settings-synced', {
      detail: data,
    }),
  );
});

// Configuration updated event handler
ipcRenderer.on('config-updated', (event, data) => {
  window.dispatchEvent(
    new CustomEvent('config-updated', {
      detail: data,
    }),
  );
});

// Auto Update Events Handlers
// 업데이트 확인 시작
ipcRenderer.on('checking-for-update', (event, data) => {
  window.dispatchEvent(
    new CustomEvent('checking-for-update', {
      detail: data,
    }),
  );
});

// 업데이트 가능
ipcRenderer.on('update-available', (event, data) => {
  window.dispatchEvent(
    new CustomEvent('update-available', {
      detail: data,
    }),
  );
});

// 업데이트 없음
ipcRenderer.on('update-not-available', (event, data) => {
  window.dispatchEvent(
    new CustomEvent('update-not-available', {
      detail: data,
    }),
  );
});

// 다운로드 진행 상황
ipcRenderer.on('download-progress', (event, data) => {
  window.dispatchEvent(
    new CustomEvent('download-progress', {
      detail: data,
    }),
  );
});

// 다운로드 시작
ipcRenderer.on('download-started', (event, data) => {
  window.dispatchEvent(
    new CustomEvent('download-started', {
      detail: data,
    }),
  );
});

// 업데이트 다운로드 완료
ipcRenderer.on('update-downloaded', (event, data) => {
  window.dispatchEvent(
    new CustomEvent('update-downloaded', {
      detail: data,
    }),
  );
});

// 설치 시작
ipcRenderer.on('install-started', (event, data) => {
  window.dispatchEvent(
    new CustomEvent('install-started', {
      detail: data,
    }),
  );
});

// 업데이트 오류
ipcRenderer.on('update-error', (event, data) => {
  window.dispatchEvent(
    new CustomEvent('update-error', {
      detail: data,
    }),
  );
});

// 탭 선택 이벤트 처리
ipcRenderer.on('select-settings-tab', (event, tabName) => {
  window.settings.log.info('select-settings-tab 이벤트 수신:', tabName);
  window.dispatchEvent(
    new CustomEvent('select-settings-tab', {
      detail: tabName,
    }),
  );
});
