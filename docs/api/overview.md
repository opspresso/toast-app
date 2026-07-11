# Toast App API Documentation

This document provides an overview of the Toast app's internal APIs.

## API Documentation Structure

The Toast app's API documentation is organized as follows:

### Main Process API
- **[Main Process API](./main-process.md)**: Detailed API documentation for the main process modules
  - Configuration module (`config.js`)
  - Logger module (`logger.js`)
  - Updater module (`updater.js`)
  - Executor module (`executor.js`)
  - Shortcuts module (`shortcuts.js`)
  - Tray module (`tray.js`)
  - Window module (`windows.js`)
  - IPC module (`ipc.js` orchestrator + `ipc/` sub-handlers)
  - Authentication module (`auth-manager.js`, `auth.js`)
  - Cloud sync module (`cloud-sync.js`, `cloud-sync/conflict-resolver.js`)
  - Action approval module (`action-approval.js`)
  - Subscription helper module (`subscription.js`)
  - Broadcast utility (`broadcast.js`)
  - API client module (`api/client.js`)

### Action API
- **[Action API](./actions.md)**: Detailed API documentation for the action modules
  - Application action (`application.js`)
  - Exec action (`exec.js`)
  - Open action (`open.js`)
  - Script action (`script.js`)
  - Chain action (`chain.js`)

### Renderer Process API
- **[Renderer Process API](./renderer.md)**: Renderer process API documentation
  - Toast Window API (`toast.js`)
  - Settings Window API (`settings.js`)

## Quick Reference

### Key API Patterns

#### Result Object
Every API call returns a consistent result object:

```javascript
// Success result
{
  success: true,
  message: 'The operation completed successfully',
  // Operation-specific extra data
}

// Error result
{
  success: false,
  message: 'Error message',
  error: errorObject, // Original error object or string
  // Additional error details
}
```

#### Configuration Schema
Key sections of the default configuration schema:

```javascript
{
  globalHotkey: 'Alt+Space',
  pages: [],
  snippets: [],
  textExpander: { enabled: false, seeded: false },
  appearance: {
    theme: 'system',
    accentColor: 'blue',
    position: 'center',
    size: 'medium',
    opacity: 0.95,
    buttonLayout: 'grid'
  },
  advanced: {
    launchAtLogin: false,
    hideAfterAction: true,
    hideOnBlur: true,
    hideOnEscape: true,
    showInTaskbar: false
  },
  subscription: {
    isSubscribed: false,
    isAuthenticated: false,
    expiresAt: '',
    pageGroups: 1
  }
}
```

#### Supported Action Types
- `application`: Launch an application
- `exec`: Run a shell command
- `open`: Open a URL, file, or folder
- `script`: Run a custom script
- `chain`: Run a series of actions sequentially

### IPC Channel Summary

Key IPC channels:

| Channel | Type | Description |
|---------|------|-------------|
| `execute-action` | handle | Execute an action |
| `get-config` | handle | Get configuration |
| `set-config` | handle | Set configuration |
| `show-toast` | on | Show the Toast window |
| `hide-toast` | on | Hide the Toast window |
| `show-settings` | on | Show the settings window |
| `check-for-updates` | handle | Check for updates |

For the full list of IPC channels, see the [Main Process API documentation](./main-process.md#ipc-module-srcmainipcjs).

## Development Guidelines

### Notes on Using the API

1. **Error handling**: Implement proper error handling for every API call
2. **Platform compatibility**: Account for platform-specific differences
3. **Security**: Always validate user input
4. **Performance**: Make appropriate use of asynchronous operations

### Extension Guide

When adding a new API:

1. Add the function to the appropriate module
2. Use the consistent result object format
3. Implement proper error handling
4. Update the documentation
5. Write test code

## Related Documentation

- [Configuration Schema](../config/schema.md): Detailed configuration options
- [Button Actions](../guide/actions.md): Supported button action types
- [Security](../architecture/security.md): Security model and considerations
- [Testing](../development/testing.md): API testing strategy

## Version Information

The API follows semantic versioning:
- **Major version**: Backward-incompatible changes
- **Minor version**: New features that maintain backward compatibility
- **Patch version**: Bug fixes and minor improvements

For detailed information on the current API version, see the documentation for each module.
