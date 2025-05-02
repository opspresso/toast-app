# Custom Scripts in Toast App

This document details how to create, use, and manage custom scripts within the Toast App, including the security model implemented to protect users.

## Table of Contents

- [Custom Scripts in Toast App](#custom-scripts-in-toast-app)
  - [Table of Contents](#table-of-contents)
  - [Overview](#overview)
  - [Supported Script Types](#supported-script-types)
    - [JavaScript](#javascript)
    - [AppleScript (macOS only)](#applescript-macos-only)
    - [PowerShell (Windows only)](#powershell-windows-only)
    - [Bash/Shell](#bashshell)
  - [Creating Custom Scripts](#creating-custom-scripts)
    - [Script Editor](#script-editor)
    - [Script Testing](#script-testing)
    - [Script Button Configuration](#script-button-configuration)
  - [Script Execution Environment](#script-execution-environment)
    - [Environment Variables](#environment-variables)
    - [Execution Context](#execution-context)
    - [Output Handling](#output-handling)
    - [Error Handling](#error-handling)
  - [Security Model](#security-model)
    - [Sandboxing](#sandboxing)
    - [Permissions](#permissions)
    - [Input Validation](#input-validation)
    - [Script Validation](#script-validation)
  - [Script Examples](#script-examples)
    - [JavaScript Examples](#javascript-examples)
    - [AppleScript Examples](#applescript-examples)
    - [PowerShell Examples](#powershell-examples)
    - [Bash/Shell Examples](#bashshell-examples)
  - [Best Practices](#best-practices)
  - [Troubleshooting](#troubleshooting)
  - [Advanced Usage](#advanced-usage)
    - [Working with External APIs](#working-with-external-apis)
    - [Persistent Data Storage](#persistent-data-storage)
    - [Inter-Script Communication](#inter-script-communication)
  - [Security Considerations](#security-considerations)

## Overview

Toast App allows users to create and execute custom scripts to extend functionality beyond built-in actions. Custom scripts can automate workflows, interact with external systems, or create custom tools accessible through the Toast interface.

## Supported Script Types

Toast App supports several script types, each with its own capabilities and limitations:

### JavaScript

JavaScript scripts run in a Node.js environment within the Electron main process.

- **Features**:
  - Full access to Node.js APIs and modules
  - Ability to use `require()` for included modules
  - Async/await support
  - Promise-based return values
  
- **Limitations**:
  - Cannot directly manipulate the DOM or renderer process
  - Security restrictions on certain operations
  - Limited access to platform-specific APIs

Example:
```javascript
// Return a random quote
const quotes = [
  "The best way to predict the future is to invent it.",
  "Code is like humor. When you have to explain it, it's bad.",
  "Programming isn't about what you know; it's about what you can figure out."
];

const randomIndex = Math.floor(Math.random() * quotes.length);
return quotes[randomIndex];
```

### AppleScript (macOS only)

AppleScript enables automation on macOS, allowing interaction with system services and applications.

- **Features**:
  - Control macOS applications and services
  - System automation
  - UI scripting capabilities
  
- **Limitations**:
  - macOS only
  - May require security permissions
  - Limited error reporting

Example:
```applescript
-- Get current volume level
set currentVolume to output volume of (get volume settings)
return "Current volume: " & currentVolume & "%"
```

### PowerShell (Windows only)

PowerShell scripts provide powerful automation capabilities on Windows systems.

- **Features**:
  - Windows system automation
  - Rich object model
  - Access to .NET framework
  
- **Limitations**:
  - Windows only
  - Execution policy considerations
  - May require elevated privileges for certain operations

Example:
```powershell
# Get system uptime
$os = Get-WmiObject win32_operatingsystem
$uptime = (Get-Date) - ($os.ConvertToDateTime($os.LastBootUpTime))
"System uptime: {0} days, {1} hours, {2} minutes" -f $uptime.Days, $uptime.Hours, $uptime.Minutes
```

### Bash/Shell

Bash/Shell scripts run in the default system shell, allowing for cross-platform command-line operations.

- **Features**:
  - Cross-platform (with platform-specific considerations)
  - Direct access to command-line utilities
  - Familiar syntax for command-line users
  
- **Limitations**:
  - Platform-specific behavior
  - Limited error handling
  - May require specific command line tools to be installed

Example:
```bash
# Get system information
echo "Hostname: $(hostname)"
echo "Kernel: $(uname -r)"
echo "User: $(whoami)"
```

## Creating Custom Scripts

### Script Editor

The Toast App provides an integrated script editor with the following features:

- Syntax highlighting for all supported script types
- Line numbers
- Error highlighting
- Auto-indentation
- Basic code completion

To access the script editor:

1. Open the Settings window
2. Navigate to the "Buttons" tab
3. Add a new button or edit an existing one
4. Select "Custom Script" as the action type
5. Choose the script type from the dropdown menu
6. Use the script editor to write or paste your script

### Script Testing

You can test scripts before saving them:

1. Write your script in the script editor
2. Click the "Test Script" button
3. View the output or errors in the test results panel
4. Refine your script if needed
5. Save when satisfied with the results

### Script Button Configuration

When creating a button for your script:

1. Provide a descriptive name
2. Select an appropriate icon
3. Choose a shortcut key (optional)
4. Select the script type
5. Enter or paste your script
6. Configure additional options:
   - **Run in background**: Execute without waiting for completion
   - **Show output**: Display script output in Toast status bar
   - **Terminate on window close**: Kill script process when Toast window closes

## Script Execution Environment

### Environment Variables

Scripts have access to the following environment variables:

| Variable | Description |
|----------|-------------|
| `TOAST_APP_VERSION` | The current version of Toast App |
| `TOAST_USER_DATA_PATH` | Path to the user data directory |
| `TOAST_TEMP_PATH` | Path to the temporary directory |
| `TOAST_SCRIPT_ID` | Unique identifier for the current script |
| `TOAST_PLATFORM` | Current platform (darwin, win32) |

### Execution Context

Scripts run with the following characteristics:

- JavaScript scripts run in the Electron main process with Node.js context
- AppleScript, PowerShell, and Bash scripts run in child processes
- Working directory is set to the user's home directory
- Standard input is empty (closed)
- Standard output and error are captured for display

### Output Handling

Script output is handled as follows:

- **Return values** (JavaScript only): The last expression or explicitly returned value
- **Standard output**: Captured and available in the result
- **Standard error**: Captured and displayed as an error
- **Exit code**: Non-zero exit codes are treated as errors

Output is truncated if it exceeds 10,000 characters to prevent UI issues.

### Error Handling

Error reporting includes:

- Syntax errors detected before execution
- Runtime errors with line numbers (when available)
- Exit code information for shell scripts
- Timeout errors for scripts that run too long

## Security Model

### Sandboxing

Toast App implements security measures for script execution:

- Scripts run with the same permissions as the Toast App process
- No elevated privileges unless the app itself is run with them
- Resource limitations to prevent runaway scripts
- Timeouts to prevent infinite loops or hangs

### Permissions

Scripts have the following permission characteristics:

- Access to the filesystem (read/write) within user directories
- Network access for making HTTP requests and other connections
- No special access to protected system areas
- macOS and Windows security restrictions still apply

### Input Validation

All scripts undergo validation:

- Input sanitization to prevent command injection
- Length limits to prevent excessively large scripts
- Format validation for different script types

### Script Validation

Scripts are validated before execution:

- Syntax checking where possible
- Verification of required permissions
- Timeout settings to prevent infinite execution
- Resource limitation checks

## Script Examples

### JavaScript Examples

**Weather Information**:
```javascript
// Fetch current weather information
const https = require('https');

async function getWeather(city) {
  const apiKey = 'YOUR_API_KEY'; // Replace with your API key
  const url = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=metric`;
  
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const weatherData = JSON.parse(data);
          resolve(`Weather in ${weatherData.name}: ${weatherData.main.temp}°C, ${weatherData.weather[0].description}`);
        } catch (e) {
          reject(`Error parsing weather data: ${e.message}`);
        }
      });
    }).on('error', (e) => reject(`Error fetching weather: ${e.message}`));
  });
}

// Return weather for London (can be customized)
return getWeather('London');
```

**System Information**:
```javascript
const os = require('os');

// Format bytes to human readable format
function formatBytes(bytes) {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let i = 0;
  while (bytes >= 1024 && i < units.length - 1) {
    bytes /= 1024;
    i++;
  }
  return `${bytes.toFixed(2)} ${units[i]}`;
}

// Gather system information
const cpus = os.cpus();
const totalMem = formatBytes(os.totalmem());
const freeMem = formatBytes(os.freemem());
const uptime = (os.uptime() / 3600).toFixed(2);

return `
System: ${os.type()} ${os.release()} ${os.arch()}
Hostname: ${os.hostname()}
CPU: ${cpus[0].model} (${cpus.length} cores)
Memory: ${freeMem} free of ${totalMem}
Uptime: ${uptime} hours
`;
```

### AppleScript Examples

**Control Music App**:
```applescript
-- Toggle play/pause in Music app
tell application "Music"
  if player state is playing then
    pause
    return "Music paused"
  else
    play
    set currentTrack to name of current track
    set currentArtist to artist of current track
    return "Now playing: " & currentTrack & " by " & currentArtist
  end if
end tell
```

**Screen Brightness**:
```applescript
-- Get and set screen brightness
tell application "System Events"
  tell appearance preferences
    set currentBrightness to brightness
    
    -- Toggle between full brightness and 30%
    if currentBrightness > 0.5 then
      set brightness to 0.3
      return "Brightness set to 30%"
    else
      set brightness to 1.0
      return "Brightness set to 100%"
    end if
  end tell
end tell
```

### PowerShell Examples

**Battery Status**:
```powershell
# Get battery status on a laptop
$battery = Get-WmiObject Win32_Battery
if ($battery) {
    $status = switch ($battery.BatteryStatus) {
        1 {"Discharging"}
        2 {"AC Power"}
        3 {"Fully Charged"}
        4 {"Low"}
        5 {"Critical"}
        default {"Unknown"}
    }
    
    "Battery: $($battery.EstimatedChargeRemaining)% ($status)"
} else {
    "No battery detected (desktop system)"
}
```

**Wi-Fi Network List**:
```powershell
# Get available Wi-Fi networks
$networks = (netsh wlan show networks) -match '(SSID|Signal)'
$networksFormatted = $networks -join "`n"
"Available Wi-Fi Networks:`n$networksFormatted"
```

### Bash/Shell Examples

**Git Repository Status**:
```bash
# Show git repository status
if [ -d .git ] || git rev-parse --git-dir > /dev/null 2>&1; then
    echo "Git Repository Status:"
    echo "---------------------"
    echo "Current branch: $(git branch --show-current)"
    echo "Recent commits:"
    git log --oneline -n 5
    echo "---------------------"
    git status -s
else
    echo "Not a git repository"
fi
```

**System Monitoring**:
```bash
# Show top CPU and memory processes
echo "Top CPU Processes:"
ps -eo pid,pcpu,pmem,comm --sort=-pcpu | head -n 6

echo -e "\nTop Memory Processes:"
ps -eo pid,pcpu,pmem,comm --sort=-pmem | head -n 6

echo -e "\nDisk Usage:"
df -h | grep -v "tmpfs"
```

## Best Practices

1. **Keep scripts focused**: Each script should perform a specific, well-defined task
2. **Handle errors gracefully**: Include error handling in your scripts
3. **Use comments**: Document your scripts, especially for complex operations
4. **Consider performance**: Long-running scripts can impact the Toast App's responsiveness
5. **Test thoroughly**: Test scripts in various scenarios before relying on them
6. **Secure sensitive information**: Don't hardcode API keys or passwords in scripts
7. **Use platform checks**: For shell scripts, check the platform before using platform-specific commands
8. **Provide user feedback**: Return meaningful messages from your scripts

## Troubleshooting

Common issues and solutions:

| Issue | Solution |
|-------|----------|
| Script times out | Optimize script performance or increase timeout in settings |
| "Command not found" errors | Ensure required tools are installed or provide full paths |
| Permission errors | Check file/folder permissions or run Toast App with required privileges |
| Network errors | Verify network connectivity and URL format |
| Syntax errors | Use the Test Script feature to identify and fix syntax issues |
| No output | Ensure script returns or outputs data properly |

## Advanced Usage

### Working with External APIs

JavaScript scripts can work with external APIs:

```javascript
const https = require('https');

async function fetchFromAPI(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`Request failed with status: ${res.statusCode}`));
        return;
      }

      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });
}

async function getJoke() {
  try {
    const data = await fetchFromAPI('https://icanhazdadjoke.com/');
    return data.joke;
  } catch (error) {
    return `Error fetching joke: ${error.message}`;
  }
}

return getJoke();
```

### Persistent Data Storage

Scripts can store and retrieve data using the filesystem:

```javascript
const fs = require('fs');
const path = require('path');

// Path to data file
const dataFile = path.join(process.env.TOAST_USER_DATA_PATH, 'script-data.json');

// Read existing data or create new if doesn't exist
function getData() {
  try {
    if (fs.existsSync(dataFile)) {
      return JSON.parse(fs.readFileSync(dataFile, 'utf8'));
    }
    return { counter: 0, lastRun: null };
  } catch (error) {
    return { counter: 0, lastRun: null, error: error.message };
  }
}

// Update data
function updateData(data) {
  fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));
}

// Get current data
const data = getData();

// Update data
data.counter += 1;
data.lastRun = new Date().toISOString();
updateData(data);

return `This script has been run ${data.counter} times. Last run: ${data.lastRun}`;
```

### Inter-Script Communication

Scripts can communicate with each other using temporary files:

```javascript
const fs = require('fs');
const path = require('path');

// Path to shared data file
const sharedFile = path.join(process.env.TOAST_TEMP_PATH, 'script-shared-data.json');

// Read data from another script
function getSharedData() {
  try {
    if (fs.existsSync(sharedFile)) {
      return JSON.parse(fs.readFileSync(sharedFile, 'utf8'));
    }
    return null;
  } catch (error) {
    return { error: error.message };
  }
}

// Write data for another script
function setSharedData(data) {
  fs.writeFileSync(sharedFile, JSON.stringify(data, null, 2));
}

// Example usage: toggle a state between scripts
const data = getSharedData() || { state: 'off' };
data.state = data.state === 'on' ? 'off' : 'on';
setSharedData(data);

return `Toggled shared state to: ${data.state}`;
```

## Security Considerations

When working with custom scripts, consider these security guidelines:

1. **Don't run scripts from untrusted sources** without reviewing them
2. **Avoid executing system commands** with unsanitized input
3. **Don't store sensitive information** (passwords, API keys) in plain text scripts
4. **Be cautious with file operations** to avoid unintended data loss
5. **Consider the security implications** of scripts that make network requests
6. **Understand that scripts run with your user permissions** and can access your files
7. **Use secure API endpoints** (HTTPS rather than HTTP)
8. **Validate and sanitize all external data** before processing it
9. **Remember that JavaScript scripts have access to Node.js APIs** and associated capabilities
10. **Review scripts periodically** for potential security issues as your environment changes