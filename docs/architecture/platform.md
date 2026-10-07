# Platform Behavior

Toast targets macOS and Windows. `package.json` also defines experimental Linux AppImage and
deb targets; the release workflow currently builds macOS and Windows. A configured target
is not evidence that its current artifact passed native testing.

## Platform differences

| Area | macOS | Windows | Linux |
|---|---|---|---|
| Tray icon | Template PNG, including development/update variants | Regular PNG | Regular PNG |
| Window type | `normal` | `panel`, no thick frame | `panel` |
| Application action | `open -a` with separate arguments | Native executable | Native executable |
| Terminal commands | Configured Terminal/iTerm application | `cmd.exe` | Available supported terminal |
| AppleScript | `osascript` required | Unavailable | Unavailable |
| PowerShell | Not supported | `powershell` on PATH | Not supported |
| Bash | `bash` on PATH | Not supported | `bash` on PATH |
| Snippet expansion | Non-MAS builds with Accessibility permission | Not supported | Not supported |
| Build targets | DMG, ZIP; separate MAS target | NSIS, portable EXE | AppImage, deb |

The interpreter must exist on the target host. See [Actions](../api/actions.md) for exact
launch and argument contracts. Temporary scripts use unique private directories and explicit
interpreters; do not copy timestamp-based temporary-file or shell-interpolation examples.

## Shortcuts and windows

Global shortcuts use Electron accelerators. `Ctrl`/`Control` maps to `CommandOrControl`;
`Command`/`Meta`/`Super` maps to `Super`; `Alt` and `Shift` keep their meaning. Registration
failure is reported to the user. Check OS-reserved shortcuts on the actual target machine.

The launcher is frameless, transparent, fixed-size, and always on top. Positioning uses the
active display's work area. `advanced.showInTaskbar` controls taskbar visibility and the macOS
Dock integration. Downloaded native preferences use the same application helper as local edits.
See [window behavior](../features/window.md).

## Authentication and storage

Installed packages declare `toast-app`. macOS uses `open-url`; Windows/Linux also receive
protocol URLs through process arguments and `second-instance`. Callbacks received before
initialization are queued. Development builds do not replace the installed handler.

Electron's user data directory owns config and tokens. Typical locations are
`~/Library/Application Support/Toast`, `%APPDATA%\Toast`, and `~/.config/Toast`.
`CONFIG_SUFFIX` separates development config, token, and OAuth state filenames. See
[data storage](../config/data-storage.md).

## Build and verification

Use the Node version in `.nvmrc` and the commands in [development setup](../development/setup.md).
Minimum OS support depends on the packaged Electron release; inspect the built artifact's
platform requirements rather than relying on historical Toast requirements.

The macOS release job imports a signing certificate and supplies notarization credentials.
Windows signing uses `CSC_LINK` and `CSC_KEY_PASSWORD`. Verify signatures on the built artifact;
a local ad-hoc signed package is not a notarized release. The release workflow permits Windows
build failure, so inspect each platform's result and attached artifacts separately.

For a platform change, test its native launch, working-directory/argument handling, global
shortcut, multi-monitor positioning, protocol callback, and applicable snippet permission.
Mocked platform branches do not replace execution on that operating system.
