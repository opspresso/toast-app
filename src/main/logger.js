/**
 * Toast - Central Logging Module
 *
 * This module provides consistent logging throughout the application using electron-log.
 */

const electronLog = require('electron-log');
const path = require('path');
const { app } = require('electron');

// Set log file path
let userDataPath;
try {
  userDataPath = app.getPath('userData');
}
catch (e) {
  // In case app is not ready yet
  userDataPath = path.join(process.env.HOME || process.env.USERPROFILE, '.toast-app');
}

// Log file configuration
electronLog.transports.file.resolvePathFn = () => path.join(userDataPath, 'logs/toast-app.log');

// Configure log rotation (max size, max files)
electronLog.transports.file.maxSize = 5 * 1024 * 1024; // 5MB
electronLog.transports.file.maxFiles = 5;

// Set log level
electronLog.transports.file.level = 'info';
electronLog.transports.console.level = process.env.NODE_ENV === 'development' ? 'debug' : 'info';

// Set log format
electronLog.transports.file.format = '{y}-{m}-{d} {h}:{i}:{s}:{ms} [{level}] {text}';
electronLog.transports.console.format = '{h}:{i}:{s}:{ms} [{level}] {text}';

// IPC logging function - Handle log requests received from the main process
function handleIpcLogging(level, message, ...args) {
  return electronLog[level](`[Renderer] ${message}`, ...args);
}

/**
 * Logger initialization function
 * @param {string} moduleName - Module name
 * @returns {Object} - Logger object
 */
function createLogger(moduleName) {
  return {
    info: (message, ...args) => electronLog.info(`[${moduleName}] ${message}`, ...args),
    warn: (message, ...args) => electronLog.warn(`[${moduleName}] ${message}`, ...args),
    error: (message, ...args) => electronLog.error(`[${moduleName}] ${message}`, ...args),
    debug: (message, ...args) => electronLog.debug(`[${moduleName}] ${message}`, ...args),
    verbose: (message, ...args) => electronLog.verbose(`[${moduleName}] ${message}`, ...args),
    silly: (message, ...args) => electronLog.silly(`[${moduleName}] ${message}`, ...args),

    // Direct access to original logger
    get raw() {
      return electronLog;
    },
  };
}

/**
 * Mask sensitive query parameters (token, code, state) in a URL before logging it.
 * @param {string} url
 * @returns {string} URL with token/code/state values replaced by '***'
 */
function maskAuthUrl(url) {
  if (typeof url !== 'string') {
    return url;
  }
  return url.replace(/([?&](?:token|code|state)=)[^&]+/g, '$1***');
}

/**
 * Mask an email address for logging: keep the first character and domain,
 * replace the rest of the local part with asterisks.
 * @param {string} email
 * @returns {string} e.g. "jane@example.com" -> "j***@example.com"
 */
function maskEmail(email) {
  if (typeof email !== 'string' || !email.includes('@')) {
    return email;
  }
  const [local, domain] = email.split('@');
  const maskedLocal = local.length <= 1 ? '*' : `${local[0]}***`;
  return `${maskedLocal}@${domain}`;
}

/**
 * Mask a display name for logging: keep the first character, replace the
 * rest with asterisks.
 * @param {string} name
 * @returns {string} e.g. "Jane Doe" -> "J***"
 */
function maskName(name) {
  if (typeof name !== 'string' || name.length === 0) {
    return name;
  }
  return name.length <= 1 ? '*' : `${name[0]}***`;
}

module.exports = {
  createLogger,
  handleIpcLogging,
  maskAuthUrl,
  maskEmail,
  maskName,
  electronLog,
};
