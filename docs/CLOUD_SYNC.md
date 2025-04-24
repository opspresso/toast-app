# 클라우드 동기화 가이드

이 문서는 Toast 앱(Electron 애플리케이션)에 구현된 클라우드 동기화 기능에 대한 상세한 설명을 제공합니다.

## 목차

- [개요](#개요)
- [클라우드 동기화 아키텍처](#클라우드-동기화-아키텍처)
- [동기화 이벤트](#동기화-이벤트)
- [설정 다운로드 API](#설정-다운로드-API)
- [설정 업로드 API](#설정-업로드-API)
- [동기화 구현](#동기화-구현)
- [로컬 데이터 관리](#로컬-데이터-관리)
- [오류 처리 전략](#오류-처리-전략)
- [보안 고려사항](#보안-고려사항)
- [통합 설정 저장소 구현](#통합-설정-저장소-구현)

## 개요

Toast 앱은 사용자 설정(페이지 구성, 버튼 레이아웃, 테마 등)을 클라우드에 동기화하여 여러 장치에서 일관된 경험을 제공합니다. 이 문서는 클라우드 동기화 구현과 관련 API를 설명합니다.

## 클라우드 동기화 아키텍처

```mermaid
sequenceDiagram
    participant ToastApp
    participant ToastWeb
    participant Database
    participant LocalFile

    ToastApp->>ToastWeb: Upload Settings (PUT /api/users/settings)
    ToastWeb->>Database: Save Settings
    ToastWeb->>ToastApp: Response (Success/Failure)
    ToastApp->>LocalFile: Save Settings Locally

    alt Login from Another Device
        ToastApp2->>ToastWeb: Download Settings (GET /api/users/settings)
        ToastWeb->>Database: Retrieve Settings
        Database->>ToastWeb: Settings Data
        ToastWeb->>ToastApp2: Transmit Settings
        ToastApp2->>LocalFile: Save Settings Locally
    end
```

## 동기화 이벤트

설정 동기화는 특정 타이밍 이벤트에 발생합니다:

### 서버에서 다운로드 트리거
1. **로그인 성공 시**: 사용자가 성공적으로 로그인하면 최신 설정이 즉시 서버에서 다운로드됩니다.
   ```javascript
   // 로그인 후 설정 다운로드 예시
   async function handleLoginSuccess() {
     try {
       await downloadSettings();
       console.log('Settings download completed after login');
     } catch (error) {
       console.error('Failed to download settings:', error);
     }
   }
   ```

### 로컬 파일 저장 트리거
1. **페이지 추가 시**: 사용자가 새 페이지를 추가하면 변경사항이 즉시 로컬 파일(user-settings.json)에 저장됩니다.
2. **페이지 삭제 시**: 사용자가 페이지를 삭제하면 변경사항이 즉시 로컬 파일에 저장됩니다.
3. **버튼 수정 시**: 사용자가 버튼을 추가, 편집 또는 삭제하면 변경사항이 로컬 파일에 저장됩니다.

각 변경사항은 즉시 로컬 파일에 저장되며, configStore에 의해 감지된 변경사항은 자동으로 user-settings.json 파일에 저장됩니다.

### 서버 동기화 트리거
1. **주기적 동기화**: 설정된 간격(15분)으로 자동으로 동기화를 시도합니다.
2. **앱 시작 시**: 사용자가 이미 로그인한 상태라면 앱 시작 시 동기화합니다.
3. **네트워크 복구 시**: 오프라인에서 온라인 상태로 전환될 때 동기화를 시도합니다.

## 설정 다운로드 API

```http
GET /api/users/settings HTTP/1.1
Host: app.toast.sh
Authorization: Bearer ACCESS_TOKEN
```

### 응답

```json
{
  "pages": [...],
  "appearance": {...},
  "advanced": {...},
  "lastSyncedAt": "2024-04-01T12:30:45Z"
}
```

## 설정 업로드 API

```http
PUT /api/users/settings HTTP/1.1
Host: app.toast.sh
Authorization: Bearer ACCESS_TOKEN
Content-Type: application/json

{
  "pages": [...],
  "appearance": {...},
  "advanced": {...}
}
```

### 응답

```json
{
  "success": true,
  "message": "Settings updated successfully",
  "lastSyncedAt": "2024-04-01T12:45:30Z"
}
```

## 동기화 구현

설정 동기화는 `cloud-sync.js` 모듈에서 관리됩니다:

```javascript
const { sync: apiSync } = require('./api');
const { createConfigStore } = require('./config');

// 동기화 관련 상수
const SYNC_DEBOUNCE_MS = 2000; // 마지막 변경 후 2초 후에 동기화
const PERIODIC_SYNC_INTERVAL_MS = 15 * 60 * 1000; // 15분마다 자동 동기화

// 설정 변경 감지 및 로컬 파일 저장
configStore.onDidChange('pages', async (newValue, oldValue) => {
  // 변경 유형 감지(페이지 추가, 삭제, 버튼 수정)
  if (Array.isArray(newValue) && Array.isArray(oldValue)) {
    if (newValue.length > oldValue.length) {
      // 페이지 추가 감지
      console.log('Page addition detected, saving to local file...');
    } else if (newValue.length < oldValue.length) {
      // 페이지 삭제 감지
      console.log('Page deletion detected, saving to local file...');
    } else if (JSON.stringify(newValue) !== JSON.stringify(oldValue)) {
      // 버튼 수정 감지
      console.log('Button modification detected, saving to local file...');
    }
  }

  // user-settings.json 파일에 저장
  if (userDataManagerRef) {
    try {
      const currentSettings = await userDataManagerRef.getUserSettings();
      if (currentSettings) {
        const timestamp = getCurrentTimestamp();
        const updatedSettings = {
          ...currentSettings,
          pages: newValue,
          lastModifiedAt: timestamp,
          lastModifiedDevice: deviceInfo
        };

        userDataManagerRef.updateSettings(updatedSettings);
        console.log('Page information saved to local settings file');
      }
    } catch (error) {
      console.error('Settings file update error:', error);
    }
  }

  // 주기적 서버 동기화는 별도 타이머로 수행
});
```

## 로컬 데이터 관리

Toast 앱은 사용자 프로필, 구독 정보, 설정 등을 로컬 파일로 저장하고 관리합니다. 이를 통해 오프라인 상태에서도 앱이 정상적으로 작동할 수 있습니다.

### 로컬 파일 저장 위치

사용자 데이터는 각 운영 체제의 표준 위치에 저장됩니다:

- **Windows**: `C:\Users\{Username}\AppData\Roaming\toast-app\`
- **macOS**: `/Users/{Username}/Library/Application Support/toast-app/`
- **Linux**: `/home/{username}/.config/toast-app/`

### 저장되는 파일 종류

| 파일명 | 설명 | 내용 |
|--------|------|------|
| `auth-tokens.json` | 인증 토큰 정보 | 액세스 토큰, 리프레시 토큰, 만료 시간 |
| `user-profile.json` | 사용자 프로필 정보 | 이름, 이메일, 아바타, 구독 정보 등 |
| `user-settings.json` | 사용자 설정 정보 | 페이지 구성, 테마, 단축키, 타임스탬프 등 |
| `config.json` | 앱 구성 정보 | 일반 설정, 창 크기, 위치 등 |

### 타임스탬프 관리

모든 로컬 설정 파일에는 동기화 중 충돌을 방지하고 최신 데이터를 식별하기 위한 타임스탬프 정보가 포함됩니다:

```javascript
// 설정 저장 시 타임스탬프 추가 예시
function saveSettings(settingsData) {
  // 현재 시간을 타임스탬프로 추가
  const dataWithTimestamp = {
    ...settingsData,
    lastModifiedAt: Date.now(),
    lastModifiedDevice: getDeviceIdentifier()
  };

  return writeToFile(SETTINGS_FILE_PATH, dataWithTimestamp);
}

// 설정 로드 시 타임스탬프 확인 예시
function loadSettings() {
  const settingsData = readFromFile(SETTINGS_FILE_PATH);

  if (settingsData && !settingsData.lastModifiedAt) {
    // 타임스탬프가 없으면 현재 시간 추가
    settingsData.lastModifiedAt = Date.now();
    settingsData.lastModifiedDevice = getDeviceIdentifier();
    writeToFile(SETTINGS_FILE_PATH, settingsData);
  }

  return settingsData;
}
```

타임스탬프는 다음 용도로 사용됩니다:

1. **변경 감지**: 로컬 설정과 서버 설정의 변경 시간을 비교하여 최신 버전 식별
2. **충돌 해결**: 여러 장치에서 동시에 변경이 발생한 경우 타임스탬프를 기준으로 병합 또는 우선순위 지정
3. **동기화 최적화**: 마지막 동기화 이후 변경이 없으면 불필요한 네트워크 요청 방지

```json
// user-settings.json 예시
{
  "pages": [...],
  "appearance": {
    "theme": "dark"
  },
  "lastModifiedAt": 1682932134590,
  "lastModifiedDevice": "macbook-pro-m1",
  "lastSyncedAt": 1682932134590
}
```

### 파일 관리 모듈

사용자 데이터 파일 관리는 `user-data-manager.js` 모듈에서 처리됩니다:

```javascript
const { app } = require('electron');
const path = require('path');
const fs = require('fs');

// 파일 경로 상수
const USER_DATA_PATH = app.getPath('userData');
const PROFILE_FILE_PATH = path.join(USER_DATA_PATH, 'user-profile.json');
const SETTINGS_FILE_PATH = path.join(USER_DATA_PATH, 'user-settings.json');

// 파일 읽기
function readFromFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      return null;
    }
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`File reading error (${filePath}):`, error);
    return null;
  }
}

// 파일 쓰기
function writeToFile(filePath, data) {
  try {
    const dirPath = path.dirname(filePath);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error(`File saving error (${filePath}):`, error);
    return false;
  }
}

// 파일 삭제
function deleteFile(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
    return false;
  } catch (error) {
    console.error(`File deletion error (${filePath}):`, error);
    return false;
  }
}
```

### 주기적 데이터 새로고침

프로필 및 설정 정보는 설정된 간격으로 자동으로 새로고침됩니다:

```javascript
// 주기적 새로고침 설정
const REFRESH_INTERVAL_MS = 30 * 60 * 1000; // 30분마다 새로고침
let profileRefreshTimer = null;
let settingsRefreshTimer = null;

// 주기적 프로필 새로고침 시작
function startProfileRefresh() {
  // 이미 실행 중인 타이머가 있으면 중지
  stopProfileRefresh();

  // 최초 한 번 즉시 실행한 다음 타이머 시작
  getUserProfile(true).then(profile => {
    console.log('Initial profile refresh complete');
  });

  // 주기적 새로고침 타이머 설정
  profileRefreshTimer = setInterval(async () => {
    try {
      await getUserProfile(true);
      console.log('Periodic profile refresh complete');
    } catch (error) {
      console.error('Periodic profile refresh error:', error);
    }
  }, REFRESH_INTERVAL_MS);
}

// 설정 정보도 유사한 방식으로 주기적 새로고침
```

### 로그아웃 시 데이터 정리

```javascript
// 로그아웃 시 데이터 정리
function cleanupOnLogout() {
  try {
    // 주기적 새로고침 중지
    stopProfileRefresh();
    stopSettingsRefresh();

    // 저장된 파일 삭제
    deleteFile(PROFILE_FILE_PATH);
    // deleteFile(SETTINGS_FILE_PATH); // 삭제하지 않음

    console.log('User data cleanup complete');
    return true;
  } catch (error) {
    console.error('Logout data cleanup error:', error);
    return false;
  }
}
```

## 오류 처리 전략

Toast 앱은 다양한 네트워크 오류와 API 응답 오류를 적절하게 처리하여 사용자 경험을 유지합니다.

### 주요 오류 처리 전략

1. **네트워크 연결 오류**: 로컬에 저장된 데이터를 사용하여 오프라인 기능 유지
2. **토큰 만료 오류**: 리프레시 토큰을 사용하여 자동으로 갱신 시도
3. **API 요청 실패**: 적절한 재시도 로직 및 사용자 알림

### 오류 처리 방법

| 오류 유형 | 설명 | 처리 방법 |
|-----------|------|-----------|
| `NETWORK_ERROR` | 네트워크 연결 오류 | 로컬 데이터 사용, 재연결 시 동기화 |
| `API_ERROR` | API 서버 오류 | 일정 시간 후 재시도 |
| `CONFLICT` | 데이터 충돌 발생 | 타임스탬프를 기준으로 가장 최근 데이터 적용 |
| `QUOTA_EXCEEDED` | 데이터 크기 제한 초과 | 필수적이지 않은 데이터 정리 후 재시도 |

### 빈 파일 처리

파일이 손상되었거나 비어있을 때 오류를 방지하기 위해 기본값 제공:

```javascript
function getUserSettings() {
  try {
    const settingsData = readFromFile(SETTINGS_FILE_PATH);

    if (!settingsData) {
      // 파일이 없거나 비어있으면 기본 설정 반환
      return {
        pages: [],
        appearance: { theme: 'system' },
        advanced: { autoStart: true }
      };
    }

    return settingsData;
  } catch (error) {
    // 오류 발생 시 기본 설정 반환
    console.error('Error retrieving settings:', error);
    return getDefaultSettings();
  }
}
```

## 보안 고려사항

클라우드 동기화 관련 데이터 보안을 유지하기 위한 조치:

1. **전송 보안**: 모든 API 통신은 HTTPS를 통해 암호화
2. **저장 보안**: 로컬 파일은 OS 사용자 디렉토리 권한을 통해 보호
3. **인증 보안**: 유효한 액세스 토큰을 통해서만 동기화 가능
4. **데이터 최소화**: 필수 데이터만 동기화하여 민감한 정보 노출 최소화

### 동기화 충돌 해결

여러 장치에서 동시에 설정이 변경될 때 다음과 같은 전략으로 충돌을 해결합니다:

1. **타임스탬프 기반**: 가장 최근에 변경된 설정이 우선
2. **병합 전략**: 가능한 경우 충돌하지 않는 필드를 병합하여 데이터 보존
3. **사용자 알림**: 충돌이 발생할 때 사용자에게 알리고 선택 옵션 제공

## 통합 설정 저장소 구현

클라우드 동기화 신뢰성과 데이터 일관성을 향상시키기 위해 통합 설정 저장소 접근 방식이 구현되었습니다. 이 섹션에서는 구현 방법과 세부 사항을 설명합니다.

### 구현 배경

이전 시스템에는 다음과 같은 문제가 있었습니다:

1. **이중 설정 저장**:
   - `config.json`(electron-store로 관리): 앱 기본 설정, UI 설정, 페이지 정보 등 저장
   - `user-settings.json`(파일 시스템에 직접 저장): API와 동기화할 사용자 설정 정보 저장

2. **동기화 불일치**:
   - `cloud-sync.js`는 configStore 변경을 감지하여 `user-settings.json` 파일에 저장
   - `api/sync.js`는 서버에서 다운로드한 설정을 직접 `configStore`에 저장
   - 실제 데이터는 `config.json`에 있지만 클라우드 동기화는 `user-settings.json` 참조

3. **부자연스러운 동기화 흐름**:
   - 사용자 변경 → configStore 변경 → user-settings.json 업데이트 → API에 업로드
   - 서버 다운로드 → 직접 configStore 업데이트 → user-settings.json 타임스탬프만 업데이트
   - 이로 인한 잠재적 데이터 불일치 가능성

### 통합 설정 저장소 구현

통합 설정 저장소 접근 방식은 electron-store(configStore)를 주 데이터 소스로 사용하고, `user-settings.json`은 동기화 메타데이터 저장용으로만 사용합니다.

#### 1. 수정된 uploadSettings 함수

```javascript
// cloud-sync.js의 수정된 uploadSettings 함수
async function uploadSettings() {
  // 이전 코드 대신 configStore에서 직접 데이터 추출
  const pages = configStore.get('pages') || [];
  const appearance = configStore.get('appearance');
  const advanced = configStore.get('advanced');

  // 타임스탬프 업데이트
  const timestamp = getCurrentTimestamp();

  // 업로드할 데이터 구성
  const uploadData = {
    pages,
    lastSyncedDevice: state.deviceId,
    lastSyncedAt: timestamp,
    appearance,
    advanced
  };

  // API 호출...

  // 성공 시 user-settings.json에 마지막 동기화 정보만 저장
  const metaData = {
    lastSyncedAt: timestamp,
    lastSyncedDevice: state.deviceId
  };
  userDataManager.updateSyncMetadata(metaData);

  // ...
}
```

#### 2. 동기화 메타데이터 관리 함수 추가

```javascript
// user-data-manager.js에 메타데이터 저장 함수 추가
function updateSyncMetadata(metadata) {
  try {
    const currentSettings = readFromFile(SETTINGS_FILE_PATH) || {};
    const updatedSettings = {
      ...currentSettings,
      lastSyncedAt: metadata.lastSyncedAt,
      lastSyncedDevice: metadata.lastSyncedDevice
    };

    return writeToFile(SETTINGS_FILE_PATH, updatedSettings);
  } catch (error) {
    console.error('Synchronization metadata update error:', error);
    return false;
  }
}
```

#### 3. 개선된 설정 변경 감지 로직

```javascript
// cloud-sync.js의 수정된 setupConfigListeners 함수
function setupConfigListeners() {
  // 페이지 설정 변경 감지
  configStore.onDidChange('pages', async (newValue, oldValue) => {
    // 동기화가 비활성화되었거나 로그인하지 않은 경우 동기화 건너뛰기
    if (!state.enabled || !await canSync()) {
      return;
    }

    // 변경 유형 감지...

    // 모든 데이터를 user-settings.json에 복제하는 대신 메타데이터만 업데이트
    const timestamp = getCurrentTimestamp();
    userDataManager.updateSyncMetadata({
      lastModifiedAt: timestamp,
      lastModifiedDevice: state.deviceId
    });

    // 동기화 예약...
  });

  // 다른 onDidChange 이벤트 핸들러도 유사하게 수정...
}
```

#### 4. 개선된 다운로드 로직

```javascript
// cloud-sync.js의 수정된 downloadSettings 함수
async function downloadSettings() {
  // 기존 로직...

  if (result.success) {
    // user-settings.json에 메타데이터만 업데이트
    const timestamp = getCurrentTimestamp();
    userDataManager.updateSyncMetadata({
      lastSyncedAt: timestamp,
      lastModifiedAt: timestamp,
      lastModifiedDevice: state.deviceId
    });
  }

  // ...
}
```

### 구현 변경 요약

1. **api/sync.js**:
   - 변경 없음(이미 설정 저장 및 검색에 configStore 사용)

2. **cloud-sync.js**:
   - `uploadSettings` 함수에서 데이터 소스를 user-settings.json에서 configStore로 변경
   - 설정 변경 감지 시 메타데이터만 업데이트

3. **user-data-manager.js**:
   - 동기화 메타데이터만 관리하는 `updateSyncMetadata` 함수 추가

### 마이그레이션 전략

기존 데이터 구조에서 통합 저장소 접근 방식으로 원활하게 전환하기 위한 마이그레이션 전략:

1. **데이터 마이그레이션 유틸리티 개발**:
   - 앱 시작 시 아직 존재하지 않는 경우 user-settings.json에서 config.json으로 데이터 자동 마이그레이션
   - 사용자에게 투명하게 구현

2. **점진적 코드 전환**:
   - 1단계: uploadSettings 및 설정 변경 감지 로직 수정
   - 이후 관련 다른 코드 점진적으로 수정

3. **하위 호환성**:
   - 이전 버전과의 호환성을 유지하기 위해 전환 기간 동안 두 방법 모두 지원
   - 특정 버전 이후 user-settings.json 데이터 구조를 메타데이터 전용으로 단순화
