/**
 * Toast - 중앙 로깅 모듈
 *
 * 이 모듈은 electron-log를 사용하여 애플리케이션 전체에서 일관된 로깅을 제공합니다.
 */

const electronLog = require('electron-log');
const path = require('path');
const { app } = require('electron');

// 로그 파일 경로 설정
let userDataPath;
try {
  userDataPath = app.getPath('userData');
} catch (e) {
  // app이 아직 준비되지 않은 경우
  userDataPath = path.join(process.env.HOME || process.env.USERPROFILE, '.toast-app');
}

// 로그 파일 구성
electronLog.transports.file.resolvePath = () => path.join(userDataPath, 'logs/toast-app.log');

// 로그 회전 설정 (최대 사이즈, 최대 파일 수)
electronLog.transports.file.maxSize = 5 * 1024 * 1024; // 5MB
electronLog.transports.file.maxFiles = 5;

// 로그 레벨 설정
electronLog.transports.file.level = 'info';
electronLog.transports.console.level = process.env.NODE_ENV === 'development' ? 'debug' : 'info';

// 로그 포맷 설정
electronLog.transports.file.format = '{y}-{m}-{d} {h}:{i}:{s}:{ms} [{level}] {text}';
electronLog.transports.console.format = '{h}:{i}:{s}:{ms} [{level}] {text}';

// IPC 로깅 함수 - 메인 프로세스에서 받은 로그 요청을 처리
function handleIpcLogging(level, message, ...args) {
  return electronLog[level](`[Renderer] ${message}`, ...args);
}

/**
 * 로거 초기화 함수
 * @param {string} moduleName - 모듈 이름
 * @returns {Object} - 로거 객체
 */
function createLogger(moduleName) {
  return {
    info: (message, ...args) => electronLog.info(`[${moduleName}] ${message}`, ...args),
    warn: (message, ...args) => electronLog.warn(`[${moduleName}] ${message}`, ...args),
    error: (message, ...args) => electronLog.error(`[${moduleName}] ${message}`, ...args),
    debug: (message, ...args) => electronLog.debug(`[${moduleName}] ${message}`, ...args),
    verbose: (message, ...args) => electronLog.verbose(`[${moduleName}] ${message}`, ...args),
    silly: (message, ...args) => electronLog.silly(`[${moduleName}] ${message}`, ...args),

    // 원본 로거 직접 액세스
    get raw() {
      return electronLog;
    }
  };
}

module.exports = {
  createLogger,
  handleIpcLogging,
  electronLog,
};
