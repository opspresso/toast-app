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
} catch (e) {
  // In case app is not ready yet
  userDataPath = path.join(process.env.HOME || process.env.USERPROFILE, '.toast-app');
}

// Log file configuration
electronLog.transports.file.resolvePath = () => path.join(userDataPath, 'logs/toast-app.log');

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
    }
  };
}

module.exports = {
  createLogger,
  handleIpcLogging,
  electronLog,
};
