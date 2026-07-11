# Toast App Auto-Update

This document describes the Toast app's auto-update system and user experience.

> **Implementation status**: ✅ Fully implemented
> - Update check, download, and install features are all implemented
> - Auto-update system based on electron-updater
> - User interface integration via IPC

## Table of Contents

- [Overview](#overview)
- [Update Architecture](#update-architecture)
  - [Update Distribution Channel](#update-distribution-channel)
  - [Update Components](#update-components)
- [User Update Experience](#user-update-experience)
  - [Update Check and Notification](#update-check-and-notification)
  - [Download Process](#download-process)
  - [Install Process](#install-process)
- [Update Configuration](#update-configuration)
  - [Auto-Update Settings](#auto-update-settings)
  - [Advanced Configuration Options](#advanced-configuration-options)
- [Update Troubleshooting](#update-troubleshooting)
  - [Common Issues](#common-issues)
  - [Manual Update](#manual-update)
- [Developer Information](#developer-information)
  - [Update Mechanism](#update-mechanism)
  - [Digital Signing and Code Signing](#digital-signing-and-code-signing)
  - [Update Metadata](#update-metadata)

## Overview

The Toast app provides auto-update functionality using the electron-updater library. The system operates in two ways:

1. **Automatic check**: Checks for updates in the background 5 seconds after the app starts and every 4 hours thereafter, and notifies the user (`updater.js`)
2. **User control**: Manual update check, download, and install available from the settings window (`updater.js`)

Updates are downloaded after user confirmation (`autoDownload: false`), and installation proceeds automatically when the app restarts.

## Update Architecture

### Update Distribution Channel

The Toast app uses only the `latest` channel (`autoUpdater.channel = 'latest'`) and does not offer user-selectable channels such as stable/beta. Prereleases are allowed only in the development environment (`NODE_ENV === 'development'`).

Updates are distributed through GitHub Releases, with an appropriate installer file provided for each operating system.

### Update Components

The auto-update system consists of the following components:

1. **Updater module** (`src/main/updater.js`): Manages background update checks and downloads.
2. **Notification system**: Notifies the user of new update availability.
3. **Downloader**: Efficiently downloads update packages.
4. **Installer**: Applies downloaded updates.
5. **Integrity verification**: Verifies the integrity and authenticity of downloaded packages.

## User Update Experience

### Update Check and Notification

The Toast app checks for updates at the following times:

1. **On application start**: Automatically checks for updates 5 seconds after the app starts (silent mode, production environment only).
2. **Periodic check**: Automatically checks in the background every 4 hours while the app is running (production environment only).
3. **Manual check**: When the user clicks the "Check for updates" button in the settings window.

When a new update is found:

1. **Tray menu display**: The version item in the tray menu changes to an `⬆ Update to v{version}` item. Clicking it immediately downloads, then restarts and installs (during download it shows `Downloading v{version}…`, and once download completes it shows `Restart to install v{version}`).
2. **Settings display**: Update information is shown in the settings window.
3. **In-app notification**: Update information is sent to the Toast and settings windows via IPC.

The notification includes the update's version number, a summary of changes, and options to download and install the update.

### Download Process

An update download proceeds as follows:

1. **Background download**: When the user accepts, it downloads in the background (`autoDownload: false` setting requires user confirmation).
2. **Progress indicator**: During the download, the following items are sent via IPC:
   - Download progress (percentage)
   - Current download speed
   - Bytes transferred / total bytes

When the download completes, the user is notified and given an option to proceed with installation.

### Install Process

The installation process differs by operating system:

**Windows**:
1. The user clicks the "Install now" button.
2. The app quits.
3. The update is installed.
4. The app restarts automatically.

**macOS**:
1. The user clicks the "Install now" button.
2. The app quits.
3. The update is installed.
4. The app restarts automatically.

**Linux**:
1. The user clicks the "Install now" button.
2. The app quits.
3. The update is installed.
4. The app restarts automatically.

The user can also choose the "Install later" option to defer the update. In this case, without a separate confirmation dialog, it is installed silently on app quit according to the `autoInstallOnAppQuit: true` setting. (The dialog asking whether to install is shown only at download completion, and only when the `AUTO_INSTALL_UPDATES=true` environment variable is set.)

## Update Configuration

### Auto-Update Settings

The current update behavior is configured in `src/main/updater.js`:

1. **Disable auto-download**: `autoDownload: false` — download after user confirmation
2. **Auto-install on app quit**: `autoInstallOnAppQuit: true` — install downloaded updates when the app quits
3. **Update channel**: `channel: 'latest'` — fixed to the `latest` channel (not user-selectable)
4. **Prevent downgrade**: `allowDowngrade: false` — block downgrades in production (allowed only in development)

## Update Troubleshooting

### Common Issues

**Update check failure**:
1. Check your internet connection.
2. Check whether a firewall is blocking the app's access to the update server.
3. Restart the app and try again.

**Update download failure**:
1. Check that there is enough disk space.
2. Check your internet connection.
3. Check your firewall settings.
4. Restart the app and try again.

**Update install failure**:
1. Fully quit the app and try again.
2. Try running the app with administrator privileges.
3. Check whether antivirus software is blocking the installation.
4. If you have a Gatekeeper issue on macOS, try a manual update.

### Manual Update

If auto-update fails, you can perform a manual update:

1. Download the latest version from [GitHub Releases](https://github.com/opspresso/toast-app/releases)
2. Quit the currently installed Toast app
3. Run the downloaded installer file:
   - **Windows**: Run the `.exe` file
   - **macOS**: Mount the `.dmg` file and drag the app to the Applications folder
   - **Linux**: Install the `.AppImage`, `.deb`, or `.rpm` file depending on your distribution

## Developer Information

### Update Mechanism

The Toast app's auto-update system is implemented using the `electron-updater` library.

#### Key Components

1. **app-update.yml / dev-app-update.yml**: Update server configuration
2. **src/main/updater.js**: Detailed update logic implementation
3. **src/main/ipc/updater.js**: UI integration via IPC handlers
4. **GitHub Releases**: Update distribution channel

#### Implementation Highlights

```javascript
// src/main/updater.js — key settings in configureUpdater()
autoUpdater.appId = 'com.opspresso.toast-app';
autoUpdater.forceDevUpdateConfig = true;  // Apply update config even in the dev environment
autoUpdater.allowDowngrade = process.env.NODE_ENV === 'development';  // Allowed only in the dev environment
autoUpdater.allowPrerelease = process.env.NODE_ENV === 'development';  // Allowed only in the dev environment
autoUpdater.autoDownload = false;  // Download after user confirmation
autoUpdater.autoInstallOnAppQuit = true;  // Auto-install on app quit
autoUpdater.channel = 'latest';  // Update channel (fixed)

// Key functions
- checkForUpdates(silent): Check for updates
- downloadUpdate(): Download the update (with progress tracking)
- installUpdate(): Install the update (quitAndInstall)
- downloadAndInstallUpdate(version): One-click upgrade from the tray menu (install immediately after download)
```

#### IPC Handlers

```javascript
// IPC channels provided by src/main/ipc/updater.js
- 'check-for-updates': Check for updates
- 'check-latest-version': Query the latest version info
- 'download-update': Download the update
- 'download-auto-update': Auto-download
- 'download-manual-update': Manual download
- 'install-update': Install the update
- 'install-auto-update': Auto-install
```

#### Update Event Flow

1. **App start**: Check for updates automatically after 5 seconds, then repeat every 4 hours (production mode only, silent mode)
2. **Update found**: Send the `update-available` event to windows via IPC, and show an upgrade item in the tray menu (`tray.setUpdateState`)
3. **Download**: Background download after user confirmation (progress sent via the `download-progress` event)
4. **Install ready**: Send the `update-downloaded` event when the download completes
5. **Install**: Call `quitAndInstall(false, true)` to restart the app and apply the update

> When the `AUTO_INSTALL_UPDATES=true` environment variable is set, a dialog asking whether to restart and install is shown at download completion (`update-downloaded`).

### Digital Signing and Code Signing

All Toast app updates are digitally signed before distribution:

1. **Windows**: Signed with an Authenticode certificate
2. **macOS**: Signed and notarized with an Apple Developer ID certificate
3. **Linux**: AppImage and Debian packages are signed with GPG

These signatures protect users from the risk of malicious modification or tampering.

### Update Metadata

Release metadata is stored in the `update.yml` file and includes the following information:

```yaml
version: 0.9.2
files:
  - url: Toast-0.9.2-mac.zip
    sha512: <sha512-hash>
    size: 68943259
    blockMapSize: 73422
  - url: Toast-0.9.2.dmg
    sha512: <sha512-hash>
    size: 72345678
path: Toast-0.9.2-mac.zip
sha512: <sha512-hash>
releaseDate: '2025-12-01T00:00:00.000Z'
```

This metadata serves the following roles:

1. Identify the latest available version
2. Determine the correct file to download
3. Verify the integrity of the downloaded file
4. Retrieve release information to present to the user

Developers can generate this metadata automatically through the GitHub release process. This process is handled by the `electron-builder` tool.
