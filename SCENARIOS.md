# Toast App User Scenarios

This document outlines common user scenarios and workflows for the Toast App, demonstrating how users can accomplish various tasks using the application.

## Scenario 1: First-Time Setup

**User Goal**: Install and set up Toast App for the first time.

### Workflow

1. **Download and Install**
   - User downloads the Toast App installer from the website or GitHub releases
   - User runs the installer and follows the installation wizard
   - Toast App launches automatically after installation

2. **Initial Configuration**
   - The Settings window opens automatically on first launch
   - User is prompted to configure the global hotkey (default: Alt+Space)
   - User decides whether to launch Toast App at login
   - User reviews the default buttons

3. **Save Configuration**
   - User clicks "Save" to apply the settings
   - Toast App minimizes to the system tray
   - A notification confirms that Toast App is running in the background

### Expected Outcome

- Toast App is installed and configured
- Toast App runs in the background with an icon in the system tray
- The global hotkey is set and ready to use

## Scenario 2: Opening Applications

**User Goal**: Use Toast App to quickly open frequently used applications.

### Workflow

1. **Create Application Buttons**
   - User right-clicks the Toast App icon in the system tray
   - User selects "Settings" from the context menu
   - User navigates to the "Buttons" tab
   - User clicks "Add Button"
   - User configures a button:
     - Name: "Chrome"
     - Shortcut: "C"
     - Icon: "🌐"
     - Action Type: "Execute Command"
     - Command: `open -a "Google Chrome"` (macOS) or `start chrome` (Windows)
   - User clicks "Save" to add the button
   - User repeats the process for other applications (e.g., VS Code, Terminal, Slack)
   - User clicks "Save" in the Settings window to apply changes

2. **Use the Buttons**
   - User presses the global hotkey (Alt+Space)
   - The Toast window appears
   - User either:
     - Clicks on the "Chrome" button, or
     - Presses the "C" key
   - Google Chrome launches
   - The Toast window automatically closes

### Expected Outcome

- User can quickly open applications using Toast App
- The process is faster than navigating through the Start menu or Dock
- User can use either mouse or keyboard to trigger actions

## Scenario 3: Opening Websites

**User Goal**: Use Toast App to quickly open frequently visited websites.

### Workflow

1. **Create Website Buttons**
   - User opens the Settings window
   - User navigates to the "Buttons" tab
   - User clicks "Add Button"
   - User configures a button:
     - Name: "GitHub"
     - Shortcut: "G"
     - Icon: "🐙"
     - Action Type: "Open URL/File"
     - URL: "https://github.com"
   - User clicks "Save" to add the button
   - User repeats the process for other websites
   - User clicks "Save" in the Settings window to apply changes

2. **Use the Buttons**
   - User presses the global hotkey (Alt+Space)
   - The Toast window appears
   - User either:
     - Clicks on the "GitHub" button, or
     - Presses the "G" key
   - The default web browser opens and navigates to GitHub
   - The Toast window automatically closes

### Expected Outcome

- User can quickly open websites using Toast App
- The process is faster than opening the browser and typing URLs
- User can use either mouse or keyboard to trigger actions

## Scenario 4: Executing Shell Commands

**User Goal**: Use Toast App to execute frequently used shell commands.

### Workflow

1. **Create Command Buttons**
   - User opens the Settings window
   - User navigates to the "Buttons" tab
   - User clicks "Add Button"
   - User configures a button:
     - Name: "List Files"
     - Shortcut: "L"
     - Icon: "📋"
     - Action Type: "Execute Command"
     - Command: `ls -la` (macOS/Linux) or `dir` (Windows)
     - Run in Terminal: Checked
   - User clicks "Save" to add the button
   - User clicks "Save" in the Settings window to apply changes

2. **Use the Buttons**
   - User presses the global hotkey (Alt+Space)
   - The Toast window appears
   - User either:
     - Clicks on the "List Files" button, or
     - Presses the "L" key
   - A terminal window opens and executes the command
   - The Toast window automatically closes

### Expected Outcome

- User can quickly execute shell commands using Toast App
- The process is faster than opening a terminal and typing commands
- User can see the command output in a terminal window

## Scenario 5: Using Keyboard Shortcuts

**User Goal**: Use Toast App to trigger system-wide keyboard shortcuts.

### Workflow

1. **Create Shortcut Buttons**
   - User opens the Settings window
   - User navigates to the "Buttons" tab
   - User clicks "Add Button"
   - User configures a button:
     - Name: "Screenshot"
     - Shortcut: "S"
     - Icon: "📷"
     - Action Type: "Keyboard Shortcut"
     - Keys: "Cmd+Shift+4" (macOS) or "Win+Shift+S" (Windows)
   - User clicks "Save" to add the button
   - User clicks "Save" in the Settings window to apply changes

2. **Use the Buttons**
   - User presses the global hotkey (Alt+Space)
   - The Toast window appears
   - User either:
     - Clicks on the "Screenshot" button, or
     - Presses the "S" key
   - The system screenshot tool is triggered
   - The Toast window automatically closes

### Expected Outcome

- User can trigger system keyboard shortcuts using Toast App
- The process provides a visual interface for remembering shortcuts
- User can use either mouse or keyboard to trigger actions

## Scenario 6: Running Custom Scripts

**User Goal**: Use Toast App to run custom scripts.

### Workflow

1. **Create Script Buttons**
   - User opens the Settings window
   - User navigates to the "Buttons" tab
   - User clicks "Add Button"
   - User configures a button:
     - Name: "Weather"
     - Shortcut: "W"
     - Icon: "🌤️"
     - Action Type: "Custom Script"
     - Script Type: "JavaScript"
     - Script:
       ```javascript
       const response = await fetch('https://api.openweathermap.org/data/2.5/weather?q=London&appid=YOUR_API_KEY&units=metric');
       const data = await response.json();
       return `Current weather in London: ${data.main.temp}°C, ${data.weather[0].description}`;
       ```
   - User clicks "Test Action" to verify the script works
   - User clicks "Save" to add the button
   - User clicks "Save" in the Settings window to apply changes

2. **Use the Buttons**
   - User presses the global hotkey (Alt+Space)
   - The Toast window appears
   - User either:
     - Clicks on the "Weather" button, or
     - Presses the "W" key
   - The script executes and displays the result in the status bar
   - The Toast window remains open to show the result

### Expected Outcome

- User can run custom scripts using Toast App
- The scripts can perform complex operations and display results
- User can use either mouse or keyboard to trigger actions

## Scenario 7: Searching and Filtering Buttons

**User Goal**: Quickly find and execute a specific button when there are many buttons configured.

### Workflow

1. **Configure Multiple Buttons**
   - User has already configured 20+ buttons for various actions

2. **Search for a Button**
   - User presses the global hotkey (Alt+Space)
   - The Toast window appears
   - User starts typing "git" in the search bar
   - The button list filters to show only buttons with "git" in their name or shortcut
   - User sees the "GitHub" button and presses Enter
   - The default web browser opens and navigates to GitHub
   - The Toast window automatically closes

### Expected Outcome

- User can quickly find buttons using the search feature
- The filtering happens in real-time as the user types
- User can execute the first matching button by pressing Enter

## Scenario 8: Customizing Appearance

**User Goal**: Customize the appearance of Toast App to match personal preferences.

### Workflow

1. **Open Appearance Settings**
   - User opens the Settings window
   - User navigates to the "Appearance" tab

2. **Customize Settings**
   - User changes the theme from "System" to "Dark"
   - User changes the position from "Center" to "Top"
   - User changes the size from "Medium" to "Large"
   - User adjusts the opacity slider to 0.8
   - User changes the button layout from "Grid" to "List"
   - User clicks "Save" to apply changes

3. **View Changes**
   - User presses the global hotkey (Alt+Space)
   - The Toast window appears with the new appearance settings:
     - Dark theme
     - Positioned at the top of the screen
     - Larger size
     - 80% opacity
     - Buttons arranged in a list

### Expected Outcome

- User can customize the appearance of Toast App
- The changes are applied immediately after saving
- The Toast window reflects the user's preferences

## Scenario 9: Importing and Exporting Configuration

**User Goal**: Transfer Toast App configuration between computers.

### Workflow

1. **Export Configuration**
   - User opens the Settings window on Computer A
   - User navigates to the "Buttons" tab
   - User clicks "Export"
   - User chooses a location to save the configuration file
   - User clicks "Save"
   - The configuration is exported to a JSON file

2. **Import Configuration**
   - User installs Toast App on Computer B
   - User opens the Settings window
   - User navigates to the "Buttons" tab
   - User clicks "Import"
   - User selects the previously exported configuration file
   - User clicks "Open"
   - The configuration is imported
   - User clicks "Save" to apply the imported configuration

### Expected Outcome

- User can transfer their Toast App configuration between computers
- All buttons and settings are preserved during the transfer
- The imported configuration is applied correctly on the new computer

## Scenario 10: Troubleshooting

**User Goal**: Resolve issues with Toast App.

### Workflow

1. **Global Hotkey Not Working**
   - User notices that the global hotkey doesn't trigger the Toast window
   - User right-clicks the Toast App icon in the system tray
   - User selects "Settings" from the context menu
   - User navigates to the "General" tab
   - User sees that the global hotkey might conflict with another application
   - User clicks "Record" and sets a different hotkey (e.g., Ctrl+Space)
   - User clicks "Save" to apply the new hotkey
   - User tests the new hotkey and confirms it works

2. **Action Not Executing**
   - User notices that a button doesn't execute its action
   - User opens the Settings window
   - User navigates to the "Buttons" tab
   - User finds the problematic button and clicks "Edit"
   - User reviews the action configuration
   - User clicks "Test Action" to see the error message
   - User corrects the configuration based on the error
   - User clicks "Save" to update the button
   - User clicks "Save" in the Settings window to apply changes
   - User tests the button again and confirms it works

### Expected Outcome

- User can identify and resolve common issues
- The application provides helpful error messages
- User can test actions before saving to verify they work

## Scenario 11: Advanced Configuration

**User Goal**: Configure advanced settings for Toast App.

### Workflow

1. **Open Advanced Settings**
   - User opens the Settings window
   - User navigates to the "Advanced" tab

2. **Customize Advanced Settings**
   - User enables "Hide after action" to automatically close the Toast window after executing an action
   - User enables "Hide on blur" to close the Toast window when clicking outside
   - User enables "Hide on Escape" to close the Toast window when pressing Escape
   - User disables "Show in taskbar" to hide the Toast window from the taskbar/dock
   - User clicks "Save" to apply changes

### Expected Outcome

- User can customize advanced behavior of Toast App
- The changes are applied immediately after saving
- The Toast window behaves according to the user's preferences

## Scenario 12: Using Toast App in a Workflow

**User Goal**: Integrate Toast App into a development workflow.

### Workflow

1. **Configure Development Buttons**
   - User configures buttons for common development tasks:
     - "Start Server" (Execute Command: `npm start`)
     - "Run Tests" (Execute Command: `npm test`)
     - "Build" (Execute Command: `npm run build`)
     - "GitHub" (Open URL: "https://github.com")
     - "Docs" (Open URL: "https://developer.mozilla.org")
     - "Terminal" (Execute Command: `open -a Terminal` or `start cmd`)
     - "VS Code" (Execute Command: `code .`)

2. **Use in Development Workflow**
   - User is working on a project
   - User needs to start the development server
   - User presses the global hotkey (Alt+Space)
   - User clicks "Start Server" or presses its shortcut
   - The server starts in a terminal window
   - Later, user needs to check documentation
   - User presses the global hotkey again
   - User clicks "Docs" or presses its shortcut
   - The documentation opens in the browser

### Expected Outcome

- User can quickly access common development tools and commands
- Toast App integrates seamlessly into the development workflow
- User saves time by avoiding manual navigation and typing

## Conclusion

These scenarios demonstrate the versatility and efficiency of Toast App in various use cases. By providing quick access to applications, websites, commands, and scripts, Toast App helps users streamline their workflows and increase productivity.

The application's customization options allow users to tailor it to their specific needs, while the keyboard-centric design enables efficient operation without relying on the mouse. The search functionality makes it easy to find and execute actions even when many buttons are configured.

Toast App's ability to execute different types of actions—from opening applications to running custom scripts—makes it a powerful tool for automating repetitive tasks and accessing frequently used resources.
