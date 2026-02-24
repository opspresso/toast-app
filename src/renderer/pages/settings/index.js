/**
 * Toast - Settings Window JavaScript (Modularized)
 *
 * This script handles the functionality of the Settings window.
 */

import { updateConfig, config } from './modules/state.js';
import { applyTheme } from './modules/utils.js';
import { switchTab } from './modules/tabs.js';
import { setupEventListeners } from './modules/event-handlers.js';
import { initializeGeneralSettings } from './modules/general-settings.js';
import { initializeAppearanceSettings } from './modules/appearance-settings.js';
import { initializeAccountSettings } from './modules/account-settings.js';
import { initializeAdvancedSettings } from './modules/advanced-settings.js';
import { initializeCloudSyncUI } from './modules/cloud-sync-settings.js';
import { initializeAboutSettings } from './modules/about-settings.js';

/**
 * Initialize UI with config values - 필수적인 작업만 수행
 */
export function initializeUI() {
  window.settings.log.info('initializeUI 호출 - 모든 필수 설정 초기화');

  // 전체 초기화 전 분석 - 진행상황 로깅
  window.settings.log.info('작업 분석: 모든 탭 초기화 수행 (최적화된 방식)');

  // 필수 사항: 반드시 모든 설정을 초기화해야 함

  // General settings - 필수 설정
  window.settings.log.info('일반 설정 초기화');
  initializeGeneralSettings();

  // Appearance settings - 필수 설정 (테마 등)
  window.settings.log.info('모양 설정 초기화');
  initializeAppearanceSettings();

  // Advanced settings - 필수 설정
  window.settings.log.info('고급 설정 초기화');
  initializeAdvancedSettings();

  // Account settings
  window.settings.log.info('계정 설정 초기화');
  initializeAccountSettings();

  // Cloud Sync settings
  window.settings.log.info('클라우드 동기화 설정 초기화');
  initializeCloudSyncUI();

  // About settings
  window.settings.log.info('정보 탭 초기화');
  initializeAboutSettings();

  // 모든 탭 콘텐츠 초기화 완료
  window.settings.log.info('모든 탭 콘텐츠가 초기화되었습니다.');
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  window.settings.log.info('DOMContentLoaded 이벤트 발생 - 초기화 시작');

  // Load configuration from main process
  window.settings
    .getConfig()
    .then(loadedConfig => {
      try {
        // 설정 초기화
        window.settings.log.info('설정 로드 완료');
        updateConfig(loadedConfig);

        // 테마 적용 (가장 우선순위로 처리)
        window.settings.log.info('테마 적용 중...');
        applyTheme(config.appearance?.theme || 'system');

        // 이벤트 리스너 설정 - UI 초기화 전에 처리
        window.settings.log.info('이벤트 리스너 설정 중...');
        setupEventListeners();

        // 전체 UI 초기화 (모든 필요한 설정 한 번에 처리)
        window.settings.log.info('전체 UI 초기화 중...');
        initializeUI();

        // 첫 번째 탭 선택 (반드시 UI 초기화 후)
        window.settings.log.info('첫 번째 탭 선택 중...');
        const firstTabLink = document.querySelector('.settings-nav li');
        if (firstTabLink) {
          const firstTabId = firstTabLink.getAttribute('data-tab');
          window.settings.log.info(`기본 탭 선택: ${firstTabId}`);
          switchTab(firstTabId);
        }

        window.settings.log.info('초기화 완료');
      }
      catch (error) {
        window.settings.log.error('초기화 오류:', error);
      }
    })
    .catch(error => {
      window.settings.log.error('설정 로드 오류:', error);
    });

  // Config update listener - 필요한 설정만 업데이트하도록 최적화
  window.addEventListener('config-loaded', event => {
    window.settings.log.info('config-loaded 이벤트 수신 - 최적화된 업데이트 사용');
    const newConfig = event.detail;

    // 이전 설정과 새 설정을 비교해 필요한 요소만 업데이트
    if (newConfig) {
      // 설정 객체 업데이트
      updateConfig(newConfig);

      // 현재 활성화된 탭만 업데이트 (전체 UI 초기화 방지)
      const activeTab = Array.from(document.querySelectorAll('.settings-tab')).find(tab => tab.classList.contains('active'));
      if (activeTab) {
        const tabId = activeTab.id;
        window.settings.log.info(`현재 활성 탭 "${tabId}"만 선택적으로 업데이트`);

        // 선택적으로 필요한 설정만 업데이트
        if (tabId === 'general') {
          const globalHotkeyInput = document.getElementById('global-hotkey');
          const launchAtLoginCheckbox = document.getElementById('launch-at-login');

          if (globalHotkeyInput) {
            globalHotkeyInput.value = config.globalHotkey || '';
          }
          if (launchAtLoginCheckbox) {
            launchAtLoginCheckbox.checked = config.advanced?.launchAtLogin || false;
          }
        }
        else if (tabId === 'appearance') {
          const themeSelect = document.getElementById('theme');
          const positionSelect = document.getElementById('position');
          const sizeSelect = document.getElementById('size');
          const opacityRange = document.getElementById('opacity');
          const opacityValue = document.getElementById('opacity-value');

          if (themeSelect) {
            themeSelect.value = config.appearance?.theme || 'system';
          }
          if (positionSelect) {
            positionSelect.value = config.appearance?.position || 'center';
          }
          if (sizeSelect) {
            sizeSelect.value = config.appearance?.size || 'medium';
          }
          if (opacityRange) {
            opacityRange.value = config.appearance?.opacity || 0.95;
            if (opacityValue) {
              opacityValue.textContent = opacityRange.value;
            }
          }
        }
        else if (tabId === 'advanced') {
          const hideAfterActionCheckbox = document.getElementById('hide-after-action');
          const hideOnBlurCheckbox = document.getElementById('hide-on-blur');
          const hideOnEscapeCheckbox = document.getElementById('hide-on-escape');
          const showInTaskbarCheckbox = document.getElementById('show-in-taskbar');

          if (hideAfterActionCheckbox) {
            hideAfterActionCheckbox.checked = config.advanced?.hideAfterAction !== false;
          }
          if (hideOnBlurCheckbox) {
            hideOnBlurCheckbox.checked = config.advanced?.hideOnBlur !== false;
          }
          if (hideOnEscapeCheckbox) {
            hideOnEscapeCheckbox.checked = config.advanced?.hideOnEscape !== false;
          }
          if (showInTaskbarCheckbox) {
            showInTaskbarCheckbox.checked = config.advanced?.showInTaskbar || false;
          }
        }
      }
    }
  });
});
