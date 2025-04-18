# Toast App API Documentation

This document provides comprehensive documentation for the Toast App's internal APIs, including the main process modules, IPC communication, and renderer process interfaces.

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
function importConfig(config, filePath)

/**
 * Export configuration to a file
 * @param {Store} config - Configuration store instance
 * @param {string} filePath - Path to save the configuration file
 * @returns {boolean} Success status
 */
function exportConfig(config, filePath)
```

#### Usage Example

```javascript
const { createConfigStore, resetToDefaults } = require('./main/config');

// Create a configuration store
const config = createConfigStore();

// Get a configuration value
const globalHotkey = config.get('globalHotkey');

// Set a configuration value
config.set('globalHotkey', 'Alt+Space');

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
 * Test an action without executing it
 * @param {Object} action - Action configuration
 * @returns {Promise<Object>} Validation result
 */
async function validateAction(action)
```

#### Usage Example

```javascript
const { executeAction, validateAction } = require('./main/executor');

// Validate an action
const validation = await validateAction({
  action: 'exec',
  command: 'echo "Hello, world!"'
});

if (validation.valid) {
  // Execute the action
  const result = await executeAction({
    action: 'exec',
    command: 'echo "Hello, world!"'
  });

  console.log(result.success, result.message);
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
function registerGlobalShortcuts(config, windows)

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

/**
 * Position the Toast window based on configuration
 * @param {BrowserWindow} toastWindow - Toast window
 * @param {Object} [config] - Configuration store (optional)
 */
function positionToastWindow(toastWindow, config)
```

#### Usage Example

```javascript
const { registerGlobalShortcuts, unregisterGlobalShortcuts } = require('./main/shortcuts');

// Register global shortcuts
registerGlobalShortcuts(config, windows);

// Unregister global shortcuts
unregisterGlobalShortcuts();
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
function updateTrayMenu(tray, windows)

/**
 * Destroy the tray icon
 */
function destroyTray()
```

#### Usage Example

```javascript
const { createTray, destroyTray } = require('./main/tray');

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
 * Create the Settings window
 * @param {Object} config - Configuration store
 * @returns {BrowserWindow} Settings window
 */
function createSettingsWindow(config)

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

#### Usage Example

```javascript
const { createToastWindow, showToastWindow, hideToastWindow } = require('./main/windows');

// Create the Toast window
const toastWindow = createToastWindow(config);

// Show the Toast window
showToastWindow(config);

// Hide the Toast window
hideToastWindow();
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
| `reset-config` | handle | Reset configuration to defaults |
| `import-config` | handle | Import configuration from a file |
| `export-config` | handle | Export configuration to a file |
| `show-toast` | on | Show the Toast window |
| `hide-toast` | on | Hide the Toast window |
| `show-settings` | on | Show the Settings window |
| `restart-app` | on | Restart the application |
| `quit-app` | on | Quit the application |
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
```

### Open Action (`src/main/actions/open.js`)

The Open Action module handles opening URLs, files, and folders.

#### Functions

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

### Shortcut Action (`src/main/actions/shortcut.js`)

The Shortcut Action module handles sending keyboard shortcuts to the system.

#### Functions

```javascript
/**
 * Execute a keyboard shortcut
 * @param {Object} action - Action configuration
 * @param {string} action.keys - Keyboard shortcut to execute (e.g., "Ctrl+C")
 * @returns {Promise<Object>} Result object
 */
async function executeShortcut(action)
```

### Script Action (`src/main/actions/script.js`)

The Script Action module handles executing custom scripts in various languages.

#### Functions

```javascript
/**
 * Execute a custom script
 * @param {Object} action - Action configuration
 * @param {string} action.script - Script content
 * @param {string} action.scriptType - Script language (javascript, applescript, powershell, bash)
 * @param {Object} [action.scriptParams] - Parameters to pass to the script
 * @returns {Promise<Object>} Result object
 */
async function executeScript(action)
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

// Events
window.toast.onConfigUpdated(callback) // Listen for configuration updates
```

#### Usage Example

```javascript
// Get configuration
const buttons = await window.toast.getConfig('buttons');

// Execute an action
const result = await window.toast.executeAction({
  action: 'exec',
  command: 'echo "Hello, world!"'
});

// Hide the window
window.toast.hideWindow();

// Listen for configuration updates
const removeListener = window.toast.onConfigUpdated((config) => {
  console.log('Configuration updated:', config);
});

// Remove the listener when no longer needed
removeListener();
```

### Settings Window API (`src/renderer/preload/settings.js`)

The Settings Window API provides an interface for the Settings window to communicate with the main process.

#### Methods

```javascript
// Configuration
window.settings.getConfig(key) // Get configuration
window.settings.setConfig(key, value) // Set configuration
window.settings.resetConfig() // Reset configuration to defaults
window.settings.importConfig(filePath) // Import configuration from a file
window.settings.exportConfig(filePath) // Export configuration to a file

// Actions
window.settings.testAction(action) // Test an action
window.settings.validateAction(action) // Validate an action

// Window control
window.settings.showToast() // Show the Toast window

// Dialog
window.settings.showOpenDialog(options) // Show the open file dialog
window.settings.showSaveDialog(options) // Show the save file dialog
window.settings.showMessageBox(options) // Show a message box

// App control
window.settings.restartApp() // Restart the application
window.settings.quitApp() // Quit the application

// System information
window.settings.getPlatform() // Get the platform (darwin, win32, linux)
window.settings.getVersion() // Get the application version
```

#### Usage Example

```javascript
// Get configuration
const config = await window.settings.getConfig();

// Set configuration
await window.settings.setConfig('globalHotkey', 'Alt+Space');

// Test an action
const result = await window.settings.testAction({
  action: 'exec',
  command: 'echo "Hello, world!"'
});

// Show the open file dialog
const result = await window.settings.showOpenDialog({
  properties: ['openFile']
});

if (!result.canceled) {
  console.log('Selected file:', result.filePaths[0]);
}
```

## Result Objects

Many API functions return result objects with a consistent structure:

### Success Result

```javascript
{
  success: true,
  message: 'Operation completed successfully',
  // Additional data specific to the operation
}
```

### Error Result

```javascript
{
  success: false,
  message: 'Error message',
  error: errorObject, // Original error object or string
  // Additional error details
}
```

### Validation Result

```javascript
{
  valid: true|false,
  message: 'Validation message if invalid',
  error: errorObject // Original error object or string if applicable
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
window.addEventListener('config-loaded', (event) => {
  const config = event.detail;
  // Handle configuration
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

1. **Shortcuts**: Different modifier keys on macOS and Windows.
2. **File Paths**: Different path formats on different platforms.
3. **Script Execution**: AppleScript only on macOS, PowerShell only on Windows.
4. **Terminal Commands**: Different terminal commands on different platforms.

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
