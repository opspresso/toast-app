/**
 * Toast - Environment Variables Loading Module
 *
 * This module loads environment variables from .env files.
 */

const path = require('path');
const dotenv = require('dotenv');
const fs = require('fs');
const { createLogger } = require('../logger');

// 모듈별 로거 생성
const logger = createLogger('EnvConfig');

/**
 * Loads environment variables.
 * Priority: .env.local (local development environment) > .env (default environment)
 */
function loadEnv() {
  try {
    const configDir = path.join(__dirname); // src/main/config directory

    // Load default .env file
    const defaultEnvPath = path.join(configDir, '.env');
    if (fs.existsSync(defaultEnvPath)) {
      dotenv.config({ path: defaultEnvPath });
      if (process.env.NODE_ENV !== 'test') {
        logger.info('Default environment variable settings loaded.');
      }
    }

    // Additionally load .env.local file if it exists (takes precedence)
    const localEnvPath = path.join(configDir, '.env.local');
    if (fs.existsSync(localEnvPath)) {
      dotenv.config({ path: localEnvPath });
      if (process.env.NODE_ENV !== 'test') {
        logger.info('Local environment variable settings loaded.');
      }
    }

    return true;
  }
  catch (error) {
    logger.error('Error loading environment variables:', error);
    return false;
  }
}

/**
 * Gets an environment variable value.
 * @param {string} key - Environment variable key
 * @param {string} defaultValue - Default value (if variable doesn't exist)
 * @returns {string} Environment variable value or default value
 */
function getEnv(key, defaultValue = '') {
  return process.env[key] || defaultValue;
}

module.exports = {
  loadEnv,
  getEnv,
};
