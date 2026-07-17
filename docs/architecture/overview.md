# Toast App Architecture

This document describes the system architecture, components, and data flow of the Toast app.

## Table of Contents

- [System Overview](#system-overview)
- [High-Level Architecture](#high-level-architecture)
- [Main Process Architecture](#main-process-architecture)
- [Renderer Process Architecture](#renderer-process-architecture)
- [Page Architecture](#page-architecture)
- [Authentication System](#authentication-system)
- [Cloud Sync System](#cloud-sync-system)

## System Overview

The Toast app is an Electron-based desktop application that provides a customizable shortcut launcher for macOS and Windows. It follows a modular architecture with a clear separation of concerns between the main process and the renderer process.

Beyond the desktop app repository (`opspresso/toast-app`, this repository), the Toast project consists of a primary repository responsible for distribution and the homepage (`opspresso/toast`) and a web service repository that provides the authentication and sync APIs (`opspresso/toast-web`). For a detailed breakdown of the repository structure, see the [README](../../README.md#-related-repositories).

## High-Level Architecture

The Toast app is built on the Electron framework and consists of the following main components:

```
┌─────────────────────────────────────────────────────────────┐
│                       Toast App                             │
│                                                             │
│ ┌─────────────────────────┐     ┌─────────────────────────┐ │
│ │                         │     │                         │ │
│ │    Main Process         │     │   Renderer Process      │ │
│ │                         │     │                         │ │
│ │  ┌─────────────┐        │     │   ┌─────────────────┐   │ │
│ │  │             │        │     │   │                 │   │ │
│ │  │ Core        │        │     │   │ Toast Window    │   │ │
│ │  │ Components  │◄──────┐│     │   │                 │   │ │
│ │  │             │       ││     │   └─────────────────┘   │ │
│ │  └─────────────┘       ││     │                         │ │
│ │                        ││     │   ┌─────────────────┐   │ │
│ │  ┌─────────────┐       ││     │   │                 │   │ │
│ │  │             │       │└─────┼──►│ Settings Window │   │ │
│ │  │ Business    │◄─────┐│      │   │                 │   │ │
│ │  │ Logic       │      ││      │   └─────────────────┘   │ │
│ │  │             │      ││      │                         │ │
│ │  └─────────────┘      ││      └─────────────────────────┘ │
│ │                       ││                                  │
│ │  ┌─────────────┐      ││      ┌─────────────────────────┐ │
│ │  │             │      │└──────┼──►                      │ │
│ │  │ Executors   │◄─────┘       │       Web APIs          │ │
│ │  │             │              │                         │ │
│ │  └─────────────┘              └─────────────────────────┘ │
│ │                                                           │
│ └───────────────────────────────────────────────────────────┘
```

### Main Components

1. **Main Process**: Handles the application's core logic:
   - System tray integration
   - Window management
   - Global shortcuts
   - Action execution
   - Configuration management
   - IPC communication
   - Auto-update

2. **Renderer Process**: Handles the UI layer:
   - Toast window: the primary user interface for quick action execution
   - Settings window: the interface for configuring the application
   - Preload scripts: a secure communication channel between the renderer and main processes

3. **Web APIs**: Integration with external services:
   - Authentication service: user authentication and subscription verification
   - Cloud sync: synchronization of settings and buttons
   - Custom script execution: JavaScript, AppleScript, PowerShell, and more

### Inter-Process Communication (IPC)

The main and renderer processes communicate through Electron's IPC mechanism:

1. **Renderer-to-Main communication**:
   - `ipcRenderer.invoke` / `ipcMain.handle`: bidirectional request-response pattern
   - `ipcRenderer.send` / `ipcMain.on`: one-way notifications

2. **Main-to-Renderer communication**:
   - `webContents.send` / `ipcRenderer.on`: notifications from main to renderer

### Data Flow

Data flow within the application:

1. **User input**: user actions are captured in the renderer process
2. **Action request**: the renderer sends an action request to the main process via IPC
3. **Action execution**: the main process executes the requested action
4. **Result return**: the main process returns the result to the renderer via IPC
5. **State update**: the renderer process updates the UI and provides feedback to the user

## Main Process Architecture

The main process consists of the following modular components:

```
┌─────────────────────────────────────────────────────────────┐
│                     Main Process                            │
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │             │  │             │  │                     │  │
│  │  Windows    │  │   Config    │  │   Authentication    │  │
│  │  Manager    │  │   Store     │  │   Manager           │  │
│  │             │  │             │  │                     │  │
│  └──────┬──────┘  └──────┬──────┘  └───────────┬─────────┘  │
│         │                │                     │            │
│  ┌──────▼──────┐  ┌──────▼──────┐  ┌───────────▼─────────┐  │
│  │             │  │             │  │                     │  │
│  │    Tray     │  │     IPC     │  │      Cloud Sync     │  │
│  │   Manager   │  │   Handler   │  │      Manager        │  │
│  │             │  │             │  │                     │  │
│  └──────┬──────┘  └──────┬──────┘  └───────────┬─────────┘  │
│         │                │                     │            │
│  ┌──────▼──────┐  ┌──────▼──────┐              │            │
│  │             │  │             │              │            │
│  │  Shortcuts  │  │  Executor   │◄─────────────┘            │
│  │  Manager    │──►             │                           │
│  │             │  │             │                           │
│  └─────────────┘  └──────┬──────┘                           │
│                          │                                  │
│      ┌───────────────────┼───────────────────┐              │
│      │                   │                   │              │
│ ┌────▼─────┐       ┌─────▼─────┐       ┌─────▼─────┐        │
│ │          │       │           │       │           │        │
│ │   Exec   │       │   Open    │       │  Script   │        │
│ │  Action  │       │  Action   │       │  Action   │        │
│ │          │       │           │       │           │        │
│ └──────────┘       └───────────┘       └───────────┘        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Configuration Manager (`src/main/config.js`)

A module that manages user configuration and settings:

- **Features**:
  - Persistent storage and loading of settings
  - CRUD operations on stored settings
  - Default value management
  - Watching for configuration changes
  - Settings migration
  - Schema-based data validation

- **Data structure**:
  - Global hotkey (globalHotkey)
  - Page and button configuration
  - Snippets and text expansion state (textExpander, device-local)
  - Appearance settings (appearance)
  - Advanced settings (advanced)
  - Subscription information (subscription)
  - User metadata

### Window Manager (`src/main/windows.js`)

A module that manages application windows:

- **Features**:
  - Creating, showing, and hiding windows
  - Managing window position and size
  - Handling focus and blur events
  - Loading window web contents
  - DevTools integration
  - Platform-specific window handling (macOS, Windows, Linux)
  - Full-screen mode support

- **Window types**:
  - **Toast window**: a popup window where users can execute actions
  - **Settings window**: a window for configuring the application

### Tray Manager (`src/main/tray.js`)

A module that manages system tray integration:

- **Features**:
  - Setting and updating the tray icon
  - Building the context menu
  - Platform-specific tray icon management
  - Managing tray tooltips
  - Displaying version information
  - Handling application quit

### Shortcuts Manager (`src/main/shortcuts.js`)

A module that manages global shortcuts and keyboard input:

- **Features**:
  - Registering and unregistering global shortcuts
  - Shortcut format conversion (`convertHotkeyToElectronFormat`)
  - Window positioning (`positionToastWindow`)
  - Monitor and display handling
  - Saving and loading custom positions

### IPC Handler (`src/main/ipc.js` + `src/main/ipc/`)

A module that manages inter-process communication. `src/main/ipc.js` is the orchestrator that coordinates registration, while the actual handlers are split by domain into submodules under `src/main/ipc/`:

- `ipc/window.js`: modal state management, window property control, app restart/quit
- `ipc/config.js`: configuration management (import/export/reset)
- `ipc/actions.js`: action execution/validation/testing
- `ipc/auth.js`: authentication handling
- `ipc/cloud-sync.js`: cloud sync
- `ipc/snippets.js`: text expansion (snippet) state/permissions/toggle, snippet saving and validation
- `ipc/updater.js`: auto-update management
- `ipc/system.js`: opening URLs, file dialogs, logging, icon extraction, path conversion

### Executor (`src/main/executor.js`)

A module that coordinates action execution:

- **Features**:
  - Dispatching action types
  - Chaining action execution
  - Result handling
  - Error catching and reporting
  - Execution context management
  - Action validation

### Actions (`src/main/actions/*.js`)

Modules that implement the various action types:

- **Action types**:
  - **exec**: run shell commands
  - **open**: open a URL or file
  - **script**: execute custom scripts
  - **chain**: run multiple actions in sequence
  - **application**: application-related actions

## Renderer Process Architecture

The renderer process is composed of the following components responsible for the user interface:

### Toast Window

The Toast window is the primary interface through which users can execute actions via configured buttons.

```
┌───────────────────────────────────────────────────────────┐
│                       Toast                              × │
├───────────────────────────────────────────────────────────┤
│ ┌───────────────────────────────────────────────────────┐ │
│ │   1   │   2   │   3   │   +   │   -                   │ │
│ └───────────────────────────────────────────────────────┘ │
│                                                           │
│ ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐     │
│ │   📁    │   │   🌐    │   │   ⌨️    │   │   📝    │     │
│ │         │   │         │   │         │   │         │     │
│ │ Files Q │   │Browser W│   │Terminal E│   │ Notes R │     │
│ └─────────┘   └─────────┘   └─────────┘   └─────────┘     │
│                                                           │
│ ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐     │
│ │   🔊    │   │   🔍    │   │   🔧    │   │   📸    │     │
│ │         │   │         │   │         │   │         │     │
│ │ Music A │   │Search S │   │Settings D│   │ Capture F│    │
│ └─────────┘   └─────────┘   └─────────┘   └─────────┘     │
│                                                           │
│ Status: Ready                                 Settings ⚙️  │
└───────────────────────────────────────────────────────────┘
```

**Components**:
- Page navigation
- Button grid/list
- Status bar
- Settings toggle

### Settings Window

The Settings window provides an interface for users to configure the application.

```
┌─────────────────────────────────────────────────────────────┐
│                     Toast Settings                          │
├─────────────┬───────────────────────────────────────────────┤
│             │                                               │
│  Settings   │  General Settings                             │
│             │                                               │
│  Account    │  Global Shortcut: [Alt+Space] [Record][Clear] │
│             │                                               │
│  Snippets   │  ☑ Start on login                             │
│             │                                               │
│  About      │                                               │
│             │                                               │
├─────────────┴───────────────────────────────────────────────┤
│  [Save]                                      [Cancel]      │
└─────────────────────────────────────────────────────────────┘
```

**Components**:
- Sidebar navigation
- Content area for each settings section
- Button editor dialog
- Save and cancel actions

## Page Architecture

The Toast app lets users organize buttons through the concept of pages.

**Page characteristics**:
- Page name and shortcut
- Up to 15 buttons per page
- Limited by account status as follows:
  - Free users: 1 page
  - Authenticated users: up to 3 pages
  - Premium subscribers: up to 9 pages

**Button configuration**:
- **Name**: the button's display name
- **Shortcut**: automatically assigned in `qwertasdfgzxcvb` order based on position within the page (for detailed rules, see [Button Shortcuts](../guide/shortcuts.md))
- **Icon**: emoji or custom icon
- **Action type**: the type of action to execute (exec, open, script, chain, application)
- **Action parameters**: specific parameters depending on the action type

## Authentication System

The authentication system manages user authentication with the Toast web service and handles subscription status through several integrated components:

```
┌──────────────────────────────────────────────────────────────┐
│                   Authentication System                      │
│                                                              │
│  ┌────────────────┐      ┌────────────────┐                  │
│  │                │      │                │                  │
│  │  Auth Manager  │◄────►│  Auth Module   │                  │
│  │                │      │                │                  │
│  └───────┬────────┘      └────────┬───────┘                  │
│          │                        │                          │
│          ▼                        ▼                          │
│  ┌────────────────┐      ┌────────────────┐                  │
│  │                │      │                │                  │
│  │   User Data    │      │  API Client    │                  │
│  │    Manager     │      │                │                  │
│  │                │      │                │                  │
│  └────────────────┘      └────────────────┘                  │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### Authentication Components

1. **Auth Manager (`auth-manager.js`)**: the central coordinator for authentication operations
   - Synchronizes authentication state across windows
   - Manages the login/logout process
   - Coordinates token refresh
   - Notifies UI components of authentication state changes

2. **Auth Module (`auth.js`)**: the core authentication implementation
   - Implements the OAuth 2.0 authentication flow
   - Manages tokens securely
   - Handles token validation and refresh
   - Manages subscription level and permissions
   - Registers the protocol handler

3. **User Data Manager (`user-data-manager.js`)**: manages user profile and settings data
   - Maintains profile and subscription information
   - Handles synchronization of user settings
   - Provides cached access to user data

4. **API Client**: low-level API communication
   - Handles authenticated API requests
   - Manages automatic token refresh
   - Implements retry logic and error handling

### Authentication Flow

1. **Login initiation**:
   - The user clicks the login button in the settings window
   - An OAuth 2.0 authorization URL is generated
   - The external system browser opens
   - After authentication, the user is redirected back to the Toast app

2. **Token handling**:
   - The browser redirects to the custom protocol handler with the authorization code
   - The code is exchanged for access and refresh tokens
   - Tokens are stored securely

3. **Token management**:
   - Access tokens expire in 1 year by default (`TOKEN_EXPIRES_IN=31536000`, adjustable via environment variable)
   - Automatically refreshed with the refresh token as expiration approaches (30-second safety margin)
   - Throttling is applied to prevent duplicate refresh requests

4. **Subscription handling**:
   - The system fetches subscription information from the profile endpoint
   - Feature flags are dynamically enabled based on subscription level
   - Subscription tiers are enforced (page limits: 1/3/9 pages depending on tier)

## Cloud Sync System

The cloud sync system manages synchronization of user settings and configuration across multiple devices.

```
┌──────────────────────────────────────────────────────────────┐
│                 Cloud Synchronization System                 │
│                                                              │
│  ┌────────────────┐      ┌────────────────┐                  │
│  │                │      │                │                  │
│  │  Cloud Sync    │◄────►│  API Sync      │                  │
│  │  Manager       │      │  Module        │                  │
│  │                │      │                │                  │
│  └───────┬────────┘      └────────┬───────┘                  │
│          │                        │                          │
│          ▼                        ▼                          │
│  ┌────────────────┐      ┌────────────────┐                  │
│  │                │      │                │                  │
│  │     Config     │      │  Auth Manager  │                  │
│  │     Store      │      │                │                  │
│  │                │      │                │                  │
│  └────────────────┘      └────────────────┘                  │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### Key Features

- **Single source of truth**: uses ConfigStore as the central data source
- **Change detection**: real-time monitoring of configuration changes with debouncing
- **Automatic sync**: automatic synchronization on login, periodically, and on settings changes
- **Conflict resolution**: timestamp-based decision (upload/download/merge) followed by per-section merge policies when both sides changed

### Core Components

1. **Cloud Sync Manager** (`cloud-sync.js`): overall coordination of the synchronization process
2. **API Sync Module** (`api/sync.js`): handles server API communication
3. **Conflict Resolver** (`cloud-sync/conflict-resolver.js`): conflict analysis and per-section merge policies
4. **Action Approval** (`action-approval.js`): one-time, per-device user approval for `exec`/`script` actions downloaded from remote
5. **Config Store integration**: detects change events and applies settings
6. **Auth Manager integration**: manages user permissions and tokens

> **Details**: For cloud sync implementation details, see [Cloud Sync](../features/cloud-sync.md).
