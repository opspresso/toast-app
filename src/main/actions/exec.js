/**
 * Toast - Execute Command Action
 *
 * This module handles the execution of shell commands.
 */

const { exec } = require('child_process');
const { shell } = require('electron');

/**
 * Execute a shell command
 * @param {Object} action - Action configuration
 * @param {string} action.command - Command to execute
 * @param {string} [action.workingDir] - Working directory
 * @param {boolean} [action.runInTerminal] - Whether to run in terminal
 * @returns {Promise<Object>} Result object
 */
async function executeCommand(action) {
  try {
    // Validate required parameters
    if (!action.command) {
      return { success: false, message: 'Command is required' };
    }

    // If runInTerminal is true, open a terminal and run the command
    if (action.runInTerminal) {
      return openInTerminal(action.command, action.workingDir);
    }

    // Otherwise, execute the command directly
    return new Promise((resolve, reject) => {
      const options = {};

      // Set working directory if provided
      if (action.workingDir) {
        options.cwd = action.workingDir;
      }

      exec(action.command, options, (error, stdout, stderr) => {
        if (error) {
          reject({
            success: false,
            message: error.message,
            error: error,
            stderr: stderr
          });
          return;
        }

        resolve({
          success: true,
          message: 'Command executed successfully',
          stdout: stdout,
          stderr: stderr
        });
      });
    });
  } catch (error) {
    return {
      success: false,
      message: `Error executing command: ${error.message}`,
      error: error
    };
  }
}

/**
 * Open a command in the terminal
 * @param {string} command - Command to execute
 * @param {string} [workingDir] - Working directory
 * @returns {Promise<Object>} Result object
 */
async function openInTerminal(command, workingDir) {
  return new Promise((resolve, reject) => {
    try {
      // Platform-specific terminal commands
      let terminalCommand;

      if (process.platform === 'darwin') {
        // macOS
        terminalCommand = `osascript -e 'tell application "Terminal" to do script "${command}"'`;

        if (workingDir) {
          terminalCommand = `osascript -e 'tell application "Terminal" to do script "cd ${workingDir} && ${command}"'`;
        }
      } else if (process.platform === 'win32') {
        // Windows
        terminalCommand = `start cmd.exe /K "${command}"`;

        if (workingDir) {
          terminalCommand = `start cmd.exe /K "cd /d ${workingDir} && ${command}"`;
        }
      } else {
        // Linux and others
        // Try to detect the terminal
        const terminals = ['x-terminal-emulator', 'gnome-terminal', 'xterm', 'konsole', 'terminator'];
        let terminal = terminals[0]; // Default to first one

        terminalCommand = `${terminal} -e "bash -c '${command}; exec bash'"`;

        if (workingDir) {
          terminalCommand = `${terminal} -e "bash -c 'cd ${workingDir} && ${command}; exec bash'"`;
        }
      }

      // Execute the terminal command
      exec(terminalCommand, (error) => {
        if (error) {
          resolve({
            success: false,
            message: `Error opening terminal: ${error.message}`,
            error: error
          });
        } else {
          resolve({
            success: true,
            message: 'Command opened in terminal'
          });
        }
      });
    } catch (error) {
      resolve({
        success: false,
        message: `Error opening terminal: ${error.message}`,
        error: error
      });
    }
  });
}

module.exports = {
  executeCommand
};
