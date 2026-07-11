# Toast App Button Action Types

This document describes all button action types supported by the Toast app.

For details on the button configuration schema, see [Configuration Schema](../config/schema.md).

## Button Shortcut Rules

**Important**: The shortcut for every button is automatically assigned in the order **qwertasdfgzxcvb** based on its position within the page.

- **First row**: Q, W, E, R, T (5 keys)
- **Second row**: A, S, D, F, G (5 keys)
- **Third row**: Z, X, C, V, B (5 keys)
- Supports up to **15 buttons** total

When a button's position changes, its shortcut is automatically reassigned according to the new order. Users cannot edit shortcuts directly; they are managed automatically by the system.

## Action Type Overview

The Toast app supports the following 5 button action types:

1. **application** - Launch an application
2. **exec** - Run a shell command
3. **open** - Open a URL, file, or folder
4. **script** - Run scripts in various languages
5. **chain** - Run multiple actions sequentially

At the top of each button card in the Toast window, a line in a color unique to the action type is displayed, so you can tell at a glance what type of action the button performs.

Detailed descriptions of each action type are provided below.

## 1. application (Launch Application)

### Description
An action that launches the application at the specified path.

### Properties
| Property | Type | Required | Description |
|------|------|------|------|
| `applicationPath` | string | Yes | Path of the application to launch |
| `applicationParameters` | string | No | Command-line parameters to pass to the application. Arguments starting with `~` or `~/` are expanded to the home directory |

### Example
```json
{
  "name": "Photoshop",
  "shortcut": "Q",
  "icon": "🎨",
  "action": "application",
  "applicationPath": "/Applications/Adobe Photoshop 2023/Adobe Photoshop 2023.app",
  "applicationParameters": "--new-document"
}
```

### Platform-Specific Implementation
- **macOS**: Uses the `open` command
- **Windows**: Runs the application path directly
- **Linux**: Uses the `xdg-open` command when there are no parameters; runs the path directly when parameters are present

## 2. exec (Run Command)

### Description
An action that runs a shell command.

### Properties
| Property | Type | Required | Description |
|------|------|------|------|
| `command` | string | Yes | Shell command to run |
| `workingDir` | string | No | Working directory in which to run the command |
| `runInTerminal` | boolean | No | Whether to open a terminal window to run the command (default: false) |

### Example
```json
{
  "name": "Git Status",
  "shortcut": "Q",
  "icon": "📊",
  "action": "exec",
  "command": "git status",
  "workingDir": "~/projects/my-repo",
  "runInTerminal": true
}
```

### Platform-Specific Differences
- **macOS**: Runs the command using Terminal.app (via osascript)
- **Windows**: Runs the command using cmd.exe
- **Linux**: Runs using the `x-terminal-emulator` command

## 3. open (Open File/URL)

### Description
An action that opens a URL, file, or folder.

### Properties
| Property | Type | Required | Description |
|------|------|------|------|
| `url` | string | Either url or path | URL to open |
| `path` | string | Either url or path | Path of the file or folder to open |
| `application` | string | No | Application to use when opening the file |

### Example
```json
{
  "name": "Documentation",
  "shortcut": "Q",
  "icon": "📚",
  "action": "open",
  "url": "https://docs.example.com"
}
```

```json
{
  "name": "Open Project",
  "shortcut": "W",
  "icon": "📁",
  "action": "open",
  "path": "~/projects/my-project",
  "application": "Visual Studio Code"
}
```

### Notes
- If a URL has no protocol scheme (a `<scheme>://` form such as `http://`, `https://`, `ftp://`), `http://` is added automatically. Schemes without `//`, such as `mailto:`, are not recognized.
- `file://` URLs are not allowed. When opening a local file or folder, use the `path` property instead of `url`.
- You can open a file with the default application or with a specified application.

## 4. script (Run Script)

### Description
An action that runs a custom script written in one of several languages.

### Properties
| Property | Type | Required | Description |
|------|------|------|------|
| `script` | string | Yes | Script content |
| `scriptType` | string | Yes | Script language (javascript, applescript, powershell, bash). The `special` type used by the default Confetti button is a client-only value handled only in the renderer; the main-process script executor does not support it |
| `scriptParams` | object | No | Parameters to pass to the script (applies to JavaScript only) |

### Example
```json
{
  "name": "Hello World Script",
  "shortcut": "Q",
  "icon": "👋",
  "action": "script",
  "script": "console.log('Hello, World!'); result = { message: 'Hello from JavaScript!' };",
  "scriptType": "javascript"
}
```

```json
{
  "name": "System Information",
  "shortcut": "W",
  "icon": "💻",
  "action": "script",
  "script": "Get-ComputerInfo | Format-List",
  "scriptType": "powershell"
}
```

### Platform Restrictions
- **JavaScript**: Supported on all platforms
- **AppleScript**: Supported on macOS only
- **PowerShell**: Supported on Windows only
- **Bash**: Supported on macOS and Linux only

### Security Considerations
- JavaScript scripts run in a `vm.runInContext` context, but the sandbox exposes `require` (all built-in modules), `Buffer`, and more, allowing access to the file system, network, and external processes. Only a non-sensitive allowlist of environment variables (`HOME`, `PATH`, `LANG`, etc.) is passed. This is not a system-level sandbox, so run only trusted scripts.
- `exec`/`script` actions newly downloaded via cloud sync go through a user confirmation dialog before their first run on this device.
- External scripts are written to a temporary file and then run; the temporary file is deleted after execution.

## 5. chain (Chained Execution)

### Description
A composite action that runs multiple actions sequentially.

### Properties
| Property | Type | Required | Description |
|------|------|------|------|
| `actions` | array | Yes | Array of actions to run sequentially |
| `stopOnError` | boolean | No | Whether to stop execution when an error occurs (default: true) |

### Example
```json
{
  "name": "Development Setup",
  "shortcut": "Q",
  "icon": "🔗",
  "action": "chain",
  "actions": [
    {
      "action": "exec",
      "command": "cd ~/projects/my-app && git pull"
    },
    {
      "action": "exec",
      "command": "cd ~/projects/my-app && npm install",
      "runInTerminal": true
    },
    {
      "action": "open",
      "path": "~/projects/my-app",
      "application": "Visual Studio Code"
    }
  ],
  "stopOnError": true
}
```

### Notes
- Each action runs after the previous action completes.
- If `stopOnError` is `true`, the chain stops if any action fails.
- All action types (application, exec, open, script, chain) can be included in a chain. You can nest a chain within a chain, but the nesting depth is limited to a maximum of 10 levels.


## Action Execution Flow

All actions are centrally managed through the `executeAction` function defined in `src/main/executor.js`. This function performs the following:

1. Checks the action type and validates it
2. Calls the execution function appropriate for that action type
3. Returns the execution result

Additionally, the `validateAction` function lets you validate an action configuration in advance.

## Action Error Handling

Every action execution function returns a result object in the following format:

```javascript
{
  success: true|false,     // Whether the action succeeded
  message: "Result message", // Status description message
  // Additional action-type-specific information
}
```

When an error occurs, a result object in the following format is returned:

```javascript
{
  success: false,
  message: "Error message",
  error: errorObject      // Original error object
}
```

## Extending Actions

To add a new action type:

1. Create a new action handler module in the `src/main/actions/` directory
2. Add handling for the new action type in the `executeAction` function of `src/main/executor.js`
3. Update the `validateAction` function to validate the action
