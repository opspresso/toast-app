# Toast App 설정 관리 문서

이 문서는 Toast App의 설정 시스템에 대한 개요와 상세 정보를 제공합니다. Toast App의 설정 관리는 Electron-store를 기반으로 구현되어 있으며, 사용자 인터페이스를 통해 직관적으로 설정을 변경할 수 있습니다.

## 설정 시스템 개요

Toast App의 설정 시스템은 다음 구성 요소로 이루어져 있습니다:

1. **설정 저장소**: `electron-store`를 사용하여 JSON 형식으로 설정을 로컬에 저장합니다.
2. **설정 관리 모듈**: `src/main/config.js`에서 설정 스키마 정의 및 관리 기능을 제공합니다.
3. **설정 UI**: 사용자 친화적인 인터페이스를 통해 설정을 확인하고 변경할 수 있습니다.
4. **클라우드 동기화**: 프리미엄 사용자를 위한 설정 동기화 기능을 제공합니다.

## 설정 창 구조

현재 설정 창은 다음과 같은 탭으로 구성되어 있습니다:

### 1. General (일반)
- **Global Hotkey**: 애플리케이션을 호출하기 위한 전역 단축키 설정
- **Launch at login**: 시스템 로그인 시 자동 실행 설정

### 2. Appearance (모양)
- **테마**: 시스템/라이트/다크 테마 선택
- **창 위치**: 중앙, 상단, 하단, 커서 위치 중 선택
- **창 크기**: 작게, 중간, 크게 중 선택
- **창 투명도**: 슬라이더를 통한 투명도 조절 (0.1-1.0)

### 3. Account & Subscription (계정 및 구독)
- **로그인/로그아웃**: 사용자 계정 인증 기능
- **프로필 정보**: 로그인 후 사용자 이름, 이메일, 프로필 이미지 표시
- **구독 정보**: 현재 구독 상태, 만료일, 제공 기능 표시
- **구독 관리**: 구독 관리 페이지로 이동

### 4. Cloud Sync (클라우드 동기화)
- **동기화 상태**: 현재 동기화 상태 및 마지막 동기화 시간 표시
- **동기화 활성화/비활성화**: 클라우드 동기화 기능 토글
- **수동 동기화**: 서버에 업로드, 서버에서 다운로드, 충돌 해결 기능

### 5. Advanced (고급)
- **Hide after action**: 작업 실행 후 창 자동 숨김 설정
- **Hide on blur**: 포커스를 잃을 때 창 자동 숨김 설정
- **Hide on Escape key**: ESC 키 누를 때 창 자동 숨김 설정
- **Show in taskbar**: 작업 표시줄에 앱 표시 여부 설정
- **Reset to Defaults**: 모든 설정을 기본값으로 초기화

### 6. About (정보)
- **버전 정보**: 현재 앱 버전 표시
- **업데이트 관리**: 업데이트 확인, 다운로드, 설치 기능
- **홈페이지 링크**: 공식 웹사이트로 이동
- **대체 업데이트 방법**: Homebrew, GitHub 릴리스 등 대체 업데이트 방법 안내

## 설정 스키마

Toast App은 다음과 같은 설정 스키마를 사용합니다:

```javascript
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
      isSubscribed: {
        type: 'boolean',
        default: false,
      },
      isAuthenticated: {
        type: 'boolean',
        default: false,
      },
      expiresAt: {
        type: 'string',
        default: '',
      },
      pageGroups: {
        type: 'number',
        default: 1,
        description: 'Number of page groups: 1 for free users, 3 for authenticated users, 9 for subscribers',
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

## 주요 기능

### 설정 저장 및 로드

Toast App의 설정은 자동으로 저장되며, 애플리케이션 시작 시 로드됩니다. 설정 변경 사항은 사용자가 '저장' 버튼을 클릭할 때 적용됩니다.

```javascript
// 설정 저장 예시
window.settings.setConfig('globalHotkey', 'Alt+Space');
window.settings.setConfig('appearance.theme', 'dark');

// 설정 로드 예시
const config = await window.settings.getConfig();
```

### 설정 마이그레이션

애플리케이션 업데이트 시 설정 스키마가 변경될 수 있습니다. 이를 위해 Toast App은 마이그레이션 메커니즘을 제공합니다:

```javascript
function createConfigStore() {
  try {
    // 먼저 스키마 검증 없이 구성을 로드하여 마이그레이션
    const migrationStore = new Store({
      schema: null, // 스키마 검증 비활성화
      clearInvalidConfig: false,
    });

    // 구독 정보 마이그레이션
    // ...

    // 이제 정상적인 스키마 검증으로 Store 객체 생성
    return new Store({ schema });
  } catch (error) {
    // 오류 발생 시 대체 처리
    // ...
  }
}
```

### 설정 가져오기/내보내기

사용자는 설정을 파일로 내보내거나 파일에서 가져올 수 있습니다:

```javascript
// 설정 내보내기
function exportConfig(config, filePath) {
  const configData = {
    globalHotkey: config.get('globalHotkey'),
    pages: config.get('pages'),
    appearance: config.get('appearance'),
    advanced: config.get('advanced'),
  };

  fs.writeFileSync(filePath, JSON.stringify(configData, null, 2), 'utf8');
}

// 설정 가져오기
function importConfig(config, filePath) {
  const importedConfig = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  // 검증 및 적용
  // ...
}
```

### 클라우드 동기화

프리미엄 구독자는 설정을 클라우드에 동기화하여 여러 기기에서 일관된 환경을 유지할 수 있습니다:

1. **자동 동기화**: 설정 변경 시 자동으로 서버와 동기화
2. **수동 동기화**: 사용자가 명시적으로 업로드/다운로드 요청
3. **충돌 해결**: 로컬 및 원격 설정이 충돌할 경우 해결 메커니즘 제공

### 인증 및 구독 관리

Toast App은 사용자 계정 및 구독 관리를 위한 기능을 제공합니다:

1. **로그인/로그아웃**: OAuth 기반 인증
2. **구독 상태 확인**: 현재 구독 상태 및 제공 기능 표시
3. **구독 갱신**: 구독 관리 페이지로 연결

### 업데이트 관리

Toast App은 자동 업데이트 시스템을 통해 최신 버전을 유지할 수 있습니다:

1. **업데이트 확인**: 서버에서 최신 버전 정보 확인
2. **업데이트 다운로드**: 최신 버전 파일 다운로드
3. **업데이트 설치**: 앱 재시작을 통한 업데이트 적용
4. **대체 업데이트 방법**: Homebrew, GitHub 릴리스 등 제공

## 미래 개선 계획

현재 설정 시스템을 기반으로 다음과 같은 개선이 계획되어 있습니다:

### 1. 사용자 경험 개선

- **통합 검색 기능**: 설정 항목을 빠르게 찾을 수 있는 검색 기능 추가
- **설정 미리보기**: 설정 변경 효과를 실시간으로 미리 볼 수 있는 기능
- **반응형 디자인 강화**: 다양한 화면 크기에 최적화된 설정 UI 제공

### 2. 기능 확장

- **사용자 정의 테마**: 커스텀 색상 테마 지원
- **더 세분화된 알림 설정**: 알림 종류별 설정 기능
- **언어 및 지역화 설정**: 다국어 인터페이스 지원
- **접근성 개선**: 스크린 리더 호환성, 고대비 모드 등 추가

### 3. 기술적 개선

- **성능 최적화**: 설정 로드 및 저장 속도 개선
- **모듈화 강화**: 각 설정 섹션을 독립적인 모듈로 분리
- **플러그인 시스템**: 타사 개발자를 위한 설정 확장 기능
- **향상된 동기화 알고리즘**: 더 효율적인 클라우드 동기화 지원

## 설정 문제 해결

사용자가 설정 관련 문제를 해결하는 데 도움이 되는 일반적인 방법:

1. **설정 초기화**: Advanced 탭에서 'Reset to Defaults' 버튼을 사용하여 모든 설정을 기본값으로 초기화할 수 있습니다.
2. **설정 파일 위치**: 설정 파일은 다음 위치에 저장됩니다:
   - Windows: `%APPDATA%\toast\config.json`
   - macOS: `~/Library/Application Support/toast/config.json`
   - Linux: `~/.config/toast/config.json`
3. **로그 확인**: 문제 진단을 위해 로그 파일을 확인할 수 있습니다:
   - Windows: `%APPDATA%\toast\logs`
   - macOS: `~/Library/Logs/toast`
   - Linux: `~/.config/toast/logs`
4. **클라우드 동기화 문제**: 동기화 오류 발생 시 'Resolve Conflicts' 기능을 사용하거나, 동기화를 비활성화한 후 재활성화해볼 수 있습니다.

## 결론

Toast App의 설정 시스템은 사용자 경험을 중심으로 설계되어 있으며, 다양한 기능과 확장성을 제공합니다. 클라우드 동기화 및 업데이트 관리 기능을 통해 여러 기기에서 일관된 환경을 유지하고 최신 기능을 활용할 수 있습니다.

향후 개선을 통해 더욱 직관적이고 사용자 친화적인 설정 경험을 제공할 계획입니다.
