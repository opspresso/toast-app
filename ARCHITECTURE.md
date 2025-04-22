# Toast App Architecture

This document describes the high-level architecture of Toast App, including its components, data flow, and design decisions.

## Overview

Toast App is an Electron-based desktop application that provides a customizable shortcut launcher for macOS and Windows. The application follows a modular architecture with clear separation of concerns between the main process and renderer processes.

## System Architecture

### High-Level Components

```
┌─────────────────────────────────────────────────────────────┐
│                        Toast App                            │
│                                                             │
│  ┌─────────────┐          ┌─────────────┐                   │
│  │             │          │             │                   │
│  │ Main Process │◄────────►│  Renderer   │                   │
│  │             │   IPC    │  Processes  │                   │
│  │             │          │             │                   │
│  └─────┬───────┘          └─────────────┘                   │
│        │                                                    │
│        ▼                                                    │
│  ┌─────────────┐                                            │
│  │             │                                            │
│  │   Native    │                                            │
│  │   System    │                                            │
│  │             │                                            │
│  └─────────────┘                                            │
└─────────────────────────────────────────────────────────────┘
```

### Main Process

The main process is responsible for:

1. Application lifecycle management
2. Window management
3. System tray integration
4. Global shortcut registration
5. Configuration management
6. Action execution
7. Inter-process communication (IPC)

### Renderer Processes

Toast App has two main renderer processes:

1. **Toast Window**: The popup window that displays buttons and executes actions
2. **Settings Window**: The window for configuring the application

Each renderer process has its own HTML, CSS, and JavaScript files, and communicates with the main process via IPC.

## Component Architecture

### Main Process Components

```
┌─────────────────────────────────────────────────────────────┐
│                      Main Process                           │
│                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐      │
│  │             │    │             │    │             │      │
│  │   Config    │    │   Windows   │    │    Tray     │      │
│  │   Manager   │    │   Manager   │    │   Manager   │      │
│  │             │    │             │    │             │      │
│  └─────────────┘    └─────────────┘    └─────────────┘      │
│                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐      │
│  │             │    │             │    │             │      │
│  │  Shortcuts  │    │     IPC     │    │   Executor  │      │
│  │   Manager   │    │   Handler   │    │             │      │
│  │             │    │             │    │             │      │
│  └─────────────┘    └─────────────┘    └─────────────┘      │
│                                                             │
│                     ┌─────────────┐                         │
│                     │             │                         │
│                     │   Actions   │                         │
│                     │             │                         │
│                     └─────────────┘                         │
└─────────────────────────────────────────────────────────────┘
```

#### Config Manager (`src/main/config.js`)

Handles configuration storage, validation, and migration using electron-store.

**Responsibilities:**
- Store and retrieve configuration
- Validate configuration against schema
- Provide default values
- Handle configuration migration
- Import/export configuration

**Configuration Schema:**
- **globalHotkey**: Global keyboard shortcut to trigger the Toast popup
- **pages**: Array of page configurations, each containing buttons
- **appearance**: Visual appearance settings (theme, position, size, opacity, buttonLayout)
- **advanced**: Advanced behavior settings (launchAtLogin, hideAfterAction, etc.)
- **subscription**: Subscription status and features
- **firstLaunchCompleted**: Flag indicating whether the first launch setup has been completed

#### Windows Manager (`src/main/windows.js`)

Manages the creation, positioning, and lifecycle of application windows.

**Responsibilities:**
- Create Toast and Settings windows
- Position windows based on configuration
- Show and hide windows
- Handle window events
- Activate English keyboard input source for cross-platform compatibility
- Send configuration to renderer processes

#### Tray Manager (`src/main/tray.js`)

Manages the system tray icon and menu.

**Responsibilities:**
- Create and update the tray icon
- Build the tray context menu
- Handle tray events

#### Shortcuts Manager (`src/main/shortcuts.js`)

Manages global keyboard shortcuts.

**Responsibilities:**
- Register and unregister global shortcuts
- Handle shortcut events
- Position the Toast window based on configuration (center, top, bottom, cursor)
- Toggle Toast window visibility

#### IPC Handler (`src/main/ipc.js`)

Handles inter-process communication between the main process and renderer processes.

**Responsibilities:**
- Set up IPC channels
- Handle IPC messages
- Forward actions to the Executor
- Send configuration updates to renderers
- Provide methods for renderer processes to manipulate configuration
- Handle keyboard shortcut recording

#### Executor (`src/main/executor.js`)

Executes actions based on their type.

**Responsibilities:**
- Validate actions
- Execute actions
- Handle action results
- Forward actions to specific action handlers
- Execute chained actions in sequence

#### Actions (`src/main/actions/*.js`)

Implements specific action types.

**Responsibilities:**
- Execute specific action types (exec, open, shortcut, script, chain)
- Handle action-specific parameters
- Return standardized results
- Handle platform-specific behavior

### Renderer Process Components

#### Toast Window

```
┌─────────────────────────────────────────────────────────────┐
│                     Toast Window                            │
│                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐      │
│  │             │    │             │    │             │      │
│  │    Toast    │    │   Button    │    │   Paging    │      │
│  │  Controller │    │  Component  │    │  Component  │      │
│  │             │    │             │    │             │      │
│  └─────────────┘    └─────────────┘    └─────────────┘      │
│                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐      │
│  │             │    │             │    │             │      │
│  │   Status    │    │    IPC      │    │   Button    │      │
│  │  Component  │    │   Bridge    │    │    Modal    │      │
│  │             │    │             │    │             │      │
│  └─────────────┘    └─────────────┘    └─────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

#### Toast Window Components

- **Toast Controller**: Main controller for the Toast window
  - Handles button creation and management
  - Manages page switching
  - Handles keyboard navigation
  - Executes actions
  - Manages settings mode

- **Button Component**: Represents an action button
  - Displays button name, icon, and shortcut
  - Handles click events
  - Provides visual feedback

- **Paging Component**: Manages multiple pages of buttons
  - Displays page tabs
  - Handles page switching
  - Provides add/remove page functionality

- **Status Component**: Displays status messages
  - Shows success, error, and info messages
  - Provides visual feedback for actions

- **Button Modal**: Modal dialog for editing button settings
  - Edits button properties
  - Validates inputs
  - Provides action-specific input fields

#### Settings Window

```
┌─────────────────────────────────────────────────────────────┐
│                    Settings Window                          │
│                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐      │
│  │             │    │             │    │             │      │
│  │  Settings   │    │   Buttons   │    │ Appearance  │      │
│  │ Controller  │    │  Component  │    │  Component  │      │
│  │             │    │             │    │             │      │
│  └─────────────┘    └─────────────┘    └─────────────┘      │
│                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐      │
│  │             │    │             │    │             │      │
│  │  Advanced   │    │   Button    │    │    IPC      │      │
│  │  Component  │    │   Editor    │    │   Bridge    │      │
│  │             │    │             │    │             │      │
│  └─────────────┘    └─────────────┘    └─────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

## Page Architecture

Toast App organizes buttons into pages, allowing users to create multiple sets of buttons for different purposes.

### Page Structure

```
┌─────────────────────────────────────────────────────────────┐
│                        Pages                                │
│                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐      │
│  │             │    │             │    │             │      │
│  │   Page 1    │    │   Page 2    │    │   Page 3    │      │
│  │             │    │             │    │             │      │
│  └─────────────┘    └─────────────┘    └─────────────┘      │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                                                     │    │
│  │                  Current Page                       │    │
│  │                                                     │    │
│  │  ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐    │    │
│  │  │ Button │  │ Button │  │ Button │  │ Button │    │    │
│  │  └────────┘  └────────┘  └────────┘  └────────┘    │    │
│  │                                                     │    │
│  │  ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐    │    │
│  │  │ Button │  │ Button │  │ Button │  │ Button │    │    │
│  │  └────────┘  └────────┘  └────────┘  └────────┘    │    │
│  │                                                     │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

Each page contains:
- **Name**: Display name of the page
- **Shortcut**: Keyboard shortcut to access the page (1-9)
- **Buttons**: Array of button configurations

### Page Management

- **Page Navigation**: Users can switch between pages using the page tabs or keyboard shortcuts
- **Page Creation**: Users can add new pages up to a limit based on subscription status
- **Page Deletion**: Users can delete pages they no longer need
- **Page Configuration**: Configuration is stored in the pages array in config.js

## Data Flow

### Configuration Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│             │     │             │     │             │
│  Config     │     │   Main      │     │  Renderer   │
│  Store      │◄───►│   Process   │◄───►│  Processes  │
│             │     │             │     │             │
└─────────────┘     └─────────────┘     └─────────────┘
```

1. The Config Manager loads configuration from disk on startup
2. Configuration is validated against the schema
3. Default values are applied for missing or invalid properties
4. Configuration is made available to other main process components
5. Configuration is sent to renderer processes via IPC
6. Changes made in the Settings window are sent back to the main process
7. The main process updates the configuration store
8. Configuration changes are propagated to affected components

### Action Execution Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│             │     │             │     │             │     │             │
│   Toast     │     │    IPC      │     │  Executor   │     │   Action    │
│   Window    │────►│   Handler   │────►│             │────►│  Handlers   │
│             │     │             │     │             │     │             │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
       ▲                                       │                   │
       │                                       │                   │
       └───────────────────────────────────────┴───────────────────┘
                            Results
```

1. User clicks a button or uses a shortcut in the Toast window
2. The action request is sent to the main process via IPC
3. The IPC Handler forwards the request to the Executor
4. The Executor validates the action and determines its type
5. The action is forwarded to the appropriate Action Handler
6. The Action Handler executes the action
7. Results are returned to the Executor
8. The Executor formats the results and returns them to the IPC Handler
9. The IPC Handler sends the results back to the Toast window
10. The Toast window displays the results to the user

### Page Navigation Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│             │     │             │     │             │
│   User      │     │    Toast    │     │ Toast Page  │
│  Interface  │────►│  Controller │────►│ Component   │
│             │     │             │     │             │
└─────────────┘     └─────────────┘     └─────────────┘
                          │                    │
                          │                    │
                          ▼                    ▼
                    ┌─────────────┐     ┌─────────────┐
                    │             │     │             │
                    │   Button    │     │    IPC      │
                    │  Container  │     │   Bridge    │
                    │             │     │             │
                    └─────────────┘     └─────────────┘
```

1. User clicks a page tab or presses a number key (1-9)
2. The Toast Controller handles the page change event
3. The current page index is updated
4. The Page Component updates the active page indicator
5. The Button Container is updated to show buttons from the selected page
6. Status messages are updated to reflect the page change

### Global Shortcut Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│             │     │             │     │             │
│   Global    │     │  Shortcuts  │     │   Windows   │
│  Shortcut   │────►│   Manager   │────►│   Manager   │
│             │     │             │     │             │
└─────────────┘     └─────────────┘     └─────────────┘
                                               │
                                               ▼
                                        ┌─────────────┐
                                        │             │
                                        │    Toast    │
                                        │   Window    │
                                        │             │
                                        └─────────────┘
```

1. User presses the global shortcut
2. The operating system notifies Electron
3. Electron triggers the registered shortcut callback
4. The Shortcuts Manager handles the shortcut event
5. The Shortcuts Manager requests the Windows Manager to show the Toast window
6. The Windows Manager positions and shows the Toast window
7. The Windows Manager activates the English keyboard input source for consistent behavior

### Button Editing Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│             │     │             │     │             │
│  Settings   │     │   Button    │     │    IPC      │
│    Mode     │────►│    Modal    │────►│   Bridge    │
│             │     │             │     │             │
└─────────────┘     └─────────────┘     └─────────────┘
                                               │
                                               ▼
                                        ┌─────────────┐
                                        │             │
                                        │   Config    │
                                        │   Store     │
                                        │             │
                                        └─────────────┘
                                               │
                                               ▼
                                        ┌─────────────┐
                                        │             │
                                        │   Button    │
                                        │  Container  │
                                        │             │
                                        └─────────────┘
```

1. User toggles settings mode by clicking the gear icon or pressing the comma key
2. User clicks a button to edit its settings
3. The Button Modal is displayed with the current button settings
4. User modifies button properties and saves
5. The updated button configuration is sent to the main process via IPC
6. The Config Store is updated with the new button settings
7. The Button Container is refreshed to display the updated button
8. Status messages are updated to reflect the button update

## Design Decisions

### Electron Architecture

Toast App uses Electron's main process and renderer process architecture to separate concerns:

- **Main Process**: Handles system-level operations and coordinates the application
- **Renderer Processes**: Handle user interface and user interactions

This separation provides several benefits:

1. **Security**: Renderer processes run in a sandboxed environment
2. **Stability**: Issues in the UI don't affect the core application
3. **Performance**: UI rendering doesn't block system operations
4. **Maintainability**: Clear separation of concerns

### Page System Design

The page system is designed to provide flexibility and organization:

1. **Multiple Pages**: Users can create up to 9 pages, organized by context or function
2. **Page Navigation**: Simple navigation via tabs or number keys
3. **Page Management**: Users can add, remove, and organize pages
4. **Subscription Tiers**:
   - Unauthenticated free users (ANONYMOUS): Limited to 1 page
   - Authenticated free users (AUTHENTICATED): Up to 3 pages
   - Subscribers (PREMIUM): Up to 9 pages

This approach allows users to organize their shortcuts based on different contexts or workflows, making the application more versatile.

### Modular Design

The application is designed with modularity in mind:

1. **Component-Based**: Each component has a single responsibility
2. **Loose Coupling**: Components communicate through well-defined interfaces
3. **High Cohesion**: Related functionality is grouped together

This approach makes the codebase easier to understand, maintain, and extend.

### Configuration Management

Toast App uses electron-store for configuration management:

1. **Schema Validation**: Configuration is validated against a schema
2. **Default Values**: Missing or invalid properties use default values
3. **Persistence**: Configuration is automatically saved to disk
4. **Migration**: Configuration is migrated when the schema changes

This ensures that the application always has valid configuration, even if the configuration file is corrupted or missing.

### IPC Communication

Communication between the main process and renderer processes uses Electron's IPC mechanism:

1. **Context Isolation**: Renderer processes use contextBridge for secure IPC
2. **Asynchronous Communication**: IPC is asynchronous to avoid blocking
3. **Standardized Interfaces**: IPC channels have well-defined interfaces
4. **Error Handling**: Errors are caught and returned as part of the result

This approach provides a secure and reliable communication channel between processes.

### Action System

The action system is designed to be extensible:

1. **Action Types**: Different action types are implemented as separate modules
2. **Common Interface**: All action types implement a common interface
3. **Validation**: Actions are validated before execution
4. **Standardized Results**: Action results follow a consistent format
5. **Chained Actions**: Support for executing multiple actions in sequence

This makes it easy to add new action types in the future.

### Keyboard Interaction

Toast App puts strong emphasis on keyboard interaction:

1. **Global Hotkey**: The app can be triggered with a customizable global hotkey
2. **Button Shortcuts**: Each button has an associated keyboard shortcut
3. **Page Shortcuts**: Pages can be accessed via number keys
4. **Keyboard Navigation**: Arrow keys can be used to navigate between buttons
5. **English Keyboard Activation**: The app ensures English keyboard input for consistent behavior

This approach makes the application efficient for keyboard-oriented users.

## Technology Stack

### Core Technologies

- **Electron**: Cross-platform desktop application framework
- **Node.js**: JavaScript runtime for the main process
- **HTML/CSS/JavaScript**: For the renderer processes
- **electron-store**: For configuration storage

### Main Process Libraries

- **electron-global-shortcut**: For global shortcut registration
- **@nut-tree-fork/nut-js**: For keyboard shortcut simulation
- **child_process**: For executing shell commands

### Renderer Process Libraries

- **No external libraries**: The renderer processes use vanilla JavaScript for simplicity and performance

## Security Considerations

### Process Isolation

Toast App uses Electron's process isolation features:

1. **Context Isolation**: Renderer processes run in isolated contexts
2. **Node Integration Disabled**: Renderer processes don't have direct access to Node.js
3. **Remote Module Disabled**: Renderer processes can't directly access main process modules

### Input Validation

All user inputs and configuration values are validated:

1. **Schema Validation**: Configuration is validated against a schema
2. **Action Validation**: Actions are validated before execution
3. **IPC Validation**: IPC messages are validated before processing

### Sandboxed Execution

Actions that execute code or commands are sandboxed:

1. **Shell Commands**: Shell commands are executed in a controlled environment
2. **Scripts**: Scripts run in a sandboxed environment with limited access

## Performance Considerations

### Startup Performance

Toast App is designed for fast startup:

1. **Lazy Loading**: Components are loaded only when needed
2. **Minimal Dependencies**: The application uses minimal external dependencies
3. **Efficient Configuration**: Configuration is loaded efficiently

### Runtime Performance

The application is optimized for runtime performance:

1. **Asynchronous Operations**: Long-running operations are asynchronous
2. **Efficient IPC**: IPC communication is optimized for performance
3. **Minimal UI Updates**: UI updates are batched for efficiency
4. **Limited Rerendering**: Only the necessary components are rerendered when data changes

## Future Architecture Considerations

### Plugin System

A future version of Toast App may include a plugin system:

1. **Plugin API**: A well-defined API for plugins
2. **Plugin Isolation**: Plugins run in isolated contexts
3. **Plugin Discovery**: Automatic discovery of installed plugins

### Cloud Synchronization

Toast App already includes cloud synchronization for subscribers:

1. **Secure Storage**: Encrypted storage of configuration in the cloud
2. **Automatic Sync**: Synchronizes settings across devices when logging in
3. **Feature Availability**: Available for subscribers and authenticated users with cloud_sync feature enabled

Future enhancements may include:
1. **Conflict Resolution Improvements**: Enhanced handling of conflicts between different devices
2. **Selective Sync**: Allowing users to choose what to synchronize

### Mobile Companion

A mobile companion app may be developed:

1. **Shared Architecture**: Reuse of core components
2. **Secure Communication**: Encrypted communication between devices
3. **Offline Operation**: Functionality when disconnected from the main app

### Advanced Theming

More advanced theming options may be implemented:

1. **Custom CSS**: Allow users to customize the appearance with custom CSS
2. **Theme Editor**: Visual editor for creating custom themes
3. **Theme Sharing**: Ability to share themes with other users

## Conclusion

Toast App's architecture is designed to be modular, maintainable, and extensible. By separating concerns and using well-defined interfaces, the application can evolve over time while maintaining stability and performance.

The page system allows users to organize their shortcuts effectively, while the action system provides flexibility for various types of operations. The combination of keyboard shortcuts, global hotkey, and intuitive UI makes the application efficient for both casual and power users.

The architecture balances simplicity with flexibility, allowing for future enhancements while keeping the current implementation clean and understandable.
