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
  // Logging
  log: {
    info: (message, ...args) => ipcRenderer.invoke('log-info', message, ...args),
    warn: (message, ...args) => ipcRenderer.invoke('log-warn', message, ...args),
    error: (message, ...args) => ipcRenderer.invoke('log-error', message, ...args),
    debug: (message, ...args) => ipcRenderer.invoke('log-debug', message, ...args),
  },

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

  // App icon extraction
  extractAppIcon: (applicationPath, forceRefresh = false) => {
    return ipcRenderer.invoke('extract-app-icon', applicationPath, forceRefresh);
  },

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

  // Cloud Sync
  getSyncStatus: () => ipcRenderer.invoke('get-sync-status'),
  setCloudSyncEnabled: enabled => ipcRenderer.invoke('set-cloud-sync-enabled', enabled),
  manualSync: action => ipcRenderer.invoke('manual-sync', action),
  debugSyncStatus: () => ipcRenderer.invoke('debug-sync-status'),
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
  
  // Add debug functions to window for easy access
  window.debugSync = async () => {
    try {
      const status = await window.settings.debugSyncStatus();
      console.log('=== Sync Debug Status ===');
      console.log(status);
      return status;
    } catch (error) {
      console.error('Error getting sync status:', error);
    }
  };
  
  window.triggerManualSync = async (action = 'upload') => {
    try {
      console.log(`Triggering manual sync: ${action}`);
      const result = await window.settings.manualSync(action);
      console.log('Manual sync result:', result);
      return result;
    } catch (error) {
      console.error('Error triggering manual sync:', error);
    }
  };
  
  window.testIconChange = async () => {
    try {
      console.log('Testing icon change detection...');
      const pages = await window.settings.getConfig('pages');
      if (pages && pages.length > 0 && pages[0].buttons && pages[0].buttons.length > 0) {
        // 첫 번째 버튼의 아이콘을 임시로 변경
        const modifiedPages = JSON.parse(JSON.stringify(pages));
        const currentIcon = modifiedPages[0].buttons[0].icon || 'default';
        modifiedPages[0].buttons[0].icon = currentIcon + '_test_' + Date.now();
        
        console.log('Setting modified pages...');
        await window.settings.setConfig('pages', modifiedPages);
        console.log('Icon change test completed. Check logs for sync activity.');
        
        return { success: true, message: 'Icon change triggered' };
      } else {
        console.log('No buttons found to test icon change');
        return { success: false, message: 'No buttons found' };
      }
    } catch (error) {
      console.error('Error testing icon change:', error);
      return { success: false, error: error.message };
    }
  };
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
// Update check started
ipcRenderer.on('checking-for-update', (event, data) => {
  window.dispatchEvent(
    new CustomEvent('checking-for-update', {
      detail: data,
    }),
  );
});

// Update available
ipcRenderer.on('update-available', (event, data) => {
  window.dispatchEvent(
    new CustomEvent('update-available', {
      detail: data,
    }),
  );
});

// No updates available
ipcRenderer.on('update-not-available', (event, data) => {
  window.dispatchEvent(
    new CustomEvent('update-not-available', {
      detail: data,
    }),
  );
});

// Download progress
ipcRenderer.on('download-progress', (event, data) => {
  window.dispatchEvent(
    new CustomEvent('download-progress', {
      detail: data,
    }),
  );
});

// Download started
ipcRenderer.on('download-started', (event, data) => {
  window.dispatchEvent(
    new CustomEvent('download-started', {
      detail: data,
    }),
  );
});

// Update download completed
ipcRenderer.on('update-downloaded', (event, data) => {
  window.dispatchEvent(
    new CustomEvent('update-downloaded', {
      detail: data,
    }),
  );
});

// Installation started
ipcRenderer.on('install-started', (event, data) => {
  window.dispatchEvent(
    new CustomEvent('install-started', {
      detail: data,
    }),
  );
});

// Update error
ipcRenderer.on('update-error', (event, data) => {
  window.dispatchEvent(
    new CustomEvent('update-error', {
      detail: data,
    }),
  );
});

// Tab selection event handler
ipcRenderer.on('select-settings-tab', (event, tabName) => {
  window.settings.log.info('select-settings-tab event received:', tabName);
  window.dispatchEvent(
    new CustomEvent('select-settings-tab', {
      detail: tabName,
    }),
  );
});
