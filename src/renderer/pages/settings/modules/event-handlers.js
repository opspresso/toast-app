/**
 * Settings - Event Handlers Management
 */

import { cancelButton, launchAtLoginCheckbox } from './dom-elements.js';
import { isRecordingHotkey, unsavedChanges, config, updateConfig } from './state.js';
import { switchTab } from './tabs.js';
import { startRecordingHotkey, clearHotkey, handleHotkeyRecording } from './general-settings.js';
import { setupAppearanceEventListeners } from './appearance-settings.js';
import { setupAdvancedEventListeners } from './advanced-settings.js';
import { setupAccountEventListeners } from './account-settings.js';
import { setupCloudSyncEventListeners } from './cloud-sync-settings.js';
import { setupAboutEventListeners } from './about-settings.js';

/**
 * Sets up all event listeners for UI controls, keyboard shortcuts, authentication events, configuration updates, and modal interactions in the Settings window.
 */
export function setupEventListeners() {
  window.settings.log.info('이벤트 리스너 설정 중...');

  // 이벤트 핸들러 등록 상태 관리를 위한 전역 변수
  let eventListenersInitialized = false;

  // 마지막 이벤트 처리 시간 추적을 위한 변수들
  let lastTabClickTime = 0;
  let lastEscKeyTime = 0;

  // 이벤트 디바운싱을 위한 타이머 변수
  let tabClickTimer = null;
  let escKeyTimer = null;

  // 모든 이벤트 리스너를 관리하는 함수
  function registerAllEventListeners() {
    // 이미 초기화되었다면 중복 등록 방지
    if (eventListenersInitialized) {
      window.settings.log.info('이벤트 리스너가 이미 초기화되어 있어 중복 등록을 건너뜁니다.');
      return;
    }

    window.settings.log.info('모든 이벤트 리스너 등록 시작...');

    // 탭 클릭 이벤트 처리를 위한 이벤트 위임 패턴 사용
    // 각 탭 요소에 직접 이벤트를 추가하는 대신 부모 요소인 .settings-nav에 이벤트를 추가
    const settingsNav = document.querySelector('.settings-nav');
    if (settingsNav) {
      // 이전 이벤트 리스너를 모두 제거하기 위해 새 요소로 복제
      const newNav = settingsNav.cloneNode(true);
      if (settingsNav.parentNode) {
        settingsNav.parentNode.replaceChild(newNav, settingsNav);
      }

      // 이벤트 위임 방식으로 이벤트 리스너 등록
      newNav.addEventListener(
        'click',
        function (event) {
          // li 요소 또는 li의 자식 요소를 클릭했는지 확인
          let targetLi = event.target;
          while (targetLi && targetLi !== newNav) {
            if (targetLi.tagName === 'LI') {
              break;
            }
            targetLi = targetLi.parentNode;
          }

          // 클릭한 요소가 li가 아니면 무시
          if (!targetLi || targetLi === newNav) {
            return;
          }

          // 이벤트 전파 완전 차단
          event.preventDefault();
          event.stopImmediatePropagation();

          // 현재 시간 기록
          const now = Date.now();
          const tabId = targetLi.getAttribute('data-tab');

          // 이미 처리 중인 디바운스 타이머가 있다면 취소
          if (tabClickTimer) {
            clearTimeout(tabClickTimer);
          }

          // 연속 클릭 방지 (300ms 이내 같은 탭)
          if (now - lastTabClickTime < 300) {
            window.settings.log.info(`빠른 연속 클릭 감지됨 (${tabId}), 무시합니다.`);
            return;
          }

          // 시간 업데이트
          lastTabClickTime = now;

          // 디바운싱 처리 (10ms 내에 처리가 집중되면 하나로 병합)
          tabClickTimer = setTimeout(() => {
            window.settings.log.info(`탭 클릭 감지: ${tabId}`);
            switchTab(tabId);
            tabClickTimer = null;
          }, 10);
        },
        true,
      );
    }

    // ESC 키 이벤트 핸들러 (전역 핸들러)
    function handleEscKey(event) {
      if (event.key !== 'Escape' || isRecordingHotkey) {
        return;
      }

      // 이벤트 전파 차단
      event.stopImmediatePropagation();

      // 현재 시간 기록
      const now = Date.now();

      // 연속 키 입력 방지 (300ms 이내)
      if (now - lastEscKeyTime < 300) {
        window.settings.log.info('빠른 연속 ESC 키 감지, 무시합니다.');
        return;
      }

      // 시간 업데이트
      lastEscKeyTime = now;

      // 이미 처리 중인 디바운스 타이머가 있다면 취소
      if (escKeyTimer) {
        clearTimeout(escKeyTimer);
      }

      // 디바운싱 처리
      escKeyTimer = setTimeout(() => {
        window.settings.log.info('ESC 키 감지 - 창 닫기 시도');

        if (unsavedChanges) {
          if (confirm('You have unsaved changes. Do you want to close without saving?')) {
            window.settings.closeWindow();
          }
        } else {
          window.settings.closeWindow();
        }

        escKeyTimer = null;
      }, 10);
    }

    // 기존 이벤트 리스너 제거 후 새로 등록
    document.removeEventListener('keydown', handleHotkeyRecording);
    document.removeEventListener('keydown', handleEscKey);

    // 키보드 이벤트 리스너 등록
    document.addEventListener('keydown', handleEscKey, { capture: true });
    document.addEventListener('keydown', handleHotkeyRecording);

    // 이벤트 초기화 완료 표시
    eventListenersInitialized = true;
    window.settings.log.info('모든 이벤트 리스너가 성공적으로 등록되었습니다.');
  }

  // 이벤트 리스너 등록 실행
  registerAllEventListeners();

  // 일반 설정 이벤트 리스너
  const recordHotkeyButton = document.getElementById('record-hotkey');
  const clearHotkeyButton = document.getElementById('clear-hotkey');

  if (recordHotkeyButton) {
    recordHotkeyButton.addEventListener('click', startRecordingHotkey);
  }

  if (clearHotkeyButton) {
    clearHotkeyButton.addEventListener('click', clearHotkey);
  }

  // 설정 변경 즉시 저장을 위한 이벤트 리스너
  // 일반 설정
  if (launchAtLoginCheckbox) {
    launchAtLoginCheckbox.addEventListener('change', () => {
      window.settings.log.info('로그인 시 실행 설정 변경:', launchAtLoginCheckbox.checked);
      window.settings.setConfig('advanced.launchAtLogin', launchAtLoginCheckbox.checked);
    });
  }

  // 각 모듈별 이벤트 리스너 설정
  setupAppearanceEventListeners();
  setupAdvancedEventListeners();
  setupAccountEventListeners();
  setupCloudSyncEventListeners();
  setupAboutEventListeners();

  // 닫기 버튼
  if (cancelButton) {
    cancelButton.addEventListener('click', () => {
      window.settings.closeWindow();
    });
  }

  // Hotkey 녹화 이벤트 리스너는 이미 위에서 등록됨
  document.addEventListener('keydown', handleHotkeyRecording);

  window.settings.log.info('이벤트 리스너 설정 완료');
}

/**
 * Confirm cancel changes
 */
export function confirmCancel() {
  window.settings.log.info('설정 취소');

  if (unsavedChanges) {
    if (confirm('You have unsaved changes. Do you want to close without saving?')) {
      window.settings.closeWindow();
    }
  } else {
    window.settings.closeWindow();
  }
}

/**
 * Save settings
 */
export function saveSettings() {
  window.settings.log.info('설정 저장 시작');

  try {
    const globalHotkeyInput = document.getElementById('global-hotkey');
    const themeSelect = document.getElementById('theme');
    const positionSelect = document.getElementById('position');
    const sizeSelect = document.getElementById('size');
    const opacityRange = document.getElementById('opacity');
    const hideAfterActionCheckbox = document.getElementById('hide-after-action');
    const hideOnBlurCheckbox = document.getElementById('hide-on-blur');
    const hideOnEscapeCheckbox = document.getElementById('hide-on-escape');
    const showInTaskbarCheckbox = document.getElementById('show-in-taskbar');

    // 설정 객체 생성
    const settings = {
      globalHotkey: globalHotkeyInput ? globalHotkeyInput.value : '',
      appearance: {
        theme: themeSelect ? themeSelect.value : 'system',
        position: positionSelect ? positionSelect.value : 'center',
        size: sizeSelect ? sizeSelect.value : 'medium',
        opacity: opacityRange ? parseFloat(opacityRange.value) : 0.95,
      },
      advanced: {
        launchAtLogin: launchAtLoginCheckbox ? launchAtLoginCheckbox.checked : false,
        hideAfterAction: hideAfterActionCheckbox ? hideAfterActionCheckbox.checked : true,
        hideOnBlur: hideOnBlurCheckbox ? hideOnBlurCheckbox.checked : true,
        hideOnEscape: hideOnEscapeCheckbox ? hideOnEscapeCheckbox.checked : true,
        showInTaskbar: showInTaskbarCheckbox ? showInTaskbarCheckbox.checked : false,
      },
    };

    // 설정 저장
    window.settings.setConfig('globalHotkey', settings.globalHotkey);
    window.settings.setConfig('appearance', settings.appearance);
    window.settings.setConfig('advanced', settings.advanced);

    // 변경 사항 플래그 초기화
    import('./state.js').then(({ clearUnsavedChanges }) => {
      clearUnsavedChanges();
    });

    window.settings.log.info('설정 저장 완료');
  } catch (error) {
    window.settings.log.error('설정 저장 중 오류:', error);
  }
}
