# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Project Code Guidelines

**Important: Before writing new code, search for similar existing code and maintain consistent logic and style patterns. Always refer to the main development documentation and documents in the `docs/` directory.**

## Build & Test Commands

- **Start**: `npm start` (production) or `npm run dev` (development)
- **Build**: `npm run build` (all platforms), `npm run build:mac`, `npm run build:win`, `npm run build:mas` (App Store)
- **Test**: `npm test` (all tests), `npx jest path/to/file.test.js` (single test)
- **Lint & Format**: `npm run lint` (ESLint), `npm run format` (Prettier)

## Code Style

- **Formatting**: 2-space indent, single quotes, semicolons, 160 char line limit
- **JavaScript**: Use const/let (no var), object shorthand, strict equality (===)
- **Imports**: Use CommonJS style (require/module.exports)
- **Error Handling**: Try/catch with specific error types, log errors appropriately
- **Naming**: Clear, descriptive names; camelCase for variables/functions, PascalCase for classes
- **Electron**: Follow proper main/renderer process separation, use IPC for communication

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