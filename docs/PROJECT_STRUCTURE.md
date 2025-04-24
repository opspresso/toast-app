# Toast 앱 프로젝트 구조

이 문서는 Toast 앱 프로젝트 구조에 대한 상세한 개요를 제공하며, 디렉토리와 파일의 목적 및 구성을 설명합니다.

## 디렉토리 구조

```
toast-app/
├── assets/                # 애플리케이션 자산
│   └── icons/             # 애플리케이션 아이콘
├── docs/                  # 문서 자산
│   └── images/            # 문서 이미지
├── src/                   # 소스 코드
│   ├── main/              # 메인 프로세스 코드
│   │   ├── actions/       # 액션 구현
│   │   ├── config.js      # 구성 관리
│   │   ├── executor.js    # 액션 실행
│   │   ├── ipc.js         # IPC 처리
│   │   ├── shortcuts.js   # 글로벌 단축키
│   │   ├── tray.js        # 시스템 트레이
│   │   └── windows.js     # 윈도우 관리
│   ├── renderer/          # 렌더러 프로세스 코드
│   │   ├── pages/         # 애플리케이션 페이지
│   │   │   ├── toast/     # Toast 팝업 UI
│   │   │   └── settings/  # 설정 UI
│   │   └── preload/       # 프리로드 스크립트
│   └── index.js           # 애플리케이션 진입점
├── tests/                 # 테스트 파일
│   ├── unit/              # 단위 테스트
│   ├── integration/       # 통합 테스트
│   └── e2e/               # 엔드 투 엔드 테스트
└── [구성 파일]             # 다양한 구성 파일
```

## 주요 파일 및 디렉토리

### 루트 디렉토리

- **package.json**: 프로젝트 메타데이터, 의존성 및 스크립트
- **package-lock.json**: 의존성 잠금 파일
- **.gitignore**: Git 무시 규칙
- **.eslintrc.js**: ESLint 구성
- **.prettierrc**: Prettier 구성
- **jest.config.js**: Jest 테스팅 구성
- **README.md**: 프로젝트 개요 및 문서

### 문서

- **ARCHITECTURE.md**: 시스템 아키텍처 및 설계 결정
- **API_DOCUMENTATION.md**: 내부 API 문서
- **CONFIG_SCHEMA.md**: 구성 옵션 및 스키마
- **CONTRIBUTING.md**: 기여 가이드라인
- **DEVELOPMENT_ROADMAP.md**: 향후 개발 계획
- **PAGES.md**: 페이지 레이아웃 및 네비게이션 구조
- **PROJECT_STRUCTURE.md**: 이 파일 - 프로젝트 구조 문서
- **SCENARIOS.md**: 사용자 시나리오 및 워크플로우
- **SECURITY.md**: 보안 정책 및 절차
- **TECHNICAL_REQUIREMENTS.md**: 기술 사양 및 요구 사항
- **TESTING_STRATEGY.md**: 테스팅 접근 방식 및 방법론
- **USER_GUIDE.md**: 최종 사용자 문서

### 소스 코드

#### 메인 프로세스 (`src/main/`)

메인 프로세스는 애플리케이션 수명 주기, 윈도우 관리 및 시스템 통합을 담당합니다.

- **index.js**: 애플리케이션 진입점
- **config.js**: electron-store를 사용한 구성 관리
- **windows.js**: 윈도우 생성 및 관리
- **tray.js**: 시스템 트레이 아이콘 및 메뉴
- **shortcuts.js**: 글로벌 단축키 등록 및 처리
- **ipc.js**: 프로세스 간 통신 설정
- **executor.js**: 액션 실행 조정

#### 액션 핸들러 (`src/main/actions/`)

액션 핸들러는 특정 액션 유형을 구현합니다.

- **exec.js**: 셸 명령 실행
- **open.js**: URL, 파일 및 폴더 열기
- **shortcut.js**: 키보드 단축키 시뮬레이션
- **script.js**: 사용자 정의 스크립트 실행

#### 렌더러 프로세스 (`src/renderer/`)

렌더러 프로세스는 사용자 인터페이스를 처리합니다.

##### 프리로드 스크립트 (`src/renderer/preload/`)

프리로드 스크립트는 렌더러와 메인 프로세스 간의 안전한 브리지를 제공합니다.

- **toast.js**: Toast 윈도우용 프리로드 스크립트
- **settings.js**: 설정 윈도우용 프리로드 스크립트

##### 페이지 (`src/renderer/pages/`)

페이지에는 각 윈도우의 HTML, CSS 및 JavaScript가 포함되어 있습니다.

###### Toast 윈도우 (`src/renderer/pages/toast/`)

- **index.html**: Toast 윈도우의 HTML 구조
- **styles.css**: Toast 윈도우의 CSS 스타일
- **index.js**: Toast 윈도우의 JavaScript

###### 설정 윈도우 (`src/renderer/pages/settings/`)

- **index.html**: 설정 윈도우의 HTML 구조
- **styles.css**: 설정 윈도우의 CSS 스타일
- **index.js**: 설정 윈도우의 JavaScript

### 자산 (`assets/`)

- **icons/**: 다양한 형식의 애플리케이션 아이콘
  - **icon.svg**: 벡터 아이콘
  - **icon.icns**: macOS 아이콘
  - **icon.ico**: Windows 아이콘
  - **tray-icon.png**: 시스템 트레이 아이콘
  - **tray-icon-Template.png**: 다크 모드용 macOS 템플릿 아이콘

### 테스트 (`tests/`)

- **unit/**: 개별 함수 및 컴포넌트에 대한 단위 테스트
- **integration/**: 컴포넌트 상호 작용에 대한 통합 테스트
- **e2e/**: 사용자 워크플로우에 대한 엔드 투 엔드 테스트
- **mocks/**: 테스트용 모의 객체 및 함수
- **setup.js**: 테스트 설정 구성

## 파일 상세 정보

### 메인 프로세스 파일

#### `src/index.js`

Electron 애플리케이션의 진입점입니다. 앱을 초기화하고, 윈도우를 생성하며, 이벤트 리스너를 설정합니다.

주요 책임:
- 애플리케이션 초기화
- 윈도우 생성
- 글로벌 단축키 등록
- IPC 핸들러 설정
- 애플리케이션 수명 주기 이벤트 처리

#### `src/main/config.js`

electron-store를 사용하여 애플리케이션 구성을 관리합니다.

주요 책임:
- 구성 스키마 정의
- 기본값 제공
- 구성 유효성 검사
- 구성 마이그레이션 처리
- 구성 가져오기/내보내기

#### `src/main/windows.js`

윈도우 생성, 위치 지정 및 수명 주기를 관리합니다.

주요 책임:
- Toast 및 설정 윈도우 생성
- 구성에 따른 윈도우 위치 지정
- 윈도우 표시 및 숨기기
- 윈도우 이벤트 처리

#### `src/main/tray.js`

시스템 트레이 아이콘 및 메뉴를 관리합니다.

주요 책임:
- 트레이 아이콘 생성 및 업데이트
- 트레이 컨텍스트 메뉴 구성
- 트레이 이벤트 처리

#### `src/main/shortcuts.js`

글로벌 키보드 단축키를 관리합니다.

주요 책임:
- 글로벌 단축키 등록 및 해제
- 단축키 이벤트 처리
- Toast 윈도우 위치 지정

#### `src/main/ipc.js`

IPC 채널 및 핸들러를 설정합니다.

주요 책임:
- IPC 채널 정의
- IPC 메시지 처리
- 액션을 실행기에 전달
- 구성 업데이트를 렌더러에 전송

#### `src/main/executor.js`

액션 실행을 조정합니다.

주요 책임:
- 액션 유효성 검사
- 액션 유형 결정
- 액션을 특정 핸들러에 전달
- 액션 결과 처리

### 액션 핸들러 파일

#### `src/main/actions/exec.js`

셸 명령 실행을 처리합니다.

주요 책임:
- 셸 명령 실행
- 명령 출력 처리
- 작업 디렉토리 지원
- 터미널 실행 지원

#### `src/main/actions/open.js`

URL, 파일 및 폴더 열기를 처리합니다.

주요 책임:
- 기본 브라우저에서 URL 열기
- 관련 애플리케이션으로 파일 열기
- 파일 탐색기에서 폴더 열기

#### `src/main/actions/shortcut.js`

키보드 단축키 시뮬레이션을 처리합니다.

주요 책임:
- 단축키 문자열 파싱
- 키 누르기 시뮬레이션
- 플랫폼별 단축키 처리

#### `src/main/actions/script.js`

사용자 정의 스크립트 실행을 처리합니다.

주요 책임:
- JavaScript 스크립트 실행
- AppleScript 실행(macOS)
- PowerShell 스크립트 실행(Windows)
- Bash 스크립트 실행(macOS/Linux)

### 렌더러 프로세스 파일

#### `src/renderer/preload/toast.js`

Toast 윈도우용 프리로드 스크립트입니다.

주요 책임:
- 렌더러에 IPC 메서드 노출
- 구성 업데이트 처리
- 액션 실행
- 윈도우 가시성 제어

#### `src/renderer/preload/settings.js`

설정 윈도우용 프리로드 스크립트입니다.

주요 책임:
- 렌더러에 IPC 메서드 노출
- 구성 가져오기 및 설정
- 액션 테스트
- 대화 상자 표시
- 애플리케이션 제어

#### `src/renderer/pages/toast/index.html`

Toast 윈도우의 HTML 구조입니다.

주요 요소:
- Toast 컨테이너
- 검색 입력
- 버튼 컨테이너
- 상태 컨테이너
- 버튼 템플릿

#### `src/renderer/pages/toast/styles.css`

Toast 윈도우의 CSS 스타일입니다.

주요 기능:
- 라이트 및 다크 테마 지원
- 반응형 레이아웃
- 버튼 스타일링
- 애니메이션 효과

#### `src/renderer/pages/toast/index.js`

Toast 윈도우의 JavaScript입니다.

주요 책임:
- UI 초기화
- 버튼 클릭 처리
- 키보드 탐색 처리
- 액션 실행
- 검색에 따른 버튼 필터링

#### `src/renderer/pages/settings/index.html`

설정 윈도우의 HTML 구조입니다.

주요 요소:
- 설정 탭
- 폼 컨트롤
- 버튼 편집기 대화 상자
- 액션 매개변수 템플릿

#### `src/renderer/pages/settings/styles.css`

설정 윈도우의 CSS 스타일입니다.

주요 기능:
- 라이트 및 다크 테마 지원
- 폼 스타일링
- 대화 상자 스타일링
- 탭 네비게이션

#### `src/renderer/pages/settings/index.js`

설정 윈도우의 JavaScript입니다.

주요 책임:
- UI 초기화
- 폼 제출 처리
- 입력 유효성 검사
- 구성 저장
- 버튼 관리

## 빌드 및 구성 파일

### `package.json`

프로젝트 메타데이터, 의존성 및 스크립트를 정의합니다.

주요 섹션:
- 프로젝트 메타데이터
- 의존성
- 개발 의존성
- 스크립트
- 빌드 구성

### `.eslintrc.js`

코드 린팅을 위한 ESLint 구성입니다.

주요 기능:
- JavaScript 규칙
- Electron 특정 규칙
- 코드 스타일 규칙

### `.prettierrc`

코드 포맷팅을 위한 Prettier 구성입니다.

주요 설정:
- 탭 너비
- 세미콜론 사용
- 따옴표 스타일
- 후행 쉼표

### `jest.config.js`

테스팅을 위한 Jest 구성입니다.

주요 설정:
- 테스트 환경
- 커버리지 설정
- 모듈 별칭
- 테스트 매처

## 결론

이 프로젝트 구조는 명확한 관심사 분리를 통한 모듈식 설계를 따릅니다. 메인 프로세스는 시스템 수준 작업을 처리하고, 렌더러 프로세스는 사용자 인터페이스를 처리합니다. 액션 시스템은 확장 가능하도록 설계되어 향후 새로운 액션 유형을 쉽게 추가할 수 있습니다.

문서는 포괄적이며 아키텍처, API, 구성 및 사용자 가이드를 다룹니다. 테스팅 전략은 코드 품질과 신뢰성을 보장하기 위해 단위, 통합 및 엔드 투 엔드 테스트를 포함합니다.
