/**
 * Toast - 자동 업데이트 관리
 *
 * 이 모듈은 electron-updater를 사용하여 앱의 자동 업데이트를 처리합니다.
 */

const { app, BrowserWindow, ipcMain } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');

// 로깅 설정
autoUpdater.logger = require('electron-log');
autoUpdater.logger.transports.file.level = 'info';

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

  // GitHub 릴리스에서 업데이트 확인하도록 설정
  autoUpdater.setFeedURL({
    provider: 'github',
    owner: 'opspresso',
    repo: 'toast-dist'
  });

  // 개발 환경에서도 업데이트 확인 가능하도록 설정
  autoUpdater.forceDevUpdateConfig = true;        // 개발 환경에서도 업데이트 확인 강제
  autoUpdater.allowDowngrade = true;              // 다운그레이드 허용
  autoUpdater.allowPrerelease = true;             // 프리릴리스 버전 허용

  // 오류 처리 이벤트 리스너 추가 - YML 파일 못 찾는 오류 특별 처리
  autoUpdater.addListener('error', (error) => {
    // GitHub YML 파일 못 찾는 오류(404)인 경우 로그만 남기고 자동으로 폴백 메커니즘 사용
    if (error.toString().includes('latest-mac.yml') ||
        error.toString().includes('latest-win.yml') ||
        error.toString().includes('latest-linux.yml') ||
        error.toString().includes('404')) {
      autoUpdater.logger.info('YML 파일을 찾을 수 없음 - 릴리스에 매니페스트 파일이 없습니다. 수동 업데이트 방식을 사용합니다.');
    } else {
      // 다른 오류는 정상적으로 전파
      autoUpdater.logger.error('업데이트 오류:', error);
    }
  });

  // versions.json 파일을 직접 사용하는 설정 (개발 환경용)
  if (process.env.NODE_ENV === 'development') {
    console.log('개발 환경에서 업데이트 확인 설정 구성');
    // 개발 환경일 때 autoUpdater 옵션 추가 설정
    autoUpdater.updateConfigPath = path.join(__dirname, '../main/dev-app-update.yml');
    autoUpdater.logger.info('개발 환경에서 업데이트 테스트 활성화');
  }

  // 자동 다운로드 비활성화 (사용자가 명시적으로 다운로드를 요청할 때만 다운로드)
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;

  // 로깅 설정 확장
  autoUpdater.logger.info('자동 업데이트 모듈 초기화됨');
  autoUpdater.logger.info(`현재 앱 버전: ${app.getVersion()}`);
  autoUpdater.logger.info(`업데이트 소스: GitHub 릴리스 (opspresso/toast-dist)`);

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
 * IPC 핸들러 설정
 */
function setupIpcHandlers() {
  // 업데이트 확인 요청
  ipcMain.handle('check-for-updates', (event, silent = false) => {
    return checkForUpdates(silent);
  });

  // 업데이트 다운로드 요청 (자동 또는 수동)
  ipcMain.handle('download-auto-update', () => {
    return downloadUpdate();
  });

  // 이전 버전과의 호환성을 위해 download-manual-update도 같은 함수로 처리
  ipcMain.handle('download-manual-update', () => {
    return downloadUpdate();
  });

  // 다운로드된 업데이트 설치 요청
  ipcMain.handle('install-auto-update', () => {
    return installUpdate();
  });
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

    try {
      // 먼저 electron-updater로 업데이트 확인 시도
      autoUpdater.logger.info('electron-updater를 통해 업데이트 확인');
      const result = await autoUpdater.checkForUpdates();

      if (result && result.updateInfo) {
        const currentVersion = app.getVersion();
        const latestVersion = result.updateInfo.version;

        autoUpdater.logger.info(`업데이트 확인 결과: 현재 버전 ${currentVersion}, 최신 버전 ${latestVersion}`);

        return {
          success: true,
          updateInfo: result.updateInfo,
          versionInfo: {
            current: currentVersion,
            latest: latestVersion
          },
          hasUpdate: result.updateInfo.version !== currentVersion
        };
      }

      // electron-updater 실패 시 manual 방식 사용
      autoUpdater.logger.info('electron-updater 실패, 수동 방식으로 전환');
    } catch (err) {
      // electron-updater 오류 시 manual 방식 사용
      // YML 파일 404 오류인 경우 정상적인 폴백으로 처리
      if (err.toString().includes('latest-mac.yml') ||
          err.toString().includes('latest-win.yml') ||
          err.toString().includes('latest-linux.yml') ||
          err.toString().includes('404')) {
        autoUpdater.logger.info('매니페스트 파일(YML) 없음 - 수동 업데이트 방식으로 전환');
      } else {
        autoUpdater.logger.warn('electron-updater 오류, 수동 방식으로 전환:', err.toString());
      }
    }

    // 개발 환경이나 패키지되지 않은 경우 직접 versions.json 확인
    autoUpdater.logger.info('직접 versions.json 확인');

    const https = require('https');
    const versionsJsonUrl = 'https://opspresso.github.io/toast-dist/versions.json';

    // 버전 정보 가져오기
    const fetchJson = (url) => {
      return new Promise((resolve, reject) => {
        https.get(url, (res) => {
          let data = '';
          res.on('data', (chunk) => {
            data += chunk;
          });
          res.on('end', () => {
            try {
              const jsonData = JSON.parse(data);
              resolve(jsonData);
            } catch (e) {
              reject(new Error(`Failed to parse JSON: ${e.message}`));
            }
          });
        }).on('error', (e) => {
          reject(new Error(`Request failed: ${e.message}`));
        });
      });
    };

    // 버전 비교 함수
    const compareSemver = (v1, v2) => {
      // Remove 'v' prefix if present
      v1 = v1.replace(/^v/, '');
      v2 = v2.replace(/^v/, '');

      // Split versions into components
      const v1Parts = v1.split('.');
      const v2Parts = v2.split('.');

      // Compare major.minor.patch
      for (let i = 0; i < Math.max(v1Parts.length, v2Parts.length); i++) {
        const v1Part = parseInt(v1Parts[i] || 0, 10);
        const v2Part = parseInt(v2Parts[i] || 0, 10);

        if (v1Part > v2Part) {
          return 1;  // v1 is newer
        } else if (v1Part < v2Part) {
          return -1; // v2 is newer
        }
      }
      return 0; // Same version
    };

    // versions.json 파일에서 직접 확인
    const versionData = await fetchJson(versionsJsonUrl);

    if (!versionData || !versionData.toast || !versionData.toast.version) {
      throw new Error('버전 정보를 찾을 수 없습니다.');
    }

    const currentVersion = app.getVersion();
    const latestVersion = versionData.toast.version;

    // 버전 비교
    const versionCompare = latestVersion !== 'unknown'
      ? compareSemver(latestVersion, currentVersion)
      : 0;

    autoUpdater.logger.info(`수동 업데이트 확인 결과: 현재 버전 ${currentVersion}, 최신 버전 ${latestVersion}, 비교 결과: ${versionCompare}`);

    // 업데이트 가능 여부 확인 (versionCompare > 0이면 업데이트 가능)
    const hasUpdate = versionCompare > 0;

    if (hasUpdate) {
      sendStatusToWindows('update-available', {
        status: 'available',
        info: {
          version: latestVersion,
          releaseDate: versionData.toast?.releaseDate || '',
          releaseNotes: versionData.toast?.description || ''
        }
      });
    } else {
      sendStatusToWindows('update-not-available', {
        status: 'not-available',
        info: {
          version: currentVersion
        }
      });
    }

    return {
      success: true,
      updateInfo: {
        version: latestVersion,
        releaseDate: versionData.toast?.releaseDate || '',
        releaseNotes: versionData.toast?.description || '',
        path: versionData.toast?.downloadUrl || {}
      },
      versionInfo: {
        current: currentVersion,
        latest: latestVersion
      },
      hasUpdate: hasUpdate,
      versionCompare: versionCompare
    };
  } catch (error) {
    console.error('업데이트 확인 오류:', error);

    // 오류 알림 (silent 모드가 아닌 경우에만)
    if (!silent) {
      sendStatusToWindows('update-error', {
        status: 'error',
        error: error.toString()
      });
    }

    return {
      success: false,
      error: error.toString()
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

    try {
      // 먼저 electron-updater로 다운로드 시도
      autoUpdater.logger.info('electron-updater를 통해 다운로드 시도');

      // 업데이트 확인 - 다운로드 전에 반드시 호출해야 함
      const updateCheckResult = await autoUpdater.checkForUpdates();

      if (updateCheckResult && updateCheckResult.updateInfo) {
        // 최신 버전 정보 로깅
        autoUpdater.logger.info(`업데이트 정보 확인됨: 버전 ${updateCheckResult.updateInfo.version}`);

        // 업데이트 다운로드 시작
        autoUpdater.logger.info('자동 업데이트 다운로드 시작');
        await autoUpdater.downloadUpdate();

        return {
          success: true,
          message: '업데이트 다운로드가 시작되었습니다.',
          version: updateCheckResult.updateInfo.version
        };
      }

      // electron-updater 실패 시 수동 다운로드로 전환
      autoUpdater.logger.info('electron-updater 실패, 수동 다운로드로 전환');
    } catch (err) {
      // electron-updater 오류 시 수동 다운로드로 전환
      autoUpdater.logger.warn('electron-updater 오류, 수동 다운로드로 전환:', err.toString());
    }

    // 개발 환경이나 패키지되지 않은 경우 직접 versions.json에서 URL 가져와서 브라우저로 열기
    autoUpdater.logger.info('수동 다운로드 방식으로 전환');

    const https = require('https');
    const { shell } = require('electron');
    const versionsJsonUrl = 'https://opspresso.github.io/toast-dist/versions.json';

    // JSON 파일에서 다운로드 URL 가져오기
    const fetchJson = (url) => {
      return new Promise((resolve, reject) => {
        https.get(url, (res) => {
          let data = '';
          res.on('data', (chunk) => {
            data += chunk;
          });
          res.on('end', () => {
            try {
              const jsonData = JSON.parse(data);
              resolve(jsonData);
            } catch (e) {
              reject(new Error(`Failed to parse JSON: ${e.message}`));
            }
          });
        }).on('error', (e) => {
          reject(new Error(`Request failed: ${e.message}`));
        });
      });
    };

    // 버전 데이터 가져오기
    const versionData = await fetchJson(versionsJsonUrl);

    if (!versionData.toast?.downloadUrl) {
      throw new Error('다운로드 URL을 찾을 수 없습니다');
    }

    // 플랫폼별 URL 가져오기
    let downloadUrl;
    switch (process.platform) {
      case 'darwin': // macOS
        downloadUrl = versionData.toast.downloadUrl.mac;
        break;
      case 'win32': // Windows
        downloadUrl = versionData.toast.downloadUrl.win;
        break;
      case 'linux': // Linux
        downloadUrl = versionData.toast.downloadUrl.linux;
        break;
      default:
        throw new Error(`지원되지 않는 플랫폼: ${process.platform}`);
    }

    if (!downloadUrl) {
      throw new Error(`현재 플랫폼(${process.platform})을 위한 다운로드가 없습니다`);
    }

    // 브라우저에서 URL 열기
    await shell.openExternal(downloadUrl);

    // 다운로드 성공 알림 전송
    sendStatusToWindows('update-downloaded', {
      status: 'downloaded',
      info: {
        version: versionData.toast.version,
        releaseDate: versionData.toast.releaseDate,
        releaseNotes: versionData.toast.description || '수동 다운로드 시작됨'
      }
    });

    // 결과 반환
    return {
      success: true,
      message: '브라우저에서 다운로드가 시작되었습니다',
      manualDownload: true,
      version: versionData.toast.version
    };
  } catch (error) {
    console.error('업데이트 다운로드 오류:', error);
    autoUpdater.logger.error('업데이트 다운로드 오류:', error.toString());

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
    autoUpdater.quitAndInstall(false, true);

    return {
      success: true
    };
  } catch (error) {
    console.error('업데이트 설치 오류:', error);

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
