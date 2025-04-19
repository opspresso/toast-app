/**
 * Toast App - Settings Window Preload Script
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
    getVersion: () => ipcRenderer.invoke('get-app-version')
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
