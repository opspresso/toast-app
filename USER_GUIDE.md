# Toast App User Guide

Welcome to Toast App, a customizable shortcut launcher for macOS and Windows. This guide will help you get started and make the most of Toast App's features.

## Table of Contents

1. [Installation](#installation)
2. [Getting Started](#getting-started)
3. [Using Toast App](#using-toast-app)
4. [Configuring Buttons](#configuring-buttons)
5. [Action Types](#action-types)
6. [Appearance Settings](#appearance-settings)
7. [Advanced Settings](#advanced-settings)
8. [Keyboard Shortcuts](#keyboard-shortcuts)
9. [Importing and Exporting](#importing-and-exporting)
10. [Troubleshooting](#troubleshooting)
11. [FAQ](#faq)

## Installation

### System Requirements

- **macOS**: 10.14 (Mojave) or later
- **Windows**: Windows 10 or later
- **Disk Space**: 100 MB for installation

### Installation Steps

#### macOS

1. Download the latest `Toast-App-x.x.x.dmg` file from the [releases page](https://github.com/opspresso/toast-app/releases).
2. Open the DMG file and drag Toast App to your Applications folder.
3. Open Toast App from your Applications folder.
4. If you see a security warning, go to System Preferences > Security & Privacy and click "Open Anyway".

#### Windows

1. Download the latest `Toast-App-Setup-x.x.x.exe` file from the [releases page](https://github.com/opspresso/toast-app/releases).
2. Run the installer and follow the on-screen instructions.
3. Toast App will start automatically after installation.

## Getting Started

When you first launch Toast App, you'll see a welcome screen that guides you through the initial setup:

1. **Set Global Hotkey**: Choose a keyboard shortcut to trigger Toast App (default: Alt+Space).
2. **Launch at Login**: Choose whether to start Toast App automatically when you log in.
3. **Default Buttons**: Toast App comes with a few default buttons to get you started.

After completing the initial setup, Toast App will run in the background with an icon in your system tray (Windows) or menu bar (macOS).

## Using Toast App

### Opening the Toast Popup

Press the global hotkey (default: Alt+Space) to open the Toast popup window. The popup will appear at the position specified in your settings (default: center of the screen).

### Using Buttons

The Toast popup displays your configured buttons. You can:

- **Click a button** with your mouse to execute its action.
- **Press the shortcut key** shown on the button to execute its action.
- **Use arrow keys** to navigate between buttons and press Enter to execute.

### Searching

If you have many buttons, you can use the search bar at the top of the Toast popup:

1. Start typing to search for buttons by name or shortcut.
2. The button list will filter as you type.
3. Press Enter to execute the first matching button.

### Closing the Toast Popup

The Toast popup will close automatically after:

- Executing an action (if "Hide after action" is enabled)
- Clicking outside the popup (if "Hide on blur" is enabled)
- Pressing the Escape key (if "Hide on Escape" is enabled)

You can also click the X button in the top-right corner to close the popup.

## Configuring Buttons

### Accessing Settings

To configure buttons and other settings:

1. Right-click the Toast App icon in your system tray or menu bar.
2. Select "Settings" from the context menu.

### Adding a Button

1. In the Settings window, go to the "Buttons" tab.
2. Click the "Add Button" button.
3. In the dialog that appears, configure your button:
   - **Name**: The display name of the button.
   - **Shortcut Key**: A single key to trigger the button (e.g., T, B, C).
   - **Icon**: An emoji or icon name to display on the button.
   - **Action Type**: Choose the type of action (see [Action Types](#action-types)).
   - **Action Parameters**: Configure the parameters for the selected action type.
4. Click "Save" to add the button.

### Editing a Button

1. In the Settings window, go to the "Buttons" tab.
2. Find the button you want to edit in the list.
3. Click the "Edit" button next to it.
4. Modify the button configuration in the dialog.
5. Click "Save" to update the button.

### Deleting a Button

1. In the Settings window, go to the "Buttons" tab.
2. Find the button you want to delete in the list.
3. Click the "Delete" button next to it.
4. Confirm the deletion when prompted.

### Testing a Button

When configuring a button, you can test it before saving:

1. Configure the button parameters.
2. Click the "Test Action" button in the dialog.
3. The action will be executed, and you'll see the result.

## Action Types

Toast App supports several types of actions:

### Execute Command

Executes a shell command on your system.

**Parameters:**
- **Command**: The shell command to execute.
- **Working Directory** (optional): The directory in which to run the command.
- **Run in Terminal**: Whether to run the command in a terminal window.

**Examples:**
- `echo "Hello, world!"` - Prints a message
- `open -a "Google Chrome"` (macOS) or `start chrome` (Windows) - Opens Chrome
- `ls -la` (macOS/Linux) or `dir` (Windows) - Lists files in the current directory

### Open URL/File

Opens a URL in your default browser or a file/folder with its associated application.

**Parameters:**
- **URL or File Path**: The URL or file path to open.
- **Application** (optional): The application to use for opening.

**Examples:**
- `https://www.google.com` - Opens Google in your default browser
- `/path/to/document.pdf` - Opens a PDF file
- `/path/to/folder` - Opens a folder in your file explorer

### Keyboard Shortcut

Simulates pressing a keyboard shortcut.

**Parameters:**
- **Keys**: The keyboard shortcut to simulate (e.g., Ctrl+C, Alt+Tab).

**Examples:**
- `Ctrl+C` - Simulates copying
- `Alt+Tab` - Simulates switching windows
- `Cmd+Space` (macOS) - Simulates opening Spotlight

### Custom Script

Executes a custom script in various languages.

**Parameters:**
- **Script Type**: The language of the script (JavaScript, AppleScript, PowerShell, Bash).
- **Script**: The script content.

**Examples:**
- JavaScript: `console.log("Hello from JavaScript!");`
- AppleScript (macOS): `tell application "Finder" to open home`
- PowerShell (Windows): `Get-Process | Sort-Object CPU -Descending | Select-Object -First 5`
- Bash (macOS/Linux): `for i in {1..5}; do echo $i; done`

## Appearance Settings

### Theme

Choose the visual theme for Toast App:

- **System**: Follows your system's light/dark mode setting.
- **Light**: Always uses the light theme.
- **Dark**: Always uses the dark theme.

### Position

Choose where the Toast popup appears on your screen:

- **Center**: In the center of the screen.
- **Top**: At the top center of the screen.
- **Bottom**: At the bottom center of the screen.
- **Cursor**: Near your cursor position.

### Size

Choose the size of the Toast popup:

- **Small**: 350x400 pixels.
- **Medium**: 400x500 pixels.
- **Large**: 500x600 pixels.

### Opacity

Adjust the transparency of the Toast popup using the slider (0.1 to 1.0).

### Button Layout

Choose how buttons are arranged in the Toast popup:

- **Grid**: Buttons arranged in a grid (default).
- **List**: Buttons arranged in a vertical list.

## Advanced Settings

### Launch at Login

Enable this option to start Toast App automatically when you log in to your computer.

### Hide After Action

Enable this option to automatically hide the Toast popup after executing an action.

### Hide on Blur

Enable this option to automatically hide the Toast popup when it loses focus.

### Hide on Escape

Enable this option to hide the Toast popup when you press the Escape key.

### Show in Taskbar

Enable this option to show the Toast popup in the taskbar/dock.

## Keyboard Shortcuts

### Global Shortcuts

- **Global Hotkey** (default: Alt+Space): Open the Toast popup.

### Toast Popup Shortcuts

- **Arrow Keys**: Navigate between buttons.
- **Enter**: Execute the selected button.
- **Escape**: Close the Toast popup (if enabled).
- **Button Shortcuts**: Press the shortcut key shown on a button to execute it.

### Settings Window Shortcuts

- **Ctrl+S** (Windows) or **Cmd+S** (macOS): Save settings.
- **Escape**: Cancel and close the settings window.

## Importing and Exporting

### Exporting Configuration

To export your configuration:

1. In the Settings window, go to the "Buttons" tab.
2. Click the "Export" button.
3. Choose a location to save the configuration file.
4. Click "Save".

### Importing Configuration

To import a configuration:

1. In the Settings window, go to the "Buttons" tab.
2. Click the "Import" button.
3. Select a configuration file to import.
4. Click "Open".

## Troubleshooting

### Toast App Won't Start

- Check if Toast App is already running in the background.
- Try restarting your computer.
- Reinstall Toast App.

### Global Hotkey Doesn't Work

- Check if the hotkey is already used by another application.
- Try setting a different hotkey in the settings.
- Restart Toast App after changing the hotkey.

### Actions Don't Execute

- Check if the action parameters are correct.
- Test the action in the button editor.
- Check your system permissions.

### Toast Popup Doesn't Appear

- Check if Toast App is running (look for the icon in your system tray or menu bar).
- Try pressing the global hotkey again.
- Check if the Toast window is off-screen (try changing the position setting).

## FAQ

### Can I use Toast App on Linux?

Toast App is primarily designed for macOS and Windows, but limited Linux support is available. Some features may not work as expected on Linux.

### Can I sync my configuration across devices?

Currently, Toast App doesn't support cloud synchronization. However, you can manually export your configuration from one device and import it on another.

### Can I create custom themes?

Custom themes are planned for a future release. Currently, you can choose between light, dark, and system themes.

### How many buttons can I add?

There is no hard limit on the number of buttons you can add. However, for better performance and usability, we recommend keeping the number of buttons reasonable (under 50).

### Can I use multiple global hotkeys?

Currently, Toast App supports a single global hotkey to open the popup. However, you can use button shortcuts to quickly access specific actions once the popup is open.

### Is my data sent to any servers?

No, Toast App is a completely offline application. Your configuration is stored locally on your computer and is not sent to any servers.

### How do I uninstall Toast App?

#### macOS

1. Quit Toast App.
2. Drag Toast App from your Applications folder to the Trash.
3. Empty the Trash.

#### Windows

1. Open Control Panel > Programs > Programs and Features.
2. Select Toast App from the list.
3. Click "Uninstall" and follow the on-screen instructions.

### Where is my configuration stored?

Your configuration is stored in:

- **macOS**: `~/Library/Application Support/toast-app/config.json`
- **Windows**: `%APPDATA%\toast-app\config.json`

## Getting Help

If you encounter any issues or have questions not covered in this guide, please:

1. Check the [GitHub repository](https://github.com/opspresso/toast-app) for updates and known issues.
2. Submit an issue on the [GitHub issues page](https://github.com/opspresso/toast-app/issues).
3. Contact the developers at [support@example.com](mailto:support@example.com).

Thank you for using Toast App!
