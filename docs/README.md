# Toast App Documentation

이 문서는 Toast App 프로젝트의 문서 구조와 목적을 설명합니다.

## 문서 표준

모든 문서는 최신 상태로 유지되고 버전 관리되어야 합니다. 각 문서는 명확한 목적을 가져야 합니다.
새로운 문서를 추가할 때는 docs/ 디렉토리 하위에 배치하세요.

## 프로젝트 루트 문서

| 문서 | 설명 |
|------|------|
| [`README.md`](../README.md) | 프로젝트 개요, 설치 및 기본 사용법 |
| [`ARCHITECTURE.md`](../ARCHITECTURE.md) | 시스템 아키텍처 및 구성 요소 개요 |
| [`DATABASE.md`](../DATABASE.md) | 데이터 모델 및 엔티티 관계 |
| [`PAGES.md`](../PAGES.md) | UI 레이아웃 및 네비게이션 구조 |
| [`SCENARIOS.md`](../SCENARIOS.md) | 사용자 시나리오 및 워크플로우 |

## docs/ 디렉토리 문서 인덱스

docs/ 디렉토리에는 더 자세한 문서들이 포함되어 있습니다:

| 문서 | 설명 | 대상 사용자 |
|------|------|-------------|
| [`API_DOCUMENTATION.md`](./API_DOCUMENTATION.md) | API 문서 개요 및 빠른 참조 | 개발자 |
| [`API_MAIN_PROCESS.md`](./API_MAIN_PROCESS.md) | 메인 프로세스 모듈 API | 개발자 |
| [`API_ACTIONS.md`](./API_ACTIONS.md) | 액션 모듈 API | 개발자 |
| [`API_RENDERER.md`](./API_RENDERER.md) | 렌더러 프로세스 API | 개발자 |
| [`AUTO_UPDATE.md`](./AUTO_UPDATE.md) | 자동 업데이트 시스템 및 사용자 경험 | 개발자 & 최종 사용자 |
| [`BUTTON_ACTIONS.md`](./BUTTON_ACTIONS.md) | 지원되는 버튼 액션 유형 | 개발자 & 파워 사용자 |
| [`CLOUD_SYNC.md`](./CLOUD_SYNC.md) | 클라우드 동기화 구현 및 사용자 가이드 | 개발자 & 최종 사용자 |
| [`CONFIG_SCHEMA.md`](./CONFIG_SCHEMA.md) | 구성 옵션 및 스키마 참조 | 개발자 & 파워 사용자 |
| [`DATA_STORAGE.md`](./DATA_STORAGE.md) | 데이터 저장 모델, 파일 구조 및 관리 | 개발자 |
| [`DEPENDENCY_MANAGEMENT.md`](./DEPENDENCY_MANAGEMENT.md) | 외부 종속성 관리 정책 및 호환성 | 개발자 & 기여자 |
| [`DEVELOPMENT.md`](./DEVELOPMENT.md) | 개발 환경 설정 및 워크플로우 | 개발자 |
| [`ENVIRONMENT_VARIABLES.md`](./ENVIRONMENT_VARIABLES.md) | 환경 변수 설정 및 관리 | 개발자 & 시스템 관리자 |
| [`INTEGRATION.md`](./INTEGRATION.md) | 외부 서비스 및 시스템과의 통합 | 개발자 |
| [`PLATFORM_SPECIFIC.md`](./PLATFORM_SPECIFIC.md) | 플랫폼별 기능 및 개발 고려사항 | 개발자 |
| [`SCRIPTS.md`](./SCRIPTS.md) | 사용자 정의 스크립트 작성 및 보안 모델 | 개발자 & 파워 사용자 |
| [`SECURITY.md`](./SECURITY.md) | 보안 모델, 데이터 보호 및 인증 시스템 | 개발자 & 보안 검토자 |
| [`SETTINGS.md`](./SETTINGS.md) | 설정 관리 및 구성 | 개발자 & 최종 사용자 |
| [`TESTING.md`](./TESTING.md) | 테스트 전략 및 프로세스 | 개발자 & QA |
| [`USER_GUIDE.md`](./USER_GUIDE.md) | 상세한 사용자 가이드 | 최종 사용자 |
| [`WINDOW_VISIBILITY.md`](./WINDOW_VISIBILITY.md) | 윈도우 가시성 관리 | 개발자 |
| [`DRAG_DROP_FEATURE.md`](./DRAG_DROP_FEATURE.md) | 드래그 앤 드롭 기능 구현 가이드 | 개발자 & 기획자 |
| [`ICON_EXTRACTION.md`](./ICON_EXTRACTION.md) | 로컬 앱 아이콘 추출 유틸리티 | 개발자 |

## 문서 관리 가이드라인

1. **일관된 형식**: 모든 문서는 Markdown 형식을 사용합니다.
2. **명확한 목차**: 각 문서는 목차와 명확한 섹션 제목을 포함해야 합니다.
3. **언어 표준**: 모든 코드와 UI 메시지는 영어로 작성해야 합니다. 로그와 주석은 영어 또는 한국어로 작성할 수 있습니다.
4. **코드 예제**: 코드 블록에는 적절한 언어 태그를 사용합니다.
5. **다이어그램**: 설명을 명확히 하기 위해 필요한 곳에 다이어그램을 포함합니다.
6. **최신 상태 유지**: 코드가 변경되면 관련 문서도 함께 업데이트해야 합니다.
7. **새 문서**: 새 문서를 추가할 때는 이 문서 목록에도 추가합니다.
8. **코드-문서 일치**: 문서의 예제 코드는 실제 코드베이스와 일치해야 합니다.
9. **오류 수정**: 문서에서 발견된 오류나 불일치는 즉시 수정해야 합니다.
10. **접근성**: 모든 문서는 스크린 리더와 같은 보조 기술로 접근 가능해야 합니다.

## 빠른 시작

Toast App을 처음 사용하는 경우:

1. 프로젝트 루트의 [`README.md`](../README.md)를 먼저 읽어보세요
2. 개발자라면 [`DEVELOPMENT.md`](./DEVELOPMENT.md)를 확인하세요
3. 최종 사용자라면 [`USER_GUIDE.md`](./USER_GUIDE.md)를 참조하세요
4. 시스템 아키텍처를 이해하려면 [`ARCHITECTURE.md`](../ARCHITECTURE.md)를 읽어보세요

## 기여하기

문서 개선에 기여하고 싶다면:

1. 오타나 오류를 발견하면 즉시 수정해주세요
2. 새로운 기능을 추가할 때는 관련 문서도 함께 업데이트해주세요
3. 문서가 불명확하거나 누락된 부분이 있다면 이슈를 생성하거나 개선 제안을 해주세요
