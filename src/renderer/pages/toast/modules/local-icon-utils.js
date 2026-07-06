/**
 * Toast - Local Icon Utilities
 *
 * 간소화된 로컬 앱 아이콘 추출 유틸리티
 */

/**
 * 핵심 기능: 애플리케이션에서 아이콘과 이름을 추출하여 UI 업데이트
 * @param {string} applicationPath - 애플리케이션 파일 경로
 * @param {HTMLElement} iconInput - 아이콘 입력 필드
 * @param {HTMLElement} nameInput - 이름 입력 필드 (선택사항)
 * @param {boolean} forceRefresh - 강제 새로고침 여부
 * @returns {Promise<boolean>} - 성공 여부
 */
async function updateButtonIconFromLocalApp(applicationPath, iconInput, nameInput = null, forceRefresh = false) {
  if (!applicationPath || !iconInput) {
    return false;
  }

  try {
    const result = await window.toast.extractAppIcon(applicationPath, forceRefresh);

    if (result.success) {
      // 1. 아이콘 입력 필드 업데이트
      // 서버 업로드에 성공했으면 기기 간 공유 가능한 https URL 을 우선 사용하고,
      // 아니면 기존처럼 로컬 tilde 경로 기반 file:// URL 을 사용
      iconInput.value = result.remoteUrl || `file://${result.iconPath}`;

      // 2. 버튼 이름 업데이트 (비어있을 때만)
      if (nameInput && !nameInput.value.trim()) {
        nameInput.value = result.appName;
      }

      // 3. input 이벤트 트리거 (미리보기 업데이트용)
      iconInput.dispatchEvent(new Event('input', { bubbles: true }));

      return true;
    }
    return false;
  }
  catch (err) {
    console.error('아이콘 추출 오류:', err);
    return false;
  }
}

/**
 * 로컬 아이콘 추출 지원 여부 확인
 * @returns {boolean} - 지원 여부
 */
function isLocalIconExtractionSupported() {
  return window.toast.platform === 'darwin' && typeof window.toast.extractAppIcon === 'function';
}

// ES6 모듈로 내보내기
export { updateButtonIconFromLocalApp, isLocalIconExtractionSupported };
