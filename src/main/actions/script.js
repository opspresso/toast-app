/**
 * Toast - Script Action
 *
 * This module handles executing custom scripts in various languages.
 */

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { app } = require('electron');
const vm = require('vm');
const { createLogger } = require('../logger');

// 모듈별 로거 생성
const logger = createLogger('ScriptAction');

/**
 * Execute a custom script
 * @param {Object} action - Action configuration
 * @param {string} action.script - Script content
 * @param {string} action.scriptType - Script language (javascript, applescript, powershell, bash)
 * @param {Object} [action.scriptParams] - Parameters to pass to the script
 * @returns {Promise<Object>} Result object
 */
async function executeScript(action) {
  try {
    // Validate required parameters
    if (!action.script) {
      return { success: false, message: 'Script content is required' };
    }

    if (!action.scriptType) {
      return { success: false, message: 'Script type is required' };
    }

    // Execute based on script type
    switch (action.scriptType.toLowerCase()) {
      case 'javascript':
        return executeJavaScript(action.script, action.scriptParams);
      case 'applescript':
        return executeAppleScript(action.script);
      case 'powershell':
        return executePowerShell(action.script);
      case 'bash':
        return executeBash(action.script);
      default:
        return {
          success: false,
          message: `Unsupported script type: ${action.scriptType}`,
        };
    }
  } catch (error) {
    return {
      success: false,
      message: `Error executing script: ${error.message}`,
      error,
    };
  }
}

/**
 * Execute JavaScript code
 * @param {string} script - JavaScript code
 * @param {Object} [params] - Parameters to pass to the script
 * @returns {Promise<Object>} Result object
 */
async function executeJavaScript(script, params = {}) {
  try {
    // Create a sandbox with limited context
    const sandbox = {
      console,
      require,
      process: {
        platform: process.platform,
        arch: process.arch,
        env: process.env,
      },
      params,
      result: null,
      setTimeout,
      clearTimeout,
      setInterval,
      clearInterval,
      Buffer,
      __dirname: app.getAppPath(),
      __filename: path.join(app.getAppPath(), 'script.js'),
    };

    // Create a context for the script
    const context = vm.createContext(sandbox);

    // Execute the script
    const scriptWithReturn = `
      try {
        ${script}
      } catch (error) {
        result = { success: false, message: error.message, error: error };
      }
    `;

    // Run the script in the sandbox
    vm.runInContext(scriptWithReturn, context);

    // Get the result
    if (sandbox.result) {
      return sandbox.result;
    }

    return {
      success: true,
      message: 'JavaScript executed successfully',
    };
  } catch (error) {
    return {
      success: false,
      message: `Error executing JavaScript: ${error.message}`,
      error,
    };
  }
}

/**
 * Execute AppleScript (macOS only)
 * @param {string} script - AppleScript code
 * @returns {Promise<Object>} Result object
 */
async function executeAppleScript(script) {
  // Check if running on macOS
  if (process.platform !== 'darwin') {
    return {
      success: false,
      message: 'AppleScript is only supported on macOS',
    };
  }

  try {
    // Create a temporary file for the script
    const tempFile = path.join(os.tmpdir(), `toast-applescript-${Date.now()}.scpt`);

    // Write the script to the file
    fs.writeFileSync(tempFile, script);

    // Execute the script
    return new Promise((resolve, reject) => {
      exec(`osascript "${tempFile}"`, (error, stdout, stderr) => {
        // Clean up the temporary file
        try {
          fs.unlinkSync(tempFile);
        } catch (e) {
          logger.error('Error removing temporary AppleScript file:', e);
        }

        if (error) {
          reject({
            success: false,
            message: error.message,
            error,
            stderr,
          });
          return;
        }

        resolve({
          success: true,
          message: 'AppleScript executed successfully',
          stdout,
          stderr,
        });
      });
    });
  } catch (error) {
    return {
      success: false,
      message: `Error executing AppleScript: ${error.message}`,
      error,
    };
  }
}

/**
 * Execute PowerShell script (Windows only)
 * @param {string} script - PowerShell script
 * @returns {Promise<Object>} Result object
 */
async function executePowerShell(script) {
  // Check if running on Windows
  if (process.platform !== 'win32') {
    return {
      success: false,
      message: 'PowerShell is only supported on Windows',
    };
  }

  try {
    // Create a temporary file for the script
    const tempFile = path.join(os.tmpdir(), `toast-powershell-${Date.now()}.ps1`);

    // Write the script to the file
    fs.writeFileSync(tempFile, script);

    // Execute the script
    return new Promise((resolve, reject) => {
      exec(`powershell -ExecutionPolicy Bypass -File "${tempFile}"`, (error, stdout, stderr) => {
        // Clean up the temporary file
        try {
          fs.unlinkSync(tempFile);
        } catch (e) {
          logger.error('Error removing temporary PowerShell file:', e);
        }

        if (error) {
          reject({
            success: false,
            message: error.message,
            error,
            stderr,
          });
          return;
        }

        resolve({
          success: true,
          message: 'PowerShell script executed successfully',
          stdout,
          stderr,
        });
      });
    });
  } catch (error) {
    return {
      success: false,
      message: `Error executing PowerShell script: ${error.message}`,
      error,
    };
  }
}

/**
 * Execute Bash script (macOS/Linux only)
 * @param {string} script - Bash script
 * @returns {Promise<Object>} Result object
 */
async function executeBash(script) {
  // Check if running on macOS or Linux
  if (process.platform === 'win32') {
    return {
      success: false,
      message: 'Bash is not supported on Windows',
    };
  }

  try {
    // Create a temporary file for the script
    const tempFile = path.join(os.tmpdir(), `toast-bash-${Date.now()}.sh`);

    // Write the script to the file
    fs.writeFileSync(tempFile, script);

    // Make the script executable
    fs.chmodSync(tempFile, '755');

    // Execute the script
    return new Promise((resolve, reject) => {
      exec(`"${tempFile}"`, (error, stdout, stderr) => {
        // Clean up the temporary file
        try {
          fs.unlinkSync(tempFile);
        } catch (e) {
          logger.error('Error removing temporary Bash file:', e);
        }

        if (error) {
          reject({
            success: false,
            message: error.message,
            error,
            stderr,
          });
          return;
        }

        resolve({
          success: true,
          message: 'Bash script executed successfully',
          stdout,
          stderr,
        });
      });
    });
  } catch (error) {
    return {
      success: false,
      message: `Error executing Bash script: ${error.message}`,
      error,
    };
  }
}

module.exports = {
  executeScript,
};
