# Toast App API

Toast App runs local buttons and text expansion. Its main process owns configuration,
authentication, native actions, and cloud synchronization. Toast Web stores the account's
cloud settings and exposes the revisioned API used by the app and web editors.

## Choose an interface

- [Main process](main-process.md): configuration, authentication, synchronization, windows, and IPC handlers.
- [Renderer](renderer.md): the narrow `window.toast` and `window.settings` preload bridges.
- [Actions](actions.md): application, command, URL/file, script, and chain execution.
- [Cloud sync](../features/cloud-sync.md): initial download, polling, conflicts, and account isolation.
- [Configuration schema](../config/schema.md): stored fields and defaults.

Renderers use preload methods. They do not import main-process modules or issue arbitrary IPC
requests. Treat the context bridge as immutable; keep renderer state in its own modules.

## Return values

The interfaces have different result shapes. Check the contract of the called method.

| Operation | Result |
|---|---|
| `getConfig(key)` | Stored value, or the full configuration when the key is omitted; `null` on a read error |
| Settings preference writes, reset, import/export | Boolean; `false` is a failure |
| Guarded page/snippet edits | `{ success, ... }`; preserve the draft when `success` is false |
| Sync and action execution | `{ success, ... }`; failures include an error |
| Validation | `{ valid, ... }` |
| Dialogs | Electron dialog result, including cancellation |
| Event subscription in Toast | Cleanup function |

A resolved Promise does not prove success. IPC can also reject; handle both rejection and
the method's explicit failure result. Do not replace a failed read with defaults and upload them.

## Changing an API

1. Read the handler, preload method, renderer caller, and related tests.
2. Validate input in the main process and keep the exposed capability narrow.
3. Preserve authentication-session and edit-baseline guards for asynchronous work.
4. Update the affected contract and run the focused tests, followed by repository checks.

See [security](../architecture/security.md) and [testing](../development/testing.md).
