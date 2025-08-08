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
  } catch (error) {
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

  // 업데이트 확인 요청 (개선된 updater 사용)
  window.settings
    .checkForUpdates()
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
            const trimmedNotes = plainText.length > maxLength ? plainText.substring(0, maxLength) + '...' : plainText;

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
 * 업데이트 다운로드
 */
export function handleDownloadUpdate() {
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
export function handleInstallUpdate() {
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
        window.settings.installUpdate().catch(error => {
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
export function handleInstallError(error) {
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
      window.settings.openUrl('https://toastapp.io');
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
