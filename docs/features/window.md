# Window Show and Hide Behavior

The launcher opens from the global shortcut (default `Alt+Space`), **Open Toast** in the tray,
or the named preload window methods. Closing the launcher normally hides it; **Quit** in the
tray exits the application.

## Hide settings

| Trigger | Preference | Default |
|---|---|---|
| Focus moves to another window | `advanced.hideOnBlur` | `true` |
| Escape | `advanced.hideOnEscape` | `true` |
| Successful action | `advanced.hideAfterAction` | `true` |

Blur and renderer hide requests check active modal state. Main also guards login-in-progress
when hiding through its window manager. Global shortcut handling has its own toggle path;
do not assume all native hide calls pass through the renderer guard.

Escape closes the active modal. Outside a modal, the renderer exits button edit mode and the
preload hide handler applies the Escape preference. Turning off one hide preference does not
disable other triggers. Failed actions do not trigger hide-after-action.

## Dialogs and focus

The shared modal-state module tracks the button editor, icon picker, confirmations, and profile
modal. It disables launcher shortcuts while any modal is visible. Confirmation cancellation
settles the pending result and restores focus; closing a nested modal does not clear the
remaining modal's state. See [Renderer API](../api/renderer.md#modal-lifecycle).

Native file dialogs and privacy settings temporarily release always-on-top where necessary
so an external window is usable. Restore the originating window only while it still exists.
Settings can close and reopen independently; delayed close work must not close a newer window.

## Native preferences

`native-preferences.js` applies changes from startup, local edits, import/reset, and cloud
sync. It updates window size, opacity, position, taskbar/Dock visibility, and launch-at-login.
Changing the position preset replaces a saved drag position for the current display.
Unchanged preferences do not repeat native operations. A failed native application reports
failure and remains eligible for a later retry.

The size presets are small 500×350, medium 700×500, and large 800×550. Monitor positioning uses
the display work area. See [configuration](../config/schema.md) and
[platform behavior](../architecture/platform.md).
