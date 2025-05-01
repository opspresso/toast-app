# Project Documentation Structure

This document outlines the structure and purpose of documentation in the Toast App project.

## Documentation Standards

All documentation should be kept up to date and version-controlled. Each document should serve a clear purpose.
When adding new documents, place them under the docs/ directory.

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

## Documentation in docs/ Directory

The `docs/` directory contains more detailed documentation:

| Document | Description | Target Users |
|----------|-------------|--------------|
| `docs/API_DOCUMENTATION.md` | Internal APIs and extension points | Developers |
| `docs/AUTO_UPDATE.md` | Automatic update system and user experience | Developers & End Users |
| `docs/BACKUP_RESTORE.md` | Configuration backup and restore process | End Users & Support |
| `docs/BUTTON_ACTIONS.md` | Supported button action types | Developers & Power Users |
| `docs/CLOUD_SYNC.md` | Cloud synchronization implementation and user guide | Developers & End Users |
| `docs/CONFIG_SCHEMA.md` | Configuration options and schema reference | Developers & Power Users |
| `docs/DATA_STORAGE.md` | Data storage model, file structure, and management | Developers |
| `docs/DEPENDENCY_MANAGEMENT.md` | External dependency management policies and compatibility | Developers & Contributors |
| `docs/DEVELOPMENT.md` | Development environment setup and workflow | Developers |
| `docs/INTEGRATION.md` | Integration with external services and systems | Developers |
| `docs/PLATFORM_SPECIFIC.md` | Platform-specific features and development considerations | Developers |
| `docs/SECURITY.md` | Security model, data protection, and authentication system | Developers & Security Reviewers |
| `docs/SCRIPTS.md` | Custom script writing and security model | Developers & Power Users |
| `docs/SETTINGS.md` | Settings management and configuration | Developers & End Users |
| `docs/TESTING.md` | Testing strategies and processes | Developers & QA |
| `docs/USER_GUIDE.md` | Detailed user guide | End Users |
| `docs/WINDOW_VISIBILITY.md` | Window visibility management | Developers |

## Documentation Management Guidelines

1. **Consistent Formatting**: All documentation uses Markdown format.
2. **Clear Table of Contents**: Each document should include a table of contents and clear section headings.
3. **Language Standard**: All code and UI messages should be written in English. Logs and comments can be in English or Korean.
4. **Code Examples**: Use appropriate language tags for code blocks.
5. **Diagrams**: Include diagrams where needed to clarify explanations.
6. **Keep Updated**: When code changes, related documentation should be updated together.
7. **New Documents**: When adding new documents, also add them to this document list.
8. **Code-Documentation Alignment**: Example code in documentation should match the actual codebase.
9. **Error Correction**: Errors or inconsistencies found in documentation should be fixed immediately.
10. **Accessibility**: All documentation should be accessible with assistive technologies like screen readers.
