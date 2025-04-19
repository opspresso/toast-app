/**
 * Toast App - Toast Window Preload Script
 *
 * This script runs in the context of the Toast window and provides
 * a bridge between the renderer process and the main process.
 */

const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld(
  'toast',
  {
    // Configuration
    getConfig: (key) => ipcRenderer.invoke('get-config', key),

    // Actions
    executeAction: (action) => ipcRenderer.invoke('execute-action', action),

    // Window control
    hideWindow: () => ipcRenderer.send('hide-toast'),

    // Platform information
    platform: process.platform,

    // Save configuration
    saveConfig: (config) => ipcRenderer.invoke('save-config', config),

    // Listen for events
    onConfigUpdated: (callback) => {
      ipcRenderer.on('config-updated', (event, config) => callback(config));

      // Return a function to remove the event listener
      return () => {
        ipcRenderer.removeListener('config-updated', callback);
      };
    }
  }
);

// Handle keyboard shortcuts
window.addEventListener('keydown', (event) => {
  // Close window on Escape key if hideOnEscape is enabled
  if (event.key === 'Escape') {
    ipcRenderer.invoke('get-config', 'advanced.hideOnEscape')
      .then(hideOnEscape => {
        if (hideOnEscape !== false) {
          ipcRenderer.send('hide-toast');
        }
      });
  }
});

// Notify main process that the window is ready
window.addEventListener('DOMContentLoaded', () => {
  ipcRenderer.invoke('get-config')
    .then(config => {
      // Dispatch a custom event with the configuration
      window.dispatchEvent(new CustomEvent('config-loaded', {
        detail: {
          pages: config.pages,
          appearance: config.appearance,
          subscription: config.subscription
        }
      }));
    });
});
