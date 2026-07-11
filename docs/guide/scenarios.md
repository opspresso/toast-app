# Toast App User Scenarios

This document describes common user scenarios and workflows for the Toast app, showing how users can perform various tasks using the application.

## Scenario 1: First-Time Setup

**User Goal**: Install and configure the Toast app for the first time.

### Workflow

1. **Download and Install**
   - The user downloads the Toast app installer from the website or a GitHub release
   - The user runs the installer and follows the setup wizard
   - After installation, the Toast app launches automatically

2. **Initial Configuration**
   - On first launch, the settings window opens automatically
   - The user is prompted to configure the global shortcut (default: Alt+Space)
   - The user decides whether to launch the Toast app at login
   - The user reviews the default buttons

3. **Apply Configuration**
   - Settings are saved immediately upon change (no separate save button)
   - When the settings window is closed, the Toast app keeps running in the system tray

### Expected Result

- The Toast app is installed and configured
- The Toast app runs in the background with an icon in the system tray
- The global shortcut is set and ready to use

## Scenario 2: Opening Applications

**User Goal**: Quickly open frequently used applications with the Toast app.

### Workflow

1. **Create an Application Button**
   - The user opens the Toast window with the global shortcut (Alt+Space)
   - The user switches to edit mode (click the edit icon (📝) or press the comma (,) key)
   - The user clicks an empty button to add a new button
   - The user configures the button:
     - Name: "Chrome"
     - Shortcut: auto-assigned ("Q" since it's the first button)
     - Icon: "🌐"
     - Action type: "Run Command"
     - Command: `open -a "Google Chrome"` (macOS) or `start chrome` (Windows)
   - The user clicks "Save" to add the button
   - The user repeats the process for other applications (e.g., VS Code, Terminal, Slack)

2. **Use the Button**
   - The user presses the global shortcut (Alt+Space)
   - The Toast window appears
   - The user does one of the following:
     - Clicks the "Chrome" button, or
     - Presses the "Q" key (the auto-assigned shortcut of the first button)
   - Google Chrome launches
   - The Toast window closes automatically

### Expected Result

- The user can quickly open applications with the Toast app
- This process is faster than navigating through the Start menu or Dock
- The user can trigger actions using either the mouse or the keyboard

## Scenario 3: Opening Websites

**User Goal**: Quickly open frequently visited websites with the Toast app.

### Workflow

1. **Create a Website Button**
   - The user opens the Toast window with the global shortcut (Alt+Space)
   - The user switches to edit mode (click the edit icon (📝) or press the comma (,) key)
   - The user clicks an empty button to add a new button
   - The user configures the button:
     - Name: "GitHub"
     - Shortcut: auto-assigned ("Q" since it's the first button)
     - Icon: "🐙"
     - Action type: "Open URL/File"
     - URL: "https://github.com"
   - The user clicks "Save" to add the button
   - The user repeats the process for other websites

2. **Use the Button**
   - The user presses the global shortcut (Alt+Space)
   - The Toast window appears
   - The user does one of the following:
     - Clicks the "GitHub" button, or
     - Presses the "Q" key (the auto-assigned shortcut of the first button)
   - The default web browser opens and navigates to GitHub
   - The Toast window closes automatically

### Expected Result

- The user can quickly open websites with the Toast app
- This process is faster than opening a browser and typing the URL
- The user can trigger actions using either the mouse or the keyboard

## Scenario 4: Running Shell Commands

**User Goal**: Run frequently used shell commands with the Toast app.

### Workflow

1. **Create a Command Button**
   - The user opens the Toast window with the global shortcut (Alt+Space)
   - The user switches to edit mode (click the edit icon (📝) or press the comma (,) key)
   - The user clicks an empty button to add a new button
   - The user configures the button:
     - Name: "List Files"
     - Shortcut: auto-assigned ("Q" since it's the first button)
     - Icon: "📋"
     - Action type: "Run Command"
     - Command: `ls -la` (macOS/Linux) or `dir` (Windows)
     - Run in Terminal: checked
   - The user clicks "Save" to add the button

2. **Use the Button**
   - The user presses the global shortcut (Alt+Space)
   - The Toast window appears
   - The user does one of the following:
     - Clicks the "List Files" button, or
     - Presses the "Q" key (the auto-assigned shortcut of the first button)
   - A terminal window opens and runs the command
   - The Toast window closes automatically

### Expected Result

- The user can quickly run shell commands with the Toast app
- This process is faster than opening a terminal and typing the command
- The user can view the command output in the terminal window

## Scenario 5: Capturing a Screenshot

**User Goal**: Run a screenshot capture command with the Toast app.

### Workflow

1. **Create a Screenshot Button**
   - The user opens the Toast window with the global shortcut (Alt+Space)
   - The user switches to edit mode (click the edit icon (📝) or press the comma (,) key)
   - The user clicks an empty button to add a new button
   - The user configures the button:
     - Name: "Screenshot"
     - Shortcut: auto-assigned ("Q" since it's the first button)
     - Icon: "📷"
     - Action type: "Run Command"
     - Command: `screencapture -i ~/Desktop/screenshot.png` (macOS) or `explorer ms-screenclip:` (Windows)
   - The user clicks "Save" to add the button

2. **Use the Button**
   - The user presses the global shortcut (Alt+Space)
   - The Toast window appears
   - The user does one of the following:
     - Clicks the "Screenshot" button, or
     - Presses the "Q" key (the auto-assigned shortcut of the first button)
   - The system screenshot tool launches
   - The Toast window closes automatically

### Expected Result

- The user can quickly launch the screenshot tool with the Toast app
- This process provides a visual interface for remembering commands
- The user can trigger actions using either the mouse or the keyboard

## Scenario 6: Running a Custom Script

**User Goal**: Run a custom script with the Toast app.

### Workflow

1. **Create a Script Button**
   - The user opens the Toast window with the global shortcut (Alt+Space)
   - The user switches to edit mode (click the edit icon (📝) or press the comma (,) key)
   - The user clicks an empty button to add a new button
   - The user configures the button:
     - Name: "System Info"
     - Shortcut: auto-assigned ("Q" since it's the first button)
     - Icon: "💻"
     - Action type: "Custom Script"
     - Script type: "JavaScript"
     - Script:
       ```javascript
       const os = require('os');
       result = `Platform: ${process.platform}, Hostname: ${os.hostname()}, Free memory: ${Math.round(os.freemem() / 1024 / 1024)} MB`;
       ```
   - The user clicks "Test Action" to confirm the script works
   - The user clicks "Save" to add the button

2. **Use the Button**
   - The user presses the global shortcut (Alt+Space)
   - The Toast window appears
   - The user does one of the following:
     - Clicks the "System Info" button, or
     - Presses the "Q" key (the auto-assigned shortcut of the first button)
   - The script runs and the result is shown in the status bar
   - The Toast window closes automatically (if you disable "Hide After Action" in settings, it stays open so you can review the result)

### Expected Result

- The user can run custom scripts with the Toast app
- Scripts can perform complex tasks and display results
- The user can trigger actions using either the mouse or the keyboard

## Scenario 7: Customizing the Appearance

**User Goal**: Customize the appearance of the Toast app to personal taste.

### Workflow

1. **Open Appearance Settings**
   - The user opens the settings window
   - The user navigates to the "Appearance" section of the "Settings" tab

2. **Customize Settings**
   - The user changes the theme from "System" to "Dark"
   - The user changes the position from "Center" to "Top"
   - The user changes the size from "Medium" to "Large"
   - The user adjusts the opacity slider to 0.8
   - Changes are saved immediately

3. **View the Changes**
   - The user presses the global shortcut (Alt+Space)
   - The Toast window appears with the new appearance settings:
     - Dark theme
     - Positioned at the top of the screen
     - Larger size
     - 80% opacity

### Expected Result

- The user can customize the appearance of the Toast app
- Changes take effect immediately
- The Toast window reflects the user's preferences

## Scenario 8: Troubleshooting

**User Goal**: Resolve issues related to the Toast app.

### Workflow

1. **Global Shortcut Not Working**
   - The user notices that the global shortcut does not trigger the Toast window
   - The user right-clicks the Toast app icon in the system tray
   - The user selects "Settings" from the context menu
   - The user navigates to the "General" section of the "Settings" tab
   - The user confirms that the global shortcut may conflict with another application
   - The user clicks "Record" and sets a different shortcut (e.g., Ctrl+Space) — it applies immediately
   - The user tests the new shortcut and confirms it works

2. **Action Not Running**
   - The user notices that a button does not run its action
   - The user opens the Toast window with the global shortcut (Alt+Space)
   - The user switches to edit mode (click the edit icon (📝) or press the comma (,) key)
   - The user clicks the problematic button to edit it
   - The user reviews the action configuration
   - The user clicks "Test Action" to see the error message
   - The user fixes the configuration based on the error
   - The user clicks "Save" to update the button
   - The user tests the button again and confirms it works

### Expected Result

- The user can identify and resolve common issues
- The application provides helpful error messages
- The user can test an action before saving to confirm it works

## Scenario 9: Advanced Configuration

**User Goal**: Configure advanced settings for the Toast app.

### Workflow

1. **Open Advanced Settings**
   - The user opens the settings window
   - The user navigates to the "Advanced" section of the "Settings" tab

2. **Customize Advanced Settings**
   - The user enables "Hide After Action" to automatically close the Toast window after an action runs
   - The user enables "Hide on Blur" to close the Toast window when clicking outside
   - The user enables "Hide with Escape Key" to close the Toast window when pressing Escape
   - The user disables "Show in Taskbar" to hide the Toast window from the taskbar/dock
   - Changes are saved immediately

### Expected Result

- The user can customize the advanced behavior of the Toast app
- Changes take effect immediately
- The Toast window behaves according to the user's preferences

## Scenario 10: Using the Toast App in a Workflow

**User Goal**: Integrate the Toast app into a development workflow.

### Workflow

1. **Configure Development Buttons**
   - The user configures buttons for common development tasks:
     - "Start Server" (Run Command: `npm start`)
     - "Run Tests" (Run Command: `npm run test`)
     - "Build" (Run Command: `npm run build`)
     - "GitHub" (Open URL: "https://github.com")
     - "Docs" (Open URL: "https://developer.mozilla.org")
     - "Terminal" (Run Command: `open -a Terminal` or `start cmd`)
     - "VS Code" (Run Command: `code .`)

2. **Use in the Development Workflow**
   - The user is working on a project
   - The user needs to start the development server
   - The user presses the global shortcut (Alt+Space)
   - The user clicks "Start Server" or presses the corresponding shortcut
   - The server starts in a terminal window
   - Later, the user needs to check the documentation
   - The user presses the global shortcut again
   - The user clicks "Docs" or presses the corresponding shortcut
   - The documentation opens in the browser

### Expected Result

- The user can quickly access common development tools and commands
- The Toast app integrates seamlessly into the development workflow
- The user saves time by avoiding manual navigation and typing

## Conclusion

These scenarios demonstrate the versatility and efficiency of the Toast app across a variety of use cases. By providing quick access to applications, websites, commands, and scripts, the Toast app helps users streamline their workflows and boost productivity.

The application's customization options let users tailor it to their specific needs, and its keyboard-centric design enables efficient operation without relying on the mouse.

Overall, the Toast app is a powerful productivity tool that helps users automate repetitive tasks, quickly access frequently used tools, and build personalized workflows.
