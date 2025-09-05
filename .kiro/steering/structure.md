# Toast 앱 프로젝트 구조

## 루트 디렉토리 구성

```
toast-app/
├── src/                    # 소스 코드
├── assets/                 # 정적 자산 (아이콘, 메타데이터)
├── docs/                   # 문서
├── tests/                  # 테스트 파일
├── coverage/               # 테스트 커버리지 리포트
├── dist/                   # 빌드 출력 (생성됨)
└── node_modules/           # 의존성 (생성됨)
```

## 소스 코드 구조 (`src/`)

### 메인 프로세스 (`src/main/`)
Node.js 환경에서 실행되는 핵심 애플리케이션 로직:

```
src/main/
├── actions/                # 액션 타입 구현
│   ├── application.js      # 앱 관련 액션
│   ├── chain.js           # 액션 체이닝
│   ├── exec.js            # 명령 실행
│   ├── open.js            # 파일/URL 열기
│   └── script.js          # 스크립트 실행
├── api/                   # 외부 API 통신
│   ├── auth.js            # 인증 API
│   ├── client.js          # HTTP 클라이언트
│   ├── index.js           # API 내보내기
│   └── sync.js            # 클라우드 동기화 API
├── config/                # 환경 설정
│   ├── .env.example       # 환경 템플릿
│   └── env.js             # 환경 로더
├── utils/                 # 유틸리티 함수
│   └── app-icon-extractor.js
├── auth-manager.js        # 인증 코디네이터
├── auth.js                # 핵심 인증 로직
├── cloud-sync.js          # 클라우드 동기화
├── config.js              # 설정 관리
├── constants.js           # 애플리케이션 상수
├── executor.js            # 액션 실행 코디네이터
├── ipc.js                 # 프로세스 간 통신
├── logger.js              # 로깅 시스템
├── shortcuts.js           # 전역 단축키 관리
├── tray.js                # 시스템 트레이 통합
├── updater.js             # 자동 업데이트 기능
├── user-data-manager.js   # 사용자 데이터 관리
└── windows.js             # 윈도우 관리
```

### 렌더러 프로세스 (`src/renderer/`)
Chromium 환경에서 실행되는 UI 컴포넌트:

```
src/renderer/
├── assets/                # UI 자산
│   ├── flat-color-icons/  # 아이콘 라이브러리
│   ├── js/                # 클라이언트 사이드 JavaScript
│   ├── confetti.css       # 애니메이션 스타일
│   └── confetti.js        # 애니메이션 로직
├── pages/                 # 애플리케이션 페이지
│   ├── settings/          # 설정 UI
│   └── toast/             # 메인 팝업 UI
└── preload/               # 프리로드 스크립트
    ├── settings.js        # 설정 윈도우 브리지
    └── toast.js           # Toast 윈도우 브리지
```

## 테스트 구조 (`tests/`)

```
tests/
├── unit/                  # 단위 테스트
│   ├── actions/           # 액션 테스트
│   ├── api/               # API 테스트
│   ├── config/            # 설정 테스트
│   ├── preload/           # 프리로드 스크립트 테스트
│   └── utils/             # 유틸리티 테스트
├── integration/           # 통합 테스트
├── e2e/                   # 엔드투엔드 테스트
├── mocks/                 # 테스트 목
│   └── electron.js        # Electron 목
└── setup.js               # 테스트 설정
```

## 주요 아키텍처 패턴

### 모듈 구성
- **단일 책임**: 각 모듈은 하나의 특정 관심사를 처리
- **명확한 의존성**: 모듈은 필요한 것만 가져오기
- **일관된 명명**: 파일은 주요 내보내기/함수에 따라 명명

### IPC 통신
- **프리로드 스크립트**: 메인과 렌더러 프로세스 간 보안 브리지
- **채널 명명**: 설명적인 IPC 채널 이름 (예: `execute-action`, `config-updated`)
- **오류 처리**: 프로세스 경계를 넘나드는 적절한 오류 직렬화

### 설정 관리
- **중앙화된 저장소**: electron-store를 통한 단일 진실 소스
- **스키마 검증**: 타입 체크 및 기본값
- **마이그레이션 지원**: 설정 변경에 대한 하위 호환성

### 액션 시스템
- **플러그인 아키텍처**: 각 액션 타입은 별도 모듈
- **일관된 인터페이스**: 모든 액션은 동일한 실행 패턴을 따름
- **오류 격리**: 액션 실패가 애플리케이션을 충돌시키지 않음

## 파일 명명 규칙

- **케밥 케이스**: 다중 단어 파일용 (`user-data-manager.js`)
- **설명적 이름**: 모듈 목적의 명확한 표시
- **테스트 접미사**: 테스트 파일은 `.test.js`로 끝남
- **프리로드 접두사**: 프리로드 스크립트는 대상 윈도우 이름과 일치

## Import/Export 패턴

- **CommonJS**: 메인 프로세스는 `require()`/`module.exports` 사용
- **상대 Import**: 로컬 모듈에 상대 경로 사용
- **구조 분해**: 필요한 함수만 가져오기: `const { createLogger } = require('./logger')`
- **기본 내보내기**: 단일 목적 모듈용
