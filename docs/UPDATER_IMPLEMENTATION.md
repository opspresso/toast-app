# Toast App 업데이터 모듈 상세 분석 및 구현

이 문서는 Toast App의 업데이트 시스템을 담당하는 `updater.js` 모듈의 상세 분석과 구현에 대해 설명합니다.

## 목차

- [개요](#개요)
- [모듈 구조](#모듈-구조)
- [작동 원리](#작동-원리)
- [주요 함수 분석](#주요-함수-분석)
- [이벤트 핸들링](#이벤트-핸들링)
- [업데이트 프로세스 흐름](#업데이트-프로세스-흐름)
- [에러 핸들링](#에러-핸들링)
- [구현 시 고려사항](#구현-시-고려사항)

## 개요

Toast App의 자동 업데이트 시스템은 Electron 애플리케이션에서 널리 사용되는 `electron-updater` 라이브러리를 활용합니다. 업데이트 관리 모듈인 `updater.js`는 업데이트 확인, 다운로드, 설치 및 관련 이벤트 처리를 담당합니다.

## 모듈 구조

`updater.js`는 다음과 같은 핵심 요소로 구성됩니다:

```
updater.js
├── 모듈 의존성
├── 전역 변수 및 상태
├── 초기화 함수 (initAutoUpdater)
├── 이벤트 핸들러 설정 (setupAutoUpdaterEvents)
├── 업데이트 확인 (checkForUpdates)
├── 업데이트 다운로드 (downloadUpdate)
├── 업데이트 설치 (installUpdate)
└── 유틸리티 함수 (sendStatusToWindows)
```

### 모듈 의존성

```javascript
const { app } = require('electron');
const { autoUpdater } = require('electron-updater');
const { createLogger, electronLog } = require('./logger');
```

- `app`: Electron 앱 관련 API를 제공하는 모듈
- `autoUpdater`: electron-updater에서 제공하는 자동 업데이트 기능의 핵심 모듈
- `createLogger`, `electronLog`: 내부 로깅 시스템 모듈

### 전역 변수 및 상태

```javascript
// 모듈별 로거 생성
const logger = createLogger('Updater');

// 자동 업데이트 상태 이벤트를 전달하기 위한 변수들
let mainWindow = null;
let settingsWindow = null;
```

- `logger`: 'Updater' 접두사가 있는 로거 인스턴스로, 업데이트 관련 로그를 기록
- `mainWindow`, `settingsWindow`: 업데이트 이벤트를 전달할 창 객체 참조

## 작동 원리

Toast App의 업데이터 모듈은 다음과 같은 원리로 작동합니다:

1. **초기화**: 앱 시작 시 `initAutoUpdater` 함수가 호출되어 업데이터를 설정하고 초기화합니다.
2. **이벤트 연결**: `setupAutoUpdaterEvents` 함수가 호출되어 각종 업데이트 이벤트에 핸들러를 연결합니다.
3. **자동 업데이트 확인**: 앱 시작 후 일정 시간(5초) 후에 자동으로 업데이트를 확인합니다(개발 모드 제외).
4. **업데이트 흐름 관리**: 업데이트가 있을 경우, 사용자에게 알리고 다운로드 및 설치 과정을 관리합니다.

## 주요 함수 분석

### initAutoUpdater

```javascript
function initAutoUpdater(windows) {
  // 창 레퍼런스 저장
  mainWindow = windows.toast;
  settingsWindow = windows.settings;

  // autoUpdater에 로깅 함수 연결
  autoUpdater.logger = logger;

  // 앱 ID 명시적으로 설정 (electron-updater가 올바른 ID를 사용하도록)
  autoUpdater.appId = 'com.opspresso.toast-app';
  logger.info(`Setting explicit appId for electron-updater: ${autoUpdater.appId}`);

  // 개발 환경에서도 업데이트 확인 가능하도록 설정
  autoUpdater.forceDevUpdateConfig = true; // 개발 환경에서도 업데이트 확인 강제
  autoUpdater.allowDowngrade = true; // 다운그레이드 허용
  autoUpdater.allowPrerelease = true; // 프리릴리스 버전 허용

  // 자동 다운로드 비활성화 (사용자가 명시적으로 다운로드를 요청할 때만 다운로드)
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;

  // 업데이트 파일 관련 추가 설정
  autoUpdater.channel = 'latest';
  autoUpdater.allowPrerelease = false; // 프로덕션에서는 안정 버전만 사용

  // 자동 업데이트 이벤트 핸들링
  setupAutoUpdaterEvents();

  // IPC 핸들러 등록
  setupIpcHandlers();

  // 시작 시 업데이트 확인 (개발 환경에서는 실행하지 않음)
  if (process.env.NODE_ENV !== 'development') {
    // 앱이 시작되고 몇 초 후에 업데이트 확인 (초기화 시간 확보)
    setTimeout(() => {
      checkForUpdates(false);
    }, 5000);
  }
}
```

**기능 분석**:

- **창 객체 참조 저장**: 업데이트 관련 이벤트를 메인 창과 설정 창에 전달하기 위해 창 객체 참조를 저장합니다.
- **로깅 설정**: electron-updater의 로깅 시스템을 앱의 로거에 연결합니다.
- **appId 설정**: 정확한 업데이트 대상을 식별하기 위해 앱 ID를 명시적으로 설정합니다.
- **업데이트 동작 설정**:
  - `forceDevUpdateConfig`: 개발 환경에서도 업데이트를 확인할 수 있도록 합니다.
  - `allowDowngrade`: 다운그레이드를 허용합니다(테스트 용도).
  - `allowPrerelease`: 개발 환경에서는 프리릴리스 버전을 허용합니다.
  - `autoDownload`: 사용자 확인 후 다운로드하도록 자동 다운로드를 비활성화합니다.
  - `autoInstallOnAppQuit`: 앱 종료 시 자동 설치를 활성화합니다.
  - `channel`: 'latest' 채널의 업데이트만 사용합니다.
  - `allowPrerelease`: 프로덕션 환경에서는 안정 버전만 사용합니다.
- **이벤트 핸들러 설정**: 업데이트 이벤트에 핸들러를 연결합니다.
- **자동 업데이트 확인**: 개발 환경이 아닌 경우, 앱 시작 후 5초 후에 업데이트를 확인합니다.

### setupAutoUpdaterEvents

```javascript
function setupAutoUpdaterEvents() {
  // 업데이트 확인 시작
  autoUpdater.on('checking-for-update', () => {
    sendStatusToWindows('checking-for-update', { status: 'checking' });
  });

  // 업데이트 사용 가능
  autoUpdater.on('update-available', info => {
    sendStatusToWindows('update-available', {
      status: 'available',
      info: {
        version: info.version,
        releaseDate: info.releaseDate,
        releaseNotes: info.releaseNotes,
      },
    });
  });

  // 업데이트 없음
  autoUpdater.on('update-not-available', info => {
    sendStatusToWindows('update-not-available', {
      status: 'not-available',
      info: {
        version: info.version,
        releaseDate: info.releaseDate,
      },
    });
  });

  // 업데이트 다운로드 진행 상황
  autoUpdater.on('download-progress', progressObj => {
    sendStatusToWindows('download-progress', {
      status: 'downloading',
      progress: {
        percent: progressObj.percent,
        bytesPerSecond: progressObj.bytesPerSecond,
        transferred: progressObj.transferred,
        total: progressObj.total,
      },
    });
  });

  // 업데이트 다운로드 완료
  autoUpdater.on('update-downloaded', info => {
    sendStatusToWindows('update-downloaded', {
      status: 'downloaded',
      info: {
        version: info.version,
        releaseDate: info.releaseDate,
        releaseNotes: info.releaseNotes,
      },
    });
  });

  // 업데이트 오류
  autoUpdater.on('error', err => {
    sendStatusToWindows('update-error', {
      status: 'error',
      error: err.toString(),
    });
  });
}
```

**기능 분석**:

- 각 업데이트 이벤트에 대한 핸들러를 설정하고, 이벤트 발생 시 애플리케이션 창에 상태를 전달합니다.
- **처리하는 이벤트**:
  - `checking-for-update`: 업데이트 확인 시작 시 발생
  - `update-available`: 업데이트 가능 시 발생
  - `update-not-available`: 업데이트 없음 시 발생
  - `download-progress`: 다운로드 진행 중 진행률 정보와 함께 발생
  - `update-downloaded`: 다운로드 완료 시 발생
  - `error`: 업데이트 프로세스 중 오류 발생 시

### checkForUpdates

```javascript
async function checkForUpdates(silent = false) {
  try {
    if (!silent) {
      sendStatusToWindows('checking-for-update', { status: 'checking' });
    }

    // electron-updater로 업데이트 확인
    logger.info('Checking for updates via electron-updater');
    const result = await autoUpdater.checkForUpdates();

    if (result && result.updateInfo) {
      const currentVersion = app.getVersion();
      const latestVersion = result.updateInfo.version;

      logger.info(
        `Update check result: Current version ${currentVersion}, Latest version ${latestVersion}`,
      );

      return {
        success: true,
        updateInfo: result.updateInfo,
        versionInfo: {
          current: currentVersion,
          latest: latestVersion,
        },
        hasUpdate: result.updateInfo.version !== currentVersion,
      };
    } else {
      // 업데이트 정보가 없는 경우
      logger.info('Update information not found.');

      if (!silent) {
        sendStatusToWindows('update-not-available', {
          status: 'not-available',
          info: {
            version: app.getVersion(),
          },
        });
      }

      return {
        success: false,
        error: 'Update information not found.',
        versionInfo: {
          current: app.getVersion(),
          latest: null,
        },
        hasUpdate: false,
      };
    }
  } catch (error) {
    logger.error('Update check error:', error.toString());

    // 오류 알림 (silent 모드가 아닌 경우에만)
    if (!silent) {
      sendStatusToWindows('update-error', {
        status: 'error',
        error: error.toString(),
      });
    }

    return {
      success: false,
      error: error.toString(),
      versionInfo: {
        current: app.getVersion(),
        latest: null,
      },
    };
  }
}
```

**기능 분석**:

- **silentMode**: silent 매개변수로 정숙 모드 여부를 결정합니다. 정숙 모드가 아닌 경우 UI에 알림을 표시합니다.
- **업데이트 확인**: `autoUpdater.checkForUpdates()`를 호출하여 GitHub 저장소에서 업데이트를 확인합니다.
- **결과 처리**:
  - 업데이트 정보가 있는 경우: 현재 버전과 최신 버전을 비교하여 업데이트 필요 여부를 판단합니다.
  - 업데이트 정보가 없는 경우: 업데이트 없음 상태를 반환합니다.
  - 오류 발생 시: 오류 상태를 로깅하고 반환합니다.
- **반환 값**: 업데이트 확인 결과를 객체로 반환합니다 (성공/실패, 버전 정보, 업데이트 필요 여부 등).

### downloadUpdate

```javascript
async function downloadUpdate() {
  try {
    // 다운로드 시작
    sendStatusToWindows('download-started', { status: 'downloading' });

    // 현재 업데이트 가능 상태인지 확인
    let updateCheckResult;

    try {
      // electron-updater로 다운로드
      logger.info('Checking status for update download via electron-updater');
      updateCheckResult = await autoUpdater.checkForUpdatesAndNotify();

      // 업데이트 확인 결과가 없으면 단순 체크만 수행
      if (!updateCheckResult) {
        updateCheckResult = await autoUpdater.checkForUpdates();
      }

      if (!updateCheckResult || !updateCheckResult.updateInfo) {
        throw new Error('Cannot verify update information.');
      }
    } catch (checkError) {
      logger.error('Error during update check:', checkError.toString());
      throw new Error(`Update check failed: ${checkError.message}`);
    }

    // 최신 버전 정보 로깅
    logger.info(`Update information confirmed: Version ${updateCheckResult.updateInfo.version}`);

    // 업데이트 상태 체크 후 잠시 대기 (타이밍 문제 방지)
    await new Promise(resolve => setTimeout(resolve, 500));

    // 업데이트 다운로드 시작
    logger.info('Starting automatic update download');
    logger.info(`Download target app ID: ${autoUpdater.appId}`);
    logger.info(`Download cache directory: ${app.getPath('userData')}/toast-app-updater`);

    try {
      await autoUpdater.downloadUpdate();
      logger.info('Update download completed successfully');
    } catch (downloadError) {
      logger.error(`Download error details: ${downloadError.toString()}`);
      logger.error(`Error stack: ${downloadError.stack}`);
      throw downloadError;
    }

    return {
      success: true,
      message: 'Update download has started.',
      version: updateCheckResult.updateInfo.version,
    };
  } catch (error) {
    logger.error('Update download error:', error.toString());

    sendStatusToWindows('update-error', {
      status: 'error',
      error: error.toString(),
    });

    return {
      success: false,
      error: error.toString(),
    };
  }
}
```

**기능 분석**:

- **다운로드 시작 알림**: 다운로드 시작을 UI에 알립니다.
- **업데이트 확인 재검증**: 다운로드 전에 업데이트 가능 상태를 다시 확인합니다.
  - `autoUpdater.checkForUpdatesAndNotify()`: 업데이트 확인 및 자동 알림 기능을 시도합니다.
  - 실패 시 `autoUpdater.checkForUpdates()`로 재시도합니다.
  - 업데이트 정보가 없으면 오류를 발생시킵니다.
- **타이밍 제어**: 업데이트 상태 확인 후 0.5초 대기하여 타이밍 문제를 방지합니다.
- **다운로드 실행**: `autoUpdater.downloadUpdate()`를 호출하여 실제 다운로드를 시작합니다.
- **오류 처리**: 다운로드 중 발생하는 오류를 상세하게 로깅하고 UI에 알립니다.
- **반환 값**: 다운로드 성공/실패 여부와 메시지를 객체로 반환합니다.

### installUpdate

```javascript
async function installUpdate() {
  try {
    // 설치 시작
    sendStatusToWindows('install-started', { status: 'installing' });

    // quitAndInstall 호출 (isSilent, isForceRunAfter 옵션 사용 가능)
    // macOS에서는 앱이 종료되고 자동으로 새 버전이 설치됨
    logger.info('Closing app to install update...');
    autoUpdater.quitAndInstall(false, true);

    return {
      success: true,
    };
  } catch (error) {
    logger.error('Update installation error:', error.toString());

    sendStatusToWindows('update-error', {
      status: 'error',
      error: error.toString(),
    });

    return {
      success: false,
      error: error.toString(),
    };
  }
}
```

**기능 분석**:

- **설치 시작 알림**: 설치 시작을 UI에 알립니다.
- **앱 종료 및 설치**: `autoUpdater.quitAndInstall(isSilent, isForceRunAfter)`를 호출하여 앱을 종료하고 업데이트를 설치합니다.
  - `isSilent`: false로 설정하여 사용자에게 종료 알림을 표시합니다.
  - `isForceRunAfter`: true로 설정하여 설치 후 앱을 자동으로 재시작합니다.
- **오류 처리**: 설치 과정에서 발생하는 오류를 로깅하고 UI에 알립니다.
- **반환 값**: 설치 시작 성공/실패 여부를 객체로 반환합니다.

### sendStatusToWindows

```javascript
function sendStatusToWindows(channel, data) {
  // 토스트 창에 이벤트 전송
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, data);
  }

  // 설정 창에 이벤트 전송
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.webContents.send(channel, data);
  }
}
```

**기능 분석**:

- 업데이트 관련 이벤트를 메인 창(토스트 창)과 설정 창에 동시에 전달하는 유틸리티 함수입니다.
- 창이 존재하고 파괴되지 않았는지 확인한 후 이벤트를 전송합니다.
- `channel`과 `data` 매개변수를 통해 이벤트 이름과 데이터를 전달합니다.

## 이벤트 핸들링

`updater.js`는 다음과 같은 이벤트를 처리합니다:

| 이벤트 | 설명 | 전달되는 데이터 |
|--------|------|----------------|
| `checking-for-update` | 업데이트 확인 시작 | `{ status: 'checking' }` |
| `update-available` | 업데이트 가능 | 버전, 릴리스 날짜, 릴리스 노트 포함 |
| `update-not-available` | 업데이트 없음 | 현재 버전, 릴리스 날짜 포함 |
| `download-started` | 다운로드 시작 | `{ status: 'downloading' }` |
| `download-progress` | 다운로드 진행 중 | 진행률, 속도, 전송량 등 포함 |
| `update-downloaded` | 다운로드 완료 | 버전, 릴리스 날짜, 릴리스 노트 포함 |
| `install-started` | 설치 시작 | `{ status: 'installing' }` |
| `update-error` | 업데이트 오류 | 오류 메시지 포함 |

## 업데이트 프로세스 흐름

업데이트 프로세스의 전체적인 흐름은 다음과 같습니다:

1. **초기화**:
   - 앱 시작 시 `initAutoUpdater` 함수가 호출됩니다.
   - 업데이트 설정이 구성되고 이벤트 핸들러가 등록됩니다.

2. **자동 업데이트 확인**:
   - 개발 환경이 아닌 경우, 앱 시작 5초 후 자동으로 `checkForUpdates(false)` 함수가 호출됩니다.
   - 업데이트 확인 결과에 따라 '업데이트 가능' 또는 '업데이트 없음' 이벤트가 발생합니다.

3. **수동 업데이트 확인**:
   - 사용자가 설정 UI에서 '업데이트 확인' 버튼을 클릭하면 `ipc.js`에서 `updater.checkForUpdates(false)`가 호출됩니다.

4. **업데이트 다운로드**:
   - 업데이트가 가능한 상태에서 사용자가 다운로드를 요청하면 `downloadUpdate` 함수가 호출됩니다.
   - 다운로드 진행 상황은 `download-progress` 이벤트를 통해 실시간으로 UI에 표시됩니다.
   - 다운로드가 완료되면 `update-downloaded` 이벤트가 발생합니다.

5. **업데이트 설치**:
   - 다운로드 완료 후 사용자가 설치를 요청하면 `installUpdate` 함수가 호출됩니다.
   - 앱이 종료되고 업데이트가 설치된 후 앱이 재시작됩니다.

## 에러 핸들링

`updater.js`는 다음과 같은 방식으로 오류를 처리합니다:

1. **try-catch 블록**: 모든 비동기 함수는 try-catch 블록으로 감싸져 있어 예외를 캡처합니다.
2. **로깅**: 모든 오류는 `logger.error()`를 통해 로그 파일에 기록됩니다.
3. **UI 알림**: `sendStatusToWindows('update-error', { status: 'error', error: err.toString() })`를 통해 오류를 UI에 표시합니다.
4. **오류 객체 반환**: 모든 함수는 오류 발생 시 `{ success: false, error: error.toString() }`와 같은 형식의 객체를 반환합니다.

## 구현 시 고려사항

`updater.js` 모듈을 구현할 때 다음과 같은 사항을 고려해야 합니다:

### 1. 설정 파일

업데이트 시스템을 구성하려면 다음 설정 파일이 필요합니다:

- **app-update.yml**: 릴리스 빌드용 설정 파일
- **dev-app-update.yml**: 개발 환경용 설정 파일

두 파일 모두 다음과 같은 내용을 포함해야 합니다:

```yaml
provider: github
owner: opspresso
repo: toast-dist
updaterCacheDirName: toast-app-updater
publisherName: OpsPresso
appId: com.opspresso.toast-app
```

### 2. package.json 설정

`package.json`에는 다음과 같은 설정이 필요합니다:

```json
{
  "build": {
    "appId": "com.opspresso.toast-app",
    "productName": "Toast",
    "mac": {
      "publish": ["github"]
    },
    "win": {
      "publish": ["github"]
    }
  },
  "publish": [
    {
      "provider": "github",
      "owner": "opspresso",
      "repo": "toast-dist",
      "releaseType": "release",
      "publishAutoUpdate": true,
      "updaterCacheDirName": "toast-app-updater"
    }
  ]
}
```

### 3. 보안 고려사항

- **코드 서명**: macOS와 Windows에서 업데이트가 원활하게 작동하려면 애플리케이션 코드 서명이 필요합니다.
- **GitHub 토큰**: 비공개 저장소에서 업데이트를 가져오려면 GitHub 토큰이 필요할 수 있습니다.

### 4. 플랫폼별 고려사항

- **macOS**:
  - `hardenedRuntime`과 `entitlements`가 필요합니다.
  - 공증(notarization)이 필요할 수 있습니다.
- **Windows**:
  - nsis 인스톨러 설정이 필요합니다.
  - 자동 업데이트 권한 문제를 해결해야 할 수 있습니다.

### 5. 로깅 및 디버깅

- 업데이트 관련 문제를 해결하기 위해 상세한 로그가 필요합니다.
- `autoUpdater.logger = logger` 설정으로 electron-updater의 로그를 앱 로그 시스템에 통합합니다.

### 6. 사용자 경험 개선

- 업데이트 다운로드 진행 상황을 실시간으로 표시합니다.
- 업데이트 설치 전에 사용자 확인을 받습니다.
- 업데이트 오류 시 명확한 메시지를 제공합니다.

## 업데이터 모듈 구현 예제

다음은 `updater.js` 모듈의 개선된 구현 예제입니다:

```javascript
/**
 * Toast - Auto Update Manager
 *
 * This module handles automatic updates using electron-updater.
 */

const { app, dialog } = require('electron');
const { autoUpdater } = require('electron
