# Toast Icons API 통합

이 문서는 Toast 앱에서 애플리케이션 아이콘을 자동으로 가져오기 위한 Toast Icons API 통합 기능에 대해 설명합니다.

## 개요

Toast Icons API 통합 기능을 통해 사용자가 버튼 설정 모달에서 애플리케이션을 선택할 때 자동으로 해당 애플리케이션의 아이콘을 Toast API에서 가져와 설정할 수 있습니다.

## 구현된 기능

### 1. 아이콘 유틸리티 모듈 (`src/renderer/pages/toast/modules/icon-utils.js`)

애플리케이션 아이콘을 Toast API에서 가져오는 핵심 기능을 제공합니다.

#### 주요 함수

##### `extractApplicationName(applicationPath)`
애플리케이션 파일 경로에서 애플리케이션 이름을 추출합니다.

**매개변수:**
- `applicationPath` (string): 애플리케이션 파일 경로

**반환값:**
- (string): 추출된 애플리케이션 이름

**예시:**
```javascript
extractApplicationName('/Applications/Visual Studio Code.app')
// 반환: 'Visual Studio Code'

extractApplicationName('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe')
// 반환: 'chrome'
```

##### `extractApplicationNameFromCommand(command)`
exec 명령어에서 애플리케이션 이름을 추출합니다.

**매개변수:**
- `command` (string): 실행 명령어

**반환값:**
- (string): 추출된 애플리케이션 이름

**예시:**
```javascript
extractApplicationNameFromCommand('open -a Toast')
// 반환: 'Toast'

extractApplicationNameFromCommand('open -a "Visual Studio Code"')
// 반환: 'Visual Studio Code'

extractApplicationNameFromCommand('/Applications/Chrome.app/Contents/MacOS/Google Chrome')
// 반환: 'Google Chrome'
```

##### `getToastIconUrl(applicationName)`
애플리케이션 이름을 기반으로 Toast API 아이콘 URL을 생성합니다.

**매개변수:**
- `applicationName` (string): 애플리케이션 이름

**반환값:**
- (Promise<string>): Toast API 아이콘 URL

**예시:**
```javascript
await getToastIconUrl('Visual Studio Code')
// 반환: 'https://toastapp.io/api/icons/Visual%20Studio%20Code'
```

##### `fetchApplicationIcon(applicationPath)`
Toast API에서 애플리케이션 아이콘을 가져옵니다.

**매개변수:**
- `applicationPath` (string): 애플리케이션 파일 경로

**반환값:**
- (Promise<string>): 아이콘 URL (실패 시 빈 문자열)

**특징:**
- HEAD 요청으로 먼저 확인
- 실패 시 GET 요청으로 재시도
- 리다이렉트 자동 처리

##### `fetchApplicationIconFromCommand(command)`
Toast API에서 exec 명령어를 기반으로 애플리케이션 아이콘을 가져옵니다.

**매개변수:**
- `command` (string): 실행 명령어

**반환값:**
- (Promise<string>): 아이콘 URL (실패 시 빈 문자열)

**특징:**
- 명령어에서 애플리케이션 이름을 자동 추출
- HEAD 요청으로 먼저 확인
- 실패 시 GET 요청으로 재시도
- 리다이렉트 자동 처리

##### `updateButtonIconFromApplication(applicationPath, iconInput)`
버튼 아이콘을 Toast API에서 가져온 아이콘으로 자동 업데이트합니다.

**매개변수:**
- `applicationPath` (string): 애플리케이션 파일 경로
- `iconInput` (HTMLElement): 아이콘 입력 필드 요소

**반환값:**
- (Promise<boolean>): 성공 여부

##### `updateButtonIconFromCommand(command, iconInput)`
버튼 아이콘을 Toast API에서 exec 명령어를 기반으로 자동 업데이트합니다.

**매개변수:**
- `command` (string): 실행 명령어
- `iconInput` (HTMLElement): 아이콘 입력 필드 요소

**반환값:**
- (Promise<boolean>): 성공 여부

### 2. 환경변수 지원

#### Preload 스크립트 확장 (`src/renderer/preload/toast.js`)

```javascript
// 환경변수 가져오기 함수 추가
window.toast.getEnv(key)
```

#### IPC 핸들러 추가 (`src/main/ipc.js`)

```javascript
// 환경변수 가져오기 핸들러
ipcMain.handle('get-env', (event, key) => {
  const { getEnv } = require('./config/env');
  return getEnv(key);
});
```

### 3. 버튼 설정 모달 개선 (`src/renderer/pages/toast/modules/modals.js`)

애플리케이션 선택 시 자동으로 Toast Icons API에서 아이콘을 가져오는 기능이 추가되었습니다.

**동작 과정:**
1. 사용자가 "Browse" 버튼을 클릭하여 애플리케이션 선택
2. 선택된 애플리케이션 경로가 입력 필드에 설정됨
3. `updateButtonIconFromApplication` 함수가 자동으로 호출됨
4. Toast API에서 아이콘을 가져와 아이콘 필드에 자동 설정
5. 성공/실패에 따른 상태 메시지 표시

### 4. 버튼 렌더링 개선 (`src/renderer/pages/toast/modules/buttons.js`)

기존 버튼들도 Toast API에서 아이콘을 자동으로 가져오도록 개선되었습니다.

**동작 과정:**
1. application 타입 버튼에서 아이콘이 없는 경우
2. `applicationPath`가 있으면 Toast API에서 아이콘 검색
3. 아이콘을 찾으면 비동기적으로 로드하여 표시
4. 실패 시 기본 🚀 아이콘 사용

## 환경변수 설정

### TOAST_URL
Toast API 서버의 기본 URL을 설정합니다.

**기본값:** `https://toastapp.io`

**설정 방법:**
```bash
# .env.local 파일에서
TOAST_URL="https://toastapp.io"

# 또는 다른 서버 사용 시
TOAST_URL="https://your-custom-toast-server.com"
```

## API 엔드포인트

### Toast Icons API
```
GET {TOAST_URL}/api/icons/{applicationName}
```

**매개변수:**
- `applicationName`: URL 인코딩된 애플리케이션 이름

**예시:**
```
GET https://toastapp.io/api/icons/Visual%20Studio%20Code
GET https://toastapp.io/api/icons/Chrome
GET https://toastapp.io/api/icons/Finder
```

## 사용 예시

### 1. 버튼 설정에서 애플리케이션 선택

1. Toast 앱에서 설정 모드 활성화
2. 버튼 클릭하여 설정 모달 열기
3. Action을 "Application"으로 선택
4. "Browse" 버튼 클릭
5. 애플리케이션 선택 (예: `/Applications/Visual Studio Code.app`)
6. 아이콘이 자동으로 Toast API에서 가져와짐

### 2. Exec 명령어에서 자동 아이콘 설정

1. Toast 앱에서 설정 모드 활성화
2. 버튼 클릭하여 설정 모달 열기
3. Action을 "Exec"으로 선택
4. Command 필드에 명령어 입력 (예: `open -a Toast`)
5. 명령어 입력 시 자동으로 Toast API에서 아이콘 검색
6. 아이콘이 발견되면 자동으로 아이콘 필드에 설정

### 2. 프로그래밍 방식으로 아이콘 가져오기

```javascript
import { updateButtonIconFromApplication } from './icon-utils.js';

// 아이콘 입력 필드 요소
const iconInput = document.getElementById('icon-input');

// 애플리케이션 경로
const appPath = '/Applications/Visual Studio Code.app';

// 아이콘 자동 업데이트
const success = await updateButtonIconFromApplication(appPath, iconInput);

if (success) {
  console.log('아이콘이 성공적으로 설정되었습니다');
} else {
  console.log('아이콘을 찾을 수 없습니다');
}
```

## 플랫폼별 지원

### macOS
- `.app` 애플리케이션 번들 지원
- `/Applications` 폴더 기본 경로

### Windows
- `.exe` 실행 파일 지원
- `C:\Program Files` 폴더 기본 경로

### Linux
- 실행 파일 지원
- `/usr/bin` 등의 경로 지원

## 오류 처리

### 네트워크 오류
- Toast API 서버에 연결할 수 없는 경우
- 자동으로 기본 아이콘 사용

### 아이콘 없음
- Toast API에서 해당 애플리케이션의 아이콘을 찾을 수 없는 경우
- 기존 아이콘 유지 또는 기본 아이콘 사용

### 잘못된 경로
- 애플리케이션 경로가 유효하지 않은 경우
- 아이콘 업데이트 건너뛰기

## 성능 최적화

### 비동기 처리
- 모든 아이콘 로딩은 비동기적으로 처리
- UI 블로킹 없이 백그라운드에서 실행

### 캐싱
- 브라우저의 HTTP 캐시 활용
- 동일한 아이콘 재요청 시 캐시된 결과 사용

### 폴백 메커니즘
- HEAD 요청 실패 시 GET 요청으로 재시도
- 모든 요청 실패 시 기본 아이콘 사용

## 보안 고려사항

### URL 인코딩
- 애플리케이션 이름은 안전하게 URL 인코딩됨
- XSS 공격 방지

### HTTPS 통신
- Toast API와의 모든 통신은 HTTPS로 암호화
- 중간자 공격 방지

### 입력 검증
- 애플리케이션 경로 유효성 검사
- 악의적인 입력 차단

## 문제 해결

### 아이콘이 로드되지 않는 경우

1. **네트워크 연결 확인**
   - Toast API 서버에 접근 가능한지 확인
   - 방화벽 설정 확인

2. **애플리케이션 이름 확인**
   - 애플리케이션 이름이 올바르게 추출되는지 확인
   - 특수 문자나 공백 처리 확인

3. **환경변수 확인**
   - `TOAST_URL` 환경변수가 올바르게 설정되었는지 확인

### 성능 문제

1. **네트워크 지연**
   - Toast API 서버 응답 시간 확인
   - CDN 사용 고려

2. **많은 아이콘 로딩**
   - 페이지당 버튼 수 제한
   - 지연 로딩 구현 고려

## 향후 개선 사항

### 로컬 캐시
- 가져온 아이콘을 로컬에 캐시하여 성능 향상
- 오프라인 상황에서도 아이콘 표시

### 아이콘 크기 최적화
- 다양한 크기의 아이콘 지원
- 레티나 디스플레이 대응

### 사용자 정의 아이콘 서버
- 사용자가 자체 아이콘 서버를 설정할 수 있는 기능
- 기업 환경에서의 내부 아이콘 서버 활용

## 관련 파일

- `src/renderer/pages/toast/modules/icon-utils.js` - 아이콘 유틸리티 함수
- `src/renderer/pages/toast/modules/modals.js` - 버튼 설정 모달
- `src/renderer/pages/toast/modules/buttons.js` - 버튼 렌더링
- `src/renderer/preload/toast.js` - Toast 윈도우 preload 스크립트
- `src/main/ipc.js` - IPC 핸들러
- `src/main/config/env.js` - 환경변수 관리

## 버전 히스토리

### v0.7.6
- Toast Icons API 통합 기능 추가
- 자동 아이콘 가져오기 기능 구현
- 환경변수 지원 추가
- 플랫폼별 애플리케이션 경로 처리 개선
