# Development Setup

## Development Environment Setup

Use Node.js 24 from `.nvmrc` and npm 10 or later. The package supports Node 22.12+ and CI
checks Node 22/24. Electron bundles its own Node runtime; the build-time Node version does
not change it. Keep application code compatible with the bundled runtime.

```bash
git clone https://github.com/opspresso/toast-app.git
cd toast-app
nvm install
nvm use
npm ci
npm run dev
```

On Windows use `npm run dev:win`. Development opens DevTools but does not watch/reload files;
restart Electron after edits. Native dependencies such as `uiohook-napi` must match Electron
and the target architecture. Investigate installation failures before changing locked versions.

For authentication, create an ignored `src/main/config/.env.local` with test OAuth credentials
and the matching `TOAST_URL`. Set `CONFIG_SUFFIX=dev` to isolate config, token, and OAuth state.
See [environment variables](../config/environment.md) and [integration](integration.md).

## Project Structure

| Path | Purpose |
|---|---|
| `src/index.js` | Electron lifecycle and initialization |
| `src/main/` | Config, auth, sync, native preferences, windows, and tray |
| `src/main/actions/` | Native action implementations |
| `src/main/api/` | Server transport |
| `src/main/cloud-sync/merge.js` | Baseline-based merge |
| `src/main/ipc/` | Domain-specific IPC handlers |
| `src/main/text-expander/` | Keyword matcher and native keyboard hook |
| `src/renderer/pages/toast/` | Launcher and button editor |
| `src/renderer/pages/settings/` | Preferences, account, Snippets, and About |
| `src/renderer/preload/` | Context bridges |
| `tests/unit/`, `tests/mocks/` | Jest behavior tests and Electron fixtures |
| `assets/`, `docs/` | Packaged assets and documentation |

See [architecture](../architecture/overview.md) for ownership and data flow.

## Build Process

```bash
npm run build       # Current platform, without publishing
npm run build:mac   # DMG/ZIP
npm run build:win   # NSIS/portable
npm run build:mas   # Separate MAS entitlement configuration
```

Artifacts are written to `dist/`. Platform tooling and signing credentials can be required.
Verify an actual artifact before claiming signing/notarization or native compatibility.
The release workflow publishes on tags or manual dispatch; local build commands use
`--publish never`. Do not trigger release workflows for ordinary verification.

## Development Workflow

1. Preserve existing work and create a focused feature/fix branch from the intended base.
2. Read the relevant implementation, callers, tests, and contract before changing it.
3. Run `npm run lint` and `npm test -- --runInBand`; see [testing](testing.md).
4. Inspect the diff and commit only the intended files with a Conventional Commit message.
5. Describe the behavior change, evidence, and platform limits in the pull request.

`npm run format` applies Prettier to source files. Re-run lint afterward: the current ESLint
brace convention is Stroustrup and can disagree with Prettier output. Do not include unrelated
formatting churn in a functional change.

## Logging System

`src/main/logger.js` wraps `electron-log`. Use `createLogger(namespace)` in main and
`window.toast.log` / `window.settings.log` in renderers. Logs are under the Electron user data
directory at `logs/toast-app.log`, with a 5 MB file limit and the library's rotation behavior.
Do not log tokens, OAuth callback values, snippet content, or complete private configuration.

## Auto-Update

`package.json` defines package/publish targets; `src/main/updater.js` owns runtime behavior.
Settings receives DOM CustomEvents such as `update-available` and `download-progress`, with
data in `event.detail`. Check explicit result success before downloading or installing.
See [auto-update](../features/auto-update.md) and [Renderer API](../api/renderer.md).

## Debugging

Use the development DevTools for renderer state and network errors. Use a main-process
debugger or module logs for native calls. Reproduce sync problems with isolated user data
and a local server fixture so production settings, tokens, shortcuts, and login items stay safe.
A mock-only Jest result does not prove native Electron behavior.

## Coding Guidelines

Use CommonJS in main and ES modules in renderer pages. Prefer narrow IPC methods, validated
inputs, explicit failure results, and asynchronous native work. `action.action` selects the
handler; action parameters remain named fields on the same object.

## Common Development Tasks

For a new setting, update schema, UI, IPC validation, native preference handling if relevant,
and sync validation in both repositories when the setting is synchronized. For an action,
update validation and execution together, including nested chains and remote approval rules.
Preserve edit baselines and authentication-session guards when extending async UI flows.
