# Local Data Storage

Toast stores local data under Electron's `app.getPath('userData')`. Default packaged locations are:

- macOS: `~/Library/Application Support/Toast/`
- Windows: `%APPDATA%\Toast\`
- Linux: `~/.config/Toast/`

`CONFIG_SUFFIX` selects separate configuration, credential, and OAuth state files for an isolated
environment. For example, `CONFIG_SUFFIX=dev` uses `config-dev.json`, `auth-tokens-dev.json`, and
`auth-state-dev.json`. The unsuffixed names apply when the variable is empty.

## Files and Ownership

| File | Contents | Owner |
|---|---|---|
| `config.json` | Buttons, snippets, preferences, subscription state, sync snapshots, account recovery copies, action approvals | Shared main-process configuration store |
| `auth-tokens.json` | Access token, refresh token, and local expiry | Credential module (`auth.js`) |
| `auth-state.json` | One-time OAuth callback state and creation time | OAuth API module |
| `logs/toast-app.log` | Application diagnostics | `electron-log` |

Configuration and credential files are plaintext. Configuration writes and credential writes use
owner-only mode (`0600`) on platforms that support it. Buttons, snippets, exports, and recovery
copies can contain private content. See [the schema](schema.md) for field definitions.

## Configuration and Sync

All main-process modules use the same `createConfigStore()` instance so change listeners observe
writes from every caller. `electron-store` reads the file when accessing stored values; the shared
instance does not provide a general in-memory cache of configuration values.

- Renderer windows request changes through narrow preload/IPC methods.
- The sync manager owns cloud reads, revision baselines, merges, and uploads.
- `_sync.baseSnapshot` and `_sync.baseRevision` identify the last acknowledged cloud data.
- `_sync.bootstrapBackup` and `_sync.accountBackups` preserve data during first download and account changes.
- Runtime preferences use the same native application path for local edits, import/reset, and cloud updates.

Do not edit the file while Toast is running. Use [Import and Export](../features/settings.md#import-and-export)
for supported settings transfer. Export excludes credentials, approvals, and sync recovery metadata.

## Profile and Credential Cache

Profiles are cached in main-process memory for five minutes within the current credential session.
Concurrent requests share one API call. Force refresh bypasses the cached result. Restarting the app
requires a fresh profile request; network and authentication failures remain explicit errors.
Legacy `user-profile.json` and `user-settings.json` are no longer read and are removed on logout
from that environment.

Access and refresh tokens are cached in memory after their paired file write succeeds. Refresh
replaces the pair atomically. Logout attempts server revocation, clears memory credentials, and
removes the local token file. See [Cloud Sync](../features/cloud-sync.md) for refresh/error behavior.

## Startup Validation and Recovery

Toast validates the complete configuration before creating windows or starting sync. Supported
legacy subscription values are converted in memory: boolean strings/0/1, numeric page counts,
millisecond expiry values, null expiry, and the `subscribedUntil` alias. The converted file is
saved only after validation succeeds. Compatible files are not rewritten just to start the app.

If the file is unreadable or invalid, Toast displays its path and stops. It does not clear the
file, partially migrate its contents, or disable schema validation.

1. Keep a copy of the file shown in the error before editing it.
2. Correct its JSON and [schema values](schema.md), or restore a known-good copy.
3. Restart Toast. Existing buttons, snippets, and sync recovery copies remain in the file.

Do not delete the file to suppress the error; it may contain offline edits that never reached the cloud.

## Logs and File Errors

The file transport writes info-level messages to `logs/toast-app.log` and rotates files that exceed
5 MiB. The installed transport uses `toast-app.old.log` for its previous-file archive. Development
mode also enables debug messages in the console.

If a read, import, export, or save fails, check permissions and available disk space at the reported
location. Correct invalid JSON or schema values before retrying an import. A failed import leaves
the current configuration intact; clearing the store is not a recovery step.
