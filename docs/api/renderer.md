# Toast 앱 렌더러 프로세스 API

이 문서는 Toast 앱의 렌더러 프로세스 API에 대한 문서를 제공합니다.

## Toast 윈도우 API (`src/renderer/preload/toast.js`)

Toast 윈도우 API는 Toast 윈도우가 메인 프로세스와 통신하기 위한 인터페이스를 제공합니다.

### 구성 관리

```javascript
window.toast.getConfig(key)      // 구성 가져오기
window.toast.saveConfig(config)  // 구성 변경 사항 저장
window.toast.getEnv(key)         // 환경변수 가져오기
window.toast.resetToDefaults(options) // 설정 초기화 (options.keepAppearance: 외관 설정 유지)
```

### 액션 실행

```javascript
window.toast.executeAction(action)  // 액션 실행
```

### 윈도우 제어

```javascript
window.toast.hideWindow()             // Toast 윈도우 숨기기
window.toast.showWindow()             // Toast 윈도우 표시
window.toast.showSettings()           // 설정 윈도우 표시
window.toast.setModalOpen(isOpen)     // 모달 상태 설정
window.toast.setAlwaysOnTop(value)    // alwaysOnTop 속성 설정
window.toast.getWindowPosition()      // 현재 윈도우 위치 반환
window.toast.hideWindowTemporarily()  // 다이얼로그 표시를 위해 일시 숨김
window.toast.showWindowAfterDialog(position) // 다이얼로그 후 윈도우 복원
```

### 인증 관련

```javascript
window.toast.initiateLogin()      // 로그인 프로세스 시작
window.toast.logout()             // 로그아웃
window.toast.fetchUserProfile()   // 사용자 프로필 가져오기
window.toast.fetchSubscription()  // 구독 정보 가져오기
window.toast.getUserSettings()    // 사용자 설정 가져오기
```

### 유틸리티

```javascript
window.toast.showOpenDialog(options)  // 파일 열기 대화 상자
window.toast.extractAppIcon(path, forceRefresh) // 앱 아이콘 추출
window.toast.resolveTildePath(tildePath) // 틸드 경로 변환
window.toast.platform  // 플랫폼 정보 (darwin, win32, linux)
```

### 로깅

```javascript
window.toast.log.info(message, ...args)   // 정보 로그
window.toast.log.warn(message, ...args)   // 경고 로그
window.toast.log.error(message, ...args)  // 오류 로그
window.toast.log.debug(message, ...args)  // 디버그 로그
```

### 이벤트 리스너

```javascript
// 구성 업데이트 수신
window.toast.onConfigUpdated(callback)

// 인증 이벤트
window.toast.onLoginSuccess(callback)      // 로그인 성공
window.toast.onLoginError(callback)        // 로그인 오류
window.toast.onLogoutSuccess(callback)     // 로그아웃 성공
window.toast.onAuthStateChanged(callback)  // 인증 상태 변경
window.toast.onAuthReloadSuccess(callback) // 인증 새로고침 성공
```

### 이벤트

```javascript
// 구성 로드 이벤트
window.addEventListener('config-loaded', (event) => {
  const config = event.detail;
  // detail에는 다음이 포함됩니다: pages, appearance, subscription
});

// 윈도우 숨기기 전 이벤트
window.addEventListener('before-window-hide', () => {
  // 윈도우가 숨겨지기 전에 정리
});
```

### 사용 예시

```javascript
// 구성 가져오기
const pages = await window.toast.getConfig('pages');
const appearance = await window.toast.getConfig('appearance');

// 환경변수 가져오기
const toastUrl = await window.toast.getEnv('TOAST_URL');
const nodeEnv = await window.toast.getEnv('NODE_ENV');

// 액션 실행
const result = await window.toast.executeAction({
  action: 'exec',
  command: 'echo "Hello world!"'
});

// 구성 저장(예: 페이지 업데이트)
await window.toast.saveConfig({ pages: updatedPages });

// 윈도우 숨기기
window.toast.hideWindow();

// 구성 업데이트 수신
const removeListener = window.toast.onConfigUpdated((config) => {
  console.log('Configuration updated:', config);
});

// 플랫폼별 동작을 위한 플랫폼 확인
if (window.toast.platform === 'darwin') {
  // macOS 특정 코드
} else if (window.toast.platform === 'win32') {
  // Windows 특정 코드
}

// 이벤트 리스너 등록
window.addEventListener('config-loaded', (event) => {
  const { pages, appearance, subscription } = event.detail;
  // UI 업데이트
});

window.addEventListener('before-window-hide', () => {
  // 편집 모드 종료, 상태 저장 등
});
```

## 설정 윈도우 API (`src/renderer/preload/settings.js`)

설정 윈도우 API는 설정 윈도우가 메인 프로세스와 통신하기 위한 인터페이스를 제공합니다.

### 구성 관리

```javascript
// 구성 CRUD 작업
window.settings.getConfig(key) // 구성 가져오기
window.settings.setConfig(key, value) // 구성 설정
window.settings.resetConfig() // 구성을 기본값으로 재설정
window.settings.importConfig(filePath) // 파일에서 구성 가져오기
window.settings.exportConfig(filePath) // 파일로 구성 내보내기
```

### 액션 관리

```javascript
// 액션 테스트 및 검증
window.settings.testAction(action) // 액션 테스트
window.settings.validateAction(action) // 액션 유효성 검사
```

### 윈도우 제어

```javascript
// 윈도우 관리
window.settings.showToast() // Toast 윈도우 표시
window.settings.closeWindow() // 설정 윈도우 닫기
```

### 대화 상자

```javascript
// 파일 대화 상자
window.settings.showOpenDialog(options) // 파일 열기 대화 상자 표시
window.settings.showSaveDialog(options) // 파일 저장 대화 상자 표시
window.settings.showMessageBox(options) // 메시지 상자 표시
```

### 앱 제어

```javascript
// 애플리케이션 제어
window.settings.restartApp() // 애플리케이션 재시작
window.settings.quitApp() // 애플리케이션 종료
```

### 단축키 제어

```javascript
// 단축키 녹화용
window.settings.temporarilyDisableShortcuts() // 전역 단축키 일시적으로 비활성화
window.settings.restoreShortcuts() // 전역 단축키 복원
```

### 시스템 정보

```javascript
// 시스템 정보 조회
window.settings.getPlatform() // 플랫폼 가져오기(darwin, win32, linux)
window.settings.getVersion() // 애플리케이션 버전 가져오기
```

### 업데이트 관리

```javascript
// 자동 업데이트
window.settings.checkForUpdates(silent) // 업데이트 확인
window.settings.downloadUpdate() // 업데이트 다운로드
window.settings.installUpdate() // 업데이트 설치
```

### 로깅

```javascript
// 로그 기록
window.settings.log.info(message, ...args) // 정보 로그 기록
window.settings.log.warn(message, ...args) // 경고 로그 기록
window.settings.log.error(message, ...args) // 오류 로그 기록
window.settings.log.debug(message, ...args) // 디버그 로그 기록
```

### 이벤트

```javascript
// 구성 로드 이벤트
window.addEventListener('config-loaded', (event) => {
  const config = event.detail;
  // 전체 구성 객체 포함
});

// 업데이트 이벤트
window.addEventListener('checking-for-update', (event) => {
  // 업데이트 확인 중
});

window.addEventListener('update-available', (event) => {
  // 사용 가능한 업데이트가 있음
  const updateInfo = event.detail.info;
});

window.addEventListener('download-progress', (event) => {
  // 다운로드 진행 상황
  const progress = event.detail.progress;
});

window.addEventListener('update-downloaded', (event) => {
  // 업데이트 다운로드 완료
});

window.addEventListener('update-error', (event) => {
  // 업데이트 오류
  const error = event.detail.error;
});
```

### 사용 예시

```javascript
// 구성 관리
const config = await window.settings.getConfig();
await window.settings.setConfig('globalHotkey', 'Alt+Space');

// 액션 테스트
const result = await window.settings.testAction({
  action: 'exec',
  command: 'echo "Hello world!"'
});

if (result.success) {
  console.log('액션 테스트 성공:', result.output);
} else {
  console.error('액션 테스트 실패:', result.error);
}

// 파일 대화 상자
const openResult = await window.settings.showOpenDialog({
  properties: ['openFile'],
  filters: [
    { name: 'JSON Files', extensions: ['json'] },
    { name: 'All Files', extensions: ['*'] }
  ]
});

if (!openResult.canceled) {
  const filePath = openResult.filePaths[0];
  await window.settings.importConfig(filePath);
}

// 저장 대화 상자
const saveResult = await window.settings.showSaveDialog({
  defaultPath: 'toast-config.json',
  filters: [
    { name: 'JSON Files', extensions: ['json'] }
  ]
});

if (!saveResult.canceled) {
  await window.settings.exportConfig(saveResult.filePath);
}

// 단축키 녹화
await window.settings.temporarilyDisableShortcuts();
// 여기서 단축키 녹화...
await window.settings.restoreShortcuts();

// 메시지 상자
await window.settings.showMessageBox({
  type: 'info',
  title: '정보',
  message: '설정이 저장되었습니다.',
  buttons: ['확인']
});

// 업데이트 확인
const updateResult = await window.settings.checkForUpdates(false);
if (updateResult.hasUpdate) {
  console.log(`새 버전 사용 가능: ${updateResult.versionInfo.latest}`);

  // 업데이트 다운로드
  const downloadResult = await window.settings.downloadUpdate();
  if (downloadResult.success) {
    // 설치 확인 후 설치
    const installConfirm = await window.settings.showMessageBox({
      type: 'question',
      title: '업데이트 설치',
      message: '업데이트를 지금 설치하시겠습니까?',
      buttons: ['설치', '나중에']
    });

    if (installConfirm.response === 0) {
      await window.settings.installUpdate();
    }
  }
}

// 로깅
window.settings.log.info('설정 창이 열렸습니다');
window.settings.log.warn('구성 파일이 오래되었습니다', { version: '1.0.0' });
window.settings.log.error('설정 저장 실패', error);

// 이벤트 리스너
window.addEventListener('config-loaded', (event) => {
  const config = event.detail;
  // UI 초기화
  initializeUI(config);
});

window.addEventListener('update-available', (event) => {
  const updateInfo = event.detail.info;
  showUpdateNotification(updateInfo);
});

window.addEventListener('download-progress', (event) => {
  const { percent, bytesPerSecond } = event.detail.progress;
  updateProgressBar(percent);
  updateDownloadSpeed(bytesPerSecond);
});
```

## 공통 API 패턴

### 결과 객체

모든 API 호출은 일관된 결과 객체를 반환합니다:

```javascript
// 성공 결과
{
  success: true,
  message: '작업이 성공적으로 완료되었습니다',
  data: {}, // 반환 데이터 (해당되는 경우)
  // 기타 작업별 속성
}

// 오류 결과
{
  success: false,
  message: '오류 메시지',
  error: 'Error details', // 오류 세부 정보
  // 기타 오류 관련 속성
}
```

### 대화 상자 옵션

#### 파일 열기 대화 상자

```javascript
const options = {
  title: '파일 선택',
  defaultPath: '/Users/username/Documents',
  buttonLabel: '선택',
  filters: [
    { name: 'JSON Files', extensions: ['json'] },
    { name: 'All Files', extensions: ['*'] }
  ],
  properties: [
    'openFile',        // 파일 선택
    'openDirectory',   // 디렉토리 선택
    'multiSelections', // 다중 선택
    'showHiddenFiles'  // 숨김 파일 표시
  ]
};
```

#### 파일 저장 대화 상자

```javascript
const options = {
  title: '파일 저장',
  defaultPath: '/Users/username/Documents/config.json',
  buttonLabel: '저장',
  filters: [
    { name: 'JSON Files', extensions: ['json'] }
  ]
};
```

#### 메시지 상자

```javascript
const options = {
  type: 'info',        // 'none', 'info', 'error', 'question', 'warning'
  title: '제목',
  message: '메시지 내용',
  detail: '상세 설명',
  buttons: ['확인', '취소'],
  defaultId: 0,        // 기본 버튼 인덱스
  cancelId: 1          // 취소 버튼 인덱스
};
```

## 보안 고려사항

1. **컨텍스트 격리**: 모든 API는 contextBridge를 통해 안전하게 노출
2. **입력 검증**: 모든 입력은 메인 프로세스에서 검증
3. **권한 제한**: 필요한 API만 렌더러 프로세스에 노출
4. **샌드박스**: 렌더러 프로세스는 샌드박스 환경에서 실행

## 오류 처리

1. **Promise 기반**: 모든 비동기 API는 Promise를 반환
2. **일관된 오류 형식**: 모든 오류는 표준화된 형식으로 반환
3. **사용자 친화적 메시지**: 오류 메시지는 사용자가 이해하기 쉽게 작성
4. **로깅**: 모든 오류는 자동으로 로그에 기록

## 플랫폼별 동작

### macOS (`darwin`)
- Cmd 키 수정자 사용
- .app 애플리케이션 번들 지원
- AppleScript 실행 지원

### Windows (`win32`)
- Ctrl 키 수정자 사용
- .exe 실행 파일 지원
- PowerShell 스크립트 실행 지원

### Linux (`linux`)
- Ctrl 키 수정자 사용
- 패키지 관리자 통합
- Bash 스크립트 실행 지원

## 성능 최적화

1. **비동기 처리**: 모든 API 호출은 비동기적으로 처리
2. **캐싱**: 자주 사용되는 데이터는 메모리에 캐싱
3. **배치 처리**: 여러 작업을 효율적으로 배치 처리
4. **리소스 관리**: 메모리 및 리소스 사용량 최적화
