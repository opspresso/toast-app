/**
 * Toast - Updater IPC Handlers
 *
 * Handlers for checking, downloading, and installing application updates.
 */

const { ipcMain } = require('electron');
const updater = require('../updater');
const { createLogger } = require('../logger');

const logger = createLogger('IPC');

/**
 * Set up updater IPC handlers
 */
function setupUpdaterHandlers() {
  // 업데이트 확인 - electron-updater 사용
  ipcMain.handle('check-latest-version', async () => {
    logger.info('IPC: check-latest-version called');
    // 대신 updater.js의 checkForUpdates를 직접 사용 (silent=false로 설정)
    return await updater.checkForUpdates(false);
  });

  // check-for-updates 핸들러 추가 (electron-updater와 함께 사용)
  ipcMain.handle('check-for-updates', async (event, silent = false) => {
    logger.info('IPC: check-for-updates called, silent:', silent);
    return await updater.checkForUpdates(silent);
  });

  // Download application update - electron-updater 사용
  ipcMain.handle('download-update', async () => {
    logger.info('IPC: download-update called');
    // 대신 updater.js의 downloadUpdate를 직접 사용
    return await updater.downloadUpdate();
  });

  // 자동 업데이트 다운로드 핸들러 추가
  ipcMain.handle('download-auto-update', async () => {
    logger.info('IPC: download-auto-update called');

    try {
      // 먼저 업데이트 확인 (silent=true로 설정하여 UI에 알림 표시 안 함)
      const checkResult = await updater.checkForUpdates(true);

      if (!checkResult || !checkResult.success) {
        logger.warn('업데이트 확인 실패, 다운로드를 진행할 수 없습니다:', checkResult?.error || '알 수 없는 오류');
        return {
          success: false,
          error: checkResult?.error || '업데이트 확인에 실패했습니다. 잠시 후 다시 시도해 주세요.',
        };
      }

      if (!checkResult.hasUpdate) {
        logger.info('이미 최신 버전을 사용 중입니다. 다운로드할 업데이트가 없습니다.');
        return {
          success: false,
          error: '이미 최신 버전을 사용 중입니다.',
        };
      }

      // 업데이트가 확인되면 다운로드 진행
      return await updater.downloadUpdate();
    }
    catch (error) {
      logger.error('자동 업데이트 다운로드 중 오류 발생:', error);
      return {
        success: false,
        error: `자동 업데이트 다운로드 중 오류가 발생했습니다: ${error.message || error}`,
      };
    }
  });

  // 수동 업데이트 다운로드 핸들러 추가 (이전 버전과의 호환성을 위해)
  ipcMain.handle('download-manual-update', async () => {
    logger.info('IPC: download-manual-update called');

    try {
      // 먼저 업데이트 확인 (silent=false로 설정하여 UI에 알림 표시)
      const checkResult = await updater.checkForUpdates(false);

      if (!checkResult || !checkResult.success) {
        logger.warn('업데이트 확인 실패, 다운로드를 진행할 수 없습니다:', checkResult?.error || '알 수 없는 오류');
        return {
          success: false,
          error: checkResult?.error || '업데이트 확인에 실패했습니다. 잠시 후 다시 시도해 주세요.',
        };
      }

      if (!checkResult.hasUpdate) {
        logger.info('이미 최신 버전을 사용 중입니다. 다운로드할 업데이트가 없습니다.');
        return {
          success: false,
          error: '이미 최신 버전을 사용 중입니다.',
        };
      }

      // 업데이트가 확인되면 다운로드 진행
      return await updater.downloadUpdate();
    }
    catch (error) {
      logger.error('수동 업데이트 다운로드 중 오류 발생:', error);
      return {
        success: false,
        error: `수동 업데이트 다운로드 중 오류가 발생했습니다: ${error.message || error}`,
      };
    }
  });

  // Install application update - electron-updater 사용
  ipcMain.handle('install-update', async () => {
    logger.info('IPC: install-update called');
    // 대신 updater.js의 installUpdate를 직접 사용
    return await updater.installUpdate();
  });

  // 자동 업데이트 설치 핸들러 추가
  ipcMain.handle('install-auto-update', async () => {
    logger.info('IPC: install-auto-update called');
    return await updater.installUpdate();
  });
}

module.exports = {
  setupUpdaterHandlers,
};
