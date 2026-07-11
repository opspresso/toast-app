# Toast App Settings Management

This document provides an overview and detailed information about the Toast app's settings system.

## Table of Contents

- [Settings System Overview](#settings-system-overview)
- [Settings Window Structure](#settings-window-structure)
- [Settings Schema](#settings-schema)
- [Key Features](#key-features)
- [Future Improvement Plans](#future-improvement-plans)
- [Settings Troubleshooting](#settings-troubleshooting)
- [Conclusion](#conclusion)

## Settings System Overview

Toast app's settings management is implemented on top of Electron-store, allowing settings to be changed intuitively through the user interface.

The Toast app settings system consists of the following components:

1. **Settings store**: Uses `electron-store` to store settings locally in JSON format.
2. **Settings management module**: `src/main/config.js` provides settings schema definition and management functionality.
3. **Settings UI**: Lets users view and change settings through a user-friendly interface.
4. **Cloud sync**: Provides settings synchronization for premium users.

## Settings Window Structure

The settings window consists of four tabs, where the tab name matches the page title.

### 1. Settings
The General / Appearance / Advanced sections are laid out on a single scrolling page.

- **General**
  - **Global Hotkey**: Sets the global shortcut used to invoke the application
  - **Launch at login**: Sets whether the app runs automatically when the system logs in
- **Appearance**
  - **Theme**: Choose the System/Light/Dark theme
  - **Accent Color**: Choose the accent color: Blue (default)/Red/Orange/Green/Purple/Mono. Synced across devices via cloud sync
  - **Window position**: Choose Center, Top, Bottom, or Cursor position. If you drag the window to move it, the position is saved per monitor (`appearance.monitorPositions`), and the saved position takes precedence over this setting
  - **Window size**: Choose Small, Medium, or Large
  - **Window opacity**: Adjust opacity via a slider (0.1-1.0)
  - The schema's `buttonLayout` (grid/list) is applied by the renderer but no control to change it is exposed in the settings UI (default `grid`)
- **Advanced**
  - **Hide after action / Hide on blur / Hide on Escape key**: Automatic window-hiding settings
  - **Show in taskbar**: Sets whether the app appears in the taskbar
  - **Reset to Defaults**: Resets all settings to their defaults except pages (`pages`) and snippets (`snippets`)

### 2. Account
The account/subscription and Cloud Sync sections are placed together.

- **Account & Subscription**
  - **Login/Logout**: User account authentication
  - **Profile information**: Displays the user name, email, and profile image after login
  - **Subscription info/management**: Displays the current subscription status, expiration date, and provided features, and navigates to the management page
- **Cloud Sync**
  - **Sync status**: Displays the current sync status and the last sync time
  - **Enable/disable sync**: Toggles the cloud sync feature
  - **Manual sync**: Upload to server, download from server, and conflict resolution

### 3. Snippets
- **Enable text expansion**: Toggles the feature that automatically replaces keywords typed in other apps (default off, macOS only)
- **Permission status/request**: Guidance on Accessibility and Input Monitoring permissions and opening System Settings
- **Snippet management**: Add/edit/delete keyword/replacement text, and enable items individually
- For detailed behavior, see [Snippets (Text Expansion)](./snippets.md)

### 4. About
- **Version info**: Displays the current app version
- **Update management**: Automatic download, install, and restart when checking for updates
- **Homepage link**: Navigates to the official website
- **Alternative update methods**: Guidance on alternative update methods such as Homebrew and GitHub Releases

## Settings Schema

The Toast app uses the following settings schema (key excerpts — the full schema also includes the `_sync` sync metadata and the `security` action-approval state keys. See the [schema documentation](../config/schema.md)):

```javascript
const schema = {
  globalHotkey: {
    type: 'string',
    default: 'Alt+Space',
  },
  pages: {
    type: 'array',
    default: [],
  },
  snippets: {
    type: 'array',
    default: [],
  },
  textExpander: {
    type: 'object',
    default: { enabled: false, seeded: false },
  },
  appearance: {
    type: 'object',
    properties: {
      theme: {
        type: 'string',
        enum: ['light', 'dark', 'system'],
        default: 'system',
      },
      accentColor: {
        type: 'string',
        enum: ['blue', 'red', 'orange', 'green', 'purple', 'mono'],
        default: 'blue',
      },
      position: {
        type: 'string',
        enum: ['center', 'top', 'bottom', 'cursor'],
        default: 'center',
      },
      monitorPositions: {
        type: 'object',
        default: {},
        description: 'Saved window positions for each monitor',
      },
      size: {
        type: 'string',
        enum: ['small', 'medium', 'large'],
        default: 'medium',
      },
      opacity: {
        type: 'number',
        minimum: 0.1,
        maximum: 1.0,
        default: 0.95,
      },
      buttonLayout: {
        type: 'string',
        enum: ['grid', 'list'],
        default: 'grid',
      },
    },
    default: {
      theme: 'system',
      accentColor: 'blue',
      position: 'center',
      size: 'medium',
      opacity: 0.95,
      buttonLayout: 'grid',
    },
  },
  advanced: {
    type: 'object',
    properties: {
      launchAtLogin: {
        type: 'boolean',
        default: false,
      },
      hideAfterAction: {
        type: 'boolean',
        default: true,
      },
      hideOnBlur: {
        type: 'boolean',
        default: true,
      },
      hideOnEscape: {
        type: 'boolean',
        default: true,
      },
      showInTaskbar: {
        type: 'boolean',
        default: false,
      },
    },
    default: {
      launchAtLogin: false,
      hideAfterAction: true,
      hideOnBlur: true,
      hideOnEscape: true,
      showInTaskbar: false,
    },
  },
  subscription: {
    type: 'object',
    properties: {
      isSubscribed: {
        type: 'boolean',
        default: false,
      },
      isAuthenticated: {
        type: 'boolean',
        default: false,
      },
      expiresAt: {
        type: 'string',
        default: '',
      },
      pageGroups: {
        type: 'number',
        default: 1,
        description: 'Number of page groups: 1 for free users, 3 for authenticated users, 9 for subscribers',
      },
    },
    default: {
      isSubscribed: false,
      isAuthenticated: false,
      expiresAt: '',
      pageGroups: 1,
    },
  },
  firstLaunchCompleted: {
    type: 'boolean',
    default: false,
  },
};
```

## Key Features

### Saving and Loading Settings

Toast app settings are saved automatically and loaded when the application starts. There is no separate "Save" button; when a settings-change event occurs, the change is applied and saved immediately via `setConfig`.

```javascript
// Example of saving settings
window.settings.setConfig('globalHotkey', 'Alt+Space');
window.settings.setConfig('appearance.theme', 'dark');

// Example of loading settings
const config = await window.settings.getConfig();
```

### Settings Migration

The settings schema may change when the application is updated. To handle this, the Toast app provides a migration mechanism:

```javascript
function createConfigStore() {
  try {
    // First load the config without schema validation to migrate it
    const migrationStore = new Store({
      schema: null, // Disable schema validation
      clearInvalidConfig: false,
    });

    // Migrate subscription information
    // ...

    // Now create the Store object with normal schema validation
    return new Store({ schema });
  } catch (error) {
    // Fallback handling on error
    // ...
  }
}
```

### Importing/Exporting Settings

Users can export settings to a file or import them from a file:

```javascript
// Export settings
function exportConfig(config, filePath) {
  const configData = {
    globalHotkey: config.get('globalHotkey'),
    pages: config.get('pages'),
    snippets: config.get('snippets'),
    appearance: config.get('appearance'),
    advanced: config.get('advanced'),
  };

  fs.writeFileSync(filePath, JSON.stringify(configData, null, 2), 'utf8');
}

// Import settings
function importConfig(config, filePath) {
  const importedConfig = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  // Validate and apply
  // ...
}
```

### Cloud Sync

Premium subscribers can sync their settings to the cloud to maintain a consistent environment across multiple devices:

1. **Automatic sync**: Automatically syncs with the server when settings change
2. **Manual sync**: The user explicitly requests upload/download
3. **Conflict resolution**: Provides a resolution mechanism when local and remote settings conflict

### Authentication and Subscription Management

The Toast app provides features for managing user accounts and subscriptions:

1. **Login/Logout**: OAuth-based authentication
2. **Subscription status check**: Displays the current subscription status and provided features
3. **Subscription renewal**: Links to the subscription management page

### Update Management

The Toast app can stay up to date through its automatic update system:

1. **Check for updates**: Checks the server for the latest version information
2. **Download update**: Downloads the latest version file
3. **Install update**: Applies the update by restarting the app
4. **Alternative update methods**: Provides options such as Homebrew and GitHub Releases

## Future Improvement Plans

Building on the current settings system, the following improvements are planned:

### 1. User Experience Improvements

- **Unified search**: Add a search feature to quickly find settings items
- **Settings preview**: A feature to preview the effect of settings changes in real time
- **Enhanced responsive design**: Provide a settings UI optimized for various screen sizes

### 2. Feature Expansion

- **More granular notification settings**: Settings for each notification type
- **Language and localization settings**: Multilingual interface support
- **Accessibility improvements**: Add screen reader compatibility, high-contrast mode, and more

### 3. Technical Improvements

- **Performance optimization**: Improve settings load and save speed
- **Stronger modularization**: Separate each settings section into an independent module
- **Plugin system**: Settings extensibility for third-party developers
- **Improved sync algorithm**: Support more efficient cloud sync

## Settings Troubleshooting

Common methods to help users resolve settings-related issues:

1. **Reset settings**: In the Advanced tab, use the 'Reset to Defaults' button to reset all settings to their defaults except pages (`pages`) and snippets (`snippets`).
2. **Settings file location**: The settings file is stored in the following locations:
   - Windows: `%APPDATA%\Toast\config.json`
   - macOS: `~/Library/Application Support/Toast/config.json`
   - Linux: `~/.config/Toast/config.json`
3. **Check the logs**: You can check the log files to diagnose problems:
   - Windows: `%APPDATA%\Toast\logs`
   - macOS: `~/Library/Application Support/Toast/logs`
   - Linux: `~/.config/Toast/logs`
4. **Cloud sync issues**: If a sync error occurs, try the 'Resolve Conflicts' feature, or disable and then re-enable sync.

## Conclusion

The Toast app's settings system is designed with user experience at its center and provides a wide range of features and extensibility. Through cloud sync and update management, you can maintain a consistent environment across multiple devices and take advantage of the latest features.

Future improvements are planned to provide an even more intuitive and user-friendly settings experience.
