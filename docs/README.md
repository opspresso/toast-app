# Toast App 문서 가이드

Toast App의 완전한 문서 모음입니다. 프로젝트의 아키텍처부터 상세한 사용법까지 모든 정보를 제공합니다.

> 📊 **문서 현황**: 24개 문서 중 22개가 완전히 구현된 기능을 다룹니다. ([상세 현황 보기](./DOCUMENTATION_STATUS.md))

## 📖 사용자 문서

시작하기 전에 읽어보세요:

| 문서 | 설명 | 우선순위 |
|------|------|----------|
| [📖 사용자 가이드](./GUIDE_USER.md) | Toast 앱 사용법 완전 가이드 | 🔥 필수 |
| [⌨️ 버튼 단축키](./BUTTON_SHORTCUTS.md) | 자동 단축키 할당 시스템 | 🔥 필수 |
| [📱 페이지 시스템](./GUIDE_PAGES.md) | UI 구조 및 네비게이션 | ⭐ 권장 |
| [🎭 사용 시나리오](./GUIDE_SCENARIOS.md) | 실제 사용 예제 모음 | ⭐ 권장 |

## 🛠️ 개발자 문서

개발에 필요한 핵심 문서:

| 문서 | 설명 | 우선순위 |
|------|------|----------|
| [🏗️ 아키텍처](./ARCH_OVERVIEW.md) | 시스템 구조 및 설계 원칙 | 🔥 필수 |
| [🔧 개발 가이드](./DEV_SETUP.md) | 개발 환경 설정 및 빌드 | 🔥 필수 |
| [⚙️ 구성 스키마](./CONFIG_SCHEMA.md) | 설정 옵션 및 데이터 구조 | ⭐ 권장 |
| [📊 데이터 저장소](./CONFIG_DATA_STORAGE.md) | 파일 구조 및 데이터 관리 | ⭐ 권장 |

## 🎯 기능별 문서

각 기능의 상세 구현:

### 액션 시스템
| 문서 | 설명 |
|------|------|
| [⚡ 버튼 액션](./BUTTON_ACTIONS.md) | 5가지 액션 유형 (exec, open, script, chain, application) |
| [📜 스크립트](./FEATURE_SCRIPTS.md) | JavaScript, AppleScript, PowerShell, Bash 스크립트 |

### 클라우드 & 인증
| 문서 | 설명 |
|------|------|
| [☁️ 클라우드 동기화](./FEATURE_CLOUD_SYNC.md) | OAuth 인증 및 설정 동기화 |
| [🔒 보안](./ARCH_SECURITY.md) | 보안 모델 및 데이터 보호 |
| [🔄 자동 업데이트](./FEATURE_AUTO_UPDATE.md) | electron-updater 기반 업데이트 |

### 플랫폼 & 통합
| 문서 | 설명 |
|------|------|
| [🖼️ 아이콘 추출](./FEATURE_ICON_EXTRACTION.md) | macOS 앱 아이콘 자동 추출 |
| [🖥️ 플랫폼별 기능](./ARCH_PLATFORM.md) | macOS/Windows 특화 기능 |
| [🔗 외부 통합](./DEV_INTEGRATION.md) | 외부 서비스 연동 |

## 🔧 API 레퍼런스

개발자를 위한 API 문서:

| 문서 | 설명 |
|------|------|
| [📚 API 개요](./API_DOCUMENTATION.md) | 전체 API 구조 및 사용법 |
| [🧠 메인 프로세스](./API_MAIN_PROCESS.md) | 메인 프로세스 모듈 API |
| [🎨 렌더러](./API_RENDERER.md) | 렌더러 프로세스 UI API |
| [⚡ 액션](./API_ACTIONS.md) | 액션 시스템 API |

## 🧪 품질 & 관리

| 문서 | 설명 | 상태 |
|------|------|------|
| [🧪 테스팅](./DEV_TESTING.md) | 테스트 전략 및 실행 | ⚠️ 부분 구현 |
| [📦 의존성 관리](./DEV_DEPENDENCIES.md) | 패키지 및 호환성 관리 | ✅ 구현됨 |
| [🌍 환경 변수](./CONFIG_ENV.md) | 환경 설정 관리 | ✅ 구현됨 |
| [🔍 윈도우 표시](./FEATURE_WINDOW.md) | 창 가시성 제어 | ✅ 구현됨 |

## 📋 기타 문서

| 문서 | 설명 | 상태 |
|------|------|------|
| [📊 문서 현황](./DOCUMENTATION_STATUS.md) | 전체 문서 구현 상태 | ✅ 최신 |
| [⚙️ 설정 관리](./FEATURE_SETTINGS.md) | 사용자 설정 UI | ✅ 구현됨 |
| [🚀 미래 계획](./FUTURE_DRAG_DROP_FEATURE.md) | 드래그 앤 드롭 기능 | ❌ 미구현 |

## 🗂️ 사용자별 추천 경로

### 👤 최종 사용자
1. 📖 [사용자 가이드](./GUIDE_USER.md) - 기본 사용법
2. ⌨️ [버튼 단축키](./BUTTON_SHORTCUTS.md) - 키보드 사용법
3. ☁️ [클라우드 동기화](./FEATURE_CLOUD_SYNC.md) - 계정 및 동기화

### 👨‍💻 개발자
1. 🏗️ [아키텍처](./ARCH_OVERVIEW.md) - 시스템 이해
2. 🔧 [개발 가이드](./DEV_SETUP.md) - 환경 설정
3. 📚 [API 개요](./API_DOCUMENTATION.md) - API 구조
4. ⚡ [액션 시스템](./BUTTON_ACTIONS.md) - 핵심 기능

### 🤝 기여자
1. 🔧 [개발 가이드](./DEV_SETUP.md) - 개발 환경
2. 🧪 [테스팅](./DEV_TESTING.md) - 테스트 실행
3. 📊 [문서 현황](./DOCUMENTATION_STATUS.md) - 현재 상태
4. 📦 [의존성 관리](./DEV_DEPENDENCIES.md) - 패키지 정책

---

> 📝 **문서 개선**: 오타나 개선사항을 발견하시면 [이슈 생성](https://github.com/opspresso/toast-app/issues) 또는 PR을 통해 기여해주세요!
