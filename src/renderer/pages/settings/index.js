/**
 * Toast - Settings Window JavaScript (Modularized)
 *
 * This script handles the functionality of the Settings window.
 */

import { updateConfig, config } from './modules/state.js';
import { applyTheme, applyAccentColor } from './modules/utils.js';
import { switchTab } from './modules/tabs.js';
import { setupEventListeners } from './modules/event-handlers.js';
import { initializeGeneralSettings } from './modules/general-settings.js';
import { initializeAppearanceSettings } from './modules/appearance-settings.js';
import { initializeAccountSettings } from './modules/account-settings.js';
import { initializeAdvancedSettings } from './modules/advanced-settings.js';
import { initializeCloudSyncUI } from './modules/cloud-sync-settings.js';
import { initializeAboutSettings } from './modules/about-settings.js';
import { initializeSnippetsSettings } from './modules/snippets-settings.js';

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

  // Snippets settings
  window.settings.log.info('스니펫 설정 초기화');
  initializeSnippetsSettings();

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
        applyAccentColor(config.appearance?.accentColor);

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

  // Tab selection listener - 메인 프로세스에서 특정 탭 선택 요청 시 (예: 트레이 About 메뉴)
  window.addEventListener('select-settings-tab', event => {
    const tabName = event.detail;
    window.settings.log.info(`select-settings-tab 이벤트 수신 - 탭 전환: ${tabName}`);
    if (tabName) {
      switchTab(tabName);
    }
  });

  // Config update listener - 필요한 설정만 업데이트하도록 최적화
  window.addEventListener('config-loaded', event => {
    window.settings.log.info('config-loaded 이벤트 수신 - 최적화된 업데이트 사용');
    applyConfigUpdate(event.detail);
  });

  // 백그라운드 클라우드 동기화 병합 등으로 메인 프로세스가 config-updated를
  // 브로드캐스트할 때도 동일하게 반영 (그렇지 않으면 이 창은 계속 예전 config를
  // 들고 있다가, 다음 저장 시 병합된 변경사항을 덮어써 버린다)
  window.addEventListener('config-updated', event => {
    window.settings.log.info('config-updated 이벤트 수신 - 백그라운드 변경 반영');
    applyConfigUpdate(event.detail);
  });
});

/**
 * 새 config 페이로드를 이미 초기화된 탭에 반영 (전체 UI 재초기화 없이)
 * @param {Object} newConfig - 갱신된 설정 객체
 */
function applyConfigUpdate(newConfig) {
  // 이전 설정과 새 설정을 비교해 필요한 요소만 업데이트
  if (!newConfig) {
    return;
  }

  try {
    // 일부 config-updated 브로드캐스트(수동 동기화, 로그인 후 동기화 등)는 snippets를
    // 포함하지 않는 부분 스냅샷을 보낸다. 완전 치환 대신 병합해 누락된 필드가 기존 값을
    // 지워버리지 않게 한다.
    updateConfig({ ...config, ...newConfig });

    // 스니펫은 탭 초기화 시점에 로컬 상태로 스냅샷되므로, 백그라운드 동기화로
    // 병합된 변경사항을 여기서 반영하지 않으면 다음 편집 시 그대로 덮어써진다.
    initializeSnippetsSettings();

    // 현재 활성화된 탭만 업데이트 (전체 UI 초기화 방지)
    const activeTab = Array.from(document.querySelectorAll('.settings-tab')).find(tab => tab.classList.contains('active'));
    if (activeTab) {
      const tabId = activeTab.id;
      window.settings.log.info(`현재 활성 탭 "${tabId}"만 선택적으로 업데이트`);

      // 선택적으로 필요한 설정만 업데이트 (통합 Settings 탭 = General/Appearance/Advanced 섹션)
      if (tabId === 'settings') {
        const globalHotkeyInput = document.getElementById('global-hotkey');
        const launchAtLoginCheckbox = document.getElementById('launch-at-login');

        if (globalHotkeyInput) {
          globalHotkeyInput.value = config.globalHotkey || '';
        }
        if (launchAtLoginCheckbox) {
          launchAtLoginCheckbox.checked = config.advanced?.launchAtLogin || false;
        }

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
  catch (error) {
    window.settings.log.error('applyConfigUpdate 오류:', error);
  }
}
