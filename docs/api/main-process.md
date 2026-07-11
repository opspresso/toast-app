# Toast App Main Process API

This document provides API documentation for the main process modules of the Toast app.

## Config Module (`src/main/config.js`)

The config module handles configuration management using electron-store.

### Functions

```javascript
/**
 * Create the configuration store
 * @returns {Store} Configuration store instance
 */
function createConfigStore()

/**
 * Reset configuration to defaults
 * @param {Store} config - Configuration store instance
 */
function resetToDefaults(config)

/**
 * Seed the default !email snippet on first run (once per device, preserving existing snippets)
 * @param {Store} config - Configuration store instance
 * @param {string} [loginEmail] - Login email (defaults to email@toast.sh if absent)
 */
function seedDefaultSnippets(config, loginEmail)

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

/**
 * Sanitize subscription data (remove unnecessary fields)
 * @param {Object} subscription - Subscription data
 * @returns {Object} Sanitized subscription data
 */
function sanitizeSubscription(subscription)

/**
 * Get the device ID (generate one if absent)
 * @returns {string} Device ID
 */
function getDeviceId()

/**
 * Generate a data hash (for sync conflict detection)
 * @param {Object} data - Data to hash
 * @returns {string} Hash string
 */
function generateDataHash(data)

/**
 * Update sync metadata
 * @param {Store} config - Configuration store instance
 * @param {Object} metadata - Metadata object
 */
function updateSyncMetadata(config, metadata)

/**
 * Mark as locally modified
 * @param {Store} config - Configuration store instance
 * @param {string} deviceId - Device ID
 */
function markAsModified(config, deviceId)

/**
 * Mark as synced
 * @param {Store} config - Configuration store instance
 * @param {string} deviceId - Device ID
 */
function markAsSynced(config, deviceId)

/**
 * Check for unsynced changes
 * @param {Store} config - Configuration store instance
 * @returns {boolean} Whether unsynced changes exist
 */
function hasUnsyncedChanges(config)

/**
 * Mark as conflicted
 * @param {Store} config - Configuration store instance
 */
function markAsConflicted(config)

/**
 * Get sync metadata
 * @param {Store} config - Configuration store instance
 * @returns {Object} Sync metadata
 */
function getSyncMetadata(config)
```

### Usage Example

```javascript
const { createConfigStore, resetToDefaults } = require('./main/config');

// Create the configuration store
const config = createConfigStore();

// Get a configuration value
const globalHotkey = config.get('globalHotkey');

// Get all pages
const pages = config.get('pages');

// Set a configuration value
config.set('globalHotkey', 'Alt+Space');

// Reset to defaults
resetToDefaults(config);
```

## Logger Module (`src/main/logger.js`)

The logger module manages application logging using electron-log.

### Functions

```javascript
/**
 * Create a logger for a specific module
 * @param {string} namespace - Namespace for the logger
 * @returns {Object} Logger instance
 */
function createLogger(namespace)

/**
 * Handle renderer process logging via IPC
 * @param {string} level - Log level
 * @param {string} message - Log message
 * @param {...any} args - Additional log arguments
 * @returns {boolean} Success status
 */
function handleIpcLogging(level, message, ...args)
```

The logger object returned by `createLogger(namespace)` provides the `info`, `warn`, `error`, `debug`, `verbose`, and `silly` methods.

### Usage Example

```javascript
const { createLogger } = require('./main/logger');

// Create a module-specific logger
const logger = createLogger('MyModule');

// Record log messages
logger.info('Info message');
logger.warn('Warning message', { additionalData: 'details' });
logger.error('An error occurred', error);
logger.debug('Debug info', { value: 42 });
```

## Updater Module (`src/main/updater.js`)

The updater module manages automatic application updates using electron-updater.

### Functions

```javascript
/**
 * Initialize the auto-updater
 * @param {Object} windows - Application windows object
 */
function initAutoUpdater(windows)

/**
 * Check for updates
 * @param {boolean} [silent=false] - If true, check without notifying the user
 * @returns {Promise<Object>} Update check result
 */
async function checkForUpdates(silent)

/**
 * Download the update
 * @returns {Promise<Object>} Download result
 */
async function downloadUpdate()

/**
 * Install the downloaded update
 * @returns {Promise<Object>} Install result
 */
async function installUpdate()
```

### Usage Example

```javascript
const { initAutoUpdater, checkForUpdates } = require('./main/updater');

// Initialize the auto-updater
initAutoUpdater(windows);

// Check for updates
const result = await checkForUpdates(false);
if (result.success && result.hasUpdate) {
  console.log(`New version available: ${result.versionInfo.latest}`);
}
```

## Executor Module (`src/main/executor.js`)

The executor module handles action execution. The sequential execution logic for the `chain` action is separated into `src/main/actions/chain.js`, and `executor.js` dispatches to the appropriate handler based on the `action.action` value.

### Functions

```javascript
/**
 * Execute an action based on its type
 * @param {Object} action - Action configuration
 * @returns {Promise<Object>} Result object
 */
async function executeAction(action)

/**
 * Validate an action without executing it
 * @param {Object} action - Action configuration
 * @returns {Promise<Object>} Validation result
 */
async function validateAction(action)
```

### Supported Action Types

- `application`: Launch an application
- `exec`: Run a shell command
- `open`: Open a URL, file, or folder
- `script`: Run a custom script
- `chain`: Execute a series of actions sequentially

### Usage Example

```javascript
const { executeAction, validateAction } = require('./main/executor');

// Validate an action
const validation = await validateAction({
  action: 'exec',
  command: 'echo "Hello world!"'
});

if (validation.valid) {
  // Execute the action
  const result = await executeAction({
    action: 'exec',
    command: 'echo "Hello world!"'
  });

  console.log(result.success, result.message);
}
```

## Shortcuts Module (`src/main/shortcuts.js`)

The shortcuts module handles global keyboard shortcuts.

### Functions

```javascript
/**
 * Register global shortcuts
 * @param {Object} config - Configuration store
 * @param {Object} windows - Object containing application windows
 * @returns {boolean} Success status
 */
function registerGlobalShortcuts(config, windows)

/**
 * Position the Toast window according to configuration
 * @param {BrowserWindow} toastWindow - Toast window
 * @param {Object} [config] - Configuration store
 */
function positionToastWindow(toastWindow, config)

/**
 * Unregister all global shortcuts
 */
function unregisterGlobalShortcuts()

/**
 * Check whether a shortcut is registered
 * @param {string} accelerator - Shortcut to check
 * @returns {boolean} Whether the shortcut is registered
 */
function isShortcutRegistered(accelerator)
```

### Position Options

- `center`: Center of the screen
- `top`: Top center of the screen
- `bottom`: Bottom center of the screen
- `cursor`: Near the cursor position

### Usage Example

```javascript
const { registerGlobalShortcuts, unregisterGlobalShortcuts } = require('./main/shortcuts');

// Register global shortcuts
registerGlobalShortcuts(config, windows);

// Unregister global shortcuts
unregisterGlobalShortcuts();

// Position the Toast window
positionToastWindow(windows.toast, config);
```

## Tray Module (`src/main/tray.js`)

The tray module handles the system tray icon and menu.

### Functions

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
 * Remove the tray icon
 */
function destroyTray()
```

### Usage Example

```javascript
const { createTray, destroyTray } = require('./main/tray');

// Create the tray icon
const tray = createTray(windows);

// Remove the tray icon
destroyTray();
```

## Windows Module (`src/main/windows.js`)

The windows module handles window creation and management.

### Functions

```javascript
/**
 * Create the Toast popup window
 * @param {Object} config - Configuration store
 * @returns {BrowserWindow} Toast window
 */
function createToastWindow(config)

/**
 * Create the settings window
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
 * Show the settings window
 * @param {Object} config - Configuration store
 * @param {string} [tabName] - Name of the tab to select initially (optional)
 * @returns {BrowserWindow} Settings window
 */
function showSettingsWindow(config, tabName)

/**
 * Position the settings window on the display where the Toast window is shown
 * @param {BrowserWindow} settingsWindow - Settings window
 */
function positionSettingsWindowOnToastDisplay(settingsWindow)

/**
 * Close all windows
 */
function closeAllWindows()
```

The `windows` object (see `toast`, `settings`) is also exported so other modules can access it directly.

### Window Size Options

- `small`: 500x350 pixels
- `medium`: 700x500 pixels
- `large`: 800x550 pixels

### Usage Example

```javascript
const { createToastWindow, showToastWindow, hideToastWindow } = require('./main/windows');

// Create the Toast window
const toastWindow = createToastWindow(config);

// Show the Toast window
showToastWindow(config);

// Hide the Toast window
hideToastWindow();
```

## IPC Module (`src/main/ipc.js`)

`src/main/ipc.js` is an orchestrator that coordinates IPC handler registration, while the actual handlers are split across domain-specific submodules under `src/main/ipc/`.

| Submodule | Channels Handled |
|-----------|------------------|
| `ipc/window.js` | Window show/hide, modal state, alwaysOnTop, app restart/quit |
| `ipc/config.js` | Config CRUD, import/export, reset |
| `ipc/actions.js` | Action execution/validation/testing |
| `ipc/auth.js` | Login/logout, tokens, profile/subscription lookup |
| `ipc/cloud-sync.js` | Sync status, manual sync, enabling cloud sync |
| `ipc/snippets.js` | Text expansion status/permission/toggle, snippet save & validation (`text-expander:get-status`, `text-expander:request-permission`, `text-expander:open-privacy-settings`, `text-expander:set-enabled`, `text-expander:save-snippets`, `text-expander:validate-snippet`) |
| `ipc/updater.js` | Update check/download/install |
| `ipc/system.js` | Open URL, dialogs, logging, icon extraction, path conversion, temporary shortcut control |

### Functions

```javascript
/**
 * Set up IPC handlers (calls the setup functions of the submodules)
 * @param {Object} windows - Object containing application windows
 */
function setupIpcHandlers(windows)
```

### IPC Channels

#### Action-Related

| Channel | Type | Description |
|---------|------|-------------|
| `execute-action` | handle | Execute an action |
| `validate-action` | handle | Validate an action |
| `test-action` | handle | Test an action (validate then execute) |

#### Config-Related

| Channel | Type | Description |
|---------|------|-------------|
| `get-config` | handle | Get a configuration value (by key or the whole config) |
| `set-config` | handle | Set a configuration value |
| `save-config` | handle | Save specific configuration changes |
| `reset-config` | handle | Reset configuration to defaults |
| `import-config` | handle | Import configuration from a file |
| `export-config` | handle | Export configuration to a file |

#### Window-Related

| Channel | Type | Description |
|---------|------|-------------|
| `show-toast` | on | Show the Toast window |
| `hide-toast` | on | Hide the Toast window |
| `show-window` | handle | Show the Toast window (handle version) |
| `show-settings` | on | Show the settings window |
| `show-settings-tab` | on | Show the settings window with a specific tab selected |
| `close-settings` | on | Close the settings window |
| `modal-state-changed` | on | Notify of modal state changes |
| `is-modal-open` | handle | Check whether a modal is open |
| `set-always-on-top` | handle | Set the window's alwaysOnTop property |
| `get-window-position` | handle | Return the current window position |
| `hide-window-temporarily` | handle | Temporarily disable alwaysOnTop to show a dialog |
| `show-window-after-dialog` | handle | Restore alwaysOnTop after a dialog closes |

#### Application-Related

| Channel | Type | Description |
|---------|------|-------------|
| `restart-app` | on | Restart the application |
| `quit-app` | on | Quit the application |
| `get-app-version` | handle | Get the app version |
| `open-url` | handle | Open a URL in the external browser |

#### Authentication-Related

| Channel | Type | Description |
|---------|------|-------------|
| `initiate-login` | handle | Start the login process |
| `exchange-code-for-token` | handle | Exchange an authorization code for a token |
| `logout` | handle | Log out |
| `fetch-user-profile` | handle | Fetch user profile information |
| `get-user-settings` | handle | Get user settings information |
| `fetch-subscription` | handle | Fetch subscription information |
| `get-auth-token` | handle | Return the current authentication token |

#### Cloud Sync-Related

| Channel | Type | Description |
|---------|------|-------------|
| `get-sync-status` | handle | Get the sync status |
| `set-cloud-sync-enabled` | handle | Enable/disable cloud sync |
| `manual-sync` | handle | Manual sync (upload/download/resolve) |
| `debug-sync-status` | handle | Sync status debug info |
| `settings-synced` | on | Forward the settings-sync-complete event |

#### Shortcut-Related

| Channel | Type | Description |
|---------|------|-------------|
| `temporarily-disable-shortcuts` | handle | Temporarily disable global shortcuts for recording |
| `restore-shortcuts` | handle | Restore global shortcuts after recording |

#### Dialog-Related

| Channel | Type | Description |
|---------|------|-------------|
| `show-open-dialog` | handle | Show a file-open dialog |
| `show-save-dialog` | handle | Show a file-save dialog |
| `show-message-box` | handle | Show a message box |

#### Update-Related

| Channel | Type | Description |
|---------|------|-------------|
| `check-for-updates` | handle | Check for updates (supports a silent option) |
| `check-latest-version` | handle | Check the latest version |
| `download-update` | handle | Download the update |
| `download-auto-update` | handle | Download an auto-update (download after confirmation) |
| `download-manual-update` | handle | Download a manual update |
| `install-update` | handle | Install the update |
| `install-auto-update` | handle | Install an auto-update |

#### Logging-Related

| Channel | Type | Description |
|---------|------|-------------|
| `log-info` | handle | Record an info log message |
| `log-warn` | handle | Record a warning log message |
| `log-error` | handle | Record an error log message |
| `log-debug` | handle | Record a debug log message |

#### Utility-Related

| Channel | Type | Description |
|---------|------|-------------|
| `extract-app-icon` | handle | Extract an icon from an application path |
| `resolve-tilde-path` | handle | Convert a tilde path to an absolute path |

#### Text Expansion (Snippets)-Related

| Channel | Type | Description |
|---------|------|-------------|
| `text-expander:get-status` | handle | Query text expansion status and permission |
| `text-expander:request-permission` | handle | Request macOS accessibility permission |
| `text-expander:open-privacy-settings` | handle | Open the system privacy settings |
| `text-expander:set-enabled` | handle | Enable/disable text expansion |
| `text-expander:save-snippets` | handle | Save the snippet list |
| `text-expander:validate-snippet` | handle | Validate a snippet keyword |

### Usage Example

```javascript
const { setupIpcHandlers } = require('./main/ipc');

// Set up IPC handlers
setupIpcHandlers(windows);
```

## Auth Manager Module (`src/main/auth-manager.js`)

The auth manager module is the entry point for runtime authentication handling. All authentication-related IPC in `src/main/ipc.js` is delegated to this module, which centralizes login/logout handling and forwards events to both the Toast and settings windows. Low-level processing such as token issuance, storage, and refresh is delegated to the lower-level `src/main/auth.js`.

### Functions

```javascript
initiateLogin()                 // Start the login process
exchangeCodeForToken(code)      // Exchange an authorization code for a token
logout()                        // Log out
fetchUserProfile(forceRefresh)  // Fetch the user profile
getUserSettings(forceRefresh)   // Get user settings
fetchSubscription(forceRefresh) // Fetch subscription information
getAccessToken()                // Return the access token
syncSettings(action)            // Sync settings (upload/download/resolve)
updateSyncSettings(enabled)     // Enable/disable cloud sync
```

### Event Notifications

Forwards authentication/sync state to both windows:

```javascript
notifyLoginSuccess(subscription) // Notify of login success
notifyLoginError(errorMessage)   // Notify of a login error
notifyLogout()                   // Notify of logout
notifyAuthStateChange(authState) // Notify of authentication state changes
notifySettingsSynced(configData) // Notify that settings sync is complete
```

Caching of user profile, settings, and subscription information is handled by `src/main/user-data-manager.js`.

## Auth Module (`src/main/auth.js`)

The auth module is the low-level layer for OAuth 2.0-based user authentication, handling token issuance, storage, and refresh. The runtime entry point is `auth-manager.js`, and this module is generally used through `auth-manager.js` rather than called directly.

### Functions

```javascript
/**
 * Start the login process (OAuth authentication in the external browser)
 * @returns {Promise<boolean>} true on success
 */
async function initiateLogin()

/**
 * Exchange an authorization code for a token
 * @param {string} code - Authorization code
 * @returns {Promise<Object>} Token information
 */
async function exchangeCodeForToken(code)

/**
 * Exchange an authorization code for a token and update subscription information
 * @param {string} code - Authorization code
 * @returns {Promise<Object>} Token and subscription information
 */
async function exchangeCodeForTokenAndUpdateSubscription(code)

/**
 * Fetch user profile information
 * @returns {Promise<Object>} User profile
 */
async function fetchUserProfile()

/**
 * Fetch subscription information
 * @returns {Promise<Object>} Subscription information
 */
async function fetchSubscription()

/**
 * Log out
 * @returns {Promise<boolean>} true on success, false on failure
 */
async function logout()

/**
 * Check whether a valid token exists
 * @returns {Promise<boolean>} Whether the token is valid
 */
async function hasValidToken()

/**
 * Get the access token (auto-refresh if needed)
 * @returns {Promise<string|null>} Access token
 */
async function getAccessToken()

/**
 * Force-refresh the access token
 * @returns {Promise<string|null>} New access token
 */
async function refreshAccessToken()

/**
 * Update page group settings based on subscription status
 * @param {Object} subscription - Subscription information
 * @returns {Promise<void>}
 */
async function updatePageGroupSettings(subscription)

/**
 * Register the protocol handler (`toast-app://` scheme)
 */
function registerProtocolHandler()

/**
 * Handle a protocol redirect (e.g., `toast-app://auth?code=...`)
 * @param {string} url - Received protocol URL
 * @returns {Promise<Object>} Processing result
 */
async function handleAuthRedirect(url)
```

### Usage Example

```javascript
const auth = require('./main/auth');

// Start login
await auth.initiateLogin();

// Check token validity
if (await auth.hasValidToken()) {
  const profile = await auth.fetchUserProfile();
  console.log('User:', profile.name);
}

// Log out
await auth.logout();
```

## Cloud Sync Module (`src/main/cloud-sync.js`)

The cloud sync module handles server synchronization of settings data.

### Functions

```javascript
/**
 * Initialize cloud sync
 * @param {Object} authManagerInstance - Auth manager instance
 * @param {Object} _userDataManagerInstance - User data manager instance (reserved)
 * @param {Object} [configStoreInstance] - Configuration store (created if absent)
 * @returns {Object} Sync management object
 */
function initCloudSync(authManagerInstance, _userDataManagerInstance, configStoreInstance)

/**
 * Replace the auth manager
 * @param {Object} manager - Auth manager instance
 */
function setAuthManager(manager)

/**
 * Start periodic sync
 */
function startPeriodicSync()

/**
 * Stop periodic sync
 */
function stopPeriodicSync()

/**
 * Upload settings to the server
 * @returns {Promise<Object>} Upload result
 */
async function uploadSettings()

/**
 * Download settings from the server
 * @returns {Promise<Object>} Download result
 */
async function downloadSettings()

/**
 * Run a sync (including conflict resolution)
 * @param {string} [action='resolve'] - 'upload' | 'download' | 'resolve'
 * @returns {Promise<Object>} Sync result
 */
async function syncSettings(action)

/**
 * Enable / disable cloud sync
 * @param {boolean} enabled
 */
function updateCloudSyncSettings(enabled)
```

### Sync Settings

- **Periodic sync interval**: 15 minutes (`SYNC_INTERVAL_MS`)
- **Debounce time**: 5 seconds (`SYNC_DEBOUNCE_MS`)
- **Max retry count**: 3 (`MAX_RETRY_COUNT`)
- **Retry exceptions**: Uploads where both `pages` and `snippets` are empty are skipped (no retry); `400` is not retried; `409` merges with server data and re-uploads (`reconcileStaleUpload`)

### Usage Example

```javascript
const { initCloudSync, syncSettings, updateCloudSyncSettings } = require('./main/cloud-sync');

// Initialize cloud sync
const syncManager = initCloudSync(authManager, userDataManager, config);

// Manual sync (resolve: automatically resolve conflicts)
const result = await syncSettings('resolve');
console.log('Sync result:', result);

// Disable cloud sync
updateCloudSyncSettings(false);
```

## Conflict Resolver Module (`src/main/cloud-sync/conflict-resolver.js`)

A pure-logic module responsible for sync conflict analysis and per-section merge policies. `cloud-sync.js` uses this module when resolving conflicts.

```javascript
/**
 * Analyze conflicts and decide a resolution strategy (upload_local / download_server / merge_required / no_action)
 * @param {Object} localMeta - Local metadata
 * @param {Object} serverMeta - Server metadata
 * @param {boolean} hasLocalChanges - Whether local changes exist
 * @returns {Object} { action, reason }
 */
function analyzeConflict(localMeta, serverMeta, hasLocalChanges)

/**
 * Merge pages — local-first (preserves user edits).
 * If a local page's buttons are empty and a server page with the same name has buttons, keep the server version
 */
function mergePages(localPages, serverPages)

/**
 * Merge snippets — local-first by keyword, preserving server-only keywords at the end
 */
function mergeSnippets(localSnippets, serverSnippets)

/**
 * Merge appearance settings — local values take priority
 */
function mergeAppearance(localAppearance, serverAppearance)

/**
 * Merge advanced settings — local values take priority
 */
function mergeAdvanced(localAdvanced, serverAdvanced)
```

## Action Approval Module (`src/main/action-approval.js`)

Protects `exec`/`script` actions downloaded via cloud sync, and `application` actions that carry execution arguments (`applicationParameters`), so they run only after a one-time user approval per device. Actions created or edited locally are trusted, and only dangerous actions that first appear in remote data are placed in the approval queue. The fingerprints in the trust list and pending list are stored under the config `security` key and are **device-local only** (not uploaded to the cloud).

```javascript
/**
 * Compute a stable fingerprint for a dangerous action (exec/script, or application with arguments), hashing only fields that affect execution
 * @returns {string|null} sha256 hex, or null for a non-dangerous action
 */
function computeFingerprint(action)

/**
 * Initialize the approval module. On first run, seed all existing dangerous actions from the local config into the trust list
 * @param {Object} configStore
 * @param {Object} [windows] - Window reference to use as the dialog parent
 */
function initializeApprovals(configStore, windows)

/**
 * Register dangerous actions from remote sync data into the approval queue (called just before saving)
 */
function recordRemoteChanges(configStore, incomingPages)

/**
 * Trust the dangerous actions in the current config on local save (excluding pending fingerprints)
 */
function trustCurrentConfig(configStore)

/**
 * Check approval just before execution. Only actions in the pending list show a confirmation dialog; all others are allowed
 * @returns {Promise<{approved: boolean, reason?: string}>}
 */
async function ensureApproved(action)

/**
 * Validate remote pages before saving. Every button action must pass executor validation, and failing entries are removed.
 * Empty-slot buttons (placeholders) are preserved without validation
 * @returns {Promise<Array>} Pages with invalid actions removed
 */
async function sanitizeRemotePages(pages)
```

## Subscription Helper Module (`src/main/subscription.js`)

A module that gathers the decision logic derived from subscription information in one place.

```javascript
/**
 * Whether the subscription is active (accepts all of the active / is_subscribed / isSubscribed aliases)
 */
function isSubscriptionActive(subscription)

/**
 * Calculate the number of page groups based on the subscription (anonymous 1 / authenticated 3 / premium & VIP 9)
 */
function calculatePageGroups(subscription)

/**
 * Normalize an expiry value into a schema-compatible string
 */
function normalizeExpiryString(value)

/**
 * Login-time rule — decide whether to grant and store the cloud_sync feature (granted by default for active subscribers)
 */
function determineCloudSyncFeature(subscription, options)

/**
 * Sync-time rule — re-validate stored subscription data (active subscription + feature flag, or premium/VIP plan)
 */
function isCloudSyncAllowed(subscription, options)
```

## Broadcast Utility (`src/main/broadcast.js`)

A dependency-free helper that sends the same event to both the Toast and settings windows. It is kept separate so it can be used from `auth-manager` and others without pulling in the `windows.js`/IPC dependency graph.

```javascript
/**
 * Send an event to both windows (skipping destroyed windows)
 * @param {Object} windowsRef - { toast, settings }
 * @param {string} channel - IPC channel name
 * @param {*} payload - Event payload
 */
function broadcastToWindows(windowsRef, channel, payload)
```

## API Client Module (`src/main/api/client.js`)

The API client module handles HTTP communication with the Toast server.

### Functions

```javascript
/**
 * Create an API client
 * @param {Object} options - Client options
 * @returns {Object} API client instance
 */
function createApiClient(options)

/**
 * Set the access token
 * @param {string} token - Access token
 */
function setAccessToken(token)

/**
 * Set the refresh token
 * @param {string} token - Refresh token
 */
function setRefreshToken(token)

/**
 * Get the current access token
 * @returns {string|null} Access token
 */
function getAccessToken()

/**
 * Get the current refresh token
 * @returns {string|null} Refresh token
 */
function getRefreshToken()

/**
 * Clear tokens
 */
function clearTokens()

/**
 * Get authentication headers
 * @returns {Object} Authentication headers object
 */
function getAuthHeaders()

/**
 * Execute an authenticated request
 * @param {Function} apiCall - Callback that performs the actual API call (invoked with no arguments, e.g., `() => client.get(url)`)
 * @param {Object} [options] - Options (allowUnauthenticated, defaultValue, isSubscriptionRequest, onUnauthorized)
 * @returns {Promise<Object>} Response data
 */
async function authenticatedRequest(apiCall, options)
```

### API Endpoints

The `ENDPOINTS` values are absolute URLs built from `API_BASE_URL`. `API_BASE_URL = ${TOAST_URL}/api`, and the default value of `TOAST_URL` is `https://app.toast.sh`.

```javascript
const ENDPOINTS = {
  OAUTH_AUTHORIZE: `${API_BASE_URL}/oauth/authorize`,
  OAUTH_TOKEN: `${API_BASE_URL}/oauth/token`,
  OAUTH_REVOKE: `${API_BASE_URL}/oauth/revoke`,
  USER_PROFILE: `${API_BASE_URL}/users/profile`,
  SETTINGS: `${API_BASE_URL}/users/settings`,
  USER_ICONS: `${API_BASE_URL}/users/icons`
};
```

### Usage Example

```javascript
const { createApiClient, authenticatedRequest, ENDPOINTS } = require('./main/api/client');

// Create an API client
const client = createApiClient();

// Execute an authenticated request (the first argument is a callback that performs the actual call)
const profile = await authenticatedRequest(() => client.get(ENDPOINTS.USER_PROFILE));
console.log('User profile:', profile);
```
