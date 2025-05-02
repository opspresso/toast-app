# Platform-Specific Features and Considerations

This document outlines platform-specific features, considerations, and implementation details for Toast App on macOS and Windows.

## Table of Contents

- [Platform-Specific Features and Considerations](#platform-specific-features-and-considerations)
  - [Table of Contents](#table-of-contents)
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
    - [Tray Integration](#tray-integration-1)
    - [Global Keyboard Shortcuts](#global-keyboard-shortcuts-1)
    - [Window Management](#window-management-1)
    - [Native Scripting](#native-scripting-1)
    - [Code Signing](#code-signing)
    - [Installation and Updates](#installation-and-updates-1)
  - [Common Code with Platform-Specific Branches](#common-code-with-platform-specific-branches)
  - [Platform Detection](#platform-detection)
  - [Cross-Platform Development Guidelines](#cross-platform-development-guidelines)
  - [Testing on Multiple Platforms](#testing-on-multiple-platforms)
  - [Known Platform-Specific Issues](#known-platform-specific-issues)

## Overview

Toast App is designed to provide a consistent user experience across macOS and Windows while leveraging each platform's native capabilities. This document focuses on platform-specific implementations and considerations for developers.

## Supported Platforms

Toast App officially supports:

- **macOS**: 10.14 (Mojave) and later
- **Windows**: Windows 10 and later

## macOS-Specific Features

### Tray Integration

On macOS, Toast App is integrated into the menu bar:

- Uses `NSStatusItem` via Electron's `Tray` API
- Menu bar icon uses template image format (`tray-icon-Template.png`)
- Supports dark/light mode automatic switching
- Right-click (or ctrl+click) opens the context menu
- Left-click toggles the Toast window

Implementation:
```javascript
// src/main/tray.js
if (process.platform === 'darwin') {
  tray = new Tray(path.join(__dirname, '../../assets/icons/tray-icon-Template.png'));
  tray.setIgnoreDoubleClickEvents(true);
  // macOS-specific settings
}
```

### Global Keyboard Shortcuts

macOS-specific keyboard shortcut handling:

- Uses macOS system APIs via Electron's `globalShortcut` module
- Handles macOS-specific modifier keys (Command, Option)
- Respects System Preferences settings for keyboard behavior
- Uses validation to avoid conflicts with system shortcuts

Implementation:
```javascript
// src/main/shortcuts.js
function registerGlobalShortcut(shortcut) {
  let modifiedShortcut = shortcut;
  if (process.platform === 'darwin') {
    // Convert generic shortcut to macOS format
    modifiedShortcut = shortcut.replace('Alt', 'Option');
    // Additional macOS-specific handling
  }
  // Register shortcut
}
```

### Window Management

macOS-specific window behavior:

- Supports native window controls (traffic lights)
- Uses vibrancy and transparency effects when available
- Handles spaces and fullscreen applications
- Properly manages focus and activation

Implementation:
```javascript
// src/main/windows.js
function createToastWindow() {
  const windowOptions = {
    // Common options
  };
  
  if (process.platform === 'darwin') {
    windowOptions.vibrancy = 'under-window';
    windowOptions.titleBarStyle = 'hiddenInset';
    // Other macOS-specific options
  }
  
  return new BrowserWindow(windowOptions);
}
```

### Native Scripting

macOS-specific scripting capabilities:

- AppleScript integration via `osascript`
- macOS shell commands and utilities
- Integration with macOS services and workflows

Implementation:
```javascript
// src/main/actions/script.js
async function runScript(script, type) {
  if (process.platform === 'darwin' && type === 'applescript') {
    return new Promise((resolve, reject) => {
      exec(`osascript -e '${script.replace(/'/g, "'\\''")}'`, (error, stdout) => {
        if (error) reject(error);
        else resolve(stdout);
      });
    });
  }
  // Other script types
}
```

### Code Signing and Notarization

macOS-specific security requirements:

- Application is code signed with a valid Developer ID
- App is notarized with Apple's notary service
- Hardened runtime enabled
- Entitlements configured for required capabilities
- Sandboxing considerations documented

Implementation:
```javascript
// notarize.js
module.exports = async function (params) {
  if (process.platform !== 'darwin') {
    return;
  }
  
  // Notarization process
  // ...
};
```

### Installation and Updates

macOS-specific installation considerations:

- DMG-based installation process
- Homebrew distribution via custom tap
- Auto-updates using Squirrel.Mac
- macOS-specific file locations for settings and logs

## Windows-Specific Features

### Tray Integration

On Windows, Toast App is integrated into the system tray:

- Uses standard ICO format for tray icon
- Supports light/dark mode with Windows system theme
- Left-click opens the main Toast window
- Right-click opens the context menu

Implementation:
```javascript
// src/main/tray.js
if (process.platform === 'win32') {
  tray = new Tray(path.join(__dirname, '../../assets/icons/tray-icon.png'));
  // Windows-specific settings
}
```

### Global Keyboard Shortcuts

Windows-specific keyboard shortcut handling:

- Uses Windows-specific APIs via Electron's `globalShortcut` module
- Handles Windows-specific modifier keys (Alt, Windows key)
- Special handling for Windows key combinations
- Validation against common Windows shortcuts

Implementation:
```javascript
// src/main/shortcuts.js
function registerGlobalShortcut(shortcut) {
  let modifiedShortcut = shortcut;
  if (process.platform === 'win32') {
    // Convert generic shortcut to Windows format
    modifiedShortcut = shortcut.replace('Command', 'Super');
    // Additional Windows-specific handling
  }
  // Register shortcut
}
```

### Window Management

Windows-specific window behavior:

- Uses standard Windows window decorations
- Properly handles taskbar integration
- Handles multi-monitor setups with DPI awareness
- Task Manager friendly (proper process naming)

Implementation:
```javascript
// src/main/windows.js
function createToastWindow() {
  const windowOptions = {
    // Common options
  };
  
  if (process.platform === 'win32') {
    windowOptions.frame = false;
    windowOptions.skipTaskbar = true;
    // Other Windows-specific options
  }
  
  return new BrowserWindow(windowOptions);
}
```

### Native Scripting

Windows-specific scripting capabilities:

- PowerShell integration
- Windows batch file execution
- Windows-specific command-line tools

Implementation:
```javascript
// src/main/actions/script.js
async function runScript(script, type) {
  if (process.platform === 'win32' && type === 'powershell') {
    return new Promise((resolve, reject) => {
      exec(`powershell -Command "${script.replace(/"/g, '`"')}"`, (error, stdout) => {
        if (error) reject(error);
        else resolve(stdout);
      });
    });
  }
  // Other script types
}
```

### Code Signing

Windows-specific security requirements:

- Application is signed with a valid code signing certificate
- SmartScreen filter considerations
- Windows Defender compatibility

Implementation:
```javascript
// electron-builder.yml (config)
win:
  sign: './sign.js'
```

### Installation and Updates

Windows-specific installation considerations:

- MSI and EXE installer formats
- Auto-updates using Squirrel.Windows
- Windows-specific file locations for settings and logs
- Start-up registry entries

## Common Code with Platform-Specific Branches

The Toast App uses a single codebase with platform-specific branches where necessary:

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

This allows for clean, readable platform-specific code branches.

## Cross-Platform Development Guidelines

When developing cross-platform features for Toast App:

1. **Abstract platform differences**: Create platform-specific implementations with common interfaces
2. **Test on all platforms**: Ensure features work correctly on macOS and Windows
3. **Respect platform conventions**: Follow platform-specific UI guidelines and user expectations
4. **Graceful degradation**: Fall back gracefully when a feature is not available on a platform
5. **Consistent feature parity**: Maintain core feature parity across platforms while allowing for platform-specific enhancements

## Testing on Multiple Platforms

Testing guidelines for platform-specific features:

1. Maintain test environments for both macOS and Windows
2. Use platform-specific test cases within the same test suite
3. Use conditional tests using Electron's platform detection
4. Test installation and update processes on both platforms
5. Verify UI rendering on both platforms

## Known Platform-Specific Issues

| Issue | Platform | Workaround | Status |
|-------|----------|------------|--------|
| Transparency performance | Windows | Disable transparency on low-end devices | Active |
| Keyboard shortcuts conflict with system shortcuts | macOS | Validate against known system shortcuts | Resolved |
| Tray icon appearance on dark mode | Windows | Use separate icons for light/dark mode | Resolved |
| High DPI scaling | Windows | Added DPI awareness in window creation | Resolved |
| Menu bar icon spacing | macOS | Adjusted menu bar icon padding | Resolved |