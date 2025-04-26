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
  } catch (error) {
    return {
      success: false,
      message: `Error opening item: ${error.message}`,
      error: error,
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
    // Validate URL format
    if (!url.match(/^https?:\/\//i) && !url.match(/^file:\/\//i)) {
      // Add http:// prefix if missing
      url = 'http://' + url;
    }

    // Open URL in default browser
    await shell.openExternal(url);

    return {
      success: true,
      message: `Opened URL: ${url}`,
    };
  } catch (error) {
    return {
      success: false,
      message: `Error opening URL: ${error.message}`,
      error: error,
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
  } catch (error) {
    return {
      success: false,
      message: `Error opening path: ${error.message}`,
      error: error,
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
    // Platform-specific commands
    let command;

    if (process.platform === 'darwin') {
      // macOS
      command = `open -a "${application}" "${filePath}"`;
    } else if (process.platform === 'win32') {
      // Windows
      command = `start "" "${application}" "${filePath}"`;
    } else {
      // Linux
      command = `${application} "${filePath}"`;
    }

    // Execute the command
    const { exec } = require('child_process');
    exec(command, error => {
      if (error) {
        return {
          success: false,
          message: `Error opening with application: ${error.message}`,
          error: error,
        };
      }
    });

    return {
      success: true,
      message: `Opened ${filePath} with ${application}`,
    };
  } catch (error) {
    return {
      success: false,
      message: `Error opening with application: ${error.message}`,
      error: error,
    };
  }
}

module.exports = {
  openItem,
};
