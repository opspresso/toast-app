# Toast Security Guide

This document describes the Toast app's current security model, data protection approach, and authentication system. It is written based on the actual code implementation.

## Table of Contents

- [Overview](#overview)
- [Authentication System](#authentication-system)
  - [OAuth Authentication Flow](#oauth-authentication-flow)
  - [Token Management](#token-management)
  - [Session Handling](#session-handling)
- [Data Protection](#data-protection)
  - [Data-at-Rest Protection](#data-at-rest-protection)
  - [Data-in-Transit Protection](#data-in-transit-protection)
  - [Local Storage](#local-storage)
- [Permission Management](#permission-management)
  - [User Permission Levels](#user-permission-levels)
  - [Feature Access Control](#feature-access-control)
- [Script Security](#script-security)
- [Network Security](#network-security)
- [Operating System Integration](#operating-system-integration)
  - [macOS Security Integration](#macos-security-integration)
  - [Windows Security Integration](#windows-security-integration)
- [Security Best Practices](#security-best-practices)
- [Reporting Security Vulnerabilities](#reporting-security-vulnerabilities)
- [Related Documentation](#related-documentation)

## Overview

The Toast app handles user data such as authentication tokens, user profiles, and button configurations. This document describes the currently implemented security measures factually, and also notes planned future hardening items and current limitations.

In addition, all application windows follow Electron's secure defaults. The renderer process is isolated with `nodeIntegration: false` and `contextIsolation: true` (`src/main/windows.js`), and main process functionality is accessible only through the limited APIs exposed by the `preload` scripts via `contextBridge.exposeInMainWorld` (`src/renderer/preload/toast.js`, `settings.js`). This prevents the renderer from accessing Node.js APIs directly.

## Authentication System

The Toast app authenticates users using the OAuth 2.0 Authorization Code Flow. For the detailed flow and API integration, see the [Integration Guide](../development/integration.md).

### OAuth Authentication Flow

1. **Authentication initiation**:
   - The user clicks the 'Login' button in settings.
   - The app opens the system default browser (`shell.openExternal`) and navigates to the Toast web service authentication page.
   - It passes `CLIENT_ID`, `redirect_uri=toast-app://auth`, `response_type=code`, and so on as query parameters.

2. **User authentication**:
   - The user logs in on Toast web.
   - On successful authentication, the service redirects the user to the custom protocol URI (`toast-app://auth?code=...`).

3. **Token exchange**:
   - The `toast-app://` protocol handler registered by the app receives the authorization code (`src/index.js`).
   - The app requests access/refresh tokens from the token endpoint using `CLIENT_ID` / `CLIENT_SECRET` and the code.
   - Tokens are stored in a local file (`auth-tokens.json`).
   - In the deep-link handling logs, the `code` and `token` parameters of the URL are masked, so authorization codes and tokens are not left in plaintext in log files.

4. **Profile retrieval**:
   - After storing the tokens, the app calls the user profile and subscription information endpoints to fetch that data.

> **Current limitation**: PKCE (Proof Key for Code Exchange) is not currently implemented. Adopting PKCE, which is recommended for desktop OAuth clients, is a follow-up improvement item.

### Token Management

Tokens are managed as follows:

1. **Storage method**:
   - Tokens are stored as **plaintext JSON** in the `auth-tokens.json` file in the user data directory (`src/main/auth.js`).
   - They are written via a temp file with an atomic rename to prevent corruption from partial writes.
   - The token file is stored with owner-only read/write permissions (`0600`). Access by other processes within the same user account is still possible.

   > **Current limitation**: OS secure storage such as the macOS Keychain / Windows DPAPI / Linux Secret Service is not used. Other processes under the same user account can access the token file, so be careful not to run untrusted code.

2. **Token expiration policy**:
   - Access token default expiration: 1 year (`TOKEN_EXPIRES_IN=31536000`, changeable via environment variable).
   - The `expires_in` value returned by the server always takes priority, and `TOKEN_EXPIRES_IN` is applied only when that value is absent.
   - `TOKEN_EXPIRES_IN=0` is a falsy value, so it falls back to the 1-year default. To apply indefinite expiration (`8640000000000000`, the maximum JavaScript date), you must use a negative value (e.g., `-1`).
   - As expiration approaches (30-second safety margin), the token is automatically refreshed using the refresh token.
   - Throttling logic is applied to refresh calls to prevent duplicate requests.

3. **Logout handling**:
   - On logout, the local token file and the in-memory tokens are removed.
   - The server-side revoke endpoint is also called (when possible).

### Session Handling

- Token refresh is performed automatically at expiration or on a 401 response.
- Session state (`auth-manager.js`) is propagated to all windows via an IPC event (`auth-state-changed`).

## Data Protection

### Data-at-Rest Protection

1. **Configuration data** (`config.json`):
   - Stored in JSON format via electron-store.
   - Contains no sensitive information (shortcuts, button configuration, appearance settings, etc.).
   - Protected only by file system permissions.

2. **Authentication tokens** (`auth-tokens.json`):
   - See the [Token Management](#token-management) section above. Stored in plaintext.

3. **User profile data** (`user-profile.json`):
   - Stores only minimal information such as email, name, and subscription status.
   - Stored as plaintext JSON.

4. **Script data**:
   - Custom scripts are stored in plaintext inside the configuration file.
   - Do not include sensitive information such as API keys directly in scripts.

### Data-in-Transit Protection

- Server API communication uses HTTPS (`TOAST_URL` defaults to `https://app.toast.sh`).
- TLS verification follows the default behavior of Node.js / Electron (using the system root CAs).
- Certificate pinning is not applied.

### Local Storage

- Data files are stored in the operating system's user data directory; for the location and structure, see [Data Storage](../config/data-storage.md).
- File permissions are generally set to allow read/write only by the current user, but no separate ACL hardening logic is applied.

## Permission Management

### User Permission Levels

| Tier | Pages | Cloud Sync | Notes |
|------|-------|------------|-------|
| Anonymous user | 1 | Disabled | Not logged in |
| Authenticated user | 3 | Disabled (default) | Logged in with a free account |
| Premium subscriber | 9 | Enabled | Holds a valid subscription |

### Feature Access Control

- Protected features check the subscription status (`config.subscription`) and page groups (`pageGroups`) before use.
- Subscription information is refreshed from the server at login and periodically.
- When the network is disconnected, the last cached subscription status is used.

## Script Security

> **Important**: Custom scripts run with the **same permissions** as the Toast app process. No system-level sandboxing is applied, so do not run scripts from untrusted sources.

### JavaScript Scripts

- They run in an isolated context using Node.js `vm.runInContext`, but the following are exposed to the context:
  - `require`: all built-in modules are available (`fs`, `child_process`, `http`, etc.)
  - `process`: `platform`, `arch`, and `env` containing only non-sensitive environment variables
  - Standard globals such as `Buffer`, `setTimeout`, `setInterval`
- Through `process.env`, only variables in the allowlist (`HOME`, `USER`, `USERPROFILE`, `PATH`, `LANG`, `SHELL`, `TMPDIR`, `TEMP`, `TMP`) are passed, so main process secrets such as `CLIENT_SECRET` are not exposed to scripts by default. However, if a script spawns a child process with `require('child_process')`, that child can read the full environment again, so this restriction is not complete isolation.
- Therefore, file system access, network calls, and external process execution are still possible.
- No execution time limit, memory limit, or API whitelist is applied.

### Shell / System Scripts

- AppleScript (`osascript`), PowerShell, and Bash scripts run in child processes via `child_process.exec`, receiving only the same allowlisted environment variables (`env`) as JavaScript scripts, which limits inheritance of main process secrets.
- Because no separate working directory (`cwd`) is specified, scripts inherit the app process's working directory as-is, and their execution privileges are the same as the current user.

### Cloud Sync Action Protection

To prevent arbitrary code from running automatically when `exec`/`script` actions created on another device arrive via cloud sync, the following protections are applied (`src/main/action-approval.js`):

- **Structural validation**: downloaded pages have all button actions validated with `validateAction` before being stored, and invalid actions are removed.
- **One-time per-device approval**: risky actions (`exec`/`script`) that appear for the first time in remote data are added to a pending-approval list and only run after the user approves them at execution time. Locally created actions and already-trusted actions run without a dialog.
- **Local-only trust list**: fingerprints in the trusted/pending state are stored device-locally under the config `security` key only and are not uploaded to the cloud.

### `open` Action Argument Handling

Application launches from the `open` action pass arguments as an array via `execFile` without going through a shell, preventing command injection through file paths or application names (`src/main/actions/open.js`).

### User Responsibilities

- Register only scripts from trusted sources.
- Sanitize input that could cause command injection in advance.
- Do not hardcode sensitive information (API keys, passwords) in scripts; instead, retrieve it from environment variables or an external secret manager.

## Network Security

### API Communication

- All API requests are authenticated with the `Authorization: Bearer <access_token>` header.
- On a 401 response, an automatic refresh token renewal is attempted.
- Retries on request failure are applied in a limited way in specific modules such as cloud sync (up to 3 times).

### Certificate Verification

- Standard TLS verification is performed using the system trust store (root CAs).
- Certificate pinning, Certificate Transparency checks, and the like are not applied.

## Operating System Integration

### macOS Security Integration

1. **App Sandbox / Hardened Runtime**:
   - Regular distribution builds (the `mac` target) are built with Hardened Runtime enabled (`mac.hardenedRuntime: true` in `package.json`).
   - Permissions are declared in `entitlements.mac.plist`.
   - The Mac App Store (mas) target applies a separate `entitlements.mac.mas.plist` and the App Sandbox.

2. **Code signing**:
   - Distribution builds are signed with an Apple Developer ID certificate.
   - Notarization is performed in the GitHub Actions build pipeline (`.github/workflows/build-release.yml`) by preparing an App Store Connect API key and setting the electron-builder notarization environment variables (`APPLE_API_KEY`, etc.).

3. **Global shortcuts**:
   - macOS accessibility permissions may be required.

### Windows Security Integration

1. **Code signing**:
   - Distribution builds are signed with a code signing certificate to reduce SmartScreen warnings.

2. **Permissions**:
   - Runs with normal user privileges and does not require administrator privileges.

## Security Best Practices

Recommendations for using the Toast app safely:

1. **Keep it up to date**: enable auto-update to receive security fixes promptly.
2. **Account security**: use a strong, unique password for your Toast account.
3. **Review scripts**: run only scripts from trusted sources, and review the code before running.
4. **Log out after using a shared computer**: because the token file is plaintext, always log out when you are done.
5. **Back up your configuration**: back up your configuration regularly to a safe location.

## Reporting Security Vulnerabilities

If you discover a security vulnerability in the Toast app:

1. **Responsible disclosure**: do not share vulnerability details publicly.
2. **Reporting channel**: use the private security reporting on [GitHub Issues](https://github.com/opspresso/toast-app/issues), or contact the repository maintainers directly.
3. **Reporting guidelines**:
   - A clear description of the vulnerability
   - Reproduction steps (if possible)
   - Potential scope of impact
   - Suggested mitigation or fix (optional)

## Related Documentation

- **Full authentication system overview**: [Integration Guide](../development/integration.md)
- **Cloud sync implementation**: [Cloud Sync](../features/cloud-sync.md)
- **Custom scripts**: [Scripts](../features/scripts.md)
- **API documentation**: [API Overview](../api/overview.md)
