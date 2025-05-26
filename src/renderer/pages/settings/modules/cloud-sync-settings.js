/**
 * Settings - Cloud Sync Settings Management
 */

import {
  syncStatusBadge,
  syncStatusText,
  lastSyncedTime,
  syncDeviceInfo,
  enableCloudSyncCheckbox,
  manualSyncUploadButton,
  manualSyncDownloadButton,
  manualSyncResolveButton,
  syncLoading
} from './dom-elements.js';
import { config, authState, updateConfig } from './state.js';
import { setLoading } from './utils.js';

/**
 * Initialize Cloud Sync UI
 */
export function initializeCloudSyncUI() {
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

/**
 * Handle Cloud Sync toggle
 */
export function handleCloudSyncToggle() {
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
export function handleManualSyncUpload() {
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
export function handleManualSyncDownload() {
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
        updateConfig(loadedConfig);
        // UI 초기화는 동적 import로 처리
        import('../index.js').then(({ initializeUI }) => {
          initializeUI();
        });
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
export function handleManualSyncResolve() {
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
        updateConfig(loadedConfig);
        // UI 초기화는 동적 import로 처리
        import('../index.js').then(({ initializeUI }) => {
          initializeUI();
        });
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
 * Setup cloud sync event listeners
 */
export function setupCloudSyncEventListeners() {
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
}

/**
 * Update Cloud Sync status UI
 * @param {Object} status - Cloud Sync status object
 */
export function updateSyncStatusUI(status) {
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
export function disableCloudSyncUI() {
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
