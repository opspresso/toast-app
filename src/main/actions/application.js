/**
 * Toast - Application Action
 *
 * This module handles the execution of application actions.
 */

const { execFile } = require('child_process');
const fs = require('fs');
const { expandTilde } = require('../utils/expand-tilde');

/**
 * Split an application-parameters string into an argv array.
 * Honors single and double quotes so arguments with spaces survive intact,
 * without ever going through a shell (no metacharacter interpretation).
 * @param {string} raw - Raw applicationParameters string
 * @returns {string[]} Parsed argument list
 */
function parseParameters(raw) {
  if (!raw || typeof raw !== 'string') {
    return [];
  }

  const args = [];
  let value = '';
  let quote = null;
  let started = false;
  for (let index = 0; index < raw.length; index++) {
    const char = raw[index];
    if (char === '\\' && raw[index + 1] === '"' && quote === '"') {
      value += raw[++index];
    }
    else if (quote) {
      if (char === quote) {
        quote = null;
      }
      else {
        value += char;
      }
    }
    else if (char === '"' || char === "'") {
      quote = char;
      started = true;
    }
    else if (/\s/.test(char)) {
      if (started) {
        args.push(expandTilde(value));
        value = '';
        started = false;
      }
    }
    else {
      value += char;
      started = true;
    }
  }
  if (quote) {
    throw new Error('Unclosed quote in application parameters');
  }
  if (started) {
    args.push(expandTilde(value));
  }
  return args;
}

/**
 * Execute an application
 * @param {Object} action - Action configuration
 * @param {string} action.applicationPath - Path to the application to execute
 * @param {string} [action.applicationParameters] - Extra launch arguments
 * @returns {Promise<Object>} Result object
 */
async function executeApplication(action) {
  try {
    // Validate required parameters
    if (!action.applicationPath) {
      return { success: false, message: 'Application path is required' };
    }

    // Check if the application exists
    const applicationPath = expandTilde(action.applicationPath);
    if (!fs.existsSync(applicationPath)) {
      return {
        success: false,
        message: `Application not found at ${applicationPath}`,
      };
    }

    const params = parseParameters(action.applicationParameters);

    // Preserve argv boundaries without adding shell interpretation. The selected
    // executable can itself be an interpreter; argv does not limit its capabilities.
    let file;
    let args;

    if (process.platform === 'darwin') {
      // --args separates application arguments from LaunchServices options.
      file = 'open';
      args = ['-a', applicationPath, ...(params.length ? ['--args', ...params] : [])];
    }
    else {
      file = applicationPath;
      args = params;
    }

    // Execute the command
    return new Promise(resolve => {
      execFile(file, args, error => {
        if (error) {
          resolve({
            success: false,
            message: `Error executing application: ${error.message}`,
            error,
          });
          return;
        }

        resolve({
          success: true,
          message: 'Application launched successfully',
        });
      });
    });
  }
  catch (error) {
    return {
      success: false,
      message: `Error launching application: ${error.message}`,
      error,
    };
  }
}

module.exports = {
  executeApplication,
};
