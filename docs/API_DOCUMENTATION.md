# Toast 앱 API 문서

이 문서는 Toast 앱의 내부 API에 대한 포괄적인 문서를 제공하며, 메인 프로세스 모듈, IPC 통신 및 렌더러 프로세스 인터페이스를 포함합니다.

## 메인 프로세스 API

### 구성 모듈 (`src/main/config.js`)

구성 모듈은 electron-store를 사용하여 구성 관리를 처리합니다.

#### 함수

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
function importConfig(config filePath)

/**
 * 파일로 구성 내보내기
 * @param {Store} config - 구성 저장소 인스턴스
 * @param {string} filePath - 구성 파일을 저장할 경로
 * @returns {boolean} 성공 상태
 */
function exportConfig(config, filePath)
```

#### 구성 스키마

```javascript
// 기본 구성 스키마 (src/main/config.js 기준)
const schema = {
  globalHotkey: {
    type: 'string',
    default: 'Alt+Space',
  },
  pages: {
    type: 'array',
    default: [],
  },
  appearance: {
    type: 'object',
    properties: {
      theme: {
        type: 'string',
        enum: ['light', 'dark', 'system'],
        default: 'system',
      },
      position: {
        type: 'string',
        enum: ['center', 'top', 'bottom', 'cursor'],
        default: 'center',
      },
      monitorPositions: {
        type: 'object',
        default: {},
        description: 'Saved window positions for each monitor',
      },
      size: {
        type: 'string',
        enum: ['small', 'medium', 'large'],
        default: 'medium',
      },
      opacity: {
        type: 'number',
        minimum: 0.1,
        maximum: 1.0,
        default: 0.95,
      },
      buttonLayout: {
        type: 'string',
        enum: ['grid', 'list'],
        default: 'grid',
      },
    },
    default: {
      theme: 'system',
      position: 'center',
      size: 'medium',
      opacity: 0.95,
      buttonLayout: 'grid',
    },
  },
  advanced: {
    type: 'object',
    properties: {
      launchAtLogin: {
        type: 'boolean',
        default: false,
      },
      hideAfterAction: {
        type: 'boolean',
        default: true,
      },
      hideOnBlur: {
        type: 'boolean',
        default: true,
      },
      hideOnEscape: {
        type: 'boolean',
        default: true,
      },
      showInTaskbar: {
        type: 'boolean',
        default: false,
      },
    },
    default: {
      launchAtLogin: false,
      hideAfterAction: true,
      hideOnBlur: true,
      hideOnEscape: true,
      showInTaskbar: false,
    },
  },
  subscription: {
    type: 'object',
    properties: {
      isSubscribed: { // 사용자가 구독 중인지 여부
        type: 'boolean',
        default: false,
      },
      isAuthenticated: { // 사용자 인증 상태
        type: 'boolean',
        default: false,
      },
      expiresAt: { // 구독 만료 날짜 (ISO 문자열)
        type: 'string',
        default: '',
      },
      pageGroups: { // 사용자가 생성할 수 있는 페이지 그룹의 최대 수
        type: 'number',
        default: 1,
        description:
          'Number of page groups: 1 for free users, 3 for authenticated users, 9 for subscribers',
      },
    },
    default: {
      isSubscribed: false,
      isAuthenticated: false,
      expiresAt: '',
      pageGroups: 1,
    },
  },
  firstLaunchCompleted: {
    type: 'boolean',
    default: false,
  },
};
```

#### 사용 예시

```javascript
const { createConfigStore resetToDefaults } = require('./main/config');

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

### 로거 모듈 (`src/main/logger.js`)

로거 모듈은 electron-log를 사용하여 애플리케이션 로깅을 관리합니다.

#### 함수

```javascript
/**
 * 특정 모듈용 로거 생성
 * @param {string} namespace - 로거의 네임스페이스(로그 소스 식별용)
 * @returns {Object} 로거 인스턴스
 */
function createLogger(namespace)

/**
 * IPC를 통한 렌더러 프로세스 로깅 처리
 * @param {string} level - 로그 레벨(info, warn, error, debug 등)
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

#### 상수 및 속성

```javascript
// 로그 레벨
const LOG_LEVELS = {
  ERROR: 'error',   // 오류만
  WARN: 'warn',     // 경고 및 오류
  INFO: 'info',     // 정보, 경고 및 오류(기본값)
  DEBUG: 'debug',   // 디버그 정보 포함
  VERBOSE: 'verbose', // 상세 정보 포함
  SILLY: 'silly'    // 가장 상세한 수준
};

// 로그 레벨 우선순위
const LOG_LEVEL_PRIORITIES = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
  verbose: 4,
  silly: 5
};

// electron-log 인스턴스
const electronLog = require('electron-log');
```

#### 로그 파일 위치

```javascript
// 각 플랫폼의 로그 파일 위치
// macOS: ~/Library/Logs/Toast/toast-app.log
// Windows: %USERPROFILE%\AppData\Roaming\Toast\logs\toast-app.log
// Linux: ~/.config/Toast/logs/toast-app.log
```

#### 사용 예시

```javascript
const { createLogger } = require('./main/logger');

// 모듈별 로거 생성
const logger = createLogger('MyModule');

// 로그 메시지 기록
logger.info('정보 메시지');
logger.warn('경고 메시지', { additionalData: 'details' });
logger.error('오류 발생', error);
logger.debug('디버깅 정보', { value: 42 });

// IPC 핸들러에서 렌더러 로깅 처리
ipcMain.handle('log-info', (event, message, ...args) => {
  return handleIpcLogging('info', message, ...args);
});

// 로그 파일 경로 가져오기
const logPath = getLogFilePath();
console.log(`로그 파일 위치: ${logPath}`);

// 로그 파일 내용 가져오기
const logContent = await getLogFileContent(100); // 최근 100줄
```

### 업데이터 모듈 (`src/main/updater.js`)

업데이터 모듈은 electron-updater를 사용하여 애플리케이션 자동 업데이트를 관리합니다.

#### 함수

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

#### 이벤트 및 상태

업데이터 모듈은 다음 이벤트를 발생시키고 창에 전달합니다:

```javascript
// 이벤트 유형
const UPDATE_EVENTS = {
  CHECKING: 'checking-for-update',     // 업데이트 확인 중
  AVAILABLE: 'update-available',       // 업데이트 사용 가능
  NOT_AVAILABLE: 'update-not-available', // 업데이트 없음
  PROGRESS: 'download-progress',       // 다운로드 진행 상황
  DOWNLOADED: 'update-downloaded',     // 다운로드 완료
  ERROR: 'update-error',               // 업데이트 오류
  START_DOWNLOAD: 'download-started',  // 다운로드 시작
  START_INSTALL: 'install-started'     // 설치 시작
};

// 상태 데이터 형식
const UPDATE_STATUS = {
  checking: { status: 'checking' },
  available: {
    status: 'available',
    info: {
      version: '1.2.3',
      releaseDate: '2023-01-01',
      releaseNotes: '버그 수정 및 성능 향상'
    }
  },
  notAvailable: {
    status: 'not-available',
    info: {
      version: '1.2.3',
      releaseDate: '2023-01-01'
    }
  },
  downloading: {
    status: 'downloading',
    progress: {
      percent: 45.3,
      bytesPerSecond: 1000000,
      transferred: 4500000,
      total: 10000000
    }
  },
  downloaded: {
    status: 'downloaded',
    info: {
      version: '1.2.3',
      releaseDate: '2023-01-01',
      releaseNotes: '버그 수정 및 성능 향상'
    }
  },
  error: {
    status: 'error',
    error: '오류 메시지'
  }
};
```

#### 결과 객체

```javascript
// checkForUpdates 결과
{
  success: true|false,
  updateInfo: {
    version: '1.2.3',
    releaseDate: '2023-01-01',
    releaseNotes: '버그 수정 및 성능 향상',
    // ...기타 업데이트 정보
  },
  versionInfo: {
    current: '1.2.0',
    latest: '1.2.3'
  },
  hasUpdate: true|false,
  error: '오류가 발생한 경우에만'
}

// downloadUpdate 결과
{
  success: true|false,
  message: '업데이트 다운로드가 시작되었습니다.',
  version: '1.2.3',
  error: '오류가 발생한 경우에만'
}

// installUpdate 결과
{
  success: true|false,
  error: '오류가 발생한 경우에만'
}
```

#### 사용 예시

```javascript
const { initAutoUpdater, checkForUpdates, downloadUpdate, installUpdate } = require('./main/updater');

// 자동 업데이트 초기화
initAutoUpdater(windows);

// 업데이트 확인 (silent 모드: false = 사용자에게 알림)
const result = await checkForUpdates(false);
if (result.success && result.hasUpdate) {
  console.log(`새 버전 사용 가능: ${result.versionInfo.latest}`);
}

// 업데이트 다운로드
const downloadResult = await downloadUpdate();
if (downloadResult.success) {
  console.log(`버전 ${downloadResult.version} 다운로드 시작`);
}

// 업데이트 설치
await installUpdate();
```

#### IPC에서 사용

```javascript
// IPC 핸들러
ipcMain.handle('check-for-updates', async (event, silent = false) => {
  return await updater.checkForUpdates(silent);
});

ipcMain.handle('download-update', async () => {
  return await updater.downloadUpdate();
});

ipcMain.handle('install-update', async () => {
  return await updater.installUpdate();
});
```

### 실행기 모듈 (`src/main/executor.js`)

실행기 모듈은 액션 실행을 처리합니다.

#### 함수

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

#### 지원되는 액션 유형

- `exec`: 셸 명령 실행
- `open`: URL, 파일 또는 폴더 열기
- `shortcut`: 키보드 단축키 실행
- `script`: 사용자 정의 스크립트 실행
- `chain`: 일련의 액션을 순차적으로 실행

#### 사용 예시

```javascript
const { executeAction validateAction } = require('./main/executor');

// 액션 유효성 검사
const validation = await validateAction({
  action: 'exec'
  command: 'echo "Hello world!"'
});

if (validation.valid) {
  // 액션 실행
  const result = await executeAction({
    action: 'exec'
    command: 'echo "Hello world!"'
  });

  console.log(result.success result.message);
}
```

### 단축키 모듈 (`src/main/shortcuts.js`)

단축키 모듈은 전역 키보드 단축키를 처리합니다.

#### 함수

```javascript
/**
 * 전역 단축키 등록
 * @param {Object} config - 구성 저장소
 * @param {Object} windows - 애플리케이션 윈도우를 포함하는 객체
 * @returns {boolean} 성공 상태
 */
function registerGlobalShortcuts(config windows)

/**
 * Toast 윈도우의 가시성 전환
 * @param {BrowserWindow} toastWindow - Toast 윈도우
 */
function toggleToastWindow(toastWindow)

/**
 * 구성에 따라 Toast 윈도우 위치 지정
 * @param {BrowserWindow} toastWindow - Toast 윈도우
 * @param {Object} [config] - 구성 저장소(선택 사항)
 */
function positionToastWindow(toastWindow config)

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

#### 위치 옵션

- `center`: 화면 중앙
- `top`: 화면 상단 중앙
- `bottom`: 화면 하단 중앙
- `cursor`: 커서 위치 근처

#### 사용 예시

```javascript
const { registerGlobalShortcuts unregisterGlobalShortcuts } = require('./main/shortcuts');

// 전역 단축키 등록
registerGlobalShortcuts(config windows);

// 전역 단축키 등록 해제
unregisterGlobalShortcuts();

// Toast 윈도우 위치 지정
positionToastWindow(windows.toast config);
```

### 트레이 모듈 (`src/main/tray.js`)

트레이 모듈은 시스템 트레이 아이콘과 메뉴를 처리합니다.

#### 함수

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
function updateTrayMenu(tray windows)

/**
 * 트레이 아이콘 제거
 */
function destroyTray()
```

#### 사용 예시

```javascript
const { createTray destroyTray } = require('./main/tray');

// 트레이 아이콘 생성
const tray = createTray(windows);

// 트레이 아이콘 제거
destroyTray();
```

### 윈도우 모듈 (`src/main/windows.js`)

윈도우 모듈은 윈도우 생성 및 관리를 처리합니다.

#### 함수

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
function setupToastWindowEvents(toastWindow config)

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

#### 윈도우 속성

- **Toast 윈도우 속성**: `frame` `transparent` `resizable` `skipTaskbar` `alwaysOnTop`
- **설정 윈도우 속성**: `minWidth` `minHeight` `contextIsolation` `nodeIntegration`

#### 윈도우 크기 옵션

- `small`: 500x350 픽셀
- `medium`: 700x500 픽셀
- `large`: 800x550 픽셀

#### 사용 예시

```javascript
const { createToastWindow showToastWindow hideToastWindow } = require('./main/windows');

// Toast 윈도우 생성
const toastWindow = createToastWindow(config);

// Toast 윈도우 표시
showToastWindow(config);

// Toast 윈도우 숨기기
hideToastWindow();
```

### IPC 모듈 (`src/main/ipc.js`)

IPC 모듈은 메인 프로세스와 렌더러 프로세스 간의 프로세스 간 통신을 처리합니다.

#### 함수

```javascript
/**
 * IPC 핸들러 설정
 * @param {Object} windows - 애플리케이션 윈도우를 포함하는 객체
 */
function setupIpcHandlers(windows)
```

#### IPC 채널

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

#### 사용 예시

```javascript
const { setupIpcHandlers } = require('./main/ipc');

// IPC 핸들러 설정
setupIpcHandlers(windows);
```

## 액션 모듈

### Exec 액션 (`src/main/actions/exec.js`)

Exec 액션 모듈은 셸 명령 실행을 처리합니다.

#### 함수

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
async function openInTerminal(command workingDir)
```

### Open 액션 (`src/main/actions/open.js`)

Open 액션 모듈은 URL, 파일 및 폴더 열기를 처리합니다.

#### 함수

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
async function openPath(itemPath application)

/**
 * 특정 애플리케이션으로 파일 열기
 * @param {string} filePath - 파일 경로
 * @param {string} application - 사용할 애플리케이션
 * @returns {Promise<Object>} 결과 객체
 */
async function openWithApplication(filePath application)
```

### Shortcut 액션 (`src/main/actions/shortcut.js`)

Shortcut 액션 모듈은 시스템에 키보드 단축키를 보내는 것을 처리합니다.

#### 함수

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

### Script 액션 (`src/main/actions/script.js`)

Script 액션 모듈은 다양한 언어로 사용자 정의 스크립트 실행을 처리합니다.

#### 함수

```javascript
/**
 * 사용자 정의 스크립트 실행
 * @param {Object} action - 액션 구성
 * @param {string} action.script - 스크립트 내용
 * @param {string} action.scriptType - 스크립트 언어(javascript, applescript, powershell, bash)
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
async function executeJavaScript(script params)

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

### Chain 액션 (`src/main/actions/chain.js`)

Chain 액션 모듈은 일련의 액션을 순차적으로 실행하는 것을 처리합니다.

#### 함수

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

#### 체인 액션 결과

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
    },
    // 더 많은 액션 결과...
  ]
}
```

`stopOnError` 속성이 `true`(기본값)로 설정되면 액션이 실패할 때 체인 실행이 중지됩니다. 그렇지 않으면 이전 실패에 관계없이 체인의 모든 액션이 실행됩니다.

#### 체인 액션 예시

```javascript
// 액션 체인 실행
const chainResult = await executeAction({
  action: 'chain',
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
      action: 'shortcut',
      keys: 'Ctrl+C'
    }
  ],
  stopOnError: true
});

console.log(chainResult.success, chainResult.message);
// 개별 액션 결과 접근
chainResult.results.forEach(result => {
  console.log(`Action ${result.index}: ${result.result.success ? 'Success' : 'Failed'}`);
});
```

## 렌더러 프로세스 API

### Toast 윈도우 API (`src/renderer/preload/toast.js`)

Toast 윈도우 API는 Toast 윈도우가 메인 프로세스와 통신하기 위한 인터페이스를 제공합니다.

#### 메서드

```javascript
// 구성
window.toast.getConfig(key) // 구성 가져오기

// 액션
window.toast.executeAction(action) // 액션 실행

// 윈도우 제어
window.toast.hideWindow() // Toast 윈도우 숨기기
window.toast.showSettings() // 설정 윈도우 표시

// 플랫폼 정보
window.toast.platform // 플랫폼(darwin, win32, linux)

// 구성 저장
window.toast.saveConfig(config) // 구성 변경 사항 저장

// 이벤트
window.toast.onConfigUpdated(callback) // 구성 업데이트 수신
```

#### 이벤트

```javascript
// 구성 로드 이벤트
window.addEventListener('config-loaded' (event) => {
  const config = event.detail;
  // detail에는 다음이 포함됩니다: pages, appearance, subscription
});

// 윈도우 숨기기 전 이벤트
window.addEventListener('before-window-hide' () => {
  // 윈도우가 숨겨지기 전에 정리
});
```

#### 사용 예시

```javascript
// 구성 가져오기
const pages = await window.toast.getConfig('pages');

// 액션 실행
const result = await window.toast.executeAction({
  action: 'exec'
  command: 'echo "Hello world!"'
});

// 구성 저장(예: 페이지 업데이트)
await window.toast.saveConfig({ pages: updatedPages });

// 윈도우 숨기기
window.toast.hideWindow();

// 구성 업데이트 수신
const removeListener = window.toast.onConfigUpdated((config) => {
  console.log('Configuration updated:' config);
});

// 플랫폼별 동작을 위한 플랫폼 확인
if (window.toast.platform === 'darwin') {
  // macOS 특정 코드
} else if (window.toast.platform === 'win32') {
  // Windows 특정 코드
}
```

### 설정 윈도우 API (`src/renderer/preload/settings.js`)

설정 윈도우 API는 설정 윈도우가 메인 프로세스와 통신하기 위한 인터페이스를 제공합니다.

#### 메서드

```javascript
// 구성
window.settings.getConfig(key) // 구성 가져오기
window.settings.setConfig(key value) // 구성 설정
window.settings.resetConfig() // 구성을 기본값으로 재설정
window.settings.importConfig(filePath) // 파일에서 구성 가져오기
window.settings.exportConfig(filePath) // 파일로 구성 내보내기

// 액션
window.settings.testAction(action) // 액션 테스트
window.settings.validateAction(action) // 액션 유효성 검사

// 윈도우 제어
window.settings.showToast() // Toast 윈도우 표시
window.settings.closeWindow() // 설정 윈도우 닫기

// 대화 상자
window.settings.showOpenDialog(options) // 파일 열기 대화 상자 표시
window.settings.showSaveDialog(options) // 파일 저장 대화 상자 표시
window.settings.showMessageBox(options) // 메시지 상자 표시

// 앱 제어
window.settings.restartApp() // 애플리케이션 재시작
window.settings.quitApp() // 애플리케이션 종료

// 단축키 제어(녹화용)
window.settings.temporarilyDisableShortcuts() // 전역 단축키 일시적으로 비활성화
window.settings.restoreShortcuts() // 전역 단축키 복원

// 시스템 정보
window.settings.getPlatform() // 플랫폼 가져오기(darwin, win32, linux)
window.settings.getVersion() // 애플리케이션 버전 가져오기

// 업데이트 관련 메서드
window.settings.checkForUpdates(silent) // 업데이트 확인
window.settings.downloadUpdate() // 업데이트 다운로드
window.settings.installUpdate() // 업데이트 설치

// 로깅 관련 메서드
window.settings.log.info(message, ...args) // 정보 로그 기록
window.settings.log.warn(message, ...args) // 경고 로그 기록
window.settings.log.error(message, ...args) // 오류 로그 기록
window.settings.log.debug(message, ...args) // 디버그 로그 기록
```

#### 이벤트

```javascript
// 구성 로드 이벤트
window.addEventListener('config-loaded' (event) => {
  const config = event.detail;
  // 전체 구성 객체 포함
});

// 업데이트 이벤트
window.addEventListener('checking-for-update', (event) => {
  // 업데이트 확인 중
});

window.addEventListener('update-available', (event) => {
  // 사용 가능한 업데이트가 있음
  const updateInfo = event.detail.info;
});

window.addEventListener('download-progress', (event) => {
  // 다운로드 진행 상황
  const progress = event.detail.progress;
});

window.addEventListener('update-downloaded', (event) => {
  // 업데이트 다운로드 완료
});
```

#### 사용 예시

```javascript
// 구성 가져오기
const config = await window.settings.getConfig();

// 구성 설정
await window.settings.setConfig('globalHotkey' 'Alt+Space');

// 액션 테스트
const result = await window.settings.testAction({
  action: 'exec'
  command: 'echo "Hello world!"'
});

// 파일 열기 대화 상자 표시
const result = await window.settings.showOpenDialog({
  properties: ['openFile']
});

// 녹화를 위해 단축키 일시적으로 비활성화
await window.settings.temporarilyDisableShortcuts();

// 여기서 단축키 녹화...

// 단축키 복원
await window.settings.restoreShortcuts();

// 메시지 상자 표시
await window.settings.showMessageBox({
  type: 'info'
  title: '정보'
  message: '이것은 정보 메시지입니다'
  buttons: ['확인']
});

// 업데이트 확인
const updateResult = await window.settings.checkForUpdates(false);
if (updateResult.hasUpdate) {
  console.log(`새 버전 사용 가능: ${updateResult.versionInfo.latest}`);
}
```

## 결과 객체

많은 API 함수는 일관된 구조를 가진 결과 객체를 반환합니다:

### 성공 결과

```javascript
{
  success: true
  message: '작업이 성공적으로 완료되었습니다'
  // 작업별 추가 데이터
}
```

### 오류 결과

```javascript
{
  success: false
  message: '오류 메시지'
  error: errorObject // 원래 오류 객체 또는 문자열
  // 추가 오류 세부 정보
}
```

### 유효성 검사 결과

```javascript
{
  valid: true|false
  message: '유효하지 않은 경우 유효성 검사 메시지'
  error: errorObject // 해당되는 경우 원래 오류 객체 또는 문자열
}
```

## 페이지 및 버튼 구조

### 페이지 객체

```javascript
{
  name: "Applications" // 페이지의 표시 이름
  shortcut: "1" // 페이지에 접근하기 위한 키보드 단축키(1-9)
  buttons: [
    // 버튼 객체 배열
  ]
}
```

### 버튼 객체

```javascript
{
  name: "Terminal" // 버튼의 표시 이름
  shortcut: "T" // 키보드 단축키(단일 문자)
  icon: "⌨️" // 이모지 또는 아이콘
  action: "exec" // 액션 유형(exec, open, shortcut, script, chain)

  // 액션 유형에 따른 추가 속성:
  command: "open -a Terminal" // exec 액션용
  url: "https://example.com" // open 액션용
  keys: "Ctrl+C" // shortcut 액션용
  script: "console.log('Hello');" // script 액션용
  scriptType: "javascript" // script 액션용
  actions: [] // chain 액션용(액션 배열)
  stopOnError: true // chain 액션용
}
```

## 이벤트 시스템

애플리케이션은 여러 이벤트 시스템을 사용합니다:

### Electron IPC 이벤트

메인 프로세스와 렌더러 프로세스 간의 통신에 사용됩니다.

### DOM 이벤트

렌더러 프로세스 내의 통신에 사용됩니다.

#### 구성 로드 이벤트

```javascript
// Toast 윈도우에서
window.addEventListener('config-loaded' (event) => {
  const { pages appearance subscription } = event.detail;
  // 구성 처리
});

// 설정 윈도우에서
window.addEventListener('config-loaded' (event) => {
  const config = event.detail; // 전체 구성 객체
  // 구성 처리
});
```

#### 윈도우 숨기기 전 이벤트

```javascript
window.addEventListener('before-window-hide' () => {
  // 윈도우가 숨겨지기 전에 정리(예: 편집 모드 종료)
});
```

#### 업데이트 이벤트

```javascript
// 업데이트 확인 중
window.addEventListener('checking-for-update', (event) => {
  // UI에 로딩 표시
});

// 업데이트 사용 가능
window.addEventListener('update-available', (event) => {
  const updateInfo = event.detail.info;
  // 사용자에게 업데이트 알림
});

// 업데이트 다운로드 진행 상황
window.addEventListener('download-progress', (event) => {
  const percent = event.detail.progress.percent;
  // 진행 표시줄 업데이트
});

// 업데이트 다운로드 완료
window.addEventListener('update-downloaded', (event) => {
  // 사용자에게 설치 옵션 표시
});
```

## 오류 처리

모든 API 함수는 충돌을 방지하기 위한 오류 처리를 포함합니다:

1. **Try-Catch 블록**: 모든 비동기 함수는 오류를 처리하기 위해 try-catch 블록을 사용합니다.
2. **오류 객체**: 오류는 결과 객체의 일부로 반환됩니다.
3. **유효성 검사**: 입력은 처리 전에 유효성이 검사됩니다.
4. **기본값**: 입력이 누락되거나 유효하지 않은 경우 기본값이 사용됩니다.

## 보안 고려 사항

API는 여러 보안 조치를 구현합니다:

1. **컨텍스트 격리**: 렌더러 프로세스는 안전한 IPC를 위해 contextBridge를 사용합니다.
2. **입력 유효성 검사**: 모든 입력은 처리 전에 유효성이 검사됩니다.
3. **샌드박스 스크립트**: JavaScript 스크립트는 샌드박스 환경에서 실행됩니다.
4. **제한된 권한**: 필요한 API만 렌더러 프로세스에 노출됩니다.

## 플랫폼별 동작

일부 API는 플랫폼별 동작을 가집니다:

1. **단축키**: macOS(`Command`)와 Windows(`Ctrl`)에서 다른 수정자 키.
2. **파일 경로**: 다른 플랫폼에서 다른 경로 형식.
3. **스크립트 실행**: AppleScript는 macOS에서만, PowerShell은 Windows에서만.
4. **터미널 명령**: 다른 플랫폼에서 다른 터미널 명령.
5. **키보드 입력**: 영어 키보드 활성화는 플랫폼 간에 다릅니다.

## API 확장

새 기능으로 API를 확장하려면:

1. 적절한 디렉토리에 **새 모듈을 추가**합니다.
2. 모듈에서 **함수를 내보냅니다**.
3. 다른 모듈에서 함수를 **가져와서 사용**합니다.
4. 필요한 경우 IPC를 통해 **렌더러에 노출**합니다.
5. 이 문서에서 새 기능을 **문서화**합니다.

## 버전 관리

API는 의미적 버전 관리를 따릅니다:

1. **주 버전**: API의 호환성을 깨는 변경 사항.
2. **부 버전**: 호환성을 깨지 않는 새 기능.
3. **패치 버전**: 버그 수정 및 소소한 개선 사항.

## 사용 중단 정책

API 기능을 사용 중단할 때:

1. 문서에서 **사용 중단으로 표시**합니다.
2. 문서에서 **대안을 제공**합니다.
3. 사용 중단된 기능이 사용될 때 **경고를 기록**합니다.
4. 다음 주 버전에서 **제거**합니다.
