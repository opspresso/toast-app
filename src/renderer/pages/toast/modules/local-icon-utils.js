/**
 * Toast - Local Icon Utilities
 *
 * 렌더러 프로세스에서 로컬 앱 아이콘 추출 기능을 제공하는 유틸리티 모듈
 */

/**
 * 애플리케이션 경로에서 로컬 아이콘 추출
 * @param {string} applicationPath - 애플리케이션 파일 경로
 * @param {boolean} forceRefresh - 기존 캐시를 무시하고 강제로 다시 추출
 * @returns {Promise<string|null>} - 아이콘 URL 또는 null
 */
async function extractLocalAppIcon(applicationPath, forceRefresh = false) {
  try {
    if (!applicationPath) {
      console.warn('⚠️ 애플리케이션 경로가 제공되지 않았습니다');
      return null;
    }

    const result = await window.toast.extractAppIcon(applicationPath, forceRefresh);

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
 * @param {HTMLElement} nameInput - 버튼 이름 입력 필드 요소 (선택사항)
 * @param {boolean} forceRefresh - 기존 캐시를 무시하고 강제로 다시 추출
 * @returns {Promise<boolean>} - 성공 여부
 */
async function updateButtonIconFromLocalApp(applicationPath, iconInput, nameInput = null, forceRefresh = false) {
  try {
    if (!applicationPath || !iconInput) {
      console.warn('⚠️ 필수 매개변수가 누락되었습니다');
      return false;
    }

    const originalPlaceholder = iconInput.placeholder;
    iconInput.placeholder = '아이콘 추출 중...';
    iconInput.disabled = true;

    const result = await window.toast.extractAppIcon(applicationPath, forceRefresh);

    if (result.success) {
      // 아이콘 업데이트
      iconInput.value = result.iconUrl;
      iconInput.placeholder = '아이콘이 설정되었습니다';

      const previewElement = iconInput.parentElement.querySelector('.icon-preview');
      if (previewElement) {
        previewElement.style.backgroundImage = `url(${result.iconUrl})`;
        previewElement.style.backgroundSize = 'contain';
        previewElement.style.backgroundRepeat = 'no-repeat';
        previewElement.style.backgroundPosition = 'center';
      }

      // 버튼 이름 업데이트 (nameInput이 제공되고 비어있는 경우)
      if (nameInput && (!nameInput.value || nameInput.value.trim() === '')) {
        nameInput.value = result.appName;
        console.log(`✅ 버튼 이름이 자동으로 설정되었습니다: ${result.appName}`);
      }

      console.log('✅ 버튼 아이콘이 로컬에서 성공적으로 설정되었습니다');
      return true;
    } else {
      iconInput.placeholder = originalPlaceholder;
      console.log(`❌ 로컬 아이콘을 찾을 수 없습니다: ${result.error}`);
      return false;
    }
  } catch (err) {
    console.error(`❌ 버튼 아이콘 업데이트 오류: ${err.message}`);
    return false;
  } finally {
    iconInput.disabled = false;
  }
}

/**
 * 아이콘 미리보기 업데이트
 * @param {string} iconUrl - 아이콘 URL
 * @param {HTMLElement} previewElement - 미리보기 요소
 */
function updateIconPreview(iconUrl, previewElement) {
  if (!previewElement) return;

  if (iconUrl && iconUrl.startsWith('file://')) {
    previewElement.style.backgroundImage = `url(${iconUrl})`;
    previewElement.style.backgroundSize = 'contain';
    previewElement.style.backgroundRepeat = 'no-repeat';
    previewElement.style.backgroundPosition = 'center';
    previewElement.style.display = 'block';
  } else {
    previewElement.style.backgroundImage = '';
    previewElement.style.display = 'none';
  }
}

/**
 * 애플리케이션 경로에서 앱 이름 추출 (클라이언트 사이드)
 * @param {string} applicationPath - 애플리케이션 경로
 * @returns {string|null} - 앱 이름 또는 null
 */
function extractAppNameFromPath(applicationPath) {
  if (!applicationPath) return null;

  try {
    // macOS .app 번들 처리
    if (applicationPath.endsWith('.app')) {
      const pathParts = applicationPath.split('/');
      const appBundle = pathParts[pathParts.length - 1];
      return appBundle.replace('.app', '');
    }

    // 일반 파일 경로 처리
    const pathParts = applicationPath.split('/');
    const fileName = pathParts[pathParts.length - 1];
    const dotIndex = fileName.lastIndexOf('.');

    if (dotIndex > 0) {
      return fileName.substring(0, dotIndex);
    }

    return fileName;
  } catch (err) {
    console.error(`❌ 앱 이름 추출 오류: ${err.message}`);
    return null;
  }
}

/**
 * 로컬 아이콘 추출 지원 여부 확인
 * @returns {boolean} - 지원 여부
 */
function isLocalIconExtractionSupported() {
  return window.toast.platform === 'darwin' && typeof window.toast.extractAppIcon === 'function';
}

/**
 * 아이콘 추출 버튼 생성
 * @param {HTMLElement} applicationInput - 애플리케이션 입력 필드
 * @param {HTMLElement} iconInput - 아이콘 입력 필드
 * @param {HTMLElement} nameInput - 버튼 이름 입력 필드 (선택사항)
 * @returns {HTMLElement} - 생성된 버튼 요소
 */
function createIconExtractionButton(applicationInput, iconInput, nameInput = null) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'icon-extract-btn';
  button.innerHTML = '🎨 아이콘 추출';
  button.title = '선택한 애플리케이션에서 아이콘을 자동으로 추출합니다';

  button.addEventListener('click', async () => {
    const applicationPath = applicationInput.value.trim();
    if (!applicationPath) {
      alert('먼저 애플리케이션을 선택해주세요.');
      return;
    }

    button.disabled = true;
    button.innerHTML = '⏳ 추출 중...';

    try {
      const success = await updateButtonIconFromLocalApp(applicationPath, iconInput, nameInput);
      if (success) {
        button.innerHTML = '✅ 완료';
        setTimeout(() => {
          button.innerHTML = '🎨 아이콘 추출';
        }, 2000);
      } else {
        button.innerHTML = '❌ 실패';
        setTimeout(() => {
          button.innerHTML = '🎨 아이콘 추출';
        }, 2000);
      }
    } catch (err) {
      console.error('아이콘 추출 버튼 오류:', err);
      button.innerHTML = '❌ 오류';
      setTimeout(() => {
        button.innerHTML = '🎨 아이콘 추출';
      }, 2000);
    } finally {
      button.disabled = false;
    }
  });

  return button;
}

// 전역 객체에 유틸리티 함수들을 노출
if (typeof window !== 'undefined') {
  window.localIconUtils = {
    extractLocalAppIcon,
    updateButtonIconFromLocalApp,
    updateIconPreview,
    extractAppNameFromPath,
    isLocalIconExtractionSupported,
    createIconExtractionButton
  };
}

// ES6 모듈로도 내보내기
export {
  extractLocalAppIcon,
  updateButtonIconFromLocalApp,
  updateIconPreview,
  extractAppNameFromPath,
  isLocalIconExtractionSupported,
  createIconExtractionButton
};
