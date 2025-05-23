/**
 * Toast - Settings Window JavaScript
 *
 * This script handles the functionality of the Settings window.
 */

// DOM Elements - Tabs
const tabLinks = document.querySelectorAll('.settings-nav li');
const tabContents = document.querySelectorAll('.settings-tab');

// DOM Elements - General Settings
const globalHotkeyInput = document.getElementById('global-hotkey');
const recordHotkeyButton = document.getElementById('record-hotkey');
const clearHotkeyButton = document.getElementById('clear-hotkey');
const launchAtLoginCheckbox = document.getElementById('launch-at-login');

// DOM Elements - Appearance Settings
const themeSelect = document.getElementById('theme');
const positionSelect = document.getElementById('position');
const sizeSelect = document.getElementById('size');
const opacityRange = document.getElementById('opacity');
const opacityValue = document.getElementById('opacity-value');

// DOM Elements - Account & Subscription
const loginSection = document.getElementById('login-section');
const profileSection = document.getElementById('profile-section');
const subscriptionSection = document.getElementById('subscription-section');
const loginButton = document.getElementById('login-button');
const logoutButton = document.getElementById('logout-button');
const userAvatar = document.getElementById('user-avatar');
const userName = document.getElementById('user-name');
const userEmail = document.getElementById('user-email');
const subscriptionBadge = document.getElementById('subscription-badge');
const subscriptionStatus = document.getElementById('subscription-status');
const subscriptionExpiry = document.getElementById('subscription-expiry');
const subscriptionFeatures = document.getElementById('subscription-features');
const manageSubscriptionButton = document.getElementById('manage-subscription');
const refreshSubscriptionButton = document.getElementById('refresh-subscription');
const authLoading = document.getElementById('auth-loading');
const subscriptionLoading = document.getElementById('subscription-loading');

// DOM Elements - Advanced Settings
const hideAfterActionCheckbox = document.getElementById('hide-after-action');
const hideOnBlurCheckbox = document.getElementById('hide-on-blur');
const hideOnEscapeCheckbox = document.getElementById('hide-on-escape');
const showInTaskbarCheckbox = document.getElementById('show-in-taskbar');
const resetSettingsButton = document.getElementById('reset-settings');

// DOM Elements - Cloud Sync
const syncStatusBadge = document.getElementById('sync-status-badge');
const syncStatusText = document.getElementById('sync-status-text');
const lastSyncedTime = document.getElementById('last-synced-time');
const syncDeviceInfo = document.getElementById('sync-device-info');
const enableCloudSyncCheckbox = document.getElementById('enable-cloud-sync');
const manualSyncUploadButton = document.getElementById('manual-sync-upload');
const manualSyncDownloadButton = document.getElementById('manual-sync-download');
const manualSyncResolveButton = document.getElementById('manual-sync-resolve');
const syncLoading = document.getElementById('sync-loading');

// DOM Elements - About Tab
const appVersionElement = document.getElementById('app-version');
const homepageButton = document.getElementById('homepage-link');
const checkUpdatesButton = document.getElementById('check-updates');
const updateMessage = document.getElementById('update-message');
const updateStatus = document.getElementById('update-status');
const updateActions = document.getElementById('update-actions');
const alternativeUpdates = document.getElementById('alternative-updates');
const copyBrewCommand = document.getElementById('copy-brew-command');
const githubReleaseLink = document.getElementById('github-release-link');
const downloadUpdateButton = document.getElementById('download-update');
const installUpdateButton = document.getElementById('install-update');
const updateLoading = document.getElementById('update-loading');

// DOM Elements - Main Buttons
const cancelButton = document.getElementById('cancel-button');

// State
let config = {};
let isRecordingHotkey = false;
let unsavedChanges = false;
let authState = {
  isLoggedIn: false,
  profile: null,
  subscription: null,
};

// 탭 초기화 상태 추적을 위한 객체
const tabInitState = {
  general: false,
  appearance: false,
  account: false,
  advanced: false,
  'cloud-sync': false,
  about: false
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  window.settings.log.info('DOMContentLoaded 이벤트 발생 - 초기화 시작');

  // Load configuration from main process
  window.settings.getConfig().then(loadedConfig => {
    try {
      // 설정 초기화
      window.settings.log.info('설정 로드 완료');
      config = loadedConfig;

      // 테마 적용 (가장 우선순위로 처리)
      window.settings.log.info('테마 적용 중...');
      applyTheme(config.appearance?.theme || 'system');

      // 이벤트 리스너 설정 - UI 초기화 전에 처리
      window.settings.log.info('이벤트 리스너 설정 중...');
      setupEventListeners();

      // 전체 UI 초기화 (모든 필요한 설정 한 번에 처리)
      window.settings.log.info('전체 UI 초기화 중...');
      initializeUI();

      // 인증 상태 초기화
      window.settings.log.info('인증 상태 초기화 중...');
      initializeAuthState();

      // 첫 번째 탭 선택 (반드시 UI 초기화 후)
      window.settings.log.info('첫 번째 탭 선택 중...');
      const firstTabLink = document.querySelector('.settings-nav li');
      if (firstTabLink) {
        const firstTabId = firstTabLink.getAttribute('data-tab');
        window.settings.log.info(`기본 탭 선택: ${firstTabId}`);
        switchTab(firstTabId);
      }

      window.settings.log.info('초기화 완료');
    } catch (error) {
      window.settings.log.error('초기화 오류:', error);
    }
  }).catch(error => {
    window.settings.log.error('설정 로드 오류:', error);
  });

  // Config update listener - 필요한 설정만 업데이트하도록 최적화
  window.addEventListener('config-loaded', event => {
    window.settings.log.info('config-loaded 이벤트 수신 - 최적화된 업데이트 사용');
    const newConfig = event.detail;

    // 이전 설정과 새 설정을 비교해 필요한 요소만 업데이트
    if (newConfig) {
      // 설정 객체 업데이트
      config = newConfig;

      // 현재 활성화된 탭만 업데이트 (전체 UI 초기화 방지)
      const activeTab = Array.from(tabContents).find(tab => tab.classList.contains('active'));
      if (activeTab) {
        const tabId = activeTab.id;
        window.settings.log.info(`현재 활성 탭 "${tabId}"만 선택적으로 업데이트`);

        // 선택적으로 필요한 설정만 업데이트
        if (tabId === 'general') {
          globalHotkeyInput.value = config.globalHotkey || '';
          launchAtLoginCheckbox.checked = config.advanced?.launchAtLogin || false;
        } else if (tabId === 'appearance') {
          themeSelect.value = config.appearance?.theme || 'system';
          positionSelect.value = config.appearance?.position || 'center';
          sizeSelect.value = config.appearance?.size || 'medium';
          opacityRange.value = config.appearance?.opacity || 0.95;
          opacityValue.textContent = opacityRange.value;
        } else if (tabId === 'advanced') {
          hideAfterActionCheckbox.checked = config.advanced?.hideAfterAction !== false;
          hideOnBlurCheckbox.checked = config.advanced?.hideOnBlur !== false;
          hideOnEscapeCheckbox.checked = config.advanced?.hideOnEscape !== false;
          showInTaskbarCheckbox.checked = config.advanced?.showInTaskbar || false;
        }
      }
    }
  });
});

/**
 * Set up event listeners
 */
function setupEventListeners() {
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
      newNav.addEventListener('click', function (event) {
        // li 요소 또는 li의 자식 요소를 클릭했는지 확인
        let targetLi = event.target;
        while (targetLi && targetLi !== newNav) {
          if (targetLi.tagName === 'LI') {
            break;
          }
          targetLi = targetLi.parentNode;
        }

        // 클릭한 요소가 li가 아니면 무시
        if (!targetLi || targetLi === newNav) return;

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
      }, true);
    }

    // ESC 키 이벤트 핸들러 (전역 핸들러)
    function handleEscKey(event) {
      if (event.key !== 'Escape' || isRecordingHotkey) return;

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

  // 모양 설정
  if (themeSelect) {
    themeSelect.addEventListener('change', () => {
      window.settings.log.info('테마 설정 변경:', themeSelect.value);
      window.settings.setConfig('appearance.theme', themeSelect.value);
      applyTheme(themeSelect.value);
    });
  }

  if (positionSelect) {
    positionSelect.addEventListener('change', () => {
      window.settings.log.info('창 위치 설정 변경:', positionSelect.value);
      window.settings.setConfig('appearance.position', positionSelect.value);
    });
  }

  if (sizeSelect) {
    sizeSelect.addEventListener('change', () => {
      window.settings.log.info('창 크기 설정 변경:', sizeSelect.value);
      window.settings.setConfig('appearance.size', sizeSelect.value);
    });
  }

  if (opacityRange) {
    opacityRange.addEventListener('input', () => {
      // 슬라이더 이동 중에 값 표시 업데이트
      if (opacityValue) {
        opacityValue.textContent = opacityRange.value;
      }
    });

    opacityRange.addEventListener('change', () => {
      // 슬라이더 변경 완료 시 설정 저장
      window.settings.log.info('창 투명도 설정 변경:', opacityRange.value);
      window.settings.setConfig('appearance.opacity', parseFloat(opacityRange.value));
    });
  }

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
        window.settings.resetToDefaults().then(() => {
          // 설정 다시 로드
          return window.settings.getConfig();
        }).then(loadedConfig => {
          config = loadedConfig;
          initializeUI();
          alert('Settings have been reset.');
        }).catch(error => {
          window.settings.log.error('설정 초기화 오류:', error);
          alert('An error occurred while resetting settings.');
        });
      }
    });
  }

  // 대체 업데이트 방법 관련 버튼
  if (copyBrewCommand) {
    copyBrewCommand.addEventListener('click', () => {
      const command = 'brew upgrade opspresso/tap/toast';
      navigator.clipboard.writeText(command)
        .then(() => {
          copyBrewCommand.textContent = 'Copied!';
          setTimeout(() => {
            copyBrewCommand.textContent = 'Copy';
          }, 2000);
        })
        .catch(err => {
          window.settings.log.error('클립보드 복사 오류:', err);
          alert('Error occurred while copying the command.');
        });
    });
  }

  // 닫기 버튼
  if (cancelButton) {
    cancelButton.addEventListener('click', () => {
      window.settings.closeWindow();
    });
  }

  // 계정 관련 버튼
  if (loginButton) {
    loginButton.addEventListener('click', handleLogin);
  }

  if (logoutButton) {
    logoutButton.addEventListener('click', handleLogout);
  }

  if (manageSubscriptionButton) {
    manageSubscriptionButton.addEventListener('click', handleManageSubscription);
  }

  if (refreshSubscriptionButton) {
    refreshSubscriptionButton.addEventListener('click', handleRefreshSubscription);
  }

  // Cloud Sync 관련 버튼
  if (enableCloudSyncCheckbox) {
    enableCloudSyncCheckbox.addEventListener('change', handleCloudSyncToggle);
  }

  if (manualSyncUploadButton) {
    manualSyncUploadButton.addEventListener('click', handleManualSyncUpload);
  }

  if (manualSyncDownloadButton) {
    manualSyncDownloadButton.addEventListener('click', handleManualSyncDownload);
  }

  if (manualSyncResolveButton) {
    manualSyncResolveButton.addEventListener('click', handleManualSyncResolve);
  }

  // ESC 키 이벤트 리스너는 registerAllEventListeners 함수에서 설정하므로 여기서는 제거합니다

  // Hotkey 녹화 이벤트 리스너
  document.addEventListener('keydown', handleHotkeyRecording);

  // 구독 정보와 관련된 이벤트
  window.addEventListener('login-success', event => {
    window.settings.log.info('Login success event received in settings window');
    // Load user data and update UI when login is successful
    loadUserDataAndUpdateUI();
  });

  // About 탭 관련 버튼
  if (homepageButton) {
    homepageButton.addEventListener('click', () => {
      window.settings.openUrl('https://toast.sh');
    });
  }

  if (checkUpdatesButton) {
    checkUpdatesButton.addEventListener('click', handleCheckForUpdates);
  }

  if (downloadUpdateButton) {
    downloadUpdateButton.addEventListener('click', handleDownloadUpdate);
  }

  if (installUpdateButton) {
    installUpdateButton.addEventListener('click', handleInstallUpdate);
  }

  window.settings.log.info('이벤트 리스너 설정 완료');
}

/**
 * Switch between tabs
 * @param {string} tabId - ID of the tab to switch to
 */
function switchTab(tabId) {
  window.settings.log.info(`탭 전환 시작: ${tabId}`);

  try {
    // DOM 조작을 최소화하기 위해 직접 attribute 선택자로 요소 선택
    const allTabLinks = document.querySelectorAll('.settings-nav li');
    window.settings.log.info(`발견된 탭 링크 수: ${allTabLinks.length}`);

    // 명확한 로깅을 위해 처음 상태 기록
    for (const link of allTabLinks) {
      const tabID = link.getAttribute('data-tab');
      const isActive = link.classList.contains('active');
      window.settings.log.info(`탭 [${tabID}] 초기 상태: ${isActive ? '활성' : '비활성'}`);
    }

    // 먼저 모든 탭에서 active 클래스 제거 - 기본 DOM API 사용
    for (let i = 0; i < allTabLinks.length; i++) {
      allTabLinks[i].className = allTabLinks[i].className.replace(/\bactive\b/g, '').trim();
    }

    // 해당하는 탭에 active 클래스 추가 - 직접 속성 설정
    for (let i = 0; i < allTabLinks.length; i++) {
      const link = allTabLinks[i];
      const linkTabId = link.getAttribute('data-tab');

      if (linkTabId === tabId) {
        // active 클래스가 없을 경우에만 추가
        if (!link.className.includes('active')) {
          link.className = link.className ? link.className + ' active' : 'active';
          window.settings.log.info(`탭 링크 [${tabId}] 활성화됨 - 클래스: ${link.className}`);
        }
      }
    }

    // 모든 컨텐츠 영역 비활성화 및 선택한 영역만 활성화
    const contentTabs = document.querySelectorAll('.settings-tab');
    for (const tab of contentTabs) {
      if (tab.id === tabId) {
        tab.classList.add('active');
      } else {
        tab.classList.remove('active');
      }
    }

    // 탭 내용 초기화 (필요한 경우에만)
    if (tabId && !tabInitState[tabId]) {
      window.settings.log.info(`탭 컨텐츠 초기화 필요: ${tabId}`);
      initializeTabContent(tabId);
    }

    // DOM 갱신 후 최종 검증
    setTimeout(() => {
      // 최종 상태 확인
      const finalLinks = document.querySelectorAll('.settings-nav li');
      window.settings.log.info('탭 전환 후 최종 상태:');
      for (const link of finalLinks) {
        const linkId = link.getAttribute('data-tab');
        const hasActiveClass = link.classList.contains('active');
        window.settings.log.info(`  탭 [${linkId}]: ${hasActiveClass ? '활성' : '비활성'} (클래스: ${link.className})`);
      }

      // 선택된 탭 컨텐츠 확인
      const activeContent = document.querySelector('.settings-tab.active');
      if (activeContent) {
        window.settings.log.info(`활성 컨텐츠: [${activeContent.id}]`);
      } else {
        window.settings.log.error('활성화된 컨텐츠 탭이 없습니다.');
      }
    }, 10);
  } catch (error) {
    window.settings.log.error(`탭 전환 중 오류 발생: ${error.message}`, error);
  }
}

/**
 * 선택한 탭의 콘텐츠만 초기화하는 함수
 * @param {string} tabId - 초기화할 탭 ID
 */
function initializeTabContent(tabId) {
  window.settings.log.info(`initializeTabContent 호출 - 탭 ID: ${tabId}`);

  // 이미 초기화된 탭이면 다시 초기화하지 않음
  if (tabInitState[tabId]) {
    window.settings.log.info(`${tabId} 탭은 이미 초기화되어 있습니다.`);
    return;
  }

  // 각 탭에 맞는 초기화 함수 호출
  switch (tabId) {
    case 'general':
      initializeGeneralSettings();
      break;
    case 'appearance':
      initializeAppearanceSettings();
      break;
    case 'account':
      initializeAccountSettings();
      break;
    case 'advanced':
      initializeAdvancedSettings();
      break;
    case 'cloud-sync':
      initializeCloudSyncUI();
      break;
    case 'about':
      initializeAboutSettings();
      break;
  }

  // 초기화 상태 업데이트
  tabInitState[tabId] = true;
  window.settings.log.info(`탭 초기화 상태 업데이트: ${tabId} = 초기화됨`);
}

/**
 * Initialize UI with config values - 필수적인 작업만 수행
 */
function initializeUI() {
  window.settings.log.info('initializeUI 호출 - 모든 필수 설정 초기화');

  // 전체 초기화 전 분석 - 진행상황 로깅
  window.settings.log.info('작업 분석: 모든 탭 초기화 수행 (최적화된 방식)');

  // 필수 사항: 반드시 모든 설정을 초기화해야 함

  // General settings - 필수 설정
  window.settings.log.info('일반 설정 초기화');
  globalHotkeyInput.value = config.globalHotkey || '';
  launchAtLoginCheckbox.checked = config.advanced?.launchAtLogin || false;

  // Appearance settings - 필수 설정 (테마 등)
  window.settings.log.info('모양 설정 초기화');
  themeSelect.value = config.appearance?.theme || 'system';
  positionSelect.value = config.appearance?.position || 'center';
  sizeSelect.value = config.appearance?.size || 'medium';
  opacityRange.value = config.appearance?.opacity || 0.95;
  opacityValue.textContent = opacityRange.value;

  // Advanced settings - 필수 설정
  window.settings.log.info('고급 설정 초기화');
  hideAfterActionCheckbox.checked = config.advanced?.hideAfterAction !== false;
  hideOnBlurCheckbox.checked = config.advanced?.hideOnBlur !== false;
  hideOnEscapeCheckbox.checked = config.advanced?.hideOnEscape !== false;
  showInTaskbarCheckbox.checked = config.advanced?.showInTaskbar || false;

  // Cloud Sync settings
  window.settings.log.info('클라우드 동기화 설정 초기화');
  initializeCloudSyncUI();

  // About settings
  window.settings.log.info('정보 탭 초기화');
  initializeAboutSettings();

  // 모든 탭 콘텐츠 초기화 완료
  window.settings.log.info('모든 탭 콘텐츠가 초기화되었습니다.');
}

/**
 * Initialize General Settings tab
 */
function initializeGeneralSettings() {
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
 * Initialize Appearance Settings tab
 */
function initializeAppearanceSettings() {
  window.settings.log.info('initializeAppearanceSettings 호출');

  try {
    // 테마 설정
    if (themeSelect) {
      themeSelect.value = config.appearance?.theme || 'system';
    }

    // 창 위치 설정
    if (positionSelect) {
      positionSelect.value = config.appearance?.position || 'center';
    }

    // 창 크기 설정
    if (sizeSelect) {
      sizeSelect.value = config.appearance?.size || 'medium';
    }

    // 창 투명도 설정
    if (opacityRange) {
      opacityRange.value = config.appearance?.opacity || 0.95;

      if (opacityValue) {
        opacityValue.textContent = opacityRange.value;
      }
    }

    window.settings.log.info('모양 설정 탭 초기화 완료');
  } catch (error) {
    window.settings.log.error('모양 설정 탭 초기화 중 오류 발생:', error);
  }
}

/**
 * Initialize Advanced Settings tab
 */
function initializeAdvancedSettings() {
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
 * Initialize About tab with version information
 */
function initializeAboutSettings() {
  window.settings.log.info('initializeAboutSettings 호출');

  try {
    // 버전 표시
    if (appVersionElement) {
      // 앱 버전 가져오기
      window.settings.getVersion().then(version => {
        // 버전 정보 표시
        appVersionElement.innerHTML = `<strong>${version}</strong>`;
        window.settings.log.info(`앱 버전 정보: ${version}`);
      }).catch(error => {
        window.settings.log.error('버전 정보를 가져오는 중 오류 발생:', error);
        appVersionElement.innerHTML = '<strong>Version information unavailable</strong>';
      });
    }

    // 업데이트 상태 초기화
    resetUpdateUI();

  } catch (error) {
    window.settings.log.error('정보 탭 초기화 중 오류 발생:', error);
  }
}

/**
 * Apply theme to the application
 * @param {string} theme - The theme to apply ('light', 'dark', or 'system')
 */
function applyTheme(theme) {
  // Remove any existing theme classes first
  document.documentElement.classList.remove('theme-light', 'theme-dark');

  // Remove data-theme attribute (used for forced themes)
  document.documentElement.removeAttribute('data-theme');

  // Apply the selected theme
  if (theme === 'light') {
    document.documentElement.setAttribute('data-theme', 'light');
  } else if (theme === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
  }

  // Log theme change
  window.settings.log.info('Theme changed to:', theme);
}

/**
 * Initialize Cloud Sync UI
 */
function initializeCloudSyncUI() {
  window.settings.log.info(
    'initializeCloudSyncUI 호출 - 구독:',
    authState.subscription ? authState.subscription.plan : 'none',
  );

  try {
    // cloud-sync.js의 초기화 함수 호출
    window.cloudSyncUI.initializeCloudSyncUI(config, authState, window.settings.log);
  } catch (error) {
    window.settings.log.error('Error initializing Cloud Sync UI:', error);
  }
}

// 중복 호출 방지를 위한 상태 관리
let authStateInitialized = false;
let profileDataFetchInProgress = false;

/**
 * Initialize authentication state - 중복 호출 방지 및 최적화
 */
async function initializeAuthState() {
  if (authStateInitialized) {
    window.settings.log.info('인증 상태가 이미 초기화되어 있어 중복 초기화를 건너뜁니다.');
    return;
  }

  // 초기화 진행 중 표시
  authStateInitialized = true;

  try {
    // Check if we have authentication tokens
    const token = await window.settings.getAuthToken();

    if (token) {
      // 로그인 상태 UI 업데이트
      updateAuthStateUI(true);

      // 프로필 및 구독 정보 로드 (중복 호출 방지)
      if (!profileDataFetchInProgress && !authState.profile) {
        await loadUserDataEfficiently();
      }
    } else {
      // No tokens, show login UI
      updateAuthStateUI(false);
    }
  } catch (error) {
    window.settings.log.error('Failed to initialize auth state:', error);
    // Show login UI when error occurs
    updateAuthStateUI(false);
    // 오류 발생 시 초기화 상태 리셋
    authStateInitialized = false;
  }
}

/**
 * 프로필 및 구독 정보 효율적으로 로드 (중복 호출 방지)
 */
async function loadUserDataEfficiently() {
  // 이미 데이터 로드 중이면 건너뜀
  if (profileDataFetchInProgress) {
    window.settings.log.info('프로필 데이터 로드가 이미 진행 중입니다.');
    return;
  }

  profileDataFetchInProgress = true;

  try {
    window.settings.log.info('사용자 프로필 및 구독 정보 효율적 로드 시작');

    // 로딩 표시
    if (authLoading) setLoading(authLoading, true);
    if (subscriptionLoading) setLoading(subscriptionLoading, true);

    // 프로필 정보 로드
    await fetchUserProfile();

    // 구독 정보 로드 (프로필 이미 있으면 중복 요청 방지)
    await fetchSubscriptionInfo();

    // 로딩 숨김
    if (authLoading) setLoading(authLoading, false);
    if (subscriptionLoading) setLoading(subscriptionLoading, false);

    window.settings.log.info('사용자 프로필 및 구독 정보 로드 완료');
  } catch (error) {
    window.settings.log.error('사용자 데이터 로드 중 오류:', error);
    if (authLoading) setLoading(authLoading, false);
    if (subscriptionLoading) setLoading(subscriptionLoading, false);
  } finally {
    // 데이터 로드 완료 표시
    profileDataFetchInProgress = false;
  }
}

/**
 * Update UI based on authentication state
 * @param {boolean} isLoggedIn - Whether the user is logged in
 */
function updateAuthStateUI(isLoggedIn) {
  authState.isLoggedIn = isLoggedIn;

  if (isLoggedIn) {
    // Show profile and subscription sections, hide login section
    loginSection.classList.add('hidden');
    profileSection.classList.remove('hidden');
    subscriptionSection.classList.remove('hidden');

    // Update Cloud Sync UI as well (will only show if user has permission)
    window.settings
      .getSyncStatus()
      .then(status => {
        if (window.cloudSyncUI) {
          window.cloudSyncUI.updateSyncStatusUI(status, authState, window.settings.log);
        }
      })
      .catch(error => {
        window.settings.log.error('Error getting sync status:', error);
      });
  } else {
    // Show login section, hide profile and subscription sections
    loginSection.classList.remove('hidden');
    profileSection.classList.add('hidden');
    subscriptionSection.classList.add('hidden');

    // Reset profile and subscription UI
    userAvatar.src = '';
    userName.textContent = '-';
    userEmail.textContent = '-';
    subscriptionBadge.textContent = 'Free';
    subscriptionBadge.className = 'badge free';
    subscriptionStatus.textContent = '-';
    subscriptionExpiry.textContent = '-';
    subscriptionFeatures.textContent = '-';

    // Disable Cloud Sync UI
    if (window.cloudSyncUI) {
      window.cloudSyncUI.disableCloudSyncUI(window.settings.log);
    }
  }
}

/**
 * 계정 설정 탭 초기화
 */
function initializeAccountSettings() {
  window.settings.log.info('initializeAccountSettings 호출');

  try {
    // 중복 호출 방지를 위해 인증 상태 초기화만 수행
    // initializeAuthState()는 이미 내부적으로 필요한 프로필 및 구독 정보를 로드함
    initializeAuthState();
  } catch (error) {
    window.settings.log.error('계정 설정 초기화 중 오류 발생:', error);
  }
}

/**
 * Update Cloud Sync status UI
 * @param {Object} status - Cloud Sync status object
 */
function updateSyncStatusUI(status) {
  if (!status) {
    disableCloudSyncUI();
    return;
  }

  // 구독/VIP 여부 확인
  let hasCloudSyncPermission = false;

  // 디버깅: 구독 상태 정보 로깅
  window.settings.log.info('구독 정보 확인:', authState.subscription);

  // 1. 직접적인 구독 상태 확인
  if (
    authState.subscription?.isSubscribed === true ||
    authState.subscription?.active === true ||
    authState.subscription?.is_subscribed === true
  ) {
    hasCloudSyncPermission = true;
    window.settings.log.info('구독 활성화 상태 확인됨');
  }

  // VIP 사용자 확인 (최우선)
  if (authState.subscription?.isVip === true || authState.subscription?.vip === true) {
    hasCloudSyncPermission = true;
    window.settings.log.info('VIP 상태 확인됨 - 클라우드 싱크 권한 부여됨');
  }

  // 2. 구독 플랜 확인 (premium/pro 플랜은 cloud_sync 기능을 기본 제공)
  if (authState.subscription?.plan) {
    const plan = authState.subscription.plan.toLowerCase();
    if (plan.includes('premium') || plan.includes('pro')) {
      hasCloudSyncPermission = true;
      window.settings.log.info('Premium/Pro 플랜 확인됨');
    }
  }

  // 3. features 객체에서 cloud_sync 기능 확인
  if (authState.subscription?.features) {
    if (authState.subscription.features.cloud_sync === true) {
      hasCloudSyncPermission = true;
      window.settings.log.info('cloud_sync 기능 활성화됨 (features 객체)');
    }
  }

  // 4. features_array에서 cloud_sync 기능 확인
  if (Array.isArray(authState.subscription?.features_array)) {
    if (authState.subscription.features_array.includes('cloud_sync')) {
      hasCloudSyncPermission = true;
      window.settings.log.info('cloud_sync 기능 활성화됨 (features_array)');
    }
  }

  // 5. additionalFeatures 객체에서 cloudSync 기능 확인
  if (authState.subscription?.additionalFeatures) {
    if (authState.subscription.additionalFeatures.cloudSync === true) {
      hasCloudSyncPermission = true;
      window.settings.log.info('cloudSync 기능 활성화됨 (additionalFeatures)');
    }
  }

  // 로깅: 최종 권한 확인
  window.settings.log.info(
    `Cloud Sync 권한: ${hasCloudSyncPermission ? '있음' : '없음'}, 로그인 상태: ${authState.isLoggedIn ? '로그인됨' : '로그아웃됨'}`,
  );

  const canUseCloudSync = hasCloudSyncPermission && authState.isLoggedIn;

  window.settings.log.info('canUseCloudSync:', canUseCloudSync);

  // 구독/VIP가 아니면 항상 Cloud Sync 비활성화
  if (!canUseCloudSync) {
    disableCloudSyncUI();
    return;
  }

  // 권한이 있는 경우에만 활성화 상태 표시
  // Update sync status badge
  if (status.enabled) {
    // 활성화된 경우에는 움직이는 스피너 표시
    syncStatusBadge.textContent = '';
    syncStatusBadge.className = 'badge premium badge-with-spinner';

    // 움직이는 스피너 추가 (애니메이션 있음)
    const spinner = document.createElement('div');
    spinner.className = 'spinner-inline';
    syncStatusBadge.appendChild(spinner);
  } else {
    // 비활성화된 경우에는 멈춘 이모티콘 표시
    syncStatusBadge.textContent = '⏹️';
    syncStatusBadge.className = 'badge secondary';
  }

  // Update sync status text
  syncStatusText.textContent = status.enabled ? 'Cloud Sync Enabled' : 'Cloud Sync Disabled';

  // Update last synced time
  const lastSyncTime = status.lastSyncTime ? new Date(status.lastSyncTime) : new Date();
  const formattedDate = lastSyncTime.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  lastSyncedTime.textContent = status.lastSyncTime
    ? `Last Synced: ${formattedDate}`
    : `Sync Status: Ready to sync (${formattedDate})`;

  // Update device info
  syncDeviceInfo.textContent = status.deviceId
    ? `Current Device: ${status.deviceId}`
    : 'Current Device: Unknown';

  enableCloudSyncCheckbox.disabled = !canUseCloudSync;
  enableCloudSyncCheckbox.checked = status.enabled;

  // 동기화 버튼 활성화/비활성화
  manualSyncUploadButton.disabled = !canUseCloudSync || !status.enabled;
  manualSyncDownloadButton.disabled = !canUseCloudSync || !status.enabled;
  manualSyncResolveButton.disabled = !canUseCloudSync || !status.enabled;
}

/**
 * Disable Cloud Sync UI
 */
function disableCloudSyncUI() {
  syncStatusBadge.textContent = '⏹️';
  syncStatusBadge.className = 'badge secondary';
  syncStatusText.textContent = 'Cloud Sync Disabled';

  // 현재 날짜 형식화 (영어)
  const currentDate = new Date();
  const formattedDate = currentDate.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  lastSyncedTime.textContent = `Sync Status: Not synced (${formattedDate})`;
  syncDeviceInfo.textContent = 'Current Device: -';

  enableCloudSyncCheckbox.checked = false;
  enableCloudSyncCheckbox.disabled = true;

  // 버튼 비활성화 및 회색으로 스타일 변경
  manualSyncUploadButton.disabled = true;
  manualSyncDownloadButton.disabled = true;
  manualSyncResolveButton.disabled = true;

  // 버튼들에 회색 스타일 적용
  manualSyncUploadButton.style.backgroundColor = '#cccccc';
  manualSyncDownloadButton.style.backgroundColor = '#cccccc';
  manualSyncResolveButton.style.backgroundColor = '#cccccc';
  manualSyncUploadButton.style.color = '#666666';
  manualSyncDownloadButton.style.color = '#666666';
  manualSyncResolveButton.style.color = '#666666';
  manualSyncUploadButton.style.cursor = 'not-allowed';
  manualSyncDownloadButton.style.cursor = 'not-allowed';
  manualSyncResolveButton.style.cursor = 'not-allowed';
}

/**
 * Show/hide loading state for UI elements
 * @param {HTMLElement} loadingElement - Loading indicator element
 * @param {boolean} isLoading - Loading state
 */
function setLoading(loadingElement, isLoading) {
  if (loadingElement) {
    if (isLoading) {
      loadingElement.classList.remove('hidden');
    } else {
      loadingElement.classList.add('hidden');
    }
  }
}

/**
 * Load user profile information and update UI
 */
async function loadUserDataAndUpdateUI() {
  window.settings.log.info('loadUserDataAndUpdateUI 호출');

  try {
    // 로딩 표시
    if (authLoading) setLoading(authLoading, true);

    // 프로필 정보 로드
    await fetchUserProfile();

    // 구독 정보 로드
    await fetchSubscriptionInfo();

    // 인증 상태 UI 업데이트
    updateAuthStateUI(true);

    // 로딩 숨김
    if (authLoading) setLoading(authLoading, false);
  } catch (error) {
    window.settings.log.error('사용자 데이터 로드 오류:', error);

    // 오류 발생 시 로딩 숨김
    if (authLoading) setLoading(authLoading, false);
  }
}

/**
 * Start recording hotkey
 */
function startRecordingHotkey() {
  window.settings.log.info('단축키 녹화 시작');

  // 녹화 시작 전에 전역 단축키를 일시적으로 비활성화
  window.settings.temporarilyDisableShortcuts()
    .then(success => {
      window.settings.log.info('전역 단축키 일시 비활성화:', success ? '성공' : '실패');
    })
    .catch(error => {
      window.settings.log.error('전역 단축키 비활성화 중 오류:', error);
    });

  isRecordingHotkey = true;
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
function clearHotkey() {
  window.settings.log.info('단축키 초기화');

  // 녹화 취소 시 전역 단축키 복원
  window.settings.restoreShortcuts()
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

  isRecordingHotkey = false;

  if (recordHotkeyButton) {
    recordHotkeyButton.disabled = false;
  }

  // 변경 사항 감지
  markUnsavedChanges();
}

/**
 * Handle hotkey recording
 */
function handleHotkeyRecording(event) {
  if (!isRecordingHotkey) return;

  // 키 조합 처리
  if (event.key === 'Escape') {
    // ESC 키는 녹화 취소
    clearHotkey();
    return;
  }

  // 단축키 조합 생성
  const modifiers = [];
  if (event.ctrlKey) modifiers.push('Ctrl');
  if (event.shiftKey) modifiers.push('Shift');
  if (event.altKey) modifiers.push('Alt');
  if (event.metaKey) modifiers.push('Meta');

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
  if (key === 'ArrowUp') key = 'Up';
  if (key === 'ArrowDown') key = 'Down';
  if (key === 'ArrowLeft') key = 'Left';
  if (key === 'ArrowRight') key = 'Right';
  if (key === 'Enter') key = 'Return';
  if (key === 'Tab') key = 'Tab';
  if (key === 'Backspace') key = 'Backspace';
  if (key === 'Delete') key = 'Delete';
  if (key === 'Home') key = 'Home';
  if (key === 'End') key = 'End';
  if (key === 'PageUp') key = 'PageUp';
  if (key === 'PageDown') key = 'PageDown';
  if (key === 'Escape') key = 'Escape';

  // 적어도 하나의 모디파이어와 하나의 일반 키가 필요함
  if (modifiers.length === 0) {
    window.settings.log.warn('유효하지 않은 핫키: 모디파이어 키가 필요합니다.');
    return;
  }

  // 단축키 텍스트 생성
  const hotkey = [...modifiers, key].join('+');

  // 유효한 핫키인지 검증
  if (hotkey.includes('Alt+Alt') || hotkey.includes('Shift+Shift') ||
    hotkey.includes('Ctrl+Ctrl') || hotkey.includes('Meta+Meta')) {
    window.settings.log.warn('유효하지 않은 핫키 조합 감지:', hotkey);
    return;
  }

  // 입력 필드 업데이트
  if (globalHotkeyInput) {
    globalHotkeyInput.value = hotkey;
    globalHotkeyInput.classList.remove('recording');
  }

  isRecordingHotkey = false;
  if (recordHotkeyButton) {
    recordHotkeyButton.disabled = false;
  }

  // 이벤트 기본 동작 방지
  event.preventDefault();

  // 설정 즉시 저장
  window.settings.setConfig('globalHotkey', hotkey)
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

/**
 * Handle login button click
 */
function handleLogin() {
  window.settings.log.info('로그인 시작');

  try {
    // 로딩 표시
    if (authLoading) setLoading(authLoading, true);
    if (loginButton) loginButton.disabled = true;

    // 로그인 시작
    window.settings.initiateLogin()
      .then(success => {
        if (!success) {
          // 로그인 실패
          if (authLoading) setLoading(authLoading, false);
          if (loginButton) loginButton.disabled = false;
          window.settings.log.error('로그인 시작 실패');
        }
      })
      .catch(error => {
        // 오류 처리
        window.settings.log.error('로그인 오류:', error);
        if (authLoading) setLoading(authLoading, false);
        if (loginButton) loginButton.disabled = false;
      });
  } catch (error) {
    window.settings.log.error('로그인 처리 중 오류:', error);
    if (authLoading) setLoading(authLoading, false);
    if (loginButton) loginButton.disabled = false;
  }
}

/**
 * Handle logout button click
 */
function handleLogout() {
  window.settings.log.info('로그아웃 시작');

  try {
    window.settings.logout()
      .then(() => {
        // 로그아웃 성공 시 UI 업데이트
        updateAuthStateUI(false);
        window.settings.log.info('로그아웃 성공');
      })
      .catch(error => {
        window.settings.log.error('로그아웃 오류:', error);
      });
  } catch (error) {
    window.settings.log.error('로그아웃 처리 중 오류:', error);
  }
}

/**
 * Handle token expiration
 */
function handleTokenExpired() {
  window.settings.log.info('토큰 만료 감지, 로그아웃 처리');
  handleLogout();
}

/**
 * Mark settings as having unsaved changes
 */
function markUnsavedChanges() {
  unsavedChanges = true;
}

/**
 * Save settings
 */
function saveSettings() {
  window.settings.log.info('설정 저장 시작');

  try {
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
    unsavedChanges = false;

    window.settings.log.info('설정 저장 완료');
  } catch (error) {
    window.settings.log.error('설정 저장 중 오류:', error);
  }
}

/**
 * Confirm cancel changes
 */
function confirmCancel() {
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
 * Handle manage subscription button click
 */
function handleManageSubscription() {
  window.settings.log.info('구독 관리 페이지 열기');
  window.settings.openUrl('https://toast.sh/subscription');
}

/**
 * Handle refresh subscription button click
 */
function handleRefreshSubscription() {
  window.settings.log.info('구독 정보 새로고침');

  try {
    // 버튼 비활성화 및 로딩 표시
    if (refreshSubscriptionButton) {
      refreshSubscriptionButton.disabled = true;
      refreshSubscriptionButton.textContent = 'Refreshing...';
    }

    if (subscriptionLoading) setLoading(subscriptionLoading, true);

    // 구독 정보 다시 로드
    fetchSubscriptionInfo()
      .then(() => {
        // 성공 메시지 표시
        if (refreshSubscriptionButton) {
          refreshSubscriptionButton.textContent = 'Refresh Complete!';
          setTimeout(() => {
            refreshSubscriptionButton.textContent = 'Refresh Subscription Info';
            refreshSubscriptionButton.disabled = false;
          }, 1500);
        }
      })
      .catch(error => {
        window.settings.log.error('구독 정보 새로고침 오류:', error);

        // 오류 메시지 표시
        if (refreshSubscriptionButton) {
          refreshSubscriptionButton.textContent = 'Refresh Failed';
          setTimeout(() => {
            refreshSubscriptionButton.textContent = 'Refresh Subscription Info';
            refreshSubscriptionButton.disabled = false;
          }, 1500);
        }
      });
  } catch (error) {
    window.settings.log.error('구독 정보 새로고침 처리 중 오류:', error);

    // 오류 시 버튼 및 로딩 상태 복원
    if (subscriptionLoading) setLoading(subscriptionLoading, false);
    if (refreshSubscriptionButton) {
      refreshSubscriptionButton.textContent = 'Refresh Subscription Info';
      refreshSubscriptionButton.disabled = false;
    }
  }
}

/**
 * Handle Cloud Sync toggle
 */
function handleCloudSyncToggle() {
  const enabled = enableCloudSyncCheckbox.checked;
  window.settings.log.info(`클라우드 동기화 상태 변경: ${enabled ? '활성화' : '비활성화'}`);

  try {
    // 로딩 표시 및 버튼 비활성화
    if (syncLoading) setLoading(syncLoading, true);
    if (enableCloudSyncCheckbox) enableCloudSyncCheckbox.disabled = true;

    // 동기화 상태 변경
    window.settings.setCloudSyncEnabled(enabled)
      .then(() => {
        // 상태 업데이트
        return window.settings.getSyncStatus();
      })
      .then(status => {
        // UI 업데이트
        updateSyncStatusUI(status);

        // 로딩 숨김 및 버튼 활성화
        if (syncLoading) setLoading(syncLoading, false);
        if (enableCloudSyncCheckbox) enableCloudSyncCheckbox.disabled = false;
      })
      .catch(error => {
        window.settings.log.error('클라우드 동기화 상태 변경 오류:', error);

        // 오류 시 체크박스 상태 복원
        if (enableCloudSyncCheckbox) {
          enableCloudSyncCheckbox.checked = !enabled;
          enableCloudSyncCheckbox.disabled = false;
        }

        // 로딩 숨김
        if (syncLoading) setLoading(syncLoading, false);
      });
  } catch (error) {
    window.settings.log.error('클라우드 동기화 상태 변경 처리 중 오류:', error);

    // 오류 시 UI 복원
    if (syncLoading) setLoading(syncLoading, false);
    if (enableCloudSyncCheckbox) {
      enableCloudSyncCheckbox.checked = !enabled;
      enableCloudSyncCheckbox.disabled = false;
    }
  }
}

/**
 * Handle manual sync upload
 */
function handleManualSyncUpload() {
  window.settings.log.info('수동 동기화 - 업로드 시작');

  try {
    // 로딩 표시 및 버튼 비활성화
    if (syncLoading) setLoading(syncLoading, true);
    if (manualSyncUploadButton) manualSyncUploadButton.disabled = true;
    if (manualSyncDownloadButton) manualSyncDownloadButton.disabled = true;
    if (manualSyncResolveButton) manualSyncResolveButton.disabled = true;

    // 업로드 실행
    window.settings.manualSync('upload')
      .then(result => {
        if (result.success) {
          // 성공 메시지
          if (manualSyncUploadButton) {
            manualSyncUploadButton.textContent = 'Upload Complete!';
          }
        } else {
          // 오류가 객체인 경우 JSON 문자열로 변환하거나 메시지 속성 사용
          let errorMessage = '알 수 없는 오류';
          if (result.error) {
            if (typeof result.error === 'object') {
              errorMessage = result.error.message || JSON.stringify(result.error);
            } else {
              errorMessage = result.error;
            }
          }
          throw new Error(errorMessage);
        }
      })
      .catch(error => {
        window.settings.log.error('수동 동기화 업로드 오류:', error);

        // 오류 메시지
        if (manualSyncUploadButton) {
          manualSyncUploadButton.textContent = 'Upload Failed';
        }
      })
      .finally(() => {
        // 상태 복원
        if (syncLoading) setLoading(syncLoading, false);

        setTimeout(() => {
          if (manualSyncUploadButton) {
            manualSyncUploadButton.textContent = 'Upload to Server';
            manualSyncUploadButton.disabled = false;
          }
          if (manualSyncDownloadButton) manualSyncDownloadButton.disabled = false;
          if (manualSyncResolveButton) manualSyncResolveButton.disabled = false;
        }, 1500);
      });
  } catch (error) {
    window.settings.log.error('수동 동기화 업로드 처리 중 오류:', error);

    // 로딩 및 버튼 상태 복원
    if (syncLoading) setLoading(syncLoading, false);
    if (manualSyncUploadButton) manualSyncUploadButton.disabled = false;
    if (manualSyncDownloadButton) manualSyncDownloadButton.disabled = false;
    if (manualSyncResolveButton) manualSyncResolveButton.disabled = false;
  }
}

/**
 * Handle manual sync download
 */
function handleManualSyncDownload() {
  window.settings.log.info('수동 동기화 - 다운로드 시작');

  try {
    // 확인 대화상자
    if (!confirm('Downloading settings from the server will overwrite your local settings. Do you want to continue?')) {
      return;
    }

    // 로딩 표시 및 버튼 비활성화
    if (syncLoading) setLoading(syncLoading, true);
    if (manualSyncUploadButton) manualSyncUploadButton.disabled = true;
    if (manualSyncDownloadButton) manualSyncDownloadButton.disabled = true;
    if (manualSyncResolveButton) manualSyncResolveButton.disabled = true;

    // 다운로드 실행
    window.settings.manualSync('download')
      .then(result => {
        if (result.success) {
          // 성공 메시지
          if (manualSyncDownloadButton) {
            manualSyncDownloadButton.textContent = 'Download Complete!';
          }

          // 설정 다시 로드
          return window.settings.getConfig();
        } else {
          // 오류가 객체인 경우 JSON 문자열로 변환하거나 메시지 속성 사용
          let errorMessage = '알 수 없는 오류';
          if (result.error) {
            if (typeof result.error === 'object') {
              errorMessage = result.error.message || JSON.stringify(result.error);
            } else {
              errorMessage = result.error;
            }
          }
          throw new Error(errorMessage);
        }
      })
      .then(loadedConfig => {
        config = loadedConfig;
        initializeUI();
      })
      .catch(error => {
        window.settings.log.error('수동 동기화 다운로드 오류:', error);

        // 오류 메시지
        if (manualSyncDownloadButton) {
          manualSyncDownloadButton.textContent = 'Download Failed';
        }
      })
      .finally(() => {
        // 상태 복원
        if (syncLoading) setLoading(syncLoading, false);

        setTimeout(() => {
          if (manualSyncDownloadButton) {
            manualSyncDownloadButton.textContent = 'Download from Server';
            manualSyncDownloadButton.disabled = false;
          }
          if (manualSyncUploadButton) manualSyncUploadButton.disabled = false;
          if (manualSyncResolveButton) manualSyncResolveButton.disabled = false;
        }, 1500);
      });
  } catch (error) {
    window.settings.log.error('수동 동기화 다운로드 처리 중 오류:', error);

    // 로딩 및 버튼 상태 복원
    if (syncLoading) setLoading(syncLoading, false);
    if (manualSyncUploadButton) manualSyncUploadButton.disabled = false;
    if (manualSyncDownloadButton) manualSyncDownloadButton.disabled = false;
    if (manualSyncResolveButton) manualSyncResolveButton.disabled = false;
  }
}

/**
 * Handle manual sync resolve
 */
function handleManualSyncResolve() {
  window.settings.log.info('수동 동기화 - 충돌 해결 시작');

  try {
    // 확인 대화상자
    if (!confirm('This will resolve conflicts between local and server settings. Settings with more recent timestamps will be applied. Do you want to continue?')) {
      return;
    }

    // 로딩 표시 및 버튼 비활성화
    if (syncLoading) setLoading(syncLoading, true);
    if (manualSyncUploadButton) manualSyncUploadButton.disabled = true;
    if (manualSyncDownloadButton) manualSyncDownloadButton.disabled = true;
    if (manualSyncResolveButton) manualSyncResolveButton.disabled = true;

    // 충돌 해결 실행
    window.settings.manualSync('resolve')
      .then(result => {
        if (result.success) {
          // 성공 메시지
          if (manualSyncResolveButton) {
            manualSyncResolveButton.textContent = 'Conflict Resolution Complete!';
          }

          // 설정 다시 로드
          return window.settings.getConfig();
        } else {
          // 오류가 객체인 경우 JSON 문자열로 변환하거나 메시지 속성 사용
          let errorMessage = '알 수 없는 오류';
          if (result.error) {
            if (typeof result.error === 'object') {
              errorMessage = result.error.message || JSON.stringify(result.error);
            } else {
              errorMessage = result.error;
            }
          }
          throw new Error(errorMessage);
        }
      })
      .then(loadedConfig => {
        config = loadedConfig;
        initializeUI();
      })
      .catch(error => {
        window.settings.log.error('수동 동기화 충돌 해결 오류:', error);

        // 오류 메시지
        if (manualSyncResolveButton) {
          manualSyncResolveButton.textContent = 'Conflict Resolution Failed';
        }
      })
      .finally(() => {
        // 상태 복원
        if (syncLoading) setLoading(syncLoading, false);

        setTimeout(() => {
          if (manualSyncResolveButton) {
            manualSyncResolveButton.textContent = 'Resolve Conflicts';
            manualSyncResolveButton.disabled = false;
          }
          if (manualSyncUploadButton) manualSyncUploadButton.disabled = false;
          if (manualSyncDownloadButton) manualSyncDownloadButton.disabled = false;
        }, 1500);
      });
  } catch (error) {
    window.settings.log.error('수동 동기화 충돌 해결 처리 중 오류:', error);

    // 로딩 및 버튼 상태 복원
    if (syncLoading) setLoading(syncLoading, false);
    if (manualSyncUploadButton) manualSyncUploadButton.disabled = false;
    if (manualSyncDownloadButton) manualSyncDownloadButton.disabled = false;
    if (manualSyncResolveButton) manualSyncResolveButton.disabled = false;
  }
}

/**
 * Fetch user profile information - 중복 요청 방지
 */
async function fetchUserProfile() {
  try {
    // 이미 프로필 정보가 있으면 중복 요청 방지
    if (authState.profile) {
      window.settings.log.info('기존 프로필 정보 사용 (중복 요청 방지)');
      updateProfileDisplay(authState.profile);
      return authState.profile;
    }

    // Check if token exists first
    const token = await window.settings.getAuthToken();
    if (!token) {
      window.settings.log.info('No auth token available, skipping profile fetch');
      return null;
    }

    window.settings.log.info('프로필 정보 새로 요청');
    const profile = await window.settings.fetchUserProfile();
    if (profile) {
      authState.profile = profile;

      // Update UI with profile information
      updateProfileDisplay(profile);
      return profile;
    }
    return null;
  } catch (error) {
    window.settings.log.error('Failed to fetch user profile:', error);
    // Handle token expired case
    if (error.message && error.message.includes('token expired')) {
      handleTokenExpired();
    }
    return null;
  }
}

/**
 * Update profile display with user information
 * @param {Object} profile - User profile information
 */
function updateProfileDisplay(profile) {
  // Clear previous content
  userAvatar.innerHTML = '';

  if (profile.avatar_url || profile.profile_image || profile.avatar || profile.image) {
    // If profile image exists
    const img = document.createElement('img');
    img.src = profile.avatar_url || profile.profile_image || profile.avatar || profile.image;
    img.alt = 'Profile';

    // Handle image load error
    img.onerror = function () {
      // Use initials as fallback if image load fails
      const initials = getInitials(profile.name || profile.display_name || 'User');
      userAvatar.textContent = initials;
    };

    userAvatar.appendChild(img);
  } else {
    // Display initials if no image available
    const initials = getInitials(profile.name || profile.display_name || 'User');
    userAvatar.textContent = initials;
  }

  // Set name and email
  userName.textContent = profile.name || profile.display_name || 'User';
  userEmail.textContent = profile.email || '';
}

/**
 * Extract initials from user name
 * @param {string} name - User name
 * @returns {string} - Initials (up to 2 characters)
 */
function getInitials(name) {
  return name
    .split(' ')
    .map(part => part.charAt(0))
    .join('')
    .toUpperCase()
    .substring(0, 2);
}

/**
 * Fetch subscription information - 중복 요청 및 불필요한 API 호출 방지
 */
async function fetchSubscriptionInfo() {
  try {
    // 이미 구독 정보가 있으면 중복 요청 방지
    if (authState.subscription) {
      window.settings.log.info('기존 구독 정보 사용 (중복 요청 방지)');
      updateSubscriptionUI(authState.subscription);
      return authState.subscription;
    }

    // Check if token exists first
    const token = await window.settings.getAuthToken();
    if (!token) {
      window.settings.log.info('No auth token available, skipping subscription fetch');
      setLoading(subscriptionLoading, false);
      return null;
    }

    // 구독 정보 확인을 위한 로그
    window.settings.log.info('구독 정보 요청 시작');

    // 이미 프로필 정보가 있으면 재사용, 없으면 가져오기
    let profile = authState.profile;
    if (!profile) {
      profile = await fetchUserProfile();
    }

    // 프로필에 이미 구독 정보가 포함되어 있으면 재사용
    if (profile && profile.subscription) {
      window.settings.log.info('프로필에서 구독 정보 사용:', JSON.stringify(profile.subscription));
      authState.subscription = profile.subscription;
      updateSubscriptionUI(profile.subscription);
      saveSubscriptionToConfig(profile.subscription);
      return profile.subscription;
    }

    // 프로필에 구독 정보가 없는 경우에만 별도 요청
    window.settings.log.info('구독 정보 별도 요청');
    const subscription = await window.settings.fetchSubscription();
    window.settings.log.info('구독 정보 수신:', subscription ? '성공' : '실패');

    if (subscription) {
      window.settings.log.info('수신된 구독 정보:', JSON.stringify(subscription));

      // 구독 정보에 cloud_sync 정보가 없으면 추가 (프리미엄 사용자면)
      if (
        subscription.plan &&
        (subscription.plan.toLowerCase().includes('premium') ||
          subscription.plan.toLowerCase().includes('pro'))
      ) {
        if (!subscription.features) {
          subscription.features = {};
        }
        // 프리미엄/프로 사용자라면 cloud_sync 기능 활성화
        subscription.features.cloud_sync = true;
        window.settings.log.info('프리미엄 구독 감지, cloud_sync 활성화');
      }

      authState.subscription = subscription;

      // Update subscription UI
      updateSubscriptionUI(subscription);

      // Save subscription info to config
      saveSubscriptionToConfig(subscription);

      // 구독 정보를 설정에 직접 저장
      await window.settings.setConfig('subscription', subscription);

      return subscription;
    }

    return null;
  } catch (error) {
    window.settings.log.error('Failed to fetch subscription info:', error);

    // Handle token expired case
    if (error.message && error.message.includes('token expired')) {
      handleTokenExpired();
    }

    return null;
  } finally {
    // Hide loading state
    setLoading(subscriptionLoading, false);
  }
}

/**
 * Update subscription UI with subscription information
 * @param {Object} subscription - Subscription information
 */
function updateSubscriptionUI(subscription) {
  // Update subscription badge
  if (subscription.is_subscribed) {
    subscriptionBadge.textContent = subscription.plan || 'Premium';
    subscriptionBadge.className = 'badge premium';
    subscriptionStatus.textContent = 'Active';
  } else {
    subscriptionBadge.textContent = 'Free';
    subscriptionBadge.className = 'badge free';
    subscriptionStatus.textContent = 'Free Plan';
  }

  // Update subscription expiry
  if (subscription.expiresAt || subscription.subscribed_until) {
    const expiryValue = subscription.expiresAt || subscription.subscribed_until;
    const expiryDate = new Date(expiryValue);
    subscriptionExpiry.textContent = `Subscription valid until: ${expiryDate.toLocaleDateString()}`;
  } else {
    subscriptionExpiry.textContent = '';
  }

  // Update subscription features
  const featuresText = [];
  if (subscription.features) {
    if (subscription.features.page_groups) {
      featuresText.push(`${subscription.features.page_groups} page groups`);
    }
    if (subscription.features.advanced_actions) {
      featuresText.push('Advanced actions');
    }
    if (subscription.features.cloud_sync) {
      featuresText.push('Cloud sync');
    }
  }

  subscriptionFeatures.textContent =
    featuresText.length > 0 ? `Features: ${featuresText.join(', ')}` : 'Basic features';
}

/**
 * Save subscription information to config
 * @param {Object} subscription - Subscription information
 */
function saveSubscriptionToConfig(subscription) {
  // expiresAt은 문자열이어야 함
  let expiresAtStr = null;
  if (subscription.subscribed_until || subscription.expiresAt) {
    // 먼저 유효한 값이 있는 필드 선택
    const expiresValue = subscription.expiresAt || subscription.subscribed_until;

    // 날짜 객체인 경우 ISO 문자열로 변환
    if (expiresValue instanceof Date) {
      expiresAtStr = expiresValue.toISOString();
    }
    // 숫자(타임스탬프)인 경우 ISO 문자열로 변환
    else if (typeof expiresValue === 'number') {
      expiresAtStr = new Date(expiresValue).toISOString();
    }
    // 이미 문자열인 경우 그대로 사용
    else if (typeof expiresValue === 'string') {
      expiresAtStr = expiresValue;
    }
  }

  const subscriptionConfig = {
    isSubscribed: subscription.is_subscribed,
    plan: subscription.plan,
    expiresAt: expiresAtStr,
    pageGroups: subscription.features?.page_groups || 1,
    additionalFeatures: {
      advancedActions: subscription.features?.advanced_actions || false,
      cloudSync: subscription.features?.cloud_sync || false,
    },
  };

  window.settings.setConfig('subscription', subscriptionConfig);
}

/**
 * Load user profile information and update UI - 효율적 데이터 로드 사용
 */
async function loadUserDataAndUpdateUI() {
  window.settings.log.info('loadUserDataAndUpdateUI 호출');

  // 최적화된 데이터 로드 함수 호출
  await loadUserDataEfficiently();

  // 인증 상태 UI 업데이트
  updateAuthStateUI(true);
}

/**
 * 업데이트 UI 초기화
 */
function resetUpdateUI() {
  // 업데이트 상태 영역 초기화
  if (updateStatus) {
    updateStatus.className = 'update-status hidden';
  }

  // 업데이트 메시지 초기화
  if (updateMessage) {
    updateMessage.textContent = '';
  }

  // 업데이트 액션 영역 숨기기
  if (updateActions) {
    updateActions.className = 'update-actions hidden';
  }

  // 대체 업데이트 방법 섹션 숨기기
  if (alternativeUpdates) {
    alternativeUpdates.className = 'alternative-updates hidden';
  }

  // 로딩 표시기 숨기기
  if (updateLoading) {
    updateLoading.className = 'loading-indicator hidden';
  }

  // 업데이트 버튼들 숨기기
  if (downloadUpdateButton) {
    downloadUpdateButton.style.display = 'none';
  }

  if (installUpdateButton) {
    installUpdateButton.style.display = 'none';
  }
}

/**
 * 업데이트 확인 버튼 클릭 처리
 */
function handleCheckForUpdates() {
  window.settings.log.info('업데이트 확인 시작');

  // 업데이트 UI 초기화
  resetUpdateUI();

  // 업데이트 상태 영역 표시
  if (updateStatus) {
    updateStatus.className = 'update-status';
  }

  // 로딩 표시
  if (updateLoading) {
    updateLoading.className = 'loading-indicator';
  }

  // 버튼 비활성화
  if (checkUpdatesButton) {
    checkUpdatesButton.disabled = true;
  }

  // 상태 메시지 표시
  if (updateMessage) {
    updateMessage.textContent = 'Checking for updates...';
  }

  // 업데이트 확인 요청 (개선된 updater 사용)
  window.settings.checkForUpdates()
    .then(result => {
      window.settings.log.info('업데이트 확인 결과:', result);

      if (result.hasUpdate) {
        // 업데이트가 있는 경우
        const latestVersion = result.versionInfo?.latest || result.updateInfo?.version || '새 버전';
        const currentVersion = result.versionInfo?.current || '현재 버전';

        // 상태 메시지 업데이트
        if (updateMessage) {
          const notes = result.updateInfo?.releaseNotes || '';

          let messageText = `New version available (${currentVersion} → ${latestVersion}).`;
          if (notes) {
            // 릴리스 노트가 HTML 형식이면 텍스트로 변환
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = notes;
            const plainText = tempDiv.textContent || tempDiv.innerText || notes;

            // 릴리스 노트가 너무 길면 잘라내기
            const maxLength = 100;
            const trimmedNotes = plainText.length > maxLength
              ? plainText.substring(0, maxLength) + '...'
              : plainText;

            messageText += ` Release notes: ${trimmedNotes}`;
          }

          updateMessage.textContent = messageText;
        }

        // 업데이트 액션 영역 표시
        if (updateActions) {
          updateActions.className = 'update-actions';
        }

        // 대체 업데이트 방법 섹션 표시
        if (alternativeUpdates) {
          alternativeUpdates.className = 'alternative-updates';
        }

        // 다운로드 버튼 표시
        if (downloadUpdateButton) {
          downloadUpdateButton.style.display = 'inline-block';
          downloadUpdateButton.textContent = 'Download Update';
        }

        // 파일 정보가 있다면 표시
        if (result.files && Array.isArray(result.files) && result.files.length > 0) {
          const fileInfo = document.createElement('p');
          fileInfo.className = 'update-file-info';
          fileInfo.textContent = `Update size: ${formatFileSize(result.files[0].size || 0)}`;
          updateMessage.appendChild(fileInfo);
        }
      } else {
        // 업데이트가 없는 경우
        if (updateMessage) {
          updateMessage.textContent = 'You are using the latest version.';
        }
      }
    })
    .catch(error => {
      window.settings.log.error('업데이트 확인 오류:', error);

      // 오류 메시지 표시
      if (updateMessage) {
        updateMessage.textContent = 'Error checking for updates: ' + (error.message || 'Unknown error');
      }
    })
    .finally(() => {
      // 로딩 표시 숨기기
      if (updateLoading) {
        updateLoading.className = 'loading-indicator hidden';
      }

      // 버튼 활성화
      if (checkUpdatesButton) {
        checkUpdatesButton.disabled = false;
      }
    });
}

/**
 * 파일 크기를 읽기 쉬운 형식으로 변환
 * @param {number} bytes - 바이트 수
 * @returns {string} 변환된 문자열 (예: 1.5 MB)
 */
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * 업데이트 다운로드
 */
function handleDownloadUpdate() {
  window.settings.log.info('업데이트 다운로드 시작');

  // 로딩 표시
  if (updateLoading) {
    updateLoading.className = 'loading-indicator';
  }

  // 버튼 비활성화
  if (downloadUpdateButton) {
    downloadUpdateButton.disabled = true;
    downloadUpdateButton.textContent = 'Downloading...';
  }

  // 메시지 업데이트
  if (updateMessage) {
    updateMessage.textContent = 'Downloading update...';
  }

  // 진행 상태 표시를 위한 요소 추가
  const progressElement = document.createElement('div');
  progressElement.className = 'download-progress-bar';
  progressElement.innerHTML = `
    <div class="progress-container">
      <div class="progress-bar" style="width: 0%"></div>
    </div>
    <div class="progress-text">0%</div>
  `;
  updateMessage.appendChild(progressElement);

  // 다운로드 진행률 이벤트 리스너 추가
  const progressListener = (event, data) => {
    if (data && data.progress && progressElement) {
      const percent = Math.round(data.progress.percent);
      const progressBar = progressElement.querySelector('.progress-bar');
      const progressText = progressElement.querySelector('.progress-text');

      if (progressBar) progressBar.style.width = `${percent}%`;
      if (progressText) {
        progressText.textContent = data.progress.formattedPercent
          ? `${data.progress.formattedPercent} (${data.progress.formattedSpeed || ''})`
          : `${percent}%`;
      }
    }
  };

  // 이벤트 리스너 등록
  window.addEventListener('download-progress', progressListener);

  // 업데이트 다운로드
  window.settings.downloadUpdate()
    .then(result => {
      window.settings.log.info('업데이트 다운로드 결과:', result);

      if (result.success) {
        // 다운로드 성공
        if (updateMessage) {
          // 진행 상태 표시 요소 제거
          if (progressElement && progressElement.parentNode) {
            progressElement.parentNode.removeChild(progressElement);
          }

          updateMessage.textContent = `Update download complete (${result.version || 'new version'}). Restart to install.`;
        }

        // 다운로드 버튼을 숨기고 설치 버튼 표시
        if (downloadUpdateButton) {
          downloadUpdateButton.style.display = 'none';
        }

        // 설치(재시작) 버튼 표시
        if (installUpdateButton) {
          installUpdateButton.style.display = 'inline-block';
          installUpdateButton.textContent = 'Restart to Install';
          installUpdateButton.disabled = false;
        }
      } else {
        // 다운로드 실패
        // 오류가 객체인 경우 JSON 문자열로 변환하거나 메시지 속성 사용
        let errorMessage = '업데이트 다운로드 실패';
        if (result.error) {
          if (typeof result.error === 'object') {
            errorMessage = result.error.message || JSON.stringify(result.error);
          } else {
            errorMessage = result.error;
          }
        }
        throw new Error(errorMessage);
      }
    })
    .catch(error => {
      window.settings.log.error('업데이트 다운로드 오류:', error);

      // 오류 메시지 표시
      if (updateMessage) {
        // 진행 상태 표시 요소 제거
        if (progressElement && progressElement.parentNode) {
          progressElement.parentNode.removeChild(progressElement);
        }

        updateMessage.textContent = 'Error occurred while downloading update: ' + (error.message || 'Unknown error');
      }

      // 다운로드 버튼 상태 복원
      if (downloadUpdateButton) {
        downloadUpdateButton.textContent = 'Try Again';
        downloadUpdateButton.disabled = false;
      }
    })
    .finally(() => {
      // 이벤트 리스너 제거
      window.removeEventListener('download-progress', progressListener);

      // 로딩 표시 숨기기
      if (updateLoading) {
        updateLoading.className = 'loading-indicator hidden';
      }
    });
}

/**
 * 업데이트 설치 처리 (재시작)
 */
function handleInstallUpdate() {
  window.settings.log.info('업데이트 설치 시작 (재시작)');

  // 사용자에게 확인
  if (!confirm('The app will close and restart automatically after the update. Do you want to proceed now?')) {
    window.settings.log.info('User canceled the update installation.');
    return;
  }

  // 설치 버튼 비활성화
  if (installUpdateButton) {
    installUpdateButton.disabled = true;
    installUpdateButton.textContent = 'Restarting...';
  }

  // 로딩 표시
  if (updateLoading) {
    updateLoading.className = 'loading-indicator';
  }

  // 메시지 업데이트
  if (updateMessage) {
    updateMessage.textContent = 'Restarting to install update...';
  }

  // 앱 종료 알림 표시
  const closingMessage = document.createElement('div');
  closingMessage.className = 'update-closing-message';
  closingMessage.textContent = 'App will close automatically in 5 seconds...';
  if (updateMessage.parentNode) {
    updateMessage.parentNode.appendChild(closingMessage);
  }

  // 카운트다운 표시 (5초)
  let countdown = 5;
  const countdownInterval = setInterval(() => {
    countdown--;
    if (countdown <= 0) {
      clearInterval(countdownInterval);

      try {
        // 업데이트 설치 (앱 재시작)
        window.settings.installUpdate()
          .catch(error => {
            window.settings.log.error('업데이트 설치 오류:', error);
            handleInstallError(error);
          });
      } catch (error) {
        window.settings.log.error('업데이트 설치 과정에서 예외 발생:', error);
        handleInstallError(error);
      }
    } else {
      closingMessage.textContent = `App will close automatically in ${countdown} seconds...`;
    }
  }, 1000);
}

/**
 * 업데이트 설치 오류 처리
 */
function handleInstallError(error) {
  // 오류 메시지 표시
  if (updateMessage) {
    // 기존 메시지 내용 저장
    const originalContent = updateMessage.textContent;

    // 오류 메시지 설정
    updateMessage.innerHTML = `<span class="error-message">Error occurred while installing update:</span> ${error.message || 'Unknown error'}`;

    // 추가 도움말 표시
    const helpText = document.createElement('p');
    helpText.className = 'error-help-text';
    helpText.textContent = 'Try closing the app manually and restart it.';
    updateMessage.appendChild(helpText);

    // 기술적 오류 정보 표시 (개발자용)
    if (error.stack) {
      const techDetails = document.createElement('details');
      techDetails.className = 'error-technical-details';

      const summary = document.createElement('summary');
      summary.textContent = 'Technical error details (for developers)';
      techDetails.appendChild(summary);

      const pre = document.createElement('pre');
      pre.textContent = error.stack;
      techDetails.appendChild(pre);

      updateMessage.appendChild(techDetails);
    }
  }

  // 설치 버튼 상태 복원
  if (installUpdateButton) {
    installUpdateButton.textContent = 'Restart to Install';
    installUpdateButton.disabled = false;
  }

  // 다운로드 버튼도 다시 표시하여 재시도 가능하게 함
  if (downloadUpdateButton) {
    downloadUpdateButton.style.display = 'inline-block';
    downloadUpdateButton.textContent = 'Download Update Again';
    downloadUpdateButton.disabled = false;
  }

  // 로딩 숨기기
  if (updateLoading) {
    updateLoading.className = 'loading-indicator hidden';
  }

  // 오류 로그 자세히 기록
  window.settings.log.error('업데이트 설치 오류 세부 정보:', {
    message: error.message,
    name: error.name,
    stack: error.stack,
    code: error.code
  });
}
