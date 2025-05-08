# Project Code Guidelines

**Important: Before writing new code, search for similar existing code and maintain consistent logic and style patterns. Always refer to the main development documentation and documents in the `docs/` directory.**

## Core Principles

- **Solve the right problem**: Avoid unnecessary complexity or scope creep.
- **Favor standard solutions**: Use well-known libraries and documented patterns before writing custom code.
- **Keep code clean and readable**: Use clear naming, logical structure, and avoid deeply nested logic.
- **Ensure consistent style**: Apply formatters (e.g. Prettier, Black) and linters (e.g. ESLint, Flake8) across the codebase.
- **Handle errors thoughtfully**: Consider edge cases and fail gracefully.
- **Comment with intent**: Use comments to clarify non-obvious logic. Prefer expressive code over excessive comments.
- **Design for change**: Structure code to be modular and adaptable to future changes.
- **Keep dependencies shallow**: Minimize tight coupling between modules. Maintain clear boundaries.
- **Fail fast and visibly**: Surface errors early with meaningful messages or logs.
- **Automate where practical**: Use automation for formatting, testing, and deployment to reduce manual effort and error.
- **Maintain file size limits**: Keep files under 500 lines to improve readability, maintainability, and collaboration.

## File Size Guidelines

- **Maximum file length**: Limit all source code files to under 500 lines.
- **Split large components**: Break down large components into smaller, reusable pieces.
- **Organize by responsibility**: Separate files by logical function or domain.
- **Extract utilities**: Move reusable helper functions to dedicated utility files.
- **Use composition**: Compose functionality through smaller, focused modules rather than large monolithic files.
- **Refactor when approaching limits**: Consider refactoring when files approach 400+ lines.

## Documentation Standards

- Keep all documentation up to date and version-controlled.
- Always check the existing documentation in the `docs/` directory for reference before creating new content.
- New team members should thoroughly review all documentation in the `docs/` directory as part of onboarding.
- Each document should serve a clear purpose:

### `README.md`
- Project overview and purpose
- Setup and installation steps
- Usage instructions or examples

### `ARCHITECTURE.md`
- High-level system design
- Major components and their responsibilities
- Data flow and integration points

### `DATABASE.md`
- Database schema and relationships
- Key entities and fields
- Indexing or optimization notes (if applicable)

### `PAGES.md`
- Page layout and navigation structure
- Key components per page
- User interactions and rendering logic

### `SCENARIOS.md`
- Representative user journeys
- System behavior under different conditions (e.g. error states, edge cases)

## Testing Strategy

- Write automated tests for important logic and user flows.
- Include unit tests for core functions, integration tests for data flow, and E2E tests for key scenarios.
- Keep tests fast, isolated, and reliable.
- Run tests continuously in CI.
