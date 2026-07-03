# Toast 앱 플랫폼별 기능 및 고려사항

이 문서는 Toast 앱의 플랫폼별 기능, 고려사항 및 구현 세부사항을 설명합니다.

## 목차

- [개요](#개요)
- [지원 플랫폼](#지원-플랫폼)
- [macOS 전용 기능](#macos-전용-기능)
  - [트레이 통합](#트레이-통합)
  - [전역 키보드 단축키](#전역-키보드-단축키)
  - [윈도우 관리](#윈도우-관리)
  - [네이티브 스크립팅](#네이티브-스크립팅)
  - [코드 서명 및 공증](#코드-서명-및-공증)
  - [설치 및 업데이트](#설치-및-업데이트)
- [Windows 전용 기능](#windows-전용-기능)
  - [시스템 트레이 통합](#시스템-트레이-통합)
  - [전역 키보드 단축키](#전역-키보드-단축키-1)
  - [윈도우 관리](#윈도우-관리-1)
  - [네이티브 스크립팅](#네이티브-스크립팅-1)
  - [코드 서명](#코드-서명)
  - [설치 및 업데이트](#설치-및-업데이트-1)
- [플랫폼별 분기를 가진 공통 코드](#플랫폼별-분기를-가진-공통-코드)
- [플랫폼 감지](#플랫폼-감지)
- [크로스 플랫폼 개발 가이드라인](#크로스-플랫폼-개발-가이드라인)
- [다중 플랫폼 테스팅](#다중-플랫폼-테스팅)
- [알려진 플랫폼별 문제](#알려진-플랫폼별-문제)

## 개요

Toast 앱은 macOS와 Windows에서 일관된 사용자 경험을 제공하면서 각 플랫폼의 네이티브 기능을 활용하도록 설계되었습니다. 이 문서는 개발자를 위한 플랫폼별 구현 및 고려사항에 중점을 둡니다.

## 지원 플랫폼

Toast 앱이 공식적으로 지원하는 플랫폼:

- **macOS**: 10.14 (Mojave) 이상
- **Windows**: Windows 10 이상
- **Linux**: AppImage 및 deb 패키지 빌드 제공 (실험적)

## macOS 전용 기능

### 트레이 통합

macOS에서 Toast 앱은 메뉴 바에 통합됩니다:

- Electron의 `Tray` API를 통해 `NSStatusItem` 사용
- 메뉴 바 아이콘은 템플릿 이미지 형식(`tray-icon-Template.png`) 사용
- 다크/라이트 모드 자동 전환 지원
- 우클릭(또는 ctrl+클릭)으로 컨텍스트 메뉴 열기
- 좌클릭으로 Toast 윈도우 토글

**구현**:
```javascript
// src/main/tray.js
if (process.platform === 'darwin') {
  tray = new Tray(path.join(__dirname, '../../assets/icons/tray-icon-Template.png'));
  tray.setIgnoreDoubleClickEvents(true);
  // macOS 전용 설정
}
```

### 전역 키보드 단축키

macOS 키보드 단축키 처리:

- Electron의 `globalShortcut` 모듈을 통해 전역 단축키를 등록 (`registerGlobalShortcuts`)
- 사용자 정의 단축키는 `convertHotkeyToElectronFormat` 로 Electron accelerator 형식으로 변환 (변환 로직은 플랫폼 공통)
- `Ctrl`/`Control` 은 `CommandOrControl`, `Command`/`Meta`/`Super` 는 `Super` 로 매핑되며 `Alt`, `Shift` 는 그대로 유지 (macOS 에서 `CommandOrControl` 과 `Super` 는 모두 Command 키에 대응)
- 잘못된 형식의 단축키는 등록 전 유효성 검사로 걸러냄

**구현**:
```javascript
// src/main/shortcuts.js
// 단축키 변환은 플랫폼 독립적으로 동작
function convertHotkeyToElectronFormat(hotkey) {
  // Ctrl/Control -> CommandOrControl (macOS에서는 Command 키)
  // Command/Meta/Super -> Super
  // Alt, Shift는 변환 없이 그대로 유지
  // ...
}
```

### 윈도우 관리

macOS 윈도우 동작:

- 프레임 없는(`frame: false`) 투명(`transparent: true`) 윈도우로 표시 (모든 플랫폼 공통)
- macOS 에서는 창 `type` 을 `'normal'` 로 설정하여 패널 관련 경고를 방지
- Spaces 및 전체화면 애플리케이션과 함께 표시 (`visibleOnAllWorkspaces: true`, `simpleFullscreen` 은 macOS 전용 속성)
- 포커스 및 활성화 적절한 관리

**구현**:
```javascript
// src/main/windows.js
windows.toast = new BrowserWindow({
  width,
  height,
  frame: false,
  transparent: true,
  resizable: false,
  alwaysOnTop: true,
  alwaysOnTopLevel: 'screen-saver',
  // macOS에서는 'normal', 그 외 플랫폼에서는 'panel' 타입 사용
  type: process.platform === 'darwin' ? 'normal' : 'panel',
  visibleOnAllWorkspaces: true,
  simpleFullscreen: false, // macOS 전용 속성
  // ...
});
```

### 네이티브 스크립팅

macOS 전용 스크립팅 기능:

- `osascript`를 통한 AppleScript 통합
- macOS 셸 명령어 및 유틸리티
- macOS 서비스 및 워크플로우와의 통합

**구현**:
```javascript
// src/main/actions/script.js
async function executeAppleScript(script) {
  // 스크립트를 임시 파일에 기록한 뒤 파일 경로로 실행
  const tempFile = path.join(os.tmpdir(), `toast-applescript-${Date.now()}.scpt`);
  fs.writeFileSync(tempFile, script);

  return new Promise((resolve, reject) => {
    exec(`osascript "${tempFile}"`, (error, stdout, stderr) => {
      fs.unlinkSync(tempFile); // 임시 파일 정리
      if (error) reject(error);
      else resolve(stdout);
    });
  });
}
```

### 코드 서명

macOS 전용 보안 요구사항:

- 유효한 Developer ID 인증서로 애플리케이션 코드 서명 (CI 빌드 시점)
- `entitlements.mac.plist` 로 필요한 기능 선언
- Hardened Runtime 활성화 (`package.json` 의 `build.mac.hardenedRuntime: true`)
- Mac App Store 빌드(`mas` 타깃)는 `entitlements.mac.mas.plist` 와 App Sandbox 사용

> 공증(notarization)은 GitHub Actions 빌드 파이프라인(`.github/workflows/build-release.yml`)에서 App Store Connect API 키를 준비하고 electron-builder 공증 환경 변수(`APPLE_API_KEY` 등)를 설정하여 수행됩니다.

### 설치 및 업데이트

macOS 전용 설치 고려사항:

- DMG 및 ZIP 패키지 배포 (`package.json` 의 `build.mac.target`)
- 사용자 정의 tap 을 통한 Homebrew 배포 (`brew install --cask opspresso/tap/toast`)
- `electron-updater` 를 사용한 자동 업데이트 (ZIP 형식 필요)
- 설정은 `~/Library/Application Support/Toast/`, 로그는 `~/Library/Application Support/Toast/logs/toast-app.log` 에 저장

## Windows 전용 기능

### 시스템 트레이 통합

Windows에서 Toast 앱은 시스템 트레이에 통합됩니다:

- 트레이 아이콘에 표준 ICO 형식 사용
- Windows 시스템 테마와 함께 라이트/다크 모드 지원
- 좌클릭으로 메인 Toast 윈도우 열기
- 우클릭으로 컨텍스트 메뉴 열기

**구현**:
```javascript
// src/main/tray.js
if (process.platform === 'win32') {
  tray = new Tray(path.join(__dirname, '../../assets/icons/tray-icon.png'));
  // Windows 전용 설정
}
```

### 전역 키보드 단축키

Windows 키보드 단축키 처리:

- Electron의 `globalShortcut` 모듈을 통해 전역 단축키를 등록 (`registerGlobalShortcuts`)
- 사용자 정의 단축키는 `convertHotkeyToElectronFormat` 로 Electron accelerator 형식으로 변환 (변환 로직은 플랫폼 공통)
- `Ctrl`/`Control` 은 `CommandOrControl`, `Command`/`Meta`/`Super` 는 `Super`(Windows 키)로 매핑되며 `Alt`, `Shift` 는 그대로 유지
- 잘못된 형식의 단축키는 등록 전 유효성 검사로 걸러냄

**구현**:
```javascript
// src/main/shortcuts.js
// 단축키 변환은 플랫폼 독립적으로 동작
function convertHotkeyToElectronFormat(hotkey) {
  // Ctrl/Control -> CommandOrControl (Windows에서는 Control 키)
  // Command/Meta/Super -> Super (Windows 키)
  // Alt, Shift는 변환 없이 그대로 유지
  // ...
}
```

### 윈도우 관리

Windows 윈도우 동작:

- 프레임 없는(`frame: false`) 창을 사용 (모든 플랫폼 공통 옵션)
- 작업 표시줄 표시 여부는 `advanced.showInTaskbar` 설정으로 제어 (`skipTaskbar: !showInTaskbar`)
- Windows 에서는 창 `type` 을 `'panel'` 로, `thickFrame: false` 로 설정하여 기본 창 프레임 비활성화
- DPI 인식을 통한 다중 모니터 설정 처리

**구현**:
```javascript
// src/main/windows.js
// frame:false 등은 모든 플랫폼에 공통으로 적용되는 옵션
windows.toast = new BrowserWindow({
  frame: false,
  // 작업 표시줄 표시는 advanced.showInTaskbar 설정으로 결정
  skipTaskbar: !showInTaskbar,
  // Windows에서는 'panel' 타입 + thickFrame:false 로 기본 프레임 비활성화
  type: process.platform === 'darwin' ? 'normal' : 'panel',
  thickFrame: false,
  // ...
});
```

### 네이티브 스크립팅

Windows 전용 스크립팅 기능:

- PowerShell 통합
- Windows 배치 파일 실행
- Windows 전용 명령줄 도구

**구현**:
```javascript
// src/main/actions/script.js
async function executePowerShell(script) {
  // 스크립트를 임시 파일에 기록한 뒤 파일 경로로 실행
  const tempFile = path.join(os.tmpdir(), `toast-powershell-${Date.now()}.ps1`);
  fs.writeFileSync(tempFile, script);

  return new Promise((resolve, reject) => {
    exec(`powershell -ExecutionPolicy Bypass -File "${tempFile}"`, (error, stdout, stderr) => {
      fs.unlinkSync(tempFile); // 임시 파일 정리
      if (error) reject(error);
      else resolve(stdout);
    });
  });
}
```

### 코드 서명

Windows 전용 보안 요구사항:

- 유효한 코드 서명 인증서로 애플리케이션 서명 (CI 빌드 시점)
- SmartScreen 경고를 줄이기 위해 EV/OV 인증서 권장
- Windows Defender 호환성 확인

서명 설정은 `package.json` 의 `build.win` 섹션에서 관리됩니다.

### 설치 및 업데이트

Windows 전용 설치 고려사항:

- NSIS 설치 프로그램 및 portable EXE 형식 (`package.json` 의 `build.win.target`)
- `electron-updater` 를 사용한 자동 업데이트
- 설정 및 로그는 `%APPDATA%\Toast\` 에 저장 (로그는 `%APPDATA%\Toast\logs\toast-app.log`)
- 시작 프로그램 항목은 OS 표준 메커니즘 사용

## 플랫폼별 분기를 가진 공통 코드

Toast 앱은 필요한 경우 플랫폼별 분기를 가진 단일 코드베이스를 사용합니다:

```javascript
// 플랫폼별 코드 분기 예시
function openTerminal(command) {
  if (process.platform === 'darwin') {
    // macOS 전용 터미널 처리
    return exec(`open -a Terminal "${command}"`);
  } else if (process.platform === 'win32') {
    // Windows 전용 터미널 처리
    return exec(`start cmd.exe /K "${command}"`);
  }
}
```

## 플랫폼 감지

애플리케이션은 플랫폼 감지를 위해 Electron의 `process.platform`을 사용합니다:

```javascript
const isMac = process.platform === 'darwin';
const isWindows = process.platform === 'win32';
```

이를 통해 깔끔하고 읽기 쉬운 플랫폼별 코드 분기가 가능합니다.

## 크로스 플랫폼 개발 가이드라인

Toast 앱의 크로스 플랫폼 기능을 개발할 때:

1. **플랫폼 차이점 추상화**: 공통 인터페이스를 가진 플랫폼별 구현 생성
2. **모든 플랫폼에서 테스트**: 기능이 macOS와 Windows에서 올바르게 작동하는지 확인
3. **플랫폼 규칙 존중**: 플랫폼별 UI 가이드라인 및 사용자 기대치 준수
4. **우아한 성능 저하**: 플랫폼에서 기능을 사용할 수 없을 때 우아하게 대체
5. **일관된 기능 동등성**: 플랫폼별 개선을 허용하면서 플랫폼 간 핵심 기능 동등성 유지

## 다중 플랫폼 테스팅

플랫폼별 기능에 대한 테스팅 가이드라인:

1. macOS와 Windows 모두에 대한 테스트 환경 유지
2. 동일한 테스트 스위트 내에서 플랫폼별 테스트 케이스 사용
3. Electron의 플랫폼 감지를 사용한 조건부 테스트
4. 두 플랫폼에서 설치 및 업데이트 프로세스 테스트
5. 두 플랫폼에서 UI 렌더링 확인

## 알려진 플랫폼별 문제

| 문제 | 플랫폼 | 해결 방법 | 상태 |
|------|--------|-----------|------|
| 투명도 성능 | Windows | 저사양 기기에서 투명도 비활성화 | 활성 |
| 시스템 단축키와 키보드 단축키 충돌 | macOS | 알려진 시스템 단축키에 대한 유효성 검사 | 해결됨 |
| 다크 모드에서 트레이 아이콘 모양 | Windows | 라이트/다크 모드용 별도 아이콘 사용 | 해결됨 |
| 고해상도 DPI 스케일링 | Windows | 윈도우 생성 시 DPI 인식 추가 | 해결됨 |
| 메뉴 바 아이콘 간격 | macOS | 메뉴 바 아이콘 패딩 조정 | 해결됨 |
