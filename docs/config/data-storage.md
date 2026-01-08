# Toast App 데이터 저장소

이 문서는 Toast 앱의 데이터 저장 모델, 파일 구조 및 관리 방법을 설명합니다.

> **참고**: 데이터 스키마와 엔티티 관계는 [데이터 모델](./data-model.md)을 참조하세요.

## 목차

- [개요](#개요)
- [데이터 저장소 구조](#데이터-저장소-구조)
  - [구성 파일](#구성-파일)
  - [사용자 데이터](#사용자-데이터)
  - [인증 토큰](#인증-토큰)
  - [로그 파일](#로그-파일)
- [데이터 액세스 패턴](#데이터-액세스-패턴)
  - [구성 액세스](#구성-액세스)
  - [사용자 데이터 액세스](#사용자-데이터-액세스)
- [데이터 캐싱 및 성능](#데이터-캐싱-및-성능)
- [데이터 마이그레이션 전략](#데이터-마이그레이션-전략)
- [백업 및 복원](#백업-및-복원)
- [문제 해결](#문제-해결)

## 개요

Toast 앱은 여러 유형의 데이터를 로컬 파일 시스템에 저장합니다. 이 데이터에는 사용자 구성, 인증 정보, 로그 등이 포함됩니다. 이 문서는 이러한 다양한 데이터 저장소의 구조, 위치 및 관리 방법을 설명합니다.

## 데이터 저장소 구조

Toast 앱은 electron-store 라이브러리를 사용하여 데이터를 유지합니다. 이는 JSON 기반 저장소로, 운영체제의 표준 사용자 데이터 디렉토리 위치에 데이터를 저장합니다.

### 구성 파일

**위치**:
- **macOS**: `~/Library/Application Support/toast-app/config.json`
- **Windows**: `%APPDATA%\toast-app\config.json`
- **Linux**: `~/.config/toast-app/config.json`

**구조**:
구성 파일은 JSON 형식으로 저장되며 다음과 같은 주요 섹션을 포함합니다:

```json
{
  "globalHotkey": "Alt+Space",
  "pages": [
    {
      "id": "page1",
      "name": "Applications",
      "shortcut": "1",
      "buttons": [
        {
          "id": "button1",
          "name": "Terminal",
          "shortcut": "T",
          "icon": "⌨️",
          "actionType": "exec",
          "actionParams": {
            "command": "open -a Terminal"
          }
        },
        // 더 많은 버튼...
      ]
    },
    // 더 많은 페이지...
  ],
  "appearance": {
    "theme": "system",
    "position": "center",
    "size": "medium",
    "opacity": 0.95,
    "buttonLayout": "grid",
    "monitorPositions": {
      "12345": { "x": 100, "y": 200 }
    }
  },
  "advanced": {
    "launchAtLogin": false,
    "hideAfterAction": true,
    "hideOnBlur": true,
    "hideOnEscape": true,
    "showInTaskbar": false
  },
  "subscription": {
    "isSubscribed": false,
    "isAuthenticated": false,
    "expiresAt": "",
    "pageGroups": 1
  },
  "firstLaunchCompleted": true
}
```

자세한 구성 옵션은 [구성 스키마](./schema.md)를 참조하세요.

### 사용자 데이터

**위치**:
- **macOS**: `~/Library/Application Support/toast-app/`
- **Windows**: `%APPDATA%\toast-app\`
- **Linux**: `~/.config/toast-app/`

**구조**:
사용자 데이터는 애플리케이션 데이터 디렉토리에 직접 저장됩니다:

```
toast-app/
  ├── config.json            # 메인 구성 파일 (electron-store)
  ├── user-profile.json      # 사용자 프로필 정보
  ├── user-settings.json     # 사용자 설정 및 동기화 메타데이터
  └── auth-tokens.json       # 인증 토큰
```

**user-profile.json 구조**:
```json
{
  "name": "사용자 이름",
  "email": "user@example.com",
  "is_authenticated": true,
  "isAuthenticated": true,
  "subscription": {
    "plan": "free",
    "active": false,
    "is_subscribed": false,
    "features": {
      "page_groups": 1,
      "advanced_actions": false,
      "cloud_sync": false
    }
  }
}
```

**user-settings.json 구조**:
```json
{
  "lastSyncedAt": 1682932769000,
  "lastModifiedAt": 1682932768123,
  "lastSyncedDevice": "device-id-1",
  "lastModifiedDevice": "device-id-1"
}
```

### 인증 토큰

**위치**:
- **macOS**: `~/Library/Application Support/toast-app/auth-tokens.json`
- **Windows**: `%APPDATA%\toast-app\auth-tokens.json`
- **Linux**: `~/.config/toast-app/auth-tokens.json`

**구조**:
인증 토큰은 JSON 형식으로 저장됩니다:

```json
{
  "auth-token": "eyJhbGciOiJIUzI1NiIs...",
  "refresh-token": "eyJhbGciOiJIUzI1NiIs...",
  "token-expires-at": 1715000000000
}
```

> **참고**: 토큰은 현재 평문 JSON으로 저장됩니다. 파일 시스템 권한으로 보호되며, 운영체제의 사용자 데이터 디렉토리에 저장됩니다.

### 로그 파일

**위치**:
- **macOS**: `~/Library/Logs/toast-app/`
- **Windows**: `%USERPROFILE%\AppData\Roaming\toast-app\logs\`
- **Linux**: `~/.config/toast-app/logs/`

**구조**:
이 디렉토리는 애플리케이션 로그를 저장합니다:

```
logs/
  ├── toast-app.log           # 현재 로그 파일
  ├── toast-app.old.log       # 이전 로그 파일
  └── renderer-logs/          # 렌더러 프로세스 로그
      ├── renderer.log
      └── renderer.old.log
```

## 데이터 액세스 패턴

### 구성 액세스

구성 데이터는 `src/main/config.js` 모듈을 통해 액세스됩니다:

```javascript
const { createConfigStore } = require('./main/config');

// 구성 저장소 생성
const config = createConfigStore();

// 구성 값 가져오기
const globalHotkey = config.get('globalHotkey');

// 구성 값 설정
config.set('appearance.theme', 'dark');

// 여러 값 한 번에 설정
config.set({
  'appearance.theme': 'dark',
  'appearance.position': 'center'
});
```

주요 구성 액세스 패턴:

1. **초기화 시 로드**: 애플리케이션 시작 시 구성이 로드됩니다.
2. **반응형 변경 감지**: 구성에 대한 변경 사항은 실시간으로 감지되어 애플리케이션 동작에 반영됩니다.
3. **자동 저장**: 구성 변경 사항은 자동으로 디스크에 저장됩니다.
4. **디스크에 직접 액세스**: 구성 파일은 응용 프로그램 외부에서 평문 JSON으로 액세스할 수 있습니다.

### 사용자 데이터 액세스

사용자 데이터 관리는 `src/main/user-data-manager.js` 모듈을 통해 처리됩니다:

```javascript
const userDataManager = require('./main/user-data-manager');

// 사용자 프로필 가져오기
const profile = await userDataManager.getProfile();

// 동기화 메타데이터 업데이트
await userDataManager.updateSyncMetadata({
  lastSyncTime: new Date().toISOString(),
  deviceId: 'device-123',
  syncStatus: 'success'
});
```

## 데이터 캐싱 및 성능

Toast 앱은, 특히 다음과 같은 영역에서 메모리 내 캐싱을 사용하여 성능을 최적화합니다:

1. **구성 캐싱**: 구성 값이 메모리에 캐시되어 반복된 디스크 액세스를 줄입니다.
2. **사용자 프로필 캐싱**: 사용자 프로필 데이터는 메모리에 캐시되어 인증된 세션 전체에서 유지됩니다.
3. **토큰 캐싱**: 인증 토큰은 메모리에 캐시되어 보안 저장소에 대한 반복 액세스를 줄입니다.
4. **버튼 구성 캐싱**: 자주 액세스하는 버튼 구성이 메인 메모리와 렌더러 프로세스 모두에 캐시됩니다.

캐시된 데이터는 변경 시 디스크와 자동으로 동기화됩니다.

## 데이터 마이그레이션 전략

새 버전의 앱이 구성 스키마를 변경하면 마이그레이션 프로세스가 자동으로 시작됩니다:

1. **백업 생성**: 마이그레이션 전에 원래 구성 파일의 백업이 생성됩니다.
2. **스키마 버전 확인**: 현재 구성 스키마 버전이 확인됩니다.
3. **마이그레이션 적용**: 필요한 버전 간 마이그레이션이 순차적으로 적용됩니다.
4. **유효성 검사**: 마이그레이션된 구성에 대한 유효성 검사가 수행됩니다.
5. **적용**: 유효성 검사가 성공하면 마이그레이션된 구성이 적용됩니다.

마이그레이션이 실패하면 시스템이 백업 구성으로 복원됩니다.

## 문제 해결

**구성 손상**:
1. 앱을 종료합니다.
2. 백업 구성 파일(`config.backup.json`)을 찾습니다.
3. 백업을 `config.json`으로 복사합니다.
4. 앱을 다시 시작합니다.

**파일 권한 문제**:
1. 데이터 디렉토리의 파일 권한을 확인합니다.
2. 모든 파일이 현재 사용자에 의해 읽기/쓰기 가능한지 확인합니다.

**내보내기 실패**:
1. 선택한 위치에 쓰기 권한이 있는지 확인합니다.
2. 디스크 공간이 충분한지 확인합니다.
3. 내보내기 전에 앱을 다시 시작하고 다시 시도합니다.

**가져오기 실패**:
1. 가져오기 파일이 유효한 JSON 형식인지 확인합니다.
2. 파일이 손상되지 않았는지 확인합니다.
3. 필요한 경우 수동으로 파일을 편집하여 JSON 구문 오류를 수정합니다.
