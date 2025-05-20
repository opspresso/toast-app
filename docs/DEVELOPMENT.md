# Toast 앱 개발 가이드

이 문서는 Toast 앱의 개발 환경 설정, 프로젝트 구조, 빌드 프로세스 및 개발 워크플로우를 설명합니다.

## 목차

- [개발 환경 설정](#개발-환경-설정)
- [프로젝트 구조](#프로젝트-구조)
- [빌드 프로세스](#빌드-프로세스)
- [개발 워크플로우](#개발-워크플로우)
- [로깅 시스템](#로깅-시스템)
- [자동 업데이트](#자동-업데이트)
- [디버깅](#디버깅)
- [코드 작성 가이드라인](#코드-작성-가이드라인)
- [일반적인 개발 작업](#일반적인-개발-작업)

## 개발 환경 설정

### 필수 조건

- **Node.js**: v16 이상
- **npm** (v7 이상) 또는 **yarn**
- **Git**
- Electron, JavaScript 및 데스크톱 애플리케이션 개발에 대한 기본 지식

### 저장소 복제 및 설정

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

### 권장 개발 도구

- **Visual Studio Code**: 다음 확장 기능 추천
  - ESLint: 코드 품질 및 스타일 검사
  - Prettier: 코드 포맷팅
  - Debugger for Chrome/Electron: 디버깅
  - Jest: 테스트 실행 및 디버깅

- **Chrome DevTools**: 렌더러 프로세스 디버깅용

### 환경 변수 설정

개발 환경에서 로컬 환경 변수를 설정하려면:

1. `src/main/config` 디렉토리에 `.env` 파일 생성
2. 참조용으로 제공된 `.env.example` 파일을 기반으로 필요한 환경 변수 설정

```
# .env 예시
AUTH_API_URL=http://localhost:8080/api
CLIENT_ID=local_development_client_id
LOG_LEVEL=debug
```

## 프로젝트 구조

Toast 앱은 Electron의 메인 프로세스와 렌더러 프로세스를 분리하는 표준 구조를 따릅니다:

```
toast-app/
├── assets/                # 애플리케이션 자산
│   └── icons/             # 애플리케이션 아이콘
├── docs/                  # 문서 자산
│   └── images/            # 문서 이미지
├── src/                   # 소스 코드
│   ├── main/              # 메인 프로세스 코드
│   │   ├── actions/       # 액션 구현
│   │   ├── api/           # API 클라이언트
│   │   ├── config/        # 환경 구성
│   │   ├── auth.js        # 인증 처리
│   │   ├── config.js      # 구성 관리
│   │   ├── executor.js    # 액션 실행
│   │   ├── ipc.js         # IPC 처리
│   │   ├── logger.js      # 로깅 시스템
│   │   ├── shortcuts.js   # 글로벌 단축키
│   │   ├── tray.js        # 시스템 트레이
│   │   ├── updater.js     # 자동 업데이트
│   │   └── windows.js     # 윈도우 관리
│   ├── renderer/          # 렌더러 프로세스 코드
│   │   ├── assets/        # 렌더러 자산
│   │   ├── pages/         # 애플리케이션 페이지
│   │   │   ├── toast/     # Toast 팝업 UI
│   │   │   └── settings/  # 설정 UI
│   │   └── preload/       # 프리로드 스크립트
│   └── index.js           # 애플리케이션 진입점
├── tests/                 # 테스트 파일
│   ├── unit/              # 단위 테스트
│   ├── integration/       # 통합 테스트
│   └── e2e/               # 엔드 투 엔드 테스트
├── .editorconfig          # 에디터 구성
├── .eslintrc.js           # ESLint 구성
├── .prettierrc            # Prettier 구성
├── jest.config.js         # Jest 구성
├── package.json           # 프로젝트 메타데이터 및 의존성
└── README.md              # 프로젝트 개요
```

### 주요 파일 및 디렉토리 설명

#### 메인 프로세스 (`src/main/`)

- **index.js**: 애플리케이션 진입점
- **config.js**: 사용자 구성 관리 (electron-store 사용)
- **windows.js**: 애플리케이션 창 관리
- **tray.js**: 시스템 트레이 아이콘 관리
- **shortcuts.js**: 글로벌 단축키 관리
- **executor.js**: 액션 실행 로직
- **ipc.js**: IPC 채널 및 핸들러
- **auth.js**: 인증 및 토큰 관리
- **cloud-sync.js**: 클라우드 동기화 로직
- **logger.js**: 애플리케이션 로깅 시스템
- **updater.js**: 자동 업데이트 관리

#### 액션 (`src/main/actions/`)

- **application.js**: 애플리케이션 관련 액션
- **exec.js**: 명령 실행 액션
- **open.js**: URL 및 파일 열기 액션
- **shortcut.js**: 단축키 실행 액션
- **script.js**: 스크립트 실행 액션
- **chain.js**: 여러 액션 체이닝

#### 렌더러 프로세스 (`src/renderer/`)

- **pages/toast/**: Toast 팝업 UI 구현
- **pages/settings/**: 설정 UI 구현
- **preload/**: 렌더러용 프리로드 스크립트

## 빌드 프로세스

### 개발 모드

개발 중에 애플리케이션을 실행하려면:

```bash
npm run dev
```

이 명령은 개발 모드에서 Electron 애플리케이션을 시작하며 소스 파일의 변경을 감시합니다. 변경 사항이 감지되면 애플리케이션이 자동으로 다시 로드됩니다.

### 프로덕션 빌드

배포용 애플리케이션을 빌드하려면:

```bash
# 현재 플랫폼용 빌드
npm run build

# 특정 플랫폼용 빌드
npm run build:mac    # macOS용
npm run build:win    # Windows용
npm run build:mas    # macOS App Store용
```

빌드된 애플리케이션은 `dist/` 디렉토리에 생성됩니다.

### 테스트 실행

```bash
# 모든 테스트 실행
npm test

# 단위 테스트만 실행
npm run test:unit

# 통합 테스트만 실행
npm run test:integration

# 감시 모드에서 테스트 실행
npm run test:watch

# 코드 커버리지 보고서 생성
npm run test:coverage
```

### 린팅 및 포맷팅

```bash
# 코드 린팅
npm run lint

# 린팅 문제 자동 수정
npm run lint:fix

# 코드 포맷팅
npm run format
```

## 개발 워크플로우

Toast 앱은 기능 브랜치 워크플로우를 따릅니다:

1. **최신 메인 브랜치에서 시작**:
```bash
git checkout main
git pull
```

2. **기능 브랜치 생성**:
```bash
git checkout -b feature/your-feature-name
```
또는 버그 수정의 경우:
```bash
git checkout -b fix/issue-number-description
```

3. **개발 및 테스트**:
- 코드 작성 및 수정
- 테스트 작성 및 실행
- 로컬에서 애플리케이션 테스트

4. **변경 사항 커밋**:
```bash
git add .
git commit -m "feat: add new button type for custom scripts"
```

Conventional Commits 형식을 사용:
- `feat`: 새 기능
- `fix`: 버그 수정
- `docs`: 문서 변경
- `style`: 코드 스타일 변경 (포맷팅)
- `refactor`: 기능 변경 없는 코드 개선
- `test`: 테스트 추가 또는 수정
- `chore`: 빌드 프로세스 변경

5. **푸시 및 풀 리퀘스트**:
```bash
git push origin feature/your-feature-name
```
그런 다음 GitHub에서 풀 리퀘스트 생성

## 로깅 시스템

Toast 앱은 `electron-log` 패키지를 사용하여 일관되고 효율적인 로깅 시스템을 구현합니다.

### 로깅 설정

로깅 시스템은 `src/main/logger.js` 모듈에서 중앙 집중식으로 관리되며 다음 기능을 제공합니다:

- 파일 및 콘솔에 동시에 로그 출력
- 모듈별 네임스페이스로 로그 소스 쉽게 식별
- 로그 파일 자동 회전 (5MB 제한, 최대 5개 파일)
- 개발/운영 환경에 따른 로그 레벨 자동 조정

로그 파일은 다음 위치에 저장됩니다:
- **macOS**: `~/Library/Logs/Toast/toast-app.log`
- **Windows**: `%USERPROFILE%\AppData\Roaming\Toast\logs\toast-app.log`
- **Linux**: `~/.config/Toast/logs/toast-app.log`

### 로거 사용 방법

#### 메인 프로세스에서 사용

```javascript
const { createLogger } = require('./logger');

// 모듈별 로거 생성
const logger = createLogger('ModuleName');

// 다양한 로그 레벨 사용
logger.info('정보 메시지');
logger.warn('경고 메시지');
logger.error('오류 메시지', errorObject);
logger.debug('디버그 정보', { data: 'someValue' });
```

#### IPC를 통한 렌더러 프로세스 로깅

```javascript
// 렌더러 프로세스 (preload 스크립트에서 노출됨)
window.logger.info('UI에서 로그 메시지');
window.logger.error('UI 오류', errorDetails);

// 프리로드 스크립트
contextBridge.exposeInMainWorld('logger', {
  info: (message, ...args) => ipcRenderer.invoke('log-info', message, ...args),
  warn: (message, ...args) => ipcRenderer.invoke('log-warn', message, ...args),
  error: (message, ...args) => ipcRenderer.invoke('log-error', message, ...args),
  debug: (message, ...args) => ipcRenderer.invoke('log-debug', message, ...args),
});
```

### 로그 레벨 구성

`package.json`이나 환경 변수를 통해 로그 레벨을 구성할 수 있습니다:

```javascript
// 환경 변수로 설정 (src/main/config/.env)
LOG_LEVEL=debug
```

사용 가능한 로그 레벨:
- **error**: 오류 메시지만
- **warn**: 경고 및 오류
- **info**: 정보, 경고 및 오류 (기본값)
- **debug**: 디버그 정보 포함 (개발 환경 기본값)
- **verbose**: 세부 정보 포함
- **silly**: 가장 상세한 로깅 레벨

## 자동 업데이트

Toast 앱은 `electron-updater` 패키지를 사용하여 GitHub 릴리스 기반 자동 업데이트를 구현합니다.

### 업데이트 시스템 구성

자동 업데이트 설정은 `package.json`의 `build` 및 `publish` 섹션에서 정의됩니다:

```json
"build": {
  "appId": "com.opspresso.toast-app",
  "productName": "Toast",
  "mac": {
    "target": [
      "dmg",
      "zip"  // macOS 자동 업데이트에 필요
    ],
    // 다른 macOS 설정...
  },
  "win": {
    "target": [
      "nsis",
      "portable"
    ],
    // 다른 Windows 설정...
  }
},
"publish": {
  "provider": "github",
  "owner": "opspresso",
  "repo": "toast",
  "releaseType": "release",
  "publishAutoUpdate": true
}
```

> **중요**: macOS에서 자동 업데이트가 작동하려면 DMG와 함께 ZIP 형식이 필요합니다.

### 업데이트 구현 (`src/main/updater.js`)

업데이트 모듈은 다음을 처리합니다:
- 업데이트 확인
- 업데이트 다운로드
- 업데이트 설치
- 업데이트 이벤트 처리 및 알림

```javascript
// 업데이트 모듈 사용 예시 (메인 프로세스)
const updater = require('./updater');

// 앱 시작 시 업데이트 초기화
updater.initAutoUpdater(windows);

// 업데이트 확인 (silent 모드: 사용자에게 알리지 않음)
await updater.checkForUpdates(true);

// 업데이트 다운로드
await updater.downloadUpdate();

// 업데이트 설치
await updater.installUpdate();
```

#### 렌더러 측 처리

렌더러 프로세스에서는 다음과 같이 업데이트 이벤트를 처리합니다:

```javascript
// 프리로드 스크립트에서 노출된 이벤트 리스너
window.addEventListener('checking-for-update', event => {
  // 업데이트 확인 중 UI 표시
});

window.addEventListener('update-available', event => {
  // 사용 가능한 업데이트 알림 표시
  const version = event.detail.info.version;
  showUpdateNotification(version);
});

window.addEventListener('update-downloaded', event => {
  // 다운로드 완료 알림 및 설치 옵션 제공
  showInstallPrompt();
});

// 업데이트 설치 함수
function installUpdate() {
  window.updater.installUpdate();
}
```

## 디버깅

### 메인 프로세스 디버깅

1. **VS Code로 디버깅**:
   - `.vscode/launch.json` 파일 생성:
     ```json
     {
       "version": "0.2.0",
       "configurations": [
         {
           "name": "Debug Main Process",
           "type": "node",
           "request": "launch",
           "cwd": "${workspaceFolder}",
           "runtimeExecutable": "${workspaceFolder}/node_modules/.bin/electron",
           "windows": {
             "runtimeExecutable": "${workspaceFolder}/node_modules/.bin/electron.cmd"
           },
           "args": ["."],
           "outputCapture": "std"
         }
       ]
     }
     ```
   - F5를 눌러 디버깅 시작

2. **로깅**:
   - 메인 프로세스에 로깅 추가:
     ```javascript
     console.log('Debug info:', someVariable);
     ```

### 렌더러 프로세스 디버깅

1. **Chrome DevTools 사용**:
   - 개발 모드에서 실행 중일 때 `Ctrl+Shift+I` 또는 `Cmd+Option+I`로 DevTools 열기
   - 요소 검사, 콘솔 로그 확인, 네트워크 요청 모니터링, JavaScript 디버깅

2. **개발 빌드에서 DevTools 활성화**:
   ```javascript
   // src/main/windows.js
   const win = new BrowserWindow({
     // ... 다른 옵션들
     webPreferences: {
       devTools: true,
       // ... 다른 webPreferences
     }
   });

   if (process.env.NODE_ENV === 'development') {
     win.webContents.openDevTools({ mode: 'detach' });
   }
   ```

## 코드 작성 가이드라인

### JavaScript/TypeScript 스타일

- **ESLint 및 Prettier** 규칙 준수
- **명확한 변수 및 함수 이름** 사용
- **ES6+ 기능** 사용 권장
- **비동기 코드**에 async/await 사용
- JSDoc 주석으로 복잡한 함수 문서화

```javascript
/**
 * 지정된 액션을 실행합니다.
 * @param {Object} action - 실행할 액션
 * @param {string} action.type - 액션 유형 (exec, open, shortcut, script)
 * @param {Object} action.params - 액션별 매개변수
 * @returns {Promise<Object>} 액션 실행 결과
 */
async function executeAction(action) {
  // 구현...
}
```

### 메인 프로세스 가이드라인

1. **IPC 통신**:
   - 메인 및 렌더러 간 통신에 명확한 채널 이름 사용
   - 양방향 통신에 invoke/handle 패턴 사용
   - 단방향 메시지에 send/on 패턴 사용

2. **모듈식 코드**:
   - 관련 기능을 별도 모듈로 그룹화
   - 명확한 의존성 및 책임 유지

3. **오류 처리**:
   - 모든 비동기 작업에 적절한 오류 처리
   - IPC 통신에서 오류 객체 올바르게 직렬화

### 렌더러 프로세스 가이드라인

1. **수신 IPC 호출**:
   - 컴포넌트에서 직접 IPC 호출 대신 서비스 계층 사용
   - 렌더러와 메인 프로세스 간 명확한 경계 유지

2. **UI 컴포넌트**:
   - 재사용 가능한 컴포넌트로 UI 구성
   - 표현 컴포넌트와 컨테이너 컴포넌트 분리

## 일반적인 개발 작업

### 새 액션 유형 추가

1. `src/main/actions/` 디렉토리에 새 액션 파일 생성
2. 액션 유효성 검사 및 실행 로직 구현
3. `src/main/executor.js`에 새 액션 유형 등록

### 새 설정 옵션 추가

1. `src/main/config.js`의 기본 구성 및 스키마 업데이트
2. 설정 UI에 새 설정 필드 추가
3. 업데이트된 구성에 액세스하는 코드 수정

### 새 플랫폼 지원 추가

1. 플랫폼별 코드에 새 플랫폼 감지 로직 추가
2. 필요한 플랫폼별 구현 제공
3. 새 플랫폼용 빌드 스크립트 추가

### 새 기능 테스트

1. `tests/unit/` 디렉토리에 단위 테스트 추가
2. 필요한 경우 통합 및 E2E 테스트 추가
3. 모든 테스트 통과 확인
4. 코드 커버리지 유지 또는 향상

### 버그 수정

1. 버그를 재현하는 테스트 작성
2. 버그 수정 구현
3. 테스트가 통과하는지 확인
4. 변경 사항이 다른 기능에 영향을 미치지 않는지 확인

### 가이드라인 요약

- **작고, 집중적인 커밋** 생성
- **업데이트된 JSDoc 주석**으로 코드 문서화
- **변경 사항에 대한 테스트** 작성
- 지속적으로 **중복 제거**
- **코드 품질**을 위해 ESLint 및 Prettier 사용
- 모든 주요 동작에 **적절한 로깅** 추가
