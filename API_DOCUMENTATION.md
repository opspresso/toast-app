Toast App API Documentation

This document provides comprehensive documentation for the Toast App's internal APIs including the main process modules IPC communication and renderer process interfaces.

## Main Process APIs

### Config Module (`src/main/config.js`)

The Config module handles configuration management using electron-store.

#### Functions

```javascript
/**
 * Create a configuration store
 * @returns {Store} Configuration store instance
 */
function createConfigStore()

/**
 * Reset configuration to default values
 * @param {Store} config - Configuration store instance
 */
function resetToDefaults(config)

/**
 * Import configuration from a file
 * @param {Store} config - Configuration store instance
 * @param {string} filePath - Path to the configuration file
 * @returns {boolean} Success status
 */
function importConfig(config filePath)

/**
 * Export configuration to a file
 * @param {Store} config - Configuration store instance
 * @param {string} filePath - Path to save the configuration file
 * @returns {boolean} Success status
 */
function exportConfig(config filePath)
```

#### Configuration Schema

```javascript
// Default configuration schema
const schema = {
  globalHotkey: {
    type: 'string'
    default: 'Alt+Space'
  }
  pages: {
    type: 'array'
    default: []
  }
  appearance: {
    type: 'object'
    properties: {
      theme: {
        type: 'string'
        enum: ['light' 'dark' 'system']
        default: 'system'
      }
      position: {
        type: 'string'
        enum: ['center' 'top' 'bottom' 'cursor']
        default: 'center'
      }
      size: {
        type: 'string'
        enum: ['small' 'medium' 'large']
        default: 'medium'
      }
      opacity: {
        type: 'number'
        minimum: 0.1
        maximum: 1.0
        default: 0.95
      }
      buttonLayout: {
        type: 'string'
        enum: ['grid' 'list']
        default: 'grid'
      }
    }
    default: {...}
  }
  advanced: {
    type: 'object'
    properties: {
      launchAtLogin: {
        type: 'boolean'
        default: false
      }
      hideAfterAction: {
        type: 'boolean'
        default: true
      }
      hideOnBlur: {
        type: 'boolean'
        default: true
      }
      hideOnEscape: {
        type: 'boolean'
        default: true
      }
      showInTaskbar: {
        type: 'boolean'
        default: false
      }
    }
    default: {...}
  }
  subscription: {
    type: 'object'
    properties: {
      isSubscribed: {
        type: 'boolean'
        default: false
      }
      subscribedUntil: {
        type: 'string'
        default: ''
      }
      pageGroups: {
        type: 'number'
        default: 1
      }
    }
    default: {...}
  }
  firstLaunchCompleted: {
    type: 'boolean'
    default: false
  }
};
```

#### Usage Example

```javascript
const { createConfigStore resetToDefaults } = require('./main/config');

// Create a configuration store
const config = createConfigStore();

// Get a configuration value
const globalHotkey = config.get('globalHotkey');

// Get all pages
const pages = config.get('pages');

// Set a configuration value
config.set('globalHotkey' 'Alt+Space');

// Reset to defaults
resetToDefaults(config);
```

### Executor Module (`src/main/executor.js`)

The Executor module handles the execution of actions.

#### Functions

```javascript
/**
 * Execute an action based on its type
 * @param {Object} action - Action configuration
 * @returns {Promise<Object>} Result object
 */
async function executeAction(action)

/**
 * Execute a series of actions in sequence
 * @param {Object} chainAction - Chain action configuration
 * @param {Array} chainAction.actions - Array of actions to execute
 * @returns {Promise<Object>} Result object
 */
async function executeChainedActions(chainAction)

/**
 * Test an action without executing it
 * @param {Object} action - Action configuration
 * @returns {Promise<Object>} Validation result
 */
async function validateAction(action)
```

#### Supported Action Types

- `exec`: Execute a shell command
- `open`: Open a URL file or folder
- `shortcut`: Execute a keyboard shortcut
- `script`: Execute a custom script
- `chain`: Execute a series of actions in sequence

#### Usage Example

```javascript
const { executeAction validateAction } = require('./main/executor');

// Validate an action
const validation = await validateAction({
  action: 'exec'
  command: 'echo "Hello world!"'
});

if (validation.valid) {
  // Execute the action
  const result = await executeAction({
    action: 'exec'
    command: 'echo "Hello world!"'
  });

  console.log(result.success result.message);
}
```

### Shortcuts Module (`src/main/shortcuts.js`)

The Shortcuts module handles global keyboard shortcuts.

#### Functions

```javascript
/**
 * Register global shortcuts
 * @param {Object} config - Configuration store
 * @param {Object} windows - Object containing application windows
 * @returns {boolean} Success status
 */
function registerGlobalShortcuts(config windows)

/**
 * Toggle the visibility of the Toast window
 * @param {BrowserWindow} toastWindow - Toast window
 */
function toggleToastWindow(toastWindow)

/**
 * Position the Toast window based on configuration
 * @param {BrowserWindow} toastWindow - Toast window
 * @param {Object} [config] - Configuration store (optional)
 */
function positionToastWindow(toastWindow config)

/**
 * Unregister all global shortcuts
 */
function unregisterGlobalShortcuts()

/**
 * Check if a shortcut is registered
 * @param {string} accelerator - Shortcut to check
 * @returns {boolean} Whether the shortcut is registered
 */
function isShortcutRegistered(accelerator)
```

#### Position Options

- `center`: Center of the screen
- `top`: Top center of the screen
- `bottom`: Bottom center of the screen
- `cursor`: Near the cursor position

#### Usage Example

```javascript
const { registerGlobalShortcuts unregisterGlobalShortcuts } = require('./main/shortcuts');

// Register global shortcuts
registerGlobalShortcuts(config windows);

// Unregister global shortcuts
unregisterGlobalShortcuts();

// Position the Toast window
positionToastWindow(windows.toast config);
```

### Tray Module (`src/main/tray.js`)

The Tray module handles the system tray icon and menu.

#### Functions

```javascript
/**
 * Create the system tray icon
 * @param {Object} windows - Object containing application windows
 * @returns {Tray} Tray instance
 */
function createTray(windows)

/**
 * Update the tray menu
 * @param {Tray} tray - Tray instance
 * @param {Object} windows - Object containing application windows
 */
function updateTrayMenu(tray windows)

/**
 * Destroy the tray icon
 */
function destroyTray()
```

#### Usage Example

```javascript
const { createTray destroyTray } = require('./main/tray');

// Create the tray icon
const tray = createTray(windows);

// Destroy the tray icon
destroyTray();
```

### Windows Module (`src/main/windows.js`)

The Windows module handles window creation and management.

#### Functions

```javascript
/**
 * Create the Toast popup window
 * @param {Object} config - Configuration store
 * @returns {BrowserWindow} Toast window
 */
function createToastWindow(config)

/**
 * Set up event handlers for the Toast window
 * @param {BrowserWindow} toastWindow - Toast window
 * @param {Object} config - Configuration store
 */
function setupToastWindowEvents(toastWindow config)

/**
 * Create the Settings window
 * @param {Object} config - Configuration store
 * @returns {BrowserWindow} Settings window
 */
function createSettingsWindow(config)

/**
 * Set up event handlers for the Settings window
 * @param {BrowserWindow} settingsWindow - Settings window
 */
function setupSettingsWindowEvents(settingsWindow)

/**
 * Activate English keyboard input source (platform-specific)
 */
function activateEnglishKeyboard()

/**
 * Show the Toast window
 * @param {Object} config - Configuration store
 */
function showToastWindow(config)

/**
 * Hide the Toast window
 */
function hideToastWindow()

/**
 * Show the Settings window
 * @param {Object} config - Configuration store
 */
function showSettingsWindow(config)

/**
 * Close all windows
 */
function closeAllWindows()
```

#### Window Properties

- **Toast Window Properties**: `frame` `transparent` `resizable` `skipTaskbar` `alwaysOnTop`
- **Settings Window Properties**: `minWidth` `minHeight` `contextIsolation` `nodeIntegration`

#### Window Size Options

- `small`: 500x350 pixels
- `medium`: 700x500 pixels
- `large`: 800x550 pixels

#### Usage Example

```javascript
const { createToastWindow showToastWindow hideToastWindow } = require('./main/windows');

// Create the Toast window
const toastWindow = createToastWindow(config);

// Show the Toast window
showToastWindow(config);

// Hide the Toast window
hideToastWindow();

// Activate English keyboard for input
activateEnglishKeyboard();
```

### IPC Module (`src/main/ipc.js`)

The IPC module handles inter-process communication between the main process and renderer processes.

#### Functions

```javascript
/**
 * Set up IPC handlers
 * @param {Object} windows - Object containing application windows
 */
function setupIpcHandlers(windows)
```

#### IPC Channels

| Channel | Type | Description |
|---------|------|-------------|
| `execute-action` | handle | Execute an action |
| `validate-action` | handle | Validate an action |
| `get-config` | handle | Get configuration |
| `set-config` | handle | Set configuration |
| `save-config` | handle | Save specific configuration changes |
| `reset-config` | handle | Reset configuration to defaults |
| `import-config` | handle | Import configuration from a file |
| `export-config` | handle | Export configuration to a file |
| `show-toast` | on | Show the Toast window |
| `hide-toast` | on | Hide the Toast window |
| `show-settings` | on | Show the Settings window |
| `close-settings` | on | Close the Settings window |
| `restart-app` | on | Restart the application |
| `quit-app` | on | Quit the application |
| `temporarily-disable-shortcuts` | handle | Temporarily disable global shortcuts for recording |
| `restore-shortcuts` | handle | Restore global shortcuts after recording |
| `show-open-dialog` | handle | Show the open file dialog |
| `show-save-dialog` | handle | Show the save file dialog |
| `show-message-box` | handle | Show a message box |
| `test-action` | handle | Test an action |

#### Usage Example

```javascript
const { setupIpcHandlers } = require('./main/ipc');

// Set up IPC handlers
setupIpcHandlers(windows);
```

## Action Modules

### Exec Action (`src/main/actions/exec.js`)

The Exec Action module handles executing shell commands.

#### Functions

```javascript
/**
 * Execute a shell command
 * @param {Object} action - Action configuration
 * @param {string} action.command - Command to execute
 * @param {string} [action.workingDir] - Working directory
 * @param {boolean} [action.runInTerminal] - Whether to run in terminal
 * @returns {Promise<Object>} Result object
 */
async function executeCommand(action)

/**
 * Open a command in the terminal
 * @param {string} command - Command to execute
 * @param {string} [workingDir] - Working directory
 * @returns {Promise<Object>} Result object
 */
async function openInTerminal(command workingDir)
```

### Open Action (`src/main/actions/open.js`)

The Open Action module handles opening URLs files and folders.

#### Functions

```javascript
/**
 * Open a URL file or folder
 * @param {Object} action - Action configuration
 * @param {string} [action.url] - URL to open
 * @param {string} [action.path] - File or folder path to open
 * @param {string} [action.application] - Application to use for opening
 * @returns {Promise<Object>} Result object
 */
async function openItem(action)

/**
 * Open a URL in the default browser
 * @param {string} url - URL to open
 * @returns {Promise<Object>} Result object
 */
async function openUrl(url)

/**
 * Open a file or folder
 * @param {string} itemPath - Path to file or folder
 * @param {string} [application] - Application to use for opening
 * @returns {Promise<Object>} Result object
 */
async function openPath(itemPath application)

/**
 * Open a file with a specific application
 * @param {string} filePath - Path to file
 * @param {string} application - Application to use
 * @returns {Promise<Object>} Result object
 */
async function openWithApplication(filePath application)
```

### Shortcut Action (`src/main/actions/shortcut.js`)

The Shortcut Action module handles sending keyboard shortcuts to the system.

#### Functions

```javascript
/**
 * Execute a keyboard shortcut
 * @param {Object} action - Action configuration
 * @param {string} action.keys - Keyboard shortcut to execute (e.g. "Ctrl+C")
 * @returns {Promise<Object>} Result object
 */
async function executeShortcut(action)

/**
 * Parse a shortcut string into an array of keys
 * @param {string} shortcutString - Shortcut string (e.g. "Ctrl+Shift+A")
 * @returns {Array} Array of key constants
 */
function parseShortcut(shortcutString)

/**
 * Press a combination of keys
 * @param {Array} keys - Array of key constants
 * @returns {Promise<void>}
 */
async function pressKeys(keys)
```

### Script Action (`src/main/actions/script.js`)

The Script Action module handles executing custom scripts in various languages.

#### Functions

```javascript
/**
 * Execute a custom script
 * @param {Object} action - Action configuration
 * @param {string} action.script - Script content
 * @param {string} action.scriptType - Script language (javascript applescript powershell bash)
 * @param {Object} [action.scriptParams] - Parameters to pass to the script
 * @returns {Promise<Object>} Result object
 */
async function executeScript(action)

/**
 * Execute JavaScript code
 * @param {string} script - JavaScript code
 * @param {Object} [params] - Parameters to pass to the script
 * @returns {Promise<Object>} Result object
 */
async function executeJavaScript(script params)

/**
 * Execute AppleScript (macOS only)
 * @param {string} script - AppleScript code
 * @returns {Promise<Object>} Result object
 */
async function executeAppleScript(script)

/**
 * Execute PowerShell script (Windows only)
 * @param {string} script - PowerShell script
 * @returns {Promise<Object>} Result object
 */
async function executePowerShell(script)

/**
 * Execute Bash script (macOS/Linux only)
 * @param {string} script - Bash script
 * @returns {Promise<Object>} Result object
 */
async function executeBash(script)
```

### Chain Action (`src/main/actions/chain.js`)

The Chain Action module handles executing a series of actions in sequence.

#### Functions

```javascript
/**
 * Execute a chain of actions in sequence
 * @param {Object} action - Chain action configuration
 * @param {Array} action.actions - Array of actions to execute in sequence
 * @param {boolean} [action.stopOnError=true] - Whether to stop execution if an action fails
 * @returns {Promise<Object>} Result object
 */
async function executeChainedActions(action)
```

#### Chain Action Results

A chain action returns a result object with the following structure:

```javascript
{
  success: true|false, // Whether the entire chain executed successfully
  message: "Chain executed successfully" | "Chain execution stopped due to an error",
  results: [
    {
      index: 0, // Index of the action in the chain
      action: {}, // The original action configuration
      result: {} // The result of the action execution
    },
    // More action results...
  ]
}
```

If the `stopOnError` property is set to `true` (the default), the chain execution will stop when an action fails. Otherwise, all actions in the chain will be executed regardless of previous failures.

#### Chain Action Example

```javascript
// Execute a chain of actions
const chainResult = await executeAction({
  action: 'chain',
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
      action: 'shortcut',
      keys: 'Ctrl+C'
    }
  ],
  stopOnError: true
});

console.log(chainResult.success, chainResult.message);
// Access individual action results
chainResult.results.forEach(result => {
  console.log(`Action ${result.index}: ${result.result.success ? 'Success' : 'Failed'}`);
});
```

## Renderer Process APIs

### Toast Window API (`src/renderer/preload/toast.js`)

The Toast Window API provides an interface for the Toast window to communicate with the main process.

#### Methods

```javascript
// Configuration
window.toast.getConfig(key) // Get configuration

// Actions
window.toast.executeAction(action) // Execute an action

// Window control
window.toast.hideWindow() // Hide the Toast window
window.toast.showSettings() // Show the Settings window

// Platform information
window.toast.platform // The platform (darwin win32 linux)

// Save configuration
window.toast.saveConfig(config) // Save configuration changes

// Events
window.toast.onConfigUpdated(callback) // Listen for configuration updates
```

#### Events

```javascript
// Configuration loaded event
window.addEventListener('config-loaded' (event) => {
  const config = event.detail;
  // detail contains: pages appearance subscription
});

// Before window hide event
window.addEventListener('before-window-hide' () => {
  // Clean up before the window is hidden
});
```

#### Usage Example

```javascript
// Get configuration
const pages = await window.toast.getConfig('pages');

// Execute an action
const result = await window.toast.executeAction({
  action: 'exec'
  command: 'echo "Hello world!"'
});

// Save configuration (e.g. updating pages)
await window.toast.saveConfig({ pages: updatedPages });

// Hide the window
window.toast.hideWindow();

// Listen for configuration updates
const removeListener = window.toast.onConfigUpdated((config) => {
  console.log('Configuration updated:' config);
});

// Check platform for platform-specific behavior
if (window.toast.platform === 'darwin') {
  // macOS specific code
} else if (window.toast.platform === 'win32') {
  // Windows specific code
}
```

### Settings Window API (`src/renderer/preload/settings.js`)

The Settings Window API provides an interface for the Settings window to communicate with the main process.

#### Methods

```javascript
// Configuration
window.settings.getConfig(key) // Get configuration
window.settings.setConfig(key value) // Set configuration
window.settings.resetConfig() // Reset configuration to defaults
window.settings.importConfig(filePath) // Import configuration from a file
window.settings.exportConfig(filePath) // Export configuration to a file

// Actions
window.settings.testAction(action) // Test an action
window.settings.validateAction(action) // Validate an action

// Window control
window.settings.showToast() // Show the Toast window
window.settings.closeWindow() // Close the Settings window

// Dialog
window.settings.showOpenDialog(options) // Show the open file dialog
window.settings.showSaveDialog(options) // Show the save file dialog
window.settings.showMessageBox(options) // Show a message box

// App control
window.settings.restartApp() // Restart the application
window.settings.quitApp() // Quit the application

// Shortcuts control for recording
window.settings.temporarilyDisableShortcuts() // Temporarily disable global shortcuts
window.settings.restoreShortcuts() // Restore global shortcuts

// System information
window.settings.getPlatform() // Get the platform (darwin win32 linux)
window.settings.getVersion() // Get the application version
```

#### Events

```javascript
// Configuration loaded event
window.addEventListener('config-loaded' (event) => {
  const config = event.detail;
  // Contains the full configuration object
});
```

#### Usage Example

```javascript
// Get configuration
const config = await window.settings.getConfig();

// Set configuration
await window.settings.setConfig('globalHotkey' 'Alt+Space');

// Test an action
const result = await window.settings.testAction({
  action: 'exec'
  command: 'echo "Hello world!"'
});

// Show the open file dialog
const result = await window.settings.showOpenDialog({
  properties: ['openFile']
});

// Temporarily disable shortcuts for recording
await window.settings.temporarilyDisableShortcuts();

// Record shortcut here...

// Restore shortcuts
await window.settings.restoreShortcuts();

// Show a message box
await window.settings.showMessageBox({
  type: 'info'
  title: 'Information'
  message: 'This is an information message'
  buttons: ['OK']
});
```

## Result Objects

Many API functions return result objects with a consistent structure:

### Success Result

```javascript
{
  success: true
  message: 'Operation completed successfully'
  // Additional data specific to the operation
}
```

### Error Result

```javascript
{
  success: false
  message: 'Error message'
  error: errorObject // Original error object or string
  // Additional error details
}
```

### Validation Result

```javascript
{
  valid: true|false
  message: 'Validation message if invalid'
  error: errorObject // Original error object or string if applicable
}
```

## Page and Button Structure

### Page Object

```javascript
{
  name: "Applications" // Display name of the page
  shortcut: "1" // Keyboard shortcut to access the page (1-9)
  buttons: [
    // Array of button objects
  ]
}
```

### Button Object

```javascript
{
  name: "Terminal" // Display name of the button
  shortcut: "T" // Keyboard shortcut (single character)
  icon: "⌨️" // Emoji or icon
  action: "exec" // Action type (exec open shortcut script chain)

  // Additional properties based on action type:
  command: "open -a Terminal" // For exec action
  url: "https://example.com" // For open action
  keys: "Ctrl+C" // For shortcut action
  script: "console.log('Hello');" // For script action
  scriptType: "javascript" // For script action
  actions: [] // For chain action (array of actions)
  stopOnError: true // For chain action
}
```

## Event System

The application uses several event systems:

### Electron IPC Events

Used for communication between the main process and renderer processes.

### DOM Events

Used for communication within renderer processes.

#### Config Loaded Event

```javascript
// In Toast window
window.addEventListener('config-loaded' (event) => {
  const { pages appearance subscription } = event.detail;
  // Handle configuration
});

// In Settings window
window.addEventListener('config-loaded' (event) => {
  const config = event.detail; // Full configuration object
  // Handle configuration
});
```

#### Before Window Hide Event

```javascript
window.addEventListener('before-window-hide' () => {
  // Clean up before the window is hidden (e.g. exit edit mode)
});
```

## Error Handling

All API functions include error handling to prevent crashes:

1. **Try-Catch Blocks**: All async functions use try-catch blocks to handle errors.
2. **Error Objects**: Errors are returned as part of the result object.
3. **Validation**: Input is validated before processing.
4. **Default Values**: Default values are used when inputs are missing or invalid.

## Security Considerations

The API implements several security measures:

1. **Context Isolation**: Renderer processes use contextBridge for secure IPC.
2. **Input Validation**: All inputs are validated before processing.
3. **Sandboxed Scripts**: JavaScript scripts run in a sandboxed environment.
4. **Limited Permissions**: Only necessary APIs are exposed to renderer processes.

## Platform-Specific Behavior

Some APIs have platform-specific behavior:

1. **Shortcuts**: Different modifier keys on macOS (`Command`) and Windows (`Ctrl`).
2. **File Paths**: Different path formats on different platforms.
3. **Script Execution**: AppleScript only on macOS PowerShell only on Windows.
4. **Terminal Commands**: Different terminal commands on different platforms.
5. **Keyboard Input**: English keyboard activation differs between platforms.

## Extending the API

To extend the API with new functionality:

1. **Add a new module** in the appropriate directory.
2. **Export functions** from the module.
3. **Import and use** the functions in other modules.
4. **Expose to renderer** via IPC if needed.
5. **Document** the new functionality in this document.

## Versioning

The API follows semantic versioning:

1. **Major version**: Breaking changes to the API.
2. **Minor version**: New features without breaking changes.
3. **Patch version**: Bug fixes and minor improvements.

## Deprecation Policy

When deprecating API features:

1. **Mark as deprecated** in the documentation.
2. **Provide alternatives** in the documentation.
3. **Log warnings** when deprecated features are used.
4. **Remove** in the next major version.
