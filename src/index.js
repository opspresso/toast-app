/**
 * Toast - Main Entry Point
 *
 * This is the main entry point for the Toast application.
 * It initializes the Electron app, creates windows, and sets up event listeners.
 */

const { app } = require('electron');
const { loadEnv } = require('./main/config/env');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const fs = require('fs');

// 환경 변수 로드
loadEnv();

// Import modules
const { createConfigStore } = require('./main/config');
const { registerGlobalShortcuts, unregisterGlobalShortcuts } = require('./main/shortcuts');
const { createTray, destroyTray } = require('./main/tray');
const { createToastWindow, createSettingsWindow, showSettingsWindow, closeAllWindows, windows } = require('./main/windows');
const { setupIpcHandlers } = require('./main/ipc');
const authManager = require('./main/auth-manager');
const auth = require('./main/auth');

// Prevent multiple instances of the app
if (!app.requestSingleInstanceLock()) {
  app.quit();
  process.exit(0);
}

// Create configuration store
const config = createConfigStore();

// Flag to track if the app is quitting
let isQuitting = false;

/**
 * 환경 구성 파일을 로드하고 앱에 반영
 */
async function loadEnvironmentConfig() {
  console.log('환경 구성 파일 로드 시작...');
  try {
    // 1. 인증 토큰 로드
    const hasToken = await auth.hasValidToken();
    console.log('인증 토큰 확인 결과:', hasToken ? '토큰 있음' : '토큰 없음');

    // 2. 사용자 프로필 로드
    if (hasToken) {
      const userProfile = await authManager.fetchUserProfile();
      console.log('사용자 프로필 로드 완료:', userProfile ? '성공' : '실패');

      // 3. 사용자 설정 로드
      const userSettings = await authManager.getUserSettings();
      console.log('사용자 설정 로드 완료:', userSettings ? '성공' : '실패');

      // 인증 상태 알림
      if (userProfile) {
        authManager.notifyAuthStateChange({
          isAuthenticated: true,
          profile: userProfile,
          settings: userSettings
        });
        console.log('인증 상태 업데이트 알림 전송 완료');
      }
    } else {
      console.log('유효한 토큰이 없어 인증 상태 초기화');
      authManager.notifyAuthStateChange({
        isAuthenticated: false
      });
    }
  } catch (error) {
    console.error('환경 구성 파일 로드 중 오류:', error);
  }
  console.log('환경 구성 파일 로드 완료');
}

/**
 * Initialize the application
 */
function initialize() {
  // Create necessary directories
  const appDataPath = app.getPath('userData');
  const configPath = path.join(appDataPath, 'config');

  if (!fs.existsSync(configPath)) {
    fs.mkdirSync(configPath, { recursive: true });
  }

  // Set up auto launch
  app.setLoginItemSettings({
    openAtLogin: config.get('advanced.launchAtLogin') || false
  });

  // Create windows
  createToastWindow(config);

  // Create the tray icon
  createTray(windows);

  // Register global shortcuts
  registerGlobalShortcuts(config, windows);

  // Set up IPC handlers
  setupIpcHandlers(windows);

  // 인증 관리자 초기화 (클라우드 동기화 포함)
  authManager.initialize(windows);

  // 환경 구성 파일 로드 및 앱에 반영
  loadEnvironmentConfig();

  // 프로토콜 핸들러 등록 (auth 모듈의 함수 호출)
  auth.registerProtocolHandler();

  // URL 프로토콜 요청 처리 함수 설정
  global.handleProtocolRequest = (url) => {
    console.log('프로토콜 요청 처리:', url);

    // URL에서 인증 코드 직접 추출
    if (url.startsWith('toast-app://auth')) {
      try {
        const urlObj = new URL(url);
        const code = urlObj.searchParams.get('code');
        const error = urlObj.searchParams.get('error');

        console.log('프로토콜에서 코드 추출:', code ? '있음' : '없음');

        if (error) {
          console.error('인증 오류 파라미터:', error);
          authManager.notifyLoginError(error);
          return;
        }

        if (!code) {
          console.error('인증 코드가 URL에 없습니다');
          authManager.notifyLoginError('인증 코드가 없습니다');
          return;
        }

        // 추출한 코드를 직접 authManager에 전달
        console.log('인증 코드 교환 시작:', code.substring(0, 6) + '...');
        authManager.exchangeCodeForTokenAndUpdateSubscription(code).then(result => {
          console.log('인증 코드 교환 결과:', result.success ? '성공' : '실패');
        }).catch(err => {
          console.error('인증 코드 교환 오류:', err);
          authManager.notifyLoginError(err.message || '인증 처리 중 오류가 발생했습니다');
        });
      } catch (error) {
        console.error('URL 파싱 오류:', error);
        authManager.notifyLoginError(error.message || 'URL 처리 중 오류가 발생했습니다');
      }
    } else {
      console.log('인증 URL이 아닌 프로토콜 요청:', url);
    }
  };

  // Set quitting flag on app
  app.isQuitting = false;
}

// Configure auto updater
function setupAutoUpdater() {
  if (process.env.NODE_ENV !== 'development') {
    autoUpdater.checkForUpdatesAndNotify();

    // Log update events
    autoUpdater.on('checking-for-update', () => {
      console.log('Checking for update...');
    });

    autoUpdater.on('update-available', (info) => {
      console.log('Update available:', info.version);
    });

    autoUpdater.on('update-not-available', () => {
      console.log('Update not available');
    });

    autoUpdater.on('error', (err) => {
      console.error('Error in auto-updater:', err);
    });

    autoUpdater.on('download-progress', (progressObj) => {
      console.log(`Download progress: ${progressObj.percent.toFixed(2)}%`);
    });

    autoUpdater.on('update-downloaded', (info) => {
      console.log('Update downloaded. Will install on restart.');
    });
  }
}

// When Electron has finished initialization
app.whenReady().then(() => {
  initialize();
  setupAutoUpdater();

  // Show the settings window on first launch if this is a new installation
  const isFirstLaunch = !config.has('firstLaunchCompleted');
  if (isFirstLaunch) {
    // Set first launch flag
    config.set('firstLaunchCompleted', true);

    // Show settings window on first launch
    showSettingsWindow(config);
  }
});

// Handle second instance
app.on('second-instance', (event, commandLine, workingDirectory) => {
  // Focus the toast window if it exists
  if (windows.toast) {
    if (windows.toast.isMinimized()) {
      windows.toast.restore();
    }
    windows.toast.show();
    windows.toast.focus();
  }

  // 두 번째 인스턴스가 프로토콜 URL로 시작된 경우 처리
  if (process.platform === 'win32' || process.platform === 'linux') {
    // Windows와 Linux에서의 딥 링크 처리
    const url = commandLine.find(arg => arg.startsWith('toast-app://'));
    if (url && global.handleProtocolRequest) {
      global.handleProtocolRequest(url);
    }
  }
});

// macOS에서 프로토콜 URL 처리
app.on('open-url', (event, url) => {
  event.preventDefault();
  if (url.startsWith('toast-app://') && global.handleProtocolRequest) {
    global.handleProtocolRequest(url);
  }
});

// Quit when all windows are closed, except on macOS
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// On macOS, re-create the window when the dock icon is clicked
app.on('activate', () => {
  if (!windows.toast || windows.toast.isDestroyed()) {
    createToastWindow(config);
  }
});

// Clean up before quitting
app.on('before-quit', () => {
  app.isQuitting = true;
  unregisterGlobalShortcuts();
  destroyTray();
  closeAllWindows();
});
