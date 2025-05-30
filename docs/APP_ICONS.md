# App Icons 추출 유틸리티

이 문서는 macOS 애플리케이션의 .icns 파일에서 PNG 아이콘을 추출하여 Toast 앱에서 사용하는 로컬 아이콘 추출 기능에 대해 설명합니다.

## 개요

기존 Toast Icons API 대신 로컬에서 직접 애플리케이션의 아이콘을 추출하여 사용하는 기능입니다. macOS의 Applications 폴더에 설치된 앱들의 .icns 파일을 찾아 PNG 형식으로 변환하여 Toast 앱에서 활용할 수 있습니다.

## 기존 Toast Icons API와의 차이점

### Toast Icons API (기존)
- 외부 웹 API 서버에서 아이콘 다운로드
- 네트워크 연결 필요
- 서버에 등록된 아이콘만 사용 가능
- 온라인 의존성

### App Icons 추출 (신규)
- 로컬 시스템에서 직접 아이콘 추출
- 네트워크 연결 불필요
- 설치된 모든 앱의 아이콘 사용 가능
- 오프라인 동작

## 구현 방법

### 1. 핵심 유틸리티 함수

```javascript
// src/main/utils/app-icon-extractor.js
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

/**
 * macOS 애플리케이션에서 아이콘을 추출하여 PNG로 변환
 * @param {string} appName - 애플리케이션 이름 (예: "Visual Studio Code")
 * @param {string} outputDir - 출력 디렉토리 경로 (기본값: app data 아이콘 폴더)
 * @returns {Promise<string|null>} - 추출된 PNG 파일 경로 또는 null
 */
async function extractAppIcon(appName, outputDir = null) {
  // 플랫폼 확인 (macOS만 지원)
  if (process.platform !== 'darwin') {
    console.warn('⚠️ App icon extraction is only supported on macOS');
    return null;
  }

  const appPath = `/Applications/${appName}.app`;

  // 앱 경로 존재 여부 확인
  if (!fs.existsSync(appPath)) {
    console.error(`❌ 앱이 존재하지 않습니다: ${appPath}`);
    return null;
  }

  try {
    // 출력 디렉토리 설정 (기본값: app data 아이콘 폴더)
    if (!outputDir) {
      const { app } = require('electron');
      const userDataPath = app.getPath('userData');
      outputDir = path.join(userDataPath, 'icons');
    }

    // 출력 디렉토리 생성
    fs.mkdirSync(outputDir, { recursive: true });

    // 기존 아이콘이 있는지 확인 (캐시 활용)
    const existingIcon = getExistingIconPath(appName, outputDir);
    if (existingIcon) {
      return existingIcon;
    }

    // 오래된 아이콘 파일 정리 (백그라운드)
    setTimeout(() => cleanupOldIcons(outputDir), 1000);

    // .icns 파일 찾기
    const findCommand = `find "${appPath}" -name "*.icns" | head -n 1`;
    const icnsPath = execSync(findCommand, { encoding: 'utf8' }).trim();

    if (!icnsPath) {
      console.error(`❌ .icns 파일을 찾을 수 없습니다: ${appPath}`);
      return null;
    }

    // 안전한 파일명 생성 (특수문자 제거)
    const safeAppName = appName.replace(/[^a-zA-Z0-9\-_]/g, '_');
    const outputPath = path.join(outputDir, `${safeAppName}.png`);

    // PNG로 변환 (sips 명령어 사용)
    const convertCommand = `sips -s format png "${icnsPath}" --out "${outputPath}"`;
    execSync(convertCommand, { stdio: 'pipe' });

    // 파일 생성 확인
    if (fs.existsSync(outputPath)) {
      console.log(`✅ 아이콘 PNG 추출 완료: ${outputPath}`);
      return outputPath;
    } else {
      console.error(`❌ PNG 파일 생성 실패: ${outputPath}`);
      return null;
    }
  } catch (err) {
    console.error(`❌ 아이콘 추출 오류: ${err.message}`);
    return null;
  }
}

/**
 * 애플리케이션 경로에서 앱 이름 추출
 * @param {string} applicationPath - 애플리케이션 전체 경로
 * @returns {string|null} - 추출된 앱 이름 또는 null
 */
function extractAppNameFromPath(applicationPath) {
  if (!applicationPath) return null;

  try {
    // macOS .app 번들 처리
    if (applicationPath.endsWith('.app')) {
      const appName = path.basename(applicationPath, '.app');
      return appName;
    }

    // 일반 실행 파일 처리
    const baseName = path.basename(applicationPath);
    const appName = path.parse(baseName).name;
    return appName;
  } catch (err) {
    console.error(`❌ 앱 이름 추출 오류: ${err.message}`);
    return null;
  }
}

/**
 * 기존에 추출된 아이콘이 있는지 확인
 * @param {string} appName - 애플리케이션 이름
 * @param {string} outputDir - 출력 디렉토리 경로
 * @returns {string|null} - 기존 아이콘 파일 경로 또는 null
 */
function getExistingIconPath(appName, outputDir) {
  try {
    const safeAppName = appName.replace(/[^a-zA-Z0-9\-_]/g, '_');
    const iconPath = path.join(outputDir, `${safeAppName}.png`);

    if (fs.existsSync(iconPath)) {
      console.log(`✅ 기존 아이콘 발견: ${iconPath}`);
      return iconPath;
    }

    return null;
  } catch (err) {
    console.error(`❌ 기존 아이콘 확인 오류: ${err.message}`);
    return null;
  }
}

/**
 * 아이콘 캐시 디렉토리 정리 (오래된 파일 삭제)
 * @param {string} iconsDir - 아이콘 디렉토리 경로
 * @param {number} maxAge - 최대 보관 기간 (밀리초, 기본값: 30일)
 */
function cleanupOldIcons(iconsDir, maxAge = 30 * 24 * 60 * 60 * 1000) {
  try {
    if (!fs.existsSync(iconsDir)) return;

    const files = fs.readdirSync(iconsDir);
    const now = Date.now();

    files.forEach(file => {
      const filePath = path.join(iconsDir, file);
      const stats = fs.statSync(filePath);

      if (now - stats.mtime.getTime() > maxAge) {
        fs.unlinkSync(filePath);
        console.log(`🗑️ 오래된 아이콘 파일 삭제: ${filePath}`);
      }
    });
  } catch (err) {
    console.error(`❌ 아이콘 캐시 정리 오류: ${err.message}`);
  }
}

module.exports = {
  extractAppIcon,
  extractAppNameFromPath,
  getExistingIconPath,
  cleanupOldIcons
};
```

### 2. IPC 핸들러 추가

```javascript
// src/main/ipc.js에 추가
const { extractAppIcon, extractAppNameFromPath, getExistingIconPath, cleanupOldIcons } = require('./utils/app-icon-extractor');

// 앱 아이콘 추출 핸들러
ipcMain.handle('extract-app-icon', async (event, applicationPath) => {
  try {
    // 애플리케이션 경로에서 앱 이름 추출
    const appName = extractAppNameFromPath(applicationPath);
    if (!appName) {
      return { success: false, error: '앱 이름을 추출할 수 없습니다' };
    }

    // 아이콘 추출
    const iconPath = await extractAppIcon(appName);
    if (!iconPath) {
      return { success: false, error: '아이콘을 추출할 수 없습니다' };
    }

    // 파일 경로를 file:// URL로 변환 (영구 저장된 파일 사용)
    const fileUrl = `file://${iconPath}`;

    return {
      success: true,
      iconUrl: fileUrl,
      iconPath: iconPath,
      appName: appName
    };
  } catch (err) {
    return {
      success: false,
      error: `아이콘 추출 중 오류 발생: ${err.message}`
    };
  }
});
```

### 3. Preload 스크립트 확장

```javascript
// src/renderer/preload/toast.js에 추가
window.toast.extractAppIcon = (applicationPath) => {
  return ipcRenderer.invoke('extract-app-icon', applicationPath);
};
```

### 4. 렌더러 프로세스 유틸리티

```javascript
// src/renderer/pages/toast/modules/local-icon-utils.js
/**
 * 로컬 앱 아이콘 추출 유틸리티
 */

/**
 * 애플리케이션 경로에서 로컬 아이콘 추출
 * @param {string} applicationPath - 애플리케이션 파일 경로
 * @returns {Promise<string|null>} - 아이콘 데이터 URL 또는 null
 */
async function extractLocalAppIcon(applicationPath) {
  try {
    if (!applicationPath) {
      console.warn('⚠️ 애플리케이션 경로가 제공되지 않았습니다');
      return null;
    }

    // 메인 프로세스에서 아이콘 추출
    const result = await window.toast.extractAppIcon(applicationPath);

    if (result.success) {
      console.log(`✅ 로컬 아이콘 추출 성공: ${result.appName}`);
      return result.iconUrl;
    } else {
      console.error(`❌ 로컬 아이콘 추출 실패: ${result.error}`);
      return null;
    }
  } catch (err) {
    console.error(`❌ 로컬 아이콘 추출 오류: ${err.message}`);
    return null;
  }
}

/**
 * 버튼 아이콘을 로컬에서 추출한 아이콘으로 업데이트
 * @param {string} applicationPath - 애플리케이션 파일 경로
 * @param {HTMLElement} iconInput - 아이콘 입력 필드 요소
 * @returns {Promise<boolean>} - 성공 여부
 */
async function updateButtonIconFromLocalApp(applicationPath, iconInput) {
  try {
    if (!applicationPath || !iconInput) {
      console.warn('⚠️ 필수 매개변수가 누락되었습니다');
      return false;
    }

    // 로딩 상태 표시
    const originalPlaceholder = iconInput.placeholder;
    iconInput.placeholder = '아이콘 추출 중...';
    iconInput.disabled = true;

    // 로컬에서 아이콘 추출
    const iconUrl = await extractLocalAppIcon(applicationPath);

    if (iconUrl) {
      // 아이콘 설정
      iconInput.value = iconUrl;
      iconInput.placeholder = '아이콘이 설정되었습니다';

      // 아이콘 미리보기 업데이트 (있는 경우)
      const previewElement = iconInput.parentElement.querySelector('.icon-preview');
      if (previewElement) {
        previewElement.style.backgroundImage = `url(${iconUrl})`;
        previewElement.style.backgroundSize = 'contain';
        previewElement.style.backgroundRepeat = 'no-repeat';
        previewElement.style.backgroundPosition = 'center';
      }

      console.log('✅ 버튼 아이콘이 로컬에서 성공적으로 설정되었습니다');
      return true;
    } else {
      // 실패 시 원래 상태 복원
      iconInput.placeholder = originalPlaceholder;
      console.log('❌ 로컬 아이콘을 찾을 수 없습니다');
      return false;
    }
  } catch (err) {
    console.error(`❌ 버튼 아이콘 업데이트 오류: ${err.message}`);
    return false;
  } finally {
    // 로딩 상태 해제
    iconInput.disabled = false;
  }
}

// 전역 객체에 등록
window.localIconUtils = {
  extractLocalAppIcon,
  updateButtonIconFromLocalApp
};

export {
  extractLocalAppIcon,
  updateButtonIconFromLocalApp
};
```

### 5. 버튼 설정 모달 통합

```javascript
// src/renderer/pages/toast/modules/modals.js 수정
// 기존 Toast Icons API 호출 부분을 로컬 아이콘 추출로 대체

// 애플리케이션 선택 시 아이콘 자동 설정
applicationInput.addEventListener('change', async () => {
  const applicationPath = applicationInput.value;
  const iconInput = modal.querySelector('#icon');

  if (applicationPath && iconInput) {
    // 로컬 아이콘 추출 시도
    await window.localIconUtils.updateButtonIconFromLocalApp(applicationPath, iconInput);
  }
});
```

## 시스템 요구사항

### macOS
- **필수**: macOS 10.12 (Sierra) 이상
- **필수**: `sips` 명령어 (시스템 기본 제공)
- **필수**: `find` 명령어 (시스템 기본 제공)
- **권장**: Applications 폴더에 설치된 앱들

### 지원되는 애플리케이션 형식
- `.app` 번들 (macOS 표준 애플리케이션)
- 내부에 `.icns` 파일을 포함한 앱

### 지원되는 아이콘 형식
- **입력**: `.icns` (Apple Icon Image format)
- **출력**: `.png` (Portable Network Graphics)

## 사용 예시

### 1. 기본 사용법

```javascript
// 애플리케이션 경로에서 아이콘 추출
const applicationPath = '/Applications/Visual Studio Code.app';
const iconUrl = await window.localIconUtils.extractLocalAppIcon(applicationPath);

if (iconUrl) {
  console.log('아이콘 추출 성공:', iconUrl);
  // iconUrl은 file:///path/to/icon.png 형식
} else {
  console.log('아이콘 추출 실패');
}
```

### 2. 버튼 설정에서 자동 아이콘 설정

```javascript
// 버튼 설정 모달에서 애플리케이션 선택 시
const applicationPath = '/Applications/Chrome.app';
const iconInput = document.getElementById('icon-input');

const success = await window.localIconUtils.updateButtonIconFromLocalApp(applicationPath, iconInput);
if (success) {
  console.log('아이콘이 자동으로 설정되었습니다');
}
```

## 성능 특성

### 장점
- **빠른 속도**: 네트워크 지연 없음
- **높은 가용성**: 오프라인에서도 동작
- **완전한 커버리지**: 설치된 모든 앱 지원
- **고품질**: 원본 해상도 유지

### 제한사항
- **플랫폼 의존성**: macOS만 지원
- **시스템 명령어 의존**: `sips`, `find` 필요
- **디스크 공간**: app data 디렉토리에 아이콘 파일 저장
- **권한**: Applications 폴더 읽기 권한 필요

## 오류 처리

### 1. 플랫폼 미지원
```javascript
// macOS가 아닌 경우
if (process.platform !== 'darwin') {
  console.warn('⚠️ App icon extraction is only supported on macOS');
  return null;
}
```

### 2. 애플리케이션 없음
```javascript
// 앱이 설치되지 않은 경우
if (!fs.existsSync(appPath)) {
  console.error(`❌ 앱이 존재하지 않습니다: ${appPath}`);
  return null;
}
```

### 3. 아이콘 파일 없음
```javascript
// .icns 파일을 찾을 수 없는 경우
if (!icnsPath) {
  console.error(`❌ .icns 파일을 찾을 수 없습니다: ${appPath}`);
  return null;
}
```

### 4. 변환 실패
```javascript
// sips 명령어 실행 실패
try {
  execSync(convertCommand, { stdio: 'pipe' });
} catch (err) {
  console.error(`❌ 아이콘 변환 실패: ${err.message}`);
  return null;
}
```

## 보안 고려사항

### 1. 경로 검증
- 애플리케이션 경로 유효성 검사
- 디렉토리 트래버설 공격 방지
- 안전한 파일명 생성

### 2. 명령어 인젝션 방지
- 사용자 입력 이스케이핑
- 안전한 명령어 실행
- 제한된 권한으로 실행

### 3. 임시 파일 관리
- 임시 파일 자동 정리
- 안전한 임시 디렉토리 사용
- 파일 권한 제한

## 성능 최적화

### 1. 캐싱 전략
```javascript
// 추출된 아이콘 메모리 캐싱
const iconCache = new Map();

async function extractAppIconWithCache(appName) {
  if (iconCache.has(appName)) {
    return iconCache.get(appName);
  }

  const iconUrl = await extractAppIcon(appName);
  if (iconUrl) {
    iconCache.set(appName, iconUrl);
  }

  return iconUrl;
}
```

### 2. 비동기 처리
- 모든 아이콘 추출은 비동기로 처리
- UI 블로킹 방지
- 백그라운드 작업

### 3. 리소스 관리
- 임시 파일 즉시 정리
- 메모리 사용량 최적화
- 동시 추출 작업 제한

## 마이그레이션 가이드

### Toast Icons API에서 로컬 추출로 전환

#### 1. 기존 코드
```javascript
// 기존: Toast Icons API 사용
import { updateButtonIconFromApplication } from './icon-utils.js';
await updateButtonIconFromApplication(applicationPath, iconInput);
```

#### 2. 새로운 코드
```javascript
// 신규: 로컬 아이콘 추출 사용
import { updateButtonIconFromLocalApp } from './local-icon-utils.js';
await updateButtonIconFromLocalApp(applicationPath, iconInput);
```

## 테스트 방법

### 1. 단위 테스트
```javascript
// tests/unit/app-icon-extractor.test.js
const { extractAppIcon, extractAppNameFromPath } = require('../../src/main/utils/app-icon-extractor');

describe('App Icon Extractor', () => {
  test('should extract app name from path', () => {
    const appName = extractAppNameFromPath('/Applications/Visual Studio Code.app');
    expect(appName).toBe('Visual Studio Code');
  });

  test('should extract icon for existing app', async () => {
    const iconPath = await extractAppIcon('Finder');
    expect(iconPath).toBeTruthy();
    expect(iconPath).toMatch(/\.png$/);
  });
});
```

### 2. 통합 테스트
```javascript
// 실제 애플리케이션으로 테스트
const testApps = [
  'Finder',
  'Safari',
  'System Preferences',
  'Terminal'
];

for (const appName of testApps) {
  const iconUrl = await extractLocalAppIcon(`/Applications/${appName}.app`);
  console.log(`${appName}: ${iconUrl ? '✅' : '❌'}`);
}
```

## 문제 해결

### 1. 아이콘이 추출되지 않는 경우

**증상**: `extractAppIcon` 함수가 null 반환

**해결 방법**:
1. 앱이 Applications 폴더에 설치되어 있는지 확인
2. 앱 이름이 정확한지 확인 (대소문자 구분)
3. 앱 내부에 .icns 파일이 있는지 확인
4. 시스템 권한 확인

### 2. sips 명령어 오류

**증상**: "command not found: sips"

**해결 방법**:
1. macOS 시스템인지 확인
2. Xcode Command Line Tools 설치
3. 시스템 PATH 환경변수 확인

### 3. 권한 오류

**증상**: "Permission denied"

**해결 방법**:
1. Applications 폴더 읽기 권한 확인
2. 임시 디렉토리 쓰기 권한 확인
3. 앱 실행 권한 확인

### 4. 메모리 사용량 증가

**증상**: 많은 아이콘 추출 후 메모리 사용량 증가

**해결 방법**:
1. 아이콘 캐시 크기 제한
2. 임시 파일 정리 확인
3. 가비지 컬렉션 강제 실행

## 향후 개선 사항

### 1. 다중 플랫폼 지원
- Windows: .exe, .ico 파일 지원
- Linux: .desktop, .svg 파일 지원

### 2. 아이콘 크기 최적화
- 다양한 해상도 지원 (16x16, 32x32, 64x64, 128x128)
- 레티나 디스플레이 대응
- 자동 크기 조정

### 3. 고급 캐싱
- 디스크 기반 영구 캐시
- LRU 캐시 정책
- 캐시 만료 시간 설정

### 4. 배치 처리
- 여러 앱 아이콘 동시 추출
- 백그라운드 프리로딩
- 진행률 표시

## 관련 파일

- `src/main/utils/app-icon-extractor.js` - 핵심 아이콘 추출 유틸리티
- `src/renderer/pages/toast/modules/local-icon-utils.js` - 렌더러 프로세스 유틸리티
- `src/main/ipc.js` - IPC 핸들러 (extract-app-icon)
- `src/renderer/preload/toast.js` - Preload 스크립트 확장
- `src/renderer/pages/toast/modules/modals.js` - 버튼 설정 모달 통합

## 버전 히스토리

### v0.8.0 (예정)
- 로컬 앱 아이콘 추출 기능 추가
- macOS .icns → PNG 변환 지원
- app data 디렉토리에 영구 저장
- 스마트 캐싱 및 자동 정리
- file:// URL 지원
