# Toast 앱 버튼 액션 유형

이 문서는 Toast 앱에서 지원하는 모든 버튼 액션 유형을 설명합니다.

## 액션 유형 개요

Toast 앱은 다음과 같은 6가지 버튼 액션 유형을 지원합니다:

1. **exec** - 셸 명령어 실행
2. **open** - URL, 파일 또는 폴더 열기
3. **script** - 다양한 언어의 스크립트 실행
4. **shortcut** - 키보드 단축키 시뮬레이션
5. **chain** - 여러 액션 순차적 실행
6. **application** - 애플리케이션 실행

각 액션 유형에 대한 상세 설명은 아래와 같습니다.

## 1. exec (명령어 실행)

### 설명
셸 명령어를 실행하는 액션입니다.

### 속성
| 속성 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `command` | string | 예 | 실행할 셸 명령어 |
| `workingDir` | string | 아니오 | 명령어를 실행할 작업 디렉토리 |
| `runInTerminal` | boolean | 아니오 | 터미널 창을 열어 명령어를 실행할지 여부 (기본값: false) |

### 예시
```json
{
  "name": "Git Status",
  "shortcut": "G",
  "icon": "📊",
  "action": "exec",
  "command": "git status",
  "workingDir": "~/projects/my-repo",
  "runInTerminal": true
}
```

### 플랫폼별 차이점
- **macOS**: Terminal.app을 사용하여 명령어 실행
- **Windows**: cmd.exe를 사용하여 명령어 실행
- **Linux**: 시스템에서 감지된 터미널 애플리케이션을 사용

## 2. open (파일/URL 열기)

### 설명
URL, 파일 또는 폴더를 여는 액션입니다.

### 속성
| 속성 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `url` | string | url 또는 path 중 하나 | 열 URL |
| `path` | string | url 또는 path 중 하나 | 열 파일 또는 폴더 경로 |
| `application` | string | 아니오 | 파일을 열 때 사용할 애플리케이션 |

### 예시
```json
{
  "name": "Documentation",
  "shortcut": "D",
  "icon": "📚",
  "action": "open",
  "url": "https://docs.example.com"
}
```

```json
{
  "name": "Open Project",
  "shortcut": "P",
  "icon": "📁",
  "action": "open",
  "path": "~/projects/my-project",
  "application": "Visual Studio Code"
}
```

### 특이사항
- URL이 `http://` 또는 `https://`로 시작하지 않으면 자동으로 `http://`가 추가됩니다.
- 기본 애플리케이션을 사용하거나 지정된 애플리케이션으로 파일을 열 수 있습니다.

## 3. script (스크립트 실행)

### 설명
다양한 언어로 작성된 사용자 정의 스크립트를 실행하는 액션입니다.

### 속성
| 속성 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `script` | string | 예 | 스크립트 내용 |
| `scriptType` | string | 예 | 스크립트 언어 (javascript, applescript, powershell, bash) |
| `scriptParams` | object | 아니오 | 스크립트에 전달할 파라미터 (JavaScript에만 적용) |

### 예시
```json
{
  "name": "Hello World Script",
  "shortcut": "H",
  "icon": "👋",
  "action": "script",
  "script": "console.log('Hello, World!'); return { message: 'Hello from JavaScript!' };",
  "scriptType": "javascript"
}
```

```json
{
  "name": "System Information",
  "shortcut": "I",
  "icon": "💻",
  "action": "script",
  "script": "Get-ComputerInfo | Format-List",
  "scriptType": "powershell"
}
```

## 4. shortcut (키보드 단축키 실행)

### 설명
키보드 단축키를 시뮬레이션하는 액션입니다.

### 속성
| 속성 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `keys` | string | 예 | 시뮬레이션할 키 조합 (예: "Ctrl+C", "Alt+Tab") |

### 예시
```json
{
  "name": "Copy",
  "shortcut": "C",
  "icon": "📋",
  "action": "shortcut",
  "keys": "Ctrl+C"
}
```

### 플랫폼별 차이점
- **macOS**: `Command` 키는 `Meta` 또는 `Cmd`로 표기
- **Windows & Linux**: `Control` 키는 `Ctrl`로 표기
- 플랫폼 간 자동 변환 지원 (예: Windows에서 `Cmd+C`는 `Ctrl+C`로 자동 변환)

### 플랫폼 제한
- **JavaScript**: 모든 플랫폼 지원
- **AppleScript**: macOS에서만 지원
- **PowerShell**: Windows에서만 지원
- **Bash**: macOS 및 Linux에서만 지원

### 보안 고려사항
- JavaScript 스크립트는 샌드박스 환경에서 실행되어 제한된 API에만 접근 가능
- 외부 스크립트는 임시 파일로 작성된 후 실행되며, 실행 후 임시 파일 삭제

## 5. chain (연쇄 실행)

### 설명
여러 액션을 순차적으로 실행하는 복합 액션입니다.

### 속성
| 속성 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `actions` | array | 예 | 순차적으로 실행할 액션 배열 |
| `stopOnError` | boolean | 아니오 | 오류 발생 시 실행을 중단할지 여부 (기본값: true) |

### 예시
```json
{
  "name": "Development Setup",
  "shortcut": "D",
  "icon": "🔗",
  "action": "chain",
  "actions": [
    {
      "action": "exec",
      "command": "cd ~/projects/my-app && git pull"
    },
    {
      "action": "exec",
      "command": "cd ~/projects/my-app && npm install",
      "runInTerminal": true
    },
    {
      "action": "open",
      "path": "~/projects/my-app",
      "application": "Visual Studio Code"
    }
  ],
  "stopOnError": true
}
```

### 특이사항
- 각 액션은 이전 액션이 완료된 후에 실행됩니다.
- `stopOnError`가 `true`이면 액션 중 하나라도 실패할 경우 연쇄 실행이 중단됩니다.
- 모든 액션 유형(exec, open, shortcut, script, application)을 연쇄 실행에 포함할 수 있습니다.

## 6. application (애플리케이션 실행)

### 설명
지정된 경로의 애플리케이션을 실행하는 액션입니다.

### 속성
| 속성 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `applicationPath` | string | 예 | 실행할 애플리케이션의 경로 |
| `applicationParameters` | string | 아니오 | 애플리케이션에 전달할 명령줄 파라미터 |

### 예시
```json
{
  "name": "Photoshop",
  "shortcut": "P",
  "icon": "🎨",
  "action": "application",
  "applicationPath": "/Applications/Adobe Photoshop 2023/Adobe Photoshop 2023.app",
  "applicationParameters": "--new-document"
}
```

### 플랫폼별 구현
- **macOS**: `open` 명령 사용
- **Windows**: 직접 애플리케이션 경로 실행
- **Linux**: `xdg-open` 명령 사용

## 키보드 입력 처리 방식

Toast 앱은 사용자가 키보드로 단축키를 입력할 때 일관된 동작을 보장하기 위해 다음과 같은 처리 방식을 사용합니다:

### 물리적 키 위치 기반 처리

- Toast 앱은 `event.code`를 사용하여 키보드의 물리적 위치를 기준으로 단축키를 처리합니다.
- 이 방식은 다양한 키보드 레이아웃이나 언어 설정에서도 일관된 사용자 경험을 제공합니다.
- 예: 한글 입력 상태에서도 QWERTY 키보드의 Q 위치에 있는 키를 누르면 Q에 해당하는 단축키가 실행됩니다.

### 코드 구현

`src/renderer/pages/toast/index.js`의 `handleKeyDown` 함수에서 키보드 입력을 처리할 때:

```javascript
// 키보드 입력 처리 예시
const keyCode = event.code;
// 'KeyQ' -> 'Q', 'Digit1' -> '1'과 같이 필요한 부분만 추출
const keyValue = keyCode.startsWith('Key') ? keyCode.slice(3) :
                keyCode.startsWith('Digit') ? keyCode.slice(5) : keyCode;

// 추출된 키 값과 버튼의 단축키 비교
const buttonIndex = filteredButtons.findIndex(
  button => button.shortcut && button.shortcut.toUpperCase() === keyValue
);
```

### 지원되는 키 코드

- **알파벳 키**: `KeyA`부터 `KeyZ`까지 - 'A'부터 'Z'로 변환됨
- **숫자 키**: `Digit0`부터 `Digit9`까지 - '0'부터 '9'로 변환됨
- **특수 키**: 원래 코드 사용 (예: `Minus`, `Equal`, `Comma` 등)

이 방식을 통해 사용자는 키보드 언어나 입력 모드에 관계없이 일관된 단축키 경험을 얻을 수 있습니다.

## 액션 실행 흐름

모든 액션은 `src/main/executor.js`에 정의된 `executeAction` 함수를 통해 중앙에서 관리됩니다. 이 함수는 다음과 같은 작업을 수행합니다:

1. 액션 타입 확인 및 유효성 검사
2. 해당 액션 타입에 맞는 실행 함수 호출
3. 실행 결과 반환

또한 `validateAction` 함수를 통해 액션 구성의 유효성을 미리 검사할 수 있습니다.

## 액션 오류 처리

모든 액션 실행 함수는 다음과 같은 형식의 결과 객체를 반환합니다:

```javascript
{
  success: true|false,     // 액션 성공 여부
  message: "결과 메시지",    // 상태 설명 메시지
  // 액션 유형별 추가 정보
}
```

오류 발생 시에는 다음과 같은 형식의 결과 객체가 반환됩니다:

```javascript
{
  success: false,
  message: "오류 메시지",
  error: errorObject      // 원본 오류 객체
}
```

## 액션 확장

새로운 액션 유형을 추가하려면:

1. `src/main/actions/` 디렉토리에 새 액션 핸들러 모듈 생성
2. `src/main/executor.js`의 `executeAction` 함수에 새 액션 타입 처리 추가
3. 액션 유효성 검사를 위해 `validateAction` 함수 업데이트
