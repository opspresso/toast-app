# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Toast App is an Electron-based desktop application that provides a customizable shortcut launcher for macOS and Windows. It features a popup interface triggered by global shortcuts, system tray integration, and cloud synchronization capabilities.

## Build & Test Commands

### Development
- **Start Dev**: `npm run dev` (development mode with NODE_ENV=development)
- **Start Dev (Windows)**: `npm run dev:win` (Windows-specific NODE_ENV setting)
- **Start Production**: `npm start` (production mode)

### Building
- **All Platforms**: `npm run build` (creates macOS, Windows, Linux builds)
- **macOS**: `npm run build:mac` (creates DMG and ZIP)
- **Windows**: `npm run build:win` (creates NSIS installer and portable EXE)
- **Mac App Store**: `npm run build:mas` (MAS distribution)

### Testing & Quality
- **Run Tests**: `npm run test` (Jest with coverage - currently 2 unit tests)
- **Lint**: `npm run lint` (ESLint check)
- **Format**: `npm run format` (Prettier formatting)

### Build Details
- **Output Directory**: `dist/`
- **Code Signing**: macOS (entitlements + notarization), Windows (NSIS)
- **Auto-Update**: GitHub releases via electron-updater
- **Linux Support**: AppImage and .deb packages (experimental)

## High-Level Architecture

### Process Structure
- **Main Process** (`src/main/`): Handles application lifecycle, window management, system integration
  - `actions/`: 5 action handlers (application, chain, exec, open, script)
  - `api/`: Cloud sync API client (auth.js, client.js, sync.js)
  - `config/`: Configuration with electron-store schema validation
  - `executor.js`: Central action dispatcher with validation
  - `windows.js`: Toast/Settings window lifecycle management
  - `auth-manager.js`: Authentication state synchronization
  - `cloud-sync.js`: Automatic cloud synchronization (15min intervals)
  - `shortcuts.js`: Global hotkey registration
  - `tray.js`: System tray integration
  - `updater.js`: Auto-update functionality

- **Renderer Process** (`src/renderer/`): Modular UI implementation
  - `pages/toast/`: Main popup with ES6 modules
  - `pages/settings/`: 6-tab settings interface (General, Appearance, Account, Advanced, Cloud Sync, About)
  - `preload/`: Secure IPC bridges (toast.js, settings.js)
  - `assets/flat-color-icons/`: 200+ SVG icons library

### Key Architectural Patterns
1. **IPC Communication**: Structured handlers in `src/main/ipc.js` with secure preload scripts
2. **Action System**: 5 types (application, exec, open, script, chain) with validation pipeline
3. **Configuration**: electron-store with JSON schema validation and migration support
4. **Authentication**: OAuth 2.0 with automatic token refresh and profile management
5. **Cloud Sync**: Real-time sync with debouncing (2s) and conflict resolution
6. **Subscription Tiers**: Anonymous (1 page), Authenticated (3 pages), Premium (9 pages)

## Code Style

- **Formatting**: 2-space indent, single quotes, semicolons, 160 char line limit
- **JavaScript**: Use const/let (no var), object shorthand, strict equality (===)
- **Imports**: Use CommonJS style (require/module.exports)
- **Error Handling**: Try/catch with specific error types, log errors appropriately
- **Naming**: Clear, descriptive names; camelCase for variables/functions, PascalCase for classes
- **Electron**: Follow proper main/renderer process separation, use IPC for communication

## Development Workflows

### Adding New Action Types
1. Create new action file in `src/main/actions/` (e.g., `my-action.js`)
2. Implement `async execute(action)` function returning `{success, message, ...}`
3. Add validation case in `executor.js` `validateAction()` function
4. Register action type in `executor.js` switch statement
5. Update `docs/BUTTON_ACTIONS.md` with new action documentation
6. Add unit tests in `tests/unit/`

### Adding New Settings
1. Update schema in `src/main/config.js` with type validation
2. Add settings module in `src/renderer/pages/settings/modules/`
3. Update settings UI in `src/renderer/pages/settings/index.html`
4. Add IPC handlers in `src/main/ipc.js` if needed
5. Update `docs/CONFIG_SCHEMA.md` and `docs/SETTINGS.md`

### Testing & Quality Assurance
- **Unit Tests**: Currently 2 tests (config, app-icon-extractor)
- **Manual Testing**: Use dev mode with `npm run dev`
- **Coverage**: Run `npm run test` to generate coverage report
- **Linting**: `npm run lint` to check code style
- **Build Testing**: Test all platforms before release

### Debugging
- **Main Process**: electron-log outputs to files + console
- **Renderer Process**: DevTools (Ctrl+Shift+I / Cmd+Option+I)
- **Log Locations**:
  - macOS: `~/Library/Logs/Toast/main.log`
  - Windows: `%USERPROFILE%\AppData\Roaming\Toast\logs\main.log`
- **Debug Mode**: Set NODE_ENV=development for verbose logging

## Core Principles

- **Solve the right problem**: Avoid unnecessary complexity or scope creep.
- **Favor standard solutions**: Use well-known libraries and documented patterns before writing custom code.
- **Keep code clean and readable**: Use clear naming, logical structure, and avoid deeply nested logic. 명확한 이름짓기, 논리적인 구조, 깊은 중첩 피하기 등을 통해 사람이 이해하기 쉬운 코드를 작성합니다.
- **Ensure consistent style**: Apply formatters (e.g. Prettier) and linters (e.g. ESLint) across the codebase.
- **Handle errors thoughtfully**: Consider edge cases and fail gracefully.
- **Comment with intent**: Use comments to clarify non-obvious logic. Prefer expressive code over excessive comments.
- **Design for change**: Structure code to be modular and adaptable to future changes. 변경 가능성이 높은 부분을 격리하기 위해 모듈식 컴포넌트를 구축하고 추상화를 사용합니다.
- **Maintain file size limits**: Keep files under 500 lines to improve readability and maintainability.

## SOLID Principles

- **Single Responsibility Principle (SRP)**: Each class or module should have only one reason to change.
- **Open/Closed Principle (OCP)**: Software entities should be open for extension but closed for modification.
- **Liskov Substitution Principle (LSP)**: Objects of a superclass should be replaceable with objects of its subclasses.
- **Interface Segregation Principle (ISP)**: Clients should not be forced to depend on interfaces they do not use.
- **Dependency Inversion Principle (DIP)**: High-level modules should not depend on low-level modules. Both should depend on abstractions.

## Testing Strategy

### Current Test Status
- **Framework**: Jest with coverage reporting
- **Mock System**: Electron APIs mocked via `tests/mocks/electron.js`
- **Coverage**: Enabled by default, reports in `coverage/` directory
- **Current Tests**: 2 unit tests
  - `tests/unit/config.test.js` - Configuration store testing
  - `tests/unit/app-icon-extractor.test.js` - Icon extraction utility

### Test Structure
```
tests/
├── mocks/
│   └── electron.js        # Electron API mocks
├── setup.js               # Jest setup configuration
├── unit/                  # Unit tests (current: 2 tests)
├── integration/           # Integration tests (empty)
└── e2e/                   # End-to-end tests (empty)
```

### Testing Guidelines
- Use Jest's `describe/test` structure with descriptive names
- Mock Electron APIs to avoid native dependencies
- Keep tests fast, isolated, and deterministic
- Focus on core business logic and action execution
- **Priority areas for testing**: Action validation, configuration management, API clients

## Platform-Specific Considerations

- **macOS**: Auto-update requires both DMG and ZIP builds, local app icon extraction supported
- **Windows**: NSIS installer for standard distribution, portable EXE option available
- **Linux**: AppImage and deb builds available (experimental support)
- **Code Signing**: Required for distribution, configured in electron-builder
- **Permissions**: macOS requires accessibility permissions for global shortcuts

## Important Notes

- **Security**: Always validate user inputs, especially for script execution actions
- **Performance**: Toast popup should appear instantly; defer heavy operations
- **State Management**: Main process holds authoritative state, renderer processes request via IPC
- **Documentation**: All feature changes must update corresponding docs in `docs/` directory

## Cloud Sync Troubleshooting

### Subscription Data Structure
When storing subscription data in ConfigStore, ensure consistency:
- Store `active` and `isSubscribed` fields for subscription status
- Store cloud sync feature in both `features.cloud_sync` and `additionalFeatures.cloudSync`
- Premium/Pro/VIP plans automatically include cloud sync feature

### Common Issues
1. **Cloud sync not enabling**: Check if subscription data is properly stored in ConfigStore
2. **API authentication**: Verify CLIENT_ID and CLIENT_SECRET in environment variables
3. **Token expiration**: Default is 30 days, can be set to unlimited with TOKEN_EXPIRES_IN=0

## Environment Configuration

### Environment Variables
- Create `.env` file in `src/main/config/` for local configuration
- Key variables:
  - `CLIENT_ID`, `CLIENT_SECRET`: OAuth authentication
  - `TOAST_URL`: API endpoint (default: https://app.toast.sh)
  - `TOKEN_EXPIRES_IN`: Token expiration in seconds (default: 2592000)
  - `NODE_ENV`: Set to 'development' for dev mode
