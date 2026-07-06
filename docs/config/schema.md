# Toast 앱 구성 스키마

이 문서는 Toast 앱의 구성 옵션과 스키마를 설명합니다. 구성 파일 위치, 형식, 사용 가능한 옵션 및 예시를 제공합니다.

버튼 액션 유형에 대한 자세한 설명은 [버튼 액션](../guide/actions.md)을 참조하세요.

## 목차

- [구성 파일 위치](#구성-파일-위치)
- [구성 옵션](#구성-옵션)
  - [전역 단축키](#전역-단축키)
  - [페이지 및 버튼](#페이지-및-버튼)
  - [외관](#외관)
  - [고급 설정](#고급-설정)
  - [인증 및 구독](#인증-및-구독)
  - [기타](#기타)
  - [클라우드 동기화 메타데이터](#클라우드-동기화-메타데이터)
  - [보안 (기기 로컬)](#보안-기기-로컬)
  - [스니펫 (텍스트 확장)](#스니펫-텍스트-확장)
- [구성 예시](#구성-예시)
- [프로그래매틱 액세스](#프로그래매틱-액세스)

## 구성 파일 위치

Toast 앱의 구성 파일은 운영체제에 따라 다음 위치에 저장됩니다:

- **macOS**: `~/Library/Application Support/Toast/config.json`
- **Windows**: `%APPDATA%\Toast\config.json`
- **Linux**: `~/.config/Toast/config.json`

구성 파일은 JSON 형식으로 저장되며, 앱의 설정 UI를 통해 수정하거나 직접 텍스트 에디터로 편집할 수 있습니다.

## 구성 옵션

### 전역 단축키

| 옵션 | 유형 | 기본값 | 설명 |
|------|------|--------|------|
| `globalHotkey` | 문자열 | `"Alt+Space"` | Toast 팝업을 호출하는 전역 키보드 단축키 |

**예시**:
```json
"globalHotkey": "Ctrl+Shift+T"
```

**지원되는 형식**:
- 수정자 키는 `Ctrl`, `Alt`, `Shift`, `Meta` (macOS의 경우 `Command`)
- 일반 키는 `A-Z`, `0-9`, `F1-F12`, 화살표 키 등
- 수정자와 일반 키는 `+`로 결합 (예: `Ctrl+Alt+T`)

### 페이지 및 버튼

| 옵션 | 유형 | 기본값 | 설명 |
|------|------|--------|------|
| `pages` | 배열 | `[]` | 버튼 페이지 구성 배열 |

**페이지 속성**:

| 속성 | 유형 | 필수 | 설명 |
|------|------|------|------|
| `name` | 문자열 | 예 | 페이지의 표시 이름 |
| `shortcut` | 문자열 | 예 | 페이지에 접근하기 위한 단축키 (1-9) |
| `buttons` | 배열 | 예 | 페이지의 버튼 배열 |

**버튼 속성**:

| 속성 | 유형 | 필수 | 설명 |
|------|------|------|------|
| `name` | 문자열 | 예 | 버튼의 표시 이름 |
| `shortcut` | 문자열 | 예 | 버튼 액션을 트리거하는 단축키 (순서대로 qwertasdfgzxcvb 고정) |
| `icon` | 문자열 | 아니오 | 버튼에 표시할 이모지 또는 아이콘 |
| `action` | 문자열 | 예 | 액션 유형 (`application`, `exec`, `open`, `script`, `chain`) |

> **액션별 매개변수**: 각 액션 유형별 필수 및 선택 매개변수에 대한 자세한 설명은 [버튼 액션](../guide/actions.md)을 참조하세요.

> **버튼 단축키 규칙**: 버튼의 단축키는 페이지 내 위치에 따라 순서대로 qwertasdfgzxcvb로 자동 할당됩니다. 버튼 위치가 변경되면 변경된 순서에 따라 단축키가 자동으로 재설정됩니다.

**예시**:
```json
"pages": [
  {
    "name": "Page 1",
    "shortcut": "1",
    "buttons": [
      {
        "name": "Terminal",
        "shortcut": "Q",
        "icon": "⌨️",
        "action": "exec",
        "command": "open -a Terminal"
      },
      {
        "name": "Browser",
        "shortcut": "W",
        "icon": "🌐",
        "action": "open",
        "url": "https://www.google.com"
      }
    ]
  }
]
```

### 외관

| 옵션 | 유형 | 기본값 | 설명 |
|------|------|--------|------|
| `appearance.theme` | 문자열 | `"system"` | UI 테마 (`"light"`, `"dark"`, `"system"`) |
| `appearance.position` | 문자열 | `"center"` | Toast 팝업 위치 (`"center"`, `"top"`, `"bottom"`, `"cursor"`) |
| `appearance.monitorPositions` | 객체 | `{}` | 각 모니터별로 저장된 창 위치 정보 |
| `appearance.size` | 문자열 | `"medium"` | Toast 팝업 크기 (`"small"`, `"medium"`, `"large"`) |
| `appearance.opacity` | 숫자 | `0.95` | Toast 팝업 불투명도 (0.1 - 1.0) |
| `appearance.buttonLayout` | 문자열 | `"grid"` | 버튼 레이아웃 (`"grid"`, `"list"`) |

**예시**:
```json
"appearance": {
  "theme": "dark",
  "position": "center",
  "size": "medium",
  "opacity": 0.9,
  "buttonLayout": "grid"
}
```

### 고급 설정

| 옵션 | 유형 | 기본값 | 설명 |
|------|------|--------|------|
| `advanced.launchAtLogin` | 불리언 | `false` | 로그인 시 앱 자동 시작 여부 |
| `advanced.hideAfterAction` | 불리언 | `true` | 액션 실행 후 Toast 팝업 자동 숨김 여부 |
| `advanced.hideOnBlur` | 불리언 | `true` | 포커스 상실 시 Toast 팝업 숨김 여부 |
| `advanced.hideOnEscape` | 불리언 | `true` | Escape 키 누를 때 Toast 팝업 숨김 여부 |
| `advanced.showInTaskbar` | 불리언 | `false` | 작업 표시줄/독에 Toast 창 표시 여부 |

**예시**:
```json
"advanced": {
  "launchAtLogin": true,
  "hideAfterAction": true,
  "hideOnBlur": true,
  "hideOnEscape": true,
  "showInTaskbar": false
}
```

### 인증 및 구독

| 옵션 | 유형 | 기본값 | 설명 |
|------|------|--------|------|
| `subscription.isSubscribed` | 불리언 | `false` | 사용자가 프리미엄 구독 중인지 여부 |
| `subscription.isAuthenticated` | 불리언 | `false` | 사용자 인증 상태 |
| `subscription.expiresAt` | 문자열 | `""` | 구독 만료 날짜 (ISO 문자열) |
| `subscription.pageGroups` | 숫자 | `1` | 사용자가 생성할 수 있는 페이지 그룹의 최대 수 |

로그인 시 `updatePageGroupSettings`(`src/main/auth.js`)가 다음 필드들을 추가로 저장합니다 (스키마 외 동적 필드):

| 필드 | 설명 |
|------|------|
| `subscription.active` | 구독 활성 여부 (`isSubscribed`와 함께 저장) |
| `subscription.plan` | 구독 플랜 이름 (예: `premium`, `pro`, `vip`) |
| `subscription.isVip` | VIP 여부 |
| `subscription.features.page_groups` / `features.advanced_actions` / `features.cloud_sync` | 서버가 부여한 기능 플래그 |
| `subscription.additionalFeatures.advancedActions` / `additionalFeatures.cloudSync` | 기능 플래그의 카멜케이스 미러 (클라우드 동기화 판정에 사용) |

**예시**:
```json
"subscription": {
  "isSubscribed": false,
  "isAuthenticated": false,
  "expiresAt": "",
  "pageGroups": 1
}
```

**페이지 제한 정책**:
- **무료 사용자**: 1 페이지
- **인증된 사용자**: 최대 3 페이지
- **프리미엄 구독자**: 최대 9 페이지

실제 적용되는 페이지 그룹 수는 사용자의 인증 상태 및 구독 여부에 따라 `src/main/auth.js`의 `updatePageGroupSettings` 함수 등에서 동적으로 결정됩니다.

### 기타

| 옵션 | 유형 | 기본값 | 설명 |
|------|------|--------|------|
| `firstLaunchCompleted` | 불리언 | `false` | 첫 실행 완료 여부 |

### 클라우드 동기화

| 옵션 | 유형 | 기본값 | 설명 |
|------|------|--------|------|
| `cloudSync.enabled` | 불리언 | - | 클라우드 동기화 활성화 여부 (설정 창 토글로 저장, 스키마 외 동적 필드) |

### 클라우드 동기화 메타데이터

클라우드 동기화 기능 사용 시 자동으로 관리되는 메타데이터 필드들입니다. 이 필드들은 사용자가 직접 수정하지 않으며, 동기화 시스템에서 자동으로 설정됩니다.

클라우드 동기화에 대한 자세한 내용은 [클라우드 동기화](../features/cloud-sync.md)를 참조하세요.

| 필드 | 유형 | 설명 |
|------|------|------|
| `_sync.lastModifiedAt` | 숫자 | 로컬에서 마지막으로 수정된 시간 (타임스탬프) |
| `_sync.lastModifiedDevice` | 문자열 | 마지막으로 수정한 기기 ID |
| `_sync.lastSyncedAt` | 숫자 | 서버와 마지막으로 동기화된 시간 (타임스탬프) |
| `_sync.lastSyncedDevice` | 문자열 | 마지막으로 동기화한 기기 ID |
| `_sync.dataHash` | 문자열 | 동기화 데이터의 해시값 (충돌 감지용) |
| `_sync.isConflicted` | 불리언 | 동기화 충돌 발생 여부 |

**예시**:
```json
{
  "_sync": {
    "lastModifiedAt": 1682932768123,
    "lastModifiedDevice": "device-id-1",
    "lastSyncedAt": 1682932769000,
    "lastSyncedDevice": "device-id-1",
    "dataHash": "",
    "isConflicted": false
  }
}
```

### 보안 (기기 로컬)

`security` 키는 클라우드 동기화로 내려받은 `exec`/`script` 액션의 기기별 승인 상태를 저장합니다. 이 필드들은 **기기 로컬 전용**이며, 클라우드에 업로드되지 않습니다. 자세한 동작은 [클라우드 동기화](../features/cloud-sync.md#다운로드-검증-및-액션-승인)를 참조하세요.

| 필드 | 유형 | 기본값 | 설명 |
|------|------|--------|------|
| `security.approvalsInitialized` | 불리언 | `false` | 로컬 구성에서 신뢰 목록 시드가 완료되었는지 여부 |
| `security.trustedActions` | 배열 | `[]` | 이 기기에서 실행이 승인된 `exec`/`script` 액션의 fingerprint 목록 |
| `security.pendingApprovals` | 배열 | `[]` | 클라우드 동기화로 내려받아 1회 사용자 승인을 대기 중인 위험 액션 목록 |

**예시**:
```json
{
  "security": {
    "approvalsInitialized": true,
    "trustedActions": ["<sha256-fingerprint>"],
    "pendingApprovals": []
  }
}
```

### 스니펫 (텍스트 확장)

`snippets` 키는 인라인 텍스트 확장 스니펫 배열입니다. pages처럼 클라우드 동기화됩니다. 기능 켜짐 여부(`textExpander.enabled`)는 권한이 기기별이므로 **기기 로컬 전용**이며 동기화되지 않습니다. 자세한 동작·권한·제약은 [텍스트 확장](../features/snippets.md)을 참조하세요.

| 필드 | 유형 | 기본값 | 설명 |
|------|------|--------|------|
| `snippets` | 배열 | `[]` | 스니펫 목록. 각 항목: `{ id, keyword, content, enabled, label }` |
| `textExpander.enabled` | 불리언 | `false` | 이 기기에서 텍스트 확장 활성화 여부 (기기 로컬, 미동기화) |

**예시**:
```json
{
  "snippets": [
    { "id": "default-email", "keyword": "!email", "content": "email@toast.sh", "enabled": true, "label": "Email" }
  ],
  "textExpander": { "enabled": false }
}
```

## 구성 예시

다음은 전체 구성 파일의 예시입니다:

```json
{
  "globalHotkey": "Alt+Space",
  "pages": [
    {
      "name": "Applications",
      "shortcut": "1",
      "buttons": [
        {
          "name": "Terminal",
          "shortcut": "T",
          "icon": "⌨️",
          "action": "exec",
          "command": "open -a Terminal"
        },
        {
          "name": "Browser",
          "shortcut": "B",
          "icon": "🌐",
          "action": "open",
          "url": "https://www.google.com"
        }
      ]
    },
    {
      "name": "Development",
      "shortcut": "2",
      "buttons": [
        {
          "name": "VS Code",
          "shortcut": "Q",
          "icon": "💻",
          "action": "exec",
          "command": "open -a 'Visual Studio Code'"
        },
        {
          "name": "GitHub",
          "shortcut": "W",
          "icon": "🐙",
          "action": "open",
          "url": "https://github.com"
        }
      ]
    }
  ],
  "appearance": {
    "theme": "system",
    "position": "center",
    "size": "medium",
    "opacity": 0.95,
    "buttonLayout": "grid"
  },
  "advanced": {
    "launchAtLogin": true,
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
  "firstLaunchCompleted": true,
  "_sync": {
    "lastModifiedAt": 1682932768123,
    "lastModifiedDevice": "device-id-1",
    "lastSyncedAt": 1682932769000,
    "lastSyncedDevice": "device-id-1",
    "dataHash": "",
    "isConflicted": false
  }
}
```

## 프로그래매틱 액세스

Toast 앱 내에서 구성에 프로그래매틱 방식으로 액세스하려면 `config.js` 모듈을 사용하세요:

```javascript
const { createConfigStore, resetToDefaults } = require('./config');

// 구성 저장소 생성
const config = createConfigStore();

// 구성 값 가져오기
const globalHotkey = config.get('globalHotkey');

// 구성 값 설정하기
config.set('appearance.theme', 'dark');

// 여러 값 한 번에 설정하기
config.set({
  'appearance.theme': 'dark',
  'appearance.position': 'center'
});

// 기본 구성으로 재설정
resetToDefaults(config);
```
