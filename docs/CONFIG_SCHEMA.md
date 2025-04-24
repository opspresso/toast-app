# Toast 앱 구성 스키마

이 문서는 Toast 앱의 구성 옵션과 스키마를 설명합니다. 구성 파일 위치, 형식, 사용 가능한 옵션 및 예시를 제공합니다.

## 목차

- [구성 파일 위치](#구성-파일-위치)
- [구성 옵션](#구성-옵션)
  - [전역 단축키](#전역-단축키)
  - [페이지 및 버튼](#페이지-및-버튼)
  - [외관](#외관)
  - [고급 설정](#고급-설정)
  - [인증 및 구독](#인증-및-구독)
- [구성 예시](#구성-예시)
- [프로그래매틱 액세스](#프로그래매틱-액세스)
- [구성 마이그레이션](#구성-마이그레이션)

## 구성 파일 위치

Toast 앱의 구성 파일은 운영체제에 따라 다음 위치에 저장됩니다:

- **macOS**: `~/Library/Application Support/toast-app/config.json`
- **Windows**: `%APPDATA%\toast-app\config.json`
- **Linux**: `~/.config/toast-app/config.json`

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
| `shortcut` | 문자열 | 예 | 버튼 액션을 트리거하는 단축키 (A-Z) |
| `icon` | 문자열 | 아니오 | 버튼에 표시할 이모지 또는 아이콘 |
| `action` | 문자열 | 예 | 액션 유형 (`exec`, `open`, `shortcut`, `script`, `chain`) |
| `command` | 문자열 | 조건부 | `exec` 액션 유형에 필요한 명령 |
| `url` | 문자열 | 조건부 | `open` 액션 유형에 필요한 URL 또는 파일 경로 |
| `keys` | 문자열 | 조건부 | `shortcut` 액션 유형에 필요한 키 조합 |
| `script` | 문자열 | 조건부 | `script` 액션 유형에 필요한 스크립트 코드 |
| `scriptType` | 문자열 | 조건부 | `script` 액션의 스크립트 유형 (`javascript`, `applescript`, `powershell`, `bash`) |
| `actions` | 배열 | 조건부 | `chain` 액션 유형에 필요한, 순차적으로 실행할 액션 배열 |

**예시**:
```json
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
  }
]
```

### 외관

| 옵션 | 유형 | 기본값 | 설명 |
|------|------|--------|------|
| `appearance.theme` | 문자열 | `"system"` | UI 테마 (`"light"`, `"dark"`, `"system"`) |
| `appearance.position` | 문자열 | `"center"` | Toast 팝업 위치 (`"center"`, `"top"`, `"bottom"`, `"cursor"`) |
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
| `advanced.launchAtLogin` | 불리언 | `true` | 로그인 시 앱 자동 시작 여부 |
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
| `subscription.isAuthenticated` | 불리언 | `false` | 사용자 인증 상태 |
| `subscription.level` | 문자열 | `"free"` | 구독 수준 (`"free"`, `"basic"`, `"premium"`) |
| `subscription.pageGroups` | 숫자 | 사용자 타입별 | 사용자가 생성할 수 있는 페이지 그룹의 최대 수 |
| `subscription.features` | 객체 | `{}` | 활성화된 기능 플래그 |
| `subscription.email` | 문자열 | `null` | 인증된 사용자 이메일 |
| `subscription.expiresAt` | 문자열 | `null` | 구독 만료 날짜 (ISO 문자열) |

**예시**:
```json
"subscription": {
  "isAuthenticated": true,
  "level": "premium",
  "pageGroups": 9,
  "features": {
    "cloud_sync": true,
    "advanced_actions": true
  },
  "email": "user@example.com",
  "expiresAt": "2023-12-31T23:59:59Z"
}
```

**pageGroups 기본값**:
- 익명 사용자: 1
- 인증된 일반 사용자: 3
- 프리미엄 사용자: 9

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
          "shortcut": "C",
          "icon": "💻",
          "action": "exec",
          "command": "open -a 'Visual Studio Code'"
        },
        {
          "name": "GitHub",
          "shortcut": "G",
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
    "isAuthenticated": false,
    "level": "free",
    "pageGroups": 1,
    "features": {},
    "email": null,
    "expiresAt": null
  },
  "firstLaunchCompleted": true
}
```

## 프로그래매틱 액세스

Toast 앱 내에서 구성에 프로그래매틱 방식으로 액세스하려면 `config.js` 모듈을 사용하세요:

```javascript
const config = require('./config');

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
config.reset();
```

## 구성 마이그레이션

Toast 앱은 구성 스키마 변경 시 자동 마이그레이션을 지원합니다. 이전 버전의 구성 파일은 자동으로 현재 스키마로 업데이트됩니다.

구성 백업은 다음 위치에 저장됩니다:
- **macOS**: `~/Library/Application Support/toast-app/config.backup.json`
- **Windows**: `%APPDATA%\toast-app\config.backup.json`
- **Linux**: `~/.config/toast-app/config.backup.json`

구성 마이그레이션 오류가 발생하면 백업 파일을 원래 config.json 파일로 복원할 수 있습니다.
