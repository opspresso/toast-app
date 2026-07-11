# Toast App Renderer Process API

This document provides documentation for the Toast app's renderer process API.

## Toast Window API (`src/renderer/preload/toast.js`)

The Toast Window API provides an interface for the Toast window to communicate with the main process.

### Configuration Management

```javascript
window.toast.getConfig(key)      // Get configuration
window.toast.saveConfig(config)  // Save configuration changes
window.toast.resetToDefaults(options) // Reset settings (options.keepAppearance: keep appearance settings)
```

> The main process does not currently register an IPC handler for the `resetToDefaults`/`resetAppSettings` channels, so calling this API fails with a "No handler registered" error.

### Action Execution

```javascript
window.toast.executeAction(action)  // Execute an action
```

### Window Control

```javascript
window.toast.hideWindow()             // Hide the Toast window
window.toast.showWindow()             // Show the Toast window
window.toast.showSettings()           // Show the settings window
window.toast.setModalOpen(isOpen)     // Set modal state
window.toast.setAlwaysOnTop(value)    // Set the alwaysOnTop property
window.toast.getWindowPosition()      // Return the current window position
window.toast.hideWindowTemporarily()  // Temporarily hide to show a dialog
window.toast.showWindowAfterDialog(position) // Restore the window after a dialog
```

### Authentication

```javascript
window.toast.initiateLogin()      // Start the login process
window.toast.logout()             // Log out
window.toast.fetchUserProfile()   // Fetch the user profile
window.toast.fetchSubscription()  // Fetch subscription information
window.toast.getUserSettings()    // Get user settings
```

### Utilities

```javascript
window.toast.showOpenDialog(options)  // Open file dialog
window.toast.extractAppIcon(path, forceRefresh) // Extract app icon
window.toast.resolveTildePath(tildePath) // Resolve tilde path
window.toast.invoke(channel, ...args) // IPC invoke restricted to allowed channels (logout, resetToDefaults, resetAppSettings)
window.toast.platform  // Platform information (darwin, win32, linux)
```

### Logging

```javascript
window.toast.log.info(message, ...args)   // Info log
window.toast.log.warn(message, ...args)   // Warning log
window.toast.log.error(message, ...args)  // Error log
window.toast.log.debug(message, ...args)  // Debug log
```

### Event Listeners

```javascript
// Receive configuration updates
window.toast.onConfigUpdated(callback)

// Authentication events
window.toast.onLoginSuccess(callback)      // Login success
window.toast.onLoginError(callback)        // Login error
window.toast.onLogoutSuccess(callback)     // Logout success
window.toast.onAuthStateChanged(callback)  // Authentication state changed
window.toast.onAuthReloadSuccess(callback) // Authentication reload success
```

### Events

```javascript
// Configuration loaded event
window.addEventListener('config-loaded', (event) => {
  const config = event.detail;
  // detail includes: pages, appearance, subscription
});

// Before-window-hide event
window.addEventListener('before-window-hide', () => {
  // Clean up before the window is hidden
});
```

### Usage Examples

```javascript
// Get configuration
const pages = await window.toast.getConfig('pages');
const appearance = await window.toast.getConfig('appearance');

// Execute an action
const result = await window.toast.executeAction({
  action: 'exec',
  command: 'echo "Hello world!"'
});

// Save configuration (e.g. update pages)
await window.toast.saveConfig({ pages: updatedPages });

// Hide the window
window.toast.hideWindow();

// Receive configuration updates
const removeListener = window.toast.onConfigUpdated((config) => {
  console.log('Configuration updated:', config);
});

// Check the platform for platform-specific behavior
if (window.toast.platform === 'darwin') {
  // macOS-specific code
} else if (window.toast.platform === 'win32') {
  // Windows-specific code
}

// Register event listeners
window.addEventListener('config-loaded', (event) => {
  const { pages, appearance, subscription } = event.detail;
  // Update the UI
});

window.addEventListener('before-window-hide', () => {
  // Exit edit mode, save state, etc.
});
```

## Settings Window API (`src/renderer/preload/settings.js`)

The Settings Window API provides an interface for the settings window to communicate with the main process.

### Configuration Management

```javascript
// Configuration CRUD operations
window.settings.getConfig(key) // Get configuration
window.settings.setConfig(key, value) // Set configuration
window.settings.resetConfig() // Reset configuration to defaults
window.settings.importConfig(filePath) // Import configuration from a file
window.settings.exportConfig(filePath) // Export configuration to a file
```

### Action Management

```javascript
// Action testing and validation
window.settings.testAction(action) // Test an action
window.settings.validateAction(action) // Validate an action
```

### Window Control

```javascript
// Window management
window.settings.showToast() // Show the Toast window
window.settings.closeWindow() // Close the settings window
```

### Dialogs

```javascript
// File dialogs
window.settings.showOpenDialog(options) // Show open file dialog
window.settings.showSaveDialog(options) // Show save file dialog
window.settings.showMessageBox(options) // Show message box
```

### App Control

```javascript
// Application control
window.settings.restartApp() // Restart the application
window.settings.quitApp() // Quit the application
```

### Shortcut Control

```javascript
// For shortcut recording
window.settings.temporarilyDisableShortcuts() // Temporarily disable global shortcuts
window.settings.restoreShortcuts() // Restore global shortcuts
```

### Authentication

```javascript
window.settings.initiateLogin()       // Start the login process
window.settings.exchangeCodeForToken(code) // Exchange an authorization code for a token
window.settings.logout()              // Log out
window.settings.fetchUserProfile()    // Fetch the user profile
window.settings.fetchSubscription()   // Fetch subscription information
window.settings.getAuthToken()        // Get the authentication token
window.settings.openUrl(url)          // Open a URL in the external browser
```

### Cloud Sync

```javascript
window.settings.getSyncStatus()       // Get sync status
window.settings.setCloudSyncEnabled(enabled) // Enable/disable cloud sync
window.settings.manualSync(action)    // Manual sync (upload/download/resolve)
window.settings.debugSyncStatus()     // Sync debug information
```

### Text Expansion (Snippets)

```javascript
window.settings.textExpander.getStatus()            // { supported, enabled, running, permissions }
window.settings.textExpander.requestPermission()    // macOS accessibility permission prompt
window.settings.textExpander.openPrivacySettings(section) // Open 'accessibility' | 'inputMonitoring' settings
window.settings.textExpander.setEnabled(enabled)    // Turn the feature on/off (start/stop the hook)
window.settings.textExpander.saveSnippets(snippets) // Save the snippet array + refresh the matcher
window.settings.textExpander.validateSnippet(snippet, existing) // { valid, errors }
```

### Utilities

```javascript
window.settings.extractAppIcon(path, forceRefresh) // Extract app icon
window.settings.resolveTildePath(tildePath) // Resolve tilde path
```

### System Information

```javascript
window.settings.getPlatform()         // Get the platform (darwin, win32, linux)
window.settings.getVersion()          // Get the application version
window.settings.checkLatestVersion()  // Check the latest version
```

### Update Management

```javascript
// Check for and download updates
window.settings.checkForUpdates(silent) // Check for updates
window.settings.downloadUpdate()        // Download update
window.settings.downloadAutoUpdate()    // Download auto-update (download after confirmation)
window.settings.downloadManualUpdate()  // Download manual update

// Install updates
window.settings.installUpdate()         // Install update
window.settings.installAutoUpdate()     // Install auto-update
```

### Logging

```javascript
// Log recording
window.settings.log.info(message, ...args) // Record info log
window.settings.log.warn(message, ...args) // Record warning log
window.settings.log.error(message, ...args) // Record error log
window.settings.log.debug(message, ...args) // Record debug log
```

### Events

```javascript
// Configuration events
window.addEventListener('config-loaded', (event) => {
  const config = event.detail;  // Full configuration object
});

window.addEventListener('config-updated', (event) => {
  const config = event.detail;  // Updated configuration
});

// Authentication events
window.addEventListener('login-success', (event) => {
  const data = event.detail;  // Login success data
});

window.addEventListener('login-error', (event) => {
  const data = event.detail;  // Login error information
});

window.addEventListener('logout-success', (event) => {
  const data = event.detail;  // Logout information
});

window.addEventListener('auth-state-changed', (event) => {
  const data = event.detail;  // Authentication state change
});

// Sync events
window.addEventListener('settings-synced', (event) => {
  const data = event.detail;  // Sync result
});

// Update events
window.addEventListener('checking-for-update', (event) => {
  // Checking for updates
});

window.addEventListener('update-available', (event) => {
  const updateInfo = event.detail.info;  // Update information
});

window.addEventListener('update-not-available', (event) => {
  // No update available
});

window.addEventListener('download-started', (event) => {
  // Download started
});

window.addEventListener('download-progress', (event) => {
  const { percent, bytesPerSecond } = event.detail.progress;
});

window.addEventListener('update-downloaded', (event) => {
  // Update download complete
});

window.addEventListener('install-started', (event) => {
  // Installation started
});

window.addEventListener('update-error', (event) => {
  const error = event.detail.error;  // Error information
});

// Tab selection event
window.addEventListener('select-settings-tab', (event) => {
  const tabName = event.detail;  // Name of the tab to select
});

// Protocol data event
window.addEventListener('protocol-data', (event) => {
  const url = event.detail;  // Protocol URL
});
```

### Usage Examples

```javascript
// Configuration management
const config = await window.settings.getConfig();
await window.settings.setConfig('globalHotkey', 'Alt+Space');

// Action testing
const result = await window.settings.testAction({
  action: 'exec',
  command: 'echo "Hello world!"'
});

if (result.success) {
  console.log('Action test succeeded:', result.stdout);
} else {
  console.error('Action test failed:', result.error);
}

// File dialog
const openResult = await window.settings.showOpenDialog({
  properties: ['openFile'],
  filters: [
    { name: 'JSON Files', extensions: ['json'] },
    { name: 'All Files', extensions: ['*'] }
  ]
});

if (!openResult.canceled) {
  const filePath = openResult.filePaths[0];
  await window.settings.importConfig(filePath);
}

// Save dialog
const saveResult = await window.settings.showSaveDialog({
  defaultPath: 'toast-config.json',
  filters: [
    { name: 'JSON Files', extensions: ['json'] }
  ]
});

if (!saveResult.canceled) {
  await window.settings.exportConfig(saveResult.filePath);
}

// Shortcut recording
await window.settings.temporarilyDisableShortcuts();
// Record the shortcut here...
await window.settings.restoreShortcuts();

// Message box
await window.settings.showMessageBox({
  type: 'info',
  title: 'Information',
  message: 'Settings have been saved.',
  buttons: ['OK']
});

// Check for updates
const updateResult = await window.settings.checkForUpdates(false);
if (updateResult.hasUpdate) {
  console.log(`New version available: ${updateResult.versionInfo.latest}`);

  // Download the update
  const downloadResult = await window.settings.downloadUpdate();
  if (downloadResult.success) {
    // Confirm before installing
    const installConfirm = await window.settings.showMessageBox({
      type: 'question',
      title: 'Install Update',
      message: 'Do you want to install the update now?',
      buttons: ['Install', 'Later']
    });

    if (installConfirm.response === 0) {
      await window.settings.installUpdate();
    }
  }
}

// Logging
window.settings.log.info('Settings window opened');
window.settings.log.warn('Configuration file is outdated', { version: '1.0.0' });
window.settings.log.error('Failed to save settings', error);

// Event listeners
window.addEventListener('config-loaded', (event) => {
  const config = event.detail;
  // Initialize the UI
  initializeUI(config);
});

window.addEventListener('update-available', (event) => {
  const updateInfo = event.detail.info;
  showUpdateNotification(updateInfo);
});

window.addEventListener('download-progress', (event) => {
  const { percent, bytesPerSecond } = event.detail.progress;
  updateProgressBar(percent);
  updateDownloadSpeed(bytesPerSecond);
});
```

## Common API Patterns

### Result Object

Every API call returns a consistent result object:

```javascript
// Success result
{
  success: true,
  message: 'The operation completed successfully',
  // Action-specific extra properties: exec/script include stdout·stderr, chain includes a results array
}

// Error result
{
  success: false,
  message: 'Error message',
  error: 'Error details', // Error details
  // Other error-related properties
}
```

### Dialog Options

#### Open File Dialog

```javascript
const options = {
  title: 'Select a file',
  defaultPath: '/Users/username/Documents',
  buttonLabel: 'Select',
  filters: [
    { name: 'JSON Files', extensions: ['json'] },
    { name: 'All Files', extensions: ['*'] }
  ],
  properties: [
    'openFile',        // Select a file
    'openDirectory',   // Select a directory
    'multiSelections', // Multiple selection
    'showHiddenFiles'  // Show hidden files
  ]
};
```

#### Save File Dialog

```javascript
const options = {
  title: 'Save file',
  defaultPath: '/Users/username/Documents/config.json',
  buttonLabel: 'Save',
  filters: [
    { name: 'JSON Files', extensions: ['json'] }
  ]
};
```

#### Message Box

```javascript
const options = {
  type: 'info',        // 'none', 'info', 'error', 'question', 'warning'
  title: 'Title',
  message: 'Message content',
  detail: 'Detailed description',
  buttons: ['OK', 'Cancel'],
  defaultId: 0,        // Default button index
  cancelId: 1          // Cancel button index
};
```

## Security Considerations

1. **Context isolation**: All APIs are safely exposed through contextBridge
2. **Input validation**: All input is validated in the main process
3. **Permission restriction**: Only the necessary APIs are exposed to the renderer process
4. **Sandbox**: The renderer process runs in a sandboxed environment

## Error Handling

1. **Promise-based**: All asynchronous APIs return a Promise
2. **Consistent error format**: All errors are returned in a standardized format
3. **User-friendly messages**: Error messages are written to be easy for users to understand
4. **Logging**: All errors are automatically recorded in the log

## Platform-Specific Behavior

### macOS (`darwin`)
- Uses the Cmd key modifier
- Supports .app application bundles
- Supports AppleScript execution

### Windows (`win32`)
- Uses the Ctrl key modifier
- Supports .exe executables
- Supports PowerShell script execution

### Linux (`linux`)
- Uses the Ctrl key modifier
- Package manager integration
- Supports Bash script execution

## Performance Optimization

1. **Asynchronous processing**: All API calls are processed asynchronously
2. **Caching**: Frequently used data is cached in memory
3. **Batch processing**: Multiple operations are batched efficiently
4. **Resource management**: Optimizes memory and resource usage
