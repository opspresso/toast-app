# App and Web Integration

Toast App executes local buttons and text expansion. Toast Web provides authentication,
subscription checks, cloud settings, and web editors. The app remains useful offline with
its stored buttons and snippets; a failed account read does not grant cloud access.

## Connect a development instance

1. Install dependencies using the Node version in `.nvmrc`.
2. Configure `CLIENT_ID`, `CLIENT_SECRET`, and `TOAST_URL` in `src/main/config/.env.local`.
   Use credentials registered by the matching web server; keep this file out of Git.
3. Set `CONFIG_SUFFIX=dev` to isolate config, token, and OAuth state files from normal use.
4. Run `npm run dev` (`npm run dev:win` on Windows), then sign in through Settings.

The browser returns to `toast-app://auth` with a code and state. `src/index.js` validates and
consumes the stored state before calling `auth-manager.js`. Installed builds register this
scheme. An unpackaged build does not replace the installed protocol handler; use an isolated
test harness when testing callbacks locally.

## Authentication ownership

`auth.js` persists each access/refresh token pair in one atomic file write before publishing
it in memory. A server `401` forces one shared refresh, even before local expiry. Logout and
account changes invalidate pending requests. Other failures remain explicit and retain
local data; they do not silently turn into an anonymous or cached success response.

`auth-manager.js` owns the login lifecycle and subscription normalization. It makes one
profile request after login and shares the verified result with both windows and sync.
`user-data-manager.js` keeps profiles in memory for five minutes within one credential
session. It does not load a profile from disk as an authentication fallback.

## Synchronize settings

The app downloads before an upload and uses server revisions to guard writes. It then polls
every 15 minutes and debounces local edits for 5 seconds. Buttons, Snippets, appearance, and
advanced preferences participate. Device-local credentials, shortcuts, permissions, and
approval state do not. See [Cloud Sync](../features/cloud-sync.md) for conflicts, recovery,
account switching, access requirements, and client/server compatibility.

## Diagnose failures

- Read Settings → Account for authentication and sync errors. Preserve local drafts.
- A missing cloud record is a successful empty-account read; a failed read cannot justify an upload.
- An invalid local config stops startup and preserves the original file. Restore a valid backup
  or correct the reported file after quitting the app; do not replace it silently with defaults.
- Inspect [environment settings](../config/environment.md) and [storage](../config/data-storage.md).
  Do not copy token values or private configuration into logs or bug reports.

See [security](../architecture/security.md) and the [API reference](../api/overview.md).
