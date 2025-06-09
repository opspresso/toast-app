/**
 * Toast - Execute Command Action
 *
 * This module handles the execution of shell commands.
 */

const { exec } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

/**
 * Expand tilde (~) to home directory
 * @param {string} filePath - Path that may contain tilde
 * @returns {string} Expanded path
 */
function expandTilde(filePath) {
  if (filePath.startsWith('~/')) {
    return path.join(os.homedir(), filePath.slice(2));
  }
  return filePath;
}

/**
 * Execute a shell command
 * @param {Object} action - Action configuration
 * @param {string} action.command - Command to execute
 * @param {string} [action.workingDir] - Working directory
 * @param {boolean} [action.runInTerminal] - Whether to run in terminal
 * @returns {Promise<Object>} Result object
 */
async function executeCommand(action) {
  if (!action.command) {
    return { success: false, message: 'Command is required' };
  }

  if (action.runInTerminal) {
    return openInTerminal(action.command, action.workingDir);
  }

  return new Promise((resolve, reject) => {
    const options = { shell: true };

    if (action.workingDir) {
      const expandedPath = expandTilde(action.workingDir);

      if (!fs.existsSync(expandedPath)) {
        return reject({
          success: false,
          message: `Working directory does not exist: ${expandedPath}`,
        });
      }

      if (!fs.statSync(expandedPath).isDirectory()) {
        return reject({
          success: false,
          message: `Working directory path is not a directory: ${expandedPath}`,
        });
      }

      options.cwd = expandedPath;
    }

    exec(action.command, options, (error, stdout, stderr) => {
      if (error) {
        return reject({
          success: false,
          message: `Command execution failed: ${error.message}`,
          stderr,
        });
      }

      resolve({
        success: true,
        message: 'Command executed successfully',
        stdout,
        stderr,
      });
    });
  });
}

/**
 * Open a command in the terminal
 * @param {string} command - Command to execute
 * @param {string} [workingDir] - Working directory
 * @returns {Promise<Object>} Result object
 */
async function openInTerminal(command, workingDir) {
  return new Promise(resolve => {
    const expandedWorkingDir = workingDir ? expandTilde(workingDir) : null;
    let terminalCommand;

    if (process.platform === 'darwin') {
      terminalCommand = expandedWorkingDir
        ? `osascript -e 'tell application "Terminal" to do script "cd ${expandedWorkingDir} && ${command}"'`
        : `osascript -e 'tell application "Terminal" to do script "${command}"'`;
    } else if (process.platform === 'win32') {
      terminalCommand = expandedWorkingDir
        ? `start cmd.exe /K "cd /d ${expandedWorkingDir} && ${command}"`
        : `start cmd.exe /K "${command}"`;
    } else {
      const terminal = 'x-terminal-emulator';
      terminalCommand = expandedWorkingDir
        ? `${terminal} -e "bash -c 'cd ${expandedWorkingDir} && ${command}; exec bash'"`
        : `${terminal} -e "bash -c '${command}; exec bash'"`;
    }

    exec(terminalCommand, { shell: true }, error => {
      resolve({
        success: !error,
        message: error ? `Error opening terminal: ${error.message}` : 'Command opened in terminal',
      });
    });
  });
}

module.exports = {
  executeCommand,
};
