# Toast App Custom Scripts

This document explains how to create, use, and manage custom scripts in the Toast app, as well as the security characteristics of script execution.

## Table of Contents

- [Overview](#overview)
- [Supported Script Types](#supported-script-types)
  - [JavaScript](#javascript)
  - [AppleScript (macOS Only)](#applescript-macos-only)
  - [PowerShell (Windows Only)](#powershell-windows-only)
  - [Bash/Shell](#bashshell)
- [Creating Custom Scripts](#creating-custom-scripts)
  - [Script Editor](#script-editor)
  - [Configuring Script Buttons](#configuring-script-buttons)
- [Script Execution Environment](#script-execution-environment)
  - [Environment Variables](#environment-variables)
  - [Execution Context](#execution-context)
  - [Output Handling](#output-handling)
  - [Error Handling](#error-handling)
- [Security Model](#security-model)
  - [Execution Isolation](#execution-isolation)
  - [Permissions](#permissions)
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

The Toast app lets users create and run custom scripts to extend functionality beyond the built-in actions. Custom scripts can automate workflows, interact with external systems, or create custom tools accessible through the Toast interface.

## Supported Script Types

The Toast app supports several script types, each with its own capabilities and limitations:

### JavaScript

JavaScript scripts run in a Node.js environment within the Electron main process.

- **Capabilities**:
  - Full access to Node.js APIs and modules
  - `require()` is available for bundled modules
  - async/await support
  - Return a result by assigning a value to the `result` variable (`result = ...`; when a Promise is assigned, the resolved value is returned after completion)
  - `scriptParams` are injected into the script as a `params` object

- **Limitations**:
  - Cannot directly manipulate the DOM or the renderer process (runs in the main process)
  - Top-level `return` statements are not allowed (they cause a syntax error); assign to `result` instead

Example:
```javascript
// Return a random quote
const quotes = [
  "The best way to predict the future is to invent it.",
  "Code is like humor. When you have to explain it, it's bad.",
  "Programming isn't about what you know; it's about what you can figure out."
];

const randomIndex = Math.floor(Math.random() * quotes.length);
result = quotes[randomIndex];
```

### AppleScript (macOS Only)

AppleScript enables automation on macOS, allowing you to interact with system services and applications.

- **Capabilities**:
  - Control macOS applications and services
  - System automation
  - UI scripting capabilities

- **Limitations**:
  - macOS only
  - May require security permissions
  - Limited error reporting

Example:
```applescript
-- Get the current volume level
set currentVolume to output volume of (get volume settings)
return "Current volume: " & currentVolume & "%"
```

### PowerShell (Windows Only)

PowerShell scripts provide powerful automation capabilities on Windows systems.

- **Capabilities**:
  - Windows system automation
  - Rich object model
  - .NET Framework access

- **Limitations**:
  - Windows only
  - Runs with `-ExecutionPolicy Bypass` applied (bypasses the system execution policy)
  - May require administrator privileges for certain operations

Example:
```powershell
# Get system uptime
$os = Get-WmiObject win32_operatingsystem
$uptime = (Get-Date) - ($os.ConvertToDateTime($os.LastBootUpTime))
"System uptime: {0} days {1} hours {2} minutes" -f $uptime.Days, $uptime.Hours, $uptime.Minutes
```

### Bash/Shell

Bash/Shell scripts run in the default system shell. They are not supported on Windows and run only on macOS and Linux.

- **Capabilities**:
  - macOS/Linux support (not supported on Windows)
  - Direct access to command-line utilities
  - Syntax familiar to command-line users

- **Limitations**:
  - Cannot run on Windows (macOS/Linux only)
  - Limited error handling
  - Specific command-line tools may need to be installed

Example:
```bash
# Get system information
echo "Hostname: $(hostname)"
echo "Kernel: $(uname -r)"
echo "User: $(whoami)"
```

## Creating Custom Scripts

### Script Editor

You can write or paste scripts into the text input area of the button edit modal, which opens when you add or edit a button in the Toast window's edit mode.

To access the script editor:

1. Open the Toast window with the global shortcut (default: Alt+Space)
2. Switch to edit mode (comma `,` key)
3. Add a new button or edit an existing button
4. Select "Custom Script" as the action type
5. Choose the script type from the dropdown menu
6. Write or paste your script using the script editor

### Configuring Script Buttons

When creating a button for a script:

1. Provide a descriptive name
2. Choose an appropriate icon
3. Select a shortcut (optional)
4. Choose the script type
5. Enter or paste the script

## Script Execution Environment

### Environment Variables

Scripts are injected only with an allowlist of non-sensitive variables, not the full set of system environment variables: `HOME`, `USER`, `USERPROFILE`, `PATH`, `LANG`, `SHELL`, `TMPDIR`, `TEMP`, `TMP`. Secrets (such as `CLIENT_SECRET`) are kept in the main process only.

```javascript
// Access environment variables included in the allowlist
const home = process.env.HOME;
const path = process.env.PATH;

// Platform information
const platform = process.platform; // 'darwin', 'win32', 'linux'
const arch = process.arch;         // 'x64', 'arm64', etc.
```

Shell scripts (Bash, PowerShell, AppleScript) also run with only the same allowlisted environment variables.

### Execution Context

Scripts run with the following characteristics:

- JavaScript scripts run in the Electron main process with a Node.js context
- AppleScript, PowerShell, and Bash scripts run in child processes
- The working directory is not specified separately; it inherits the working directory of the Toast app process
- Standard input is empty (closed)
- Standard output and error are captured for display

### Output Handling

Script output is handled as follows:

- **Return value** (JavaScript only): the value assigned to the `result` variable (e.g., `result = ...`). If `result` is not set, a success message is returned
- **Standard output**: captured and available in the result
- **Standard error**: captured and shown as an error
- **Exit code**: a non-zero exit code is treated as an error

Output is captured in the result and displayed.

### Error Handling

Error reporting includes:

- Runtime error messages (for JavaScript, caught via try/catch and returned)
- Exit code information for shell scripts

## Security Model

### Execution Isolation

The Toast app does not apply any separate sandboxing or isolation to script execution:

- JavaScript scripts run in a Node.js `vm` context, but the full `require` and `Buffer` are injected as-is, effectively granting unrestricted Node.js access (`process.env` injects only the 9 allowlisted variables). No input sanitization, command injection filtering, length limits, format validation, or syntax checking is performed before execution.
- Scripts run with the same privileges as the Toast app process.
- They have no administrator privileges unless the app itself is running with administrator privileges.
- Only the security restrictions of the macOS and Windows operating systems apply.

### Permissions

Scripts have the following permission characteristics:

- Filesystem access within the user directory (read/write)
- Network access for HTTP requests and other connections
- No special access to protected system areas
- macOS and Windows security restrictions still apply

## Script Examples

### JavaScript Examples

**Weather information**:
```javascript
// Get current weather information
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

// Return the weather for Seoul (customizable)
result = getWeather('Seoul');
```

**System information**:
```javascript
const os = require('os');

// Convert bytes to a human-readable format
function formatBytes(bytes) {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let i = 0;
  while (bytes >= 1024 && i < units.length - 1) {
    bytes /= 1024;
    i++;
  }
  return `${bytes.toFixed(2)} ${units[i]}`;
}

// Collect system information
const cpus = os.cpus();
const totalMem = formatBytes(os.totalmem());
const freeMem = formatBytes(os.freemem());
const uptime = (os.uptime() / 3600).toFixed(2);

result = `
System: ${os.type()} ${os.release()} ${os.arch()}
Hostname: ${os.hostname()}
CPU: ${cpus[0].model} (${cpus.length} cores)
Memory: ${freeMem} available of ${totalMem}
Uptime: ${uptime} hours
`;
```

### AppleScript Examples

**Control the Music app**:
```applescript
-- Toggle play/pause in the Music app
tell application "Music"
  if player state is playing then
    pause
    return "Music paused"
  else
    play
    set currentTrack to name of current track
    set currentArtist to artist of current track
    return "Now playing: " & currentTrack & " - " & currentArtist
  end if
end tell
```

**Screen brightness**:
```applescript
-- Get and set screen brightness
tell application "System Events"
  tell appearance preferences
    set currentBrightness to brightness

    -- Toggle between maximum brightness and 30%
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

**Battery status**:
```powershell
# Get the battery status of a laptop
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

**List Wi-Fi networks**:
```powershell
# Get available Wi-Fi networks
$networks = (netsh wlan show networks) -match '(SSID|Signal)'
$networksFormatted = $networks -join "`n"
"Available Wi-Fi networks:`n$networksFormatted"
```

### Bash/Shell Examples

**Git repository status**:
```bash
# Show git repository status
if [ -d .git ] || git rev-parse --git-dir > /dev/null 2>&1; then
    echo "Git repository status:"
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

**System monitoring**:
```bash
# Show top CPU and memory processes
echo "Top CPU processes:"
ps -eo pid,pcpu,pmem,comm --sort=-pcpu | head -n 6

echo -e "\nTop memory processes:"
ps -eo pid,pcpu,pmem,comm --sort=-pmem | head -n 6

echo -e "\nDisk usage:"
df -h | grep -v "tmpfs"
```

## Best Practices

1. **Keep scripts focused**: Each script should perform a specific, well-defined task
2. **Handle errors gracefully**: Include error handling in your scripts
3. **Use comments**: Document your scripts, especially for complex operations
4. **Consider performance**: Long-running scripts can affect the Toast app's responsiveness
5. **Test thoroughly**: Test scripts in various scenarios before relying on them
6. **Secure sensitive information**: Do not hardcode API keys or passwords in scripts
7. **Use platform checks**: For shell scripts, check the platform before using platform-specific commands
8. **Provide user feedback**: Return meaningful messages from scripts

## Troubleshooting

Common problems and solutions:

| Problem | Solution |
|------|--------|
| Script not responding | Optimize script performance or check for infinite loops |
| "Command not found" error | Verify that the required tools are installed or provide the full path |
| Permission error | Check file/folder permissions or run the Toast app with the required privileges |
| Network error | Check network connectivity and URL format |
| Syntax error | Review the script syntax and check the returned error message to fix it |
| No output | Verify that the script correctly returns or prints data |

## Advanced Usage

### Working with External APIs

JavaScript scripts can work with external APIs:

```javascript
const https = require('https');

async function fetchFromAPI(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`Request failed, status: ${res.statusCode}`));
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

result = getJoke();
```

### Persistent Data Storage

Scripts can use the filesystem to store and retrieve data:

```javascript
const fs = require('fs');
const path = require('path');
const os = require('os');

// Data file path (relative to the user's home directory)
const dataFile = path.join(os.homedir(), 'script-data.json');

// Read existing data, or create new data if none exists
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

result = `This script has run ${data.counter} times. Last run: ${data.lastRun}`;
```

### Inter-Script Communication

Scripts can communicate with each other using temporary files:

```javascript
const fs = require('fs');
const path = require('path');
const os = require('os');

// Shared data file path (relative to the system temporary directory)
const sharedFile = path.join(os.tmpdir(), 'script-shared-data.json');

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

// Usage example: toggle state between scripts
const data = getSharedData() || { state: 'off' };
data.state = data.state === 'on' ? 'off' : 'on';
setSharedData(data);

result = `Toggled shared state to: ${data.state}`;
```

## Security Considerations

When working with custom scripts, consider the following security guidelines:

1. **Do not run scripts from untrusted sources** (without reviewing them)
2. **Do not run system commands with unsanitized input**
3. **Do not store sensitive information** (passwords, API keys) in plaintext scripts
4. **Be careful with file operations** to avoid unintended data loss
5. **Consider the security implications of scripts that make network requests**
6. **Understand that scripts run with the user's privileges** and can access files
7. **Use secure API endpoints** (HTTPS over HTTP)
8. **Validate and sanitize all external data** before processing it
9. **Remember that JavaScript scripts can access Node.js APIs** and related capabilities
10. **Review scripts regularly as the environment changes** for potential security issues
