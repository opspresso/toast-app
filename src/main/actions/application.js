/**
 * Toast - Application Action
 *
 * This module handles the execution of application actions.
 */

const { exec } = require('child_process');
const { shell } = require('electron');
const path = require('path');
const fs = require('fs');

/**
 * Execute an application
 * @param {Object} action - Action configuration
 * @param {string} action.applicationPath - Path to the application to execute
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
        message: `Application not found at ${action.applicationPath}`
      };
    }

    let command;

    // Platform-specific command to open application
    if (process.platform === 'darwin') {
      // macOS: Use the 'open' command
      command = `open "${action.applicationPath}"`;
    } else if (process.platform === 'win32') {
      // Windows: Just use the path directly, wrapped in quotes
      command = `"${action.applicationPath}"`;
    } else {
      // Linux: Use xdg-open
      command = `xdg-open "${action.applicationPath}"`;
    }

    // Execute the command
    return new Promise((resolve, reject) => {
      exec(command, (error) => {
        if (error) {
          reject({
            success: false,
            message: `Error executing application: ${error.message}`,
            error: error
          });
          return;
        }

        resolve({
          success: true,
          message: 'Application launched successfully'
        });
      });
    });
  } catch (error) {
    return {
      success: false,
      message: `Error launching application: ${error.message}`,
      error: error
    };
  }
}

module.exports = {
  executeApplication
};
