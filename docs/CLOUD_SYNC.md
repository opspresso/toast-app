# 클라우드 동기화 가이드

이 문서는 Toast-App(Electron 앱)에서 구현된 클라우드 동기화 기능에 대해 설명합니다.

## 목차

- [개요](#개요)
- [클라우드 동기화 구조](#클라우드-동기화-구조)
- [동기화 이벤트](#동기화-이벤트)
- [설정 다운로드 API](#설정-다운로드-api)
- [설정 업로드 API](#설정-업로드-api)
- [동기화 구현](#동기화-구현)
- [로컬 데이터 관리](#로컬-데이터-관리)
- [오류 처리 전략](#오류-처리-전략)
- [보안 고려사항](#보안-고려사항)

## 개요

Toast-App은 사용자의 설정(페이지 구성, 버튼 배치, 테마 등)을 클라우드에 동기화하여 여러 기기에서 일관된 경험을 제공합니다. 이 문서는 클라우드 동기화 구현 방식과 관련 API를 설명합니다.

## 클라우드 동기화 구조

```mermaid
sequenceDiagram
    participant ToastApp
    participant ToastWeb
    participant Database
    participant LocalFile

    ToastApp->>ToastWeb: 설정 업로드 (PUT /api/users/settings)
    ToastWeb->>Database: 설정 저장
    ToastWeb->>ToastApp: 응답 (성공/실패)
    ToastApp->>LocalFile: 설정 로컬 저장

    alt 다른 기기에서 로그인
        ToastApp2->>ToastWeb: 설정 다운로드 (GET /api/users/settings)
        ToastWeb->>Database: 설정 조회
        Database->>ToastWeb: 설정 데이터
        ToastWeb->>ToastApp2: 설정 전송
        ToastApp2->>LocalFile: 설정 로컬 저장
    end
```

## 동기화 이벤트

설정 동기화는 다음과 같은 특정 타이밍에 발생합니다:

### 서버에서 다운로드하는 시점
1. **로그인 성공 시**: 사용자가 로그인에 성공하면 즉시 서버에서 최신 설정을 다운로드합니다.
   ```javascript
   // 로그인 후 설정 다운로드 예시
   async function handleLoginSuccess() {
     try {
       await downloadSettings();
       console.log('로그인 후 설정 다운로드 완료');
     } catch (error) {
       console.error('설정 다운로드 실패:', error);
     }
   }
   ```

### 로칼 파일에 저장하는 시점
1. **페이지 추가 시**: 사용자가 새 페이지를 추가하면 변경사항을 즉시 로컬 파일(user-settings.json)에 저장합니다.
2. **페이지 삭제 시**: 사용자가 페이지를 삭제하면 변경사항을 즉시 로컬 파일에 저장합니다.
3. **버튼 수정 시**: 사용자가 버튼을 추가, 수정 또는 삭제하면 변경사항을 로컬 파일에 저장합니다.

각 변경은 로컬 파일에 즉시 저장되며, configStore에서 감지한 변경사항이 user-settings.json 파일로 자동 저장됩니다.

### 서버와 동기화하는 시점
1. **주기적 동기화**: 설정된 간격(15분)마다 자동으로 동기화를 시도합니다.
2. **앱 시작 시**: 사용자가 이미 로그인된 상태에서 앱을 시작할 때 동기화합니다.
3. **네트워크 복구 시**: 오프라인 상태에서 온라인 상태로 전환될 때 동기화를 시도합니다.

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
  // 변경 유형 감지 (페이지 추가, 삭제, 버튼 수정)
  if (Array.isArray(newValue) && Array.isArray(oldValue)) {
    if (newValue.length > oldValue.length) {
      // 페이지 추가 감지
      console.log('페이지 추가 감지, 로컬 파일에 저장...');
    } else if (newValue.length < oldValue.length) {
      // 페이지 삭제 감지
      console.log('페이지 삭제 감지, 로컬 파일에 저장...');
    } else if (JSON.stringify(newValue) !== JSON.stringify(oldValue)) {
      // 버튼 수정 감지
      console.log('버튼 수정 감지, 로컬 파일에 저장...');
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
        console.log('로컬 설정 파일에 페이지 정보 저장 완료');
      }
    } catch (error) {
      console.error('설정 파일 업데이트 오류:', error);
    }
  }

  // 주기적 서버 동기화는 별도 타이머로 수행
});
```

## 로컬 데이터 관리

Toast-App은 사용자 프로필, 구독 정보, 설정 등을 로컬 파일로 저장하고 관리합니다. 이를 통해 오프라인 상태에서도 앱이 정상적으로 동작할 수 있습니다.

### 로컬 파일 저장 위치

사용자 데이터는 각 운영체제의 표준 위치에 저장됩니다:

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

모든 로컬 설정 파일에는 타임스탬프 정보가 포함되어 동기화 시 충돌을 방지하고 최신 데이터를 식별합니다:

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
    // 타임스탬프가 없는 경우 현재 시간으로 추가
    settingsData.lastModifiedAt = Date.now();
    settingsData.lastModifiedDevice = getDeviceIdentifier();
    writeToFile(SETTINGS_FILE_PATH, settingsData);
  }

  return settingsData;
}
```

타임스탬프는 다음과 같은 용도로 사용됩니다:

1. **변경 감지**: 로컬 설정과 서버 설정의 변경 시점을 비교하여 최신 버전 식별
2. **충돌 해결**: 여러 기기에서 동시에 변경이 발생한 경우, 타임스탬프를 기준으로 병합 또는 우선순위 결정
3. **동기화 최적화**: 마지막 동기화 이후 변경이 없는 경우 불필요한 네트워크 요청 방지

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

사용자 데이터 파일 관리는 `user-data-manager.js` 모듈에서 처리합니다:

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
    console.error(`파일 읽기 오류 (${filePath}):`, error);
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
    console.error(`파일 저장 오류 (${filePath}):`, error);
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
    console.error(`파일 삭제 오류 (${filePath}):`, error);
    return false;
  }
}
```

### 주기적 데이터 갱신

프로필 및 설정 정보는 일정 시간마다 자동으로 갱신됩니다:

```javascript
// 주기적 갱신 설정
const REFRESH_INTERVAL_MS = 30 * 60 * 1000; // 30분마다 갱신
let profileRefreshTimer = null;
let settingsRefreshTimer = null;

// 주기적 프로필 갱신 시작
function startProfileRefresh() {
  // 이미 실행 중인 타이머가 있으면 중지
  stopProfileRefresh();

  // 즉시 한 번 실행 후 타이머 시작
  getUserProfile(true).then(profile => {
    console.log('초기 프로필 갱신 완료');
  });

  // 주기적 갱신 타이머 설정
  profileRefreshTimer = setInterval(async () => {
    try {
      await getUserProfile(true);
      console.log('주기적 프로필 갱신 완료');
    } catch (error) {
      console.error('주기적 프로필 갱신 오류:', error);
    }
  }, REFRESH_INTERVAL_MS);
}

// 유사한 방식으로 설정 정보도 주기적 갱신
```

### 로그아웃 시 데이터 정리

```javascript
// 로그아웃 시 데이터 정리
function cleanupOnLogout() {
  try {
    // 주기적 갱신 중지
    stopProfileRefresh();
    stopSettingsRefresh();

    // 저장된 파일 삭제
    deleteFile(PROFILE_FILE_PATH);
    // deleteFile(SETTINGS_FILE_PATH); // 삭제 하지 않음

    console.log('사용자 데이터 정리 완료');
    return true;
  } catch (error) {
    console.error('로그아웃 데이터 정리 오류:', error);
    return false;
  }
}
```

## 오류 처리 전략

Toast-App은 다양한 네트워크 오류와 API 응답 오류를 적절히 처리하여 사용자 경험을 유지합니다.

### 주요 오류 처리 전략

1. **네트워크 연결 오류**: 로컬에 저장된 데이터를 사용하여 오프라인 기능 유지
2. **토큰 만료 오류**: 자동으로 리프레시 토큰으로 갱신 시도
3. **API 요청 실패**: 적절한 재시도 로직 및 사용자에게 통보

### 오류 대응 방법

| 오류 유형 | 설명 | 처리 방법 |
|-----------|------|-----------|
| `NETWORK_ERROR` | 네트워크 연결 오류 | 로컬 데이터 사용, 재연결 시 동기화 |
| `API_ERROR` | API 서버 오류 | 일정 시간 후 재시도 |
| `CONFLICT` | 데이터 충돌 발생 | 타임스탬프 기반으로 최신 데이터 우선 적용 |
| `QUOTA_EXCEEDED` | 데이터 크기 제한 초과 | 비필수 데이터 정리 후 재시도 |

### 비어있는 파일 처리

파일이 손상되었거나 비어있는 경우 기본값을 제공하여 오류를 방지합니다:

```javascript
function getUserSettings() {
  try {
    const settingsData = readFromFile(SETTINGS_FILE_PATH);

    if (!settingsData) {
      // 파일이 없거나 비어있는 경우 기본 설정 반환
      return {
        pages: [],
        appearance: { theme: 'system' },
        advanced: { autoStart: true }
      };
    }

    return settingsData;
  } catch (error) {
    // 오류 발생 시 기본 설정 반환
    console.error('설정 정보 가져오기 오류:', error);
    return getDefaultSettings();
  }
}
```

## 보안 고려사항

클라우드 동기화 관련 데이터 보안을 유지하기 위한 조치:

1. **전송 보안**: 모든 API 통신은 HTTPS를 통해 암호화
2. **저장 보안**: 로컬 파일은 OS의 사용자 디렉토리 권한 통해 보호
3. **인증 보안**: 동기화는 유효한 액세스 토큰을 통해서만 가능
4. **데이터 최소화**: 필수 데이터만 동기화하여 민감 정보 노출 최소화

### 동기화 충돌 해결

여러 기기에서 동시에 설정이 변경될 경우 다음 전략으로 충돌을 해결합니다:

1. **타임스탬프 기반**: 가장 최근에 변경된 설정이 우선
2. **병합 전략**: 가능한 경우 충돌 없는 필드는 병합하여 데이터 보존
3. **사용자 알림**: 충돌 발생 시 사용자에게 통보하고 선택 옵션 제공

## 설정 저장소 단일화 구현

클라우드 동기화의 안정성과 데이터 일관성 향상을 위해 설정 저장소를 단일화하는 방식으로 구현이 결정되었습니다. 이 섹션에서는 구현 방식과 세부 사항을 설명합니다.

### 구현 배경

기존 시스템에서는 다음과 같은 문제점이 있었습니다:

1. **설정 저장소의 이원화**:
   - `config.json` (electron-store로 관리): 앱의 기본 설정, UI 설정, 페이지 정보 등 저장
   - `user-settings.json` (파일 시스템에 직접 저장): API와 동기화하려는 사용자 설정 정보 저장

2. **동기화 불일치**:
   - `cloud-sync.js`에서는 configStore의 변경을 감지하여 `user-settings.json` 파일에 저장
   - `api/sync.js`에서는 서버로부터 다운로드한 설정을 `configStore`에 직접 저장
   - 실제 데이터는 `config.json`에 있지만, 클라우드 동기화 시 `user-settings.json`을 참조하는 문제

3. **부자연스러운 동기화 흐름**:
   - 사용자 변경 → configStore 변경 → user-settings.json 업데이트 → API로 업로드
   - 서버 다운로드 → configStore 직접 업데이트 → user-settings.json 타임스탬프만 업데이트
   - 이로 인한 데이터 불일치 발생 가능성

### 설정 저장소 단일화 구현

단일 설정 저장소 접근법은 electron-store(configStore)를 주 데이터 소스로 사용하고, `user-settings.json`은 동기화 메타데이터 저장용으로만 활용합니다.

#### 1. uploadSettings 함수 수정

```javascript
// cloud-sync.js의 uploadSettings 함수 수정
async function uploadSettings() {
  // 기존 코드 대신 직접 configStore에서 데이터 추출
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

  // 성공 시 마지막 동기화 정보만 user-settings.json에 저장
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
    console.error('동기화 메타데이터 업데이트 오류:', error);
    return false;
  }
}
```

#### 3. 설정 변경 감지 로직 개선

```javascript
// cloud-sync.js의 setupConfigListeners 함수 수정
function setupConfigListeners() {
  // 페이지 설정 변경 감지
  configStore.onDidChange('pages', async (newValue, oldValue) => {
    // 동기화가 비활성화되었거나 로그인하지 않은 경우 동기화 스킵
    if (!state.enabled || !await canSync()) {
      return;
    }

    // 변경 유형 감지...

    // user-settings.json에 전체 데이터를 복제하는 대신 메타데이터만 업데이트
    const timestamp = getCurrentTimestamp();
    userDataManager.updateSyncMetadata({
      lastModifiedAt: timestamp,
      lastModifiedDevice: state.deviceId
    });

    // 동기화 예약...
  });

  // 비슷한 방식으로 다른 onDidChange 이벤트 핸들러 수정...
}
```

#### 4. 다운로드 로직 개선

```javascript
// cloud-sync.js의 downloadSettings 함수 수정
async function downloadSettings() {
  // 기존 로직...

  if (result.success) {
    // 메타데이터만 user-settings.json에 업데이트
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

### 구현 변경 사항 요약

1. **api/sync.js**:
   - 변경 없음 (이미 configStore를 사용하여 설정 저장 및 조회)

2. **cloud-sync.js**:
   - `uploadSettings` 함수에서 데이터 소스를 user-settings.json에서 configStore로 변경
   - 설정 변경 감지 시 메타데이터만 업데이트

3. **user-data-manager.js**:
   - 동기화 메타데이터만 관리하는 `updateSyncMetadata` 함수 추가

### 마이그레이션 전략

기존 데이터 구조에서 단일 저장소 방식으로 원활하게 전환하기 위한 마이그레이션 전략입니다:

1. **데이터 마이그레이션 유틸리티 개발**:
   - 앱 시작 시 user-settings.json의 데이터가 config.json에 없는 경우 자동으로 이관
   - 사용자에게 투명하게 진행되도록 구현

2. **점진적 코드 전환**:
   - 첫 단계로 uploadSettings와 설정 변경 감지 로직 수정
   - 이후 점진적으로 다른 관련 코드 수정

3. **이전 버전 호환성 유지**:
   - 이전 버전과의 호환성을 유지하기 위해 이행 기간 동안 두 방식 모두 지원
   - 특정 버전 이후 user-settings.json 데이터 구조를 메타데이터 전용으로 단순화
