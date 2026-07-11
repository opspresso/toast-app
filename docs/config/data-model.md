# Toast App Logical Data Structure

This document describes the Toast App's logical data structure and entity relationships.

> **Important**: Toast App does not use a traditional database; it stores settings in JSON format via electron-store. This document describes the logical data structure, not a physical database schema.

> **Note**:
> - For how data is actually stored, see [Data Storage](./data-storage.md).
> - For the detailed configuration schema, see [Configuration Schema](./schema.md).

## Entity Relationships

The main entities in Toast App have the following relationships:

1. **User** (1) → (n) **Page**: A user can have multiple pages
2. **Page** (1) → (n) **Button**: A page can contain multiple buttons
3. **User** (1) → (1) **Settings**: A user has a single set of settings
4. **User** (1) → (1) **Sync Metadata**: A user has a single sync metadata record

## Data Hierarchy

```
User configuration
├── Global settings
│   ├── globalHotkey
│   ├── appearance
│   ├── advanced
│   ├── snippets (text expansion snippets)
│   ├── textExpander (device-local enabled state)
│   ├── subscription
│   ├── security (exec/script action approval state)
│   └── firstLaunchCompleted
├── Pages (1-9)
│   ├── name
│   ├── shortcut
│   └── buttons (up to 15)
│       ├── name
│       ├── shortcut
│       ├── icon
│       ├── action
│       └── action-specific parameters
└── Sync metadata (_sync)
    ├── lastModifiedAt
    ├── lastModifiedDevice
    ├── lastSyncedAt
    ├── lastSyncedDevice
    ├── dataHash
    └── isConflicted
```

## Page Limit Policy

Page creation limits based on user account status:

| Account Type | Max Pages | Description |
|-----------|----------------|------|
| Free user | 1 | Basic features |
| Authenticated user | 3 | Extended features after login |
| Premium subscriber | 9 | Access to all features |

## Supported Action Types

The button action types supported by Toast App:

- `application`: Launch an application
- `exec`: Execute a shell command
- `open`: Open a URL, file, or folder
- `script`: Run a custom script
- `chain`: Run a series of actions sequentially

> **Details**: For a detailed description of each action type, see [Button Actions](../guide/actions.md).

## Related Documents

- [Data Storage](./data-storage.md): Storage implementation and file structure
- [Configuration Schema](./schema.md): Detailed configuration options and schema
- [Button Actions](../guide/actions.md): Details on each action type
