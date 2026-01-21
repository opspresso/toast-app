# Toast 앱

<p align="center">
  <img src="https://app.toast.sh/logo192.png" alt="Toast 앱 로고" width="192" height="192">
</p>

<p align="center">
  <strong>macOS 및 Windows용 사용자 정의 단축키 실행기</strong><br>
  Electron 기반의 생산성 도구로, 글로벌 단축키를 통해 빠르게 액션을 실행할 수 있습니다.
</p>

<p align="center">
  <img src="https://app.toast.sh/images/screenshot-light.png" alt="Toast 앱 스크린샷" width="500">
</p>

## ✨ 주요 기능

- **🔥 글로벌 단축키**: `Alt+Space`로 언제든지 Toast 팝업 호출
- **📱 다중 페이지**: 사용자 정의 버튼을 페이지별로 구성
- **⚡ 5가지 액션 유형**: 명령 실행, 파일/URL 열기, 스크립트 실행, 액션 연결, 애플리케이션 실행
- **🎨 테마 지원**: 라이트/다크/시스템 테마
- **☁️ 클라우드 동기화**: 설정과 버튼을 여러 기기 간 동기화
- **🖼️ 아이콘 추출**: macOS 앱 아이콘 자동 추출
- **🌍 크로스 플랫폼**: macOS, Windows 지원

## 📦 설치

### 직접 다운로드
[**GitHub Releases**](https://github.com/opspresso/toast-app/releases)에서 최신 버전을 다운로드하세요:
- **macOS**: `Toast-App-mac.dmg`
- **Windows**: `Toast-App-win.exe`

### Homebrew (macOS)
```bash
brew install --cask opspresso/tap/toast
```

## 🚀 빠른 시작

1. **실행**: 설치 후 시스템 트레이에서 백그라운드로 실행됩니다
2. **팝업 열기**: `Alt+Space` (기본 단축키)를 눌러 Toast 팝업을 호출
3. **버튼 클릭**: 원하는 액션 버튼을 클릭하거나 키보드 단축키 사용
4. **설정**: 트레이 아이콘 우클릭 → 설정에서 버튼과 액션을 구성

> 💡 **자세한 사용법**은 [사용자 가이드](docs/guide/user.md)를 참조하세요.

## 📚 문서

| 문서 | 설명 |
|------|------|
| [📖 사용자 가이드](docs/guide/user.md) | 상세한 기능 및 사용법 안내 |
| [🔧 개발 가이드](docs/development/setup.md) | 개발 환경 설정 및 빌드 과정 |
| [🏗️ 아키텍처](docs/architecture/overview.md) | 시스템 구조 및 설계 원칙 |
| [⌨️ 단축키 규칙](docs/guide/shortcuts.md) | 버튼 단축키 자동 할당 시스템 |
| [📋 전체 문서 목록](docs/README.md) | 모든 문서의 인덱스 |

## 🛠️ 개발자를 위한 빠른 시작

```bash
# 1. 저장소 복제
git clone https://github.com/opspresso/toast-app.git
cd toast-app

# 2. 의존성 설치
npm install

# 3. 개발 모드 실행
npm run dev
```

> 📝 **상세한 개발 정보**는 [개발 가이드](docs/development/setup.md)를 참조하세요.

## 🤝 기여하기

Toast 앱 개선에 참여해주세요! [기여 가이드라인](CONTRIBUTING.md)을 확인하시거나 [이슈](https://github.com/opspresso/toast-app/issues)를 통해 버그 신고 및 기능 제안을 해주세요.

## 📄 라이선스

MIT License - 자세한 내용은 [LICENSE](LICENSE) 파일을 참조하세요.

---

<p align="center">
  <strong>Toast 앱</strong>으로 생산성을 높여보세요! ⚡
</p>
