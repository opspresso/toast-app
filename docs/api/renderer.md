# Renderer API

The preload scripts expose `window.toast` in the launcher and `window.settings` in Settings.
These context-bridge objects are immutable. Use their named methods; keep UI state outside them.
The authoritative definitions are [toast.js](../../src/renderer/preload/toast.js) and
[settings.js](../../src/renderer/preload/settings.js).

## Edit buttons

`window.toast.getConfig()` returns the current settings and `authSessionVersion`.
Capture the original pages and session when editing begins. Keep that baseline unchanged
until the save succeeds.

```javascript
const config = await window.toast.getConfig();
if (!config) throw new Error('Could not read settings');
const base = { pages: structuredClone(config.pages), session: config.authSessionVersion };
const draft = structuredClone(config.pages);
// Apply the user's edit to draft.
const result = await window.toast.savePages(draft, base);
if (!result.success) {
  // Retain the draft and display result.error. Reopen current data to resolve a conflict.
}
```

The main process validates pages, merges unrelated edits, and rejects conflicting changes
or a changed account. A late save reply must not replace a newer renderer snapshot.
`saveConfig`, `resetToDefaults`, and arbitrary `invoke` are not exposed by this bridge.

## Edit Snippets

Use `window.settings.textExpander.changeSnippet(change)` for one operation:

| Operation | Payload |
|---|---|
| Add | `{ type: 'add', snippet }` |
| Update | `{ type: 'update', original, snippet }` |
| Delete | `{ type: 'delete', original }` |

`original` is the exact snippet captured when editing began. The main process applies the
change to its current list, preserves unrelated edits, and returns `{ success, snippets }`.
A stale original returns a conflict; keep the form draft and display the error. New items
receive an ID in the main process. Legacy items without IDs are matched by keyword.

The same `textExpander` object provides `getStatus()`, `requestPermission()`,
`openPrivacySettings(section)`, and `setEnabled(enabled)`. Supported privacy sections are
`accessibility` and `inputMonitoring`. Permission and enabled state stay on this device;
only snippet content is synchronized. See [Snippets](../features/snippets.md).

## Save preferences

`window.settings` exposes `getConfig(key)`, `setConfig(key, value)`, `resetConfig()`,
`importConfig(filePath)`, and `exportConfig(filePath)`.

`setConfig` accepts `globalHotkey`, `appearance`, and `advanced` paths. Pass `null` as the key
and an object of these fields for a single batch write. It cannot overwrite account,
subscription, security, or sync metadata. Use the guarded edit APIs for pages and snippets.

Write, reset, and import/export methods return booleans. `false` means saving or applying a
native preference failed. A native failure can occur after the value reached disk. Reload
the stored values, preserve newer broadcasts, restore controls, and display the error.

Controls save immediately. Hotkey recording waits for shortcut suspension before recording.
Escape cancels recording; Clear outside recording saves an empty shortcut. Await restoration
before starting another recording. Main also restores shortcuts if the settings renderer closes.

Settings initializes each tab once. Tab switching changes visibility; configuration events
update both visible and hidden controls without rebuilding unchanged snippet drafts.

## Authentication and synchronization

Both bridges provide `initiateLogin()`, `logout()`, `fetchUserProfile(forceRefresh = false)`,
and `fetchSubscription(forceRefresh = false)`. Main owns token exchange, refresh, and verified
subscription state. A forced profile read reports failures instead of substituting old data.
Settings additionally exposes `getAuthToken()` and `openUrl(url)`; do not log tokens.

Only Settings exposes the sync controls:

| Method | Contract |
|---|---|
| `getSyncStatus()` | Current enabled, progress, permission, conflict, and error state when the manager exists |
| `setCloudSyncEnabled(enabled)` | Boolean input; returns `{ success, status }` or a failure |
| `manualSync(action)` | `resolve` safely merges; `upload` chooses local; `download` chooses cloud |
| `debugSyncStatus()` | Diagnostic state and token validity, without token values |

See [Cloud Sync](../features/cloud-sync.md) before adding synchronization callers.

## Native operations

| Bridge | Methods |
|---|---|
| Toast actions | `executeAction(action)` |
| Toast window | `hideWindow()`, `showWindow()`, `showSettings()`, `setModalOpen(isOpen)` |
| Toast dialog positioning | `setAlwaysOnTop(value)`, `getWindowPosition()`, `hideWindowTemporarily()`, `showWindowAfterDialog(position)` |
| Both | `showOpenDialog(options)`, `extractAppIcon(path, forceRefresh = false)`, `resolveTildePath(path)` |
| Settings dialogs | `showSaveDialog(options)`, `showMessageBox(options)` |
| Settings window/app | `showToast()`, `closeWindow()`, `restartApp()`, `quitApp()` |
| Platform/version | Toast has `platform`; Settings has `getPlatform()` and `getVersion()` |

Dialog methods return Electron dialog results; check `canceled` before using selected paths.
Icon extraction returns a managed cache path or a failure value. Settings does not expose
`testAction` or `validateAction`.

Settings update methods are `checkForUpdates(silent)`, `checkLatestVersion()`,
`downloadUpdate()`, `downloadAutoUpdate()`, `downloadManualUpdate()`, `installUpdate()`, and
`installAutoUpdate()`. Check `success` before reading update availability or starting the next
step. Installation can restart the app. Both bridges have `log.info`, `log.warn`, `log.error`,
and `log.debug`; omit credentials, snippet content, and private configuration.

## Events and cleanup

Toast subscriptions return a cleanup function:

```javascript
const unsubscribe = window.toast.onConfigUpdated(config => {
  // Apply current fields while preserving active drafts.
});
// Call unsubscribe() when the owner is disposed.
```

Toast also provides `onLoginSuccess`, `onLoginError`, `onLogoutSuccess`, `onAuthStateChanged`,
and `onAuthReloadSuccess`. Its DOM events are `config-loaded` and `before-window-hide`.
The initial configuration event includes pages, appearance, subscription, and session version.

Settings forwards CustomEvents with payload in `event.detail`:

- Configuration: `config-loaded`, `config-updated` (payloads can contain only changed sections).
- Authentication: `login-success`, `login-error`, `logout-success`, `auth-state-changed`.
- Sync: `cloud-sync-status` and `settings-synced`.
- Updates: `checking-for-update`, `update-available`, `update-not-available`, `download-started`,
  `download-progress`, `update-downloaded`, `install-started`, `update-error`.
- Navigation: `select-settings-tab`; protocol forwarding: `protocol-data`.

Initialize event listeners once and remove temporary listeners when their operation ends.
Discard responses that belong to an earlier account or closed editor.

## Modal lifecycle

`toast/modules/modal-state.js` tracks the active edit and visible modals. Icon extraction,
file dialogs, and previews apply results only while the originating edit and relevant fields
remain current. Closing the editor or switching authentication sessions invalidates pending work.

Each confirmation has one result. Escape, backdrop clicks, or a replacement confirmation
resolve the old request as `false` and remove its listeners. Only the current confirmation
can resolve `true`. Focus stays in the active modal; launcher shortcuts and page switching
remain disabled until all modals close.
