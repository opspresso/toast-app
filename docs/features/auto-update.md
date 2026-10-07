# App Updates

Toast uses `electron-updater` and the `latest` GitHub release channel. Releases are distributed
from [opspresso/toast](https://github.com/opspresso/toast/releases).

## Update behavior

In a non-development process, Toast checks five seconds after startup and every four hours.
These checks announce availability without automatically downloading. Development skips the
scheduled checks; manual checks remain available.

- The tray's **Update to v…** item downloads, installs, and restarts the app.
- Settings → About → **Check for updates** also proceeds to download and installation when a
  newer version is found. Save work before starting this flow.
- Progress events show download percentage, transferred bytes, and speed.
- Download or installation failure displays an error and permits retry.
- Already downloaded updates can install when the app quits (`autoInstallOnAppQuit: true`).
- `AUTO_INSTALL_UPDATES=true` additionally prompts at download completion; it does not enable
  automatic downloading.

The updater rejects installation when no update has been downloaded. Before `quitAndInstall`,
it sets the app's quitting flag so normal window-close handling does not block the restart.

## Troubleshooting

If checking or downloading fails, confirm network access and available disk space, then retry.
If installation fails, quit Toast and install the appropriate artifact from the release page.
On macOS, mount the DMG and replace the app in Applications. On Windows, run the installer.
Preserve the user data directory containing settings and snippets.

Do not assume a release supports a platform just because a build target exists. Inspect the
actual release assets. Current CI builds macOS and Windows; Linux targets are experimental.

## Implementation

- `src/main/updater.js`: check/download/install state, events, and bounded duplicate-operation guards.
- `src/main/tray.js`: availability, downloading, and restart menu states.
- `src/main/ipc/updater.js`: named renderer operations.
- `src/renderer/pages/settings/modules/about-settings.js`: About tab flow and progress.
- `package.json`: publish provider and package targets.

`autoDownload` is false, `autoInstallOnAppQuit` is true, and the channel is `latest`.
Downgrades and prereleases are permitted only in development. Electron Builder produces
platform update metadata, including versions, asset URLs, and hashes.

Release CI configures signing and macOS notarization. Verify the output artifact and workflow
result before claiming either succeeded. This repository does not configure Linux GPG signing.
See [platform behavior](../architecture/platform.md) and [environment settings](../config/environment.md).
