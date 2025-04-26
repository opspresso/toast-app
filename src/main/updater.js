/**
 * Toast - 자동 업데이트 관리
 *
 * 이 모듈은 electron-updater를 사용하여 앱의 자동 업데이트를 처리합니다.
 */

const { app } = require('electron');
const { autoUpdater } = require('electron-updater');
const { createLogger, electronLog } = require('./logger');

// 모듈별 로거 생성
const logger = createLogger('Updater');

// 로그 레벨 설정
// 로그 레벨: error > warn > info > verbose > debug > silly
// 'info'로 설정하면 info, warn, error 레벨의 로그만 파일에 기록됨
// 개발 시에는 'debug'로 설정하면 더 많은 정보 확인 가능
electronLog.transports.file.level = 'info';

// 자동 업데이트 상태 이벤트를 전달하기 위한 변수들
let mainWindow = null;
let settingsWindow = null;

/**
 * 자동 업데이트 초기화
 * @param {Object} windows - 애플리케이션 창 객체
 */
function initAutoUpdater(windows) {
  // 창 레퍼런스 저장
  mainWindow = windows.toast;
  settingsWindow = windows.settings;

  // autoUpdater에 로깅 함수 연결
  autoUpdater.logger = logger;

  // 개발 환경에서도 업데이트 확인 가능하도록 설정
  autoUpdater.forceDevUpdateConfig = true;        // 개발 환경에서도 업데이트 확인 강제
  autoUpdater.allowDowngrade = true;              // 다운그레이드 허용
  autoUpdater.allowPrerelease = true;             // 프리릴리스 버전 허용

  // 자동 다운로드 비활성화 (사용자가 명시적으로 다운로드를 요청할 때만 다운로드)
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;

  // 업데이트 파일 관련 추가 설정
  autoUpdater.channel = 'latest';
  autoUpdater.allowPrerelease = false; // 프로덕션에서는 안정 버전만 사용

  logger.info(`AppID: ${app.isPackaged ? app.getAppPath() : 'Not packaged'}`);
  logger.info(`업데이트 캐시 디렉토리: ${app.getPath('userData')}/toast-app-updater`);

  // 로깅 설정 확장
  logger.info('자동 업데이트 모듈 초기화됨');
  logger.info(`현재 앱 버전: ${app.getVersion()}`);
  logger.info(`업데이트 소스: GitHub 릴리스 (opspresso/toast-dist)`);

  // 자동 업데이트 이벤트 핸들링
  setupAutoUpdaterEvents();

  // IPC 핸들러 등록
  setupIpcHandlers();

  // 시작 시 업데이트 확인 (개발 환경에서는 실행하지 않음)
  if (process.env.NODE_ENV !== 'development') {
    // 앱이 시작되고 몇 초 후에 업데이트 확인 (초기화 시간 확보)
    setTimeout(() => {
      checkForUpdates(false);
    }, 5000);
  }
}

/**
 * 자동 업데이트 이벤트 설정
 */
function setupAutoUpdaterEvents() {
  // 업데이트 확인 시작
  autoUpdater.on('checking-for-update', () => {
    sendStatusToWindows('checking-for-update', { status: 'checking' });
  });

  // 업데이트 사용 가능
  autoUpdater.on('update-available', (info) => {
    sendStatusToWindows('update-available', {
      status: 'available',
      info: {
        version: info.version,
        releaseDate: info.releaseDate,
        releaseNotes: info.releaseNotes,
      }
    });
  });

  // 업데이트 없음
  autoUpdater.on('update-not-available', (info) => {
    sendStatusToWindows('update-not-available', {
      status: 'not-available',
      info: {
        version: info.version,
        releaseDate: info.releaseDate
      }
    });
  });

  // 업데이트 다운로드 진행 상황
  autoUpdater.on('download-progress', (progressObj) => {
    sendStatusToWindows('download-progress', {
      status: 'downloading',
      progress: {
        percent: progressObj.percent,
        bytesPerSecond: progressObj.bytesPerSecond,
        transferred: progressObj.transferred,
        total: progressObj.total
      }
    });
  });

  // 업데이트 다운로드 완료
  autoUpdater.on('update-downloaded', (info) => {
    sendStatusToWindows('update-downloaded', {
      status: 'downloaded',
      info: {
        version: info.version,
        releaseDate: info.releaseDate,
        releaseNotes: info.releaseNotes
      }
    });
  });

  // 업데이트 오류
  autoUpdater.on('error', (err) => {
    sendStatusToWindows('update-error', {
      status: 'error',
      error: err.toString()
    });
  });
}

/**
 * IPC 핸들러 설정 - 더 이상 사용하지 않음
 * IPC 핸들러는 이제 src/main/ipc.js에서 통합 관리
 */
function setupIpcHandlers() {
  // 이 함수는 호환성을 위해 유지하지만 더 이상 IPC 핸들러를 등록하지 않음
  logger.info('Updater IPC 핸들러는 더 이상 직접 등록하지 않고 ipc.js에서 통합 관리됩니다.');
}

/**
 * 업데이트 확인
 * @param {boolean} silent - 사용자에게 알림 없이 조용히 확인 (기본값: false)
 * @returns {Promise} 결과 객체
 */
async function checkForUpdates(silent = false) {
  try {
    if (!silent) {
      sendStatusToWindows('checking-for-update', { status: 'checking' });
    }

    // electron-updater로 업데이트 확인
    logger.info('electron-updater를 통해 업데이트 확인');
    const result = await autoUpdater.checkForUpdates();

    if (result && result.updateInfo) {
      const currentVersion = app.getVersion();
      const latestVersion = result.updateInfo.version;

      logger.info(`업데이트 확인 결과: 현재 버전 ${currentVersion}, 최신 버전 ${latestVersion}`);

      return {
        success: true,
        updateInfo: result.updateInfo,
        versionInfo: {
          current: currentVersion,
          latest: latestVersion
        },
        hasUpdate: result.updateInfo.version !== currentVersion
      };
    } else {
      // 업데이트 정보가 없는 경우
      logger.info('업데이트 정보를 찾을 수 없습니다.');

      if (!silent) {
        sendStatusToWindows('update-not-available', {
          status: 'not-available',
          info: {
            version: app.getVersion()
          }
        });
      }

      return {
        success: false,
        error: '업데이트 정보를 찾을 수 없습니다.',
        versionInfo: {
          current: app.getVersion(),
          latest: null
        },
        hasUpdate: false
      };
    }
  } catch (error) {
    logger.error('업데이트 확인 오류:', error.toString());

    // 오류 알림 (silent 모드가 아닌 경우에만)
    if (!silent) {
      sendStatusToWindows('update-error', {
        status: 'error',
        error: error.toString()
      });
    }

    return {
      success: false,
      error: error.toString(),
      versionInfo: {
        current: app.getVersion(),
        latest: null
      }
    };
  }
}

/**
 * 업데이트 다운로드
 * @returns {Promise} 결과 객체
 */
async function downloadUpdate() {
  try {
    // 다운로드 시작
    sendStatusToWindows('download-started', { status: 'downloading' });

    // electron-updater로 다운로드
    logger.info('electron-updater를 통해 업데이트 다운로드');

    // 업데이트 확인 - 다운로드 전에 반드시 호출해야 함
    const updateCheckResult = await autoUpdater.checkForUpdates();

    if (!updateCheckResult || !updateCheckResult.updateInfo) {
      throw new Error('업데이트 정보를 확인할 수 없습니다.');
    }

    // 최신 버전 정보 로깅
    logger.info(`업데이트 정보 확인됨: 버전 ${updateCheckResult.updateInfo.version}`);

    // 업데이트 다운로드 시작
    logger.info('자동 업데이트 다운로드 시작');
    await autoUpdater.downloadUpdate();

    return {
      success: true,
      message: '업데이트 다운로드가 시작되었습니다.',
      version: updateCheckResult.updateInfo.version
    };
  } catch (error) {
    logger.error('업데이트 다운로드 오류:', error.toString());

    sendStatusToWindows('update-error', {
      status: 'error',
      error: error.toString()
    });

    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * 다운로드된 업데이트 설치
 * @returns {Promise} 결과 객체
 */
async function installUpdate() {
  try {
    // 설치 시작
    sendStatusToWindows('install-started', { status: 'installing' });

    // quitAndInstall 호출 (isSilent, isForceRunAfter 옵션 사용 가능)
    // macOS에서는 앱이 종료되고 자동으로 새 버전이 설치됨
    logger.info('업데이트를 설치하기 위해 앱을 종료합니다...');
    autoUpdater.quitAndInstall(false, true);

    return {
      success: true
    };
  } catch (error) {
    logger.error('업데이트 설치 오류:', error.toString());

    sendStatusToWindows('update-error', {
      status: 'error',
      error: error.toString()
    });

    return {
      success: false,
      error: error.toString()
    };
  }
}


/**
 * 모든 창에 상태 업데이트 전송
 * @param {string} channel - 이벤트 채널 이름
 * @param {Object} data - 상태 데이터
 */
function sendStatusToWindows(channel, data) {
  // 토스트 창에 이벤트 전송
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, data);
  }

  // 설정 창에 이벤트 전송
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.webContents.send(channel, data);
  }
}

module.exports = {
  initAutoUpdater,
  checkForUpdates,
  downloadUpdate,
  installUpdate
};
