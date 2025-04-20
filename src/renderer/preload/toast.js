/**
 * Toast - Toast Window Preload Script
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
    // Modal state
    setModalOpen: (isOpen) => ipcRenderer.send('modal-state-changed', isOpen),

    // Window state
    setAlwaysOnTop: (value) => ipcRenderer.invoke('set-always-on-top', value),
    getWindowPosition: () => ipcRenderer.invoke('get-window-position'),
    hideWindowTemporarily: () => ipcRenderer.invoke('hide-window-temporarily'),
    showWindowAfterDialog: (position) => ipcRenderer.invoke('show-window-after-dialog', position),

    // Configuration
    getConfig: (key) => ipcRenderer.invoke('get-config', key),

    // Actions
    executeAction: (action) => ipcRenderer.invoke('execute-action', action),

    // Window control
    hideWindow: async () => {
      // 모달 상태 확인 후 모달이 열려있지 않은 경우에만 창 숨김
      const isModalOpen = await ipcRenderer.invoke('is-modal-open');
      if (!isModalOpen) {
        // 창이 숨겨지기 전에 편집 모드 종료를 위한 이벤트 발생
        window.dispatchEvent(new Event('before-window-hide'));
        ipcRenderer.send('hide-toast');
      }
    },

    showSettings: () => ipcRenderer.send('show-settings'),

    // Platform information
    platform: process.platform,

    // Save configuration
    saveConfig: (config) => ipcRenderer.invoke('save-config', config),

    // File dialogs
    showOpenDialog: (options) => ipcRenderer.invoke('show-open-dialog', options),

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
    // 먼저 모달 상태를 확인
    ipcRenderer.invoke('is-modal-open')
      .then(isModalOpen => {
        // 모달이 열려있지 않은 경우에만 hideOnEscape 설정 확인 및 창 숨김 처리
        if (!isModalOpen) {
          ipcRenderer.invoke('get-config', 'advanced.hideOnEscape')
            .then(hideOnEscape => {
              if (hideOnEscape !== false) {
                // 창이 숨겨지기 전에 편집 모드 종료를 위한 이벤트 발생
                window.dispatchEvent(new Event('before-window-hide'));
                ipcRenderer.send('hide-toast');
              }
            });
        }
      });
  }
});

// 메인 프로세스로부터 before-hide 이벤트 수신
ipcRenderer.on('before-hide', () => {
  window.dispatchEvent(new Event('before-window-hide'));
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
