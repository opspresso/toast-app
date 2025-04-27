# Toast App 자동 업데이트 시스템

Toast App은 [electron-updater](https://www.electron.build/auto-update) 라이브러리를 활용하여 애플리케이션 업데이트를 관리합니다. 이 문서는 Toast App의 자동 업데이트 시스템의 구조, 구현 방법, 작동 원리, 그리고 사용자 인터페이스에서의 업데이트 과정을 설명합니다. 본 문서는 개발자와 유지보수 담당자를 위한 참고 자료로 활용될 수 있습니다.

## 목차

- [개요](#개요)
- [자동 업데이트 시스템 구조](#자동-업데이트-시스템-구조)
- [구현 상세](#구현-상세)
- [업데이트 프로세스](#업데이트-프로세스)
- [사용자 인터페이스](#사용자-인터페이스)
- [설정 방법](#설정-방법)
- [문제 해결](#문제-해결)
- [플랫폼별 고려사항](#플랫폼별-고려사항)
- [보안 고려사항](#보안-고려사항)
- [고급 기능](#고급-기능)

## 개요

Toast App은 GitHub 릴리스를 통해 배포되며, electron-updater를 사용하여 GitHub 저장소에서 새 버전을 확인하고 다운로드합니다. 사용자는 앱 내에서 업데이트를 확인하고, 다운로드하고, 설치할 수 있습니다. 이 업데이트 시스템은 Windows, macOS, Linux 모든 플랫폼에서 지원됩니다.

주요 특징:
- GitHub 릴리스 기반 업데이트 시스템
- 자동 업데이트 확인 (앱 시작 시)
- 수동 업데이트 확인 옵션
- 업데이트 진행 상황 실시간 표시 (다운로드 속도, 용량 정보 포함)
- 간편한 설치 프로세스 (앱 자동 재시작)
- 개발 환경과 프로덕션 환경 설정 분리

## 자동 업데이트 시스템 구조

자동 업데이트 시스템은 다음과 같은 구성 요소로 이루어져 있습니다:

1. **electron-updater**: 업데이트 기능을 제공하는 라이브러리
2. **updater.js**: 메인 프로세스에서 업데이트 관련 기능을 구현한 모듈
3. **settings/index.js**: 렌더러 프로세스(UI)에서 업데이트 상태 표시 및 사용자 상호작용 처리
4. **ipc.js**: 렌더러 프로세스와 메인 프로세스 간 통신을 관리
5. **app-update.yml/dev-app-update.yml**: 업데이트 설정 파일
6. **package.json**: 빌드 및 배포 설정

### 핵심 파일 및 역할

| 파일 | 역할 |
|------|------|
| updater.js | 업데이트 관련 핵심 기능 구현 (확인, 다운로드, 설치, 로깅, 오류 처리) |
| settings/index.js | 설정 화면에서 업데이트 UI 관리 및 사용자 상호작용 처리 |
| ipc.js | 렌더러 프로세스와 메인 프로세스 간 업데이트 관련 통신 처리 |
| app-update.yml | 프로덕션 환경의 업데이트 설정 |
| dev-app-update.yml | 개발 환경의 업데이트 설정 |
| package.json | 앱 버전 및 배포 설정 |

## 구현 상세

### updater.js의 주요 기능

`updater.js` 모듈은 다음과 같은 주요 기능을 제공합니다:

#### 초기화 및 설정

```javascript
function initAutoUpdater(windows) {
  // 창 레퍼런스 저장
  mainWindow = windows.toast;
  settingsWindow = windows.settings;

  // 로깅 설정
  configureLogging();

  // 업데이터 설정
  configureUpdater();

  // 업데이트 이벤트 핸들러 등록
  setupAutoUpdaterEvents();

  // 설정 파일 확인
  validateUpdateConfig();

  // 시작 시 업데이트 확인 (개발 환경에서는 실행하지 않음)
  scheduleUpdateCheck();

  return {
    checkForUpdates,
    downloadUpdate,
    installUpdate,
    getLastCheckTime: () => lastCheckTime,
    isUpdateCheckInProgress: () => updateCheckInProgress,
    isUpdateDownloadInProgress: () => updateDownloadInProgress,
  };
}
```

#### 업데이터 설정

```javascript
function configureUpdater() {
  // 앱 ID 명시적으로 설정
  autoUpdater.appId = 'com.opspresso.toast-app';

  // 개발 환경에서도 업데이트 확인 가능하도록 설정
  autoUpdater.forceDevUpdateConfig = true;

  // 다운그레이드 허용 (개발 중 테스트 용도)
  autoUpdater.allowDowngrade = process.env.NODE_ENV === 'development';

  // 프리릴리스 버전 허용 (개발 환경에서만)
  autoUpdater.allowPrerelease = process.env.NODE_ENV === 'development';

  // 자동 다운로드 비활성화 (사용자 확인 후 다운로드)
  autoUpdater.autoDownload = false;

  // 앱 종료 시 자동 설치 활성화
  autoUpdater.autoInstallOnAppQuit = true;

  // 업데이트 채널 설정
  autoUpdater.channel = 'latest';
}
```

#### 업데이트 설정 파일 검증

```javascript
function validateUpdateConfig() {
  try {
    // 릴리즈 모드일 때는 app-update.yml 파일 확인
    if (app.isPackaged) {
      const updateConfigPath = path.join(app.getAppPath(), 'app-update.yml');
      // 파일 존재 확인 및 로드
    }
    // 개발 모드일 때는 dev-app-update.yml 파일 확인
    else {
      const devUpdateConfigPath = path.join(process.cwd(), 'dev-app-update.yml');
      // 파일 존재 확인 및 로드
    }

    // 필수 설정 필드 확인
    if (updateConfig) {
      const requiredFields = ['provider', 'owner', 'repo'];
      const missingFields = requiredFields.filter(field => !updateConfig[field]);

      if (missingFields.length > 0) {
        logger.warn(`Update configuration missing required fields: ${missingFields.join(', ')}`);
      }
    }
  } catch (error) {
    logger.error('Error validating update configuration:', error.toString());
  }
}
```

#### 업데이트 확인

```javascript
async function checkForUpdates(silent = false) {
  // 이미 진행 중인 확인이 있으면 중복 방지
  if (updateCheckInProgress) {
    logger.info('Update check already in progress, skipping');
    return {
      success: false,
      error: 'Update check already in progress',
      versionInfo: {
        current: app.getVersion(),
      },
    };
  }

  try {
    updateCheckInProgress = true;

    if (!silent) {
      sendStatusToWindows('checking-for-update', { status: 'checking' });
    }

    // electron-updater로 업데이트 확인
    logger.info('Checking for updates via electron-updater');
    const result = await autoUpdater.checkForUpdates();

    if (result && result.updateInfo) {
      const currentVersion = app.getVersion();
      const latestVersion = result.updateInfo.version;

      // 버전 비교 로직 강화
      const hasUpdate = compareVersions(latestVersion, currentVersion) > 0;

      // 결과 반환
      // ...
    } else {
      // 업데이트 정보가 없는 경우 처리
      // ...
    }
  } catch (error) {
    // 오류 처리
    // ...
  } finally {
    updateCheckInProgress = false;
    lastCheckTime = Date.now();
  }
}
```

#### 업데이트 다운로드

```javascript
async function downloadUpdate() {
  // 이미 다운로드 중인 경우 중복 방지
  if (updateDownloadInProgress) {
    logger.info('Update download already in progress, skipping');
    return {
      success: false,
      error: 'Update download already in progress',
    };
  }

  try {
    updateDownloadInProgress = true;

    // 다운로드 시작
    sendStatusToWindows('download-started', { status: 'downloading' });

    // 현재 업데이트 가능 상태인지 확인
    let updateCheckResult = await autoUpdater.checkForUpdates();

    // 업데이트 정보 확인 및 검증
    // ...

    // 다운로드 정보 조회
    logger.info('Retrieving update package information');
    const updateFileInfo = await autoUpdater.downloadUpdateInfo();

    // 업데이트 다운로드 시작
    logger.info('Starting update download');
    await autoUpdater.downloadUpdate();
    logger.info('Update download completed successfully');

    return {
      success: true,
      message: 'Update download completed successfully',
      version: updateCheckResult.updateInfo.version,
    };
  } catch (error) {
    // 오류 처리
    // ...
  } finally {
    // 다운로드 상태 갱신
    if (!autoUpdater.isUpdaterActive()) {
      updateDownloadInProgress = false;
    }
  }
}
```

#### 업데이트 설치

```javascript
async function installUpdate() {
  try {
    // 설치 시작
    sendStatusToWindows('install-started', { status: 'installing' });

    // 업데이트가 다운로드되었는지 확인
    if (!autoUpdater.isUpdateDownloaded()) {
      logger.warn('Attempting to install update, but no update is downloaded');
      // 오류 처리
      // ...
    }

    // 모든 창에 종료 알림
    sendStatusToWindows('app-closing', {
      status: 'closing',
      message: 'Application is closing to install update',
    });

    // 짧은 딜레이 후 설치 (UI 메시지가 표시될 시간 확보)
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 앱 종료 및 업데이트 설치
    logger.info('Closing app to install update...');

    // isSilent: false - 사용자에게 종료 알림 표시
    // isForceRunAfter: true - 설치 후 앱을 자동으로 재시작
    autoUpdater.quitAndInstall(false, true);

    return { success: true };
  } catch (error) {
    // 오류 처리
    // ...
  }
}
```

### 이벤트 처리 및 UI 통신

업데이트 과정에서 발생하는 이벤트를 처리하고 UI에 통지하는 함수:

```javascript
function setupAutoUpdaterEvents() {
  // 업데이트 확인 시작
  autoUpdater.on('checking-for-update', () => {
    logger.info('Checking for updates...');
    updateCheckInProgress = true;
    sendStatusToWindows('checking-for-update', { status: 'checking' });
  });

  // 업데이트 사용 가능
  autoUpdater.on('update-available', info => {
    logger.info(`Update available: version ${info.version}`);
    updateCheckInProgress = false;
    lastCheckTime = Date.now();

    // 상세 정보 로깅
    logger.info(`Release date: ${info.releaseDate || 'N/A'}`);
    logger.info(`Release notes: ${info.releaseNotes || 'N/A'}`);

    sendStatusToWindows('update-available', {
      status: 'available',
      info: {
        version: info.version,
        releaseDate: info.releaseDate,
        releaseNotes: info.releaseNotes,
        files: info.files?.map(f => ({ name: f.name, size: f.size })) || [],
        path: info.path,
      },
    });
  });

  // 업데이트 없음
  autoUpdater.on('update-not-available', info => {
    logger.info(`No updates available (latest: ${info.version || 'unknown'})`);
    updateCheckInProgress = false;
    lastCheckTime = Date.now();

    sendStatusToWindows('update-not-available', {
      status: 'not-available',
      info: {
        version: info.version,
        releaseDate: info.releaseDate,
        currentVersion: app.getVersion(),
      },
    });
  });

  // 업데이트 다운로드 진행 상황
  autoUpdater.on('download-progress', progressObj => {
    const logMessage = `Download progress: ${Math.round(progressObj.percent)}% ` +
      `(${formatBytes(progressObj.transferred)}/${formatBytes(progressObj.total)}) ` +
      `@ ${formatBytes(progressObj.bytesPerSecond)}/s`;

    logger.info(logMessage);

    sendStatusToWindows('download-progress', {
      status: 'downloading',
      progress: {
        percent: progressObj.percent,
        bytesPerSecond: progressObj.bytesPerSecond,
        transferred: progressObj.transferred,
        total: progressObj.total,
        formattedPercent: `${Math.round(progressObj.percent)}%`,
        formattedTransferred: formatBytes(progressObj.transferred),
        formattedTotal: formatBytes(progressObj.total),
        formattedSpeed: `${formatBytes(progressObj.bytesPerSecond)}/s`,
      },
    });
  });

  // 업데이트 다운로드 완료
  autoUpdater.on('update-downloaded', info => {
    logger.info(`Update downloaded: ${info.version}`);
    updateDownloadInProgress = false;

    sendStatusToWindows('update-downloaded', {
      status: 'downloaded',
      info: {
        version: info.version,
        releaseDate: info.releaseDate,
        releaseNotes: info.releaseNotes,
        files: info.files?.map(f => ({ name: f.name, size: f.size })) || [],
        path: info.path,
      },
    });

    // 선택적으로 설치 여부를 사용자에게 물어볼 수 있음
    if (process.env.AUTO_INSTALL_UPDATES === 'true') {
      logger.info('Auto-install is enabled, prompting user to restart and install');
      promptUserToInstall(info.version);
    }
  });

  // 업데이트 오류
  autoUpdater.on('error', err => {
    logger.error('Update error:', err.toString());

    if (err.stack) {
      logger.error('Error stack:', err.stack);
    }

    if (err.code) {
      logger.error('Error code:', err.code);
    }

    updateCheckInProgress = false;
    updateDownloadInProgress = false;

    sendStatusToWindows('update-error', {
      status: 'error',
      error: err.toString(),
      code: err.code,
      details: err.message,
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
// 앱 시작 시 자동 확인 예약
function scheduleUpdateCheck() {
  if (process.env.NODE_ENV !== 'development') {
    // 앱이 시작되고 몇 초 후에 업데이트 확인 (초기화 시간 확보)
    logger.info('Scheduling initial update check in 5 seconds');
    setTimeout(() => {
      checkForUpdates(true); // silent 모드로 시작 시 자동 확인
    }, 5000);
  } else {
    logger.info('Skipping automatic update check in development mode');
  }
}
```

업데이트 확인 중에는 UI에 로딩 표시가 나타납니다:

```javascript
function handleCheckForUpdates() {
  // 업데이트 UI 초기화
  resetUpdateUI();

  // 업데이트 상태 영역 표시
  if (updateStatus) {
    updateStatus.className = 'update-status';
  }

  // 로딩 표시
  if (updateLoading) {
    updateLoading.className = 'loading-indicator';
  }

  // 상태 메시지 표시
  if (updateMessage) {
    updateMessage.textContent = '업데이트 확인 중...';
  }

  // 업데이트 확인 요청
  window.settings.checkForUpdates()
    .then(result => {
      // 업데이트 가능 여부에 따른 처리
      // ...
    })
    .catch(error => {
      // 오류 처리
      // ...
    });
}
```

### 2. 업데이트 가능 시 알림

새 버전이 있을 경우 사용자에게 상세 정보와 함께 알림을 표시합니다:

```javascript
// updater.js에서 정보 전송
autoUpdater.on('update-available', info => {
  // 정보 로깅

  // UI에 알림
  sendStatusToWindows('update-available', {
    status: 'available',
    info: {
      version: info.version,
      releaseDate: info.releaseDate,
      releaseNotes: info.releaseNotes,
      files: info.files?.map(f => ({ name: f.name, size: f.size })) || [],
      path: info.path,
    },
  });
});

// settings/index.js에서 표시
if (result.hasUpdate) {
  // 업데이트가 있는 경우
  const latestVersion = result.versionInfo?.latest || result.updateInfo?.version || '새 버전';
  const currentVersion = result.versionInfo?.current || '현재 버전';

  // 상태 메시지 업데이트
  if (updateMessage) {
    const notes = result.updateInfo?.releaseNotes || '';

    let messageText = `새 버전(${currentVersion} → ${latestVersion})이 있습니다.`;
    if (notes) {
      // 릴리스 노트가 HTML 형식이면 텍스트로 변환
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = notes;
      const plainText = tempDiv.textContent || tempDiv.innerText || notes;

      // 릴리스 노트 추가
      messageText += ` 릴리스 노트: ${trimmedNotes}`;
    }

    updateMessage.textContent = messageText;
  }

  // 업데이트 액션 영역 표시
  if (updateActions) {
    updateActions.className = 'update-actions';
  }

  // 다운로드 버튼 표시
  if (downloadUpdateButton) {
    downloadUpdateButton.style.display = 'inline-block';
    downloadUpdateButton.textContent = '업데이트 다운로드';
  }

  // 파일 정보가 있다면 표시
  if (result.files && Array.isArray(result.files) && result.files.length > 0) {
    const fileInfo = document.createElement('p');
    fileInfo.className = 'update-file-info';
    fileInfo.textContent = `업데이트 크기: ${formatFileSize(result.files[0].size || 0)}`;
    updateMessage.appendChild(fileInfo);
  }
}
```

### 3. 업데이트 다운로드

사용자가 업데이트 다운로드를 선택하면 실행되며, 진행 상황이 실시간으로 표시됩니다:

```javascript
// settings/index.js에서의 다운로드 처리
function handleDownloadUpdate() {
  // 로딩 표시 및 UI 상태 업데이트

  // 진행 상태 표시를 위한 요소 추가
  const progressElement = document.createElement('div');
  progressElement.className = 'download-progress-bar';
  progressElement.innerHTML = `
    <div class="progress-container">
      <div class="progress-bar" style="width: 0%"></div>
    </div>
    <div class="progress-text">0%</div>
  `;
  updateMessage.appendChild(progressElement);

  // 다운로드 진행률 이벤트 리스너 추가
  const progressListener = (event, data) => {
    if (data && data.progress && progressElement) {
      const percent = Math.round(data.progress.percent);
      const progressBar = progressElement.querySelector('.progress-bar');
      const progressText = progressElement.querySelector('.progress-text');

      if (progressBar) progressBar.style.width = `${percent}%`;
      if (progressText) {
        progressText.textContent = data.progress.formattedPercent
          ? `${data.progress.formattedPercent} (${data.progress.formattedSpeed || ''})`
          : `${percent}%`;
      }
    }
  };

  // 이벤트 리스너 등록
  window.addEventListener('download-progress', progressListener);

  // 업데이트 다운로드
  window.settings.downloadUpdate()
    .then(result => {
      if (result.success) {
        // 다운로드 성공 처리
        // ...
      } else {
        // 다운로드 실패 처리
        // ...
      }
    })
    .catch(error => {
      // 오류 처리
      // ...
    })
    .finally(() => {
      // 이벤트 리스너 제거 및 상태 정리
      // ...
    });
}
```

다운로드 진행 상황은 사용자에게 실시간으로 표시됩니다:

```javascript
// updater.js에서 진행 상황 전송
autoUpdater.on('download-progress', progressObj => {
  const logMessage = `Download progress: ${Math.round(progressObj.percent)}% ` +
    `(${formatBytes(progressObj.transferred)}/${formatBytes(progressObj.total)}) ` +
    `@ ${formatBytes(progressObj.bytesPerSecond)}/s`;

  logger.info(logMessage);

  sendStatusToWindows('download-progress', {
    status: 'downloading',
    progress: {
      percent: progressObj.percent,
      bytesPerSecond: progressObj.bytesPerSecond,
      transferred: progressObj.transferred,
      total: progressObj.total,
      formattedPercent: `${Math.round(progressObj.percent)}%`,
      formattedTransferred: formatBytes(progressObj.transferred),
      formattedTotal: formatBytes(progressObj.total),
      formattedSpeed: `${formatBytes(progressObj.bytesPerSecond)}/s`,
    },
  });
});
```

### 4. 업데이트 설치

다운로드가 완료되면 사용자에게 알리고, 설치(재시작) 옵션을 제공합니다:

```javascript
// settings/index.js에서 설치(재시작) 처리
function handleInstallUpdate() {
  // 사용자에게 확인
  if (!confirm('앱이 종료되고 업데이트 후 자동으로 재시작됩니다. 지금 진행하시겠습니까?')) {
    window.settings.log.info('사용자가 업데이트 설치를 취소했습니다.');
    return;
  }

  // UI 상태 업데이트

  // 앱 종료 알림 표시
  const closingMessage = document.createElement('div');
  closingMessage.className = 'update-closing-message';
  closingMessage.textContent = '5초 후 자동으로 앱이 종료됩니다...';

  // 카운트다운 표시 (5초)
  let countdown = 5;
  const countdownInterval = setInterval(() => {
    countdown--;
    if (countdown <= 0) {
      clearInterval(countdownInterval);

      try {
        // 업데이트 설치 (앱 재시작)
        window.settings.installUpdate()
          .catch(error => {
            // 오류 처리
            // ...
          });
      } catch (error) {
        // 예외 처리
        // ...
      }
    } else {
      closingMessage.textContent = `${countdown}초 후 자동으로 앱이 종료됩니다...`;
    }
  }, 1000);
}
```

업데이트 설치는 앱을 종료하고 새 버전으로 재시작합니다:

```javascript
// updater.js에서 설치 실행
async function installUpdate() {
  try {
    // 설치 시작
    sendStatusToWindows('install-started', { status: 'installing' });

    // 업데이트가 다운로드되었는지 확인
    if (!autoUpdater.isUpdateDownloaded()) {
      // 오류 처리
      // ...
    }

    // 모든 창에 종료 알림
    sendStatusToWindows('app-closing', {
      status: 'closing',
      message: 'Application is closing to install update',
    });

    // 짧은 딜레이 후 설치 (UI 메시지가 표시될 시간 확보)
    await new Promise(resolve => setTimeout(resolve, 1000));

    // isSilent: false - 사용자에게 종료 알림 표시
    // isForceRunAfter: true - 설치 후 앱을 자동으로 재시작
    autoUpdater.quitAndInstall(false, true);

    return { success: true };
  } catch (error) {
    // 오류 처리
    // ...
  }
}
```

## 사용자 인터페이스

Toast App은 설정 창의 "정보" 탭에서 사용자가 업데이트를 쉽게 확인하고 관리할 수 있는 인터페이스를 제공합니다.

### 업데이트 확인

설정 창의 "정보" 탭에서는 다음과 같은 업데이트 관련 요소를 확인할 수 있습니다:

- **현재 버전 정보**: 앱의 현재 버전을 표시합니다.
- **업데이트 확인 버튼**: 사용자가 수동으로 업데이트를 확인할 수 있습니다.
- **업데이트 상태 메시지**: 업데이트 확인 결과를 표시합니다.

```javascript
// 앱 버전 표시
window.settings.getVersion().then(version => {
  appVersionElement.innerHTML = `<strong>${version}</strong>`;
});

// 업데이트 확인 버튼 이벤트 처리
checkUpdatesButton.addEventListener('click', handleCheckForUpdates);
```

### 업데이트 진행 상황 표시

다운로드 중에는 진행 상황을 실시간으로 표시합니다:

- **진행률 표시줄**: 다운로드 진행 상황을 시각적으로 표시합니다.
- **진행률 텍스트**: 다운로드된 용량, 총 용량, 다운로드 속도를 표시합니다.

```javascript
// 진행 상태 표시를 위한 요소 추가
const progressElement = document.createElement('div');
progressElement.className = 'download-progress-bar';
progressElement.innerHTML = `
  <div class="progress-container">
    <div class="progress-bar" style="width: 0%"></div>
  </div>
  <div class="progress-text">0%</div>
`;
updateMessage.appendChild(progressElement);

// 다운로드 진행률 업데이트
const progressListener = (event, data) => {
  if (data && data.progress && progressElement) {
    const percent = Math.round(data.progress.percent);
    const progressBar = progressElement.querySelector('.progress-bar');
    const progressText = progressElement.querySelector('.progress-text');

    progressBar.style.width = `${percent}%`;
    progressText.textContent = `${data.progress.formattedPercent} (${data.progress.formattedSpeed})`;
  }
};
```

### 설치 준비 및 카운트다운

업데이트 설치 전에는 사용자에게 알림을 표시하고 카운트다운을 통해 앱이 종료될 것임을 예고합니다:

```javascript
// 앱 종료 알림 표시
const closingMessage = document.createElement('div');
closingMessage.className = 'update-closing-message';
closingMessage.textContent = '5초 후 자동으로 앱이 종료됩니다...';

// 카운트다운 표시
let countdown = 5;
const countdownInterval = setInterval(() => {
  countdown--;
  if (countdown <= 0) {
    clearInterval(countdownInterval);
    window.settings.installUpdate();
  } else {
    closingMessage.textContent = `${countdown}초 후 자동으로 앱이 종료됩니다...`;
  }
}, 1000);
```

## 설정 방법

### package.json 설정

자동 업데이트 기능을 사용하기 위해서는 package.json 파일에 다음과 같은 설정이 필요합니다:

```json
{
  "build": {
    "appId": "com.opspresso.toast-app",
    "productName": "Toast",
    "mac": {
      "category": "public.app-category.productivity",
      "publish": ["github"]
    },
    "win": {
      "publish": ["github"]
    },
    "linux": {
      "category": "Utility",
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

주요 설정:
- **appId**: 애플리케이션 식별자 (모든 플랫폼)
- **publish**: 업데이트 공급자 설정 (GitHub)
- **owner**: GitHub 저장소 소유자
- **repo**: GitHub 저장소 이름
- **releaseType**: 릴리스 유형 (release, prerelease, draft)
- **updaterCacheDirName**: 업데이트 캐시 디렉토리 이름

### app-update.yml / dev-app-update.yml

배포 버전과 개발 버전에 각각 사용되는 설정 파일로, 다음과 같은 내용을 포함해야 합니다:

```yaml
provider: github
owner: opspresso
repo: toast-dist
updaterCacheDirName: toast-app-updater
publisherName: OpsPresso
```

- **provider**: 업데이트 공급자 (github, s3, bintray 등)
- **owner**: GitHub 저장소 소유자
- **repo**: GitHub 저장소 이름
- **updaterCacheDirName**: 업데이트 캐시 디렉토리 이름
- **publisherName**: 배포자 이름 (Windows에서 중요)

### 개발 모드에서 업데이트 테스트

개발 중에 업데이트 기능을 테스트하려면:

1. `dev-app-update.yml` 파일이 프로젝트 루트에 있어야 합니다.
2. updater.js에서 `forceDevUpdateConfig` 옵션이 활성화되어 있어야 합니다:
   ```javascript
   autoUpdater.forceDevUpdateConfig = true;
   ```
3. 개발 환경에서도 업데이트 확인이 가능하도록 다음 설정이 있어야 합니다:
   ```javascript
   if (process.env.NODE_ENV === 'development') {
     logger.info('Development mode: Still checking for updates with forceDevUpdateConfig enabled');
     // 업데이트 확인 코드
   }
   ```

## 문제 해결

### 일반적인 문제

1. **업데이트를 확인할 수 없음**
   - GitHub 연결 상태 확인
   - app-update.yml 설정 확인 (provider, owner, repo 필드)
   - 로그에서 오류 메시지 확인
   - GitHub 레포지토리에 릴리스가 존재하는지 확인
   - GitHub 인증 토큰이 필요한 경우 설정 확인

2. **다운로드가 실패함**
   - 디스크 공간 확인
   - 네트워크 연결 상태 확인
   - 권한 문제 (캐시 디렉토리 접근 권한)
   - 방화벽 또는 보안 소프트웨어의 차단 여부 확인
   - 다운로드 크기와 전송 속도 확인 (로그 참조)

3. **설치가 실패함**
   - 앱 실행 권한 확인
   - 로그에서 설치 단계 오류 확인
   - 다운로드된 업데이트가 손상되었는지 확인
   - OS의 자동 업데이트 권한 확인 (특히 macOS)

4. **버전 비교 문제**
   - 버전 형식이 일관되게 유지되는지 확인 (예: "1.2.3" 형식)
   - 현재 버전과 최신 버전 비교 로직 확인
   ```javascript
   // updater.js에서의 버전 비교 함수
   function compareVersions(v1, v2) {
     const v1Parts = v1.split('.').map(Number);
     const v2Parts = v2.split('.').map(Number);

     for (let i = 0; i < Math.max(v1Parts.length, v2Parts.length); i++) {
       const v1Part = v1Parts[i] || 0;
       const v2Part = v2Parts[i] || 0;

       if (v1Part > v2Part) return 1;
       if (v1Part < v2Part) return -1;
     }

     return 0;
   }
   ```

### 로깅 및 디버깅

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
- Linux: `~/.config/Toast/logs/main.log`

### 디버깅 모드 활성화

디버깅을 위해 더 자세한 로그를 확인하려면:

1. 환경 변수 설정:
```
ELECTRON_ENABLE_LOGGING=true
```

2. 로그 수준 변경:
```javascript
// 더 상세한 로그를 위해 debug 수준으로 설정
logger.transports.file.level = 'debug';
logger.transports.console.level = 'debug';
```

3. 업데이트 관련 이벤트를 모두 콘솔에 출력:
```javascript
// 모든 업데이트 이벤트 콘솔에 출력 (디버깅용)
Object.keys(autoUpdater.listenerCount).forEach(event => {
  logger.info(`Registered event listeners for ${event}: ${autoUpdater.listenerCount(event)}`);
});
```

## 플랫폼별 고려사항

자동 업데이트 구현 시 각 플랫폼별로 고려해야 할 사항이 있습니다.

### Windows

- **코드 서명**: Windows에서는 업데이트된 애플리케이션이 신뢰할 수 있는 인증 기관으로부터 서명된 인증서를 사용해야 합니다.
- **SmartScreen 필터**: 인증된 코드 서명이 없는 경우 Windows SmartScreen 경고가 표시될 수 있습니다.
- **UAC(User Account Control)**: 관리자 권한이 필요한 경우 사용자에게 권한 상승 요청 대화상자가 표시됩니다.

```javascript
// Windows 플랫폼에서만 실행할 코드
if (process.platform === 'win32') {
  // Windows 특정 설정
  autoUpdater.addAuthHeader(`Bearer ${process.env.GITHUB_TOKEN}`);
}
```

### macOS

- **앱 공증(Notarization)**: macOS 10.15 (Catalina) 이후부터는 Apple의 공증 과정을 거친 앱만 설치가 가능합니다.
- **보안 권한**: 업데이트 프로세스가 자동으로 실행되려면 적절한 보안 권한이 필요합니다.
- **Gatekeeper**: 서명된 업데이트가 필요하며, 그렇지 않은 경우 사용자에게 경고가 표시됩니다.

```javascript
// macOS 플랫폼에서만 실행할 코드
if (process.platform === 'darwin') {
  // macOS 특정 설정
  autoUpdater.autoDownload = false; // 사용자 동의 후 다운로드
}
```

### Linux

- **배포판 차이**: Linux는 다양한 배포판이 있어 업데이트 메커니즘이 다를 수 있습니다.
- **권한 관리**: 파일 시스템 권한에 주의해야 합니다.
- **AppImage**: Linux에서는 AppImage 형식을 사용하면 자체 업데이트 기능을 포함할 수 있습니다.

```javascript
// Linux 플랫폼에서만 실행할 코드
if (process.platform === 'linux') {
  // 추가 로깅
  logger.info('Linux platform detected, checking update directory permissions');

  // AppImage 업데이트 여부 확인
  if (process.env.APPIMAGE) {
    logger.info('Running as AppImage');
  }
}
```

## 보안 고려사항

자동 업데이트 시스템 구현 시 다음과 같은 보안 사항을 고려해야 합니다:

### 업데이트 출처 확인

모든 업데이트는 신뢰할 수 있는 출처에서만 다운로드해야 합니다:

```javascript
// 업데이트 URL 확인
function validateUpdateUrl(url) {
  // 허용된 도메인에서만 업데이트 다운로드
  const allowedDomains = ['github.com', 'githubusercontent.com'];
  try {
    const parsedUrl = new URL(url);
    return allowedDomains.some(domain => parsedUrl.hostname.endsWith(domain));
  } catch (e) {
    return false;
  }
}
```

### 코드 서명 및 무결성 검증

업데이트 패키지의 무결성 검증은 중요한 보안 조치입니다:

- **서명 확인**: 업데이트 파일이 유효한 인증서로 서명되었는지 확인
- **체크섬 검증**: 다운로드된 파일의 해시값이 예상과 일치하는지 확인

```javascript
// electron-builder는 이러한 검증을 자동으로 처리합니다
// 추가 검증이 필요한 경우 구현 예시:
async function verifySignature(filePath, expectedHash) {
  const fileBuffer = await fs.promises.readFile(filePath);
  const hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
  return hash === expectedHash;
}
```

### 네트워크 통신 보안

업데이트 서버와의 통신은 항상 암호화되어야 합니다:

- **HTTPS 사용**: 모든 업데이트 요청은 HTTPS로 이루어져야 함
- **인증 토큰 보호**: GitHub 토큰 등 인증 정보 보호

```javascript
// 보안 토큰을 사용하여 GitHub API 호출
function secureApiCall() {
  // 토큰을 환경변수에서 안전하게 로드
  const token = process.env.GITHUB_TOKEN;

  // Authorization 헤더에 토큰 추가
  const headers = {
    'Authorization': `token ${token}`,
    'User-Agent': 'Toast-App-Updater'
  };

  // HTTPS 요청 수행
  // ...
}
```

### 사용자 동의

업데이트 과정에서 사용자의 동의와 투명성이 중요합니다:

- 사용자에게 업데이트 정보 제공 및 동의 요청
- 자동 다운로드 설정 허용 (사용자 선택 존중)

## 고급 기능

Toast App의 업데이트 시스템에는 다음과 같은 고급 기능을 추가할 수 있습니다:

### 단계적 출시 (Progressive Rollout)

모든 사용자에게 동시에 업데이트를 배포하지 않고 점진적으로 배포할 수 있습니다:

```javascript
// 사용자 ID를 기반으로 업데이트 대상 여부 결정
function shouldReceiveUpdate(userId, rolloutPercentage) {
  // 결정론적 해싱을 통해 특정 사용자가 업데이트 대상인지 확인
  const hash = crypto.createHash('md5').update(userId).digest('hex');
  const hashValue = parseInt(hash.substring(0, 8), 16);
  const userPercentile = (hashValue / 0xffffffff) * 100;

  return userPercentile <= rolloutPercentage;
}

// 사용 예시
const rolloutPercentage = 25; // 25%의 사용자에게만 제공
if (shouldReceiveUpdate(currentUser.id, rolloutPercentage)) {
  checkForUpdates();
}
```

### 업데이트 이력 관리

앱 내에서 과거 업데이트 이력을 확인할 수 있는 기능:

```javascript
// 업데이트 이력 관리 클래스
class UpdateHistory {
  constructor(storePath) {
    this.storePath = storePath;
    this.history = this.loadHistory();
  }

  // 업데이트 이력 로드
  loadHistory() {
    try {
      return JSON.parse(fs.readFileSync(this.storePath, 'utf8')) || [];
    } catch (err) {
      return [];
    }
  }

  // 새 업데이트 기록 추가
  addUpdate(version, date, notes) {
    this.history.unshift({
      version,
      date,
      notes,
      installedAt: new Date().toISOString()
    });

    // 최대 10개까지만 유지
    if (this.history.length > 10) {
      this.history = this.history.slice(0, 10);
    }

    this.saveHistory();
    return this.history;
  }

  // 이력 저장
  saveHistory() {
    fs.writeFileSync(this.storePath, JSON.stringify(this.history, null, 2), 'utf8');
  }

  // 이력 조회
  getHistory() {
    return this.history;
  }
}

// 사용 예시
const updateHistoryPath = path.join(app.getPath('userData'), 'update-history.json');
const updateHistory = new UpdateHistory(updateHistoryPath);

// 업데이트 설치 후 이력 추가
autoUpdater.on('update-downloaded', info => {
  updateHistory.addUpdate(info.version, info.releaseDate, info.releaseNotes);
});
```

### 자동 업데이트 일정 관리

특정 시간에만 업데이트를 확인하도록 일정을 관리할 수 있습니다:

```javascript
// 업데이트 일정 관리
function scheduleUpdateChecks() {
  // 사용자 설정에서 선호 시간 확인
  const preferredTime = config.get('preferredUpdateTime') || { hour: 3, minute: 0 }; // 기본값: 새벽 3시

  // 매일 지정된 시간에 업데이트 확인
  const now = new Date();
  const scheduledTime = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    preferredTime.hour,
    preferredTime.minute,
    0
  );

  // 이미 지정 시간이 지났으면 다음 날로 설정
  if (now > scheduledTime) {
    scheduledTime.setDate(scheduledTime.getDate() + 1);
  }

  // 타이머 설정
  const timeUntilCheck = scheduledTime.getTime() - now.getTime();
  setTimeout(() => {
    checkForUpdates(true);

    // 다음 날 같은 시간으로 다시 스케줄링
    scheduleUpdateChecks();
  }, timeUntilCheck);

  logger.info(`Next update check scheduled at ${scheduledTime.toLocaleString()}`);
}
```

이러한 고급 기능을 구현하면 더욱 유연하고 사용자 친화적인 업데이트 시스템을 제공할 수 있습니다.
