/**
 * Settings - General Settings Management
 */

import { globalHotkeyInput, recordHotkeyButton, clearHotkeyButton, launchAtLoginCheckbox } from './dom-elements.js';
import { config, isRecordingHotkey, setRecordingHotkey, markUnsavedChanges } from './state.js';

/**
 * Initialize General Settings tab
 */
export function initializeGeneralSettings() {
  window.settings.log.info('initializeGeneralSettings 호출');

  try {
    // 전역 단축키 설정
    if (globalHotkeyInput) {
      globalHotkeyInput.value = config.globalHotkey || '';
    }

    // 로그인 시 실행 설정
    if (launchAtLoginCheckbox) {
      launchAtLoginCheckbox.checked = config.advanced?.launchAtLogin || false;
    }

    window.settings.log.info('일반 설정 탭 초기화 완료');
  } catch (error) {
    window.settings.log.error('일반 설정 탭 초기화 중 오류 발생:', error);
  }
}

/**
 * Start recording hotkey
 */
export function startRecordingHotkey() {
  window.settings.log.info('단축키 녹화 시작');

  // 녹화 시작 전에 전역 단축키를 일시적으로 비활성화
  window.settings
    .temporarilyDisableShortcuts()
    .then(success => {
      window.settings.log.info('전역 단축키 일시 비활성화:', success ? '성공' : '실패');
    })
    .catch(error => {
      window.settings.log.error('전역 단축키 비활성화 중 오류:', error);
    });

  setRecordingHotkey(true);
  if (globalHotkeyInput) {
    globalHotkeyInput.value = 'Waiting for hotkey input...';
    globalHotkeyInput.classList.add('recording');
  }

  if (recordHotkeyButton) {
    recordHotkeyButton.disabled = true;
  }

  // 변경 사항 감지
  markUnsavedChanges();
}

/**
 * Clear the hotkey
 */
export function clearHotkey() {
  window.settings.log.info('단축키 초기화');

  // 녹화 취소 시 전역 단축키 복원
  window.settings
    .restoreShortcuts()
    .then(success => {
      window.settings.log.info('전역 단축키 복원:', success ? '성공' : '실패');
    })
    .catch(error => {
      window.settings.log.error('전역 단축키 복원 중 오류:', error);
    });

  if (globalHotkeyInput) {
    globalHotkeyInput.value = '';
    globalHotkeyInput.classList.remove('recording');
  }

  setRecordingHotkey(false);

  if (recordHotkeyButton) {
    recordHotkeyButton.disabled = false;
  }

  // 변경 사항 감지
  markUnsavedChanges();
}

/**
 * Handle hotkey recording
 */
export function handleHotkeyRecording(event) {
  if (!isRecordingHotkey) {
    return;
  }

  // 키 조합 처리
  if (event.key === 'Escape') {
    // ESC 키는 녹화 취소
    clearHotkey();
    return;
  }

  // 단축키 조합 생성
  const modifiers = [];
  if (event.ctrlKey) {
    modifiers.push('Ctrl');
  }
  if (event.shiftKey) {
    modifiers.push('Shift');
  }
  if (event.altKey) {
    modifiers.push('Alt');
  }
  if (event.metaKey) {
    modifiers.push('Meta');
  }

  // 일반 키 처리
  let key = event.key;

  // 모디파이어 키만 누른 경우 무시 - Alt, Shift, Control, Meta키 단독으로는 유효하지 않음
  if (key === 'Alt' || key === 'Shift' || key === 'Control' || key === 'Meta') {
    // 모디파이어 키만 누르면 녹화 상태 유지하고 리턴
    return;
  }

  // 키 코드 디버깅 로그
  window.settings.log.debug(`키 입력 감지 - key: "${key}", keyCode: ${event.keyCode}, code: ${event.code}`);

  // 특수 키 처리 (코드를 확인하는 방식으로 변경)
  if (event.code === 'Space') {
    key = 'Space';
    window.settings.log.debug('스페이스 키 감지 및 변환');
  } else if (key.length === 1) {
    key = key.toUpperCase();
  }

  // 특수 키 처리 (화살표 등)
  if (key === 'ArrowUp') {
    key = 'Up';
  }
  if (key === 'ArrowDown') {
    key = 'Down';
  }
  if (key === 'ArrowLeft') {
    key = 'Left';
  }
  if (key === 'ArrowRight') {
    key = 'Right';
  }
  if (key === 'Enter') {
    key = 'Return';
  }
  if (key === 'Tab') {
    key = 'Tab';
  }
  if (key === 'Backspace') {
    key = 'Backspace';
  }
  if (key === 'Delete') {
    key = 'Delete';
  }
  if (key === 'Home') {
    key = 'Home';
  }
  if (key === 'End') {
    key = 'End';
  }
  if (key === 'PageUp') {
    key = 'PageUp';
  }
  if (key === 'PageDown') {
    key = 'PageDown';
  }
  if (key === 'Escape') {
    key = 'Escape';
  }

  // 적어도 하나의 모디파이어와 하나의 일반 키가 필요함
  if (modifiers.length === 0) {
    window.settings.log.warn('유효하지 않은 핫키: 모디파이어 키가 필요합니다.');
    return;
  }

  // 단축키 텍스트 생성
  const hotkey = [...modifiers, key].join('+');

  // 유효한 핫키인지 검증
  if (hotkey.includes('Alt+Alt') || hotkey.includes('Shift+Shift') || hotkey.includes('Ctrl+Ctrl') || hotkey.includes('Meta+Meta')) {
    window.settings.log.warn('유효하지 않은 핫키 조합 감지:', hotkey);
    return;
  }

  // 입력 필드 업데이트
  if (globalHotkeyInput) {
    globalHotkeyInput.value = hotkey;
    globalHotkeyInput.classList.remove('recording');
  }

  setRecordingHotkey(false);
  if (recordHotkeyButton) {
    recordHotkeyButton.disabled = false;
  }

  // 이벤트 기본 동작 방지
  event.preventDefault();

  // 설정 즉시 저장
  window.settings
    .setConfig('globalHotkey', hotkey)
    .then(() => {
      window.settings.log.info('전역 단축키 설정 변경:', hotkey);

      // 핫키 녹화 직후 해당 핫키를 즉시 등록하여 테스트 가능하게 함
      return window.settings.restoreShortcuts();
    })
    .then(success => {
      window.settings.log.info('전역 단축키 복원:', success ? '성공' : '실패');
    })
    .catch(error => {
      window.settings.log.error('전역 단축키 설정 및 복원 중 오류:', error);
    });
}
