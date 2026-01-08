# Toast App Documentation

Toast App의 완전한 문서 모음입니다. 프로젝트의 아키텍처부터 상세한 사용법까지 모든 정보를 제공합니다.

## 문서 구조

```
docs/
├── guide/          사용자 가이드 (5개)
├── features/       기능 상세 문서 (6개)
├── api/            API 레퍼런스 (4개)
├── architecture/   아키텍처 문서 (3개)
├── config/         설정 및 구성 (4개)
├── development/    개발 가이드 (4개)
└── future/         미래 계획 (1개)
```

## 사용자 문서

시작하기 전에 읽어보세요:

| 문서 | 설명 | 우선순위 |
|------|------|----------|
| [사용자 가이드](./guide/user.md) | Toast 앱 사용법 완전 가이드 | 필수 |
| [버튼 단축키](./guide/shortcuts.md) | 자동 단축키 할당 시스템 | 필수 |
| [페이지 시스템](./guide/pages.md) | UI 구조 및 네비게이션 | 권장 |
| [사용 시나리오](./guide/scenarios.md) | 실제 사용 예제 모음 | 권장 |
| [버튼 액션](./guide/actions.md) | 5가지 액션 유형 설정 방법 | 권장 |

[전체 가이드 보기](./guide/README.md)

## 개발자 문서

개발에 필요한 핵심 문서:

| 문서 | 설명 | 우선순위 |
|------|------|----------|
| [아키텍처](./architecture/overview.md) | 시스템 구조 및 설계 원칙 | 필수 |
| [개발 가이드](./development/setup.md) | 개발 환경 설정 및 빌드 | 필수 |
| [구성 스키마](./config/schema.md) | 설정 옵션 및 데이터 구조 | 권장 |
| [데이터 저장소](./config/data-storage.md) | 파일 구조 및 데이터 관리 | 권장 |

[전체 개발 문서 보기](./development/README.md)

## 기능별 문서

각 기능의 상세 구현:

### 액션 시스템
| 문서 | 설명 |
|------|------|
| [버튼 액션](./guide/actions.md) | 5가지 액션 유형 (exec, open, script, chain, application) |
| [스크립트](./features/scripts.md) | JavaScript, AppleScript, PowerShell, Bash 스크립트 |

### 클라우드 & 인증
| 문서 | 설명 |
|------|------|
| [클라우드 동기화](./features/cloud-sync.md) | OAuth 인증 및 설정 동기화 |
| [보안](./architecture/security.md) | 보안 모델 및 데이터 보호 |
| [자동 업데이트](./features/auto-update.md) | electron-updater 기반 업데이트 |

### 플랫폼 & 통합
| 문서 | 설명 |
|------|------|
| [아이콘 추출](./features/icon-extraction.md) | macOS 앱 아이콘 자동 추출 |
| [플랫폼별 기능](./architecture/platform.md) | macOS/Windows 특화 기능 |
| [외부 통합](./development/integration.md) | 외부 서비스 연동 |

[전체 기능 문서 보기](./features/README.md)

## API 레퍼런스

개발자를 위한 API 문서:

| 문서 | 설명 |
|------|------|
| [API 개요](./api/overview.md) | 전체 API 구조 및 사용법 |
| [메인 프로세스](./api/main-process.md) | 메인 프로세스 모듈 API |
| [렌더러](./api/renderer.md) | 렌더러 프로세스 UI API |
| [액션](./api/actions.md) | 액션 시스템 API |

[전체 API 문서 보기](./api/README.md)

## 품질 & 관리

| 문서 | 설명 | 상태 |
|------|------|------|
| [테스팅](./development/testing.md) | 테스트 전략 및 실행 | 부분 구현 |
| [의존성 관리](./development/dependencies.md) | 패키지 및 호환성 관리 | 구현됨 |
| [환경 변수](./config/environment.md) | 환경 설정 관리 | 구현됨 |
| [윈도우 표시](./features/window.md) | 창 가시성 제어 | 구현됨 |

## 기타 문서

| 문서 | 설명 | 상태 |
|------|------|------|
| [설정 관리](./features/settings.md) | 사용자 설정 UI | 구현됨 |
| [미래 계획](./future/drag-drop.md) | 드래그 앤 드롭 기능 | 미구현 |

## 사용자별 추천 경로

### 최종 사용자
1. [사용자 가이드](./guide/user.md) - 기본 사용법
2. [버튼 단축키](./guide/shortcuts.md) - 키보드 사용법
3. [클라우드 동기화](./features/cloud-sync.md) - 계정 및 동기화

### 개발자
1. [아키텍처](./architecture/overview.md) - 시스템 이해
2. [개발 가이드](./development/setup.md) - 환경 설정
3. [API 개요](./api/overview.md) - API 구조
4. [액션 시스템](./guide/actions.md) - 핵심 기능

### 기여자
1. [개발 가이드](./development/setup.md) - 개발 환경
2. [테스팅](./development/testing.md) - 테스트 실행
3. [의존성 관리](./development/dependencies.md) - 패키지 정책

---

> 문서 개선: 오타나 개선사항을 발견하시면 [이슈 생성](https://github.com/opspresso/toast-app/issues) 또는 PR을 통해 기여해주세요!
