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

## 기능

- Toast 팝업을 호출하는 글로벌 단축키
- 더 나은 구성을 위한 여러 페이지의 사용자 정의 버튼:
  - 무료 사용자: 1 페이지
  - 인증된 사용자: 최대 3 페이지
  - 구독자: 최대 9 페이지
- 버튼 및 페이지 편집을 위한 설정 모드
- 사용자 정의 액션이 있는 맞춤형 버튼
- 특정 액션을 실행하는 키보드 단축키 지원
- 다양한 액션 유형:
  - 명령 실행
  - URL 및 파일 열기
  - 키보드 단축키 실행
  - 스크립트 실행 (JavaScript, AppleScript, PowerShell, Bash)
  - 액션을 순차적으로 연결
- 크로스 플랫폼 지원 (macOS 및 Windows)
- 테마 지원 (라이트, 다크 또는 시스템)
- 위치 및 크기 조정 가능
- 최소화된 방해 없는 UI
- 시스템 트레이 통합으로 백그라운드에서 실행
- 자동 업데이트
- 인증 및 구독 관리를 위한 Toast 웹 통합

## 설치

### 다운로드

[GitHub Releases](https://github.com/opspresso/toast-dist/releases) 페이지에서 Toast 앱의 최신 버전을 다운로드할 수 있습니다.

최신 릴리스 페이지에서 각 운영체제에 맞는 설치 파일을 다운로드할 수 있습니다:

- macOS: `Toast-App-mac.dmg`
- Windows: `Toast-App-win.exe`

### Homebrew (macOS)

macOS 사용자는 Homebrew를 통해 Toast 앱을 설치할 수 있습니다:

```bash
brew install opspresso/tap/toast
```

제거하려면 다음 명령어를 사용하세요:

```bash
brew uninstall opspresso/tap/toast
```

### 개발 사전 요구 사항

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

### 프로덕션 빌드

현재 플랫폼용 빌드:
```bash
npm run build
```

특정 플랫폼용 빌드:
```bash
npm run build:mac
npm run build:win
```

## 사용법

1. 설치 후 Toast 앱은 시스템 트레이/메뉴바에 아이콘과 함께 백그라운드에서 실행됩니다.
2. 글로벌 단축키(기본값: `Alt+Space`)를 눌러 Toast 팝업을 엽니다.
3. 숫자 키(1-9)를 사용하거나 페이지 탭을 클릭하여 페이지 간 이동합니다.
4. 버튼을 클릭하거나 해당 단축키를 사용하여 액션을 실행합니다.
5. 시스템 트레이 아이콘을 우클릭하여 설정, 새 버튼 추가 또는 애플리케이션 종료에 접근합니다.
6. 기어 아이콘(⚙️)을 클릭하거나 콤마 키(,)를 눌러 설정 모드를 전환하고 버튼과 페이지를 편집합니다.

## 구성

Toast 앱은 설정 UI를 통해 또는 다음 위치에 있는 구성 파일을 직접 편집하여 구성할 수 있습니다:

- macOS: `~/Library/Application Support/toast-app/config.json`
- Windows: `%APPDATA%\toast-app\config.json`

구성 예시:
```json
{
  "globalHotkey": "Alt+Space",
  "pages": [
    {
      "name": "Applications",
      "shortcut": "1",
      "buttons": [
        {
          "name": "Terminal",
          "shortcut": "T",
          "icon": "⌨️",
          "action": "exec",
          "command": "open -a Terminal"
        },
        {
          "name": "Browser",
          "shortcut": "B",
          "icon": "🌐",
          "action": "open",
          "url": "https://www.google.com"
        }
      ]
    },
    {
      "name": "Development",
      "shortcut": "2",
      "buttons": [
        {
          "name": "VS Code",
          "shortcut": "C",
          "icon": "💻",
          "action": "exec",
          "command": "open -a 'Visual Studio Code'"
        },
        {
          "name": "GitHub",
          "shortcut": "G",
          "icon": "🐙",
          "action": "open",
          "url": "https://github.com"
        }
      ]
    }
  ],
  "appearance": {
    "theme": "system",
    "position": "center",
    "size": "medium",
    "opacity": 0.95,
    "buttonLayout": "grid"
  },
  "advanced": {
    "launchAtLogin": true,
    "hideAfterAction": true,
    "hideOnBlur": true,
    "hideOnEscape": true,
    "showInTaskbar": false
  }
}
```

## 인증 및 구독 시스템

Toast 앱은 사용자 인증 및 구독 관리를 위해 [Toast 웹](https://app.toast.sh)과 통합됩니다. 시스템은 계정 상태에 따라 기능의 계층적 접근 방식을 제공합니다:

### 계정 등급 및 혜택

1. **무료 사용자 (계정 없음)**
   - 1 페이지의 단축키 액세스
   - 기본 단축키 기능
   - 로컬 구성만 가능

2. **인증된 사용자 (무료 계정)**
   - 3 페이지의 단축키 액세스
   - 모든 기본 기능
   - 기기 간 프로파일 동기화

3. **프리미엄 구독자**
   - 9 페이지의 단축키 액세스
   - 모든 설정의the 클라우드 동기화
   - 고급 액션 및 통합
   - 우선 지원

### 인증 과정

인증은 간단하고 안전하게 설계되었습니다:

1. 설정 창에서 "로그인" 버튼을 클릭합니다
2. 기본 브라우저가 Toast 웹 로그인 페이지로 열립니다
3. 로그인 후, 자동으로 Toast 앱으로 리디렉션됩니다
4. 인증 상태와 구독 혜택이 즉시 적용됩니다

### 일반적인 인증 질문

**Q: 로그인되었는지 어떻게 알 수 있나요?**
A: 계정 이메일과 구독 상태가 설정 창에 표시됩니다.

**Q: 인터넷 연결을 사용할 수 없으면 어떻게 되나요?**
A: Toast 앱은 마지막으로 동기화된 설정으로 오프라인에서도 계속 작동합니다.

**Q: 로그아웃은 어떻게 하나요?**
A: 설정 → 계정 → 로그아웃으로 이동합니다. 로컬 설정은 유지됩니다.

### 클라우드 동기화

프리미엄 구독자는 자동 클라우드 동기화의 혜택을 받습니다:

- **실시간 동기화**: 변경 사항이 수 초 내에 동기화됩니다
- **기기 간 일관성**: 모든 기기에서 동일한 설정을 사용합니다
- **충돌 해결**: 다른 기기에서 변경 사항을 만들면 가장 최근의 변경 사항이 적용됩니다
- **자동 백업**: 설정이 자동으로 클라우드에 백업됩니다

### 보안 및 개인 정보 보호

- 인증은 안전한 토큰 기반 액세스를 위해 OAuth 2.0을 사용합니다
- Toast 앱은 비밀번호를 보거나 저장하지 않습니다
- 모든 데이터 동기화는 암호화된 HTTPS 연결을 통해 이루어집니다
- Toast 웹 계정 설정을 통해 언제든지 액세스를 취소할 수 있습니다

계정을 만들거나 구독을 관리하려면 [https://app.toast.sh](https://app.toast.sh)를 방문하세요.

## 문서

종합적인 문서가 저장소에서 제공됩니다:

- [사용자 가이드](docs/USER_GUIDE.md) - 최종 사용자를 위한 완전한 가이드
- [아키텍처](ARCHITECTURE.md) - 시스템 아키텍처 및 설계 결정
- [API 문서](docs/API_DOCUMENTATION.md) - 내부 API 문서
- [구성 스키마](docs/CONFIG_SCHEMA.md) - 구성 옵션 및 스키마
- [페이지 및 네비게이션](PAGES.md) - 페이지 레이아웃 및 네비게이션 구조
- [프로젝트 구조](docs/PROJECT_STRUCTURE.md) - 프로젝트 구조 및 코드 구성
- [기술적 요구 사항](docs/TECHNICAL_REQUIREMENTS.md) - 기술 사양 및 요구 사항
- [개발 로드맵](docs/DEVELOPMENT_ROADMAP.md) - 향후 개발 계획
- [테스팅 전략](docs/TESTING_STRATEGY.md) - 테스팅 접근 방식 및 방법론

## 프로젝트 구조

```
toast-app/
├── assets/                # 애플리케이션 자산
│   └── icons/             # 애플리케이션 아이콘
├── docs/                  # 문서 자산
│   └── images/            # 문서 이미지
├── src/                   # 소스 코드
│   ├── main/              # 메인 프로세스 코드
│   │   ├── actions/       # 액션 구현
│   │   ├── auth.js        # 인증 처리
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
└── package.json           # 프로젝트 메타데이터 및 의존성
```

## 기여

Toast 앱에 기여를 환영합니다! 자세한 내용은 [기여 가이드라인](CONTRIBUTING.md)을 참조하세요.

### 개발 워크플로우

1. 저장소 포크
2. 기능 브랜치 생성 (`git checkout -b feature/amazing-feature`)
3. 변경 사항 적용
4. 테스트 실행 (`npm test`)
5. 변경 사항 커밋 (`git commit -m 'Add amazing feature'`)
6. 브랜치에 푸시 (`git push origin feature/amazing-feature`)
7. Pull Request 오픈

## 라이선스

MIT 라이선스 - 자세한 내용은 [LICENSE](LICENSE) 파일을 참조하세요.

## 감사의 말

- [Electron](https://www.electronjs.org/) - 크로스 플랫폼 데스크톱 앱 구축을 위한 프레임워크
- [electron-store](https://github.com/sindresorhus/electron-store) - Electron 앱을 위한 간단한 데이터 지속성
- [@nut-tree-fork/nut-js](https://github.com/nut-tree/nut.js) - 키보드 단축키를 위한 네이티브 UI 자동화
- [electron-updater](https://github.com/electron-userland/electron-builder/tree/master/packages/electron-updater) - 자동 업데이트 기능
- [모든 기여자](https://github.com/opspresso/toast-app/graphs/contributors)
