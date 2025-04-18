# Toast App Project Structure

This document provides a detailed overview of the Toast App project structure, explaining the purpose and organization of directories and files.

## Directory Structure

```
toast-app/
├── assets/                # Application assets
│   └── icons/             # Application icons
├── docs/                  # Documentation assets
│   └── images/            # Documentation images
├── src/                   # Source code
│   ├── main/              # Main process code
│   │   ├── actions/       # Action implementations
│   │   ├── config.js      # Configuration management
│   │   ├── executor.js    # Action execution
│   │   ├── ipc.js         # IPC handling
│   │   ├── shortcuts.js   # Global shortcuts
│   │   ├── tray.js        # System tray
│   │   └── windows.js     # Window management
│   ├── renderer/          # Renderer process code
│   │   ├── pages/         # Application pages
│   │   │   ├── toast/     # Toast popup UI
│   │   │   └── settings/  # Settings UI
│   │   └── preload/       # Preload scripts
│   └── index.js           # Application entry point
├── tests/                 # Test files
│   ├── unit/              # Unit tests
│   ├── integration/       # Integration tests
│   └── e2e/               # End-to-end tests
└── [Configuration Files]  # Various configuration files
```

## Key Files and Directories

### Root Directory

- **package.json**: Project metadata, dependencies, and scripts
- **package-lock.json**: Dependency lock file
- **.gitignore**: Git ignore rules
- **.eslintrc.js**: ESLint configuration
- **.prettierrc**: Prettier configuration
- **jest.config.js**: Jest testing configuration
- **README.md**: Project overview and documentation

### Documentation

- **ARCHITECTURE.md**: System architecture and design decisions
- **API_DOCUMENTATION.md**: Internal API documentation
- **CONFIG_SCHEMA.md**: Configuration options and schema
- **CONTRIBUTING.md**: Contribution guidelines
- **DEVELOPMENT_ROADMAP.md**: Future development plans
- **PAGES.md**: Page layout and navigation structure
- **PROJECT_STRUCTURE.md**: This file - project structure documentation
- **SCENARIOS.md**: User scenarios and workflows
- **SECURITY.md**: Security policies and procedures
- **TECHNICAL_REQUIREMENTS.md**: Technical specifications and requirements
- **TESTING_STRATEGY.md**: Testing approach and methodologies
- **USER_GUIDE.md**: End-user documentation

### Source Code

#### Main Process (`src/main/`)

The main process is responsible for application lifecycle, window management, and system integration.

- **index.js**: Application entry point
- **config.js**: Configuration management using electron-store
- **windows.js**: Window creation and management
- **tray.js**: System tray icon and menu
- **shortcuts.js**: Global shortcut registration and handling
- **ipc.js**: Inter-process communication setup
- **executor.js**: Action execution orchestration

#### Action Handlers (`src/main/actions/`)

Action handlers implement specific action types.

- **exec.js**: Execute shell commands
- **open.js**: Open URLs, files, and folders
- **shortcut.js**: Simulate keyboard shortcuts
- **script.js**: Execute custom scripts

#### Renderer Process (`src/renderer/`)

The renderer process handles the user interface.

##### Preload Scripts (`src/renderer/preload/`)

Preload scripts provide a secure bridge between renderer and main processes.

- **toast.js**: Preload script for the Toast window
- **settings.js**: Preload script for the Settings window

##### Pages (`src/renderer/pages/`)

Pages contain the HTML, CSS, and JavaScript for each window.

###### Toast Window (`src/renderer/pages/toast/`)

- **index.html**: HTML structure for the Toast window
- **styles.css**: CSS styles for the Toast window
- **index.js**: JavaScript for the Toast window

###### Settings Window (`src/renderer/pages/settings/`)

- **index.html**: HTML structure for the Settings window
- **styles.css**: CSS styles for the Settings window
- **index.js**: JavaScript for the Settings window

### Assets (`assets/`)

- **icons/**: Application icons in various formats
  - **icon.svg**: Vector icon
  - **icon.icns**: macOS icon
  - **icon.ico**: Windows icon
  - **tray-icon.png**: System tray icon
  - **tray-icon-Template.png**: macOS template icon for dark mode

### Tests (`tests/`)

- **unit/**: Unit tests for individual functions and components
- **integration/**: Integration tests for component interactions
- **e2e/**: End-to-end tests for user workflows
- **mocks/**: Mock objects and functions for testing
- **setup.js**: Test setup configuration

## File Details

### Main Process Files

#### `src/index.js`

The entry point for the Electron application. It initializes the app, creates windows, and sets up event listeners.

Key responsibilities:
- Initialize the application
- Create windows
- Register global shortcuts
- Set up IPC handlers
- Handle application lifecycle events

#### `src/main/config.js`

Manages application configuration using electron-store.

Key responsibilities:
- Define configuration schema
- Provide default values
- Validate configuration
- Handle configuration migration
- Import/export configuration

#### `src/main/windows.js`

Manages window creation, positioning, and lifecycle.

Key responsibilities:
- Create Toast and Settings windows
- Position windows based on configuration
- Show and hide windows
- Handle window events

#### `src/main/tray.js`

Manages the system tray icon and menu.

Key responsibilities:
- Create and update the tray icon
- Build the tray context menu
- Handle tray events

#### `src/main/shortcuts.js`

Manages global keyboard shortcuts.

Key responsibilities:
- Register and unregister global shortcuts
- Handle shortcut events
- Position the Toast window

#### `src/main/ipc.js`

Sets up IPC channels and handlers.

Key responsibilities:
- Define IPC channels
- Handle IPC messages
- Forward actions to the Executor
- Send configuration updates to renderers

#### `src/main/executor.js`

Orchestrates action execution.

Key responsibilities:
- Validate actions
- Determine action type
- Forward actions to specific handlers
- Handle action results

### Action Handler Files

#### `src/main/actions/exec.js`

Handles executing shell commands.

Key responsibilities:
- Execute shell commands
- Handle command output
- Support working directory
- Support terminal execution

#### `src/main/actions/open.js`

Handles opening URLs, files, and folders.

Key responsibilities:
- Open URLs in the default browser
- Open files with associated applications
- Open folders in the file explorer

#### `src/main/actions/shortcut.js`

Handles simulating keyboard shortcuts.

Key responsibilities:
- Parse shortcut strings
- Simulate key presses
- Handle platform-specific shortcuts

#### `src/main/actions/script.js`

Handles executing custom scripts.

Key responsibilities:
- Execute JavaScript scripts
- Execute AppleScript (macOS)
- Execute PowerShell scripts (Windows)
- Execute Bash scripts (macOS/Linux)

### Renderer Process Files

#### `src/renderer/preload/toast.js`

Preload script for the Toast window.

Key responsibilities:
- Expose IPC methods to the renderer
- Handle configuration updates
- Execute actions
- Control window visibility

#### `src/renderer/preload/settings.js`

Preload script for the Settings window.

Key responsibilities:
- Expose IPC methods to the renderer
- Get and set configuration
- Test actions
- Show dialogs
- Control application

#### `src/renderer/pages/toast/index.html`

HTML structure for the Toast window.

Key elements:
- Toast container
- Search input
- Button container
- Status container
- Button template

#### `src/renderer/pages/toast/styles.css`

CSS styles for the Toast window.

Key features:
- Light and dark theme support
- Responsive layout
- Button styling
- Animation effects

#### `src/renderer/pages/toast/index.js`

JavaScript for the Toast window.

Key responsibilities:
- Initialize the UI
- Handle button clicks
- Handle keyboard navigation
- Execute actions
- Filter buttons based on search

#### `src/renderer/pages/settings/index.html`

HTML structure for the Settings window.

Key elements:
- Settings tabs
- Form controls
- Button editor dialog
- Action parameter templates

#### `src/renderer/pages/settings/styles.css`

CSS styles for the Settings window.

Key features:
- Light and dark theme support
- Form styling
- Dialog styling
- Tab navigation

#### `src/renderer/pages/settings/index.js`

JavaScript for the Settings window.

Key responsibilities:
- Initialize the UI
- Handle form submission
- Validate inputs
- Save configuration
- Manage buttons

## Build and Configuration Files

### `package.json`

Defines project metadata, dependencies, and scripts.

Key sections:
- Project metadata
- Dependencies
- Development dependencies
- Scripts
- Build configuration

### `.eslintrc.js`

ESLint configuration for code linting.

Key features:
- JavaScript rules
- Electron-specific rules
- Code style rules

### `.prettierrc`

Prettier configuration for code formatting.

Key settings:
- Tab width
- Use of semicolons
- Quote style
- Trailing commas

### `jest.config.js`

Jest configuration for testing.

Key settings:
- Test environment
- Coverage settings
- Module aliases
- Test matchers

## Conclusion

This project structure follows a modular design with clear separation of concerns. The main process handles system-level operations, while the renderer processes handle the user interface. The action system is designed to be extensible, making it easy to add new action types in the future.

The documentation is comprehensive, covering architecture, API, configuration, and user guides. The testing strategy includes unit, integration, and end-to-end tests to ensure code quality and reliability.
