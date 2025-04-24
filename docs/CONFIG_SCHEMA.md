Toast 앱 구성 스키마

이 문서는 Toast 앱에서 사용하는 구성 스키마를 설명하며, 모든 사용 가능한 설정, 데이터 유형, 기본값 및 설명을 포함합니다.

## 개요

Toast 앱은 지속적인 구성 저장을 위해 [electron-store](https://github.com/sindresorhus/electron-store)를 사용합니다. 구성은 사용자의 애플리케이션 데이터 디렉토리에 JSON 파일로 저장됩니다:

- **macOS**: `~/Library/Application Support/toast-app/config.json`
- **Windows**: `%APPDATA%\toast-app\config.json`
- **Linux**: `~/.config/toast-app/config.json`

## 스키마 구조

구성 스키마는 `src/main/config.js`에 정의되어 있으며 다음과 같은 주요 섹션으로 구성됩니다:

1. **globalHotkey**: Toast 팝업을 트리거하는 전역 키보드 단축키
2. **pages**: 각각 자체 버튼 세트를 포함하는 페이지 구성 배열
3. **appearance**: 시각적 외관 설정
4. **advanced**: 고급 동작 설정
5. **subscription**: 구독 상태 및 기능
6. **firstLaunchCompleted**: 첫 번째 실행 설정이 완료되었는지 나타내는 플래그

## 스키마 상세 정보

### 전역 단축키

```json
"globalHotkey": {
  "type": "string",
  "default": "Alt+Space"
}
```

전역 단축키는 [Electron Accelerator](https://www.electronjs.org/docs/latest/api/accelerator) 형식을 따르는 키보드 단축키를 나타내는 문자열입니다.

예시:
- `"Alt+Space"`
- `"CommandOrControl+Shift+T"`
- `"F12"`

### 페이지

```json
"pages": {
  "type": "array",
  "default": []
}
```

페이지를 사용하면 버튼을 논리적 그룹으로 구성할 수 있습니다. `pages` 속성은 각각 자체 버튼 세트를 포함하는 페이지 객체의 배열입니다.

각 페이지 객체는 다음과 같은 구조를 가집니다:

```json
{
  "name": "Page 1",
  "shortcut": "1",
  "buttons": [
    {
      "name": "Terminal",
      "shortcut": "Q",
      "icon": "⌨️",
      "action": "exec",
      "command": "platform-specific-command"
    },
    // 더 많은 버튼...
  ]
}
```

#### 페이지 속성

| 속성 | 유형 | 필수 | 설명 |
|----------|------|----------|-------------|
| `name` | string | 예 | 페이지의 표시 이름 |
| `shortcut` | string | 아니오 | 페이지 접근을 위한 단일 키 단축키(예: "1", "2") |
| `buttons` | array | 예 | 이 페이지의 버튼 구성 배열 |

무료 사용자는 최대 3개의 페이지를 만들 수 있으며, 구독자는 최대 9개의 페이지를 만들 수 있습니다.

#### 버튼 속성

각 버튼 객체는 다음과 같은 속성을 가질 수 있습니다:

| 속성 | 유형 | 필수 | 설명 |
|----------|------|----------|-------------|
| `name` | string | 예 | 버튼의 표시 이름 |
| `shortcut` | string | 예 | 단일 키 단축키(예: "Q", "W") |
| `icon` | string | 아니오 | 이모지 또는 아이콘 이름 |
| `action` | string | 예 | 액션 유형: "exec", "open", "shortcut", "script", 또는 "chain" |
| `command` | string | "exec"의 경우 | 실행할 셸 명령 |
| `workingDir` | string | 아니오 | 명령 실행을 위한 작업 디렉토리 |
| `runInTerminal` | boolean | 아니오 | 터미널에서 명령을 실행할지 여부 |
| `url` | string | "open"의 경우 | 열 URL |
| `path` | string | "open"의 경우 | 열 파일 또는 폴더 경로 |
| `application` | string | 아니오 | 열기에 사용할 애플리케이션 |
| `keyShortcut` | string | "shortcut"의 경우 | 시뮬레이션할 키보드 단축키 |
| `script` | string | "script"의 경우 | 스크립트 내용 |
| `scriptType` | string | "script"의 경우 | 스크립트 언어: "javascript", "applescript", "powershell", 또는 "bash" |
| `actions` | array | "chain"의 경우 | 순차적으로 실행할 액션 배열 |
| `stopOnError` | boolean | "chain"의 경우 | 오류 시 체인 실행을 중지할지 여부 |

애플리케이션은 최대 9개의 페이지를 지원하며, 각 페이지는 기본적으로 5x3 그리드로 배열된 최대 15개의 버튼을 포함할 수 있습니다.

### 체인 액션 구조

"chain" 액션 유형을 사용하면 일련의 액션을 순차적으로 실행할 수 있습니다. 구조는 다음과 같습니다:

```json
{
  "name": "Chain Example",
  "shortcut": "C",
  "icon": "🔗",
  "action": "chain",
  "actions": [
    {
      "action": "exec",
      "command": "echo 'Step 1'"
    },
    {
      "action": "open",
      "url": "https://example.com"
    },
    {
      "action": "shortcut",
      "keyShortcut": "Ctrl+C"
    }
  ],
  "stopOnError": true
}
```

체인의 각 액션은 지원되는 액션 유형(exec, open, shortcut, script) 중 하나일 수 있습니다. `stopOnError` 속성은 액션 중 하나가 실패할 경우 실행을 계속해야 하는지 여부를 결정합니다.

### 외관

```json
"appearance": {
  "type": "object",
  "properties": {
    "theme": {
      "type": "string",
      "enum": ["light", "dark", "system"],
      "default": "system"
    },
    "position": {
      "type": "string",
      "enum": ["center", "top", "bottom", "cursor"],
      "default": "center"
    },
    "size": {
      "type": "string",
      "enum": ["small", "medium", "large"],
      "default": "medium"
    },
    "opacity": {
      "type": "number",
      "minimum": 0.1,
      "maximum": 1.0,
      "default": 0.95
    },
    "buttonLayout": {
      "type": "string",
      "enum": ["grid", "list"],
      "default": "grid"
    }
  },
  "default": {
    "theme": "system",
    "position": "center",
    "size": "medium",
    "opacity": 0.95,
    "buttonLayout": "grid"
  }
}
```

#### 테마 옵션

- `"light"`: 라이트 테마
- `"dark"`: 다크 테마
- `"system"`: 시스템 테마 따르기

#### 위치 옵션

- `"center"`: 화면 중앙
- `"top"`: 화면 상단 중앙
- `"bottom"`: 화면 하단 중앙
- `"cursor"`: 커서 위치 근처

#### 크기 옵션

- `"small"`: 350x400 픽셀
- `"medium"`: 400x500 픽셀
- `"large"`: 500x600 픽셀

#### 버튼 레이아웃 옵션

- `"grid"`: 그리드로 배열된 버튼
- `"list"`: 세로 목록으로 배열된 버튼

### 고급

```json
"advanced": {
  "type": "object",
  "properties": {
    "launchAtLogin": {
      "type": "boolean",
      "default": false
    },
    "hideAfterAction": {
      "type": "boolean",
      "default": true
    },
    "hideOnBlur": {
      "type": "boolean",
      "default": true
    },
    "hideOnEscape": {
      "type": "boolean",
      "default": true
    },
    "showInTaskbar": {
      "type": "boolean",
      "default": false
    }
  },
  "default": {
    "launchAtLogin": false,
    "hideAfterAction": true,
    "hideOnBlur": true,
    "hideOnEscape": true,
    "showInTaskbar": false
  }
}
```

#### 고급 설정

- `launchAtLogin`: 사용자가 로그인할 때 애플리케이션 시작
- `hideAfterAction`: 액션 실행 후 Toast 창 숨기기
- `hideOnBlur`: Toast 창이 포커스를 잃을 때 숨기기
- `hideOnEscape`: Escape 키를 누를 때 Toast 창 숨기기
- `showInTaskbar`: 작업 표시줄/독에 Toast 창 표시

### 구독

```json
"subscription": {
  "type": "object",
  "properties": {
    "isSubscribed": {
      "type": "boolean",
      "default": false
    },
    "subscribedUntil": {
      "type": "string",
      "default": ""
    },
    "pageGroups": {
      "type": "number",
      "default": 1
    }
  },
  "default": {
    "isSubscribed": false,
    "subscribedUntil": "",
    "pageGroups": 1
  }
}
```

구독 섹션에는 현재 프로필 API를 통해 얻는 사용자의 구독 상태에 대한 정보가 포함되어 있습니다. 무료 사용자는 3개의 페이지로 제한되며, 구독 사용자는 최대 9개의 페이지를 만들 수 있습니다.

### 첫 실행 완료

```json
"firstLaunchCompleted": {
  "type": "boolean",
  "default": false
}
```

이 플래그는 첫 실행 설정이 완료된 후 `true`로 설정됩니다. 시작 시 설정 창을 표시할지 여부를 결정하는 데 사용됩니다.

## 구성 예시

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
        },
        {
          "name": "File Explorer",
          "shortcut": "E",
          "icon": "📁",
          "action": "exec",
          "command": "open ."
        }
      ]
    },
    {
      "name": "Development",
      "shortcut": "2",
      "buttons": [
        {
          "name": "VSCode",
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
        },
        {
          "name": "Dev Workflow",
          "shortcut": "E",
          "icon": "🔗",
          "action": "chain",
          "actions": [
            {
              "action": "exec",
              "command": "cd ~/projects/myapp && code ."
            },
            {
              "action": "exec",
              "command": "cd ~/projects/myapp && npm start",
              "runInTerminal": true
            }
          ],
          "stopOnError": true
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
    "subscribedUntil": "",
    "pageGroups": 1
  },
  "firstLaunchCompleted": true
}
```

## 구성 API

구성은 다음 API를 사용하여 접근하고 수정할 수 있습니다:

### 메인 프로세스

```javascript
const { createConfigStore } = require('./main/config');
const config = createConfigStore();

// 값 가져오기
const globalHotkey = config.get('globalHotkey');

// 값 설정하기
config.set('globalHotkey', 'Alt+Shift+Space');

// 모든 페이지 가져오기
const pages = config.get('pages');

// 페이지 추가하기
pages.push(newPage);
config.set('pages', pages);
```

### 렌더러 프로세스(IPC를 통해)

```javascript
// 값 가져오기
const globalHotkey = await window.settings.getConfig('globalHotkey');

// 값 설정하기
await window.settings.setConfig('globalHotkey', 'Alt+Shift+Space');

// 모든 구성 가져오기
const config = await window.settings.getConfig();

// 기본값으로 재설정
await window.settings.resetConfig();
```

## 구성 유효성 검사

구성이 로드될 때 스키마에 대해 유효성이 검사됩니다. 값이 유효하지 않거나 누락된 경우 기본값이 대신 사용됩니다.

## 구성 마이그레이션

새 버전에서 스키마가 변경되면 구성이 자동으로 새 스키마로 마이그레이션됩니다. 누락된 속성은 기본값과 함께 추가되고 유효하지 않은 값은 기본값으로 대체됩니다.

## 구성 백업

구성은 변경 사항이 적용되기 전에 자동으로 백업됩니다. 백업은 `.backup` 확장자와 함께 구성 파일과 동일한 디렉토리에 저장됩니다.

## 구성 가져오기/내보내기

구성은 다음 API를 사용하여 JSON 파일로 가져오거나 내보낼 수 있습니다:

```javascript
const { importConfig, exportConfig } = require('./main/config');

// 구성 가져오기
importConfig(config, '/path/to/config.json');

// 구성 내보내기
exportConfig(config, '/path/to/config.json');
```

이러한 함수는 IPC를 통해 렌더러 프로세스에서도 사용할 수 있습니다.
