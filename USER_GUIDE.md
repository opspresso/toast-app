Toast App User Guide

Welcome to Toast App a customizable shortcut launcher for macOS and Windows. This guide will help you get started and make the most of Toast App's features.

## Table of Contents

1. [Installation](#installation)
2. [Getting Started](#getting-started)
3. [Using Toast App](#using-toast-app)
4. [Configuring Buttons](#configuring-buttons)
5. [Managing Pages](#managing-pages)
6. [Action Types](#action-types)
7. [Appearance Settings](#appearance-settings)
8. [Advanced Settings](#advanced-settings)
9. [Keyboard Shortcuts](#keyboard-shortcuts)
10. [Settings Mode](#settings-mode)
11. [Importing and Exporting](#importing-and-exporting)
12. [Auto-Updates](#auto-updates)
13. [Troubleshooting](#troubleshooting)
14. [FAQ](#faq)

## Installation

### System Requirements

- **macOS**: 10.14 (Mojave) or later
- **Windows**: Windows 10 or later
- **Disk Space**: 100 MB for installation
- **Memory**: 512 MB RAM minimum, 1 GB recommended

### Installation Steps

#### macOS

1. Download the latest `Toast-App-x.x.x.dmg` file from the [releases page](https://github.com/opspresso/toast-app/releases).
2. Open the DMG file and drag Toast App to your Applications folder.
3. Open Toast App from your Applications folder.
4. If you see a security warning go to System Preferences > Security & Privacy and click "Open Anyway".

#### Windows

1. Download the latest `Toast-App-Setup-x.x.x.exe` file from the [releases page](https://github.com/opspresso/toast-app/releases).
2. Run the installer and follow the on-screen instructions.
3. Toast App will start automatically after installation.

## Getting Started

When you first launch Toast App you'll see a welcome screen that guides you through the initial setup:

1. **Set Global Hotkey**: Choose a keyboard shortcut to trigger Toast App (default: Alt+Space).
2. **Launch at Login**: Choose whether to start Toast App automatically when you log in.
3. **Default Buttons**: Toast App comes with a set of default buttons to get you started. These are organized in a standard keyboard layout (QWERTY) for easy access.

After completing the initial setup Toast App will run in the background with an icon in your system tray (Windows) or menu bar (macOS).

## Using Toast App

### Opening the Toast Popup

Press the global hotkey (default: Alt+Space) to open the Toast popup window. The popup will appear at the position specified in your settings (default: center of the screen).

### Using Buttons

The Toast popup displays your configured buttons. You can:

- **Click a button** with your mouse to execute its action.
- **Press the shortcut key** shown on the button to execute its action.
- **Use arrow keys** to navigate between buttons and press Enter to execute.

### Navigating Pages

Toast App organizes buttons into pages for better organization:

- Use the **number keys (1-9)** to switch between pages.
- Click on the **page tabs** at the top of the popup.
- Each page can contain up to 15 buttons (in a 5x3 grid by default).

### Searching

If you have many buttons you can use the search bar at the top of the Toast popup:

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

1. In the Settings window go to the "Buttons" tab.
2. Click the "Add Button" button.
3. In the dialog that appears configure your button:
   - **Name**: The display name of the button.
   - **Shortcut Key**: A single key to trigger the button (e.g. T B C).
   - **Icon**: An emoji or icon name to display on the button.
   - **Action Type**: Choose the type of action (see [Action Types](#action-types)).
   - **Action Parameters**: Configure the parameters for the selected action type.
4. Click "Save" to add the button.

### Editing a Button

1. In the Settings window go to the "Buttons" tab.
2. Find the button you want to edit in the list.
3. Click the "Edit" button next to it.
4. Modify the button configuration in the dialog.
5. Click "Save" to update the button.

Alternatively, you can use Settings Mode for quicker editing (see [Settings Mode](#settings-mode)).

### Deleting a Button

1. In the Settings window go to the "Buttons" tab.
2. Find the button you want to delete in the list.
3. Click the "Delete" button next to it.
4. Confirm the deletion when prompted.

### Testing a Button

When configuring a button you can test it before saving:

1. Configure the button parameters.
2. Click the "Test Action" button in the dialog.
3. The action will be executed and you'll see the result.

### Default Buttons

Toast App comes with a set of default buttons organized in a standard keyboard layout (QWERTY) for easy access. These buttons are automatically added to your first page when you start the app for the first time.

#### Default Button Layout

The default buttons are arranged in three rows, matching the top three rows of a standard QWERTY keyboard:

1. **Top Row (QWERT)**:
   - **Q**: Toast - Opens the Toast Website in the default browser (https://web.toast.sh)
   - **W**:
   - **E**:
   - **R**:
   - **T**: iTerm - Opens the system iTerm app

2. **Middle Row (ASDFG)**:
   - **A**: App Store - Opens the system App Store
   - **S**: Slack - Opens the system Slack app
   - **D**: Dictionary - Opens the system Dictionary app
   - **F**: Finder - Opens the system file explorer (Finder on macOS, Explorer on Windows)
   - **G**: GitHub - Opens GitHub website in the default browser

3. **Bottom Row (ZXCVB)**:
   - **Z**: Zoom - Opens Zoom app
   - **X**: Mail - Opens the system Mail app
   - **C**: Calendar - Opens the system Calendar app
   - **V**: VSCode - Opens Visual Studio Code
   - **B**: Chrome - Opens the system Chrome browser

#### Platform-Specific Commands

The default buttons use platform-specific commands to ensure they work correctly on both macOS and Windows:

- On **macOS**, commands typically use the `open -a "Application Name"` format
- On **Windows**, commands use either `start application` or specific protocol handlers like `ms-photos:`

For example, the VSCode button uses:
- `open -a "Visual Studio Code"` on macOS
- `start code` on Windows

#### Customizing Default Buttons

You can modify any of the default buttons to better suit your needs:

1. Enter Settings Mode by clicking the gear icon (⚙️) or pressing the comma (,) key
2. Click on any default button to edit its properties
3. Change the name, icon, action type, or command as needed
4. Click "Save" to update the button

If you want to restore the default buttons after making changes, you can reset your configuration in the Advanced settings tab.

## Managing Pages

Toast App supports organizing your buttons into multiple pages, making it easier to group related actions.

### Viewing Pages

- When the Toast popup is open, you can see the page tabs at the top.
- Each page has a number shortcut (1-9) for quick access.
- Page limits depend on your account status:
  - **Free Users**: Limited to 1 page
  - **Authenticated Users**: Can create up to 3 pages
  - **Subscribers**: Can create up to 9 pages

### Adding a Page

1. Open the Toast popup using your global hotkey.
2. Enter Settings Mode by clicking the gear icon (⚙️) or pressing the comma (,) key.
3. Click the "+" tab at the top of the popup.
4. Enter a name for the new page.
5. Click "Save" to create the page.

Alternatively, in the Settings window:
1. Go to the "Buttons" tab.
2. Click the "Manage Pages" button.
3. Click "Add Page".
4. Enter a name for the new page.
5. Click "Save".

### Renaming a Page

1. Open the Toast popup and enter Settings Mode.
2. Right-click on the page tab you want to rename.
3. Select "Rename Page" from the context menu.
4. Enter a new name.
5. Click "Save".

### Deleting a Page

1. Open the Toast popup and enter Settings Mode.
2. Right-click on the page tab you want to delete.
3. Select "Delete Page" from the context menu.
4. Confirm the deletion when prompted.

### Reordering Pages

1. Open the Toast popup and enter Settings Mode.
2. Drag and drop page tabs to reorder them.

## Action Types

Toast App supports several types of actions:

### Execute Command

Executes a shell command on your system.

**Parameters:**
- **Command**: The shell command to execute.
- **Working Directory** (optional): The directory in which to run the command.
- **Run in Terminal**: Whether to run the command in a terminal window.

**Examples:**
- `echo "Hello world!"` - Prints a message
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
- **Keys**: The keyboard shortcut to simulate (e.g. Ctrl+C Alt+Tab).

**Examples:**
- `Ctrl+C` - Simulates copying
- `Alt+Tab` - Simulates switching windows
- `Cmd+Space` (macOS) - Simulates opening Spotlight

### Custom Script

Executes a custom script in various languages.

**Parameters:**
- **Script Type**: The language of the script (JavaScript AppleScript PowerShell Bash).
- **Script**: The script content.

**Examples:**
- JavaScript: `console.log("Hello from JavaScript!");`
- AppleScript (macOS): `tell application "Finder" to open home`
- PowerShell (Windows): `Get-Process | Sort-Object CPU -Descending | Select-Object -First 5`
- Bash (macOS/Linux): `for i in {1..5}; do echo $i; done`

### Action Chain

Executes a series of actions in sequence.

**Parameters:**
- **Actions**: List of actions to execute in order.
- **Stop on Error**: Whether to stop execution if an action fails.

**Example:**
- First action: Open a specific folder
- Second action: Launch an application
- Third action: Execute a keyboard shortcut

To configure a chain action:
1. Select "Action Chain" as the action type.
2. Click "Add Action" to add actions to the chain.
3. Configure each action as you would normally.
4. Use the up/down arrows to reorder actions.
5. Toggle "Stop on Error" to control error handling.

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
- **Number Keys (1-9)**: Switch between pages.
- **Comma (,)**: Toggle Settings Mode.
- **Plus (+)**: Add a new page (in Settings Mode).
- **Minus (-)**: Delete the current page (in Settings Mode).

### Settings Window Shortcuts

- **Ctrl+S** (Windows) or **Cmd+S** (macOS): Save settings.
- **Escape**: Cancel and close the settings window.

## Settings Mode

Settings Mode allows you to quickly edit buttons directly from the Toast popup.

### Entering Settings Mode

There are two ways to enter Settings Mode:

1. Click the gear icon (⚙️) in the lower-right corner of the Toast popup.
2. Press the comma (,) key when the Toast popup is open.

### Editing Buttons in Settings Mode

When in Settings Mode:

1. Click on any button to edit it.
2. A dialog will appear with the button's current settings.
3. Modify the settings as needed.
4. Click "Save" to update the button.

### Managing Pages in Settings Mode

In Settings Mode, you can:

- Click the "+" tab to add a new page.
- Right-click on a page tab for options (Rename, Delete).
- Drag page tabs to reorder them.

### Exiting Settings Mode

To exit Settings Mode:

1. Click the gear icon (⚙️) again.
2. Press the comma (,) key again.
3. Press the Escape key.

## Importing and Exporting

### Exporting Configuration

To export your configuration:

1. In the Settings window go to the "Buttons" tab.
2. Click the "Export" button.
3. Choose a location to save the configuration file.
4. Click "Save".

The exported file contains all your pages, buttons, and settings, making it easy to back up or transfer your configuration.

### Importing Configuration

To import a configuration:

1. In the Settings window go to the "Buttons" tab.
2. Click the "Import" button.
3. Select a configuration file to import.
4. Click "Open".
5. Choose whether to replace or merge with your existing configuration.

## Auto-Updates

Toast App includes an automatic update system to ensure you always have the latest features and bug fixes.

### Update Process

By default, Toast App automatically checks for updates when it starts:

1. If an update is available, it will be downloaded in the background.
2. Once downloaded, you'll be notified that an update is ready to install.
3. You can choose to install the update immediately or later.
4. If you choose "Later", the update will be installed the next time you restart the app.

### Manual Update Check

To manually check for updates:

1. Right-click the Toast App icon in your system tray or menu bar.
2. Select "Check for Updates" from the context menu.

### Update Settings

You can configure update behavior in the Advanced settings:

1. In the Settings window, go to the "Advanced" tab.
2. Find the "Updates" section.
3. Configure the following options:
   - **Automatically check for updates**: Enable/disable automatic update checks.
   - **Download updates automatically**: Enable/disable automatic download of updates.
   - **Update channel**: Choose between stable releases or beta versions.

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

### Buttons Not Working

- Check that the button's action is configured correctly.
- Try using the keyboard shortcut instead of clicking.
- Test the button in Settings Mode.

### Pages Not Switching

- Make sure you have multiple pages configured.
- Try clicking the page tabs instead of using keyboard shortcuts.
- Check if your subscription allows for multiple pages.

## FAQ

### Can I use Toast App on Linux?

Toast App is primarily designed for macOS and Windows but limited Linux support is available. Some features may not work as expected on Linux.

### Can I sync my configuration across devices?

Currently Toast App doesn't support cloud synchronization. However you can manually export your configuration from one device and import it on another.

### Can I create custom themes?

Custom themes are planned for a future release. Currently you can choose between light dark and system themes.

### How many buttons can I add?

There is no hard limit on the number of buttons you can add per page. However for better performance and usability we recommend keeping the number of buttons reasonable (under 15 per page).

### How many pages can I create?

Page limits depend on your account status:
- **Free Users**: Limited to 1 page
- **Authenticated Users**: Can create up to 3 pages after logging in
- **Subscribers**: Can create up to 9 pages with an active subscription

These limits help maintain application performance and provide incentive to authenticate and subscribe for additional functionality.

### Can I use multiple global hotkeys?

Currently Toast App supports a single global hotkey to open the popup. However you can use button shortcuts to quickly access specific actions once the popup is open.

### Is my data sent to any servers?

No Toast App is a completely offline application. Your configuration is stored locally on your computer and is not sent to any servers.

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

If you encounter any issues or have questions not covered in this guide please:

1. Check the [GitHub repository](https://github.com/opspresso/toast-app) for updates and known issues.
2. Submit an issue on the [GitHub issues page](https://github.com/opspresso/toast-app/issues).
3. Contact the developers at [support@example.com](mailto:support@example.com).

Thank you for using Toast App!
