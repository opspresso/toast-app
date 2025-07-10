# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Toast App is an Electron-based desktop application that provides a customizable shortcut launcher for macOS and Windows. It features a popup interface triggered by global shortcuts, system tray integration, and cloud synchronization capabilities.

## Build & Test Commands

- **Start**: `npm start` (production) or `npm run dev` (development)
- **Build**: `npm run build` (all platforms), `npm run build:mac`, `npm run build:win`, `npm run build:mas` (App Store)
- **Test**: `npm test` (all tests), `npx jest path/to/file.test.js` (single test)
- **Lint & Format**: `npm run lint` (ESLint), `npm run format` (Prettier)

## High-Level Architecture

### Process Structure
- **Main Process** (`src/main/`): Handles application lifecycle, window management, system integration, and IPC communication
  - `actions/`: Modular action handlers (exec, open, script, chain, application)
  - `api/`: Cloud sync and authentication client
  - `config/`: Configuration management with electron-store
  - `executor.js`: Central action execution dispatcher
  - `window.js`: Window lifecycle management

- **Renderer Process** (`src/renderer/`): UI implementation
  - `pages/toast/`: Main popup interface
  - `pages/settings/`: Multi-tab settings interface
  - `preload/`: Secure IPC bridges for each page

- **Shared Resources** (`src/renderer/images/`): Flat color icons library

### Key Architectural Patterns
1. **IPC Communication**: All cross-process communication uses structured IPC handlers defined in `src/main/ipc/`
2. **Action System**: Extensible action framework supporting exec, open, script, chain, and application types
3. **Configuration Layers**: Environment variables → Default config → User preferences
4. **Window Management**: Separate window instances for toast popup and settings, with proper lifecycle handling

## Code Style

- **Formatting**: 2-space indent, single quotes, semicolons, 160 char line limit
- **JavaScript**: Use const/let (no var), object shorthand, strict equality (===)
- **Imports**: Use CommonJS style (require/module.exports)
- **Error Handling**: Try/catch with specific error types, log errors appropriately
- **Naming**: Clear, descriptive names; camelCase for variables/functions, PascalCase for classes
- **Electron**: Follow proper main/renderer process separation, use IPC for communication

## Development Workflows

### Adding New Action Types
1. Create new action file in `src/main/actions/`
2. Implement `validate()` and `execute()` methods
3. Register action in `src/main/executor.js`
4. Add documentation in `docs/features.md`

### Adding New Settings
1. Update default config schema in `src/main/config.js`
2. Add UI components in `src/renderer/pages/settings/`
3. Create IPC handlers if needed in `src/main/ipc/`
4. Update relevant documentation

### Debugging
- **Main Process**: Use VS Code debugger or check logs via electron-log
- **Renderer Process**: Open DevTools with Ctrl+Shift+I (Cmd+Option+I on Mac)
- **Log Locations**: 
  - macOS: `~/Library/Logs/Toast/`
  - Windows: `%USERPROFILE%\AppData\Roaming\Toast\logs\`

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

- Write automated tests for important logic and user flows.
- Include unit tests for core functions, integration tests for data flow, and E2E tests for key scenarios.
- Keep tests fast, isolated, and reliable.
- Use Jest's describe/test structure with descriptive test names.
- Mock Electron APIs using `tests/mocks/electron.js`

## Platform-Specific Considerations

- **macOS**: Auto-update requires both DMG and ZIP builds, local app icon extraction supported
- **Windows**: NSIS installer for standard distribution, portable EXE option available
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