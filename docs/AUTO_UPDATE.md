# Toast App 자동 업데이트 시스템

Toast App은 [electron-updater](https://www.electron.build/auto-update) 라이브러리를 활용하여 애플리케이션 업데이트를 관리합니다. 이 문서는 Toast App의 자동 업데이트 시스템의 구조, 구현 방법, 그리고 작동 원리를 설명합니다.

## 목차

- [개요](#개요)
- [자동 업데이트 시스템 구조](#자동-업데이트-시스템-구조)
- [구현 상세](#구현-상세)
- [업데이트 프로세스](#업데이트-프로세스)
- [설정 방법](#설정-방법)
- [문제 해결](#문제-해결)

## 개요

Toast App은 GitHub 릴리스를 통해 배포되며, electron-updater를 사용하여 GitHub 저장소에서 새 버전을 확인하고 다운로드합니다. 사용자는 앱 내에서 업데이트를 확인하고, 다운로드하고, 설치할 수 있습니다.

주요 특징:
- GitHub 릴리스 기반 업데이트 시스템
- 자동 업데이트 확인 (앱 시작 시)
- 수동 업데이트 확인 옵션
- 업데이트 진행 상황 표시
- 간편한 설치 프로세스

## 자동 업데이트 시스템 구조

자동 업데이트 시스템은 다음과 같은 구성 요소로 이루어져 있습니다:

1. **electron-updater**: 업데이트 기능을 제공하는 라이브러리
2. **updater.js**: 업데이트 관련 기능을 구현한 모듈
3. **ipc.js**: 렌더러 프로세스와 메인 프로세스 간 통신을 관리
4. **app-update.yml/dev-app-update.yml**: 업데이트 설정 파일
5. **package.json**: 빌드 및 배포 설정

### 핵심 파일 및 역할

| 파일 | 역할 |
|------|------|
| updater.js | 업데이트 관련 핵심 기능 구현 (확인, 다운로드, 설치) |
| ipc.js | 렌더러 프로세스와 메인 프로세스 간 업데이트 관련 통신 처리 |
| app-update.yml | 프로덕션 환경의 업데이트 설정 |
| dev-app-update.yml | 개발 환경의 업데이트 설정 |
| package.json | 앱 버전 및 배포 설정 |

## 구현 상세

### updater.js의 주요 기능

`updater.js` 모듈은 다음과 같은 주요 기능을 제공합니다:

#### 초기화

```javascript
function initAutoUpdater(windows) {
  // 창 레퍼런스 저장
  mainWindow = windows.toast;
  settingsWindow = windows.settings;

  // autoUpdater 설정
  autoUpdater.logger = logger;
  autoUpdater.appId = 'com.opspresso.toast-app';
  autoUpdater.forceDevUpdateConfig = true;
  autoUpdater.allowDowngrade = true;
  autoUpdater.allowPrerelease = true;
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.channel = 'latest';
  autoUpdater.allowPrerelease = false; // 프로덕션에서는 안정 버전만 사용

  // 이벤트 핸들러 설정
  setupAutoUpdaterEvents();

  // 시작 시 업데이트 확인 (개발 환경 제외)
  if (process.env.NODE_ENV !== 'development') {
    setTimeout(() => {
      checkForUpdates(false);
    }, 5000);
  }
}
```

#### 업데이트 확인

```javascript
async function checkForUpdates(silent = false) {
  try {
    if (!silent) {
      sendStatusToWindows('checking-for-update', { status: 'checking' });
    }

    const result = await autoUpdater.checkForUpdates();

    // 업데이트 정보 처리 및 결과 반환
    // ...
  } catch (error) {
    // 오류 처리
    // ...
  }
}
```

#### 업데이트 다운로드

```javascript
async function downloadUpdate() {
  try {
    // 다운로드 시작 알림
    sendStatusToWindows('download-started', { status: 'downloading' });

    // 업데이트 확인 및 다운로드 처리
    // ...

    await autoUpdater.downloadUpdate();

    // 결과 반환
    // ...
  } catch (error) {
    // 오류 처리
    // ...
  }
}
```

#### 업데이트 설치

```javascript
async function installUpdate() {
  try {
    // 설치 시작 알림
    sendStatusToWindows('install-started', { status: 'installing' });

    // quitAndInstall 호출
    autoUpdater.quitAndInstall(false, true);

    return { success: true };
  } catch (error) {
    // 오류 처리
    // ...
  }
}
```

### IPC 통신

`ipc.js`에서는 렌더러 프로세스(UI)와 메인 프로세스 간의 업데이트 관련 통신을 처리합니다:

```javascript
// 업데이트 확인
ipcMain.handle('check-for-updates', async (event, silent = false) => {
  logger.info('IPC: check-for-updates called, silent:', silent);
  return await updater.checkForUpdates(silent);
});

// 업데이트 다운로드
ipcMain.handle('download-update', async () => {
  logger.info('IPC: download-update called');
  return await updater.downloadUpdate();
});

// 업데이트 설치
ipcMain.handle('install-update', async () => {
  logger.info('IPC: install-update called');
  return await updater.installUpdate();
});

// 자동 업데이트 다운로드
ipcMain.handle('download-auto-update', async () => {
  logger.info('IPC: download-auto-update called');
  // 확인 후 다운로드 처리
  // ...
});
```

### 이벤트 처리

업데이트 과정에서 발생하는 이벤트를 처리하는 함수:

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

## 업데이트 프로세스

Toast App의 업데이트 프로세스는 다음과 같은 단계로 구성됩니다:

### 1. 업데이트 확인

- **자동 확인**: 앱 시작 시 자동으로 업데이트를 확인합니다 (개발 환경 제외).
- **수동 확인**: 사용자가 설정 UI에서 업데이트 확인 버튼을 클릭하면 실행됩니다.

```javascript
// 앱 시작 시 자동 확인
if (process.env.NODE_ENV !== 'development') {
  setTimeout(() => {
    checkForUpdates(false);
  }, 5000);
}
```

### 2. 업데이트 가능 시 알림

새 버전이 있을 경우 사용자에게 알림을 표시합니다:

```javascript
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
```

### 3. 업데이트 다운로드

사용자가 업데이트 다운로드를 선택하면 실행됩니다:

```javascript
async function downloadUpdate() {
  try {
    sendStatusToWindows('download-started', { status: 'downloading' });
    // 다운로드 처리
    await autoUpdater.downloadUpdate();
    // ...
  } catch (error) {
    // 오류 처리
    // ...
  }
}
```

다운로드 진행 상황은 사용자에게 실시간으로 표시됩니다:

```javascript
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
```

### 4. 업데이트 설치

다운로드가 완료되면 사용자에게 알리고, 설치 옵션을 제공합니다:

```javascript
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
```

사용자가 설치를 선택하면 앱을 종료하고 업데이트를 설치합니다:

```javascript
async function installUpdate() {
  try {
    sendStatusToWindows('install-started', { status: 'installing' });
    autoUpdater.quitAndInstall(false, true);
    return { success: true };
  } catch (error) {
    // 오류 처리
    // ...
  }
}
```

## 설정 방법

### package.json 설정

package.json 파일에서 다음 설정을 구성해야 합니다:

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

### app-update.yml / dev-app-update.yml

두 파일에는 다음과 같은 설정이 필요합니다:

```yaml
provider: github
owner: opspresso
repo: toast-dist
updaterCacheDirName: toast-app-updater
publisherName: OpsPresso
appId: com.opspresso.toast-app
```

## 문제 해결

### 일반적인 문제

1. **업데이트를 확인할 수 없음**
   - GitHub 연결 상태 확인
   - app-update.yml 설정 확인
   - 로그에서 오류 메시지 확인

2. **다운로드가 실패함**
   - 디스크 공간 확인
   - 네트워크 연결 확인
   - 권한 문제 (캐시 디렉토리 접근 권한)

3. **설치가 실패함**
   - 앱 실행 권한 확인
   - 로그에서 설치 단계 오류 확인

### 로깅

업데이트 관련 문제를 해결하기 위해 로깅 기능을 활용할 수 있습니다:

```javascript
// updater.js에서 로깅 설정
autoUpdater.logger = logger;

// 다양한 로그 메시지
logger.info(`Current app version: ${app.getVersion()}`);
logger.info(`Update source: GitHub Release (opspresso/toast-dist)`);
logger.error('Update check error:', error.toString());
```

로그 파일은 다음 위치에서 확인할 수 있습니다:
- macOS: `~/Library/Logs/Toast/main.log`
- Windows: `%USERPROFILE%\AppData\Roaming\Toast\logs\main.log`
