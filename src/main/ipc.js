/**
 * Toast - IPC Handlers
 *
 * This module sets up IPC (Inter-Process Communication) handlers for
 * communication between the main process and renderer processes.
 */

const { ipcMain } = require('electron');
const { executeAction, validateAction } = require('./executor');
const config = require('./config').createConfigStore();
const path = require('path');
const fs = require('fs');
const { dialog, shell } = require('electron');
const { unregisterGlobalShortcuts, registerGlobalShortcuts } = require('./shortcuts');
const auth = require('./auth');

// 버튼 편집 모달 상태 추적
let isModalOpen = false;

/**
 * 현재 모달이 열려있는지 확인하는 함수
 * @returns {boolean} 모달 열림 상태
 */
function isModalOpened() {
  return isModalOpen;
}

/**
 * Set up IPC handlers
 * @param {Object} windows - Object containing application windows
 */
function setupIpcHandlers(windows) {
  // URL 프로토콜 핸들러 등록 (OAuth 리디렉션 처리)
  auth.registerProtocolHandler();

  // 앱 실행 중 프로토콜 요청 처리
  global.handleProtocolRequest = (url) => {
    console.log('Protocol request received:', url);
    if (windows.settings && !windows.settings.isDestroyed()) {
      windows.settings.webContents.send('protocol-data', url);
    }
  };

  // 버튼 편집 모달 상태 변경 처리
  ipcMain.on('modal-state-changed', (event, open) => {
    isModalOpen = open;
    console.log('Modal state changed:', isModalOpen ? 'open' : 'closed');
  });

  // 현재 모달 상태 반환 핸들러
  ipcMain.handle('is-modal-open', () => {
    return isModalOpen;
  });

  // 창의 alwaysOnTop 속성 설정
  ipcMain.handle('set-always-on-top', (event, value) => {
    try {
      if (windows.toast && !windows.toast.isDestroyed()) {
        windows.toast.setAlwaysOnTop(value);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error setting alwaysOnTop:', error);
      return false;
    }
  });

  // 창의 현재 위치 반환
  ipcMain.handle('get-window-position', (event) => {
    try {
      if (windows.toast && !windows.toast.isDestroyed()) {
        return windows.toast.getPosition();
      }
      return null;
    } catch (error) {
      console.error('Error getting window position:', error);
      return null;
    }
  });

  // 창을 일시적으로 숨김 (파일 선택 대화상자 표시를 위해)
  ipcMain.handle('hide-window-temporarily', async (event) => {
    try {
      if (windows.toast && !windows.toast.isDestroyed()) {
        // 창을 숨기기 전에 항상 위 속성 끄기
        windows.toast.setAlwaysOnTop(false);
        // 창 숨기기
        windows.toast.hide();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error hiding window temporarily:', error);
      return false;
    }
  });

  // 대화상자가 닫힌 후 창 다시 표시
  ipcMain.handle('show-window-after-dialog', async (event, position) => {
    try {
      if (windows.toast && !windows.toast.isDestroyed()) {
        // 저장된 위치로 창 이동 (위치 정보가 있는 경우)
        if (position && Array.isArray(position) && position.length === 2) {
          windows.toast.setPosition(position[0], position[1]);
        }

        // 창 표시 및 포커스
        windows.toast.show();
        windows.toast.focus();

        // 항상 위로 설정 복원
        setTimeout(() => {
          if (windows.toast && !windows.toast.isDestroyed()) {
            windows.toast.setAlwaysOnTop(true);
          }
        }, 100); // 약간의 지연 후 alwaysOnTop 설정

        return true;
      }
      return false;
    } catch (error) {
      console.error('Error showing window after dialog:', error);
      return false;
    }
  });

  // Execute an action
  ipcMain.handle('execute-action', async (event, action) => {
    try {
      return await executeAction(action);
    } catch (error) {
      return {
        success: false,
        message: `Error executing action: ${error.message}`,
        error: error.toString()
      };
    }
  });

  // Test an action without executing it
  ipcMain.handle('validate-action', async (event, action) => {
    try {
      return await validateAction(action);
    } catch (error) {
      return {
        valid: false,
        message: `Error validating action: ${error.message}`,
        error: error.toString()
      };
    }
  });

  // Get configuration
  ipcMain.handle('get-config', (event, key) => {
    try {
      if (key) {
        return config.get(key);
      } else {
        return config.store;
      }
    } catch (error) {
      console.error('Error getting config:', error);
      return null;
    }
  });

  // Set configuration
  ipcMain.handle('set-config', (event, key, value) => {
    try {
      if (key === null && typeof value === 'object') {
        // Set entire config
        Object.keys(value).forEach(k => {
          config.set(k, value[k]);
        });
      } else {
        // Set specific key
        config.set(key, value);
      }

      // 설정이 변경되면 토스트 창에 즉시 알림
      if (windows.toast && !windows.toast.isDestroyed()) {
        // 전체 설정 또는 특정 섹션이 업데이트된 경우
        if (key === null || key === 'appearance' || key === 'advanced' || key === 'pages') {
          windows.toast.webContents.send('config-updated', {
            pages: config.get('pages'),
            appearance: config.get('appearance'),
            subscription: config.get('subscription')
          });
        }

        // 윈도우 설정에 영향을 미치는 경우 윈도우 속성 업데이트
        if (key === 'appearance' || key === 'appearance.opacity' || key === 'appearance.size') {
          const opacity = config.get('appearance.opacity') || 0.95;
          windows.toast.setOpacity(opacity);

          // 윈도우 크기 변경 (필요한 경우)
          const size = config.get('appearance.size') || 'medium';
          updateToastWindowSize(windows.toast, size);
        }

        // 윈도우 위치에 영향을 미치는 경우 위치 업데이트
        if (key === 'appearance' || key === 'appearance.position') {
          const { positionToastWindow } = require('./shortcuts');
          positionToastWindow(windows.toast, config);
        }
      }

      return true;
    } catch (error) {
      console.error('Error setting config:', error);
      return false;
    }
  });

  /**
   * 토스트 창 크기 업데이트
   */
  function updateToastWindowSize(window, size) {
    let width, height;

    switch (size) {
      case 'small':
        width = 500;
        height = 350;
        break;
      case 'large':
        width = 800;
        height = 550;
        break;
      case 'medium':
      default:
        width = 700;
        height = 500;
        break;
    }

    window.setSize(width, height);
  }

  // Save configuration (specific changes)
  ipcMain.handle('save-config', (event, changes) => {
    try {
      if (typeof changes === 'object') {
        // Apply each change to config
        Object.keys(changes).forEach(key => {
          config.set(key, changes[key]);
        });

        // 설정이 변경되면 토스트 창에 즉시 알림
        if (windows.toast && !windows.toast.isDestroyed()) {
          windows.toast.webContents.send('config-updated', {
            pages: config.get('pages'),
            appearance: config.get('appearance'),
            subscription: config.get('subscription')
          });

          // 외관 설정이 변경된 경우 토스트 창의 외관 업데이트
          if (changes.appearance) {
            if (changes.appearance.opacity) {
              windows.toast.setOpacity(changes.appearance.opacity);
            }

            if (changes.appearance.size) {
              updateToastWindowSize(windows.toast, changes.appearance.size);
            }

            if (changes.appearance.position) {
              const { positionToastWindow } = require('./shortcuts');
              positionToastWindow(windows.toast, config);
            }
          }
        }

        return true;
      }
      return false;
    } catch (error) {
      console.error('Error saving config:', error);
      return false;
    }
  });

  // Reset configuration to defaults
  ipcMain.handle('reset-config', async () => {
    try {
      const { resetToDefaults } = require('./config');
      resetToDefaults(config);

      // 설정 초기화 후 토스트 창에 변경 알림 전송
      if (windows.toast && !windows.toast.isDestroyed()) {
        windows.toast.webContents.send('config-updated', {
          pages: config.get('pages'),
          appearance: config.get('appearance'),
          subscription: config.get('subscription')
        });
      }

      return true;
    } catch (error) {
      console.error('Error resetting config:', error);
      return false;
    }
  });

  // Import configuration from file
  ipcMain.handle('import-config', async (event, filePath) => {
    try {
      const { importConfig } = require('./config');
      return await importConfig(config, filePath);
    } catch (error) {
      console.error('Error importing config:', error);
      return false;
    }
  });

  // Export configuration to file
  ipcMain.handle('export-config', async (event, filePath) => {
    try {
      const { exportConfig } = require('./config');
      return await exportConfig(config, filePath);
    } catch (error) {
      console.error('Error exporting config:', error);
      return false;
    }
  });

  // Show toast window
  ipcMain.on('show-toast', () => {
    if (windows.toast) {
      windows.toast.show();
      windows.toast.focus();
    }
  });

  // Hide toast window
  ipcMain.on('hide-toast', () => {
    if (windows.toast && windows.toast.isVisible()) {
      windows.toast.hide();
    }
  });

  // Show settings window
  ipcMain.on('show-settings', () => {
    const { showSettingsWindow } = require('./windows');
    const { createConfigStore } = require('./config');
    showSettingsWindow(createConfigStore());
  });

  // Close settings window
  ipcMain.on('close-settings', () => {
    if (windows.settings && !windows.settings.isDestroyed()) {
      // 먼저 창을 숨기고 나서 닫아 깜빡임 방지
      windows.settings.hide();
      // 약간의 지연 후 실제로 창 닫기
      setTimeout(() => {
        if (windows.settings && !windows.settings.isDestroyed()) {
          windows.settings.close();
        }
      }, 500);
    }
  });

  // Restart application
  ipcMain.on('restart-app', () => {
    const { app } = require('electron');
    app.relaunch();
    app.exit(0);
  });

  // Quit application
  ipcMain.on('quit-app', () => {
    const { app } = require('electron');
    app.quit();
  });

  // 인증 관련 핸들러

  // 로그인 프로세스 시작
  ipcMain.handle('initiate-login', async () => {
    try {
      return await auth.initiateLogin();
    } catch (error) {
      console.error('Error initiating login:', error);
      return false;
    }
  });

  // 인증 코드로 토큰 교환
  ipcMain.handle('exchange-code-for-token', async (event, code) => {
    try {
      return await auth.exchangeCodeForToken(code);
    } catch (error) {
      console.error('Error exchanging code for token:', error);
      return {
        success: false,
        error: error.message || 'Failed to exchange code for token'
      };
    }
  });

  // 로그아웃
  ipcMain.handle('logout', async () => {
    try {
      return await auth.logout();
    } catch (error) {
      console.error('Error logging out:', error);
      return false;
    }
  });

  // 사용자 프로필 정보 가져오기
  ipcMain.handle('fetch-user-profile', async () => {
    try {
      return await auth.fetchUserProfile();
    } catch (error) {
      console.error('Error fetching user profile:', error);

      // 인증 관련 오류인지 확인
      if (error.message && error.message.includes('Authentication failed')) {
        // 유저에게 재로그인을 요청하는 상세 오류 반환
        return {
          success: false,
          error: {
            code: 'AUTH_ERROR',
            message: '인증 세션이 만료되었습니다. 다시 로그인해 주세요.',
            originalError: error.message
          }
        };
      }

      // 그 외 오류는 일반 오류로 처리
      return {
        success: false,
        error: {
          code: 'FETCH_ERROR',
          message: '사용자 프로필 정보를 가져오는 중 오류가 발생했습니다.',
          originalError: error.message
        }
      };
    }
  });

  // 구독 정보 가져오기
  ipcMain.handle('fetch-subscription', async () => {
    try {
      return await auth.fetchSubscription();
    } catch (error) {
      console.error('Error fetching subscription:', error);

      // 인증 관련 오류인지 확인
      if (error.message && error.message.includes('Authentication failed')) {
        // 유저에게 재로그인을 요청하는 상세 오류 반환
        return {
          success: false,
          error: {
            code: 'AUTH_ERROR',
            message: '인증 세션이 만료되었습니다. 다시 로그인해 주세요.',
            originalError: error.message
          }
        };
      }

      // 그 외 오류는 일반 오류로 처리
      return {
        success: false,
        error: {
          code: 'FETCH_ERROR',
          message: '구독 정보를 가져오는 중 오류가 발생했습니다.',
          originalError: error.message
        }
      };
    }
  });

  // 현재 인증 토큰 반환
  ipcMain.handle('get-auth-token', async () => {
    try {
      return await auth.getAccessToken();
    } catch (error) {
      console.error('Error getting auth token:', error);
      return null;
    }
  });

  // URL 외부 브라우저에서 열기
  ipcMain.handle('open-url', async (event, url) => {
    try {
      await shell.openExternal(url);
      return true;
    } catch (error) {
      console.error('Error opening URL:', error);
      return false;
    }
  });

  // 단축키 레코딩을 위한 핸들러
  // 임시로 모든 단축키 비활성화
  ipcMain.handle('temporarily-disable-shortcuts', () => {
    try {
      // 현재 설정된 모든 글로벌 단축키 비활성화
      unregisterGlobalShortcuts();
      return true;
    } catch (error) {
      console.error('Error disabling shortcuts:', error);
      return false;
    }
  });

  // 단축키 복원
  ipcMain.handle('restore-shortcuts', () => {
    try {
      // 글로벌 단축키를 다시 등록
      return registerGlobalShortcuts(config, windows);
    } catch (error) {
      console.error('Error restoring shortcuts:', error);
      return false;
    }
  });

  // Show open dialog
  ipcMain.handle('show-open-dialog', async (event, options) => {
    try {
      // options에 modal: true 추가하여 모달로 표시
      const modalOptions = {
        ...options,
        modal: true,
        // toast 창을 부모로 설정하여 항상 toast 창 위에 표시
        parent: windows.toast
      };
      return await dialog.showOpenDialog(modalOptions);
    } catch (error) {
      console.error('Error showing open dialog:', error);
      return { canceled: true, error: error.toString() };
    }
  });

  // Show save dialog
  ipcMain.handle('show-save-dialog', async (event, options) => {
    try {
      // options에 modal: true 추가하여 모달로 표시
      const modalOptions = {
        ...options,
        modal: true,
        // toast 창을 부모로 설정하여 항상 toast 창 위에 표시
        parent: windows.toast
      };
      return await dialog.showSaveDialog(modalOptions);
    } catch (error) {
      console.error('Error showing save dialog:', error);
      return { canceled: true, error: error.toString() };
    }
  });

  // Show message box
  ipcMain.handle('show-message-box', async (event, options) => {
    try {
      // options에 modal: true 추가하여 모달로 표시
      const modalOptions = {
        ...options,
        modal: true,
        // toast 창을 부모로 설정하여 항상 toast 창 위에 표시
        parent: windows.toast
      };
      return await dialog.showMessageBox(modalOptions);
    } catch (error) {
      console.error('Error showing message box:', error);
      return { response: 0, error: error.toString() };
    }
  });

  // Test an action (for settings UI)
  ipcMain.handle('test-action', async (event, action) => {
    try {
      // First validate the action
      const validation = await validateAction(action);
      if (!validation.valid) {
        return {
          success: false,
          message: `Invalid action: ${validation.message}`
        };
      }

      // Then execute it
      return await executeAction(action);
    } catch (error) {
      return {
        success: false,
        message: `Error testing action: ${error.message}`,
        error: error.toString()
      };
    }
  });
}

module.exports = {
  setupIpcHandlers,
  isModalOpened
};
