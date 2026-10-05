/* eslint-env node */
/**
 * Toast - Toast Window Preload Script
 *
 * This script runs in the context of the Toast window and provides
 * a bridge between the renderer process and the main process.
 */

const { contextBridge, ipcRenderer } = require('electron');

function subscribe(channel, callback) {
  const listener = (_event, data) => callback(data);
  ipcRenderer.on(channel, listener);
  return () => ipcRenderer.removeListener(channel, listener);
}

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
  savePages: (pages, base) => ipcRenderer.invoke('save-pages', pages, base),

  // File dialogs
  showOpenDialog: options => ipcRenderer.invoke('show-open-dialog', options),

  // App icon extraction
  extractAppIcon: (applicationPath, forceRefresh = false) => ipcRenderer.invoke('extract-app-icon', applicationPath, forceRefresh),
  
  // Path utilities
  resolveTildePath: tildePath => ipcRenderer.invoke('resolve-tilde-path', tildePath),

  onConfigUpdated: callback => subscribe('config-updated', callback),
  onLoginSuccess: callback => subscribe('login-success', callback),
  onLoginError: callback => subscribe('login-error', callback),
  onLogoutSuccess: callback => subscribe('logout-success', callback),
  onAuthStateChanged: callback => subscribe('auth-state-changed', callback),
  onAuthReloadSuccess: callback => subscribe('auth-reload-success', callback),
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
          authSessionVersion: config.authSessionVersion,
          pages: config.pages,
          appearance: config.appearance,
          subscription: config.subscription,
        },
      }),
    );
  });
});
