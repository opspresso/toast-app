/**
 * Toast - Toast Window Preload Script
 *
 * This script runs in the context of the Toast window and provides
 * a bridge between the renderer process and the main process.
 */

const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('toast', {
  // Logging functions for renderer process
  log: {
    info: (message, ...args) => ipcRenderer.invoke('log-info', message, ...args),
    warn: (message, ...args) => ipcRenderer.invoke('log-warn', message, ...args),
    error: (message, ...args) => ipcRenderer.invoke('log-error', message, ...args),
    debug: (message, ...args) => ipcRenderer.invoke('log-debug', message, ...args),
  },

  // Login and user information related methods
  initiateLogin: () => ipcRenderer.invoke('initiate-login'),
  fetchUserProfile: () => ipcRenderer.invoke('fetch-user-profile'),
  fetchSubscription: () => ipcRenderer.invoke('fetch-subscription'),
  getUserSettings: () => ipcRenderer.invoke('get-user-settings'),
  logout: () => ipcRenderer.invoke('logout'),

  invoke: (channel, ...args) => {
    // Only call invoke for allowed channels
    const allowedChannels = ['logout', 'resetToDefaults', 'resetAppSettings'];
    if (allowedChannels.includes(channel)) {
      return ipcRenderer.invoke(channel, ...args);
    }
    throw new Error(`Disallowed channel: ${channel}`);
  },

  // Reset app settings to defaults
  resetToDefaults: async (options = {}) => {
    try {
      // Backup current settings (if there are settings to keep)
      const backupSettings = {};

      // Option to keep appearance settings
      if (options.keepAppearance) {
        backupSettings.appearance = await ipcRenderer.invoke('get-config', 'appearance');
      }

      // Execute settings reset
      await ipcRenderer.invoke('resetToDefaults');

      // Restore backed up settings
      if (Object.keys(backupSettings).length > 0) {
        await ipcRenderer.invoke('save-config', backupSettings);
      }

      return { success: true, message: 'Settings have been reset to defaults.' };
    } catch (error) {
      window.toast.log.error('Settings reset error:', error);
      return {
        success: false,
        error: error.message || 'An error occurred while resetting settings.',
      };
    }
  },

  // Modal state
  setModalOpen: isOpen => ipcRenderer.send('modal-state-changed', isOpen),

  // Window state
  setAlwaysOnTop: value => ipcRenderer.invoke('set-always-on-top', value),
  getWindowPosition: () => ipcRenderer.invoke('get-window-position'),
  hideWindowTemporarily: () => ipcRenderer.invoke('hide-window-temporarily'),
  showWindowAfterDialog: position => ipcRenderer.invoke('show-window-after-dialog', position),
  showWindow: () => ipcRenderer.invoke('show-window'),

  // Configuration
  getConfig: key => ipcRenderer.invoke('get-config', key),

  // Environment variables
  getEnv: key => ipcRenderer.invoke('get-env', key),

  // Actions
  executeAction: action => ipcRenderer.invoke('execute-action', action),

  // Window control
  hideWindow: async () => {
    // Only hide window if no modals are open
    const isModalOpen = await ipcRenderer.invoke('is-modal-open');
    if (!isModalOpen) {
      // Trigger event to exit edit mode before hiding window
      window.dispatchEvent(new Event('before-window-hide'));
      ipcRenderer.send('hide-toast');
    }
  },

  showSettings: () => ipcRenderer.send('show-settings'),

  // Platform information
  platform: process.platform,

  // Save configuration
  saveConfig: config => ipcRenderer.invoke('save-config', config),

  // File dialogs
  showOpenDialog: options => ipcRenderer.invoke('show-open-dialog', options),

  // App icon extraction
  extractAppIcon: (applicationPath, forceRefresh = false) => {
    return ipcRenderer.invoke('extract-app-icon', applicationPath, forceRefresh);
  },

  // Listen for events
  onConfigUpdated: callback => {
    ipcRenderer.on('config-updated', (event, config) => callback(config));

    // Return a function to remove the event listener
    return () => {
      ipcRenderer.removeListener('config-updated', callback);
    };
  },

  // Authentication related event listeners
  onLoginSuccess: callback => {
    ipcRenderer.on('login-success', (event, data) => callback(data));
    return () => {
      ipcRenderer.removeListener('login-success', callback);
    };
  },

  onLoginError: callback => {
    ipcRenderer.on('login-error', (event, data) => callback(data));
    return () => {
      ipcRenderer.removeListener('login-error', callback);
    };
  },

  onLogoutSuccess: callback => {
    ipcRenderer.on('logout-success', (event, data) => callback(data));
    return () => {
      ipcRenderer.removeListener('logout-success', callback);
    };
  },

  onAuthStateChanged: callback => {
    ipcRenderer.on('auth-state-changed', (event, data) => callback(data));
    return () => {
      ipcRenderer.removeListener('auth-state-changed', callback);
    };
  },

  onAuthReloadSuccess: callback => {
    ipcRenderer.on('auth-reload-success', (event, data) => callback(data));
    return () => {
      ipcRenderer.removeListener('auth-reload-success', callback);
    };
  },
});

// Handle keyboard shortcuts
window.addEventListener('keydown', event => {
  // Close window on Escape key if hideOnEscape is enabled
  if (event.key === 'Escape') {
    // First check modal state
    ipcRenderer.invoke('is-modal-open').then(isModalOpen => {
      // Only check hideOnEscape setting and hide window if no modal is open
      if (!isModalOpen) {
        ipcRenderer.invoke('get-config', 'advanced.hideOnEscape').then(hideOnEscape => {
          if (hideOnEscape !== false) {
            // Trigger event to exit edit mode before hiding window
            window.dispatchEvent(new Event('before-window-hide'));
            ipcRenderer.send('hide-toast');
          }
        });
      }
    });
  }
});

// Receive before-hide event from main process
ipcRenderer.on('before-hide', () => {
  window.dispatchEvent(new Event('before-window-hide'));
});

// Notify main process that the window is ready
window.addEventListener('DOMContentLoaded', () => {
  ipcRenderer.invoke('get-config').then(config => {
    // Dispatch a custom event with the configuration
    window.dispatchEvent(
      new CustomEvent('config-loaded', {
        detail: {
          pages: config.pages,
          appearance: config.appearance,
          subscription: config.subscription,
        },
      }),
    );
  });
});
