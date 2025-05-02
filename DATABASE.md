# Toast App Database Schema

This document outlines the database schema, relationships, and implementation details for the Toast App data storage system.

## Table of Contents

- [Toast App Database Schema](#toast-app-database-schema)
  - [Table of Contents](#table-of-contents)
  - [Overview](#overview)
  - [Storage Implementation](#storage-implementation)
  - [Schema Structure](#schema-structure)
    - [Config Store](#config-store)
    - [User Data Store](#user-data-store)
    - [Cache Store](#cache-store)
  - [Entity Relationships](#entity-relationships)
  - [Key Entities](#key-entities)
    - [Global Settings](#global-settings)
    - [Pages](#pages)
    - [Buttons](#buttons)
    - [User Account](#user-account)
    - [Sync Metadata](#sync-metadata)
  - [Field Descriptions](#field-descriptions)
    - [Global Settings Fields](#global-settings-fields)
    - [Page Fields](#page-fields)
    - [Button Fields](#button-fields)
    - [User Account Fields](#user-account-fields)
    - [Sync Metadata Fields](#sync-metadata-fields)
  - [Indexing](#indexing)
  - [Data Migration](#data-migration)
  - [Backup and Recovery](#backup-and-recovery)
  - [Performance Considerations](#performance-considerations)
  - [Schema Versioning](#schema-versioning)

## Overview

Toast App uses a file-based storage system rather than a traditional database. Data is stored in JSON format using the `electron-store` package, which provides a simple and efficient way to persist and retrieve application data.

## Storage Implementation

The app uses the following storage components:

1. **Config Store**: Handles application settings, button configurations, and page layouts
2. **User Data Store**: Manages user account information and preferences
3. **Cache Store**: Stores temporary data and application state

Each store is implemented as a separate instance of `electron-store` with its own configuration and schema validation.

## Schema Structure

### Config Store

The config store contains the core application configuration and is structured as follows:

```json
{
  "version": "0.5.54",
  "settings": {
    "globalShortcut": "Alt+Space",
    "launchOnLogin": true,
    "theme": "system",
    "position": "center",
    "size": "medium",
    "opacity": 0.95,
    "buttonLayout": "grid",
    "hideAfterAction": true,
    "hideOnBlur": true,
    "hideOnEscape": true,
    "showInTaskbar": false
  },
  "pages": [
    {
      "id": "page1",
      "name": "Main",
      "shortcut": "1",
      "buttons": [
        {
          "id": "button1",
          "name": "Files",
          "shortcut": "Q",
          "icon": "📁",
          "actionType": "open",
          "actionParams": {
            "target": "/Users/username/Documents"
          }
        },
        // Additional buttons...
      ]
    },
    // Additional pages...
  ],
  "migrations": {
    "lastMigration": "0.5.0"
  }
}
```

### User Data Store

The user data store contains user account information and is structured as follows:

```json
{
  "user": {
    "id": "user_123456",
    "email": "user@example.com",
    "subscription": {
      "level": "premium",
      "expiresAt": "2023-12-31T23:59:59Z"
    },
    "lastLogin": "2023-06-15T10:30:45Z"
  },
  "auth": {
    "accessToken": "encrypted_access_token",
    "refreshToken": "encrypted_refresh_token",
    "expiresAt": "2023-06-16T10:30:45Z"
  }
}
```

### Cache Store

The cache store contains temporary data and is structured as follows:

```json
{
  "syncState": {
    "lastSync": "2023-06-15T10:35:22Z",
    "status": "success",
    "deviceId": "device_abc123"
  },
  "recentActions": [
    {
      "buttonId": "button1",
      "timestamp": "2023-06-15T10:40:12Z",
      "success": true
    },
    // Additional recent actions...
  ]
}
```

## Entity Relationships

The primary entities in Toast App have the following relationships:

1. **User** (1) → (n) **Pages**: A user can have multiple pages
2. **Page** (1) → (n) **Buttons**: A page can contain multiple buttons
3. **User** (1) → (1) **Settings**: A user has one set of settings
4. **User** (1) → (1) **SyncMetadata**: A user has one sync metadata record

## Key Entities

### Global Settings

Global settings control the application's behavior and appearance. The settings object includes:

- Global shortcut configuration
- UI preferences (theme, position, size, opacity)
- Window management behavior
- Startup configuration
- Layout preferences

### Pages

Pages organize buttons into logical groups. Each page has:

- Unique identifier
- Name
- Shortcut key (1-9)
- Associated buttons
- Sort order

### Buttons

Buttons are the primary interactive elements in Toast App. Each button has:

- Unique identifier
- Name
- Display icon (emoji or custom)
- Shortcut key
- Action type (exec, open, script, shortcut, chain)
- Action parameters (specific to action type)
- Parent page reference

### User Account

The user account entity stores authentication and subscription information:

- User identifier
- Email address
- Subscription level and expiration
- Authentication tokens (encrypted)
- Last login timestamp

### Sync Metadata

Sync metadata tracks information about cloud synchronization:

- Last sync timestamp
- Sync status
- Device identifier
- Change history
- Conflict resolution data

## Field Descriptions

### Global Settings Fields

| Field | Type | Description | Default |
|-------|------|-------------|---------|
| globalShortcut | String | Global keyboard shortcut to open Toast window | "Alt+Space" |
| launchOnLogin | Boolean | Whether to launch the app on system login | true |
| theme | String | UI theme ("light", "dark", or "system") | "system" |
| position | String | Toast window position ("center", "top", "topRight", etc.) | "center" |
| size | String | Toast window size ("small", "medium", "large") | "medium" |
| opacity | Number | Toast window opacity (0.0-1.0) | 0.95 |
| buttonLayout | String | Button layout style ("grid" or "list") | "grid" |
| hideAfterAction | Boolean | Whether to hide window after action execution | true |
| hideOnBlur | Boolean | Whether to hide window when it loses focus | true |
| hideOnEscape | Boolean | Whether to hide window when Escape is pressed | true |
| showInTaskbar | Boolean | Whether to show window in taskbar/dock | false |

### Page Fields

| Field | Type | Description |
|-------|------|-------------|
| id | String | Unique identifier for the page |
| name | String | Display name for the page |
| shortcut | String | Number key (1-9) to switch to this page |
| buttons | Array | Collection of button objects on this page |
| sortOrder | Number | Position in the page list (optional) |

### Button Fields

| Field | Type | Description |
|-------|------|-------------|
| id | String | Unique identifier for the button |
| name | String | Display name for the button |
| shortcut | String | Single character shortcut for the button |
| icon | String | Emoji or icon reference for the button |
| actionType | String | Type of action ("exec", "open", "script", "shortcut", "chain") |
| actionParams | Object | Parameters specific to the action type |
| enabled | Boolean | Whether the button is enabled (optional) |

### User Account Fields

| Field | Type | Description |
|-------|------|-------------|
| id | String | Unique identifier for the user |
| email | String | User's email address |
| subscription.level | String | Subscription level ("free", "basic", "premium") |
| subscription.expiresAt | String | Subscription expiration date (ISO format) |
| lastLogin | String | Last login timestamp (ISO format) |

### Sync Metadata Fields

| Field | Type | Description |
|-------|------|-------------|
| lastSync | String | Last synchronization timestamp (ISO format) |
| status | String | Last sync status ("success", "failed", "conflict") |
| deviceId | String | Unique identifier for this device |
| changeHistory | Array | History of changes for conflict resolution |
| lastDeviceSync | Object | Map of device IDs to last sync timestamps |

## Indexing

While the file-based storage doesn't use traditional database indexes, the app implements the following optimization strategies:

1. **In-memory caching** of frequently accessed data
2. **Denormalized data structures** for faster access to related entities
3. **Lazy loading** of certain data components

## Data Migration

The Toast App includes a migration system to handle schema changes between versions:

1. Each version upgrade checks if migrations are needed
2. Migrations are applied sequentially based on version numbers
3. Migration history is tracked in the config store
4. Failed migrations can be retried or rolled back

## Backup and Recovery

The storage system includes backup and recovery features:

1. Automatic backups created before major changes
2. User-initiated backup/restore functionality
3. Cloud-synchronized backups for premium users
4. Recovery from corrupted data files

## Performance Considerations

To ensure optimal performance:

1. Large datasets are paginated or virtualized in the UI
2. Data is stored in separate files to minimize loading times
3. Write operations are debounced to reduce disk I/O
4. Binary data (such as custom icons) is stored outside the main config

## Schema Versioning

The storage schema uses semantic versioning:

1. Major version changes indicate backward-incompatible schema changes
2. Minor version changes indicate backward-compatible additions
3. Patch version changes indicate non-structural improvements

The current schema version is tracked in the config store to facilitate migrations when needed.