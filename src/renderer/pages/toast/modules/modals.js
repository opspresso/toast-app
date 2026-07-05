/**
 * Toast - Modal Management Functions
 */

import {
  buttonEditModal,
  iconSearchModal,
  closeButtonEdit,
  saveButtonEdit,
  cancelButtonEdit,
  editButtonNameInput,
  editButtonIconInput,
  editButtonActionSelect,
  editButtonCommandInput,
  editButtonUrlInput,
  editButtonPathInput,
  editButtonApplicationInput,
  browsePathButton,
  browseApplicationButton,
  profileModal,
  closeProfileModal,
  closeProfileButton,
  logoutButton,
  confirmModal,
  confirmTitle,
  confirmMessage,
  confirmCancelButton,
  confirmOkButton,
  reloadIconButton,
} from './dom-elements.js';
import { showStatus } from './utils.js';
import { hideProfileModal, handleLogout } from './auth.js';
import { updateButtonIconFromLocalApp, isLocalIconExtractionSupported } from './local-icon-utils.js';
import { closeButtonEditModal, showActionFields, saveButtonSettings } from './modals-button-edit.js';
import { setupIconSearchModal, closeIconSearchModal, updateIconPreview } from './modals-icon-browser.js';

// State variables
let eventListenersSetup = false;

/**
 * Initialize modal and set up event listeners
 */
export function setupModalEventListeners() {
  // Prevent duplicate event listener registration
  if (eventListenersSetup) {
    return;
  }
  eventListenersSetup = true;
  // Close button edit
  closeButtonEdit.addEventListener('click', () => {
    closeButtonEditModal();
  });

  // Cancel button
  cancelButtonEdit.addEventListener('click', () => {
    closeButtonEditModal();
  });

  // Save button
  saveButtonEdit.addEventListener('click', saveButtonSettings);

  // Command input change event for exec action
  editButtonCommandInput.addEventListener('input', async () => {
    const command = editButtonCommandInput.value.trim();

    // exec 액션에서 'open -a AppName' 패턴 감지
    if (editButtonActionSelect.value === 'exec' && command) {
      // 다양한 패턴 지원: open -a AppName, open -a "App Name", open -a domain.com
      const openAppMatch = command.match(/^open\s+-a\s+(?:"([^"]+)"|([\w\s.-]+))/);
      if (openAppMatch) {
        const appName = (openAppMatch[1] || openAppMatch[2]).trim();
        console.log('Detected app name:', appName, 'from command:', command);

        // 아이콘이 비어있고 로컬 아이콘 추출이 지원되는 경우에만 실행
        console.log('Icon input value:', editButtonIconInput.value.trim());
        console.log('Is local icon extraction supported:', isLocalIconExtractionSupported());
        console.log('Platform:', window.toast?.platform);
        console.log('extractAppIcon function:', typeof window.toast?.extractAppIcon);

        if (!editButtonIconInput.value.trim() && isLocalIconExtractionSupported()) {
          try {
            // /Applications/AppName.app 경로 생성
            const appPath = `/Applications/${appName}.app`;

            // 아이콘 추출 시도
            const success = await updateButtonIconFromLocalApp(appPath, editButtonIconInput, editButtonNameInput);

            if (success) {
              showStatus(`${appName} 아이콘이 자동으로 설정되었습니다.`, 'success');
            }
          }
          catch (error) {
            console.warn(`${appName} 아이콘 추출 실패:`, error);
          }
        }
      }
    }

    // 아이콘 미리보기 업데이트
    updateIconPreview();
  });

  // Application input change event for automatic icon extraction
  editButtonApplicationInput.addEventListener('input', async () => {
    const applicationPath = editButtonApplicationInput.value.trim();

    // application 액션에서 애플리케이션 경로가 설정되었을 때
    if (editButtonActionSelect.value === 'application' && applicationPath) {
      // 아이콘이 비어있고 로컬 아이콘 추출이 지원되는 경우에만 실행
      if (!editButtonIconInput.value.trim() && isLocalIconExtractionSupported()) {
        try {
          // 아이콘 추출 시도
          const success = await updateButtonIconFromLocalApp(applicationPath, editButtonIconInput, editButtonNameInput);

          if (success) {
            const appName = extractAppNameFromPath(applicationPath);
            showStatus(`${appName} 아이콘이 자동으로 설정되었습니다.`, 'success');
          }
        }
        catch (error) {
          console.warn('애플리케이션 아이콘 추출 실패:', error);
        }
      }
    }

    // 아이콘 미리보기 업데이트
    updateIconPreview();
  });

  // Helper function to extract app name from path
  function extractAppNameFromPath(applicationPath) {
    if (!applicationPath) {
      return null;
    }

    try {
      if (applicationPath.endsWith('.app')) {
        return applicationPath.split('/').pop().replace('.app', '');
      }
      return applicationPath.split('/').pop().split('.')[0];
    }
    catch (err) {
      return null;
    }
  }

  // Switch input fields based on action type
  editButtonActionSelect.addEventListener('change', () => {
    showActionFields(editButtonActionSelect.value);
    // 액션 타입 변경 시 미리보기 업데이트
    updateIconPreview();
  });

  // Browse button for application selection
  if (browseApplicationButton) {
    browseApplicationButton.addEventListener('click', async () => {
      try {
        // Set Application folder as default path
        const defaultPath = window.toast?.platform === 'darwin' ? '/Applications' : 'C:\\Program Files';

        // Configure file selection dialog options
        const options = {
          title: 'Select Application',
          defaultPath,
          properties: ['openFile'],
          filters: window.toast?.platform === 'darwin' ? [{ name: 'Applications', extensions: ['app'] }] : [{ name: 'Executable Files', extensions: ['exe'] }],
        };

        // Call file selection dialog directly without window manipulation
        const result = await window.toast.showOpenDialog(options);

        if (!result.canceled && result.filePaths.length > 0) {
          // Set selected application path to input field
          editButtonApplicationInput.value = result.filePaths[0];

          // Application selected successfully
          showStatus('Application selected successfully.', 'success');

          // Auto-extract icon if supported and icon field is empty
          if (isLocalIconExtractionSupported() && !editButtonIconInput.value.trim()) {
            try {
              const success = await updateButtonIconFromLocalApp(result.filePaths[0], editButtonIconInput, editButtonNameInput);
              if (success) {
                showStatus('아이콘과 버튼 이름이 자동으로 설정되었습니다.', 'success');
              }
            }
            catch (error) {
              console.warn('자동 아이콘 추출 실패:', error);
            }
          }
        }
      }
      catch (error) {
        console.error('Error selecting application:', error);
      }
    });
  }

  // Browse button for path selection
  if (browsePathButton) {
    browsePathButton.addEventListener('click', async () => {
      try {
        // Configure file/folder selection dialog options
        const options = {
          title: 'Select File or Folder',
          defaultPath: window.toast?.platform === 'darwin' ? '/Users' : 'C:\\',
          properties: ['openFile', 'openDirectory'], // Select file or folder
        };

        // Call file selection dialog directly without window manipulation
        const result = await window.toast.showOpenDialog(options);

        if (!result.canceled && result.filePaths.length > 0) {
          // Set selected path to input field
          editButtonPathInput.value = result.filePaths[0];
          showStatus('File/folder selected successfully.', 'success');
        }
        else {
          showStatus('File/folder selection canceled.', 'info');
        }
      }
      catch (error) {
        console.error('Error selecting file or folder:', error);
        showStatus('An error occurred while selecting the file or folder.', 'error');
      }
    });
  }

  // Close on click outside modal
  buttonEditModal.addEventListener('click', event => {
    if (event.target === buttonEditModal) {
      closeButtonEditModal();
    }
  });

  // Close icon search modal when clicking outside
  iconSearchModal.addEventListener('click', event => {
    if (event.target === iconSearchModal) {
      closeIconSearchModal();
    }
  });

  // Close modal with ESC key
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      // Close modals according to priority
      if (confirmModal.classList.contains('show')) {
        closeConfirmModal();
        event.stopPropagation();
      }
      else if (iconSearchModal.classList.contains('show')) {
        closeIconSearchModal();
        event.stopPropagation();
      }
      else if (buttonEditModal.classList.contains('show')) {
        closeButtonEditModal();
        event.stopPropagation();
      }
      else if (profileModal.classList.contains('show')) {
        hideProfileModal();
        event.stopPropagation();
      }
    }
  });

  // Set up profile modal related event listeners
  closeProfileModal.addEventListener('click', hideProfileModal);
  closeProfileButton.addEventListener('click', hideProfileModal);
  logoutButton.addEventListener('click', handleLogout);

  // Icon reload button event listener
  if (reloadIconButton) {
    reloadIconButton.addEventListener('click', async () => {
      try {
        const actionType = editButtonActionSelect.value;
        let applicationPath = null;

        // Get application path based on action type
        if (actionType === 'application') {
          applicationPath = editButtonApplicationInput.value.trim();
          if (!applicationPath) {
            showStatus('애플리케이션을 먼저 선택해주세요.', 'warning');
            return;
          }
        }
        else if (actionType === 'exec') {
          // Extract app name from 'open -a AppName' command
          const command = editButtonCommandInput.value.trim();
          const openAppMatch = command.match(/^open\s+-a\s+(?:"([^"]+)"|([\w\s.-]+))/);
          if (openAppMatch) {
            const appName = (openAppMatch[1] || openAppMatch[2]).trim();
            applicationPath = `/Applications/${appName}.app`;
          }
          else {
            showStatus('exec 액션에서는 "open -a AppName" 형태의 명령어가 필요합니다.', 'warning');
            return;
          }
        }
        else {
          showStatus('아이콘 추출은 Application 또는 Exec 액션에서만 지원됩니다.', 'warning');
          return;
        }

        if (!isLocalIconExtractionSupported()) {
          showStatus('아이콘 추출은 macOS에서만 지원됩니다.', 'warning');
          return;
        }

        // Disable button during extraction
        reloadIconButton.disabled = true;
        const originalText = reloadIconButton.innerHTML;
        reloadIconButton.innerHTML = '⏳';
        reloadIconButton.title = '아이콘 추출 중...';

        // Force refresh icon extraction
        const success = await updateButtonIconFromLocalApp(
          applicationPath,
          editButtonIconInput,
          editButtonNameInput,
          true, // forceRefresh = true
        );

        if (success) {
          showStatus('아이콘이 성공적으로 새로고침되었습니다.', 'success');
        }
        else {
          showStatus('아이콘 새로고침에 실패했습니다.', 'error');
        }
      }
      catch (error) {
        console.error('아이콘 리로드 오류:', error);
        showStatus('아이콘 새로고침 중 오류가 발생했습니다.', 'error');
      }
      finally {
        // Re-enable button
        reloadIconButton.disabled = false;
        reloadIconButton.innerHTML = '🔄';
        reloadIconButton.title = 'Reload Icon from Application';
      }
    });
  }

  // Icon input change event listener for preview
  if (editButtonIconInput) {
    editButtonIconInput.addEventListener('input', updateIconPreview);
  }

  // URL input change event listener for favicon preview
  if (editButtonUrlInput) {
    editButtonUrlInput.addEventListener('input', updateIconPreview);
  }

  // Command input change event listener for preview update
  if (editButtonCommandInput) {
    editButtonCommandInput.addEventListener('input', updateIconPreview);
  }

  // Icon search modal event listeners
  setupIconSearchModal();
}

/**
 * Show confirm modal
 * @param {string} title - Modal title
 * @param {string} message - Confirmation message
 * @param {string} okButtonText - OK button text (default: 'Delete')
 * @returns {Promise<boolean>} - Returns true if confirmed, false if canceled
 */
export function showConfirmModal(title = 'Confirm', message = 'Are you sure?', okButtonText = 'Delete') {
  return new Promise(resolve => {
    // Set modal content
    confirmTitle.textContent = title;
    confirmMessage.textContent = message;
    confirmOkButton.textContent = okButtonText;

    // Store event handlers for cleanup
    let cleanupCalled = false;

    // Cleanup function to remove event listeners and close modal
    const cleanup = () => {
      if (cleanupCalled) {
        return;
      }
      cleanupCalled = true;
      confirmCancelButton.removeEventListener('click', cancelHandler);
      confirmOkButton.removeEventListener('click', okHandler);
      confirmModal.removeEventListener('click', outsideClickHandler);
      closeConfirmModal();
    };

    // Define event handlers
    const cancelHandler = () => {
      cleanup();
      resolve(false);
    };

    const okHandler = () => {
      cleanup();
      resolve(true);
    };

    const outsideClickHandler = event => {
      if (event.target === confirmModal) {
        cleanup();
        resolve(false);
      }
    };

    // Add event listeners
    confirmCancelButton.addEventListener('click', cancelHandler);
    confirmOkButton.addEventListener('click', okHandler);
    confirmModal.addEventListener('click', outsideClickHandler);

    // Show modal
    confirmModal.classList.add('show');
    window.toast.setModalOpen(true);

    // Focus on cancel button by default
    setTimeout(() => {
      confirmCancelButton.focus();
    }, 100);
  });
}

/**
 * Close confirm modal
 */
export function closeConfirmModal() {
  confirmModal.classList.remove('show');
  window.toast.setModalOpen(false);
}
