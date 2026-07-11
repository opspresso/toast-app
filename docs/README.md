# Toast App Documentation

The complete documentation set for Toast App. It covers everything from the project's architecture to detailed usage instructions.

## Documentation Structure

```
docs/
├── guide/          User guides (5)
├── features/       Feature detail docs (7)
├── api/            API reference (4)
├── architecture/   Architecture docs (3)
├── config/         Settings and configuration (4)
├── development/    Development guides (4)
└── future/         Future plans (0)
```

## User Documentation

Read these before getting started:

| Document | Description | Priority |
|------|------|----------|
| [User Guide](./guide/user.md) | Complete guide to using the Toast app | Essential |
| [Button Shortcuts](./guide/shortcuts.md) | Automatic shortcut assignment system | Essential |
| [Page System](./guide/pages.md) | UI structure and navigation | Recommended |
| [Usage Scenarios](./guide/scenarios.md) | Collection of real-world examples | Recommended |
| [Button Actions](./guide/actions.md) | How to configure the 5 action types | Recommended |

[View the full guide](./guide/README.md)

## Developer Documentation

Core documents you need for development:

| Document | Description | Priority |
|------|------|----------|
| [Architecture](./architecture/overview.md) | System structure and design principles | Essential |
| [Development Guide](./development/setup.md) | Development environment setup and builds | Essential |
| [Configuration Schema](./config/schema.md) | Configuration options and data structures | Recommended |
| [Data Model](./config/data-model.md) | Core data structures and relationships | Recommended |
| [Data Storage](./config/data-storage.md) | File structure and data management | Recommended |

[View all development docs](./development/README.md)

## Feature Documentation

Detailed implementation of each feature:

### Action System
| Document | Description |
|------|------|
| [Button Actions](./guide/actions.md) | The 5 action types (exec, open, script, chain, application) |
| [Scripts](./features/scripts.md) | JavaScript, AppleScript, PowerShell, and Bash scripts |

### Cloud & Authentication
| Document | Description |
|------|------|
| [Cloud Sync](./features/cloud-sync.md) | OAuth authentication and settings sync |
| [Security](./architecture/security.md) | Security model and data protection |
| [Auto Update](./features/auto-update.md) | Updates powered by electron-updater |

### Platform & Integration
| Document | Description |
|------|------|
| [Snippets (Text Expansion)](./features/snippets.md) | Automatic substitution when typing keywords in other apps |
| [Icon Extraction](./features/icon-extraction.md) | Automatic macOS app icon extraction |
| [Platform-Specific Features](./architecture/platform.md) | macOS/Windows-specific capabilities |
| [External Integration](./development/integration.md) | Integration with external services |

[View all feature docs](./features/README.md)

## API Reference

API documentation for developers:

| Document | Description |
|------|------|
| [API Overview](./api/overview.md) | Overall API structure and usage |
| [Main Process](./api/main-process.md) | Main process module API |
| [Renderer](./api/renderer.md) | Renderer process UI API |
| [Actions](./api/actions.md) | Action system API |

[View all API docs](./api/README.md)

## Quality & Maintenance

| Document | Description | Status |
|------|------|------|
| [Testing](./development/testing.md) | Test strategy and execution | Partially implemented |
| [Dependency Management](./development/dependencies.md) | Package and compatibility management | Implemented |
| [Environment Variables](./config/environment.md) | Environment configuration management | Implemented |
| [Window Display](./features/window.md) | Window visibility control | Implemented |

## Other Documents

| Document | Description | Status |
|------|------|------|
| [Settings Management](./features/settings.md) | User settings UI | Implemented |

## Recommended Paths by Audience

### End Users
1. [User Guide](./guide/user.md) - Basic usage
2. [Button Shortcuts](./guide/shortcuts.md) - Keyboard usage
3. [Cloud Sync](./features/cloud-sync.md) - Account and sync

### Developers
1. [Architecture](./architecture/overview.md) - Understanding the system
2. [Development Guide](./development/setup.md) - Environment setup
3. [API Overview](./api/overview.md) - API structure
4. [Action System](./guide/actions.md) - Core functionality

### Contributors
1. [Development Guide](./development/setup.md) - Development environment
2. [Testing](./development/testing.md) - Running tests
3. [Dependency Management](./development/dependencies.md) - Package policy

---

> Documentation improvements: If you find a typo or something that could be improved, please contribute by [opening an issue](https://github.com/opspresso/toast-app/issues) or submitting a PR!
