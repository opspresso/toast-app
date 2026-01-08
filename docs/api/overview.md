# Toast 앱 API 문서

이 문서는 Toast 앱의 내부 API에 대한 개요를 제공합니다.

## API 문서 구조

Toast 앱의 API 문서는 다음과 같이 구성되어 있습니다:

### 메인 프로세스 API
- **[메인 프로세스 API](./main-process.md)**: 메인 프로세스 모듈들의 상세 API 문서
  - 구성 모듈 (`config.js`)
  - 로거 모듈 (`logger.js`)
  - 업데이터 모듈 (`updater.js`)
  - 실행기 모듈 (`executor.js`)
  - 단축키 모듈 (`shortcuts.js`)
  - 트레이 모듈 (`tray.js`)
  - 윈도우 모듈 (`windows.js`)
  - IPC 모듈 (`ipc.js`)

### 액션 API
- **[액션 API](./actions.md)**: 액션 모듈들의 상세 API 문서
  - Application 액션 (`application.js`)
  - Exec 액션 (`exec.js`)
  - Open 액션 (`open.js`)
  - Script 액션 (`script.js`)
  - Chain 액션 (`chain.js`)

### 렌더러 프로세스 API
- **[렌더러 프로세스 API](./renderer.md)**: 렌더러 프로세스 API 문서
  - Toast 윈도우 API (`toast.js`)
  - 설정 윈도우 API (`settings.js`)

## 빠른 참조

### 주요 API 패턴

#### 결과 객체
모든 API 호출은 일관된 결과 객체를 반환합니다:

```javascript
// 성공 결과
{
  success: true,
  message: '작업이 성공적으로 완료되었습니다',
  // 작업별 추가 데이터
}

// 오류 결과
{
  success: false,
  message: '오류 메시지',
  error: errorObject, // 원래 오류 객체 또는 문자열
  // 추가 오류 세부 정보
}
```

#### 구성 스키마
기본 구성 스키마의 주요 섹션:

```javascript
{
  globalHotkey: 'Alt+Space',
  pages: [],
  appearance: {
    theme: 'system',
    position: 'center',
    size: 'medium',
    opacity: 0.95,
    buttonLayout: 'grid'
  },
  advanced: {
    launchAtLogin: false,
    hideAfterAction: true,
    hideOnBlur: true,
    hideOnEscape: true,
    showInTaskbar: false
  },
  subscription: {
    isSubscribed: false,
    isAuthenticated: false,
    expiresAt: '',
    pageGroups: 1
  }
}
```

#### 지원되는 액션 유형
- `application`: 애플리케이션 실행
- `exec`: 셸 명령 실행
- `open`: URL, 파일 또는 폴더 열기
- `script`: 사용자 정의 스크립트 실행
- `chain`: 일련의 액션을 순차적으로 실행

### IPC 채널 요약

주요 IPC 채널들:

| 채널 | 유형 | 설명 |
|------|------|------|
| `execute-action` | handle | 액션 실행 |
| `get-config` | handle | 구성 가져오기 |
| `set-config` | handle | 구성 설정 |
| `show-toast` | on | Toast 윈도우 표시 |
| `hide-toast` | on | Toast 윈도우 숨기기 |
| `show-settings` | on | 설정 윈도우 표시 |
| `check-for-updates` | handle | 업데이트 확인 |

전체 IPC 채널 목록은 [메인 프로세스 API 문서](./main-process.md#ipc-모듈)를 참조하세요.

## 개발 가이드라인

### API 사용 시 주의사항

1. **오류 처리**: 모든 API 호출에 대해 적절한 오류 처리를 구현하세요
2. **플랫폼 호환성**: 플랫폼별 차이점을 고려하세요
3. **보안**: 사용자 입력은 항상 검증하세요
4. **성능**: 비동기 작업을 적절히 활용하세요

### 확장 가이드

새로운 API를 추가할 때:

1. 적절한 모듈에 함수 추가
2. 일관된 결과 객체 형식 사용
3. 적절한 오류 처리 구현
4. 문서 업데이트
5. 테스트 코드 작성

## 관련 문서

- [구성 스키마](../config/schema.md): 상세한 구성 옵션
- [버튼 액션](../guide/actions.md): 지원되는 버튼 액션 유형
- [보안](../architecture/security.md): 보안 모델 및 고려사항
- [테스트](../development/testing.md): API 테스트 전략

## 버전 정보

API는 의미적 버전 관리를 따릅니다:
- **주 버전**: 호환성을 깨는 변경 사항
- **부 버전**: 호환성을 유지하는 새 기능
- **패치 버전**: 버그 수정 및 소소한 개선 사항

현재 API 버전에 대한 자세한 정보는 각 모듈의 문서를 참조하세요.
