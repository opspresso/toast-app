# Repository Guidelines

## Project Structure & Module Organization

Toast is an Electron desktop application. `src/index.js` is the entry point. Main-process logic lives in `src/main/`, grouped into areas such as `ipc/`, `api/`, `actions/`, and `cloud-sync/`. Renderer pages are under `src/renderer/pages/`, with secure bridges in `src/renderer/preload/`. Unit tests mirror source areas under `tests/unit/`; shared setup and Electron mocks live in `tests/setup.js` and `tests/mocks/`. Keep icons and store metadata in `assets/`, documentation in `docs/`, and generated installers in `dist/`.

## Build, Test, and Development Commands

- `npm install`: install dependencies (Node.js 20.18+, npm 10+).
- `npm run dev`: start Electron with `NODE_ENV=development` on macOS/Linux; use `npm run dev:win` on Windows.
- `npm start`: launch the application normally.
- `npm test`: run Jest tests and generate coverage reports in `coverage/`.
- `npm run lint`: check JavaScript under `src/` with ESLint.
- `npm run format`: format supported source files with Prettier.
- `npm run build`: create artifacts without publishing; use `build:mac`, `build:win`, or `build:mas` for a target.

## Coding Style & Naming Conventions

Use CommonJS JavaScript with 2-space indentation, LF endings, single quotes, semicolons, and trailing commas for multiline structures. Prettier enforces a 160-character print width; ESLint requires strict equality, braces, `const` where possible, and no `var`. Match kebab-case filenames such as `action-approval.js`, camelCase variables/functions, and PascalCase classes. The main process owns authoritative state; renderers must request access through narrow preload and IPC APIs.

## Testing Guidelines

Jest discovers `tests/**/*.test.js`; mirror source paths (for example, `src/main/ipc/cloud-sync.js` maps to `tests/unit/ipc/cloud-sync.test.js`). Cover success and failure paths and mock Electron or external services through shared mocks. Aim for at least 80% coverage on core functionality and complete coverage of critical paths. Run a focused test with `npx jest tests/unit/config.test.js` or watch changes with `npx jest --watch`.

## Security & Configuration

Put OAuth/API settings in `src/main/config/.env`; never commit `CLIENT_ID`, `CLIENT_SECRET`, tokens, or user data. Validate IPC and action inputs, especially `exec` and `script` actions. Keep heavy work out of the popup render path, and update `docs/` when behavior or configuration changes.

## Commit & Pull Request Guidelines

Follow Conventional Commits used in project history: `feat:`, `fix:`, `test:`, `docs:`, or `chore:`; an optional scope is welcome, as in `fix(shortcut): resolve hotkey conflict`. Keep commits focused. Pull requests should explain what changed and why, link relevant issues, include tests, and update affected documentation. Confirm tests and lint pass; add screenshots for visible UI changes and note platform-specific behavior.
