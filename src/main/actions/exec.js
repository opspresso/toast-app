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
 * Escape shell argument to prevent command injection
 * @param {string} arg - Argument to escape
 * @returns {string} Escaped argument
 */
function escapeShellArg(arg) {
  if (!arg) {
    return '';
  }

  if (process.platform === 'win32') {
    // Windows: escape with double quotes and escape internal quotes
    return `"${arg.replace(/"/g, '\\"')}"`;
  }

  // Unix-like: escape single quotes by ending quote, adding escaped quote, starting new quote
  // 'it'\''s' becomes: it's
  return `'${arg.replace(/'/g, "'\\''")}'`;
}

/**
 * Escape AppleScript string
 * @param {string} str - String to escape for AppleScript
 * @returns {string} Escaped string
 */
function escapeAppleScript(str) {
  if (!str) {
    return '';
  }
  // Escape backslashes first, then double quotes
  return str.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
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

  // Special handling for 'open -a AppName' pattern with workingDir
  const openAppMatch = action.command.match(/^open\s+-a\s+(?:"([^"]+)"|([\w\s.-]+))(.*)$/);
  if (openAppMatch && action.workingDir && process.platform === 'darwin') {
    const appName = (openAppMatch[1] || openAppMatch[2]).trim();
    const remainingArgs = (openAppMatch[3] || '').trim();
    const expandedWorkingDir = expandTilde(action.workingDir);

    // Validate working directory
    if (!fs.existsSync(expandedWorkingDir)) {
      return { success: false, message: `Working directory does not exist: ${expandedWorkingDir}` };
    }

    if (!fs.statSync(expandedWorkingDir).isDirectory()) {
      return { success: false, message: `Working directory path is not a directory: ${expandedWorkingDir}` };
    }

    // Construct the modified command - handle quotes properly with escaping
    const quotedAppName = appName.includes(' ') && !openAppMatch[1] ? `"${appName}"` : appName;
    const escapedWorkingDir = escapeShellArg(expandedWorkingDir);
    let modifiedCommand;
    if (remainingArgs) {
      // If there are additional arguments, keep them and add workingDir
      modifiedCommand = `open -a ${quotedAppName} ${remainingArgs} ${escapedWorkingDir}`;
    }
    else {
      // If no additional arguments, just add workingDir
      modifiedCommand = `open -a ${quotedAppName} ${escapedWorkingDir}`;
    }

    return new Promise((resolve, reject) => {
      exec(modifiedCommand, { shell: true }, (error, stdout, stderr) => {
        if (error) {
          return reject({
            success: false,
            message: `Command execution failed: ${error.message}`,
            stderr,
          });
        }

        resolve({
          success: true,
          message: `Application "${appName}" opened with working directory: ${expandedWorkingDir}`,
          stdout,
          stderr,
        });
      });
    });
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
    let finalCommand = command;

    // Special handling for 'open -a AppName' pattern with workingDir on macOS
    const openAppMatch = command.match(/^open\s+-a\s+(?:"([^"]+)"|([\w\s.-]+))(.*)$/);
    if (openAppMatch && expandedWorkingDir && process.platform === 'darwin') {
      const appName = (openAppMatch[1] || openAppMatch[2]).trim();
      const remainingArgs = (openAppMatch[3] || '').trim();

      // Validate working directory
      if (fs.existsSync(expandedWorkingDir) && fs.statSync(expandedWorkingDir).isDirectory()) {
        // Construct the modified command for terminal execution - handle quotes properly with escaping
        const quotedAppName = appName.includes(' ') && !openAppMatch[1] ? `"${appName}"` : appName;
        const escapedWorkingDir = escapeShellArg(expandedWorkingDir);
        if (remainingArgs) {
          finalCommand = `open -a ${quotedAppName} ${remainingArgs} ${escapedWorkingDir}`;
        }
        else {
          finalCommand = `open -a ${quotedAppName} ${escapedWorkingDir}`;
        }
      }
    }

    let terminalCommand;

    if (process.platform === 'darwin') {
      // Escape for AppleScript string context
      const escapedFinalCommand = escapeAppleScript(finalCommand);
      if (expandedWorkingDir && !openAppMatch) {
        const escapedDir = escapeAppleScript(expandedWorkingDir);
        terminalCommand = `osascript -e 'tell application "Terminal" to do script "cd ${escapedDir} && ${escapedFinalCommand}"'`;
      }
      else {
        terminalCommand = `osascript -e 'tell application "Terminal" to do script "${escapedFinalCommand}"'`;
      }
    }
    else if (process.platform === 'win32') {
      // Escape for Windows cmd context
      const escapedFinalCommand = finalCommand.replace(/"/g, '""');
      if (expandedWorkingDir) {
        const escapedDir = expandedWorkingDir.replace(/"/g, '""');
        terminalCommand = `start cmd.exe /K "cd /d ${escapedDir} && ${escapedFinalCommand}"`;
      }
      else {
        terminalCommand = `start cmd.exe /K "${escapedFinalCommand}"`;
      }
    }
    else {
      // Linux: escape for bash context
      const terminal = 'x-terminal-emulator';
      const escapedFinalCommand = finalCommand.replace(/'/g, "'\\''");
      if (expandedWorkingDir) {
        const escapedDir = expandedWorkingDir.replace(/'/g, "'\\''");
        terminalCommand = `${terminal} -e "bash -c 'cd ${escapedDir} && ${escapedFinalCommand}; exec bash'"`;
      }
      else {
        terminalCommand = `${terminal} -e "bash -c '${escapedFinalCommand}; exec bash'"`;
      }
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
