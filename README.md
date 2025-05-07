# Toast 앱

<p align="center">
  <img src="assets/icons/icon.png" alt="Toast 앱 로고" width="128" height="128">
</p>

<p align="center">
  Electron으로 구축된 macOS 및 Windows용 사용자 정의 단축키 실행기입니다.
</p>

## 개요

Toast 앱은 사용자가 커스텀 단축키와 액션을 정의할 수 있는 생산성 도구입니다. 글로벌 단축키로 호출하면 Toast는 사용자 정의 버튼이 있는 팝업을 표시합니다. 각 버튼에는 실행할 특정 액션이나 명령을 할당할 수 있습니다.

<p align="center">
  <img src="docs/images/toast-app-screenshot.png" alt="Toast 앱 스크린샷" width="500">
</p>

## 주요 기능

- Toast 팝업을 호출하는 글로벌 단축키
- 다중 페이지 지원으로 사용자 정의 버튼 구성
- 다양한 액션 유형:
  - 명령 실행
  - URL 및 파일 열기
  - 키보드 단축키 실행
  - 스크립트 실행 (JavaScript, AppleScript, PowerShell, Bash)
  - 액션을 순차적으로 연결
- 크로스 플랫폼 지원 (macOS 및 Windows)
- 테마 지원 (라이트, 다크 또는 시스템)
- 시스템 트레이 통합으로 백그라운드에서 실행
- 인증 및 구독 관리를 위한 클라우드 동기화

## 설치

### 다운로드

[GitHub Releases](https://github.com/opspresso/toast/releases) 페이지에서 Toast 앱의 최신 버전을 다운로드할 수 있습니다.

최신 릴리스 페이지에서 각 운영체제에 맞는 설치 파일을 다운로드할 수 있습니다:

- macOS: `Toast-App-mac.dmg`
- Windows: `Toast-App-win.exe`

### Homebrew (macOS)

macOS 사용자는 Homebrew를 통해 Toast 앱을 설치할 수 있습니다:

```bash
brew install opspresso/tap/toast
```

## 기본 사용법

1. 설치 후 Toast 앱은 시스템 트레이/메뉴바에 아이콘과 함께 백그라운드에서 실행됩니다.
2. 글로벌 단축키(기본값: `Alt+Space`)를 눌러 Toast 팝업을 엽니다.
3. 숫자 키(1-9)를 사용하거나 페이지 탭을 클릭하여 페이지 간 이동합니다.
4. 버튼을 클릭하거나 해당 단축키를 사용하여 액션을 실행합니다.
5. 시스템 트레이 아이콘을 우클릭하여 설정, 새 버튼 추가 또는 애플리케이션 종료에 접근합니다.
6. 기어 아이콘(⚙️)을 클릭하거나 콤마 키(,)를 눌러 설정 모드를 전환하고 버튼과 페이지를 편집합니다.

## 문서

더 자세한 정보는 다음 문서를 참조하세요:

- [사용자 가이드](docs/USER_GUIDE.md) - 기능, UI, 사용 시나리오에 대한 상세 정보
- [아키텍처](docs/ARCHITECTURE.md) - 시스템 아키텍처 및 설계 결정
- [구성 스키마](docs/CONFIG_SCHEMA.md) - 구성 옵션 및 스키마
- [개발 가이드](docs/DEVELOPMENT.md) - 개발 환경 설정 및 프로젝트 구조
- [테스팅](docs/TESTING.md) - 테스팅 전략 및 프로세스
- [API 문서](docs/API_DOCUMENTATION.md) - 내부 API 및 확장 지점

## 개발

### 사전 요구 사항

- Node.js (v16 이상)
- npm 또는 yarn

### 개발 설정

1. 저장소 복제:
```bash
git clone https://github.com/opspresso/toast-app.git
cd toast-app
```

2. 의존성 설치:
```bash
npm install
```

3. 개발 서버 시작:
```bash
npm run dev
```

더 자세한, 정보는 [개발 가이드](docs/DEVELOPMENT.md)를 참조하세요.

## 기여

Toast 앱에 기여를 환영합니다! 자세한 내용은 [기여 가이드라인](CONTRIBUTING.md)을 참조하세요.

## 라이선스

MIT 라이선스 - 자세한 내용은 [LICENSE](LICENSE) 파일을 참조하세요.

## 감사의 말

- [Electron](https://www.electronjs.org/) - 크로스 플랫폼 데스크톱 앱 구축을 위한 프레임워크
- [electron-store](https://github.com/sindresorhus/electron-store) - Electron 앱을 위한 간단한 데이터 지속성
- [@nut-tree-fork/nut-js](https://github.com/nut-tree/nut.js) - 키보드 단축키를 위한 네이티브 UI 자동화
- [electron-updater](https://github.com/electron-userland/electron-builder/tree/master/packages/electron-updater) - 자동 업데이트 기능
- [모든 기여자](https://github.com/opspresso/toast-app/graphs/contributors)
