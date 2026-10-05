# Cloud Sync

Toast App runs local buttons and text expansion. Toast Web stores each account's cloud
settings and provides the API used by the app and web editors.

## Starting sync

Sign in with an account that has cloud sync access and enable **Cloud Sync** in Settings.
The enabled preference belongs to this device. Login and logout do not change that preference.

- On login and authenticated app startup, download cloud settings immediately.
- On first sync, use existing cloud sections. Upload local sections only after a successful read.
- Check for changes every 15 minutes while sync is enabled.
- Sync local edits 5 seconds after the most recent change.
- Enabling sync starts an immediate synchronization.
- Disabling sync or logging out cancels timers and prevents late responses from changing local settings.

The synced sections are `pages` (buttons), `snippets`, `appearance`, and `advanced`.
Global shortcuts, text-expander permissions/enabled state, authentication tokens, and action
approvals remain on the device. Remote `exec` and `script` actions still require local approval.

## Conflict and deletion rules

The app stores the last acknowledged cloud data in `_sync.baseSnapshot` and its server version
in `_sync.baseRevision`. It compares that baseline with the local and downloaded settings.
Device clocks do not decide which settings win.

- A change made on only one side is retained, including deletion and empty arrays.
- Independent field and item changes are merged. Item identity uses `id`, then `shortcut`, then `keyword`.
- Conflicting values, delete-versus-edit, incompatible reorders, or ambiguous lists require a user choice.
- **Sync Now** attempts the same safe merge as automatic synchronization.
- **Upload to Server** chooses the local settings. **Download from Server** chooses cloud settings.
- Changes made during a network request remain pending until acknowledged by another sync.

When migrating old sync metadata that lacks a baseline, unsynced local work is retained and
requires an explicit upload or download choice. Unmodified installations can establish a new baseline.

On first download, the previous local copy is retained in `_sync.bootstrapBackup`. When changing
accounts, `_sync.accountBackups` stores the previous account's local settings and baseline. Returning
to that account restores its pending edits before merging with the cloud. Another account never receives
the previous account's settings. These recovery copies stay in the device's `config.json`; quit Toast before
manually editing that file. Standard Export exports the currently active settings, not recovery metadata.

## API and errors

`GET /api/users/settings` returns `{ success: true, data: { revision, ...settings } }`.
The app sends `baseRevision` in each PUT. Toast Web conditionally stores the update only when that
revision still matches, increments it, and returns the acknowledged settings.

- `409`: read the new revision and merge again, up to three attempts. A content conflict needs a choice; Settings displays its cause.
- `400`, `401`, `403`, `428`: correct the data, login/access, or client/server version before retrying.
- Network errors, `429`, and server errors: retain local changes and retry with bounded backoff.
- Invalid cloud data: report failure and retain the complete local settings; do not silently drop buttons.

A `401` forces one token refresh even if the local expiry has not elapsed. Concurrent requests share
the refresh operation; retries stay bound to the original login session. A `500` after refresh remains
a server error and does not discard the session. Credentials are published in memory only after the
token file is saved.

Both repositories must be updated together. Old apps without `baseRevision` receive `428` on upload.
New apps require a server response with `revision`; an older server is reported as incompatible.
A missing settings item is distinct from a failed read: only a successful empty-account read permits initial upload.

## Implementation and verification

`src/main/cloud-sync.js` owns the sync lifecycle and all settings writes. `src/main/api/sync.js`
only handles transport and response validation. `src/main/cloud-sync/merge.js` contains the pure
three-way merge. A single operation covers read, merge, and conditional upload; timers do not start
competing uploads or downloads.

```bash
npm test -- --runInBand
npm run lint
```

Regression tests cover initial download, empty accounts, periodic sync, debounce, complete deletion,
offline changes, concurrent edits, request-time edits, account switching, logout/disable races,
legacy migration, retries, and timer/listener cleanup. The related server contract is documented in
Toast Web's `docs/features/CLOUD_SYNC.md`.
