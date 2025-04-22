# Toast App Documentation Update

This document provides an update on the current implementation of Toast App, based on a thorough analysis of the codebase. It reflects the latest features and architecture.

## Overview

Toast App is an Electron-based desktop application that provides a customizable shortcut launcher for macOS and Windows. The app allows users to define custom buttons with various actions and organize them into pages for easy access.

## Key Features Implemented

The current implementation includes the following key features:

### Multi-Page Support

- Users can organize buttons into multiple pages (up to 9 pages)
- Each page can contain up to 15 buttons in a default 5x3 grid layout
- Pages are accessible via numbered shortcuts (1-9) or pagination buttons
- Page management includes adding, removing, and navigating between pages

### Button Management

- Each button can be customized with:
  - Name
  - Icon (emoji or custom icon)
  - Keyboard shortcut (single key)
  - Action type and parameters

### Action Types

The application supports multiple action types:

1. **Execute Command (`exec`)**: Run system commands
   - Support for terminal commands
   - Optional working directory
   - Option to run in terminal

2. **Open (`open`)**: Open URLs, files, or folders
   - URL validation and protocol handling
   - File/folder path resolution
   - Optional application selection

3. **Keyboard Shortcut (`shortcut`)**: Simulate keyboard shortcuts
   - Support for platform-specific shortcuts
   - Multi-key combinations

4. **Script (`script`)**: Execute custom scripts
   - JavaScript execution in a sandboxed environment
   - AppleScript (macOS only)
   - PowerShell (Windows only)
   - Bash scripts (macOS/Linux)

5. **Chain (`chain`)**: Execute multiple actions in sequence
   - Sequential execution of actions
   - Optional stop on error

### Settings and Configuration

- Global hotkey configuration
- Appearance settings:
  - Theme (light, dark, system)
  - Window position
  - Window size
  - Opacity
  - Button layout (grid or list)
- Advanced settings:
  - Launch at login
  - Hide after action
  - Hide on blur
  - Hide on escape
  - Show in taskbar

### User Interface

- Toast window:
  - Search functionality
  - Keyboard navigation
  - Status feedback
  - Settings mode for in-place button editing
- Settings window:
  - Tab-based navigation
  - Form controls for all settings
  - Reset to defaults option

### System Integration

- System tray/menu bar integration
- Global hotkey registration
- Auto-launch capability
- Auto-update capability
- Cross-platform support (macOS and Windows)

### Auto-Update System

- Automatic update checking on application startup (production mode only)
- Silent download of updates in the background
- Notification to users when updates are available
- Automatic installation on application restart
- Comprehensive logging of update process
- Error handling for update failures

## Architecture

The application follows a modular architecture with clear separation of concerns:

### Main Process

- **Application Lifecycle**: Initialization, window management, event handling, auto-updates
- **Configuration**: Schema validation, defaults, migration
- **System Integration**: Global shortcuts, tray icon, auto-launch
- **IPC Handling**: Communication with renderer processes
- **Action Execution**: Validation, execution, error handling

### Renderer Process

- **Toast Window**: Button display, search, keyboard navigation, action execution
- **Settings Window**: Configuration UI, form validation, configuration saving

### Data Flow

- Configuration is loaded from disk on startup
- Configuration is shared with renderer processes via IPC
- User actions in the UI trigger IPC calls to the main process
- Main process executes actions and returns results to renderer processes
- Configuration changes are saved to disk and propagated to affected components

## Implementation Details

### Page System

The page system allows users to organize buttons into logical groups. The implementation includes:

- Dynamic page rendering based on configuration
- Keyboard shortcuts for quick navigation between pages
- Add/remove page functionality with confirmation dialogs
- Automatic page numbering and shortcut assignment
- Subscription-based limitation on the number of pages (for future monetization)

### Settings Mode

The Toast window includes a settings mode for in-place button editing:

- Toggle with the gear icon or comma (,) key
- Click on any button to edit its properties
- Modal dialog for editing button settings
- Input validation for required fields
- Immediate saving of changes to configuration

### Action System

The action system is designed to be extensible with a common interface:

1. Actions are validated before execution
2. Each action type has a dedicated handler module
3. Results follow a consistent format
4. Error handling is implemented at multiple levels

### Chain Actions

The chain action type allows for sequential execution of multiple actions:

- Array of actions to execute in order
- Optional `stopOnError` flag to control behavior on failure
- Comprehensive result object with individual action results
- Validation of all chained actions before execution

## Configuration Schema

The configuration schema includes:

```javascript
{
  globalHotkey: "Alt+Space",
  pages: [
    {
      name: "Page 1",
      shortcut: "1",
      buttons: [
        {
          name: "Button Name",
          shortcut: "A",
          icon: "🔍",
          action: "exec",
          command: "echo 'Hello, world!'"
        },
        // More buttons...
      ]
    },
    // More pages...
  ],
  appearance: {
    theme: "system",
    position: "center",
    size: "medium",
    opacity: 0.95,
    buttonLayout: "grid"
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
    subscribedUntil: "",
    pageGroups: 1
  },
  firstLaunchCompleted: false
}
```

## User Experience

The user experience is designed to be efficient and intuitive:

1. Users press the global hotkey to open the Toast window
2. The window appears at the configured position
3. Users can click buttons, use keyboard shortcuts, or navigate with arrow keys
4. After executing an action, the window provides status feedback
5. The window automatically hides based on user settings

## Future Enhancements

Based on the current implementation, potential future enhancements include:

1. **Plugin System**: Allow third-party plugins to extend functionality
2. **Cloud Synchronization**: Sync configuration across devices
3. **Action Templates**: Pre-defined action templates for common tasks
4. **More Action Types**: Additional action types such as API calls
5. **Improved Customization**: Custom themes, button styles, animations
6. **Search History**: Track and suggest frequently used buttons
7. **Folders and Categories**: Hierarchical organization of buttons
8. **Drag and Drop**: Visual rearranging of buttons
9. **Mobile Companion**: Mobile app integration
10. **Advanced Scheduling**: Time-based or event-based actions

## Suggested Documentation Updates

Based on this analysis, the following existing documentation files should be updated:

1. **ARCHITECTURE.md**:
   - Add details about the page system architecture
   - Update component diagrams to include new components
   - Expand the action system description to include chain actions
   - Update data flow diagrams for multi-page support

2. **PAGES.md**:
   - Update page layouts to reflect multi-page support
   - Add documentation for the settings mode UI
   - Add details about page navigation
   - Update keyboard shortcuts section

3. **API_DOCUMENTATION.md**:
   - Add documentation for page-related APIs
   - Update action API documentation to include chain actions
   - Add documentation for new IPC channels

4. **CONFIG_SCHEMA.md**:
   - Update the configuration schema to include pages
   - Document new appearance options
   - Update examples to show multi-page configuration

5. **USER_GUIDE.md**:
   - Add instructions for page management
   - Document settings mode usage
   - Update keyboard shortcuts section
   - Add examples of different action types

## Conclusion

The current implementation of Toast App provides a solid foundation for a customizable shortcut launcher. The modular architecture allows for easy extension and maintenance, while the user interface focuses on efficiency and simplicity. With multi-page support and a variety of action types, users can create complex workflows tailored to their needs.
