# Toast App User Guide

This guide explains how to use the Toast app in detail. It covers the UI components, features, and common usage scenarios.

## Table of Contents

- [UI Components](#ui-components)
  - [Toast Window](#toast-window)
  - [Settings Window](#settings-window)
  - [System Tray Menu](#system-tray-menu)
- [Basic Features](#basic-features)
  - [Global Shortcut](#global-shortcut)
  - [Pages and Buttons](#pages-and-buttons)
  - [Action Types](#action-types)
  - [Navigation](#navigation)
- [Usage Scenarios](#usage-scenarios)
  - [First-Time Setup](#first-time-setup)
  - [Opening an Application](#opening-an-application)
  - [Opening a Website](#opening-a-website)
  - [Running a Shell Command](#running-a-shell-command)
  - [Running a Custom Script](#running-a-custom-script)
- [Authentication and Subscription](#authentication-and-subscription)
  - [Account Tiers and Benefits](#account-tiers-and-benefits)
  - [Authentication Process](#authentication-process)
  - [Cloud Sync](#cloud-sync)
- [Advanced Usage](#advanced-usage)
  - [Customizing Appearance](#customizing-appearance)
  - [Advanced Configuration](#advanced-configuration)
  - [Workflow Integration](#workflow-integration)
- [Troubleshooting](#troubleshooting)

## UI Components

### Toast Window

The Toast window is the primary interface that users interact with to run actions.

#### Layout

```
┌───────────────────────────────────────────────────────────┐
│                 Toast          12:34:56                  × │
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
│ ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐     │
│ │   🗓️    │   │   💬    │   │   📊    │   │   📡    │     │
│ │         │   │         │   │         │   │         │     │
│ │Calendar Z│   │ Chat X  │   │ Stats C │   │Network V│     │
│ └─────────┘   └─────────┘   └─────────┘   └─────────┘     │
│                                                           │
│ Status: Ready                              👤  📝  ⚙️   │
└───────────────────────────────────────────────────────────┘
```

#### Components

- **Header**: Window title, current time (HH:MM:SS), and close button
- **Page Navigation**: Numbered buttons for switching between pages, plus add/remove page buttons
- **Button Grid**: Displays the configured buttons in a grid layout
- **Status Bar**: The status of the last action, along with the user button (👤), edit mode toggle (📝), and settings button (⚙️)

### Settings Window

The Settings window is the interface for configuring the application.

#### Layout

```
┌─────────────┬───────────────────────────────────────────────┐
│             │                                               │
│  Settings   │  Settings                                     │
│             │                                               │
│  Account    │  Global Shortcut: [Alt+Space]  [Record] [Clear]│
│             │                                               │
│  Snippets   │  ☑ Launch at login                            │
│             │                                               │
│  About      │                                               │
│             │                                               │
│             │                                               │
│             │                                               │
│             │                                               │
│             │                                               │
│             │                                               │
│             │                                               │
│             │                                               │
│             │                                               │
│             │                                               │
└─────────────┴───────────────────────────────────────────────┘
```

#### Components

- **Sidebar**: Settings (General · Appearance · Advanced), Account (account · subscription · cloud sync), Snippets, and About tabs
- **Main Content**: Settings options based on the selected tab
Button editing happens in the Toast popup, not in the Settings window.

The window title and close button use the OS's native title bar.

### System Tray Menu

```
┌─────────────────┐
│  Open Toast     │
├─────────────────┤
│  How to use     │
│  Dashboard      │
│  Subscription   │
├─────────────────┤
│  Settings...    │
│  About          │
│  Version: x.x.x │
├─────────────────┤
│  Quit           │
└─────────────────┘
```

## Basic Features

### Global Shortcut

The core feature of the Toast app is quick access to the application through a global shortcut.

- **Default Shortcut**: Alt+Space (can be changed in settings)
- **Function**: Pressing the shortcut shows or hides the Toast window
- **Configuration**: Configurable in the General section of the Settings tab

### Pages and Buttons

The Toast app organizes buttons into multiple pages for better organization.

#### Page Management

- **Page Navigation**: Move between pages with the number keys (1-9) or by clicking a page tab
- **Add Page**: Click the + button or press Shift+Plus
- **Remove Page**: Click the - button or press the minus key in settings mode
- **Page Limits**:
  - Free users: 1 page
  - Authenticated users: up to 3 pages
  - Subscribers: up to 9 pages

#### Button Management

- **Button Components**: Icon, name, and shortcut
- **Shortcut**: Automatically assigned in `qwertasdfgzxcvb` order based on the position within the page (for detailed rules, see [Button Shortcuts](./shortcuts.md))
- **Editing**: Click a button in settings mode to edit it

### Action Types

The Toast app supports various types of actions:

- **Launch Application**: Launch a specified application
- **Run Command**: Run a system command or script
- **Open URL/File**: Open a website or a local file

- **Run Script**: Run a JavaScript, AppleScript, PowerShell, or Bash script
- **Chain Actions**: Run multiple actions sequentially

### Navigation

#### Keyboard Navigation

- **Arrow Keys**: Move between buttons
- **Enter**: Run the selected button
- **Escape**: Close the Toast window
- **Number Keys (1-9)**: Switch pages
- **Comma (,)**: Toggle settings mode

#### Mouse Navigation

- **Click**: Run a button or edit it in settings mode
- **Drag**: Reorder buttons in settings mode (Cmd/Ctrl+Drag swaps two buttons)
- **Click a Page Number**: Switch pages
- **Click the Edit Icon (📝)**: Toggle button edit mode
- **Click the Settings Icon (⚙️)**: Open the Settings window

## Usage Scenarios

### First-Time Setup

**Goal**: Install and set up the Toast app for the first time

1. **Download and Install**
   - Download the installer from the website or GitHub
   - Run the installer
   - The application launches automatically after installation completes

2. **Initial Configuration**
   - The Settings window opens automatically on first launch
   - Configure the global shortcut (default: Alt+Space)
   - Select the launch-at-login option
   - Review the default buttons

3. **Apply Settings**
   - Settings are saved immediately when changed (no separate save button)
   - When you close the Settings window, the application keeps running in the system tray

### Opening an Application

**Goal**: Use the Toast app to quickly open a frequently used application

1. **Create an Application Button**
   - Open the Toast window with the global shortcut, then switch to edit mode
   - Select an empty button to add a new button
   - Configure the button:
     - Name: "Chrome"
     - Shortcut: automatically assigned (since it's the first button, "Q")
     - Icon: "🌐"
     - Action type: "Run Command"
     - Command: `open -a "Google Chrome"` (macOS) or `start chrome` (Windows)
   - Save

2. **Use the Button**
   - Press the global shortcut
   - Click the "Chrome" button or press the "Q" key
   - Google Chrome launches and the Toast window closes automatically

### Opening a Website

**Goal**: Use the Toast app to quickly open a frequently visited website

1. **Create a Website Button**
   - Add a new button in the Toast window's edit mode
   - Configure the button:
     - Name: "GitHub"
     - Shortcut: automatically assigned (since it's the first button, "Q")
     - Icon: "🐙"
     - Action type: "Open URL/File"
     - URL: "https://github.com"
   - Save

2. **Use the Button**
   - Press the global shortcut
   - Click the "GitHub" button or press the "Q" key
   - The default web browser opens and navigates to GitHub

### Running a Shell Command

**Goal**: Use the Toast app to run frequently used shell commands

1. **Create a Command Button**
   - Add a new button in the Toast window's edit mode
   - Configure the button:
     - Name: "List Files"
     - Shortcut: automatically assigned (since it's the first button, "Q")
     - Icon: "📋"
     - Action type: "Run Command"
     - Command: `ls -la` (macOS/Linux) or `dir` (Windows)
     - Run in terminal: checked
   - Save

2. **Use the Button**
   - Press the global shortcut
   - Click the "List Files" button or press the "Q" key
   - A terminal window opens and runs the command

### Running a Custom Script

**Goal**: Use the Toast app to run a custom script

1. **Create a Script Button**
   - Add a new button in the Toast window's edit mode
   - Configure the button:
     - Name: "System Info"
     - Shortcut: automatically assigned (since it's the first button, "Q")
     - Icon: "💻"
     - Action type: "Custom Script"
     - Script type: "JavaScript"
     - Script:
       ```javascript
       const os = require('os');
       result = `Platform: ${process.platform}, Hostname: ${os.hostname()}, Free memory: ${Math.round(os.freemem() / 1024 / 1024)} MB`;
       ```
   - Save

2. **Use the Button**
   - Press the global shortcut
   - Click the "System Info" button or press the "Q" key
   - The script runs and the result is shown in the status bar

## Authentication and Subscription

The Toast app integrates with the Toast web service for user authentication and subscription management.

### Account Tiers and Benefits

1. **Free Users (No Account)**
   - Access to 1 page of shortcuts
   - Basic shortcut features
   - Local configuration only

2. **Authenticated Users (Free Account)**
   - Access to 3 pages of shortcuts
   - All basic features
   - Verified account information in the app

3. **Premium Subscribers**
   - Access to 9 pages of shortcuts
   - Cloud sync of buttons, Snippets, appearance, and advanced preferences

### Authentication Process

1. Click the "Login" button in the Settings window
2. The default browser opens the Toast web login page
3. After logging in, you are automatically redirected back to the Toast app
4. Authentication status and subscription benefits are applied immediately

### Cloud Sync

Sign in with an account that has cloud sync access, then enable Cloud Sync in Settings → Account.
The first sync downloads existing cloud buttons and Snippets. The app checks again every 15
minutes and synchronizes local changes 5 seconds after the last edit.

Independent edits are merged. If both devices change the same item incompatibly, the app keeps
your work and reports a conflict. **Sync Now** attempts a safe merge; **Upload to Server** chooses
local settings, and **Download from Server** chooses cloud settings. Review the direction before
choosing. Deleting all items is a real change and synchronizes as an empty list.

Global shortcuts and text-expander permissions remain on each device. New downloaded commands,
scripts, native applications, files, and custom URI handlers need local approval before execution.
See [Cloud Sync](../features/cloud-sync.md) for access, errors, and recovery details.

## Advanced Usage

### Customizing Appearance

You can customize the look and behavior of the Toast app through various appearance settings:

- **Theme**: Light, dark, or system theme
- **Position**: Center, top, bottom, or cursor position on the screen
- **Size**: Small, medium, or large
- **Opacity**: Adjust the window transparency

You can configure these settings in the Appearance section of the Settings tab in the Settings window.

### Advanced Configuration

Advanced settings give you finer control over the application's behavior:

- **Hide After Action**: Automatically close the Toast window after running an action
- **Hide on Focus Loss**: Close the window when you click outside it
- **Hide with Escape Key**: Close the window with the Escape key
- **Show in Taskbar**: Whether to show the Toast window in the taskbar/dock

You can configure these settings in the Advanced section of the Settings tab.

### Workflow Integration

You can integrate the Toast app into your development workflow to boost productivity:

- **Configure Development Buttons**: Start servers, run tests, build, etc.
- **Access Documentation**: Quickly access frequently used documentation pages
- **Open Development Tools**: Quickly launch development tools like VS Code, the terminal, etc.

This workflow integration helps you save time and improve efficiency during development.

## Troubleshooting

### Global Shortcut Issues

**Symptom**: The global shortcut does not trigger the Toast window

**Solution**:
1. Right-click the system tray icon and select Settings
2. Check the global shortcut in the General section
3. Set a new shortcut that does not conflict with other applications
4. Wait for the saved shortcut to appear, then test it

### Actions Not Running

**Symptom**: A button does not run its action

**Solution**:
1. Open the popup, enter edit mode, and edit the problematic button
2. Review the action configuration
3. Save, leave edit mode, and run the button to inspect its error
4. Fix the configuration based on the error
5. Save and test again

### Other Common Issues

- **Startup Issues**: Check the startup items in your system settings
- **Login Issues**: Check your internet connection and test access to Toast web in a web browser
- **Performance Issues**: Check the logs and optimize by removing unnecessary buttons
- **Sync Issues**: Check the authentication status and try a manual sync
