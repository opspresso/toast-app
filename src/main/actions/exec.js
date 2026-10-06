/** Execute a shell command, optionally in the platform's terminal. */
const { exec, execFile } = require('child_process');
const fs = require('fs');
const { expandTilde } = require('../utils/expand-tilde');

function quoteShellArg(value) {
  return `'${value.replace(/'/g, "'\\''")}'`;
}

function escapeAppleScript(value) {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

/** Preserve the existing macOS shortcut that opens a working folder in an app. */
function withApplicationFolder(command, workingDir) {
  if (process.platform !== 'darwin' || !workingDir) {
    return command;
  }
  const match = command.match(/^open\s+-a\s+(?:"([^"]+)"|'([^']+)'|([\w][\w .-]*?))(?=\s+-|$)(.*)$/);
  if (!match) {
    return command;
  }
  const appName = (match[1] || match[2] || match[3]).trim();
  // Put the folder before --args so it remains a file for open, not an app argument.
  return `open -a ${quoteShellArg(appName)} ${quoteShellArg(workingDir)}${match[4]}`;
}

async function executeCommand(action) {
  try {
    if (!action.command) {
      return { success: false, message: 'Command is required' };
    }
    const workingDir = action.workingDir ? expandTilde(action.workingDir) : null;
    if (workingDir) {
      if (!fs.existsSync(workingDir)) {
        return { success: false, message: `Working directory does not exist: ${workingDir}` };
      }
      if (!fs.statSync(workingDir).isDirectory()) {
        return { success: false, message: `Working directory path is not a directory: ${workingDir}` };
      }
    }
    const command = withApplicationFolder(action.command, workingDir);
    if (action.runInTerminal) {
      return await openInTerminal(command, workingDir);
    }
    return await new Promise(resolve => {
      const options = { shell: true, ...(workingDir ? { cwd: workingDir } : {}) };
      exec(command, options, (error, stdout, stderr) => {
        resolve({
          success: !error,
          message: error ? `Command execution failed: ${error.message}` : 'Command executed successfully',
          stdout,
          stderr,
        });
      });
    });
  }
  catch (error) {
    return { success: false, message: `Command execution failed: ${error.message}` };
  }
}

function openInTerminal(command, workingDir) {
  return new Promise(resolve => {
    const finish = error => resolve({
      success: !error,
      message: error ? `Error opening terminal: ${error.message}` : 'Command opened in terminal',
    });
    if (process.platform === 'darwin') {
      // Terminal starts its own shell. Quote the cwd for that shell, then escape
      // the complete text for AppleScript; execFile adds no intermediate shell.
      const script = workingDir ? `cd -- ${quoteShellArg(workingDir)} && ${command}` : command;
      execFile('osascript', ['-e', `tell application "Terminal" to do script "${escapeAppleScript(script)}"`], finish);
    }
    else if (process.platform === 'win32') {
      // start is a cmd built-in. Its child inherits cwd without embedding a path
      // in command text, so spaces and metacharacters in folder names stay literal.
      exec(`start "" cmd.exe /K "${command.replace(/"/g, '""')}"`, { shell: true, ...(workingDir ? { cwd: workingDir } : {}) }, finish);
    }
    else {
      execFile('x-terminal-emulator', ['-e', 'bash', '-c', `${command}; exec bash`], workingDir ? { cwd: workingDir } : {}, finish);
    }
  });
}

module.exports = { executeCommand };
