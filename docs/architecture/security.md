# Security Model

The main process owns configuration, credentials, native execution, and synchronization.
Windows use `nodeIntegration: false` and `contextIsolation: true`. Renderers call the named
methods exposed by their preload bridge. This boundary limits renderer capabilities; it
does not sandbox commands or scripts that the user chooses to execute.

## Authentication and tokens

Toast uses OAuth Authorization Code Flow through the browser and `toast-app://auth`.
The protocol dispatcher validates a matching, unexpired, one-use state before exchanging
the code. PKCE is not implemented. A bundled desktop client secret is not a private secret
that can be concealed from someone who can inspect the installed application.

Tokens are plaintext JSON in the user data directory, written atomically with owner-only
permissions (`0600`). The access and rotated refresh token are persisted together. OS secure
storage is not used for new writes; old encrypted files can be read and migrated. Processes
running as the same user can read the token file. Never include it in a shared backup or log.

A valid server `expires_in` takes precedence over the local fallback. Zero means immediate
expiry. A negative legacy environment fallback changes local expiry only; it cannot extend
a server JWT. Refresh occurs near expiry or after a `401`; concurrent callers share the request.
Logout attempts server revocation and removes local credentials. Pending work cannot restore
a logged-out session. A failed server revocation is reported by the low-level result; local
logout can still complete. See [environment variables](../config/environment.md).

## Profiles and cloud access

Profiles are cached for five minutes in main-process memory within the current credential
session. No disk profile fallback authenticates a user. Every sync verifies the profile
before checking subscription access. An explicit `cloud_sync: false` overrides the plan name.
Network failures preserve local data and displayed account information without granting
access from stale state. See [Cloud Sync](../features/cloud-sync.md).

Config files contain buttons, snippets, scripts, and recovery snapshots, which may be
sensitive. They use filesystem permissions rather than encryption. Import and reset preserve
authentication, synchronization, and device-local approval metadata. Invalid config files
are preserved and startup fails visibly rather than bypassing validation.

## Actions and scripts

Commands and scripts run with the same privileges as Toast. JavaScript uses a Node `vm`
context with `require`, so it can access the filesystem, network, and child processes. That
context is not a security sandbox. The exposed `process.env` is restricted to an allowlist,
but Node modules can reach broader process capabilities. There are no execution resource limits.

AppleScript, PowerShell, and Bash use explicit interpreters through `execFile`, with a unique
private temporary directory and script file. Cleanup follows both success and failure.
They receive an allowlisted environment and inherit the app's working directory.
Application and file-opening arguments use arrays; shell commands intentionally use shell syntax.

Downloaded native launches and executable actions require one-time device-local approval.
This includes configured applications, local paths, and non-HTTP(S) URI handlers, as well as
commands and scripts. Malformed remote pages reject the whole download. Existing local actions
remain trusted. See the [complete approval policy](../features/cloud-sync.md#download-validation-and-action-approval).

## Transport and packaging

`TOAST_URL` defaults to HTTPS. Local development can use an explicitly configured HTTP server.
Authenticated profile/settings requests use Bearer tokens; OAuth exchange uses its own grant
credentials. TLS uses the runtime's normal certificate validation; certificate pinning is absent.

macOS distribution configuration enables Hardened Runtime and declares entitlements.
The release workflow configures signing and notarization credentials; Windows has separate
signing inputs. Build configuration alone does not prove that a particular artifact was signed
or notarized. Verify the actual release artifact. MAS uses its separate entitlement file and
disables text expansion. See [platform behavior](platform.md).

## Report a vulnerability

Contact the maintainers privately with a description, reproduction steps, and likely impact.
Do not post secrets or exploit details in a public issue. Review custom scripts before running
them, keep the app current, and log out after using a shared computer.
