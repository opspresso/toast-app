# Testing

Use the Node version in `.nvmrc` and install the committed dependency graph with `npm ci`.
Run checks from the repository root:

```bash
npm run lint
npm test -- --runInBand
# Focused behavior checks:
npm test -- --runInBand tests/unit/cloud-sync.test.js tests/unit/renderer/settings-updates.test.js
```

`jest.config.js` discovers `tests/**/*.test.js` in the Node environment. It maps Electron
to `tests/mocks/electron.js`; some tests provide narrower mocks. Renderer tests use explicit
DOM/VM fixtures rather than a configured browser runner. `npm test` writes text, lcov, and
clover coverage to `coverage/`. Coverage excludes renderer page modules; report their behavior
separately rather than interpreting the coverage percentage as whole-app coverage.

The repository guidance targets 80% coverage on core functionality. Jest does not configure
a numeric coverage gate. CI `test.yml` runs lint and Jest on Ubuntu with Node 22 and 24 for
pushes and pull requests to `main`. No nightly performance or browser E2E workflow is configured.

## Regression cases

For changes to cloud sync, verify:

- First login downloads existing buttons and Snippets before any upload; a failed GET never
  becomes an empty-account upload.
- A successful empty-account read permits initial upload; empty arrays preserve deletion.
- Periodic checks and edit debounce run once, with no concurrent writes.
- Independent edits merge against the acknowledged baseline; conflicting edits retain drafts.
- A stale revision re-reads and merges; transport failures preserve local changes.
- Logout, disable, and account changes cancel pending work and isolate account recovery data.
- A rejected access token refreshes once; rotated tokens are persisted together.
- Invalid downloads and local files preserve the original data and report errors.
- Downloaded native actions require local approval; appearance/native preferences are applied.

Test observable outcomes, not a copied implementation. Use fake timers for interval/debounce
logic and controllable promises for in-flight races. Use temporary directories for persistence
checks. Do not weaken failure expectations or skip a platform path merely to get a green run.
Gate interpreter tests by actual host support and report that limit.

## Native verification

Unit tests do not prove protocol registration, native permissions, window behavior, or real
DynamoDB condition/transaction semantics. For a sync change, use an isolated Electron user-data
directory and a local web/DynamoDB fixture. Prevent the fixture from sending external messages
or changing login items, global shortcuts, or the user's installed protocol handler.

Exercise login → initial download → local edit/upload → remote edit/download → conflict →
logout. Inspect the rendered windows and errors. Verify shortcut restoration, modal focus,
Snippets permissions, and native launch behavior when those paths change. Repeat platform
specific checks on the affected OS; a macOS run does not validate Windows/Linux.

For performance, compare the same input and environment against a baseline. Report request
counts separately from latency; mocked I/O timings do not establish production speed.

## Build checks

`npm run build:mac` and `npm run build:win` build without publishing. Native packages may require
platform dependencies or signing credentials. Inspect the actual package and signature; an
ad-hoc local signature does not establish notarization. Release verification additionally needs
the exact workflow and published artifacts. Do not trigger a release as part of a unit-test run.
