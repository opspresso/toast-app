# Toast 앱 액션 API

이 문서는 Toast 앱의 액션 모듈에 대한 API 문서를 제공합니다.

## 전체 액션 시스템 개요

Toast 앱은 `src/main/executor.js`에서 중앙 관리되는 5가지 액션 타입을 지원합니다:
1. **application** - 애플리케이션 실행
2. **exec** - 셸 명령 실행  
3. **open** - URL, 파일, 폴더 열기
4. **script** - 사용자 정의 스크립트 실행 (JavaScript, AppleScript, PowerShell, Bash)
5. **chain** - 여러 액션을 순차적으로 실행

액션 유효성 검사(`validateAction()`)는 `validate-action` 및 `test-action` IPC 경로에서 실행됩니다. 일반 실행(`execute-action`) 시에는 `validateAction()`이 호출되지 않으며, 각 액션 모듈이 실행 시점에 자체적으로 필수 필드를 검증합니다.

## Exec 액션 (`src/main/actions/exec.js`)

Exec 액션 모듈은 셸 명령 실행을 처리합니다. 공개 진입점은 `executeCommand(action)` 하나이며, 이 함수만 export 됩니다.

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
```

> `runInTerminal: true`일 때 터미널 실행은 내부 헬퍼(`openInTerminal`)로 처리됩니다. 이 헬퍼는 export 되지 않는 내부 구현입니다.

### 사용 예시

```javascript
// 명령 실행
const result = await executeCommand({
  command: 'echo "Hello World"',
  workingDir: '/Users/username/projects',
  runInTerminal: false
});

// 터미널에서 명령 실행
const terminalResult = await executeCommand({
  command: 'npm start',
  workingDir: '/Users/username/project',
  runInTerminal: true
});
```

## Open 액션 (`src/main/actions/open.js`)

Open 액션 모듈은 URL, 파일 및 폴더 열기를 처리합니다. 공개 진입점은 `openItem(action)` 하나이며, 이 함수만 export 됩니다.

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
```

> `openItem`은 입력에 따라 내부 헬퍼(`openUrl`, `openPath`, `openWithApplication`)로 위임합니다. 이 헬퍼들은 export 되지 않는 내부 구현입니다.

### 사용 예시

```javascript
// URL 열기
const urlResult = await openItem({
  url: 'https://github.com'
});

// 파일 열기
const fileResult = await openItem({
  path: '/Users/username/document.pdf'
});

// 특정 애플리케이션으로 파일 열기
const appResult = await openItem({
  path: '/Users/username/image.png',
  application: 'Preview'
});
```

## Script 액션 (`src/main/actions/script.js`)

Script 액션 모듈은 다양한 언어로 사용자 정의 스크립트 실행을 처리합니다. 공개 진입점은 `executeScript(action)` 하나이며, 이 함수만 export 됩니다.

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
```

> `executeScript`는 `scriptType` 값에 따라 내부 헬퍼(`executeJavaScript`, `executeAppleScript`, `executePowerShell`, `executeBash`)로 위임합니다. 이 헬퍼들은 export 되지 않는 내부 구현입니다.

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
    result = files.length + ' files found';
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
const paramResult = await executeScript({
  scriptType: 'javascript',
  script: 'result = `Hello ${params.name}!`;',
  scriptParams: { name: 'World' }
});
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
  success: true|false, // 전체 체인이 성공적으로 실행되었는지 여부 (하나라도 실패하면 false)
  message: "Chain executed successfully" | "Chain execution stopped due to an error" | "Chain completed with one or more errors",
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
      script: 'console.log("Step 3"); result = "Done";'
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
  stdout: '명령 표준 출력', // exec, script(AppleScript/PowerShell/Bash) 액션만
  stderr: '명령 표준 오류',  // exec, script(AppleScript/PowerShell/Bash) 액션만
  results: [],              // chain 액션만 (각 하위 액션의 결과 배열)
}
```

`application`, `open` 액션은 `success`와 `message`만 반환합니다. JavaScript 스크립트는 스크립트가 `result` 변수에 할당한 객체를 그대로 반환합니다.

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

1. **스크립트 실행 환경**: JavaScript 스크립트는 `vm` 컨텍스트에서 실행되지만 `require`(모든 내장 모듈), `Buffer`가 노출되어 시스템 수준 샌드박스가 아닙니다. 환경변수는 비민감 allowlist(`HOME`, `PATH` 등)만 전달됩니다. 신뢰할 수 있는 스크립트만 실행하세요.
2. **경로 검증**: 파일 및 애플리케이션 경로는 실행 전 검증. `open` 액션의 애플리케이션 실행은 셸을 거치지 않는 인자 배열(`execFile`) 방식으로 인젝션을 차단합니다.
3. **명령 이스케이프**: `exec` 액션의 `command`는 사용자가 정의한 셸 명령 그대로 실행되며, workingDir·AppleScript 인자만 이스케이프됩니다.
4. **원격 액션 승인**: 클라우드 동기화로 새로 내려받은 `exec`/`script` 액션과 실행 인자(`applicationParameters`)를 가진 `application` 액션은 이 기기에서 최초 실행 전 사용자 확인 다이얼로그를 거칩니다 (`src/main/action-approval.js`). 인자 없는 단순 앱 실행은 승인 대상이 아닙니다.

## 성능 최적화

1. **비동기 실행**: 모든 액션은 비동기적으로 실행
2. **리소스 관리**: 프로세스 및 파일 핸들 적절히 정리
3. **배치 처리**: 체인 액션에서 효율적인 순차 실행
