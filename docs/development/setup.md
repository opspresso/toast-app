# Toast App Development Guide

This document describes the Toast app's development environment setup, project structure, build process, and development workflow.

## Table of Contents

- [Development Environment Setup](#development-environment-setup)
- [Project Structure](#project-structure)
- [Build Process](#build-process)
- [Development Workflow](#development-workflow)
- [Logging System](#logging-system)
- [Auto-Update](#auto-update)
- [Debugging](#debugging)
- [Coding Guidelines](#coding-guidelines)
- [Common Development Tasks](#common-development-tasks)

## Development Environment Setup

### Prerequisites

- **Node.js**: v20.18 or later (based on `engines.node` in `package.json`)
- **npm**: v10 or later
- **Git**
- Basic knowledge of Electron, JavaScript, and desktop application development

### Cloning and Setting Up the Repository

1. Clone the repository:
```bash
git clone https://github.com/opspresso/toast-app.git
cd toast-app
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

### Recommended Development Tools

- **Visual Studio Code**: The following extensions are recommended
  - ESLint: Code quality and style checking
  - Prettier: Code formatting
  - Debugger for Chrome/Electron: Debugging
  - Jest: Running and debugging tests

- **Chrome DevTools**: For debugging the renderer process

### Environment Variable Configuration

To set up local environment variables in your development environment:

1. Create a `.env` or `.env.local` file in the `src/main/config/` directory.
2. `.env.local` takes precedence over `.env` and is ignored by Git.

```bash
# .env example
CLIENT_ID=your_client_id
CLIENT_SECRET=your_client_secret
TOAST_URL=https://app.toast.sh
TOKEN_EXPIRES_IN=31536000
```

For detailed environment variable configuration, see the [Environment Variables documentation](../config/environment.md).

## Project Structure

The Toast app follows the standard structure of separating Electron's main process and renderer process:

```
toast-app/
├── assets/                # Application assets
│   └── icons/             # Application icons
├── docs/                  # Documentation
├── src/                   # Source code
│   ├── main/              # Main process code
│   │   ├── actions/       # Action implementations
│   │   ├── api/           # API client
│   │   ├── cloud-sync/    # Sync conflict resolution (conflict-resolver)
│   │   ├── config/        # Environment configuration (env.js)
│   │   ├── ipc/           # Domain-specific IPC handlers (8 of them)
│   │   ├── text-expander/ # Snippet text expansion (key hooking / matching)
│   │   ├── utils/         # Utilities (app icon extraction, etc.)
│   │   ├── action-approval.js # Cloud sync action approval
│   │   ├── auth.js        # Authentication handling
│   │   ├── auth-manager.js # Authentication state synchronization
│   │   ├── broadcast.js   # Event dispatch to both windows
│   │   ├── cloud-sync.js  # Cloud synchronization
│   │   ├── config.js      # Configuration management
│   │   ├── constants.js   # Constant definitions
│   │   ├── executor.js    # Action execution
│   │   ├── ipc.js         # IPC orchestrator
│   │   ├── logger.js      # Logging system
│   │   ├── shortcuts.js   # Global shortcuts
│   │   ├── subscription.js # Subscription-based feature determination
│   │   ├── tray.js        # System tray
│   │   ├── updater.js     # Auto-update
│   │   ├── user-data-manager.js # User data management
│   │   └── windows.js     # Window management
│   ├── renderer/          # Renderer process code
│   │   ├── assets/        # Renderer assets
│   │   ├── common/        # Common utilities
│   │   ├── pages/         # Application pages
│   │   │   ├── toast/     # Toast popup UI
│   │   │   └── settings/  # Settings UI
│   │   └── preload/       # Preload scripts
│   └── index.js           # Application entry point
├── tests/                 # Test files
│   ├── mocks/             # Electron API mocks
│   ├── unit/              # Unit tests
│   ├── integration/       # Integration tests
│   ├── e2e/               # End-to-end tests
│   └── setup.js           # Jest setup
├── .editorconfig          # Editor configuration
├── .eslintrc.js           # ESLint configuration
├── .prettierrc            # Prettier configuration
├── jest.config.js         # Jest configuration
├── package.json           # Project metadata and dependencies
└── README.md              # Project overview
```

### Key Files and Directories

#### Main Process (`src/main/`)

The application entry point is `src/index.js`.

- **config.js**: User configuration management (using electron-store)
- **constants.js**: App-wide constant definitions
- **windows.js**: Application window management
- **tray.js**: System tray icon management
- **shortcuts.js**: Global shortcut management
- **executor.js**: Action execution logic
- **ipc.js**: IPC channels and handlers
- **auth.js**: Authentication and token management
- **auth-manager.js**: Authentication state synchronization and UI notifications
- **cloud-sync.js**: Cloud synchronization logic
- **user-data-manager.js**: User data management
- **logger.js**: Application logging system
- **updater.js**: Auto-update management

#### Actions (`src/main/actions/`)

- **application.js**: Application-related actions
- **exec.js**: Command execution actions
- **open.js**: URL and file opening actions
- **script.js**: Script execution actions
- **chain.js**: Chaining multiple actions

#### Renderer Process (`src/renderer/`)

- **pages/toast/**: Toast popup UI implementation
- **pages/settings/**: Settings UI implementation
- **preload/**: Preload scripts for the renderer

## Build Process

### Development Mode

To run the application during development:

```bash
npm run dev
```

This command starts the Electron application with `NODE_ENV=development`. There is no file watching or automatic reload, so you must restart the application to reflect changes.

### Production Build

To build the application for distribution:

```bash
# Build for the current platform
npm run build

# Build for a specific platform
npm run build:mac    # For macOS
npm run build:win    # For Windows
npm run build:mas    # For the macOS App Store
```

The built application is generated in the `dist/` directory.

### Running Tests

```bash
# Run all tests
npm run test
```

**Note**: Currently, package.json only defines the basic `npm run test` script. If additional test scripts are needed, you can add them to package.json as follows:

```json
{
  "scripts": {
    "test:unit": "jest tests/unit",
    "test:integration": "jest tests/integration",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
  }
}
```

### Linting and Formatting

```bash
# Lint the code
npm run lint

# Automatically fix linting issues
npm run lint:fix   # ESLint --fix


# Format the code
npm run format
```

## Development Workflow

The Toast app follows a feature branch workflow:

1. **Start from the latest main branch**:
```bash
git checkout main
git pull
```

2. **Create a feature branch**:
```bash
git checkout -b feature/your-feature-name
```
Or for a bug fix:
```bash
git checkout -b fix/issue-number-description
```

3. **Develop and test**:
- Write and modify code
- Write and run tests
- Test the application locally

4. **Commit your changes**:
```bash
git add .
git commit -m "feat: add new button type for custom scripts"
```

Use the Conventional Commits format:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation change
- `style`: Code style change (formatting)
- `refactor`: Code improvement with no functional change
- `test`: Adding or modifying tests
- `chore`: Build process change

5. **Push and pull request**:
```bash
git push origin feature/your-feature-name
```
Then create a pull request on GitHub

## Logging System

The Toast app uses the `electron-log` package to implement a consistent and efficient logging system.

### Logging Setup

The logging system is centrally managed in the `src/main/logger.js` module and provides the following capabilities:

- Simultaneous log output to file and console
- Per-module namespaces to easily identify the log source
- Automatic log file rotation (5MB limit, up to 5 files)
- Automatic log level adjustment based on development/production environment

Log files are stored in the following locations:
- **macOS**: `~/Library/Application Support/Toast/logs/toast-app.log`
- **Windows**: `%APPDATA%\Toast\logs\toast-app.log`
- **Linux**: `~/.config/Toast/logs/toast-app.log`

### How to Use the Logger

#### Using It in the Main Process

```javascript
const { createLogger } = require('./logger');

// Create a per-module logger
const logger = createLogger('ModuleName');

// Use various log levels
logger.info('Information message');
logger.warn('Warning message');
logger.error('Error message', errorObject);
logger.debug('Debug info', { data: 'someValue' });
```

#### Renderer Process Logging via IPC

```javascript
// Toast window (exposed in preload/toast.js)
window.toast.log.info('Log message from the UI');
window.toast.log.error('UI error', errorDetails);

// Settings window (exposed in preload/settings.js)
window.settings.log.info('Settings UI log message');
window.settings.log.error('Settings UI error', errorDetails);
```

## Auto-Update

The Toast app uses the `electron-updater` package to implement GitHub release-based auto-updates.

### Update System Configuration

The auto-update settings are defined in the `build` and `publish` sections of `package.json`:

```json
"build": {
  "appId": "com.opspresso.toast-app",
  "productName": "Toast",
  "mac": {
    "target": [
      "dmg",
      "zip"  // Required for macOS auto-update
    ],
    // Other macOS settings...
  },
  "win": {
    "target": [
      "nsis",
      "portable"
    ],
    // Other Windows settings...
  }
},
"publish": {
  "provider": "github",
  "owner": "opspresso",
  "repo": "toast",
  "releaseType": "release",
  "publishAutoUpdate": true
}
```

> **Important**: For auto-update to work on macOS, the ZIP format is required alongside the DMG.

### Update Implementation (`src/main/updater.js`)

The update module handles the following:
- Checking for updates
- Downloading updates
- Installing updates
- Handling update events and notifications

```javascript
// Example of using the update module (main process)
const updater = require('./updater');

// Initialize updates on app startup
updater.initAutoUpdater(windows);

// Check for updates (silent mode: does not notify the user)
await updater.checkForUpdates(true);

// Download the update
await updater.downloadUpdate();

// Install the update
await updater.installUpdate();
```

#### Renderer-Side Handling

In the renderer process, update events are handled through the API exposed by the preload script:

```javascript
// Receiving update events in the Settings window (preload/settings.js)
window.settings.onCheckingForUpdate(() => {
  // Display checking-for-update UI
});

window.settings.onUpdateAvailable((info) => {
  // Show notification that an update is available
  showUpdateNotification(info.version);
});

window.settings.onUpdateDownloaded((info) => {
  // Show download-complete notification and offer install option
  showInstallPrompt();
});

// Check for, download, and install updates
await window.settings.checkForUpdates();
await window.settings.downloadUpdate();
await window.settings.installUpdate();
```

## Debugging

### Debugging the Main Process

1. **Debugging with VS Code**:
   - Create a `.vscode/launch.json` file:
     ```json
     {
       "version": "0.2.0",
       "configurations": [
         {
           "name": "Debug Main Process",
           "type": "node",
           "request": "launch",
           "cwd": "${workspaceFolder}",
           "runtimeExecutable": "${workspaceFolder}/node_modules/.bin/electron",
           "windows": {
             "runtimeExecutable": "${workspaceFolder}/node_modules/.bin/electron.cmd"
           },
           "args": ["."],
           "outputCapture": "std"
         }
       ]
     }
     ```
   - Press F5 to start debugging

2. **Logging**:
   - Add logging in the main process:
     ```javascript
     console.log('Debug info:', someVariable);
     ```

### Debugging the Renderer Process

1. **Using Chrome DevTools**:
   - While running in development mode, open DevTools with `Ctrl+Shift+I` or `Cmd+Option+I`
   - Inspect elements, check console logs, monitor network requests, and debug JavaScript

2. **Enabling DevTools in development builds**:
   ```javascript
   // src/main/windows.js
   const win = new BrowserWindow({
     // ... other options
     webPreferences: {
       devTools: true,
       // ... other webPreferences
     }
   });

   if (process.env.NODE_ENV === 'development') {
     win.webContents.openDevTools({ mode: 'detach' });
   }
   ```

## Coding Guidelines

### JavaScript Style

- Follow **ESLint and Prettier** rules
- Use **clear variable and function names**
- Prefer **ES6+ features**
- Use async/await for **asynchronous code**
- Document complex functions with JSDoc comments

```javascript
/**
 * Executes the specified action.
 * @param {Object} action - The action to execute
 * @param {string} action.type - Action type (application, exec, open, script, chain)
 * @param {Object} action.params - Action-specific parameters
 * @returns {Promise<Object>} The action execution result
 */
async function executeAction(action) {
  // Implementation...
}
```

### Main Process Guidelines

1. **IPC Communication**:
   - Use clear channel names for communication between the main and renderer
   - Use the invoke/handle pattern for two-way communication
   - Use the send/on pattern for one-way messages

2. **Modular Code**:
   - Group related functionality into separate modules
   - Maintain clear dependencies and responsibilities

3. **Error Handling**:
   - Handle errors appropriately in all asynchronous operations
   - Serialize error objects correctly in IPC communication

### Renderer Process Guidelines

1. **Incoming IPC Calls**:
   - Use a service layer instead of calling IPC directly from components
   - Maintain a clear boundary between the renderer and main process

2. **UI Components**:
   - Compose the UI from reusable components
   - Separate presentational components from container components

## Common Development Tasks

### Adding a New Action Type

1. Create a new action file in the `src/main/actions/` directory
2. Implement the action validation and execution logic
3. Register the new action type in `src/main/executor.js`

### Adding a New Setting Option

1. Update the default configuration and schema in `src/main/config.js`
2. Add the new setting field to the settings UI
3. Modify the code that accesses the updated configuration

### Adding Support for a New Platform

1. Add platform detection logic for the new platform to platform-specific code
2. Provide the necessary platform-specific implementations
3. Add build scripts for the new platform

### Testing a New Feature

1. Add unit tests in the `tests/unit/` directory
2. Add integration and E2E tests if needed
3. Verify that all tests pass
4. Maintain or improve code coverage

### Fixing a Bug

1. Write a test that reproduces the bug
2. Implement the bug fix
3. Verify that the test passes
4. Confirm that the change does not affect other features

### Guidelines Summary

- Make **small, focused commits**
- Document code with **updated JSDoc comments**
- Write **tests for your changes**
- Continuously **remove duplication**
- Use ESLint and Prettier for **code quality**
- Add **appropriate logging** to all major operations
