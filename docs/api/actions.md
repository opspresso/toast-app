# Toast App Action API

This document provides API documentation for the Toast app's action modules.

## Action System Overview

The Toast app supports five action types, centrally managed in `src/main/executor.js`:
1. **application** - Launch an application
2. **exec** - Run a shell command
3. **open** - Open a URL, file, or folder
4. **script** - Run a custom script (JavaScript, AppleScript, PowerShell, Bash)
5. **chain** - Run multiple actions sequentially

Action validation (`validateAction()`) runs on the `validate-action` and `test-action` IPC paths. It is not called during normal execution (`execute-action`); instead, each action module validates its own required fields at execution time.

## Exec Action (`src/main/actions/exec.js`)

The Exec action module handles shell command execution. Its only public entry point is `executeCommand(action)`, and only this function is exported.

### Function

```javascript
/**
 * Run a shell command
 * @param {Object} action - Action configuration
 * @param {string} action.command - Command to run
 * @param {string} [action.workingDir] - Working directory
 * @param {boolean} [action.runInTerminal] - Whether to run in a terminal
 * @returns {Promise<Object>} Result object
 */
async function executeCommand(action)
```

> When `runInTerminal: true`, terminal execution is handled by an internal helper (`openInTerminal`). This helper is an internal implementation and is not exported.

### Usage Examples

```javascript
// Run a command
const result = await executeCommand({
  command: 'echo "Hello World"',
  workingDir: '/Users/username/projects',
  runInTerminal: false
});

// Run a command in a terminal
const terminalResult = await executeCommand({
  command: 'npm start',
  workingDir: '/Users/username/project',
  runInTerminal: true
});
```

## Open Action (`src/main/actions/open.js`)

The Open action module handles opening URLs, files, and folders. Its only public entry point is `openItem(action)`, and only this function is exported.

### Function

```javascript
/**
 * Open a URL, file, or folder
 * @param {Object} action - Action configuration
 * @param {string} [action.url] - URL to open
 * @param {string} [action.path] - File or folder path to open
 * @param {string} [action.application] - Application to use for opening
 * @returns {Promise<Object>} Result object
 */
async function openItem(action)
```

> Depending on the input, `openItem` delegates to internal helpers (`openUrl`, `openPath`, `openWithApplication`). These helpers are internal implementations and are not exported.

### Usage Examples

```javascript
// Open a URL
const urlResult = await openItem({
  url: 'https://github.com'
});

// Open a file
const fileResult = await openItem({
  path: '/Users/username/document.pdf'
});

// Open a file with a specific application
const appResult = await openItem({
  path: '/Users/username/image.png',
  application: 'Preview'
});
```

## Script Action (`src/main/actions/script.js`)

The Script action module handles running custom scripts in various languages. Its only public entry point is `executeScript(action)`, and only this function is exported.

### Function

```javascript
/**
 * Run a custom script
 * @param {Object} action - Action configuration
 * @param {string} action.script - Script content
 * @param {string} action.scriptType - Script language
 * @param {Object} [action.scriptParams] - Parameters to pass to the script
 * @returns {Promise<Object>} Result object
 */
async function executeScript(action)
```

> Depending on the `scriptType` value, `executeScript` delegates to internal helpers (`executeJavaScript`, `executeAppleScript`, `executePowerShell`, `executeBash`). These helpers are internal implementations and are not exported.

### Supported Script Languages

- `javascript`: JavaScript (Node.js environment)
- `applescript`: AppleScript (macOS only)
- `powershell`: PowerShell (Windows only)
- `bash`: Bash script (macOS/Linux)

### Usage Examples

```javascript
// Run a JavaScript script
const jsResult = await executeScript({
  scriptType: 'javascript',
  script: `
    const fs = require('fs');
    const files = fs.readdirSync('.');
    result = files.length + ' files found';
  `
});

// Run AppleScript (macOS)
const appleResult = await executeScript({
  scriptType: 'applescript',
  script: `
    tell application "Finder"
      activate
      make new Finder window
    end tell
  `
});

// Run PowerShell (Windows)
const psResult = await executeScript({
  scriptType: 'powershell',
  script: 'Get-Process | Where-Object {$_.ProcessName -eq "notepad"}'
});

// Run JavaScript with parameters
const paramResult = await executeScript({
  scriptType: 'javascript',
  script: 'result = `Hello ${params.name}!`;',
  scriptParams: { name: 'World' }
});
```

## Chain Action (`src/main/actions/chain.js`)

The Chain action module handles running a series of actions sequentially.

### Function

```javascript
/**
 * Run a chain of actions sequentially
 * @param {Object} action - Chain action configuration
 * @param {Array} action.actions - Array of actions to run sequentially
 * @param {boolean} [action.stopOnError=true] - Whether to stop execution if an action fails
 * @returns {Promise<Object>} Result object
 */
async function executeChainedActions(action)
```

### Chain Action Result

A chain action returns a result object with the following structure:

```javascript
{
  success: true|false, // Whether the entire chain ran successfully (false if any action fails)
  message: "Chain executed successfully" | "Chain execution stopped due to an error" | "Chain completed with one or more errors",
  results: [
    {
      index: 0, // Index of the action in the chain
      action: {}, // Original action configuration
      result: {} // Action execution result
    }
    // More action results...
  ]
}
```

### Usage Examples

```javascript
// Run a chain of actions
const chainResult = await executeChainedActions({
  actions: [
    {
      action: 'exec',
      command: 'echo "Step 1"'
    },
    {
      action: 'open',
      url: 'https://example.com'
    },
    {
      action: 'script',
      scriptType: 'javascript',
      script: 'console.log("Step 3"); result = "Done";'
    }
  ],
  stopOnError: true
});

// Check the result
console.log(chainResult.success, chainResult.message);

// Access individual action results
chainResult.results.forEach(result => {
  console.log(`Action ${result.index}: ${result.result.success ? 'Success' : 'Failed'}`);
});
```

## Application Action (`src/main/actions/application.js`)

The Application action module handles launching applications.

### Function

```javascript
/**
 * Launch an application
 * @param {Object} action - Action configuration
 * @param {string} action.applicationPath - Application path
 * @param {string} [action.applicationParameters] - Application parameters
 * @returns {Promise<Object>} Result object
 */
async function executeApplication(action)
```

### Usage Examples

```javascript
// Launch a macOS application
const macResult = await executeApplication({
  applicationPath: '/Applications/Calculator.app'
});

// Launch a Windows application
const winResult = await executeApplication({
  applicationPath: 'C:\\Program Files\\Notepad++\\notepad++.exe',
  applicationParameters: '--new-document'
});

// Launch with parameters
const paramResult = await executeApplication({
  applicationPath: '/Applications/TextEdit.app',
  applicationParameters: '/Users/username/document.txt'
});
```

## Common Result Object

Every action returns a result object with a consistent structure:

### Success Result

```javascript
{
  success: true,
  message: 'The operation completed successfully',
  stdout: 'Command standard output', // exec and script(AppleScript/PowerShell/Bash) actions only
  stderr: 'Command standard error',  // exec and script(AppleScript/PowerShell/Bash) actions only
  results: [],              // chain action only (array of results for each sub-action)
}
```

The `application` and `open` actions return only `success` and `message`. A JavaScript script returns the object that the script assigned to the `result` variable, as-is.

### Error Result

```javascript
{
  success: false,
  message: 'Error message',
  error: errorObject, // Original error object or string
  // Additional error details
}
```

## Error Handling

Every action module implements the following error handling:

1. **Try-catch blocks**: All asynchronous functions use try-catch blocks to handle errors
2. **Input validation**: Action parameters are validated before execution
3. **Platform compatibility**: Platform-specific actions verify compatibility

## Platform-Specific Considerations

### macOS
- AppleScript support
- `.app` bundle application paths
- Uses the `Cmd` key modifier

### Windows
- PowerShell support
- `.exe` executable paths
- Uses the `Ctrl` key modifier

### Linux
- Bash script support
- Package-manager-specific application paths
- Uses the `Ctrl` key modifier

## Security Considerations

1. **Script execution environment**: JavaScript scripts run in a `vm` context, but `require` (all built-in modules) and `Buffer` are exposed, so this is not a system-level sandbox. Environment variables are limited to a non-sensitive allowlist (`HOME`, `PATH`, etc.). Only run trusted scripts.
2. **Path validation**: File and application paths are validated before execution. Application launches from the `open` action use an argument-array (`execFile`) approach that does not go through a shell, blocking injection.
3. **Command escaping**: The `command` of an `exec` action runs as the user-defined shell command as-is; only `workingDir` and AppleScript arguments are escaped.
4. **Remote action approval**: `exec`/`script` actions newly downloaded via cloud sync, and `application` actions that carry execution arguments (`applicationParameters`), go through a user confirmation dialog before their first run on this device (`src/main/action-approval.js`). Simple app launches without arguments are not subject to approval.

## Performance Optimization

1. **Asynchronous execution**: All actions run asynchronously
2. **Resource management**: Processes and file handles are cleaned up appropriately
3. **Batch processing**: Efficient sequential execution in chain actions
