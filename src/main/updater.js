/**
 * Toast - Auto Update Manager (Improved)
 *
 * This module handles automatic updates using electron-updater.
 * Improvement includes better error handling, more detailed logging,
 * and enhanced update workflow.
 */

const { app, dialog } = require('electron');
const { autoUpdater } = require('electron-updater');
const { createLogger } = require('./logger');
const path = require('path');
const fs = require('fs');

// 모듈별 로거 생성
const logger = createLogger('Updater');

// 자동 업데이트 상태와 창 참조를 저장하는 변수들
let mainWindow = null;
let settingsWindow = null;
let updateCheckInProgress = false;
let updateDownloadInProgress = false;
let lastCheckTime = 0;
let updateConfig = null;

/**
 * 자동 업데이트 초기화
 * @param {Object} windows - 애플리케이션 창 객체
 */
function initAutoUpdater(windows) {
  // 창 레퍼런스 저장
  mainWindow = windows.toast;
  settingsWindow = windows.settings;

  // 로깅 설정
  configureLogging();

  // 업데이터 설정
  configureUpdater();

  // 업데이트 이벤트 핸들러 등록
  setupAutoUpdaterEvents();

  // 설정 파일 확인
  validateUpdateConfig();

  // 시작 시 업데이트 확인 (개발 환경에서는 실행하지 않음)
  scheduleUpdateCheck();

  return {
    checkForUpdates,
    downloadUpdate,
    installUpdate,
    getLastCheckTime: () => lastCheckTime,
    isUpdateCheckInProgress: () => updateCheckInProgress,
    isUpdateDownloadInProgress: () => updateDownloadInProgress,
  };
}

/**
 * 로깅 설정
 */
function configureLogging() {
  // autoUpdater에 로깅 함수 연결
  autoUpdater.logger = logger;

  // 시작 로그 기록
  logger.info('Auto update module initializing...');
  logger.info(`App version: ${app.getVersion()}`);
  logger.info(`Running in ${process.env.NODE_ENV || 'production'} mode`);
  logger.info(`Platform: ${process.platform} (${process.arch})`);
}

/**
 * 업데이터 설정
 */
function configureUpdater() {
  // 앱 ID 명시적으로 설정
  autoUpdater.appId = 'com.opspresso.toast-app';
  logger.info(`Using appId: ${autoUpdater.appId}`);

  // 개발 환경에서도 업데이트 확인 가능하도록 설정
  autoUpdater.forceDevUpdateConfig = true;

  // 다운그레이드 허용 (개발 중 테스트 용도)
  autoUpdater.allowDowngrade = process.env.NODE_ENV === 'development';

  // 프리릴리스 버전 허용 (개발 환경에서만)
  autoUpdater.allowPrerelease = process.env.NODE_ENV === 'development';

  // 자동 다운로드 비활성화 (사용자 확인 후 다운로드)
  autoUpdater.autoDownload = false;

  // 앱 종료 시 자동 설치 활성화
  autoUpdater.autoInstallOnAppQuit = true;

  // 업데이트 채널 설정
  autoUpdater.channel = 'latest';

  // 로깅 추가
  logger.info(`Update cache directory: ${app.getPath('userData')}/toast-app-updater`);
  logger.info(`Full app path: ${app.getAppPath()}`);
}

/**
 * 업데이트 설정 파일 검증
 */
function validateUpdateConfig() {
  try {
    // 릴리즈 모드일 때는 app-update.yml 파일 확인
    if (app.isPackaged) {
      const updateConfigPath = path.join(app.getAppPath(), 'app-update.yml');
      logger.info(`updateConfigPath: ${updateConfigPath}`);
      if (fs.existsSync(updateConfigPath)) {
        updateConfig = require('yaml').parse(fs.readFileSync(updateConfigPath, 'utf8'));
        logger.info('Found app-update.yml configuration:', JSON.stringify(updateConfig));
      }
      else {
        logger.warn('app-update.yml not found in packaged app');
      }
    }
    else {
      // 개발 모드일 때는 dev-app-update.yml 파일 확인
      const devUpdateConfigPath = path.join(process.cwd(), 'dev-app-update.yml');
      logger.info(`devUpdateConfigPath: ${devUpdateConfigPath}`);
      if (fs.existsSync(devUpdateConfigPath)) {
        updateConfig = require('yaml').parse(fs.readFileSync(devUpdateConfigPath, 'utf8'));
        logger.info('Found dev-app-update.yml configuration:', JSON.stringify(updateConfig));
      }
      else {
        logger.warn('dev-app-update.yml not found in development mode');
      }
    }

    // 필수 설정 필드 확인
    if (updateConfig) {
      const requiredFields = ['provider', 'owner', 'repo'];
      const missingFields = requiredFields.filter(field => !updateConfig[field]);

      if (missingFields.length > 0) {
        logger.warn(`Update configuration missing required fields: ${missingFields.join(', ')}`);
      }
    }
  }
  catch (error) {
    logger.error('Error validating update configuration:', error.toString());
  }
}

/**
 * 시작 시 업데이트 확인 예약
 */
function scheduleUpdateCheck() {
  if (process.env.NODE_ENV !== 'development') {
    // 앱이 시작되고 몇 초 후에 업데이트 확인 (초기화 시간 확보)
    logger.info('Scheduling initial update check in 5 seconds');
    setTimeout(() => {
      checkForUpdates(true); // silent 모드로 시작 시 자동 확인
    }, 5000);
  }
  else {
    logger.info('Skipping automatic update check in development mode');
  }
}

/**
 * 자동 업데이트 이벤트 설정
 */
function setupAutoUpdaterEvents() {
  // 업데이트 확인 시작
  autoUpdater.on('checking-for-update', () => {
    logger.info('Checking for updates...');
    updateCheckInProgress = true;
    sendStatusToWindows('checking-for-update', { status: 'checking' });
  });

  // 업데이트 사용 가능
  autoUpdater.on('update-available', info => {
    logger.info(`Update available: version ${info.version}`);
    updateCheckInProgress = false;
    lastCheckTime = Date.now();

    sendStatusToWindows('update-available', {
      status: 'available',
      info: {
        version: info.version,
        releaseDate: info.releaseDate,
        releaseNotes: info.releaseNotes,
        files: info.files?.map(f => ({ name: f.name, size: f.size })) || [],
        path: info.path,
      },
    });
  });

  // 업데이트 없음
  autoUpdater.on('update-not-available', info => {
    logger.info(`No updates available (latest: ${info.version || 'unknown'})`);
    updateCheckInProgress = false;
    lastCheckTime = Date.now();

    sendStatusToWindows('update-not-available', {
      status: 'not-available',
      info: {
        version: info.version,
        releaseDate: info.releaseDate,
        currentVersion: app.getVersion(),
      },
    });
  });

  // 업데이트 다운로드 진행 상황
  autoUpdater.on('download-progress', progressObj => {
    const logMessage =
      `Download progress: ${Math.round(progressObj.percent)}% ` +
      `(${formatBytes(progressObj.transferred)}/${formatBytes(progressObj.total)}) ` +
      `@ ${formatBytes(progressObj.bytesPerSecond)}/s`;

    logger.info(logMessage);

    sendStatusToWindows('download-progress', {
      status: 'downloading',
      progress: {
        percent: progressObj.percent,
        bytesPerSecond: progressObj.bytesPerSecond,
        transferred: progressObj.transferred,
        total: progressObj.total,
        formattedPercent: `${Math.round(progressObj.percent)}%`,
        formattedTransferred: formatBytes(progressObj.transferred),
        formattedTotal: formatBytes(progressObj.total),
        formattedSpeed: `${formatBytes(progressObj.bytesPerSecond)}/s`,
      },
    });
  });

  // 업데이트 다운로드 완료
  autoUpdater.on('update-downloaded', info => {
    logger.info(`Update downloaded: ${info.version}`);
    updateDownloadInProgress = false;

    sendStatusToWindows('update-downloaded', {
      status: 'downloaded',
      info: {
        version: info.version,
        releaseDate: info.releaseDate,
        releaseNotes: info.releaseNotes,
        files: info.files?.map(f => ({ name: f.name, size: f.size })) || [],
        path: info.path,
      },
    });

    // 선택적으로 설치 여부를 사용자에게 물어볼 수 있음
    if (process.env.AUTO_INSTALL_UPDATES === 'true') {
      logger.info('Auto-install is enabled, prompting user to restart and install');
      promptUserToInstall(info.version);
    }
  });

  // 업데이트 오류
  autoUpdater.on('error', err => {
    logger.error('Update error:', err.toString());

    if (err.stack) {
      logger.error('Error stack:', err.stack);
    }

    if (err.code) {
      logger.error('Error code:', err.code);
    }

    updateCheckInProgress = false;
    updateDownloadInProgress = false;

    // 특정 오류 코드에 대한 사용자 친화적인 메시지 생성
    let userFriendlyMessage = err.message;
    if (err.code === 'ERR_UPDATER_NO_PUBLISHED_VERSIONS') {
      userFriendlyMessage = '현재 릴리스된 업데이트가 없습니다. 나중에 다시 확인해주세요.';
      logger.info('Providing user-friendly message for no published versions error');
    }

    sendStatusToWindows('update-error', {
      status: 'error',
      error: err.toString(),
      code: err.code,
      details: userFriendlyMessage,
    });
  });
}

/**
 * 사용자에게 업데이트 설치 여부 확인
 * @param {string} version - 설치할 업데이트 버전
 */
function promptUserToInstall(version) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    dialog
      .showMessageBox(mainWindow, {
        type: 'info',
        title: '업데이트 준비 완료',
        message: `Toast 앱 버전 ${version}이(가) 다운로드되었습니다.`,
        detail: '앱을 재시작하여 업데이트를 설치하시겠습니까?',
        buttons: ['지금 재시작', '나중에'],
        defaultId: 0,
        cancelId: 1,
      })
      .then(result => {
        if (result.response === 0) {
          logger.info('User confirmed update installation');
          installUpdate();
        }
        else {
          logger.info('User postponed update installation');
        }
      })
      .catch(err => {
        logger.error('Error showing update dialog:', err.toString());
      });
  }
}

/**
 * 업데이트 확인
 * @param {boolean} silent - 사용자에게 알림 없이 조용히 확인 (기본값: false)
 * @returns {Promise} 결과 객체
 */
async function checkForUpdates(silent = false) {
  // 이미 진행 중인 확인이 있으면 중복 방지
  if (updateCheckInProgress) {
    logger.info('Update check already in progress, skipping');
    return {
      success: false,
      error: 'Update check already in progress',
      versionInfo: {
        current: app.getVersion(),
      },
    };
  }

  try {
    updateCheckInProgress = true;

    if (!silent) {
      sendStatusToWindows('checking-for-update', { status: 'checking' });
    }

    // electron-updater로 업데이트 확인
    logger.info('Checking for updates via electron-updater');
    const result = await autoUpdater.checkForUpdates();

    if (result && result.updateInfo) {
      const currentVersion = app.getVersion();
      const latestVersion = result.updateInfo.version;

      logger.info(`Update check result: Current version ${currentVersion}, Latest version ${latestVersion}`);

      // 버전 비교 로직 강화
      const hasUpdate = compareVersions(latestVersion, currentVersion) > 0;

      if (hasUpdate) {
        logger.info(`Update is available (${currentVersion} → ${latestVersion})`);
      }
      else {
        logger.info(`No update needed, current version is ${currentVersion}`);
      }

      return {
        success: true,
        updateInfo: result.updateInfo,
        versionInfo: {
          current: currentVersion,
          latest: latestVersion,
        },
        hasUpdate,
        files: result.updateInfo.files,
      };
    }
    else {
      // 업데이트 정보가 없는 경우
      logger.info('Update information not found');

      if (!silent) {
        sendStatusToWindows('update-not-available', {
          status: 'not-available',
          info: {
            version: app.getVersion(),
          },
        });
      }

      return {
        success: false,
        error: 'Update information not found',
        versionInfo: {
          current: app.getVersion(),
          latest: null,
        },
        hasUpdate: false,
      };
    }
  }
  catch (error) {
    logger.error('Update check error:', error.toString());

    // 오류 알림 (silent 모드가 아닌 경우에만)
    if (!silent) {
      sendStatusToWindows('update-error', {
        status: 'error',
        error: error.toString(),
      });
    }

    return {
      success: false,
      error: error.toString(),
      versionInfo: {
        current: app.getVersion(),
        latest: null,
      },
    };
  }
  finally {
    updateCheckInProgress = false;
    lastCheckTime = Date.now();
  }
}

/**
 * 업데이트 다운로드
 * @returns {Promise} 결과 객체
 */
async function downloadUpdate() {
  // 이미 다운로드 중인 경우 중복 방지
  if (updateDownloadInProgress) {
    logger.info('Update download already in progress, skipping');
    return {
      success: false,
      error: 'Update download already in progress',
    };
  }

  try {
    updateDownloadInProgress = true;

    // 다운로드 시작
    sendStatusToWindows('download-started', { status: 'downloading' });

    // 현재 업데이트 가능 상태인지 확인
    let updateCheckResult;

    try {
      // 먼저 업데이트 정보 확인
      logger.info('Verifying update information before download');
      updateCheckResult = await autoUpdater.checkForUpdates();

      if (!updateCheckResult || !updateCheckResult.updateInfo) {
        throw new Error('Cannot verify update information');
      }

      const currentVersion = app.getVersion();
      const updateVersion = updateCheckResult.updateInfo.version;

      // 버전 비교 - 현재 버전과 같거나 낮은 버전이면 경고
      if (compareVersions(updateVersion, currentVersion) <= 0 && process.env.NODE_ENV !== 'development') {
        logger.warn(`Warning: Update version (${updateVersion}) is not newer than current version (${currentVersion})`);
      }
    }
    catch (checkError) {
      logger.error('Error verifying update before download:', checkError.toString());
      throw new Error(`Update verification failed: ${checkError.message}`);
    }

    // 최신 버전 정보 로깅
    logger.info(`Update information confirmed: Version ${updateCheckResult.updateInfo.version}`);
    logger.info(`Files to download: ${JSON.stringify(updateCheckResult.updateInfo.files)}`);

    // 다운로드 시작 전 잠시 대기 (타이밍 문제 방지)
    await new Promise(resolve => setTimeout(resolve, 500));

    // 다운로드 정보 로깅 - electron-updater 버전 6에서는 downloadUpdateInfo 함수가 지원되지 않음
    logger.info('Preparing to download update package');

    // 업데이트 다운로드 시작
    logger.info('Starting update download');
    logger.info(`Download target app ID: ${autoUpdater.appId}`);
    logger.info(`Download cache directory: ${app.getPath('userData')}/toast-app-updater`);

    try {
      // 실제 다운로드 수행
      await autoUpdater.downloadUpdate();
      logger.info('Update download completed successfully');
    }
    catch (downloadError) {
      // 다운로드 중 오류 발생 시 상세 정보 로깅
      logger.error(`Download error: ${downloadError.toString()}`);

      if (downloadError.stack) {
        logger.error(`Error stack: ${downloadError.stack}`);
      }

      if (downloadError.code) {
        logger.error(`Error code: ${downloadError.code}`);
      }

      throw downloadError;
    }

    return {
      success: true,
      message: 'Update download completed successfully',
      version: updateCheckResult.updateInfo.version,
    };
  }
  catch (error) {
    logger.error('Update download error:', error.toString());

    sendStatusToWindows('update-error', {
      status: 'error',
      error: error.toString(),
    });

    return {
      success: false,
      error: error.toString(),
    };
  }
  finally {
    // 다운로드 상태 갱신
    if (!autoUpdater.isUpdaterActive()) {
      updateDownloadInProgress = false;
    }
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

    // 업데이트가 다운로드되었는지 확인
    if (!autoUpdater.isUpdateDownloaded()) {
      logger.warn('Attempting to install update, but no update is downloaded');

      // 사용자에게 메시지 표시
      sendStatusToWindows('update-error', {
        status: 'error',
        error: 'No update has been downloaded to install',
      });

      return {
        success: false,
        error: 'No update has been downloaded to install',
      };
    }

    // quitAndInstall 호출 전에 모든 창에 종료 알림
    sendStatusToWindows('app-closing', {
      status: 'closing',
      message: 'Application is closing to install update',
    });

    // 짧은 딜레이 후 설치 (UI 메시지가 표시될 시간 확보)
    await new Promise(resolve => setTimeout(resolve, 1000));

    // quitAndInstall 호출 (isSilent, isForceRunAfter 옵션 사용 가능)
    // macOS에서는 앱이 종료되고 자동으로 새 버전이 설치됨
    logger.info('Closing app to install update...');

    // isSilent: false - 사용자에게 종료 알림 표시
    // isForceRunAfter: true - 설치 후 앱을 자동으로 재시작
    autoUpdater.quitAndInstall(false, true);

    return {
      success: true,
    };
  }
  catch (error) {
    logger.error('Update installation error:', error.toString());

    sendStatusToWindows('update-error', {
      status: 'error',
      error: error.toString(),
    });

    return {
      success: false,
      error: error.toString(),
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

  // 모든 이벤트 로깅 (디버깅 용도)
  logger.debug(`Sent event to windows: ${channel}`, data);
}

/**
 * 바이트 단위를 읽기 쉬운 형식으로 변환
 * @param {number} bytes - 바이트 수
 * @returns {string} 변환된 문자열 (예: 1.5 MB)
 */
function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) {
    return '0 Bytes';
  }

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * 의미론적 버전 비교
 * @param {string} v1 - 버전 1
 * @param {string} v2 - 버전 2
 * @returns {number} v1 > v2이면 1, v1 < v2이면 -1, 같으면 0
 */
function compareVersions(v1, v2) {
  const v1Parts = v1.split('.').map(Number);
  const v2Parts = v2.split('.').map(Number);

  for (let i = 0; i < Math.max(v1Parts.length, v2Parts.length); i++) {
    const v1Part = v1Parts[i] || 0;
    const v2Part = v2Parts[i] || 0;

    if (v1Part > v2Part) {
      return 1;
    }
    if (v1Part < v2Part) {
      return -1;
    }
  }

  return 0;
}

// 모듈 내보내기
module.exports = {
  initAutoUpdater,
  checkForUpdates,
  downloadUpdate,
  installUpdate,
};
