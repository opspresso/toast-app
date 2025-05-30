# Toast 앱 자동 업데이트

이 문서는 Toast 앱의 자동 업데이트 시스템과 사용자 경험에 대해 설명합니다.

## 목차

- [개요](#개요)
- [업데이트 아키텍처](#업데이트-아키텍처)
  - [업데이트 배포 채널](#업데이트-배포-채널)
  - [업데이트 구성 요소](#업데이트-구성-요소)
- [사용자 업데이트 경험](#사용자-업데이트-경험)
  - [업데이트 확인 및 알림](#업데이트-확인-및-알림)
  - [다운로드 프로세스](#다운로드-프로세스)
  - [설치 프로세스](#설치-프로세스)
- [업데이트 구성](#업데이트-구성)
  - [자동 업데이트 설정](#자동-업데이트-설정)
  - [고급 구성 옵션](#고급-구성-옵션)
- [업데이트 문제 해결](#업데이트-문제-해결)
  - [일반적인 문제](#일반적인-문제)
  - [수동 업데이트](#수동-업데이트)
- [개발자 정보](#개발자-정보)
  - [업데이트 메커니즘](#업데이트-메커니즘)
  - [전자 서명 및 코드 사인](#전자-서명-및-코드-사인)
  - [업데이트 메타데이터](#업데이트-메타데이터)

## 개요

Toast 앱은 electron-updater 라이브러리를 사용하여 자동 업데이트 기능을 제공합니다. 이 시스템은 사용자가 수동으로 업데이트를 확인하거나 다운로드할 필요 없이 앱이 최신 상태를 유지하도록 합니다. 업데이트 프로세스는 사용자 경험을 방해하지 않으면서 백그라운드에서 진행되며, 새 버전이 준비되면 사용자에게 알림이 표시됩니다.

## 업데이트 아키텍처

### 업데이트 배포 채널

Toast 앱은 다음과 같은 배포 채널을 통해 업데이트를 제공합니다:

1. **안정 채널(기본값)**: 철저히 테스트된 정식 릴리스
2. **베타 채널**: 안정화 전 새 기능과 개선 사항을 포함하는 사전 릴리스

업데이트는 GitHub Releases를 통해 배포되며, 각 운영 체제에 대해 적절한 설치 파일이 제공됩니다.

### 업데이트 구성 요소

자동 업데이트 시스템은 다음 구성 요소로 이루어져 있습니다:

1. **업데이터 모듈** (`src/main/updater.js`): 백그라운드 업데이트 확인 및 다운로드를 관리합니다.
2. **알림 시스템**: 사용자에게 새 업데이트 가용성을 알립니다.
3. **다운로더**: 업데이트 패키지를 효율적으로 다운로드합니다.
4. **인스톨러**: 다운로드된 업데이트를 적용합니다.
5. **무결성 확인**: 다운로드된 패키지의 무결성과 신뢰성을 검증합니다.

## 사용자 업데이트 경험

### 업데이트 확인 및 알림

Toast 앱은 다음과 같은 시점에 업데이트를 확인합니다:

1. **애플리케이션 시작 시**: 앱이 시작될 때 자동으로 업데이트를 확인합니다.
2. **정기적 확인**: 앱이 실행 중인 동안 주기적으로 업데이트를 확인합니다(기본값: 4시간마다).
3. **수동 확인**: 사용자가 설정 창에서 "업데이트 확인" 버튼을 클릭할 때.

새 업데이트가 발견되면:

1. **알림 배너**: 앱 내에 알림 배너가 표시됩니다.
2. **시스템 알림**: 앱이 백그라운드에 있을 경우 시스템 알림이 표시됩니다.
3. **설정 표시**: 설정 창에 업데이트 정보가 표시됩니다.

알림에는 업데이트의 버전 번호, 변경 사항 요약 및 업데이트를 다운로드하고 설치하는 옵션이 포함됩니다.

### 다운로드 프로세스

업데이트 다운로드는 다음과 같이 진행됩니다:

1. **백그라운드 다운로드**: 기본적으로 업데이트는 사용자가 수락하면 백그라운드에서 다운로드됩니다.
2. **진행 표시기**: 다운로드 중에는 다음 항목이 표시됩니다:
   - 다운로드 진행률 표시기
   - 예상 완료 시간
   - 현재 다운로드 속도
3. **일시 중지/재개**: 사용자는 다운로드를 일시 중지하고 나중에 재개할 수 있습니다.
4. **네트워크 감지**: 네트워크 연결이 끊긴 경우 다운로드가 자동으로 일시 중지되고 연결이 복원되면 재개됩니다.

다운로드가 완료되면 사용자에게 알림이 표시되고 설치를 진행할 수 있는 옵션이 제공됩니다.

### 설치 프로세스

설치 과정은 운영 체제에 따라 다릅니다:

**Windows**:
1. 사용자가 "지금 설치" 버튼을 클릭합니다.
2. 앱이 종료됩니다.
3. 업데이트가 설치됩니다.
4. 앱이 자동으로 다시 시작됩니다.

**macOS**:
1. 사용자가 "지금 설치" 버튼을 클릭합니다.
2. 앱이 종료됩니다.
3. 업데이트가 설치됩니다.
4. 앱이 자동으로 다시 시작됩니다.

**Linux**:
1. 사용자가 "지금 설치" 버튼을 클릭합니다.
2. 앱이 종료됩니다.
3. 업데이트가 설치됩니다.
4. 앱이 자동으로 다시 시작됩니다.

사용자는 "나중에 설치" 옵션을 선택하여 업데이트를 연기할 수도 있습니다. 이 경우 앱 종료 시 설치를 수행할지 묻는 메시지가 표시됩니다.

## 업데이트 구성

### 자동 업데이트 설정

사용자는 설정 창의 "고급" 탭에서 자동 업데이트 동작을 구성할 수 있습니다:

1. **자동 업데이트 활성화**: 업데이트 자동 확인 및 다운로드 여부 설정
2. **업데이트 채널**: 안정 또는 베타 업데이트 채널 선택
3. **다운로드 전 확인**: 업데이트 다운로드 전 확인 여부 설정
4. **자동 설치**: 앱 종료 시 업데이트 자동 설치 여부 설정

### 고급 구성 옵션

고급 사용자는 `advanced.json` 구성 파일에서 추가 업데이트 설정을 구성할 수 있습니다:

1. **확인 빈도**: 업데이트 확인 간격 설정(기본값: 4시간)
2. **프록시 설정**: 업데이트를 위한 프록시 구성
3. **대역폭 제한**: 업데이트 다운로드에 대한 대역폭 제한 설정
4. **로그 수준**: 업데이트 로그 상세 수준 설정

## 업데이트 문제 해결

### 일반적인 문제

**업데이트 확인 실패**:
1. 인터넷 연결을 확인하세요.
2. 방화벽이 앱의 업데이트 서버 접근을 차단하고 있는지 확인하세요.
3. 앱을 재시작하고 다시 시도하세요.

**업데이트 다운로드 실패**:
1. 디스크 공간이 충분한지 확인하세요.
2. 인터넷 연결을 확인하세요.
3. 방화벽 설정을 확인하세요.
4. 앱을 재시작하고 다시 시도하세요.

**업데이트 설치 실패**:
1. 앱을 완전히 종료하고 다시 시도하세요.
2. 관리자 권한으로 앱을 실행해 보세요.
3. 바이러스 백신 소프트웨어가 설치를 차단하고 있는지 확인하세요.
4. macOS에서 게이트키퍼 문제가 있는 경우 수동 업데이트를 시도하세요.

### 수동 업데이트

자동 업데이트가 실패하는 경우 수동 업데이트를 수행할 수 있습니다:

1. [GitHub Releases](https://github.com/opspresso/toast/releases)에서 최신 버전 다운로드
2. 현재 설치된 Toast 앱 종료
3. 다운로드한 설치 파일 실행:
   - **Windows**: `.exe` 파일 실행
   - **macOS**: `.dmg` 파일 마운트 후 앱을 Applications 폴더로 드래그
   - **Linux**: 배포판에 따라 `.AppImage`, `.deb` 또는 `.rpm` 파일 설치

## 개발자 정보

### 업데이트 메커니즘

Toast 앱의 자동 업데이트 시스템은 `electron-updater` 라이브러리를 사용하여 구현되었습니다. 주요 구성 요소는 다음과 같습니다:

1. **update.yml 파일**: 각 릴리스의 메타데이터를 저장합니다.
2. **릴리스 파일**: GitHub Releases에 배포됩니다.
3. **updater.js**: `electron-updater`를 사용하여 업데이트 로직을 구현합니다.

업데이트 확인 프로세스:
```javascript
// src/main/updater.js (간소화됨)
const { autoUpdater } = require('electron-updater');
const { createLogger } = require('./logger');

const logger = createLogger('Updater');

function initAutoUpdater(windows) {
  if (process.env.NODE_ENV !== 'development') {
    autoUpdater.checkForUpdatesAndNotify();

    autoUpdater.on('update-available', (info) => {
      logger.info('Update available:', info.version);
      windows.toast?.webContents.send('update-available', { info });
    });

    autoUpdater.on('download-progress', (progressObj) => {
      windows.toast?.webContents.send('download-progress', { progress: progressObj });
    });

    autoUpdater.on('update-downloaded', (info) => {
      logger.info('Update downloaded:', info.version);
      windows.toast?.webContents.send('update-downloaded', { info });
    });
  }
}

async function checkForUpdates(silent = false) {
  try {
    const result = await autoUpdater.checkForUpdates();
    return {
      success: true,
      updateInfo: result.updateInfo,
      versionInfo: {
        current: app.getVersion(),
        latest: result.updateInfo.version
      },
      hasUpdate: semver.gt(result.updateInfo.version, app.getVersion())
    };
  } catch (error) {
    logger.error('Error checking for updates:', error);
    return {
      success: false,
      error: error.message
    };
  }
}
```

### 전자 서명 및 코드 사인

모든 Toast 앱 업데이트는 배포 전에 전자 서명됩니다:

1. **Windows**: Authenticode 인증서로 서명
2. **macOS**: Apple Developer ID 인증서로 서명 및 공증
3. **Linux**: AppImage 및 Debian 패키지는 GPG로 서명

이러한 서명을 통해 악의적인 수정이나 변조 위험으로부터 사용자를 보호합니다.

### 업데이트 메타데이터

릴리스 메타데이터는 `update.yml` 파일에 저장되며 다음 정보를 포함합니다:

```yaml
version: 0.5.42
files:
  - url: Toast-App-0.5.42-mac.zip
    sha512: YzM0ZDYwMGVlNjVjYjJkODVhYzc1OTgzOWY5NjJiZjBjYjQyZjkxMjM4Njk1OWE5ZTJhNjYyZjUyNWYwOWRiYTA=
    size: 68943259
    blockMapSize: 73422
  - url: Toast-App-0.5.42.dmg
    sha512: OWNkOWZhZTMxYzY5MWRmMTNlOTJhYzFkYjg4MzBiMDcxNTAyZDM3MWNmMjU1N2FmNWY3NjkwZGZjN2MzZDExNA==
    size: 72345678
path: Toast-App-0.5.42-mac.zip
sha512: YzM0ZDYwMGVlNjVjYjJkODVhYzc1OTgzOWY5NjJiZjBjYjQyZjkxMjM4Njk1OWE5ZTJhNjYyZjUyNWYwOWRiYTA=
releaseDate: '2025-04-25T14:30:00.000Z'
```

이 메타데이터는 다음과 같은 역할을 합니다:

1. 사용 가능한 최신 버전 식별
2. 다운로드할 올바른 파일 결정
3. 다운로드된 파일의 무결성 확인
4. 사용자에게 제공할 릴리스 정보 가져오기

개발자는 GitHub 릴리스 프로세스를 통해 이 메타데이터를 자동으로 생성할 수 있습니다. 이 프로세스는 `electron-builder` 도구에 의해 처리됩니다.
