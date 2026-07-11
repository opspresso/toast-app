# Toast App Configuration Schema

This document describes the configuration options and schema for the Toast app. It covers the configuration file location, format, available options, and examples.

For a detailed description of button action types, see [Button Actions](../guide/actions.md).

## Table of Contents

- [Configuration File Location](#configuration-file-location)
- [Configuration Options](#configuration-options)
  - [Global Hotkey](#global-hotkey)
  - [Pages and Buttons](#pages-and-buttons)
  - [Appearance](#appearance)
  - [Advanced Settings](#advanced-settings)
  - [Authentication and Subscription](#authentication-and-subscription)
  - [Miscellaneous](#miscellaneous)
  - [Cloud Sync Metadata](#cloud-sync-metadata)
  - [Security (Device-Local)](#security-device-local)
  - [Snippets (Text Expansion)](#snippets-text-expansion)
- [Configuration Example](#configuration-example)
- [Programmatic Access](#programmatic-access)

## Configuration File Location

The Toast app's configuration file is stored in the following locations depending on the operating system:

- **macOS**: `~/Library/Application Support/Toast/config.json`
- **Windows**: `%APPDATA%\Toast\config.json`
- **Linux**: `~/.config/Toast/config.json`

The configuration file is stored in JSON format and can be modified through the app's settings UI or edited directly with a text editor.

## Configuration Options

### Global Hotkey

| Option | Type | Default | Description |
|------|------|--------|------|
| `globalHotkey` | string | `"Alt+Space"` | Global keyboard shortcut that invokes the Toast popup |

**Example**:
```json
"globalHotkey": "Ctrl+Shift+T"
```

**Supported format**:
- Modifier keys: `Ctrl`, `Alt`, `Shift`, `Meta` (`Command` on macOS)
- Regular keys: `A-Z`, `0-9`, `F1-F12`, arrow keys, etc.
- Combine modifiers and regular keys with `+` (e.g., `Ctrl+Alt+T`)

### Pages and Buttons

| Option | Type | Default | Description |
|------|------|--------|------|
| `pages` | array | `[]` | Array of button page configurations |

**Page properties**:

| Property | Type | Required | Description |
|------|------|------|------|
| `name` | string | Yes | Display name of the page |
| `shortcut` | string | Yes | Shortcut for accessing the page (1-9) |
| `buttons` | array | Yes | Array of buttons on the page |

**Button properties**:

| Property | Type | Required | Description |
|------|------|------|------|
| `name` | string | Yes | Display name of the button |
| `shortcut` | string | Yes | Shortcut that triggers the button action (fixed order: qwertasdfgzxcvb) |
| `icon` | string | No | Emoji or icon to display on the button |
| `action` | string | Yes | Action type (`application`, `exec`, `open`, `script`, `chain`) |

> **Action-specific parameters**: For a detailed description of the required and optional parameters for each action type, see [Button Actions](../guide/actions.md).

> **Button shortcut rule**: Button shortcuts are automatically assigned in order as qwertasdfgzxcvb based on their position within the page. When a button's position changes, its shortcut is automatically reassigned according to the new order.

**Example**:
```json
"pages": [
  {
    "name": "Page 1",
    "shortcut": "1",
    "buttons": [
      {
        "name": "Terminal",
        "shortcut": "Q",
        "icon": "⌨️",
        "action": "exec",
        "command": "open -a Terminal"
      },
      {
        "name": "Browser",
        "shortcut": "W",
        "icon": "🌐",
        "action": "open",
        "url": "https://www.google.com"
      }
    ]
  }
]
```

### Appearance

| Option | Type | Default | Description |
|------|------|--------|------|
| `appearance.theme` | string | `"system"` | UI theme (`"light"`, `"dark"`, `"system"`) |
| `appearance.accentColor` | string | `"blue"` | Accent color theme (`"blue"`, `"red"`, `"orange"`, `"green"`, `"purple"`, `"mono"`). Synced to the cloud |
| `appearance.position` | string | `"center"` | Toast popup position (`"center"`, `"top"`, `"bottom"`, `"cursor"`) |
| `appearance.monitorPositions` | object | `{}` | Saved window position for each monitor |
| `appearance.size` | string | `"medium"` | Toast popup size (`"small"`, `"medium"`, `"large"`) |
| `appearance.opacity` | number | `0.95` | Toast popup opacity (0.1 - 1.0) |
| `appearance.buttonLayout` | string | `"grid"` | Button layout (`"grid"`, `"list"`) |

**Example**:
```json
"appearance": {
  "theme": "dark",
  "accentColor": "blue",
  "position": "center",
  "size": "medium",
  "opacity": 0.9,
  "buttonLayout": "grid"
}
```

### Advanced Settings

| Option | Type | Default | Description |
|------|------|--------|------|
| `advanced.launchAtLogin` | boolean | `false` | Whether to launch the app automatically at login |
| `advanced.hideAfterAction` | boolean | `true` | Whether to automatically hide the Toast popup after an action runs |
| `advanced.hideOnBlur` | boolean | `true` | Whether to hide the Toast popup when it loses focus |
| `advanced.hideOnEscape` | boolean | `true` | Whether to hide the Toast popup when the Escape key is pressed |
| `advanced.showInTaskbar` | boolean | `false` | Whether to show the Toast window in the taskbar/dock |

**Example**:
```json
"advanced": {
  "launchAtLogin": true,
  "hideAfterAction": true,
  "hideOnBlur": true,
  "hideOnEscape": true,
  "showInTaskbar": false
}
```

### Authentication and Subscription

| Option | Type | Default | Description |
|------|------|--------|------|
| `subscription.isSubscribed` | boolean | `false` | Whether the user has a premium subscription |
| `subscription.isAuthenticated` | boolean | `false` | User authentication status |
| `subscription.expiresAt` | string | `""` | Subscription expiration date (ISO string) |
| `subscription.pageGroups` | number | `1` | Maximum number of page groups the user can create |

At login, `updatePageGroupSettings` (`src/main/auth.js`) additionally stores the following fields (dynamic fields outside the schema):

| Field | Description |
|------|------|
| `subscription.active` | Whether the subscription is active (stored alongside `isSubscribed`) |
| `subscription.plan` | Subscription plan name (e.g., `premium`, `pro`, `vip`) |
| `subscription.isVip` | Whether the user is VIP |
| `subscription.features.page_groups` / `features.advanced_actions` / `features.cloud_sync` | Feature flags granted by the server |
| `subscription.additionalFeatures.advancedActions` / `additionalFeatures.cloudSync` | camelCase mirror of the feature flags (used for cloud sync eligibility) |

**Example**:
```json
"subscription": {
  "isSubscribed": false,
  "isAuthenticated": false,
  "expiresAt": "",
  "pageGroups": 1
}
```

**Page limit policy**:
- **Free users**: 1 page
- **Authenticated users**: up to 3 pages
- **Premium subscribers**: up to 9 pages

The actual number of page groups applied is determined dynamically based on the user's authentication and subscription status, in functions such as `updatePageGroupSettings` in `src/main/auth.js`.

### Miscellaneous

| Option | Type | Default | Description |
|------|------|--------|------|
| `firstLaunchCompleted` | boolean | `false` | Whether the first launch has been completed |

### Cloud Sync

| Option | Type | Default | Description |
|------|------|--------|------|
| `cloudSync.enabled` | boolean | - | Whether cloud sync is enabled (saved via the settings window toggle; dynamic field outside the schema) |

### Cloud Sync Metadata

These metadata fields are managed automatically when the cloud sync feature is in use. Users do not edit these fields directly; they are set automatically by the sync system.

For more details on cloud sync, see [Cloud Sync](../features/cloud-sync.md).

| Field | Type | Description |
|------|------|------|
| `_sync.lastModifiedAt` | number | Time of the last local modification (timestamp) |
| `_sync.lastModifiedDevice` | string | ID of the device that made the last modification |
| `_sync.lastSyncedAt` | number | Time of the last sync with the server (timestamp) |
| `_sync.lastSyncedDevice` | string | ID of the device that last synced |
| `_sync.dataHash` | string | Hash of the sync data (for conflict detection) |
| `_sync.isConflicted` | boolean | Whether a sync conflict has occurred |

**Example**:
```json
{
  "_sync": {
    "lastModifiedAt": 1682932768123,
    "lastModifiedDevice": "device-id-1",
    "lastSyncedAt": 1682932769000,
    "lastSyncedDevice": "device-id-1",
    "dataHash": "",
    "isConflicted": false
  }
}
```

### Security (Device-Local)

The `security` key stores the per-device approval state for `exec`/`script` actions downloaded via cloud sync. These fields are **device-local only** and are not uploaded to the cloud. For details on the behavior, see [Cloud Sync](../features/cloud-sync.md#download-validation-and-action-approval).

| Field | Type | Default | Description |
|------|------|--------|------|
| `security.approvalsInitialized` | boolean | `false` | Whether the trust list has been seeded from the local configuration |
| `security.trustedActions` | array | `[]` | List of fingerprints of `exec`/`script` actions approved to run on this device |
| `security.pendingApprovals` | array | `[]` | List of risky actions downloaded via cloud sync that are awaiting one-time user approval |

**Example**:
```json
{
  "security": {
    "approvalsInitialized": true,
    "trustedActions": ["<sha256-fingerprint>"],
    "pendingApprovals": []
  }
}
```

### Snippets (Text Expansion)

The `snippets` key is an array of inline text expansion snippets. Like pages, it is synced to the cloud. Whether the feature is enabled (`textExpander.enabled`) is **device-local only** and not synced, because the permission is per-device. For details on behavior, permissions, and constraints, see [Text Expansion](../features/snippets.md).

| Field | Type | Default | Description |
|------|------|--------|------|
| `snippets` | array | `[]` | List of snippets. Each item: `{ id, keyword, content, enabled, label }` |
| `textExpander.enabled` | boolean | `false` | Whether text expansion is enabled on this device (device-local, not synced) |
| `textExpander.seeded` | boolean | `false` | Whether default snippets have been seeded on this device (device-local, not synced) |

**Example**:
```json
{
  "snippets": [
    { "id": "default-email", "keyword": "!email", "content": "email@toast.sh", "enabled": true, "label": "Email" }
  ],
  "textExpander": { "enabled": false }
}
```

## Configuration Example

The following is an example of a complete configuration file:

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
          "shortcut": "T",
          "icon": "⌨️",
          "action": "exec",
          "command": "open -a Terminal"
        },
        {
          "name": "Browser",
          "shortcut": "B",
          "icon": "🌐",
          "action": "open",
          "url": "https://www.google.com"
        }
      ]
    },
    {
      "name": "Development",
      "shortcut": "2",
      "buttons": [
        {
          "name": "VS Code",
          "shortcut": "Q",
          "icon": "💻",
          "action": "exec",
          "command": "open -a 'Visual Studio Code'"
        },
        {
          "name": "GitHub",
          "shortcut": "W",
          "icon": "🐙",
          "action": "open",
          "url": "https://github.com"
        }
      ]
    }
  ],
  "appearance": {
    "theme": "system",
    "position": "center",
    "size": "medium",
    "opacity": 0.95,
    "buttonLayout": "grid"
  },
  "advanced": {
    "launchAtLogin": true,
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
  "firstLaunchCompleted": true,
  "_sync": {
    "lastModifiedAt": 1682932768123,
    "lastModifiedDevice": "device-id-1",
    "lastSyncedAt": 1682932769000,
    "lastSyncedDevice": "device-id-1",
    "dataHash": "",
    "isConflicted": false
  }
}
```

## Programmatic Access

To access the configuration programmatically within the Toast app, use the `config.js` module:

```javascript
const { createConfigStore, resetToDefaults } = require('./config');

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

// Reset to the default configuration
resetToDefaults(config);
```
