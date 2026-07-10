/**
 * Settings - About Settings Management
 */

import {
  appVersionElement,
  homepageButton,
  checkUpdatesButton,
  updateMessage,
  updateStatus,
  updateActions,
  alternativeUpdates,
  copyBrewCommand,
  downloadUpdateButton,
  installUpdateButton,
  updateLoading,
} from './dom-elements.js';
import { formatFileSize } from './utils.js';

/**
 * Initialize About tab with version information
 */
export function initializeAboutSettings() {
  window.settings.log.info('initializeAboutSettings 호출');

  try {
    // 버전 표시
    if (appVersionElement) {
      // 앱 버전 가져오기
      window.settings
        .getVersion()
        .then(version => {
          // 버전 정보 표시
          appVersionElement.innerHTML = `<strong>${version}</strong>`;
          window.settings.log.info(`앱 버전 정보: ${version}`);
        })
        .catch(error => {
          window.settings.log.error('버전 정보를 가져오는 중 오류 발생:', error);
          appVersionElement.innerHTML = '<strong>Version information unavailable</strong>';
        });
    }

    // 업데이트 상태 초기화
    resetUpdateUI();
  }
  catch (error) {
    window.settings.log.error('정보 탭 초기화 중 오류 발생:', error);
  }
}

/**
 * 업데이트 UI 초기화
 */
export function resetUpdateUI() {
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
export function handleCheckForUpdates() {
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

  // 업데이트 확인 후, 새 버전이 있으면 묻지 않고 다운로드 → 설치 → 재시작까지 자동 진행
  window.settings
    .checkForUpdates()
    .then(result => {
      window.settings.log.info('업데이트 확인 결과:', result);

      if (result.hasUpdate) {
        const latestVersion = result.versionInfo?.latest || result.updateInfo?.version || 'new version';
        const currentVersion = result.versionInfo?.current || 'current';

        if (updateMessage) {
          let messageText = `New version available (${currentVersion} → ${latestVersion}). Downloading...`;
          if (result.files && Array.isArray(result.files) && result.files.length > 0) {
            messageText += ` (${formatFileSize(result.files[0].size || 0)})`;
          }
          updateMessage.textContent = messageText;
        }

        // 자동으로 다운로드 → 설치 → 재시작 진행 (check 버튼은 비활성 유지)
        handleDownloadUpdate(latestVersion);
      }
      else {
        // 업데이트가 없는 경우
        if (updateMessage) {
          updateMessage.textContent = 'You are using the latest version.';
        }
        finishCheckFlow();
      }
    })
    .catch(error => {
      window.settings.log.error('업데이트 확인 오류:', error);

      // 오류 메시지 표시
      if (updateMessage) {
        updateMessage.textContent = 'Error checking for updates: ' + (error.message || 'Unknown error');
      }
      finishCheckFlow();
    });
}

/**
 * 확인/자동 업데이트 플로우 종료 처리 (로딩 숨김 + 버튼 재활성화)
 */
function finishCheckFlow() {
  if (updateLoading) {
    updateLoading.className = 'loading-indicator hidden';
  }
  if (checkUpdatesButton) {
    checkUpdatesButton.disabled = false;
  }
}

/**
 * 업데이트 다운로드
 */
export function handleDownloadUpdate(version) {
  // Called both directly with a real version string and as a DOM click
  // handler (the "Try Again" button), which passes a MouseEvent as the
  // first argument — only treat an actual string as a version to display.
  version = typeof version === 'string' ? version : undefined;

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
    updateMessage.textContent = version ? `Downloading update ${version}...` : 'Downloading update...';
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

  // 다운로드 진행률 이벤트 리스너 추가 (preload가 CustomEvent로 재발행하므로 detail에서 데이터 추출)
  const progressListener = event => {
    const data = event.detail;
    if (data && data.progress && progressElement) {
      const percent = Math.round(data.progress.percent);
      const progressBar = progressElement.querySelector('.progress-bar');
      const progressText = progressElement.querySelector('.progress-text');

      if (progressBar) {
        progressBar.style.width = `${percent}%`;
      }
      if (progressText) {
        progressText.textContent = data.progress.formattedPercent ? `${data.progress.formattedPercent} (${data.progress.formattedSpeed || ''})` : `${percent}%`;
      }
    }
  };

  // 이벤트 리스너 등록
  window.addEventListener('download-progress', progressListener);

  // 업데이트 다운로드
  window.settings
    .downloadUpdate()
    .then(result => {
      window.settings.log.info('업데이트 다운로드 결과:', result);

      if (result.success) {
        // 다운로드 성공 → 묻지 않고 바로 설치/재시작 진행
        if (updateMessage) {
          // 진행 상태 표시 요소 제거
          if (progressElement && progressElement.parentNode) {
            progressElement.parentNode.removeChild(progressElement);
          }

          updateMessage.textContent = `Download complete (${result.version || version || 'new version'}). Installing...`;
        }

        handleInstallUpdate();
      }
      else {
        // 다운로드 실패
        // 오류가 객체인 경우 JSON 문자열로 변환하거나 메시지 속성 사용
        let errorMessage = '업데이트 다운로드 실패';
        if (result.error) {
          if (typeof result.error === 'object') {
            errorMessage = result.error.message || JSON.stringify(result.error);
          }
          else {
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

      // 재시도 버튼 표시 + 확인 버튼 재활성화
      if (downloadUpdateButton) {
        downloadUpdateButton.style.display = 'inline-block';
        downloadUpdateButton.textContent = 'Try Again';
        downloadUpdateButton.disabled = false;
      }
      finishCheckFlow();
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
export function handleInstallUpdate() {
  window.settings.log.info('업데이트 설치 시작 (재시작)');

  // 설치 버튼 비활성화 (오류 복구 경로로 노출된 경우)
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
    updateMessage.textContent = 'Installing update...';
  }

  // 설치 대기 상태 표시 - 설치 준비(Squirrel 스테이징)에는 진행률 이벤트가 없어
  // 앱이 종료될 때까지 부정형 프로그레스바와 안내 메시지를 보여준다
  const closingMessage = document.createElement('div');
  closingMessage.className = 'update-closing-message';
  closingMessage.innerHTML = `
    <div class="download-progress-bar">
      <div class="progress-container">
        <div class="progress-bar indeterminate"></div>
      </div>
      <div class="progress-text">Installing... The app will close and restart automatically. This may take up to 30 seconds.</div>
    </div>
  `;
  if (updateMessage.parentNode) {
    updateMessage.parentNode.appendChild(closingMessage);
  }

  try {
    // 업데이트 설치 (앱 재시작) — 묻지 않고 바로 진행
    window.settings
      .installUpdate()
      .then(result => {
        // 메인 프로세스가 실패를 resolve로 반환하는 경우도 오류로 처리
        if (result && result.success === false) {
          window.settings.log.error('업데이트 설치 실패:', result.error);
          handleInstallError(new Error(result.error || 'Failed to install update'));
        }
      })
      .catch(error => {
        window.settings.log.error('업데이트 설치 오류:', error);
        handleInstallError(error);
      });
  }
  catch (error) {
    window.settings.log.error('업데이트 설치 과정에서 예외 발생:', error);
    handleInstallError(error);
  }
}

/**
 * 업데이트 설치 오류 처리
 */
export function handleInstallError(error) {
  // 설치 중 표시(카운트다운/부정형 프로그레스바) 제거
  document.querySelectorAll('.update-closing-message').forEach(el => el.remove());

  // 오류 메시지 표시
  if (updateMessage) {
    // 기존 메시지 내용 저장
    const originalContent = updateMessage.textContent;

    // 오류 메시지 설정
    updateMessage.textContent = '';
    const errorLabel = document.createElement('span');
    errorLabel.className = 'error-message';
    errorLabel.textContent = 'Error occurred while installing update:';
    updateMessage.appendChild(errorLabel);
    updateMessage.appendChild(document.createTextNode(` ${error.message || 'Unknown error'}`));

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

  // 로딩 숨기기 + 확인 버튼 재활성화
  finishCheckFlow();

  // 오류 로그 자세히 기록
  window.settings.log.error('업데이트 설치 오류 세부 정보:', {
    message: error.message,
    name: error.name,
    stack: error.stack,
    code: error.code,
  });
}

/**
 * Setup about settings event listeners
 */
export function setupAboutEventListeners() {
  // About 탭 관련 버튼
  if (homepageButton) {
    homepageButton.addEventListener('click', () => {
      window.settings.openUrl('https://app.toast.sh');
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

  // 대체 업데이트 방법 관련 버튼
  if (copyBrewCommand) {
    copyBrewCommand.addEventListener('click', () => {
      const command = 'brew upgrade opspresso/tap/toast';
      navigator.clipboard
        .writeText(command)
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
}
