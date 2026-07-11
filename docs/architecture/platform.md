# Toast App Platform-Specific Features and Considerations

This document describes the platform-specific features, considerations, and implementation details of the Toast app.

## Table of Contents

- [Overview](#overview)
- [Supported Platforms](#supported-platforms)
- [macOS-Specific Features](#macos-specific-features)
  - [Tray Integration](#tray-integration)
  - [Global Keyboard Shortcuts](#global-keyboard-shortcuts)
  - [Window Management](#window-management)
  - [Native Scripting](#native-scripting)
  - [Code Signing and Notarization](#code-signing-and-notarization)
  - [Installation and Updates](#installation-and-updates)
- [Windows-Specific Features](#windows-specific-features)
  - [System Tray Integration](#system-tray-integration)
  - [Global Keyboard Shortcuts](#global-keyboard-shortcuts-1)
  - [Window Management](#window-management-1)
  - [Native Scripting](#native-scripting-1)
  - [Code Signing](#code-signing)
  - [Installation and Updates](#installation-and-updates-1)
- [Shared Code with Platform-Specific Branches](#shared-code-with-platform-specific-branches)
- [Platform Detection](#platform-detection)
- [Cross-Platform Development Guidelines](#cross-platform-development-guidelines)
- [Multi-Platform Testing](#multi-platform-testing)
- [Known Platform-Specific Issues](#known-platform-specific-issues)

## Overview

The Toast app is designed to provide a consistent user experience on macOS and Windows while leveraging each platform's native capabilities. This document focuses on platform-specific implementation and considerations for developers.

## Supported Platforms

Platforms officially supported by the Toast app:

- **macOS**: 10.14 (Mojave) or later
- **Windows**: Windows 10 or later
- **Linux**: AppImage and deb package builds provided (experimental)

## macOS-Specific Features

### Tray Integration

On macOS, the Toast app integrates into the menu bar:

- Uses `NSStatusItem` via Electron's `Tray` API
- The menu bar icon uses the template image format (`tray-icon-Template.png`, or `tray-icon-devTemplate.png` in development mode)
- Supports automatic dark/light mode switching
- Clicking (either left or right) opens the context menu (no separate click behavior implemented — default behavior is used)

**Implementation**:
```javascript
// src/main/tray.js — getTrayIconPath()
if (process.platform === 'darwin') {
  const isDev = process.env.NODE_ENV === 'development';
  return path.join(__dirname, isDev ? '../../assets/icons/tray-icon-devTemplate.png' : '../../assets/icons/tray-icon-Template.png');
}
```

### Global Keyboard Shortcuts

macOS keyboard shortcut handling:

- Registers global shortcuts via Electron's `globalShortcut` module (`registerGlobalShortcuts`)
- Custom shortcuts are converted to the Electron accelerator format with `convertHotkeyToElectronFormat` (the conversion logic is platform-agnostic)
- `Ctrl`/`Control` maps to `CommandOrControl`, `Command`/`Meta`/`Super` maps to `Super`, while `Alt` and `Shift` are kept as-is (on macOS both `CommandOrControl` and `Super` correspond to the Command key)
- Malformed shortcuts are filtered out by validation before registration

**Implementation**:
```javascript
// src/main/shortcuts.js
// Shortcut conversion works platform-independently
function convertHotkeyToElectronFormat(hotkey) {
  // Ctrl/Control -> CommandOrControl (Command key on macOS)
  // Command/Meta/Super -> Super
  // Alt, Shift are kept as-is without conversion
  // ...
}
```

### Window Management

macOS window behavior:

- Displayed as a frameless (`frame: false`), transparent (`transparent: true`) window (common to all platforms)
- On macOS, the window `type` is set to `'normal'` to avoid panel-related warnings
- Displayed alongside Spaces and full-screen applications (`visibleOnAllWorkspaces: true`; `simpleFullscreen` is a macOS-only property)
- Proper management of focus and activation

**Implementation**:
```javascript
// src/main/windows.js
windows.toast = new BrowserWindow({
  width,
  height,
  frame: false,
  transparent: true,
  resizable: false,
  alwaysOnTop: true,
  alwaysOnTopLevel: 'screen-saver',
  // 'normal' on macOS, 'panel' type on other platforms
  type: process.platform === 'darwin' ? 'normal' : 'panel',
  visibleOnAllWorkspaces: true,
  simpleFullscreen: false, // macOS-only property
  // ...
});
```

### Native Scripting

macOS-specific scripting features:

- AppleScript integration via `osascript`
- macOS shell commands and utilities
- Integration with macOS services and workflows

**Implementation**:
```javascript
// src/main/actions/script.js
async function executeAppleScript(script) {
  // Write the script to a temp file, then run it by file path
  const tempFile = path.join(os.tmpdir(), `toast-applescript-${Date.now()}.scpt`);
  fs.writeFileSync(tempFile, script);

  return new Promise((resolve, reject) => {
    exec(`osascript "${tempFile}"`, (error, stdout, stderr) => {
      fs.unlinkSync(tempFile); // Clean up the temp file
      if (error) reject(error);
      else resolve(stdout);
    });
  });
}
```

### Code Signing and Notarization

macOS-specific security requirements:

- The application code is signed with a valid Developer ID certificate (at CI build time)
- Required capabilities are declared in `entitlements.mac.plist`
- Hardened Runtime is enabled (`build.mac.hardenedRuntime: true` in `package.json`)
- Mac App Store builds (the `mas` target) use `entitlements.mac.mas.plist` and the App Sandbox

> Notarization is performed in the GitHub Actions build pipeline (`.github/workflows/build-release.yml`) by preparing an App Store Connect API key and setting the electron-builder notarization environment variables (`APPLE_API_KEY`, etc.).

### Installation and Updates

macOS-specific installation considerations:

- Distributed as DMG and ZIP packages (`build.mac.target` in `package.json`)
- Homebrew distribution via a custom tap (`brew install --cask opspresso/tap/toast`)
- Auto-update using `electron-updater` (requires the ZIP format)
- Settings are stored in `~/Library/Application Support/Toast/`, and logs in `~/Library/Application Support/Toast/logs/toast-app.log`

## Windows-Specific Features

### System Tray Integration

On Windows, the Toast app integrates into the system tray:

- Uses the standard ICO format for the tray icon
- Supports light/dark mode along with the Windows system theme
- Both left-click and right-click open the context menu (no separate click handler; Windows default behavior)

**Implementation**:
```javascript
// src/main/tray.js
if (process.platform === 'win32') {
  tray = new Tray(path.join(__dirname, '../../assets/icons/tray-icon.png'));
  // Windows-specific settings
}
```

### Global Keyboard Shortcuts

Windows keyboard shortcut handling:

- Registers global shortcuts via Electron's `globalShortcut` module (`registerGlobalShortcuts`)
- Custom shortcuts are converted to the Electron accelerator format with `convertHotkeyToElectronFormat` (the conversion logic is platform-agnostic)
- `Ctrl`/`Control` maps to `CommandOrControl`, `Command`/`Meta`/`Super` maps to `Super` (the Windows key), while `Alt` and `Shift` are kept as-is
- Malformed shortcuts are filtered out by validation before registration

**Implementation**:
```javascript
// src/main/shortcuts.js
// Shortcut conversion works platform-independently
function convertHotkeyToElectronFormat(hotkey) {
  // Ctrl/Control -> CommandOrControl (Control key on Windows)
  // Command/Meta/Super -> Super (Windows key)
  // Alt, Shift are kept as-is without conversion
  // ...
}
```

### Window Management

Windows window behavior:

- Uses a frameless window (`frame: false`) (an option common to all platforms)
- Taskbar visibility is controlled by the `advanced.showInTaskbar` setting (`skipTaskbar: !showInTaskbar`)
- On Windows, the window `type` is set to `'panel'` and `thickFrame: false` to disable the default window frame
- Handles multi-monitor setups via DPI awareness

**Implementation**:
```javascript
// src/main/windows.js
// Options like frame:false apply commonly to all platforms
windows.toast = new BrowserWindow({
  frame: false,
  // Taskbar visibility is determined by the advanced.showInTaskbar setting
  skipTaskbar: !showInTaskbar,
  // On Windows, 'panel' type + thickFrame:false disables the default frame
  type: process.platform === 'darwin' ? 'normal' : 'panel',
  thickFrame: false,
  // ...
});
```

### Native Scripting

Windows-specific scripting features:

- PowerShell integration
- Windows batch file execution
- Windows-specific command-line tools

**Implementation**:
```javascript
// src/main/actions/script.js
async function executePowerShell(script) {
  // Write the script to a temp file, then run it by file path
  const tempFile = path.join(os.tmpdir(), `toast-powershell-${Date.now()}.ps1`);
  fs.writeFileSync(tempFile, script);

  return new Promise((resolve, reject) => {
    exec(`powershell -ExecutionPolicy Bypass -File "${tempFile}"`, (error, stdout, stderr) => {
      fs.unlinkSync(tempFile); // Clean up the temp file
      if (error) reject(error);
      else resolve(stdout);
    });
  });
}
```

### Code Signing

Windows-specific security requirements:

- The application is signed with a valid code signing certificate (at CI build time)
- EV/OV certificates are recommended to reduce SmartScreen warnings
- Windows Defender compatibility is verified

Signing settings are managed in the `build.win` section of `package.json`.

### Installation and Updates

Windows-specific installation considerations:

- NSIS installer and portable EXE formats (`build.win.target` in `package.json`)
- Auto-update using `electron-updater`
- Settings and logs are stored in `%APPDATA%\Toast\` (logs at `%APPDATA%\Toast\logs\toast-app.log`)
- Startup entries use the OS standard mechanism

## Shared Code with Platform-Specific Branches

The Toast app uses a single codebase with platform-specific branches where needed:

```javascript
// Example of platform-specific code branching
function openTerminal(command) {
  if (process.platform === 'darwin') {
    // macOS-specific terminal handling
    return exec(`open -a Terminal "${command}"`);
  } else if (process.platform === 'win32') {
    // Windows-specific terminal handling
    return exec(`start cmd.exe /K "${command}"`);
  }
}
```

## Platform Detection

The application uses Electron's `process.platform` for platform detection:

```javascript
const isMac = process.platform === 'darwin';
const isWindows = process.platform === 'win32';
```

This enables clean and readable platform-specific code branching.

## Cross-Platform Development Guidelines

When developing cross-platform features for the Toast app:

1. **Abstract platform differences**: create platform-specific implementations with a common interface
2. **Test on all platforms**: verify that features work correctly on both macOS and Windows
3. **Respect platform conventions**: follow platform-specific UI guidelines and user expectations
4. **Graceful degradation**: fall back gracefully when a feature is unavailable on a platform
5. **Consistent feature parity**: maintain core feature parity across platforms while allowing platform-specific enhancements

## Multi-Platform Testing

Testing guidelines for platform-specific features:

1. Maintain test environments for both macOS and Windows
2. Use platform-specific test cases within the same test suite
3. Conditional testing using Electron's platform detection
4. Test the installation and update process on both platforms
5. Verify UI rendering on both platforms

## Known Platform-Specific Issues

| Issue | Platform | Workaround | Status |
|-------|----------|------------|--------|
| Transparency performance | Windows | Disable transparency on low-spec devices | Active |
| Conflicts between system shortcuts and keyboard shortcuts | macOS | Validation against known system shortcuts | Resolved |
| Tray icon appearance in dark mode | Windows | Use separate icons for light/dark mode | Resolved |
| High-resolution DPI scaling | Windows | Added DPI awareness at window creation | Resolved |
| Menu bar icon spacing | macOS | Adjusted menu bar icon padding | Resolved |
