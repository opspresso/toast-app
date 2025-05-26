# Toast 앱 액션 API

이 문서는 Toast 앱의 액션 모듈에 대한 API 문서를 제공합니다.

## Exec 액션 (`src/main/actions/exec.js`)

Exec 액션 모듈은 셸 명령 실행을 처리합니다.

### 함수

```javascript
/**
 * 셸 명령 실행
 * @param {Object} action - 액션 구성
 * @param {string} action.command - 실행할 명령
 * @param {string} [action.workingDir] - 작업 디렉토리
 * @param {boolean} [action.runInTerminal] - 터미널에서 실행할지 여부
 * @returns {Promise<Object>} 결과 객체
 */
async function executeCommand(action)

/**
 * 터미널에서 명령 열기
 * @param {string} command - 실행할 명령
 * @param {string} [workingDir] - 작업 디렉토리
 * @returns {Promise<Object>} 결과 객체
 */
async function openInTerminal(command, workingDir)
```

### 사용 예시

```javascript
// 명령 실행
const result = await executeCommand({
  command: 'echo "Hello World"',
  workingDir: '/Users/username/projects',
  runInTerminal: false
});

// 터미널에서 명령 열기
const terminalResult = await openInTerminal('npm start', '/Users/username/project');
```

## Open 액션 (`src/main/actions/open.js`)

Open 액션 모듈은 URL, 파일 및 폴더 열기를 처리합니다.

### 함수

```javascript
/**
 * URL, 파일 또는 폴더 열기
 * @param {Object} action - 액션 구성
 * @param {string} [action.url] - 열 URL
 * @param {string} [action.path] - 열 파일 또는 폴더 경로
 * @param {string} [action.application] - 열기에 사용할 애플리케이션
 * @returns {Promise<Object>} 결과 객체
 */
async function openItem(action)

/**
 * 기본 브라우저에서 URL 열기
 * @param {string} url - 열 URL
 * @returns {Promise<Object>} 결과 객체
 */
async function openUrl(url)

/**
 * 파일 또는 폴더 열기
 * @param {string} itemPath - 파일 또는 폴더 경로
 * @param {string} [application] - 열기에 사용할 애플리케이션
 * @returns {Promise<Object>} 결과 객체
 */
async function openPath(itemPath, application)

/**
 * 특정 애플리케이션으로 파일 열기
 * @param {string} filePath - 파일 경로
 * @param {string} application - 사용할 애플리케이션
 * @returns {Promise<Object>} 결과 객체
 */
async function openWithApplication(filePath, application)
```

### 사용 예시

```javascript
// URL 열기
const urlResult = await openUrl('https://github.com');

// 파일 열기
const fileResult = await openPath('/Users/username/document.pdf');

// 특정 애플리케이션으로 파일 열기
const appResult = await openWithApplication('/Users/username/image.png', 'Preview');

// 액션 객체로 열기
const result = await openItem({
  url: 'https://example.com'
});
```

## Shortcut 액션 (`src/main/actions/shortcut.js`)

Shortcut 액션 모듈은 시스템에 키보드 단축키를 보내는 것을 처리합니다.

### 함수

```javascript
/**
 * 키보드 단축키 실행
 * @param {Object} action - 액션 구성
 * @param {string} action.keys - 실행할 키보드 단축키(예: "Ctrl+C")
 * @returns {Promise<Object>} 결과 객체
 */
async function executeShortcut(action)

/**
 * 단축키 문자열을 키 배열로 파싱
 * @param {string} shortcutString - 단축키 문자열(예: "Ctrl+Shift+A")
 * @returns {Array} 키 상수 배열
 */
function parseShortcut(shortcutString)

/**
 * 키 조합 누르기
 * @param {Array} keys - 키 상수 배열
 * @returns {Promise<void>}
 */
async function pressKeys(keys)
```

### 지원되는 키

- **수정자 키**: `Ctrl`, `Cmd`, `Alt`, `Shift`
- **기능 키**: `F1`-`F12`
- **특수 키**: `Enter`, `Space`, `Tab`, `Escape`, `Backspace`, `Delete`
- **화살표 키**: `Up`, `Down`, `Left`, `Right`
- **문자 및 숫자**: `A`-`Z`, `0`-`9`

### 사용 예시

```javascript
// 단축키 실행
const result = await executeShortcut({
  keys: 'Cmd+Shift+4'  // macOS 스크린샷
});

// Windows 단축키
const winResult = await executeShortcut({
  keys: 'Ctrl+Shift+Esc'  // 작업 관리자
});

// 키 조합 직접 누르기
const keys = parseShortcut('Ctrl+C');
await pressKeys(keys);
```

## Script 액션 (`src/main/actions/script.js`)

Script 액션 모듈은 다양한 언어로 사용자 정의 스크립트 실행을 처리합니다.

### 함수

```javascript
/**
 * 사용자 정의 스크립트 실행
 * @param {Object} action - 액션 구성
 * @param {string} action.script - 스크립트 내용
 * @param {string} action.scriptType - 스크립트 언어
 * @param {Object} [action.scriptParams] - 스크립트에 전달할 매개변수
 * @returns {Promise<Object>} 결과 객체
 */
async function executeScript(action)

/**
 * JavaScript 코드 실행
 * @param {string} script - JavaScript 코드
 * @param {Object} [params] - 스크립트에 전달할 매개변수
 * @returns {Promise<Object>} 결과 객체
 */
async function executeJavaScript(script, params)

/**
 * AppleScript 실행(macOS 전용)
 * @param {string} script - AppleScript 코드
 * @returns {Promise<Object>} 결과 객체
 */
async function executeAppleScript(script)

/**
 * PowerShell 스크립트 실행(Windows 전용)
 * @param {string} script - PowerShell 스크립트
 * @returns {Promise<Object>} 결과 객체
 */
async function executePowerShell(script)

/**
 * Bash 스크립트 실행(macOS/Linux 전용)
 * @param {string} script - Bash 스크립트
 * @returns {Promise<Object>} 결과 객체
 */
async function executeBash(script)
```

### 지원되는 스크립트 언어

- `javascript`: JavaScript (Node.js 환경)
- `applescript`: AppleScript (macOS 전용)
- `powershell`: PowerShell (Windows 전용)
- `bash`: Bash 스크립트 (macOS/Linux)

### 사용 예시

```javascript
// JavaScript 스크립트 실행
const jsResult = await executeScript({
  scriptType: 'javascript',
  script: `
    const fs = require('fs');
    const files = fs.readdirSync('.');
    return files.length + ' files found';
  `
});

// AppleScript 실행 (macOS)
const appleResult = await executeScript({
  scriptType: 'applescript',
  script: `
    tell application "Finder"
      activate
      make new Finder window
    end tell
  `
});

// PowerShell 실행 (Windows)
const psResult = await executeScript({
  scriptType: 'powershell',
  script: 'Get-Process | Where-Object {$_.ProcessName -eq "notepad"}'
});

// 매개변수와 함께 JavaScript 실행
const paramResult = await executeJavaScript(
  'return `Hello ${params.name}!`;',
  { name: 'World' }
);
```

## Chain 액션 (`src/main/actions/chain.js`)

Chain 액션 모듈은 일련의 액션을 순차적으로 실행하는 것을 처리합니다.

### 함수

```javascript
/**
 * 액션 체인을 순차적으로 실행
 * @param {Object} action - 체인 액션 구성
 * @param {Array} action.actions - 순차적으로 실행할 액션 배열
 * @param {boolean} [action.stopOnError=true] - 액션이 실패하면 실행을 중지할지 여부
 * @returns {Promise<Object>} 결과 객체
 */
async function executeChainedActions(action)
```

### 체인 액션 결과

체인 액션은 다음 구조를 가진 결과 객체를 반환합니다:

```javascript
{
  success: true|false, // 전체 체인이 성공적으로 실행되었는지 여부
  message: "Chain executed successfully" | "Chain execution stopped due to an error",
  results: [
    {
      index: 0, // 체인에서 액션의 인덱스
      action: {}, // 원래 액션 구성
      result: {} // 액션 실행 결과
    }
    // 더 많은 액션 결과...
  ]
}
```

### 사용 예시

```javascript
// 액션 체인 실행
const chainResult = await executeChainedActions({
  actions: [
    {
      action: 'exec',
      command: 'echo "Step 1"'
    },
    {
      action: 'open',
      url: 'https://example.com'
    },
    {
      action: 'script',
      scriptType: 'javascript',
      script: 'console.log("Step 3"); return "Done";'
    }
  ],
  stopOnError: true
});

// 결과 확인
console.log(chainResult.success, chainResult.message);

// 개별 액션 결과 접근
chainResult.results.forEach(result => {
  console.log(`Action ${result.index}: ${result.result.success ? 'Success' : 'Failed'}`);
});
```

## Application 액션 (`src/main/actions/application.js`)

Application 액션 모듈은 애플리케이션 실행을 처리합니다.

### 함수

```javascript
/**
 * 애플리케이션 실행
 * @param {Object} action - 액션 구성
 * @param {string} action.applicationPath - 애플리케이션 경로
 * @param {string} [action.applicationParameters] - 애플리케이션 매개변수
 * @returns {Promise<Object>} 결과 객체
 */
async function executeApplication(action)
```

### 사용 예시

```javascript
// macOS 애플리케이션 실행
const macResult = await executeApplication({
  applicationPath: '/Applications/Calculator.app'
});

// Windows 애플리케이션 실행
const winResult = await executeApplication({
  applicationPath: 'C:\\Program Files\\Notepad++\\notepad++.exe',
  applicationParameters: '--new-document'
});

// 매개변수와 함께 실행
const paramResult = await executeApplication({
  applicationPath: '/Applications/TextEdit.app',
  applicationParameters: '/Users/username/document.txt'
});
```

## 공통 결과 객체

모든 액션은 일관된 구조를 가진 결과 객체를 반환합니다:

### 성공 결과

```javascript
{
  success: true,
  message: '작업이 성공적으로 완료되었습니다',
  output: '명령 출력 또는 결과 데이터', // 해당되는 경우
  // 액션별 추가 데이터
}
```

### 오류 결과

```javascript
{
  success: false,
  message: '오류 메시지',
  error: errorObject, // 원래 오류 객체 또는 문자열
  // 추가 오류 세부 정보
}
```

## 오류 처리

모든 액션 모듈은 다음과 같은 오류 처리를 구현합니다:

1. **Try-Catch 블록**: 모든 비동기 함수는 오류를 처리하기 위해 try-catch 블록을 사용
2. **입력 유효성 검사**: 액션 매개변수는 실행 전에 유효성 검사
3. **플랫폼 호환성**: 플랫폼별 액션은 호환성 확인
4. **타임아웃 처리**: 장시간 실행되는 액션에 대한 타임아웃 설정

## 플랫폼별 고려사항

### macOS
- AppleScript 지원
- `.app` 번들 애플리케이션 경로
- `Cmd` 키 수정자 사용

### Windows
- PowerShell 지원
- `.exe` 실행 파일 경로
- `Ctrl` 키 수정자 사용

### Linux
- Bash 스크립트 지원
- 패키지 관리자별 애플리케이션 경로
- `Ctrl` 키 수정자 사용

## 보안 고려사항

1. **스크립트 샌드박스**: JavaScript 스크립트는 제한된 환경에서 실행
2. **경로 검증**: 파일 및 애플리케이션 경로는 실행 전 검증
3. **명령 이스케이프**: 셸 명령은 인젝션 공격 방지를 위해 이스케이프
4. **권한 확인**: 시스템 수준 작업은 적절한 권한 확인

## 성능 최적화

1. **비동기 실행**: 모든 액션은 비동기적으로 실행
2. **리소스 관리**: 프로세스 및 파일 핸들 적절히 정리
3. **캐싱**: 자주 사용되는 애플리케이션 경로 캐싱
4. **배치 처리**: 체인 액션에서 효율적인 순차 실행
