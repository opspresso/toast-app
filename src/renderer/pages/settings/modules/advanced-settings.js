/**
 * Settings - Advanced Settings Management
 */

import { hideAfterActionCheckbox, hideOnBlurCheckbox, hideOnEscapeCheckbox, showInTaskbarCheckbox, resetSettingsButton } from './dom-elements.js';
import { config, updateConfig } from './state.js';

/**
 * Initialize Advanced Settings tab
 */
export function initializeAdvancedSettings() {
  window.settings.log.info('initializeAdvancedSettings 호출');

  try {
    // 작업 후 숨기기 설정
    if (hideAfterActionCheckbox) {
      hideAfterActionCheckbox.checked = config.advanced?.hideAfterAction !== false;
    }

    // 포커스 잃을 때 숨기기 설정
    if (hideOnBlurCheckbox) {
      hideOnBlurCheckbox.checked = config.advanced?.hideOnBlur !== false;
    }

    // ESC 키로 숨기기 설정
    if (hideOnEscapeCheckbox) {
      hideOnEscapeCheckbox.checked = config.advanced?.hideOnEscape !== false;
    }

    // 작업 표시줄에 표시 설정
    if (showInTaskbarCheckbox) {
      showInTaskbarCheckbox.checked = config.advanced?.showInTaskbar || false;
    }

    window.settings.log.info('고급 설정 탭 초기화 완료');
  } catch (error) {
    window.settings.log.error('고급 설정 탭 초기화 중 오류 발생:', error);
  }
}

/**
 * Setup advanced settings event listeners
 */
export function setupAdvancedEventListeners() {
  // 고급 설정
  if (hideAfterActionCheckbox) {
    hideAfterActionCheckbox.addEventListener('change', () => {
      window.settings.log.info('작업 후 숨기기 설정 변경:', hideAfterActionCheckbox.checked);
      window.settings.setConfig('advanced.hideAfterAction', hideAfterActionCheckbox.checked);
    });
  }

  if (hideOnBlurCheckbox) {
    hideOnBlurCheckbox.addEventListener('change', () => {
      window.settings.log.info('포커스 잃을 때 숨기기 설정 변경:', hideOnBlurCheckbox.checked);
      window.settings.setConfig('advanced.hideOnBlur', hideOnBlurCheckbox.checked);
    });
  }

  if (hideOnEscapeCheckbox) {
    hideOnEscapeCheckbox.addEventListener('change', () => {
      window.settings.log.info('ESC 키로 숨기기 설정 변경:', hideOnEscapeCheckbox.checked);
      window.settings.setConfig('advanced.hideOnEscape', hideOnEscapeCheckbox.checked);
    });
  }

  if (showInTaskbarCheckbox) {
    showInTaskbarCheckbox.addEventListener('change', () => {
      window.settings.log.info('작업 표시줄에 표시 설정 변경:', showInTaskbarCheckbox.checked);
      window.settings.setConfig('advanced.showInTaskbar', showInTaskbarCheckbox.checked);
    });
  }

  if (resetSettingsButton) {
    resetSettingsButton.addEventListener('click', () => {
      if (confirm('Do you want to reset all settings to default values?')) {
        window.settings
          .resetToDefaults()
          .then(() =>
            // 설정 다시 로드
            window.settings.getConfig(),
          )
          .then(loadedConfig => {
            updateConfig(loadedConfig);
            // UI 초기화는 동적 import로 처리
            import('../index.js').then(({ initializeUI }) => {
              initializeUI();
            });
            alert('Settings have been reset.');
          })
          .catch(error => {
            window.settings.log.error('설정 초기화 오류:', error);
            alert('An error occurred while resetting settings.');
          });
      }
    });
  }
}
