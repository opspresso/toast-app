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

macOS 전용 키보드 단축키 처리:

- Electron의 `globalShortcut` 모듈을 통해 macOS 시스템 API 사용
- macOS 전용 수정자 키(Command, Option) 처리
- 키보드 동작에 대한 시스템 환경설정 존중
- 시스템 단축키와의 충돌 방지를 위한 유효성 검사

**구현**:
```javascript
// src/main/shortcuts.js
function registerGlobalShortcut(shortcut) {
  let modifiedShortcut = shortcut;
  if (process.platform === 'darwin') {
    // 일반 단축키를 macOS 형식으로 변환
    modifiedShortcut = shortcut.replace('Alt', 'Option');
    // 추가 macOS 전용 처리
  }
  // 단축키 등록
}
```

### 윈도우 관리

macOS 전용 윈도우 동작:

- 네이티브 윈도우 컨트롤(신호등 버튼) 지원
- 가능한 경우 vibrancy 및 투명도 효과 사용
- Spaces 및 전체화면 애플리케이션 처리
- 포커스 및 활성화 적절한 관리

**구현**:
```javascript
// src/main/windows.js
function createToastWindow() {
  const windowOptions = {
    // 공통 옵션
  };

  if (process.platform === 'darwin') {
    windowOptions.vibrancy = 'under-window';
    windowOptions.titleBarStyle = 'hiddenInset';
    // 기타 macOS 전용 옵션
  }

  return new BrowserWindow(windowOptions);
}
```

### 네이티브 스크립팅

macOS 전용 스크립팅 기능:

- `osascript`를 통한 AppleScript 통합
- macOS 셸 명령어 및 유틸리티
- macOS 서비스 및 워크플로우와의 통합

**구현**:
```javascript
// src/main/actions/script.js
async function runScript(script, type) {
  if (process.platform === 'darwin' && type === 'applescript') {
    return new Promise((resolve, reject) => {
      exec(`osascript -e '${script.replace(/'/g, "'\\''")}'`, (error, stdout) => {
        if (error) reject(error);
        else resolve(stdout);
      });
    });
  }
  // 기타 스크립트 유형
}
```

### 코드 서명 및 공증

macOS 전용 보안 요구사항:

- 유효한 Developer ID로 애플리케이션 코드 서명
- Apple의 공증 서비스로 앱 공증
- Hardened Runtime 활성화
- 필요한 기능에 대한 Entitlements 구성
- 샌드박싱 고려사항 문서화

**구현**:
```javascript
// notarize.js
module.exports = async function (params) {
  if (process.platform !== 'darwin') {
    return;
  }

  // 공증 프로세스
  // ...
};
```

### 설치 및 업데이트

macOS 전용 설치 고려사항:

- DMG 기반 설치 프로세스
- 사용자 정의 tap을 통한 Homebrew 배포
- Squirrel.Mac을 사용한 자동 업데이트
- 설정 및 로그를 위한 macOS 전용 파일 위치

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

Windows 전용 키보드 단축키 처리:

- Electron의 `globalShortcut` 모듈을 통해 Windows 전용 API 사용
- Windows 전용 수정자 키(Alt, Windows 키) 처리
- Windows 키 조합에 대한 특별 처리
- 일반적인 Windows 단축키에 대한 유효성 검사

**구현**:
```javascript
// src/main/shortcuts.js
function registerGlobalShortcut(shortcut) {
  let modifiedShortcut = shortcut;
  if (process.platform === 'win32') {
    // 일반 단축키를 Windows 형식으로 변환
    modifiedShortcut = shortcut.replace('Command', 'Super');
    // 추가 Windows 전용 처리
  }
  // 단축키 등록
}
```

### 윈도우 관리

Windows 전용 윈도우 동작:

- 표준 Windows 윈도우 장식 사용
- 작업 표시줄 통합 적절한 처리
- DPI 인식을 통한 다중 모니터 설정 처리
- 작업 관리자 친화적(적절한 프로세스 이름 지정)

**구현**:
```javascript
// src/main/windows.js
function createToastWindow() {
  const windowOptions = {
    // 공통 옵션
  };

  if (process.platform === 'win32') {
    windowOptions.frame = false;
    windowOptions.skipTaskbar = true;
    // 기타 Windows 전용 옵션
  }

  return new BrowserWindow(windowOptions);
}
```

### 네이티브 스크립팅

Windows 전용 스크립팅 기능:

- PowerShell 통합
- Windows 배치 파일 실행
- Windows 전용 명령줄 도구

**구현**:
```javascript
// src/main/actions/script.js
async function runScript(script, type) {
  if (process.platform === 'win32' && type === 'powershell') {
    return new Promise((resolve, reject) => {
      exec(`powershell -Command "${script.replace(/"/g, '`"')}"`, (error, stdout) => {
        if (error) reject(error);
        else resolve(stdout);
      });
    });
  }
  // 기타 스크립트 유형
}
```

### 코드 서명

Windows 전용 보안 요구사항:

- 유효한 코드 서명 인증서로 애플리케이션 서명
- SmartScreen 필터 고려사항
- Windows Defender 호환성

**구현**:
```javascript
// electron-builder.yml (구성)
win:
  sign: './sign.js'
```

### 설치 및 업데이트

Windows 전용 설치 고려사항:

- MSI 및 EXE 설치 프로그램 형식
- Squirrel.Windows를 사용한 자동 업데이트
- 설정 및 로그를 위한 Windows 전용 파일 위치
- 시작 프로그램 레지스트리 항목

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
