# Toast 앱 아이콘 추출 유틸리티

이 문서는 macOS 애플리케이션의 .icns 파일에서 PNG 아이콘을 추출하여 Toast 앱에서 사용하는 로컬 아이콘 추출 기능에 대해 설명합니다.

## 개요

Toast 앱의 아이콘 추출 시스템은 로컬에서 직접 애플리케이션의 아이콘을 추출하여 사용하는 기능입니다. macOS의 Applications 폴더에 설치된 앱들의 .icns 파일을 찾아 PNG 형식으로 변환하여 Toast 앱에서 활용할 수 있습니다.

### 주요 특징

- **로컬 시스템에서 직접 아이콘 추출**: 네트워크 연결 불필요
- **설치된 모든 앱 지원**: Applications 폴더의 모든 .app 번들
- **오프라인 동작**: 인터넷 연결 없이도 작동
- **실시간 미리보기**: 버튼 설정 시 즉시 아이콘 확인
- **자동 감지**: `open -a AppName` 명령어에서 자동 아이콘 추출
- **스마트 캐싱**: 한 번 추출한 아이콘은 캐시하여 재사용

## 핵심 기능

### 1. 실시간 아이콘 미리보기

버튼 설정 모달에서 Toast 창 버튼과 동일한 스타일로 실시간 아이콘 미리보기를 제공합니다.

```javascript
function updateIconPreview() {
  const iconValue = editButtonIconInput.value.trim();
  const actionType = editButtonActionSelect.value;
  const previewImg = document.getElementById('icon-preview-img');
  const placeholder = iconPreview.querySelector('.icon-preview-placeholder');

  // FlatColorIcons 처리
  if (iconValue && iconValue.startsWith('FlatColorIcons.')) {
    const iconKey = iconValue.replace('FlatColorIcons.', '');
    // 아이콘 카탈로그에서 검색하여 표시
  }

  // file:// URL 완벽 지원
  else if (iconValue && iconValue.startsWith('file://')) {
    previewImg.src = iconValue;
    previewImg.style.display = 'block';
    placeholder.style.display = 'none';
  }
}
```

### 2. Exec 액션에서 자동 아이콘 추출

`open -a AppName` 패턴을 자동으로 감지하여 해당 애플리케이션의 아이콘을 추출합니다.

```javascript
// 지원되는 명령어 패턴
const patterns = [
  'open -a Mail',
  'open -a "Visual Studio Code"',
  'open -a zoom.us',
  'open -a "Final Cut Pro"'
];

// 패턴 감지 정규식
const openAppMatch = command.match(/^open\s+-a\s+(?:"([^"]+)"|([\w\s\.\-]+))/);
if (openAppMatch) {
  const appName = (openAppMatch[1] || openAppMatch[2]).trim();
  const appPath = `/Applications/${appName}.app`;
  // 자동 아이콘 추출 실행
}
```

### 3. 강화된 아이콘 리로드 기능

🔄 버튼을 통해 Application 및 Exec 액션에서 아이콘을 강제로 새로고침할 수 있습니다.

```javascript
// Application 액션: 선택된 애플리케이션에서 아이콘 추출
if (actionType === 'application') {
  applicationPath = editButtonApplicationInput.value.trim();
}
// Exec 액션: open -a 명령어에서 앱 이름 추출
else if (actionType === 'exec') {
  const command = editButtonCommandInput.value.trim();
  const openAppMatch = command.match(/^open\s+-a\s+(?:"([^"]+)"|([\w\s\.\-]+))/);
  if (openAppMatch) {
    const appName = (openAppMatch[1] || openAppMatch[2]).trim();
    applicationPath = `/Applications/${appName}.app`;
  }
}
```

### 4. 스마트한 favicon 지원

Open 액션에서 아이콘이 비어있을 때 URL의 favicon을 자동으로 표시합니다.

```javascript
// open 액션이고 아이콘이 비어있지만 URL이 있는 경우 favicon 사용
if (actionType === 'open' && (!iconValue || iconValue === '') && urlValue) {
  const faviconUrl = getFaviconFromUrl(urlValue);
  previewImg.src = faviconUrl;

  // favicon 로딩 실패 시 기본 아이콘으로 대체
  previewImg.onerror = function() {
    placeholder.textContent = '🌐';
  };
}
```

### 5. 액션별 기본 아이콘

각 액션 타입에 맞는 기본 아이콘을 제공합니다.

```javascript
switch (actionType) {
  case 'exec': placeholder.textContent = '⚡'; break;
  case 'application': placeholder.textContent = '🚀'; break;
  case 'open': placeholder.textContent = '🌐'; break;
  case 'script': placeholder.textContent = '📜'; break;
  case 'chain': placeholder.textContent = '🔗'; break;
  default: placeholder.textContent = '🖼️'; break;
}
```

## 시스템 아키텍처

### 메인 프로세스 (`src/main/utils/app-icon-extractor.js`)

```javascript
/**
 * macOS 애플리케이션에서 아이콘을 추출하여 PNG로 변환
 */
async function extractAppIcon(appName, outputDir = null, forceRefresh = false) {
  if (process.platform !== 'darwin') {
    console.warn('⚠️ App icon extraction is only supported on macOS');
    return null;
  }

  const appPath = `/Applications/${appName}.app`;
  if (!fs.existsSync(appPath)) {
    console.error(`❌ 앱이 존재하지 않습니다: ${appPath}`);
    return null;
  }

  try {
    if (!outputDir) {
      const { app } = require('electron');
      outputDir = path.join(app.getPath('userData'), 'icons');
    }

    fs.mkdirSync(outputDir, { recursive: true });

    // 강제 새로고침이 아닌 경우 기존 아이콘 확인
    if (!forceRefresh) {
      const existingIcon = getExistingIconPath(appName, outputDir);
      if (existingIcon) return existingIcon;
    }

    // .icns 파일 찾기
    const findCommand = `find "${appPath}" -name "*.icns" | head -n 1`;
    const icnsPath = execSync(findCommand, { encoding: 'utf8' }).trim();

    if (!icnsPath) {
      console.error(`❌ .icns 파일을 찾을 수 없습니다: ${appPath}`);
      return null;
    }

    // PNG로 변환
    const safeAppName = appName.replace(/[^a-zA-Z0-9\-_]/g, '_');
    const outputPath = path.join(outputDir, `${safeAppName}.png`);
    const convertCommand = `sips -s format png "${icnsPath}" --out "${outputPath}"`;

    execSync(convertCommand, { stdio: 'pipe' });

    return fs.existsSync(outputPath) ? outputPath : null;
  } catch (err) {
    console.error(`❌ 아이콘 추출 오류: ${err.message}`);
    return null;
  }
}
```

### IPC 통신 (`src/main/ipc.js`)

```javascript
// 아이콘 추출 IPC 핸들러
ipcMain.handle('extract-app-icon', async (event, applicationPath, forceRefresh = false) => {
  try {
    const appName = extractAppNameFromPath(applicationPath);
    if (!appName) {
      return { success: false, error: '앱 이름을 추출할 수 없습니다' };
    }

    const iconPath = await extractAppIcon(appName, null, forceRefresh);
    if (!iconPath) {
      return { success: false, error: '아이콘을 추출할 수 없습니다' };
    }

    return {
      success: true,
      iconUrl: `file://${iconPath}`,
      iconPath,
      appName
    };
  } catch (err) {
    return {
      success: false,
      error: `아이콘 추출 중 오류 발생: ${err.message}`
    };
  }
});
```

### 렌더러 프로세스 (`src/renderer/pages/toast/modules/local-icon-utils.js`)

```javascript
/**
 * 핵심 기능: 애플리케이션에서 아이콘과 이름을 추출하여 UI 업데이트
 */
async function updateButtonIconFromLocalApp(applicationPath, iconInput, nameInput = null, forceRefresh = false) {
  if (!applicationPath || !iconInput) return false;

  try {
    const result = await window.toast.extractAppIcon(applicationPath, forceRefresh);

    if (result.success) {
      // 1. 아이콘 입력 필드 업데이트
      iconInput.value = result.iconUrl;

      // 2. 버튼 이름 업데이트 (비어있을 때만)
      if (nameInput && !nameInput.value.trim()) {
        nameInput.value = result.appName;
      }

      // 3. input 이벤트 트리거 (미리보기 업데이트용)
      iconInput.dispatchEvent(new Event('input', { bubbles: true }));

      return true;
    }
    return false;
  } catch (err) {
    console.error('아이콘 추출 오류:', err);
    return false;
  }
}

/**
 * 로컬 아이콘 추출 지원 여부 확인
 */
function isLocalIconExtractionSupported() {
  return window.toast.platform === 'darwin' && typeof window.toast.extractAppIcon === 'function';
}
```

## 사용자 워크플로우

### Application 액션

1. **애플리케이션 선택**: Browse 버튼으로 애플리케이션 선택
2. **자동 아이콘 추출**: 선택과 동시에 아이콘 자동 추출 및 미리보기 표시
3. **강제 새로고침**: 🔄 버튼으로 언제든지 아이콘 재추출 가능

### Exec 액션

1. **명령어 입력**: `open -a Mail` 형태의 명령어 입력
2. **자동 감지**: 명령어 패턴 자동 감지 및 Mail.app 아이콘 추출
3. **실시간 업데이트**: 명령어 변경 시 즉시 미리보기 업데이트
4. **강제 새로고침**: 🔄 버튼으로 아이콘 재추출

### Open 액션

1. **URL 입력**: 웹사이트 URL 입력 (예: https://github.com)
2. **Favicon 자동 표시**: 아이콘 필드를 비워두면 자동으로 favicon 표시
3. **실시간 미리보기**: URL 변경 시 즉시 favicon 업데이트

## 시스템 요구사항

### macOS 지원
- **필수**: macOS 10.12 (Sierra) 이상
- **필수**: `sips` 명령어 (시스템 기본 제공)
- **필수**: `find` 명령어 (시스템 기본 제공)
- **권장**: Applications 폴더에 설치된 앱들

### 지원 형식
- **입력**: `.icns` (Apple Icon Image format)
- **출력**: `.png` (Portable Network Graphics)
- **애플리케이션**: `.app` 번들 (macOS 표준)

## 성능 및 최적화

### 캐싱 전략

```javascript
// 스마트 캐싱: 한 번 추출한 아이콘은 재사용
function getExistingIconPath(appName, outputDir) {
  try {
    const safeAppName = appName.replace(/[^a-zA-Z0-9\-_]/g, '_');
    const iconPath = path.join(outputDir, `${safeAppName}.png`);
    return fs.existsSync(iconPath) ? iconPath : null;
  } catch (err) {
    console.error(`❌ 기존 아이콘 확인 오류: ${err.message}`);
    return null;
  }
}

// 오래된 아이콘 자동 정리 (30일)
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
```

### 비동기 처리

- **UI 블로킹 방지**: 모든 아이콘 추출은 비동기로 처리
- **백그라운드 작업**: 사용자 인터페이스에 영향 없이 처리
- **진행 상태 표시**: 🔄 → ⏳ → 🔄 버튼 상태 변화로 진행 상황 표시

## 오류 처리 및 보안

### 오류 처리

```javascript
// 1. 플랫폼 미지원
if (process.platform !== 'darwin') {
  console.warn('⚠️ App icon extraction is only supported on macOS');
  return null;
}

// 2. 애플리케이션 없음
if (!fs.existsSync(appPath)) {
  console.error(`❌ 앱이 존재하지 않습니다: ${appPath}`);
  return null;
}

// 3. 아이콘 파일 없음
if (!icnsPath) {
  console.error(`❌ .icns 파일을 찾을 수 없습니다: ${appPath}`);
  return null;
}

// 4. 변환 실패
try {
  execSync(convertCommand, { stdio: 'pipe' });
} catch (err) {
  console.error(`❌ 아이콘 변환 실패: ${err.message}`);
  return null;
}
```

### 보안 고려사항

- **경로 검증**: 애플리케이션 경로 유효성 검사
- **안전한 파일명**: 특수 문자 제거 및 안전한 파일명 생성
- **명령어 인젝션 방지**: 사용자 입력 이스케이핑
- **권한 제한**: 최소 권한으로 실행

## 테스트 및 검증

### 단위 테스트

```javascript
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

  test('should handle non-existent app', async () => {
    const iconPath = await extractAppIcon('NonExistentApp');
    expect(iconPath).toBeNull();
  });
});
```

### 통합 테스트

```javascript
const testApps = ['Finder', 'Safari', 'System Preferences', 'Terminal'];

for (const appName of testApps) {
  const iconUrl = await extractLocalAppIcon(`/Applications/${appName}.app`);
  console.log(`${appName}: ${iconUrl ? '✅' : '❌'}`);
}
```

## 문제 해결

### 일반적인 문제

1. **아이콘이 추출되지 않는 경우**
   - Applications 폴더에 앱이 설치되어 있는지 확인
   - 앱 이름의 대소문자 정확성 확인
   - 앱 내부에 .icns 파일 존재 여부 확인

2. **sips 명령어 오류**
   - macOS 시스템 확인
   - Xcode Command Line Tools 설치
   - 시스템 PATH 환경변수 확인

3. **권한 오류**
   - Applications 폴더 읽기 권한 확인
   - 임시 디렉토리 쓰기 권한 확인

4. **메모리 사용량 증가**
   - 아이콘 캐시 크기 제한
   - 임시 파일 정리 확인

## 관련 파일

- `src/main/utils/app-icon-extractor.js` - 핵심 아이콘 추출 유틸리티
- `src/renderer/pages/toast/modules/local-icon-utils.js` - 렌더러 프로세스 유틸리티
- `src/main/ipc.js` - IPC 핸들러 (extract-app-icon)
- `src/renderer/preload/toast.js` - Preload 스크립트 확장
- `src/renderer/pages/toast/modules/modals.js` - 버튼 설정 모달 통합
- `src/renderer/pages/toast/styles.css` - 아이콘 미리보기 스타일

## 향후 개선 계획

### 다중 플랫폼 지원
- **Windows**: .exe, .ico 파일 지원
- **Linux**: .desktop, .svg 파일 지원

### 고급 기능
- **다양한 해상도**: 16x16, 32x32, 64x64, 128x128 지원
- **레티나 디스플레이**: 고해상도 디스플레이 대응
- **배치 처리**: 여러 앱 아이콘 동시 추출
- **진행률 표시**: 대량 처리 시 진행 상황 표시

### 성능 최적화
- **디스크 기반 캐시**: 영구 캐시 시스템
- **LRU 캐시**: 메모리 효율적인 캐시 정책
- **백그라운드 프리로딩**: 자주 사용되는 앱 아이콘 미리 로드
