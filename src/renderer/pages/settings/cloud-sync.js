/**
 * Toast - Cloud Sync UI Module
 *
 * 클라우드 동기화 UI 관련 기능을 처리하는 모듈입니다.
 * 이 모듈은 Settings 창의 Cloud Sync 탭에서 사용됩니다.
 */

// 상태 관리
const cloudSyncState = {
  enabled: false,
  isLoading: false,
  deviceId: null,
  lastSyncTime: 0,
  hasPermission: false,
};

// DOM 요소 참조
const DOM = {
  // 동기화 상태 요소
  syncStatusBadge: null,
  syncStatusText: null,
  lastSyncedTime: null,
  syncDeviceInfo: null,

  // 컨트롤 요소
  enableCloudSyncCheckbox: null,
  manualSyncUploadButton: null,
  manualSyncDownloadButton: null,
  manualSyncResolveButton: null,
  syncLoading: null,
};

/**
 * DOM 요소 초기화
 */
function initElements() {
  DOM.syncStatusBadge = document.getElementById('sync-status-badge');
  DOM.syncStatusText = document.getElementById('sync-status-text');
  DOM.lastSyncedTime = document.getElementById('last-synced-time');
  DOM.syncDeviceInfo = document.getElementById('sync-device-info');
  DOM.enableCloudSyncCheckbox = document.getElementById('enable-cloud-sync');
  DOM.manualSyncUploadButton = document.getElementById('manual-sync-upload');
  DOM.manualSyncDownloadButton = document.getElementById('manual-sync-download');
  DOM.manualSyncResolveButton = document.getElementById('manual-sync-resolve');
  DOM.syncLoading = document.getElementById('sync-loading');
}

/**
 * 클라우드 동기화 UI 초기화
 * @param {Object} config - 앱 설정
 * @param {Object} authState - 인증 상태
 * @param {Object} logger - 로거
 */
function initializeCloudSyncUI(config, authState, logger) {
  try {
    logger.info('Starting cloud sync UI initialization');
    initElements();

    // Premium/Pro 구독 사용자는 항상 Cloud Sync 기능 활성화
    if (authState.subscription?.plan) {
      const plan = authState.subscription.plan.toLowerCase();
      if (plan.includes('premium') || plan.includes('pro')) {
        DOM.enableCloudSyncCheckbox.disabled = false;

        // 구독 정보에 cloud_sync 기능 활성화 설정
        ensureCloudSyncFeature(authState.subscription);

        logger.info('Premium subscription user verified - cloud sync enabled');
      }
    }

    // VIP 사용자 확인
    if (authState.subscription?.isVip || authState.subscription?.vip) {
      DOM.enableCloudSyncCheckbox.disabled = false;
      logger.info('VIP user verified - cloud sync enabled');
    }

    // 클라우드 동기화 활성화/비활성화 상태 설정
    const cloudSyncEnabled = config.cloudSync?.enabled !== false;
    DOM.enableCloudSyncCheckbox.checked = cloudSyncEnabled;
    logger.info(`Cloud sync initial state: ${cloudSyncEnabled ? 'enabled' : 'disabled'}`);

    // 현재 동기화 상태 가져오기
    window.settings
      .getSyncStatus()
      .then(status => {
        logger.info('Sync status query result:', status);
        updateSyncStatusUI(status, authState, logger);
      })
      .catch(error => {
        logger.error('동기화 상태 가져오기 오류:', error);
      });

    // 이벤트 리스너 설정
    setupEventListeners(authState, logger);

    logger.info('Cloud sync UI initialization completed');
  } catch (error) {
    logger.error('Cloud sync UI initialization error:', error);
  }
}

/**
 * Cloud Sync 기능이 구독에 포함되어 있는지 확인하고 없으면 추가
 * @param {Object} subscription - 구독 정보
 */
function ensureCloudSyncFeature(subscription) {
  if (!subscription.features) {
    subscription.features = {};
  }
  subscription.features.cloud_sync = true;

  if (!subscription.additionalFeatures) {
    subscription.additionalFeatures = {};
  }
  subscription.additionalFeatures.cloudSync = true;
}

/**
 * 이벤트 리스너 설정
 * @param {Object} authState - 인증 상태
 * @param {Object} logger - 로거
 */
function setupEventListeners(authState, logger) {
  // 클라우드 동기화 활성화/비활성화 토글
  DOM.enableCloudSyncCheckbox.addEventListener('change', () => {
    handleCloudSyncToggle(authState, logger);
  });

  // 수동 동기화 버튼
  DOM.manualSyncUploadButton.addEventListener('click', () => {
    handleManualSyncUpload(logger);
  });

  DOM.manualSyncDownloadButton.addEventListener('click', () => {
    handleManualSyncDownload(logger);
  });

  DOM.manualSyncResolveButton.addEventListener('click', () => {
    handleManualSyncResolve(logger);
  });
}

/**
 * 동기화 상태 UI 업데이트
 * @param {Object} status - 동기화 상태
 * @param {Object} authState - 인증 상태
 * @param {Object} logger - 로거
 */
function updateSyncStatusUI(status, authState, logger) {
  try {
    // 상태 저장
    cloudSyncState.enabled = status.enabled;
    cloudSyncState.deviceId = status.deviceId;
    cloudSyncState.lastSyncTime = status.lastSyncTime;

    // 동기화 권한 확인
    const hasCloudSyncPermission = checkCloudSyncPermission(authState);
    cloudSyncState.hasPermission = hasCloudSyncPermission;

    const canUseCloudSync = hasCloudSyncPermission && authState.isLoggedIn;
    logger.info(`Sync permission check: permission=${hasCloudSyncPermission}, logged in=${authState.isLoggedIn}`);

    // 권한이 없으면 UI 비활성화
    if (!canUseCloudSync) {
      logger.info('No cloud sync permission - UI disabled');
      disableCloudSyncUI(logger);
      return;
    }

    // 동기화 상태 배지 업데이트
    updateStatusBadge(status.enabled);

    // 상태 텍스트 업데이트
    DOM.syncStatusText.textContent = status.enabled ? 'Cloud Sync Enabled' : 'Cloud Sync Disabled';

    // 마지막 동기화 시간 업데이트
    updateLastSyncTime(status.lastSyncTime);

    // 장치 정보 업데이트
    DOM.syncDeviceInfo.textContent = status.deviceId ? `Current Device: ${status.deviceId}` : 'Current Device: Unknown';

    // 컨트롤 활성화/비활성화
    DOM.enableCloudSyncCheckbox.disabled = !canUseCloudSync;
    DOM.enableCloudSyncCheckbox.checked = status.enabled;

    // 동기화 버튼 활성화/비활성화
    const buttonDisabled = !canUseCloudSync || !status.enabled;
    DOM.manualSyncUploadButton.disabled = buttonDisabled;
    DOM.manualSyncDownloadButton.disabled = buttonDisabled;
    DOM.manualSyncResolveButton.disabled = buttonDisabled;

    // 버튼 스타일 업데이트
    updateButtonStyles(buttonDisabled);

    logger.info('Sync status UI update completed');
  } catch (error) {
    logger.error('Sync status UI update error:', error);
  }
}

/**
 * 상태 배지 업데이트
 * @param {boolean} enabled - 동기화 활성화 여부
 */
function updateStatusBadge(enabled) {
  if (enabled) {
    // 활성화 상태 - 애니메이션 스피너 표시
    DOM.syncStatusBadge.textContent = '';
    DOM.syncStatusBadge.className = 'badge premium badge-with-spinner';

    const spinner = document.createElement('div');
    spinner.className = 'spinner-inline';
    DOM.syncStatusBadge.appendChild(spinner);
  } else {
    // 비활성화 상태 - 정지 아이콘 표시
    DOM.syncStatusBadge.textContent = '⏹️';
    DOM.syncStatusBadge.className = 'badge secondary';
  }
}

/**
 * 마지막 동기화 시간 업데이트
 * @param {number} lastSyncTime - 마지막 동기화 시간
 */
function updateLastSyncTime(lastSyncTime) {
  const syncTime = lastSyncTime ? new Date(lastSyncTime) : new Date();
  const formattedDate = formatDate(syncTime);

  DOM.lastSyncedTime.textContent = lastSyncTime ? `Last Synced: ${formattedDate}` : `Sync Status: Ready to sync (${formattedDate})`;
}

/**
 * 날짜 형식화
 * @param {Date} date - 날짜 객체
 * @returns {string} 형식화된 날짜 문자열
 */
function formatDate(date) {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * 버튼 스타일 업데이트
 * @param {boolean} disabled - 비활성화 여부
 */
function updateButtonStyles(disabled) {
  const buttons = [DOM.manualSyncUploadButton, DOM.manualSyncDownloadButton, DOM.manualSyncResolveButton];

  buttons.forEach(button => {
    if (disabled) {
      button.style.backgroundColor = '#cccccc';
      button.style.color = '#666666';
      button.style.cursor = 'not-allowed';
    } else {
      button.style.backgroundColor = '';
      button.style.color = '';
      button.style.cursor = '';
    }
  });
}

/**
 * 클라우드 동기화 UI 비활성화
 * @param {Object} logger - 로거
 */
function disableCloudSyncUI(logger) {
  try {
    DOM.syncStatusBadge.textContent = '⏹️';
    DOM.syncStatusBadge.className = 'badge secondary';
    DOM.syncStatusText.textContent = 'Cloud Sync Disabled';

    // 현재 날짜 표시
    const currentDate = new Date();
    const formattedDate = formatDate(currentDate);
    DOM.lastSyncedTime.textContent = `Sync Status: Not synced (${formattedDate})`;
    DOM.syncDeviceInfo.textContent = 'Current Device: -';

    // 체크박스 비활성화
    DOM.enableCloudSyncCheckbox.checked = false;
    DOM.enableCloudSyncCheckbox.disabled = true;

    // 모든 버튼 비활성화
    DOM.manualSyncUploadButton.disabled = true;
    DOM.manualSyncDownloadButton.disabled = true;
    DOM.manualSyncResolveButton.disabled = true;

    // 버튼 스타일 업데이트
    updateButtonStyles(true);

    logger.info('Cloud sync UI disable completed');
  } catch (error) {
    logger.error('Cloud sync UI disable error:', error);
  }
}

/**
 * 구독 정보에서 클라우드 동기화 권한 확인
 * @param {Object} authState - 인증 상태
 * @returns {boolean} 클라우드 동기화 권한 여부
 */
function checkCloudSyncPermission(authState) {
  let hasPermission = false;

  // 구독 정보 없으면 권한 없음
  if (!authState.subscription) {
    return false;
  }

  // 1. 직접적인 구독 상태 확인
  if (authState.subscription.isSubscribed === true || authState.subscription.active === true || authState.subscription.is_subscribed === true) {
    hasPermission = true;
  }

  // 2. VIP 사용자 확인
  if (authState.subscription.isVip || authState.subscription.vip) {
    hasPermission = true;
  }

  // 3. Premium/Pro 플랜 확인
  if (authState.subscription.plan) {
    const plan = authState.subscription.plan.toLowerCase();
    if (plan.includes('premium') || plan.includes('pro')) {
      hasPermission = true;
    }
  }

  // 4. 특정 기능 확인
  if (authState.subscription.features?.cloud_sync === true || authState.subscription.additionalFeatures?.cloudSync === true) {
    hasPermission = true;
  }

  return hasPermission;
}

/**
 * 로딩 상태 설정
 * @param {boolean} isLoading - 로딩 중 여부
 */
function setLoading(isLoading) {
  cloudSyncState.isLoading = isLoading;

  if (isLoading) {
    DOM.syncLoading.classList.remove('hidden');
  } else {
    DOM.syncLoading.classList.add('hidden');
  }
}

/**
 * 모든 동기화 버튼 비활성화
 */
function disableSyncButtons() {
  DOM.manualSyncUploadButton.disabled = true;
  DOM.manualSyncDownloadButton.disabled = true;
  DOM.manualSyncResolveButton.disabled = true;
}

/**
 * 동기화 버튼 상태 복원
 */
function resetSyncButtons() {
  // 버튼 텍스트 복원
  DOM.manualSyncUploadButton.textContent = 'Upload to Server';
  DOM.manualSyncDownloadButton.textContent = 'Download from Server';
  DOM.manualSyncResolveButton.textContent = 'Resolve Conflicts';

  // 권한에 따른 버튼 활성화/비활성화
  const buttonDisabled = !cloudSyncState.hasPermission || !cloudSyncState.enabled;
  DOM.manualSyncUploadButton.disabled = buttonDisabled;
  DOM.manualSyncDownloadButton.disabled = buttonDisabled;
  DOM.manualSyncResolveButton.disabled = buttonDisabled;
}

/**
 * 클라우드 동기화 활성화/비활성화 처리
 * @param {Object} authState - 인증 상태
 * @param {Object} logger - 로거
 */
function handleCloudSyncToggle(authState, logger) {
  const enabled = DOM.enableCloudSyncCheckbox.checked;
  logger.info(`Cloud sync status change: ${enabled ? 'enabled' : 'disabled'}`);

  // 로딩 표시 및 체크박스 비활성화
  setLoading(true);
  DOM.enableCloudSyncCheckbox.disabled = true;

  // 서버에 상태 동기화
  window.settings
    .setCloudSyncEnabled(enabled)
    .then(() =>
      // 상태 업데이트 후 UI 갱신
      window.settings.getSyncStatus(),
    )
    .then(status => {
      // UI 업데이트
      updateSyncStatusUI(status, authState, logger);
      logger.info('Cloud sync status change successful');
    })
    .catch(error => {
      logger.error('Cloud sync status change error:', error);
      // 오류 시 상태 복원
      DOM.enableCloudSyncCheckbox.checked = !enabled;
    })
    .finally(() => {
      // 로딩 숨김 및 컨트롤 활성화
      setLoading(false);
      DOM.enableCloudSyncCheckbox.disabled = false;
    });
}

/**
 * 서버에 설정 업로드 처리
 * @param {Object} logger - 로거
 */
function handleManualSyncUpload(logger) {
  logger.info('Manual sync - upload started');

  // 로딩 표시 및 버튼 비활성화
  setLoading(true);
  disableSyncButtons();

  // 업로드 실행
  window.settings
    .manualSync('upload')
    .then(result => {
      if (result.success) {
        logger.info('Settings upload successful');
        DOM.manualSyncUploadButton.textContent = 'Upload Complete!';
      } else {
        logger.error('Settings upload failed:', result.error);
        // 오류가 객체인 경우 JSON 문자열로 변환하거나 메시지 속성 사용
        let errorMessage = 'Unknown error';
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
      logger.error('Settings upload error:', error);
      DOM.manualSyncUploadButton.textContent = 'Upload Failed';
    })
    .finally(() => {
      // 상태 복원
      setLoading(false);

      setTimeout(() => {
        resetSyncButtons();
      }, 1500);
    });
}

/**
 * 서버에서 설정 다운로드 처리
 * @param {Object} logger - 로거
 */
function handleManualSyncDownload(logger) {
  logger.info('Manual sync - download started');

  // 확인 대화상자
  if (!confirm('Downloading settings from the server will overwrite your local settings. Do you want to continue?')) {
    logger.info('User canceled the download');
    return;
  }

  // 로딩 표시 및 버튼 비활성화
  setLoading(true);
  disableSyncButtons();

  // 다운로드 실행
  window.settings
    .manualSync('download')
    .then(result => {
      if (result.success) {
        logger.info('Settings download successful');
        DOM.manualSyncDownloadButton.textContent = 'Download Complete!';

        // 설정 다시 로드
        return window.settings.getConfig();
      } else {
        logger.error('Settings download failed:', result.error);
        // 오류가 객체인 경우 JSON 문자열로 변환하거나 메시지 속성 사용
        let errorMessage = 'Unknown error';
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
      // 이벤트 발생 - 설정 로드
      window.dispatchEvent(new CustomEvent('config-loaded', { detail: loadedConfig }));
      logger.info('New settings loaded and event triggered');
    })
    .catch(error => {
      logger.error('Settings download error:', error);
      DOM.manualSyncDownloadButton.textContent = 'Download Failed';
    })
    .finally(() => {
      // 상태 복원
      setLoading(false);

      setTimeout(() => {
        resetSyncButtons();
      }, 1500);
    });
}

/**
 * 설정 충돌 해결 처리
 * @param {Object} logger - 로거
 */
function handleManualSyncResolve(logger) {
  logger.info('Manual sync - conflict resolution started');

  // 확인 대화상자
  if (
    !confirm('This will resolve conflicts between local and server settings. Settings with more recent timestamps will be applied. Do you want to continue?')
  ) {
    logger.info('User canceled the conflict resolution');
    return;
  }

  // 로딩 표시 및 버튼 비활성화
  setLoading(true);
  disableSyncButtons();

  // 충돌 해결 실행
  window.settings
    .manualSync('resolve')
    .then(result => {
      if (result.success) {
        logger.info('Settings conflict resolution successful');
        DOM.manualSyncResolveButton.textContent = 'Resolved!';

        // 설정 다시 로드
        return window.settings.getConfig();
      } else {
        logger.error('Settings conflict resolution failed:', result.error);
        // 오류가 객체인 경우 JSON 문자열로 변환하거나 메시지 속성 사용
        let errorMessage = 'Unknown error';
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
      // 이벤트 발생 - 설정 로드
      window.dispatchEvent(new CustomEvent('config-loaded', { detail: loadedConfig }));
      logger.info('Merged settings loaded and event triggered');
    })
    .catch(error => {
      logger.error('Settings conflict resolution error:', error);
      DOM.manualSyncResolveButton.textContent = 'Resolution Failed';
    })
    .finally(() => {
      // 상태 복원
      setLoading(false);

      setTimeout(() => {
        resetSyncButtons();
      }, 1500);
    });
}

// 모듈 내보내기
window.cloudSyncUI = {
  initializeCloudSyncUI,
  updateSyncStatusUI,
  disableCloudSyncUI,
};
