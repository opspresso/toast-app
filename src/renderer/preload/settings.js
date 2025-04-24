/**
 * Toast - Settings Window Preload Script
 *
 * This script runs in the context of the Settings window and provides
 * a bridge between the renderer process and the main process.
 */

const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld(
  'settings',
  {
    // Authentication and subscription
    initiateLogin: () => ipcRenderer.invoke('initiate-login'),
    exchangeCodeForToken: (code) => ipcRenderer.invoke('exchange-code-for-token', code),
    logout: () => ipcRenderer.invoke('logout'),
    logoutAndResetPageGroups: () => ipcRenderer.invoke('logoutAndResetPageGroups'),
    fetchUserProfile: () => ipcRenderer.invoke('fetch-user-profile'),
    fetchSubscription: () => ipcRenderer.invoke('fetch-subscription'),
    getAuthToken: () => ipcRenderer.invoke('get-auth-token'),
    openUrl: (url) => ipcRenderer.invoke('open-url', url),

    // Configuration
    getConfig: (key) => ipcRenderer.invoke('get-config', key),
    setConfig: (key, value) => ipcRenderer.invoke('set-config', key, value),
    resetConfig: () => ipcRenderer.invoke('reset-config'),
    importConfig: (filePath) => ipcRenderer.invoke('import-config', filePath),
    exportConfig: (filePath) => ipcRenderer.invoke('export-config', filePath),

    // Actions
    testAction: (action) => ipcRenderer.invoke('test-action', action),
    validateAction: (action) => ipcRenderer.invoke('validate-action', action),

    // Window control
    showToast: () => ipcRenderer.send('show-toast'),
    closeWindow: () => ipcRenderer.send('close-settings'),

    // Dialog
    showOpenDialog: (options) => ipcRenderer.invoke('show-open-dialog', options),
    showSaveDialog: (options) => ipcRenderer.invoke('show-save-dialog', options),
    showMessageBox: (options) => ipcRenderer.invoke('show-message-box', options),

    // App control
    restartApp: () => ipcRenderer.send('restart-app'),
    quitApp: () => ipcRenderer.send('quit-app'),

    // Shortcuts control for recording
    temporarilyDisableShortcuts: () => ipcRenderer.invoke('temporarily-disable-shortcuts'),
    restoreShortcuts: () => ipcRenderer.invoke('restore-shortcuts'),

    // System information
    getPlatform: () => process.platform,
    getVersion: () => ipcRenderer.invoke('get-app-version'),

    // Cloud Sync
    getSyncStatus: () => ipcRenderer.invoke('get-sync-status'),
    setCloudSyncEnabled: (enabled) => ipcRenderer.invoke('set-cloud-sync-enabled', enabled),
    manualSync: (action) => ipcRenderer.invoke('manual-sync', action)
  }
);

// Notify main process that the window is ready
window.addEventListener('DOMContentLoaded', () => {
  ipcRenderer.invoke('get-config')
    .then(config => {
      // Dispatch a custom event with the configuration
      window.dispatchEvent(new CustomEvent('config-loaded', {
        detail: config
      }));
    });
});

// Event handler for OAuth redirection
ipcRenderer.on('protocol-data', (event, url) => {
  // Trigger event when protocol data is received
  window.dispatchEvent(new CustomEvent('protocol-data', {
    detail: url
  }));
});

// Login success event handler
ipcRenderer.on('login-success', (event, data) => {
  window.dispatchEvent(new CustomEvent('login-success', {
    detail: data
  }));
});

// Login error event handler
ipcRenderer.on('login-error', (event, data) => {
  window.dispatchEvent(new CustomEvent('login-error', {
    detail: data
  }));
});

// Logout success event handler
ipcRenderer.on('logout-success', (event, data) => {
  window.dispatchEvent(new CustomEvent('logout-success', {
    detail: data
  }));
});

// Authentication state change event handler
ipcRenderer.on('auth-state-changed', (event, data) => {
  window.dispatchEvent(new CustomEvent('auth-state-changed', {
    detail: data
  }));
});

// Settings synchronization event handler
ipcRenderer.on('settings-synced', (event, data) => {
  window.dispatchEvent(new CustomEvent('settings-synced', {
    detail: data
  }));
});

// Configuration updated event handler
ipcRenderer.on('config-updated', (event, data) => {
  window.dispatchEvent(new CustomEvent('config-updated', {
    detail: data
  }));
});
