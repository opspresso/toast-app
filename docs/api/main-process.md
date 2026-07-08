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
 * 첫 실행 시 기본 !email 스니펫 시드 (기기당 1회, 기존 스니펫은 보존)
 * @param {Store} config - 구성 저장소 인스턴스
 * @param {string} [loginEmail] - 로그인 이메일 (없으면 email@toast.sh)
 */
function seedDefaultSnippets(config, loginEmail)

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

/**
 * 구독 데이터 정제 (불필요한 필드 제거)
 * @param {Object} subscription - 구독 데이터
 * @returns {Object} 정제된 구독 데이터
 */
function sanitizeSubscription(subscription)

/**
 * 기기 ID 가져오기 (없으면 생성)
 * @returns {string} 기기 ID
 */
function getDeviceId()

/**
 * 데이터 해시 생성 (동기화 충돌 감지용)
 * @param {Object} data - 해시할 데이터
 * @returns {string} 해시 문자열
 */
function generateDataHash(data)

/**
 * 동기화 메타데이터 업데이트
 * @param {Store} config - 구성 저장소 인스턴스
 * @param {Object} metadata - 메타데이터 객체
 */
function updateSyncMetadata(config, metadata)

/**
 * 로컬 수정 상태로 표시
 * @param {Store} config - 구성 저장소 인스턴스
 * @param {string} deviceId - 기기 ID
 */
function markAsModified(config, deviceId)

/**
 * 동기화 완료 상태로 표시
 * @param {Store} config - 구성 저장소 인스턴스
 * @param {string} deviceId - 기기 ID
 */
function markAsSynced(config, deviceId)

/**
 * 동기화되지 않은 변경사항 확인
 * @param {Store} config - 구성 저장소 인스턴스
 * @returns {boolean} 동기화되지 않은 변경사항 존재 여부
 */
function hasUnsyncedChanges(config)

/**
 * 충돌 상태로 표시
 * @param {Store} config - 구성 저장소 인스턴스
 */
function markAsConflicted(config)

/**
 * 동기화 메타데이터 가져오기
 * @param {Store} config - 구성 저장소 인스턴스
 * @returns {Object} 동기화 메타데이터
 */
function getSyncMetadata(config)
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
```

`createLogger(namespace)`가 반환하는 로거 객체는 `info`, `warn`, `error`, `debug`, `verbose`, `silly` 메서드를 제공합니다.

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

실행기 모듈은 액션 실행을 처리합니다. `chain` 액션의 순차 실행 로직은 `src/main/actions/chain.js` 에 분리되어 있으며, `executor.js` 는 `action.action` 값에 따라 해당 핸들러로 디스패치합니다.

### 함수

```javascript
/**
 * 유형에 따라 액션 실행
 * @param {Object} action - 액션 구성
 * @returns {Promise<Object>} 결과 객체
 */
async function executeAction(action)

/**
 * 실행하지 않고 액션 유효성 검사
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
 * 설정 윈도우 생성
 * @param {Object} config - 구성 저장소
 * @returns {BrowserWindow} 설정 윈도우
 */
function createSettingsWindow(config)

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
 * @param {string} [tabName] - 초기 선택할 탭 이름 (선택)
 * @returns {BrowserWindow} 설정 윈도우
 */
function showSettingsWindow(config, tabName)

/**
 * Toast 윈도우가 표시될 디스플레이에 맞춰 설정 윈도우 위치 조정
 * @param {BrowserWindow} settingsWindow - 설정 윈도우
 */
function positionSettingsWindowOnToastDisplay(settingsWindow)

/**
 * 모든 윈도우 닫기
 */
function closeAllWindows()
```

`windows` 객체(`toast`, `settings` 참조)도 export 되어 다른 모듈에서 직접 접근할 수 있습니다.

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

`src/main/ipc.js`는 IPC 핸들러 등록을 조율하는 오케스트레이터이며, 실제 핸들러는 도메인별로 `src/main/ipc/` 하위 모듈에 나뉘어 있습니다.

| 하위 모듈 | 담당 채널 |
|-----------|-----------|
| `ipc/window.js` | 윈도우 표시/숨김, 모달 상태, alwaysOnTop, 앱 재시작/종료 |
| `ipc/config.js` | 구성 CRUD, 가져오기/내보내기, 재설정 |
| `ipc/actions.js` | 액션 실행/검증/테스트 |
| `ipc/auth.js` | 로그인/로그아웃, 토큰, 프로필/구독 조회 |
| `ipc/cloud-sync.js` | 동기화 상태, 수동 동기화, 클라우드 동기화 활성화 |
| `ipc/snippets.js` | 텍스트 확장 상태/권한/토글, 스니펫 저장·검증 (`text-expander:get-status`, `text-expander:request-permission`, `text-expander:open-privacy-settings`, `text-expander:set-enabled`, `text-expander:save-snippets`, `text-expander:validate-snippet`) |
| `ipc/updater.js` | 업데이트 확인/다운로드/설치 |
| `ipc/system.js` | URL 열기, 대화 상자, 로깅, 아이콘 추출, 경로 변환, 단축키 임시 제어 |

### 함수

```javascript
/**
 * IPC 핸들러 설정 (하위 모듈의 setup 함수들을 호출)
 * @param {Object} windows - 애플리케이션 윈도우를 포함하는 객체
 */
function setupIpcHandlers(windows)
```

### IPC 채널

#### 액션 관련

| 채널 | 유형 | 설명 |
|------|------|------|
| `execute-action` | handle | 액션 실행 |
| `validate-action` | handle | 액션 유효성 검사 |
| `test-action` | handle | 액션 테스트 (유효성 검사 후 실행) |

#### 구성 관련

| 채널 | 유형 | 설명 |
|------|------|------|
| `get-config` | handle | 구성 값 가져오기 (키 지정 또는 전체) |
| `set-config` | handle | 구성 값 설정 |
| `save-config` | handle | 특정 구성 변경 사항 저장 |
| `reset-config` | handle | 구성을 기본값으로 재설정 |
| `import-config` | handle | 파일에서 구성 가져오기 |
| `export-config` | handle | 파일로 구성 내보내기 |

#### 윈도우 관련

| 채널 | 유형 | 설명 |
|------|------|------|
| `show-toast` | on | Toast 윈도우 표시 |
| `hide-toast` | on | Toast 윈도우 숨기기 |
| `show-window` | handle | Toast 윈도우 표시 (handle 버전) |
| `show-settings` | on | 설정 윈도우 표시 |
| `show-settings-tab` | on | 특정 탭이 선택된 설정 윈도우 표시 |
| `close-settings` | on | 설정 윈도우 닫기 |
| `modal-state-changed` | on | 모달 상태 변경 알림 |
| `is-modal-open` | handle | 모달 열림 상태 확인 |
| `set-always-on-top` | handle | 윈도우 alwaysOnTop 속성 설정 |
| `get-window-position` | handle | 현재 윈도우 위치 반환 |
| `hide-window-temporarily` | handle | 다이얼로그 표시를 위해 일시적으로 alwaysOnTop 비활성화 |
| `show-window-after-dialog` | handle | 다이얼로그 닫힌 후 alwaysOnTop 복원 |

#### 애플리케이션 관련

| 채널 | 유형 | 설명 |
|------|------|------|
| `restart-app` | on | 애플리케이션 재시작 |
| `quit-app` | on | 애플리케이션 종료 |
| `get-app-version` | handle | 앱 버전 가져오기 |
| `open-url` | handle | 외부 브라우저에서 URL 열기 |

#### 인증 관련

| 채널 | 유형 | 설명 |
|------|------|------|
| `initiate-login` | handle | 로그인 프로세스 시작 |
| `exchange-code-for-token` | handle | 인증 코드를 토큰으로 교환 |
| `logout` | handle | 로그아웃 |
| `fetch-user-profile` | handle | 사용자 프로필 정보 가져오기 |
| `get-user-settings` | handle | 사용자 설정 정보 가져오기 |
| `fetch-subscription` | handle | 구독 정보 가져오기 |
| `get-auth-token` | handle | 현재 인증 토큰 반환 |

#### 클라우드 동기화 관련

| 채널 | 유형 | 설명 |
|------|------|------|
| `get-sync-status` | handle | 동기화 상태 가져오기 |
| `set-cloud-sync-enabled` | handle | 클라우드 동기화 활성화/비활성화 |
| `manual-sync` | handle | 수동 동기화 (upload/download/resolve) |
| `debug-sync-status` | handle | 동기화 상태 디버그 정보 |
| `settings-synced` | on | 설정 동기화 완료 이벤트 전달 |

#### 단축키 관련

| 채널 | 유형 | 설명 |
|------|------|------|
| `temporarily-disable-shortcuts` | handle | 녹화를 위해 전역 단축키 일시적으로 비활성화 |
| `restore-shortcuts` | handle | 녹화 후 전역 단축키 복원 |

#### 대화 상자 관련

| 채널 | 유형 | 설명 |
|------|------|------|
| `show-open-dialog` | handle | 파일 열기 대화 상자 표시 |
| `show-save-dialog` | handle | 파일 저장 대화 상자 표시 |
| `show-message-box` | handle | 메시지 상자 표시 |

#### 업데이트 관련

| 채널 | 유형 | 설명 |
|------|------|------|
| `check-for-updates` | handle | 업데이트 확인 (silent 옵션 지원) |
| `check-latest-version` | handle | 최신 버전 확인 |
| `download-update` | handle | 업데이트 다운로드 |
| `download-auto-update` | handle | 자동 업데이트 다운로드 (확인 후 다운로드) |
| `download-manual-update` | handle | 수동 업데이트 다운로드 |
| `install-update` | handle | 업데이트 설치 |
| `install-auto-update` | handle | 자동 업데이트 설치 |

#### 로깅 관련

| 채널 | 유형 | 설명 |
|------|------|------|
| `log-info` | handle | 정보 로그 메시지 기록 |
| `log-warn` | handle | 경고 로그 메시지 기록 |
| `log-error` | handle | 오류 로그 메시지 기록 |
| `log-debug` | handle | 디버그 로그 메시지 기록 |

#### 유틸리티 관련

| 채널 | 유형 | 설명 |
|------|------|------|
| `extract-app-icon` | handle | 애플리케이션 경로에서 아이콘 추출 |
| `resolve-tilde-path` | handle | 틸드 경로를 절대 경로로 변환 |

#### 텍스트 확장 (스니펫) 관련

| 채널 | 유형 | 설명 |
|------|------|------|
| `text-expander:get-status` | handle | 텍스트 확장 상태·권한 조회 |
| `text-expander:request-permission` | handle | macOS 접근성 권한 요청 |
| `text-expander:open-privacy-settings` | handle | 시스템 개인정보 설정 열기 |
| `text-expander:set-enabled` | handle | 텍스트 확장 활성화/비활성화 |
| `text-expander:save-snippets` | handle | 스니펫 목록 저장 |
| `text-expander:validate-snippet` | handle | 스니펫 키워드 유효성 검사 |

### 사용 예시

```javascript
const { setupIpcHandlers } = require('./main/ipc');

// IPC 핸들러 설정
setupIpcHandlers(windows);
```

## 인증 매니저 모듈 (`src/main/auth-manager.js`)

인증 매니저 모듈은 런타임 인증 처리의 진입점입니다. `src/main/ipc.js`의 모든 인증 관련 IPC는 이 모듈로 위임되며, 로그인/로그아웃 처리를 중앙화하고 Toast·설정 두 윈도우에 이벤트를 전달합니다. 토큰 발급·저장·갱신 같은 저수준 처리는 하위 계층인 `src/main/auth.js`에 위임합니다.

### 함수

```javascript
initiateLogin()                 // 로그인 프로세스 시작
exchangeCodeForToken(code)      // 인증 코드를 토큰으로 교환
logout()                        // 로그아웃
fetchUserProfile(forceRefresh)  // 사용자 프로필 가져오기
getUserSettings(forceRefresh)   // 사용자 설정 가져오기
fetchSubscription(forceRefresh) // 구독 정보 가져오기
getAccessToken()                // 액세스 토큰 반환
syncSettings(action)            // 설정 동기화 (upload/download/resolve)
updateSyncSettings(enabled)     // 클라우드 동기화 활성화/비활성화
```

### 이벤트 알림

두 윈도우에 인증/동기화 상태를 전달합니다:

```javascript
notifyLoginSuccess(subscription) // 로그인 성공 알림
notifyLoginError(errorMessage)   // 로그인 오류 알림
notifyLogout()                   // 로그아웃 알림
notifyAuthStateChange(authState) // 인증 상태 변경 알림
notifySettingsSynced(configData) // 설정 동기화 완료 알림
```

사용자 프로필·설정·구독 정보의 캐싱은 `src/main/user-data-manager.js`가 담당합니다.

## 인증 모듈 (`src/main/auth.js`)

인증 모듈은 OAuth 2.0 기반 사용자 인증의 저수준 계층으로, 토큰 발급·저장·갱신을 처리합니다. 런타임 진입점은 `auth-manager.js`이며, 일반적으로 이 모듈을 직접 호출하기보다 `auth-manager.js`를 통해 사용됩니다.

### 함수

```javascript
/**
 * 로그인 프로세스 시작 (외부 브라우저에서 OAuth 인증)
 * @returns {Promise<boolean>} 성공 시 true
 */
async function initiateLogin()

/**
 * 인증 코드를 토큰으로 교환
 * @param {string} code - 인증 코드
 * @returns {Promise<Object>} 토큰 정보
 */
async function exchangeCodeForToken(code)

/**
 * 인증 코드를 토큰으로 교환하고 구독 정보 업데이트
 * @param {string} code - 인증 코드
 * @returns {Promise<Object>} 토큰 및 구독 정보
 */
async function exchangeCodeForTokenAndUpdateSubscription(code)

/**
 * 사용자 프로필 정보 가져오기
 * @returns {Promise<Object>} 사용자 프로필
 */
async function fetchUserProfile()

/**
 * 구독 정보 가져오기
 * @returns {Promise<Object>} 구독 정보
 */
async function fetchSubscription()

/**
 * 로그아웃
 * @returns {Promise<boolean>} 성공 시 true, 실패 시 false
 */
async function logout()

/**
 * 유효한 토큰이 있는지 확인
 * @returns {Promise<boolean>} 토큰 유효 여부
 */
async function hasValidToken()

/**
 * 액세스 토큰 가져오기 (필요 시 자동 갱신)
 * @returns {Promise<string|null>} 액세스 토큰
 */
async function getAccessToken()

/**
 * 액세스 토큰 강제 갱신
 * @returns {Promise<string|null>} 새 액세스 토큰
 */
async function refreshAccessToken()

/**
 * 구독 상태에 따른 페이지 그룹 설정 업데이트
 * @param {Object} subscription - 구독 정보
 * @returns {Promise<void>}
 */
async function updatePageGroupSettings(subscription)

/**
 * 프로토콜 핸들러 등록 (`toast-app://` 스킴)
 */
function registerProtocolHandler()

/**
 * 프로토콜 리다이렉트(예: `toast-app://auth?code=...`) 처리
 * @param {string} url - 수신한 프로토콜 URL
 * @returns {Promise<Object>} 처리 결과
 */
async function handleAuthRedirect(url)
```

### 사용 예시

```javascript
const auth = require('./main/auth');

// 로그인 시작
await auth.initiateLogin();

// 토큰 유효성 확인
if (await auth.hasValidToken()) {
  const profile = await auth.fetchUserProfile();
  console.log('User:', profile.name);
}

// 로그아웃
await auth.logout();
```

## 클라우드 동기화 모듈 (`src/main/cloud-sync.js`)

클라우드 동기화 모듈은 설정 데이터의 서버 동기화를 처리합니다.

### 함수

```javascript
/**
 * 클라우드 동기화 초기화
 * @param {Object} authManagerInstance - 인증 매니저 인스턴스
 * @param {Object} _userDataManagerInstance - 사용자 데이터 매니저 인스턴스 (예약)
 * @param {Object} [configStoreInstance] - 구성 저장소 (없으면 새로 생성)
 * @returns {Object} 동기화 관리 객체
 */
function initCloudSync(authManagerInstance, _userDataManagerInstance, configStoreInstance)

/**
 * 인증 매니저 교체
 * @param {Object} manager - 인증 매니저 인스턴스
 */
function setAuthManager(manager)

/**
 * 주기적 동기화 시작
 */
function startPeriodicSync()

/**
 * 주기적 동기화 중지
 */
function stopPeriodicSync()

/**
 * 설정을 서버에 업로드
 * @returns {Promise<Object>} 업로드 결과
 */
async function uploadSettings()

/**
 * 서버에서 설정 다운로드
 * @returns {Promise<Object>} 다운로드 결과
 */
async function downloadSettings()

/**
 * 동기화 실행 (충돌 해결 포함)
 * @param {string} [action='resolve'] - 'upload' | 'download' | 'resolve'
 * @returns {Promise<Object>} 동기화 결과
 */
async function syncSettings(action)

/**
 * 클라우드 동기화 활성화 / 비활성화
 * @param {boolean} enabled
 */
function updateCloudSyncSettings(enabled)
```

### 동기화 설정

- **주기적 동기화 간격**: 15분 (`SYNC_INTERVAL_MS`)
- **Debounce 시간**: 5초 (`SYNC_DEBOUNCE_MS`)
- **최대 재시도 횟수**: 3회 (`MAX_RETRY_COUNT`)
- **재시도 예외**: `pages`와 `snippets`가 모두 빈 업로드는 건너뜀(재시도 없음), `400`은 재시도 안 함, `409`는 서버 데이터와 병합 후 재업로드(`reconcileStaleUpload`)

### 사용 예시

```javascript
const { initCloudSync, syncSettings, updateCloudSyncSettings } = require('./main/cloud-sync');

// 클라우드 동기화 초기화
const syncManager = initCloudSync(authManager, userDataManager, config);

// 수동 동기화 (resolve: 충돌 자동 해결)
const result = await syncSettings('resolve');
console.log('Sync result:', result);

// 클라우드 동기화 비활성화
updateCloudSyncSettings(false);
```

## 충돌 해결 모듈 (`src/main/cloud-sync/conflict-resolver.js`)

동기화 충돌 분석과 섹션별 병합 정책을 담당하는 순수 로직 모듈입니다. `cloud-sync.js`가 충돌 해결 시 이 모듈을 사용합니다.

```javascript
/**
 * 충돌 분석 및 해결 전략 결정 (upload_local / download_server / merge_required / no_action)
 * @param {Object} localMeta - 로컬 메타데이터
 * @param {Object} serverMeta - 서버 메타데이터
 * @param {boolean} hasLocalChanges - 로컬 변경사항 존재 여부
 * @returns {Object} { action, reason }
 */
function analyzeConflict(localMeta, serverMeta, hasLocalChanges)

/**
 * 페이지 병합 — 로컬 우선 (사용자 수정 내용 보존).
 * 로컬 페이지의 버튼이 비어 있고 이름이 같은 서버 페이지에 버튼이 있으면 서버 버전 유지
 */
function mergePages(localPages, serverPages)

/**
 * 스니펫 병합 — keyword 기준 로컬 우선, 서버 전용 keyword 는 뒤에 보존
 */
function mergeSnippets(localSnippets, serverSnippets)

/**
 * 외관 설정 병합 — 로컬 값 우선
 */
function mergeAppearance(localAppearance, serverAppearance)

/**
 * 고급 설정 병합 — 로컬 값 우선
 */
function mergeAdvanced(localAdvanced, serverAdvanced)
```

## 액션 승인 모듈 (`src/main/action-approval.js`)

클라우드 동기화로 내려받은 `exec`/`script` 액션과 실행 인자(`applicationParameters`)가 있는 `application` 액션을 기기별로 1회 사용자 승인 후에만 실행하도록 보호합니다. 로컬에서 생성·편집한 액션은 신뢰 처리되며, 원격 데이터에서 처음 나타난 위험 액션만 승인 대기 목록에 오릅니다. 신뢰 목록·대기 목록의 fingerprint 는 config `security` 키에 저장되며 **기기 로컬 전용**(클라우드 업로드 대상 아님)입니다.

```javascript
/**
 * 위험 액션(exec/script, 인자 있는 application)의 안정적 fingerprint 계산 (실행에 영향을 주는 필드만 해시)
 * @returns {string|null} sha256 hex, 비위험 액션이면 null
 */
function computeFingerprint(action)

/**
 * 승인 모듈 초기화. 최초 실행 시 로컬 구성의 기존 위험 액션을 모두 신뢰 목록에 시드
 * @param {Object} configStore
 * @param {Object} [windows] - 다이얼로그 부모로 사용할 창 참조
 */
function initializeApprovals(configStore, windows)

/**
 * 원격 동기화 데이터의 위험 액션을 승인 대기열에 등록 (저장 직전 호출)
 */
function recordRemoteChanges(configStore, incomingPages)

/**
 * 로컬 저장 시 현재 구성의 위험 액션을 신뢰 처리 (대기 중 fingerprint 는 제외)
 */
function trustCurrentConfig(configStore)

/**
 * 실행 직전 승인 확인. 대기 목록에 있는 액션만 확인 다이얼로그를 띄우고, 그 외는 허용
 * @returns {Promise<{approved: boolean, reason?: string}>}
 */
async function ensureApproved(action)

/**
 * 원격 페이지 저장 전 검증. 모든 버튼 액션이 executor 검증을 통과해야 하며, 실패 항목은 제거.
 * 빈 슬롯 버튼(자리표시자)은 검증 없이 보존
 * @returns {Promise<Array>} 유효하지 않은 액션이 제거된 페이지
 */
async function sanitizeRemotePages(pages)
```

## 구독 헬퍼 모듈 (`src/main/subscription.js`)

구독 정보에서 파생되는 판정 로직을 한곳에 모은 모듈입니다.

```javascript
/**
 * 구독 활성 여부 (active / is_subscribed / isSubscribed 별칭 모두 허용)
 */
function isSubscriptionActive(subscription)

/**
 * 구독에 따른 페이지 그룹 수 계산 (익명 1 / 인증 3 / 프리미엄·VIP 9)
 */
function calculatePageGroups(subscription)

/**
 * 만료 값을 스키마용 문자열로 정규화
 */
function normalizeExpiryString(value)

/**
 * 로그인 시점 규칙 — cloud_sync 기능을 부여·저장할지 결정 (활성 구독자는 기본 부여)
 */
function determineCloudSyncFeature(subscription, options)

/**
 * 동기화 시점 규칙 — 저장된 구독 데이터를 재검증 (활성 구독 + 기능 플래그 또는 premium/VIP 플랜)
 */
function isCloudSyncAllowed(subscription, options)
```

## 브로드캐스트 유틸 (`src/main/broadcast.js`)

Toast·설정 두 창에 동일한 이벤트를 전송하는 의존성 없는 헬퍼입니다. `windows.js`/IPC 의존 그래프를 끌어오지 않고 `auth-manager` 등에서 사용할 수 있도록 분리되어 있습니다.

```javascript
/**
 * 두 창에 이벤트 전송 (파괴된 창은 건너뜀)
 * @param {Object} windowsRef - { toast, settings }
 * @param {string} channel - IPC 채널 이름
 * @param {*} payload - 이벤트 페이로드
 */
function broadcastToWindows(windowsRef, channel, payload)
```

## API 클라이언트 모듈 (`src/main/api/client.js`)

API 클라이언트 모듈은 Toast 서버와의 HTTP 통신을 처리합니다.

### 함수

```javascript
/**
 * API 클라이언트 생성
 * @param {Object} options - 클라이언트 옵션
 * @returns {Object} API 클라이언트 인스턴스
 */
function createApiClient(options)

/**
 * 액세스 토큰 설정
 * @param {string} token - 액세스 토큰
 */
function setAccessToken(token)

/**
 * 리프레시 토큰 설정
 * @param {string} token - 리프레시 토큰
 */
function setRefreshToken(token)

/**
 * 현재 액세스 토큰 가져오기
 * @returns {string|null} 액세스 토큰
 */
function getAccessToken()

/**
 * 현재 리프레시 토큰 가져오기
 * @returns {string|null} 리프레시 토큰
 */
function getRefreshToken()

/**
 * 토큰 초기화
 */
function clearTokens()

/**
 * 인증 헤더 가져오기
 * @returns {Object} 인증 헤더 객체
 */
function getAuthHeaders()

/**
 * 인증된 요청 실행
 * @param {Function} apiCall - 실제 API 호출을 수행하는 콜백 (인자 없이 호출됨, 예: `() => client.get(url)`)
 * @param {Object} [options] - 옵션 (allowUnauthenticated, defaultValue, isSubscriptionRequest, onUnauthorized)
 * @returns {Promise<Object>} 응답 데이터
 */
async function authenticatedRequest(apiCall, options)
```

### API 엔드포인트

`ENDPOINTS` 값은 `API_BASE_URL`을 기준으로 구성된 절대 URL입니다. `API_BASE_URL = ${TOAST_URL}/api`이며 `TOAST_URL` 기본값은 `https://app.toast.sh`입니다.

```javascript
const ENDPOINTS = {
  OAUTH_AUTHORIZE: `${API_BASE_URL}/oauth/authorize`,
  OAUTH_TOKEN: `${API_BASE_URL}/oauth/token`,
  OAUTH_REVOKE: `${API_BASE_URL}/oauth/revoke`,
  USER_PROFILE: `${API_BASE_URL}/users/profile`,
  SETTINGS: `${API_BASE_URL}/users/settings`,
  USER_ICONS: `${API_BASE_URL}/users/icons`
};
```

### 사용 예시

```javascript
const { createApiClient, authenticatedRequest, ENDPOINTS } = require('./main/api/client');

// API 클라이언트 생성
const client = createApiClient();

// 인증된 요청 실행 (첫 번째 인자는 실제 호출을 수행하는 콜백)
const profile = await authenticatedRequest(() => client.get(ENDPOINTS.USER_PROFILE));
console.log('User profile:', profile);
