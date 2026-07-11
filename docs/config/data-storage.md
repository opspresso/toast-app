# Toast App Data Storage

This document describes the Toast app's data storage model, file structure, and management methods.

> **Note**: For the data schema and entity relationships, see [Data Model](./data-model.md).

## Table of Contents

- [Overview](#overview)
- [Data Storage Structure](#data-storage-structure)
  - [Configuration File](#configuration-file)
  - [User Data](#user-data)
  - [Authentication Tokens](#authentication-tokens)
  - [Log Files](#log-files)
- [Data Access Patterns](#data-access-patterns)
  - [Configuration Access](#configuration-access)
  - [User Data Access](#user-data-access)
- [Data Caching and Performance](#data-caching-and-performance)
- [Troubleshooting](#troubleshooting)

## Overview

The Toast app stores several types of data on the local file system. This data includes user configuration, authentication information, logs, and more. This document describes the structure, location, and management of these various data stores.

## Data Storage Structure

The Toast app uses the electron-store library to persist data. This is a JSON-based store that saves data in the operating system's standard user data directory location.

### Configuration File

**Location** (Electron's `app.getPath('userData')` uses the `productName` field `Toast` from `package.json`):
- **macOS**: `~/Library/Application Support/Toast/config.json`
- **Windows**: `%APPDATA%\Toast\config.json`
- **Linux**: `~/.config/Toast/config.json`

**Structure**:
The configuration file is stored in JSON format and contains the following main sections:

```json
{
  "globalHotkey": "Alt+Space",
  "pages": [
    {
      "name": "Applications",
      "shortcut": "1",
      "buttons": [
        {
          "name": "Terminal",
          "shortcut": "Q",
          "icon": "⌨️",
          "action": "exec",
          "command": "open -a Terminal"
        }
        // More buttons...
      ]
    }
    // More pages...
  ],
  "snippets": [
    { "id": "default-email", "keyword": "!email", "content": "email@toast.sh", "enabled": true, "label": "Email" }
  ],
  "textExpander": { "enabled": false, "seeded": true },
  "appearance": {
    "theme": "system",
    "position": "center",
    "size": "medium",
    "opacity": 0.95,
    "buttonLayout": "grid",
    "monitorPositions": {
      "12345": { "x": 100, "y": 200 }
    }
  },
  "advanced": {
    "launchAtLogin": false,
    "hideAfterAction": true,
    "hideOnBlur": true,
    "hideOnEscape": true,
    "showInTaskbar": false
  },
  "subscription": {
    "isSubscribed": false,
    "isAuthenticated": false,
    "expiresAt": "",
    "pageGroups": 1
  },
  "cloudSync": {
    "enabled": true
  },
  "firstLaunchCompleted": true
}
```

For detailed configuration options, see [Configuration Schema](./schema.md).

### User Data

**Location**:
- **macOS**: `~/Library/Application Support/Toast/`
- **Windows**: `%APPDATA%\Toast\`
- **Linux**: `~/.config/Toast/`

**Structure**:
User data is stored directly in the application data directory:

```
Toast/
  ├── config.json            # Main configuration file (electron-store)
  ├── user-profile.json      # User profile information
  ├── user-settings.json     # User settings and sync metadata
  └── auth-tokens.json       # Authentication tokens
```

**user-profile.json structure**:
```json
{
  "name": "User Name",
  "email": "user@example.com",
  "is_authenticated": true,
  "isAuthenticated": true,
  "subscription": {
    "plan": "free",
    "active": false,
    "is_subscribed": false,
    "features": {
      "page_groups": 1,
      "advanced_actions": false,
      "cloud_sync": false
    }
  }
}
```

**user-settings.json structure**:
```json
{
  "lastSyncedAt": 1682932769000,
  "lastModifiedAt": 1682932768123,
  "lastSyncedDevice": "device-id-1",
  "lastModifiedDevice": "device-id-1"
}
```

### Authentication Tokens

**Location**:
- **macOS**: `~/Library/Application Support/Toast/auth-tokens.json`
- **Windows**: `%APPDATA%\Toast\auth-tokens.json`
- **Linux**: `~/.config/Toast/auth-tokens.json`

**Structure**:
Authentication tokens are stored in JSON format:

```json
{
  "auth-token": "eyJhbGciOiJIUzI1NiIs...",
  "refresh-token": "eyJhbGciOiJIUzI1NiIs...",
  "token-expires-at": 1715000000000
}
```

> **Note**: Tokens are currently stored as plaintext JSON. They are protected by file system permissions and stored in the operating system's user data directory.

> **Note**: If the `CONFIG_SUFFIX` environment variable is set, the token file name changes to `auth-tokens-${CONFIG_SUFFIX}.json`.

### Log Files

**Location** (explicitly configured to `{userData}/logs/toast-app.log` in `src/main/logger.js`):
- **macOS**: `~/Library/Application Support/Toast/logs/toast-app.log`
- **Windows**: `%APPDATA%\Toast\logs\toast-app.log`
- **Linux**: `~/.config/Toast/logs/toast-app.log`

**Structure**:
This directory stores the application logs:

```
logs/
  ├── toast-app.log           # Current log file
  └── ...                     # Rotated older log files (managed by electron-log, up to 5MB × 5)
```

## Data Access Patterns

### Configuration Access

Configuration data is accessed through the `src/main/config.js` module:

```javascript
const { createConfigStore } = require('./main/config');

// Create the configuration store
const config = createConfigStore();

// Get a configuration value
const globalHotkey = config.get('globalHotkey');

// Set a configuration value
config.set('appearance.theme', 'dark');

// Set multiple values at once
config.set({
  'appearance.theme': 'dark',
  'appearance.position': 'center'
});
```

Key configuration access patterns:

1. **Load on initialization**: Configuration is loaded when the application starts.
2. **Reactive change detection**: Changes to the configuration are detected in real time and reflected in the application's behavior.
3. **Automatic saving**: Configuration changes are saved to disk automatically.
4. **Direct disk access**: The configuration file can be accessed as plaintext JSON from outside the application.

### User Data Access

User data management is handled through the `src/main/user-data-manager.js` module:

```javascript
const userDataManager = require('./main/user-data-manager');

// Get the user profile
const profile = await userDataManager.getUserProfile();

// Update sync metadata (synchronous function)
userDataManager.updateSyncMetadata({
  lastSyncedAt: Date.now(),
  lastSyncedDevice: 'device-123'
});
```

## Data Caching and Performance

The Toast app uses in-memory caching to optimize performance, especially in the following areas:

1. **Configuration caching**: Configuration values are cached in memory to reduce repeated disk access.
2. **User profile caching**: User profile data is cached in memory and retained throughout the authenticated session.
3. **Token caching**: Authentication tokens are cached in memory to reduce repeated access to secure storage.
4. **Button configuration caching**: Frequently accessed button configurations are cached in both the main memory and the renderer process.

Cached data is automatically synchronized with disk whenever it changes.

## Troubleshooting

**File permission issues**:
1. Check the file permissions of the data directory.
2. Ensure all files are readable/writable by the current user.

**Export failures**:
1. Verify you have write permission to the selected location.
2. Ensure there is enough disk space.
3. Restart the app and try again before exporting.

**Import failures**:
1. Verify the import file is in valid JSON format.
2. Ensure the file is not corrupted.
3. If necessary, manually edit the file to fix JSON syntax errors.
