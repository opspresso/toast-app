/**
 * Toast - Script Action
 *
 * This module handles executing custom scripts in various languages.
 */

const { execFile } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const { app } = require('electron');
const vm = require('vm');
const { createLogger } = require('../logger');

// Create a module-specific logger
const logger = createLogger('ScriptAction');

// Only expose non-sensitive environment variables to user scripts
// (secrets like CLIENT_SECRET must stay in the main process). Applied to both the
// JavaScript sandbox and the shell launchers (osascript/powershell/bash).
const SAFE_ENV_KEYS = ['HOME', 'USER', 'USERPROFILE', 'PATH', 'LANG', 'SHELL', 'TMPDIR', 'TEMP', 'TMP'];

function buildSafeEnv() {
  const safeEnv = {};
  for (const key of SAFE_ENV_KEYS) {
    if (process.env[key] !== undefined) {
      safeEnv[key] = process.env[key];
    }
  }
  return safeEnv;
}

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
      case 'powershell':
      case 'bash':
        return executeExternalScript(action.script, action.scriptType.toLowerCase());
      default:
        return {
          success: false,
          message: `Unsupported script type: ${action.scriptType}`,
        };
    }
  }
  catch (error) {
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
    const safeEnv = buildSafeEnv();

    // NOT a security sandbox: `require` gives scripts full Node access (fs,
    // child_process, etc.), so they can read the real process.env or spawn
    // subprocesses directly, bypassing the `env: safeEnv` restriction below.
    // That restriction only actually holds for the shell launchers further
    // down (osascript/powershell/bash), where `execFile()`'s `env` option fully
    // replaces the child process's environment at the OS level. A JavaScript
    // script action runs with the same effective privileges as an exec
    // action and must be trusted/approved accordingly (see action-approval.js).
    const sandbox = {
      console,
      require,
      process: {
        platform: process.platform,
        arch: process.arch,
        env: safeEnv,
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
  }
  catch (error) {
    return {
      success: false,
      message: `Error executing JavaScript: ${error.message}`,
      error,
    };
  }
}

const externalScripts = {
  applescript: { command: 'osascript', extension: 'scpt', label: 'AppleScript', args: [],
    unsupported: () => process.platform !== 'darwin' && 'AppleScript is only supported on macOS' },
  powershell: { command: 'powershell', extension: 'ps1', label: 'PowerShell script', args: ['-ExecutionPolicy', 'Bypass', '-File'],
    unsupported: () => process.platform !== 'win32' && 'PowerShell is only supported on Windows' },
  bash: { command: 'bash', extension: 'sh', label: 'Bash script', args: ['--'],
    unsupported: () => process.platform === 'win32' && 'Bash is not supported on Windows' },
};

/** Each invocation owns a private directory until its interpreter has exited. */
async function executeExternalScript(script, type) {
  const definition = externalScripts[type];
  const unsupported = definition.unsupported();
  if (unsupported) {
    return { success: false, message: unsupported };
  }
  let directory;
  let result;
  try {
    directory = await fs.mkdtemp(path.join(os.tmpdir(), `toast-${type}-`));
    const file = path.join(directory, `script.${definition.extension}`);
    await fs.writeFile(file, script, { mode: 0o600 });
    result = await new Promise(resolve => {
      execFile(definition.command, [...definition.args, file], { env: buildSafeEnv() }, (error, stdout, stderr) => {
        resolve(error
          ? { success: false, message: error.message, error, stderr }
          : { success: true, message: `${definition.label} executed successfully`, stdout, stderr });
      });
    });
  }
  catch (error) {
    result = { success: false, message: `Error executing ${definition.label}: ${error.message}`, error };
  }
  finally {
    if (directory) {
      try {
        await fs.rm(directory, { recursive: true, force: true });
      }
      catch (error) {
        logger.error('Error removing temporary script directory:', error);
        result.cleanupError = 'Could not remove the temporary script directory.';
        result.message += ' Temporary script cleanup failed.';
      }
    }
  }
  return result;
}

module.exports = { executeScript };
