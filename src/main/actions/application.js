/**
 * Toast - Application Action
 *
 * This module handles the execution of application actions.
 */

const { execFile } = require('child_process');
const fs = require('fs');

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
  const pattern = /"([^"]*)"|'([^']*)'|(\S+)/g;
  let match;
  while ((match = pattern.exec(raw)) !== null) {
    args.push(match[1] ?? match[2] ?? match[3]);
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
    if (!fs.existsSync(action.applicationPath)) {
      return {
        success: false,
        message: `Application not found at ${action.applicationPath}`,
      };
    }

    const params = parseParameters(action.applicationParameters);

    // Build launcher + argv per platform. Arguments are passed as an array
    // (execFile spawns no shell) so metacharacters in applicationParameters are
    // never re-interpreted — closing the command-injection path that string
    // concatenation into exec() would open, especially for cloud-synced actions.
    let file;
    let args;

    if (process.platform === 'darwin') {
      // macOS: `open` launches the app bundle; extra params follow the path.
      file = 'open';
      args = params.length > 0 ? ['-a', action.applicationPath, ...params] : [action.applicationPath];
    }
    else if (process.platform === 'win32') {
      // Windows: run the executable directly with its arguments.
      file = action.applicationPath;
      args = params;
    }
    else if (params.length > 0) {
      // Linux with params: run the executable directly with its arguments.
      file = action.applicationPath;
      args = params;
    }
    else {
      // Linux without params: hand off to the desktop opener.
      file = 'xdg-open';
      args = [action.applicationPath];
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
