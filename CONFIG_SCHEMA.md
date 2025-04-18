# Toast App Configuration Schema

This document describes the configuration schema used by Toast App, including all available settings, their data types, default values, and descriptions.

## Overview

Toast App uses [electron-store](https://github.com/sindresorhus/electron-store) for persistent configuration storage. The configuration is stored as a JSON file in the user's application data directory:

- **macOS**: `~/Library/Application Support/toast-app/config.json`
- **Windows**: `%APPDATA%\toast-app\config.json`
- **Linux**: `~/.config/toast-app/config.json`

## Schema Structure

The configuration schema is defined in `src/main/config.js` and consists of the following main sections:

1. **globalHotkey**: The global keyboard shortcut to trigger the Toast popup
2. **buttons**: Array of button configurations
3. **appearance**: Visual appearance settings
4. **advanced**: Advanced behavior settings
5. **firstLaunchCompleted**: Flag indicating whether the first launch setup has been completed

## Schema Details

### Global Hotkey

```json
"globalHotkey": {
  "type": "string",
  "default": "Alt+Space"
}
```

The global hotkey is a string representing a keyboard shortcut that follows the [Electron Accelerator](https://www.electronjs.org/docs/latest/api/accelerator) format.

Examples:
- `"Alt+Space"`
- `"CommandOrControl+Shift+T"`
- `"F12"`

### Buttons

```json
"buttons": {
  "type": "array",
  "default": [
    {
      "name": "Terminal",
      "shortcut": "T",
      "icon": "⌨️",
      "action": "exec",
      "command": "platform-specific-command"
    },
    // More default buttons...
  ]
}
```

Each button object can have the following properties:

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `name` | string | Yes | Display name of the button |
| `shortcut` | string | No | Single-key shortcut (e.g., "T", "B") |
| `icon` | string | No | Emoji or icon name |
| `action` | string | Yes | Action type: "exec", "open", "shortcut", or "script" |
| `command` | string | For "exec" | Shell command to execute |
| `workingDir` | string | No | Working directory for command execution |
| `runInTerminal` | boolean | No | Whether to run the command in a terminal |
| `url` | string | For "open" | URL to open |
| `path` | string | For "open" | File or folder path to open |
| `application` | string | No | Application to use for opening |
| `keys` | string | For "shortcut" | Keyboard shortcut to simulate |
| `script` | string | For "script" | Script content |
| `scriptType` | string | For "script" | Script language: "javascript", "applescript", "powershell", or "bash" |

### Appearance

```json
"appearance": {
  "type": "object",
  "properties": {
    "theme": {
      "type": "string",
      "enum": ["light", "dark", "system"],
      "default": "system"
    },
    "position": {
      "type": "string",
      "enum": ["center", "top", "bottom", "cursor"],
      "default": "center"
    },
    "size": {
      "type": "string",
      "enum": ["small", "medium", "large"],
      "default": "medium"
    },
    "opacity": {
      "type": "number",
      "minimum": 0.1,
      "maximum": 1.0,
      "default": 0.95
    },
    "buttonLayout": {
      "type": "string",
      "enum": ["grid", "list"],
      "default": "grid"
    }
  },
  "default": {
    "theme": "system",
    "position": "center",
    "size": "medium",
    "opacity": 0.95,
    "buttonLayout": "grid"
  }
}
```

#### Theme Options

- `"light"`: Light theme
- `"dark"`: Dark theme
- `"system"`: Follow system theme

#### Position Options

- `"center"`: Center of the screen
- `"top"`: Top center of the screen
- `"bottom"`: Bottom center of the screen
- `"cursor"`: Near the cursor position

#### Size Options

- `"small"`: 350x400 pixels
- `"medium"`: 400x500 pixels
- `"large"`: 500x600 pixels

#### Button Layout Options

- `"grid"`: Buttons arranged in a grid
- `"list"`: Buttons arranged in a vertical list

### Advanced

```json
"advanced": {
  "type": "object",
  "properties": {
    "launchAtLogin": {
      "type": "boolean",
      "default": false
    },
    "hideAfterAction": {
      "type": "boolean",
      "default": true
    },
    "hideOnBlur": {
      "type": "boolean",
      "default": true
    },
    "hideOnEscape": {
      "type": "boolean",
      "default": true
    },
    "showInTaskbar": {
      "type": "boolean",
      "default": false
    }
  },
  "default": {
    "launchAtLogin": false,
    "hideAfterAction": true,
    "hideOnBlur": true,
    "hideOnEscape": true,
    "showInTaskbar": false
  }
}
```

#### Advanced Settings

- `launchAtLogin`: Start the application when the user logs in
- `hideAfterAction`: Hide the Toast window after executing an action
- `hideOnBlur`: Hide the Toast window when it loses focus
- `hideOnEscape`: Hide the Toast window when the Escape key is pressed
- `showInTaskbar`: Show the Toast window in the taskbar/dock

### First Launch Completed

```json
"firstLaunchCompleted": {
  "type": "boolean",
  "default": false
}
```

This flag is set to `true` after the first launch setup is completed. It is used to determine whether to show the settings window on startup.

## Example Configuration

```json
{
  "globalHotkey": "Alt+Space",
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
    },
    {
      "name": "File Explorer",
      "shortcut": "F",
      "icon": "📁",
      "action": "exec",
      "command": "open ."
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
  "firstLaunchCompleted": true
}
```

## Configuration API

The configuration can be accessed and modified using the following API:

### Main Process

```javascript
const { createConfigStore } = require('./main/config');
const config = createConfigStore();

// Get a value
const globalHotkey = config.get('globalHotkey');

// Set a value
config.set('globalHotkey', 'Alt+Shift+Space');

// Get all buttons
const buttons = config.get('buttons');

// Add a button
buttons.push(newButton);
config.set('buttons', buttons);
```

### Renderer Process (via IPC)

```javascript
// Get a value
const globalHotkey = await window.settings.getConfig('globalHotkey');

// Set a value
await window.settings.setConfig('globalHotkey', 'Alt+Shift+Space');

// Get all configuration
const config = await window.settings.getConfig();

// Reset to defaults
await window.settings.resetConfig();
```

## Configuration Validation

The configuration is validated against the schema when it is loaded. If a value is invalid or missing, the default value is used instead.

## Configuration Migration

When the schema changes in a new version, the configuration is automatically migrated to the new schema. Missing properties are added with their default values, and invalid values are replaced with their default values.

## Configuration Backup

The configuration is automatically backed up before any changes are made. The backup is stored in the same directory as the configuration file with a `.backup` extension.

## Configuration Import/Export

The configuration can be imported from and exported to a JSON file using the following API:

```javascript
const { importConfig, exportConfig } = require('./main/config');

// Import configuration
importConfig(config, '/path/to/config.json');

// Export configuration
exportConfig(config, '/path/to/config.json');
```

These functions are also available in the renderer process via IPC.
