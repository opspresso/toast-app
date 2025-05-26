# Toast App 데이터 저장소 스키마

이 문서는 Toast App의 데이터 저장소 스키마, 관계 및 구현 세부사항을 설명합니다.

## 목차

- [Toast App 데이터 저장소 스키마](#toast-app-데이터-저장소-스키마)
  - [목차](#목차)
  - [개요](#개요)
  - [저장소 구현](#저장소-구현)
  - [스키마 구조](#스키마-구조)
    - [메인 구성 저장소](#메인-구성-저장소)
    - [사용자 데이터 관리](#사용자-데이터-관리)
  - [엔티티 관계](#엔티티-관계)
  - [주요 엔티티](#주요-엔티티)
    - [전역 설정](#전역-설정)
    - [페이지](#페이지)
    - [버튼](#버튼)
    - [사용자 계정](#사용자-계정)
    - [동기화 메타데이터](#동기화-메타데이터)
  - [필드 설명](#필드-설명)
    - [전역 설정 필드](#전역-설정-필드)
    - [페이지 필드](#페이지-필드)
    - [버튼 필드](#버튼-필드)
    - [사용자 계정 필드](#사용자-계정-필드)
    - [동기화 메타데이터 필드](#동기화-메타데이터-필드)
  - [인덱싱](#인덱싱)
  - [데이터 마이그레이션](#데이터-마이그레이션)
  - [백업 및 복구](#백업-및-복구)
  - [성능 고려사항](#성능-고려사항)
  - [스키마 버전 관리](#스키마-버전-관리)

## 개요

Toast App은 전통적인 데이터베이스 대신 파일 기반 저장소 시스템을 사용합니다. 데이터는 `electron-store` 패키지를 사용하여 JSON 형식으로 저장되며, 이는 애플리케이션 데이터를 지속적으로 저장하고 검색하는 간단하고 효율적인 방법을 제공합니다.

## 저장소 구현

앱은 다음과 같은 저장소 구성 요소를 사용합니다:

1. **메인 구성 저장소**: 애플리케이션 설정, 버튼 구성 및 페이지 레이아웃을 처리하는 단일 `electron-store` 인스턴스
2. **사용자 데이터 관리**: 사용자 계정 정보와 인증 토큰을 별도 파일로 관리
3. **임시 데이터**: 메모리 내 캐싱 및 임시 상태 관리

주요 저장소는 `src/main/config.js`에서 스키마 검증과 함께 단일 `electron-store` 인스턴스로 구현됩니다.

## 스키마 구조

### 메인 구성 저장소

메인 구성 저장소는 핵심 애플리케이션 구성을 포함하며 다음과 같이 구성됩니다:

```json
{
  "globalHotkey": "Alt+Space",
  "pages": [
    {
      "name": "Main",
      "shortcut": "1",
      "buttons": [
        {
          "name": "Files",
          "shortcut": "Q",
          "icon": "📁",
          "action": "open",
          "url": "/Users/username/Documents"
        }
      ]
    }
  ],
  "appearance": {
    "theme": "system",
    "position": "center",
    "size": "medium",
    "opacity": 0.95,
    "buttonLayout": "grid",
    "monitorPositions": {}
  },
  "advanced": {
    "launchAtLogin": false,
    "hideAfterAction": true,
    "hideOnBlur": true,
    "hideOnEscape": true,
    "showInTaskbar": false
  },
  "subscription": {
    "isSubscribed": false,
    "isAuthenticated": false,
    "expiresAt": "",
    "pageGroups": 1
  },
  "firstLaunchCompleted": false
}
```

### 사용자 데이터 관리

사용자 데이터는 별도 파일들로 관리되며 다음과 같은 구조를 가집니다:

**인증 토큰 파일** (`user-data-manager.js`에서 관리):
```json
{
  "accessToken": "encrypted_access_token",
  "refreshToken": "encrypted_refresh_token",
  "expiresAt": "2024-06-16T10:30:45Z"
}
```

**사용자 프로필 데이터** (메모리 내 캐싱):
```json
{
  "id": "user_123456",
  "email": "user@example.com",
  "subscription": {
    "level": "premium",
    "expiresAt": "2024-12-31T23:59:59Z"
  },
  "lastLogin": "2024-06-15T10:30:45Z"
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

Global settings control the application's behavior and appearance. These include:

- Global hotkey configuration
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
| globalHotkey | String | Global keyboard shortcut to open Toast window | "Alt+Space" |
| appearance.theme | String | UI theme ("light", "dark", or "system") | "system" |
| appearance.position | String | Toast window position ("center", "top", "bottom", "cursor") | "center" |
| appearance.size | String | Toast window size ("small", "medium", "large") | "medium" |
| appearance.opacity | Number | Toast window opacity (0.0-1.0) | 0.95 |
| appearance.buttonLayout | String | Button layout style ("grid" or "list") | "grid" |
| advanced.launchAtLogin | Boolean | Whether to launch the app on system login | false |
| advanced.hideAfterAction | Boolean | Whether to hide window after action execution | true |
| advanced.hideOnBlur | Boolean | Whether to hide window when it loses focus | true |
| advanced.hideOnEscape | Boolean | Whether to hide window when Escape is pressed | true |
| advanced.showInTaskbar | Boolean | Whether to show window in taskbar/dock | false |

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
