# Toast App 데이터 모델

이 문서는 Toast App의 데이터 모델과 엔티티 관계를 설명합니다.

> **참고**:
> - 데이터 저장소 구현 세부사항은 [docs/DATA_STORAGE.md](docs/DATA_STORAGE.md)를 참조하세요.
> - 상세한 구성 스키마는 [docs/CONFIG_SCHEMA.md](docs/CONFIG_SCHEMA.md)를 참조하세요.

## 엔티티 관계

Toast App의 주요 엔티티는 다음과 같은 관계를 가집니다:

1. **사용자** (1) → (n) **페이지**: 사용자는 여러 페이지를 가질 수 있습니다
2. **페이지** (1) → (n) **버튼**: 페이지는 여러 버튼을 포함할 수 있습니다
3. **사용자** (1) → (1) **설정**: 사용자는 하나의 설정 세트를 가집니다
4. **사용자** (1) → (1) **동기화 메타데이터**: 사용자는 하나의 동기화 메타데이터 레코드를 가집니다

## 데이터 계층 구조

```
사용자 구성
├── 전역 설정
│   ├── globalHotkey
│   ├── appearance
│   ├── advanced
│   └── subscription
├── 페이지 (1-9개)
│   ├── name
│   ├── shortcut
│   └── buttons (최대 15개)
│       ├── name
│       ├── shortcut
│       ├── icon
│       ├── action
│       └── 액션별 매개변수
└── 동기화 메타데이터
    ├── clientLastModifiedAt
    ├── clientLastModifiedDevice
    └── serverLastUpdatedAt
```

## 페이지 제한 정책

사용자 계정 상태에 따른 페이지 생성 제한:

| 계정 유형 | 최대 페이지 수 | 설명 |
|-----------|----------------|------|
| 무료 사용자 | 1 | 기본 기능 제공 |
| 인증된 사용자 | 3 | 로그인 후 확장 기능 |
| 프리미엄 구독자 | 9 | 모든 기능 이용 가능 |

## 지원되는 액션 유형

Toast App에서 지원하는 버튼 액션 유형:

- `application`: 애플리케이션 실행
- `exec`: 셸 명령 실행
- `open`: URL, 파일 또는 폴더 열기
- `script`: 사용자 정의 스크립트 실행
- `chain`: 일련의 액션을 순차적으로 실행

> **상세 정보**: 각 액션 유형의 자세한 설명은 [docs/BUTTON_ACTIONS.md](docs/BUTTON_ACTIONS.md)를 참조하세요.

## 관련 문서

- [데이터 저장소](docs/DATA_STORAGE.md): 저장소 구현 및 파일 구조
- [구성 스키마](docs/CONFIG_SCHEMA.md): 상세한 구성 옵션 및 스키마
- [버튼 액션](docs/BUTTON_ACTIONS.md): 액션 유형별 상세 정보
