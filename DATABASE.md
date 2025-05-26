# Toast App 데이터베이스 스키마

이 문서는 Toast App의 데이터 스키마와 엔티티 관계를 설명합니다.

> **참고**: 데이터 저장소 구현 세부사항은 [docs/DATA_STORAGE.md](docs/DATA_STORAGE.md)를 참조하세요.

## 엔티티 관계

Toast App의 주요 엔티티는 다음과 같은 관계를 가집니다:

1. **사용자** (1) → (n) **페이지**: 사용자는 여러 페이지를 가질 수 있습니다
2. **페이지** (1) → (n) **버튼**: 페이지는 여러 버튼을 포함할 수 있습니다
3. **사용자** (1) → (1) **설정**: 사용자는 하나의 설정 세트를 가집니다
4. **사용자** (1) → (1) **동기화 메타데이터**: 사용자는 하나의 동기화 메타데이터 레코드를 가집니다

## 주요 엔티티

### 페이지 (Page)
```javascript
{
  name: "Applications",     // 페이지 이름
  shortcut: "1",           // 페이지 단축키 (1-9)
  buttons: []              // 버튼 배열
}
```

### 버튼 (Button)
```javascript
{
  name: "Terminal",        // 버튼 이름
  shortcut: "T",          // 버튼 단축키
  icon: "⌨️",             // 아이콘 (이모지)
  action: "exec",         // 액션 유형
  command: "open -a Terminal"  // 액션별 매개변수
}
```

### 전역 설정 (Global Settings)
```javascript
{
  globalHotkey: "Alt+Space",
  appearance: {
    theme: "system",
    position: "center",
    size: "medium",
    opacity: 0.95,
    buttonLayout: "grid"
  },
  advanced: {
    launchAtLogin: false,
    hideAfterAction: true,
    hideOnBlur: true,
    hideOnEscape: true,
    showInTaskbar: false
  }
}
```

### 구독 정보 (Subscription)
```javascript
{
  isSubscribed: false,     // 구독 상태
  isAuthenticated: false,  // 인증 상태
  expiresAt: "",          // 만료일
  pageGroups: 1           // 페이지 제한 (1/3/9)
}
```

## 지원되는 액션 유형

- `exec`: 셸 명령 실행
- `open`: URL, 파일 또는 폴더 열기
- `script`: 사용자 정의 스크립트 실행
- `shortcut`: 키보드 단축키 실행
- `chain`: 일련의 액션을 순차적으로 실행
- `application`: 애플리케이션 실행

## 관련 문서

- [데이터 저장소](docs/DATA_STORAGE.md): 저장소 구현 및 파일 구조
- [구성 스키마](docs/CONFIG_SCHEMA.md): 상세한 구성 옵션
- [버튼 액션](docs/BUTTON_ACTIONS.md): 액션 유형별 상세 정보
