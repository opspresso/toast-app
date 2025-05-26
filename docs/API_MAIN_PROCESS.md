# Toast 앱 메인 프로세스 API

이 문서는 Toast 앱의 메인 프로세스 모듈에 대한 API 문서를 제공합니다.

## 구성 모듈 (`src/main/config.js`)

구성 모듈은 electron-store를 사용하여 구성 관리를 처리합니다.

### 함수

```javascript
/**
 * 구성 저장소 생성
 * @returns {Store} 구성 저장소 인스턴스
 */
function createConfigStore()

/**
 * 구성을 기본값으로 재설정
 * @param {Store} config - 구성 저장소 인스턴스
 */
function resetToDefaults(config)

/**
 * 파일에서 구성 가져오기
 * @param {Store} config - 구성 저장소 인스턴스
 * @param {string} filePath - 구성 파일 경로
 * @returns {boolean} 성공 상태
 */
function importConfig(config, filePath)

/**
 * 파일로 구성 내보내기
 * @param {Store} config - 구성 저장소 인스턴스
 * @param {string} filePath - 구성 파일을 저장할 경로
 * @returns {boolean} 성공 상태
 */
function exportConfig(config, filePath)
```

### 사용 예시

```javascript
const { createConfigStore, resetToDefaults } = require('./main/config');

// 구성 저장소 생성
const config = createConfigStore();

// 구성 값 가져오기
const globalHotkey = config.get('globalHotkey');

// 모든 페이지 가져오기
const pages = config.get('pages');

// 구성 값 설정
config.set('globalHotkey', 'Alt+Space');

// 기본값으로 재설정
resetToDefaults(config);
```

## 로거 모듈 (`src/main/logger.js`)

로거 모듈은 electron-log를 사용하여 애플리케이션 로깅을 관리합니다.

### 함수

```javascript
/**
 * 특정 모듈용 로거 생성
 * @param {string} namespace - 로거의 네임스페이스
 * @returns {Object} 로거 인스턴스
 */
function createLogger(namespace)

/**
 * IPC를 통한 렌더러 프로세스 로깅 처리
 * @param {string} level - 로그 레벨
 * @param {string} message - 로그 메시지
 * @param {...any} args - 추가 로그 인수
 * @returns {boolean} 성공 상태
 */
function handleIpcLogging(level, message, ...args)

/**
 * 로그 파일 경로 가져오기
 * @returns {string} 로그 파일 경로
 */
function getLogFilePath()

/**
 * 로그 파일 내용 가져오기
 * @param {number} [maxLines=1000] - 반환할 최대 줄 수
 * @returns {Promise<string>} 로그 파일 내용
 */
async function getLogFileContent(maxLines)
```

### 상수

```javascript
// 로그 레벨
const LOG_LEVELS = {
  ERROR: 'error',
  WARN: 'warn',
  INFO: 'info',
  DEBUG: 'debug',
  VERBOSE: 'verbose',
  SILLY: 'silly'
};
```

### 사용 예시

```javascript
const { createLogger } = require('./main/logger');

// 모듈별 로거 생성
const logger = createLogger('MyModule');

// 로그 메시지 기록
logger.info('정보 메시지');
logger.warn('경고 메시지', { additionalData: 'details' });
logger.error('오류 발생', error);
logger.debug('디버깅 정보', { value: 42 });
```

## 업데이터 모듈 (`src/main/updater.js`)

업데이터 모듈은 electron-updater를 사용하여 애플리케이션 자동 업데이트를 관리합니다.

### 함수

```javascript
/**
 * 자동 업데이트 초기화
 * @param {Object} windows - 애플리케이션 창 객체
 */
function initAutoUpdater(windows)

/**
 * 업데이트 확인
 * @param {boolean} [silent=false] - true이면 사용자에게 알림 없이 확인
 * @returns {Promise<Object>} 업데이트 확인 결과
 */
async function checkForUpdates(silent)

/**
 * 업데이트 다운로드
 * @returns {Promise<Object>} 다운로드 결과
 */
async function downloadUpdate()

/**
 * 다운로드된 업데이트 설치
 * @returns {Promise<Object>} 설치 결과
 */
async function installUpdate()
```

### 이벤트

```javascript
const UPDATE_EVENTS = {
  CHECKING: 'checking-for-update',
  AVAILABLE: 'update-available',
  NOT_AVAILABLE: 'update-not-available',
  PROGRESS: 'download-progress',
  DOWNLOADED: 'update-downloaded',
  ERROR: 'update-error',
  START_DOWNLOAD: 'download-started',
  START_INSTALL: 'install-started'
};
```

### 사용 예시

```javascript
const { initAutoUpdater, checkForUpdates } = require('./main/updater');

// 자동 업데이트 초기화
initAutoUpdater(windows);

// 업데이트 확인
const result = await checkForUpdates(false);
if (result.success && result.hasUpdate) {
  console.log(`새 버전 사용 가능: ${result.versionInfo.latest}`);
}
```

## 실행기 모듈 (`src/main/executor.js`)

실행기 모듈은 액션 실행을 처리합니다.

### 함수

```javascript
/**
 * 유형에 따라 액션 실행
 * @param {Object} action - 액션 구성
 * @returns {Promise<Object>} 결과 객체
 */
async function executeAction(action)

/**
 * 일련의 액션을 순차적으로 실행
 * @param {Object} chainAction - 체인 액션 구성
 * @param {Array} chainAction.actions - 실행할 액션 배열
 * @returns {Promise<Object>} 결과 객체
 */
async function executeChainedActions(chainAction)

/**
 * 실행하지 않고 액션 테스트
 * @param {Object} action - 액션 구성
 * @returns {Promise<Object>} 유효성 검사 결과
 */
async function validateAction(action)
```

### 지원되는 액션 유형

- `application`: 애플리케이션 실행
- `exec`: 셸 명령 실행
- `open`: URL, 파일 또는 폴더 열기
- `script`: 사용자 정의 스크립트 실행
- `chain`: 일련의 액션을 순차적으로 실행

### 사용 예시

```javascript
const { executeAction, validateAction } = require('./main/executor');

// 액션 유효성 검사
const validation = await validateAction({
  action: 'exec',
  command: 'echo "Hello world!"'
});

if (validation.valid) {
  // 액션 실행
  const result = await executeAction({
    action: 'exec',
    command: 'echo "Hello world!"'
  });

  console.log(result.success, result.message);
}
```

## 단축키 모듈 (`src/main/shortcuts.js`)

단축키 모듈은 전역 키보드 단축키를 처리합니다.

### 함수

```javascript
/**
 * 전역 단축키 등록
 * @param {Object} config - 구성 저장소
 * @param {Object} windows - 애플리케이션 윈도우를 포함하는 객체
 * @returns {boolean} 성공 상태
 */
function registerGlobalShortcuts(config, windows)

/**
 * Toast 윈도우의 가시성 전환
 * @param {BrowserWindow} toastWindow - Toast 윈도우
 */
function toggleToastWindow(toastWindow)

/**
 * 구성에 따라 Toast 윈도우 위치 지정
 * @param {BrowserWindow} toastWindow - Toast 윈도우
 * @param {Object} [config] - 구성 저장소
 */
function positionToastWindow(toastWindow, config)

/**
 * 모든 전역 단축키 등록 해제
 */
function unregisterGlobalShortcuts()

/**
 * 단축키가 등록되어 있는지 확인
 * @param {string} accelerator - 확인할 단축키
 * @returns {boolean} 단축키가 등록되어 있는지 여부
 */
function isShortcutRegistered(accelerator)
```

### 위치 옵션

- `center`: 화면 중앙
- `top`: 화면 상단 중앙
- `bottom`: 화면 하단 중앙
- `cursor`: 커서 위치 근처

### 사용 예시

```javascript
const { registerGlobalShortcuts, unregisterGlobalShortcuts } = require('./main/shortcuts');

// 전역 단축키 등록
registerGlobalShortcuts(config, windows);

// 전역 단축키 등록 해제
unregisterGlobalShortcuts();

// Toast 윈도우 위치 지정
positionToastWindow(windows.toast, config);
```

## 트레이 모듈 (`src/main/tray.js`)

트레이 모듈은 시스템 트레이 아이콘과 메뉴를 처리합니다.

### 함수

```javascript
/**
 * 시스템 트레이 아이콘 생성
 * @param {Object} windows - 애플리케이션 윈도우를 포함하는 객체
 * @returns {Tray} 트레이 인스턴스
 */
function createTray(windows)

/**
 * 트레이 메뉴 업데이트
 * @param {Tray} tray - 트레이 인스턴스
 * @param {Object} windows - 애플리케이션 윈도우를 포함하는 객체
 */
function updateTrayMenu(tray, windows)

/**
 * 트레이 아이콘 제거
 */
function destroyTray()
```

### 사용 예시

```javascript
const { createTray, destroyTray } = require('./main/tray');

// 트레이 아이콘 생성
const tray = createTray(windows);

// 트레이 아이콘 제거
destroyTray();
```

## 윈도우 모듈 (`src/main/windows.js`)

윈도우 모듈은 윈도우 생성 및 관리를 처리합니다.

### 함수

```javascript
/**
 * Toast 팝업 윈도우 생성
 * @param {Object} config - 구성 저장소
 * @returns {BrowserWindow} Toast 윈도우
 */
function createToastWindow(config)

/**
 * Toast 윈도우에 대한 이벤트 핸들러 설정
 * @param {BrowserWindow} toastWindow - Toast 윈도우
 * @param {Object} config - 구성 저장소
 */
function setupToastWindowEvents(toastWindow, config)

/**
 * 설정 윈도우 생성
 * @param {Object} config - 구성 저장소
 * @returns {BrowserWindow} 설정 윈도우
 */
function createSettingsWindow(config)

/**
 * 설정 윈도우에 대한 이벤트 핸들러 설정
 * @param {BrowserWindow} settingsWindow - 설정 윈도우
 */
function setupSettingsWindowEvents(settingsWindow)

/**
 * Toast 윈도우 표시
 * @param {Object} config - 구성 저장소
 */
function showToastWindow(config)

/**
 * Toast 윈도우 숨기기
 */
function hideToastWindow()

/**
 * 설정 윈도우 표시
 * @param {Object} config - 구성 저장소
 */
function showSettingsWindow(config)

/**
 * 모든 윈도우 닫기
 */
function closeAllWindows()
```

### 윈도우 크기 옵션

- `small`: 500x350 픽셀
- `medium`: 700x500 픽셀
- `large`: 800x550 픽셀

### 사용 예시

```javascript
const { createToastWindow, showToastWindow, hideToastWindow } = require('./main/windows');

// Toast 윈도우 생성
const toastWindow = createToastWindow(config);

// Toast 윈도우 표시
showToastWindow(config);

// Toast 윈도우 숨기기
hideToastWindow();
```

## IPC 모듈 (`src/main/ipc.js`)

IPC 모듈은 메인 프로세스와 렌더러 프로세스 간의 프로세스 간 통신을 처리합니다.

### 함수

```javascript
/**
 * IPC 핸들러 설정
 * @param {Object} windows - 애플리케이션 윈도우를 포함하는 객체
 */
function setupIpcHandlers(windows)
```

### IPC 채널

| 채널 | 유형 | 설명 |
|------|------|------|
| `execute-action` | handle | 액션 실행 |
| `validate-action` | handle | 액션 유효성 검사 |
| `get-config` | handle | 구성 가져오기 |
| `set-config` | handle | 구성 설정 |
| `save-config` | handle | 특정 구성 변경 사항 저장 |
| `reset-config` | handle | 구성을 기본값으로 재설정 |
| `import-config` | handle | 파일에서 구성 가져오기 |
| `export-config` | handle | 파일로 구성 내보내기 |
| `show-toast` | on | Toast 윈도우 표시 |
| `hide-toast` | on | Toast 윈도우 숨기기 |
| `show-settings` | on | 설정 윈도우 표시 |
| `close-settings` | on | 설정 윈도우 닫기 |
| `restart-app` | on | 애플리케이션 재시작 |
| `quit-app` | on | 애플리케이션 종료 |
| `temporarily-disable-shortcuts` | handle | 녹화를 위해 전역 단축키 일시적으로 비활성화 |
| `restore-shortcuts` | handle | 녹화 후 전역 단축키 복원 |
| `show-open-dialog` | handle | 파일 열기 대화 상자 표시 |
| `show-save-dialog` | handle | 파일 저장 대화 상자 표시 |
| `show-message-box` | handle | 메시지 상자 표시 |
| `test-action` | handle | 액션 테스트 |
| `check-for-updates` | handle | 업데이트 확인 |
| `download-update` | handle | 업데이트 다운로드 |
| `install-update` | handle | 업데이트 설치 |
| `log-info` | handle | 정보 로그 메시지 기록 |
| `log-warn` | handle | 경고 로그 메시지 기록 |
| `log-error` | handle | 오류 로그 메시지 기록 |
| `log-debug` | handle | 디버그 로그 메시지 기록 |

### 사용 예시

```javascript
const { setupIpcHandlers } = require('./main/ipc');

// IPC 핸들러 설정
setupIpcHandlers(windows);
