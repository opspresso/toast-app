/**
 * Toast - Open Action
 *
 * This module handles opening URLs, files, and folders.
 */

const { shell } = require('electron');
const fs = require('fs');
const path = require('path');

/**
 * Open a URL, file, or folder
 * @param {Object} action - Action configuration
 * @param {string} [action.url] - URL to open
 * @param {string} [action.path] - File or folder path to open
 * @param {string} [action.application] - Application to use for opening
 * @returns {Promise<Object>} Result object
 */
async function openItem(action) {
  try {
    // Validate parameters
    if (!action.url && !action.path) {
      return { success: false, message: 'URL or path is required' };
    }

    // Open URL
    if (action.url) {
      return openUrl(action.url);
    }

    // Open file or folder
    return openPath(action.path, action.application);
  }
  catch (error) {
    return {
      success: false,
      message: `Error opening item: ${error.message}`,
      error,
    };
  }
}

/**
 * Open a URL in the default browser
 * @param {string} url - URL to open
 * @returns {Promise<Object>} Result object
 */
async function openUrl(url) {
  try {
    // Validate URL format - check if URL already has any protocol
    if (!url.match(/^[a-zA-Z0-9.+-]+:\/\//i)) {
      // Add http:// prefix only if no protocol is present
      url = 'http://' + url;
    }

    // file:// grants local filesystem access equivalent to the dedicated `path`
    // field, but without its resolve()/existsSync() checks. Local files must go
    // through openPath() instead, so reject it here.
    if (/^file:/i.test(url)) {
      return {
        success: false,
        message: 'file:// URLs are not allowed; use the path field to open local files',
      };
    }

    // Open URL in default browser
    await shell.openExternal(url);

    return {
      success: true,
      message: `Opened URL: ${url}`,
    };
  }
  catch (error) {
    return {
      success: false,
      message: `Error opening URL: ${error.message}`,
      error,
    };
  }
}

/**
 * Open a file or folder
 * @param {string} itemPath - Path to file or folder
 * @param {string} [application] - Application to use for opening
 * @returns {Promise<Object>} Result object
 */
async function openPath(itemPath, application) {
  try {
    // Resolve path to absolute
    const resolvedPath = path.resolve(itemPath);

    // Check if path exists
    if (!fs.existsSync(resolvedPath)) {
      return {
        success: false,
        message: `Path does not exist: ${resolvedPath}`,
      };
    }

    // If application is specified, use it to open the file
    if (application) {
      return openWithApplication(resolvedPath, application);
    }

    // Open with default application
    await shell.openPath(resolvedPath);

    return {
      success: true,
      message: `Opened: ${resolvedPath}`,
    };
  }
  catch (error) {
    return {
      success: false,
      message: `Error opening path: ${error.message}`,
      error,
    };
  }
}

/**
 * Open a file with a specific application
 * @param {string} filePath - Path to file
 * @param {string} application - Application to use
 * @returns {Promise<Object>} Result object
 */
async function openWithApplication(filePath, application) {
  try {
    // Platform-specific launcher invocations.
    // Arguments are passed as an array (no shell) to prevent command injection.
    let file;
    let args;

    if (process.platform === 'darwin') {
      // macOS
      file = 'open';
      args = ['-a', application, filePath];
    }
    else {
      // Windows / Linux: launch the application executable directly with the file as an argument.
      // execFile spawns no shell, so metacharacters in `application` are never re-parsed
      // (unlike `cmd.exe /c start`, which would re-interpret them and allow command injection).
      file = application;
      args = [filePath];
    }

    const { execFile } = require('child_process');
    await new Promise((resolve, reject) => {
      execFile(file, args, error => {
        if (error) {
          reject(error);
        }
        else {
          resolve();
        }
      });
    });

    return {
      success: true,
      message: `Opened ${filePath} with ${application}`,
    };
  }
  catch (error) {
    return {
      success: false,
      message: `Error opening with application: ${error.message}`,
      error,
    };
  }
}

module.exports = {
  openItem,
};
