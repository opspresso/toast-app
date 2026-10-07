# Custom Scripts

Create a script button in the Toast popup: enter edit mode with `,`, select a slot, choose
**Run Script**, select a script type, enter the code, and save. Leave edit mode to run it.
Shortcuts follow button position and are not independently editable.

## Supported Script Types

| Type | Runtime | Supported host |
|---|---|---|
| `javascript` | Node `vm` context in Electron main | All app platforms |
| `applescript` | `osascript` | macOS |
| `powershell` | `powershell -ExecutionPolicy Bypass -File` | Windows |
| `bash` | `bash --` | macOS/Linux |

The required interpreter must be on PATH. Bash scripts use Bash, not the default login shell.
Built-in Confetti is a separate renderer effect, not arbitrary custom script execution.

### JavaScript

Use `result` for the returned value and `params` for the button's JSON script parameters.
Assign a Promise to `result` to await asynchronous work. Top-level `return` is invalid.

```javascript
const os = require('os');
result = `Platform: ${process.platform}; CPUs: ${os.cpus().length}`;
```

A simple asynchronous example:

```javascript
result = Promise.resolve(`Hello, ${params.name || 'Toast'}`);
```

### AppleScript (macOS Only)

```applescript
set currentVolume to output volume of (get volume settings)
return "Current volume: " & currentVolume & "%"
```

Automation of other apps can require macOS permission. A denied permission is an error;
review it in System Settings rather than repeatedly running the same script.

### PowerShell (Windows Only)

```powershell
"PowerShell version: $($PSVersionTable.PSVersion)"
```

This action uses `-ExecutionPolicy Bypass` for its script invocation. It does not elevate
privileges; operations requiring administrator rights still fail under a normal account.

### Bash/Shell

```bash
printf 'Bash version: %s\n' "$BASH_VERSION"
uname -s
```

Scripts inherit Toast's working directory. To work in a project, change directory explicitly
and handle failure, or use an **Execute Command** action with its working-directory field.

## Script Execution Environment

JavaScript receives `require`, `Buffer`, console/timer functions, `params`, and a restricted
`process` object. Its `process.env` includes only `HOME`, `USER`, `USERPROFILE`, `PATH`, `LANG`,
`SHELL`, `TMPDIR`, `TEMP`, and `TMP`. External interpreters receive the same allowlisted environment.
Do not assume arbitrary environment variables are available.

External scripts use unique temporary directories and files with owner-only permissions.
Main invokes the interpreter through `execFile` and attempts cleanup on success and failure.
Cleanup failure is reported separately in the result. Concurrent scripts do not share filenames.

JavaScript success returns the assigned result; an unset result produces a success message.
External script results include stdout/stderr. A nonzero exit or execution exception reports
failure. Stderr alone does not necessarily mean the process failed. The launcher shows its
status message; disable **Hide after action** while diagnosing a button.

## Security Model

These scripts run with Toast's user privileges. The JavaScript `vm` context exposes `require`
and is not a security sandbox: scripts can access files, networks, child processes, and broader
Node capabilities. Environment filtering does not isolate untrusted JavaScript. No execution
time or memory budget is imposed. Long-running synchronous code can block the main process.

Do not embed credentials in scripts: their source is stored in plaintext configuration and
can be synchronized or exported. Use only reviewed code and validate external inputs.
Downloaded executable actions require local approval before their first execution. See
[security](../architecture/security.md) and [Cloud Sync](cloud-sync.md#download-validation-and-action-approval).

## Troubleshooting

| Symptom | Check |
|---|---|
| Interpreter not found | Host support and PATH |
| Syntax failure | Selected language and returned error |
| Permission failure | File access or OS automation permission |
| Unexpected working directory | Explicit directory selection |
| Missing JavaScript result | Assign `result`; use a Promise for async work |
| No response | Infinite loops, synchronous work, or a process awaiting interaction |

Keep failures visible. Do not replace corrupt persisted data with defaults or overwrite it
inside a catch block. Script-managed persistence and external API contracts are the script
author's responsibility; Toast does not provide a shared database or network retry layer.
