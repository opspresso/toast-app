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
  editButtonScriptTypeSelect,
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
import { UI_ICONS } from './constants.js';
import { captureButtonEditRequest, syncModalState, keepFocusInModal } from './modal-state.js';
import { showStatus } from './utils.js';
import { hideProfileModal, handleLogout } from './auth.js';
import { updateButtonIconFromLocalApp, isLocalIconExtractionSupported, getAppNameFromOpenCommand } from './local-icon-utils.js';
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

    // Detect the 'open -a AppName' pattern in exec actions
    if (editButtonActionSelect.value === 'exec' && command) {
      // Supports various patterns: open -a AppName, open -a "App Name", open -a domain.com
      const appName = getAppNameFromOpenCommand(command);
      if (appName) {
        // Only run when the icon is empty and local icon extraction is supported
        if (!editButtonIconInput.value.trim() && isLocalIconExtractionSupported()) {
          try {
            // Resolve the application name in the main process
            const appPath = appName;

            // Attempt icon extraction
            const success = await updateButtonIconFromLocalApp(appPath, editButtonIconInput, editButtonNameInput);

            if (success) {
              showStatus(`The ${appName} icon has been set automatically.`, 'success');
            }
          } catch (error) {
            console.warn(`Failed to extract ${appName} icon:`, error);
          }
        }
      }
    }

    // Update the icon preview
    updateIconPreview();
  });

  // Application input change event for automatic icon extraction
  editButtonApplicationInput.addEventListener('input', async () => {
    const applicationPath = editButtonApplicationInput.value.trim();

    // When an application path is set in an application action
    if (editButtonActionSelect.value === 'application' && applicationPath) {
      // Only run when the icon is empty and local icon extraction is supported
      if (!editButtonIconInput.value.trim() && isLocalIconExtractionSupported()) {
        try {
          // Attempt icon extraction
          const success = await updateButtonIconFromLocalApp(applicationPath, editButtonIconInput, editButtonNameInput);

          if (success) {
            const appName = extractAppNameFromPath(applicationPath);
            showStatus(`The ${appName} icon has been set automatically.`, 'success');
          }
        } catch (error) {
          console.warn('Failed to extract application icon:', error);
        }
      }
    }

    // Update the icon preview
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
    } catch (err) {
      return null;
    }
  }

  // Switch input fields based on action type
  editButtonActionSelect.addEventListener('change', () => {
    showActionFields(editButtonActionSelect.value);
    // Update the preview when the action type changes
    updateIconPreview();
  });

  editButtonScriptTypeSelect.addEventListener('change', () => {
    showActionFields(editButtonActionSelect.value);
  });

  // Browse button for application selection
  if (browseApplicationButton) {
    browseApplicationButton.addEventListener('click', async () => {
      const isCurrent = captureButtonEditRequest(() =>
        JSON.stringify([editButtonActionSelect.value, editButtonApplicationInput.value, editButtonApplicationInput.disabled]),
      );
      if (!isCurrent() || editButtonApplicationInput.disabled) {
        return;
      }
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
        if (!isCurrent()) {
          return;
        }
        if (result.error) {
          throw new Error(result.error);
        }

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
                showStatus('The icon and button name have been set automatically.', 'success');
              }
            } catch (error) {
              console.warn('Automatic icon extraction failed:', error);
            }
          }
        }
      } catch (error) {
        if (!isCurrent()) {
          return;
        }
        console.error('Error selecting application:', error);
      }
    });
  }

  // Browse button for path selection
  if (browsePathButton) {
    browsePathButton.addEventListener('click', async () => {
      const isCurrent = captureButtonEditRequest(() => JSON.stringify([editButtonActionSelect.value, editButtonPathInput.value, editButtonPathInput.disabled]));
      if (!isCurrent() || editButtonPathInput.disabled) {
        return;
      }
      try {
        // Configure file/folder selection dialog options
        const options = {
          title: 'Select File or Folder',
          defaultPath: window.toast?.platform === 'darwin' ? '/Users' : 'C:\\',
          properties: ['openFile', 'openDirectory'], // Select file or folder
        };

        // Call file selection dialog directly without window manipulation
        const result = await window.toast.showOpenDialog(options);
        if (!isCurrent()) {
          return;
        }
        if (result.error) {
          throw new Error(result.error);
        }

        if (!result.canceled && result.filePaths.length > 0) {
          // Set selected path to input field
          editButtonPathInput.value = result.filePaths[0];
          showStatus('File/folder selected successfully.', 'success');
        } else {
          showStatus('File/folder selection canceled.', 'info');
        }
      } catch (error) {
        if (!isCurrent()) {
          return;
        }
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
    keepFocusInModal(event);
    if (event.defaultPrevented) {
      return;
    }
    if (event.key === 'Escape') {
      // Close modals according to priority
      if (confirmModal.classList.contains('show')) {
        closeConfirmModal();
        event.preventDefault();
        event.stopImmediatePropagation();
      } else if (iconSearchModal.classList.contains('show')) {
        closeIconSearchModal();
        event.preventDefault();
        event.stopImmediatePropagation();
      } else if (buttonEditModal.classList.contains('show')) {
        closeButtonEditModal();
        event.preventDefault();
        event.stopImmediatePropagation();
      } else if (profileModal.classList.contains('show')) {
        hideProfileModal();
        event.preventDefault();
        event.stopImmediatePropagation();
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
      const isCurrent = captureButtonEditRequest();
      if (!isCurrent()) {
        return;
      }
      try {
        const actionType = editButtonActionSelect.value;
        let applicationPath = null;

        // Get application path based on action type
        if (actionType === 'application') {
          applicationPath = editButtonApplicationInput.value.trim();
          if (!applicationPath) {
            showStatus('Please select an application first.', 'warning');
            return;
          }
        } else if (actionType === 'exec') {
          // Extract app name from 'open -a AppName' command
          const command = editButtonCommandInput.value.trim();
          const appName = getAppNameFromOpenCommand(command);
          if (appName) {
            applicationPath = appName;
          } else {
            showStatus('exec actions require a command in the form "open -a AppName".', 'warning');
            return;
          }
        } else {
          showStatus('Icon extraction is only supported for Application or Exec actions.', 'warning');
          return;
        }

        if (!isLocalIconExtractionSupported()) {
          showStatus('Icon extraction is only supported on macOS.', 'warning');
          return;
        }

        // Disable button during extraction
        reloadIconButton.disabled = true;
        reloadIconButton.innerHTML = '⏳';
        reloadIconButton.title = 'Extracting icon...';

        // Force refresh icon extraction
        const success = await updateButtonIconFromLocalApp(
          applicationPath,
          editButtonIconInput,
          editButtonNameInput,
          true, // forceRefresh = true
        );

        if (success) {
          showStatus('The icon has been refreshed successfully.', 'success');
        } else if (success === false && isCurrent()) {
          showStatus('Failed to refresh the icon.', 'error');
        }
      } catch (error) {
        if (!isCurrent()) {
          return;
        }
        console.error('Icon reload error:', error);
        showStatus('An error occurred while refreshing the icon.', 'error');
      } finally {
        if (isCurrent()) {
          reloadIconButton.disabled = editButtonIconInput.disabled;
          reloadIconButton.innerHTML = UI_ICONS.refresh;
          reloadIconButton.title = 'Reload Icon from Application';
        }
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
let settleConfirmation = null;

export function showConfirmModal(title = 'Confirm', message = 'Are you sure?', okButtonText = 'Delete') {
  if (settleConfirmation) {
    settleConfirmation(false);
  }
  return new Promise(resolve => {
    confirmTitle.textContent = title;
    confirmMessage.textContent = message;
    confirmOkButton.textContent = okButtonText;
    let finished = false;
    const finish = confirmed => {
      if (finished) {
        return;
      }
      finished = true;
      confirmCancelButton.removeEventListener('click', cancel);
      confirmOkButton.removeEventListener('click', accept);
      confirmModal.removeEventListener('click', outside);
      if (settleConfirmation === finish) {
        settleConfirmation = null;
      }
      confirmModal.classList.remove('show');
      syncModalState();
      resolve(confirmed);
    };
    const cancel = () => finish(false);
    const accept = () => finish(true);
    const outside = event => {
      if (event.target === confirmModal) {
        finish(false);
      }
    };
    settleConfirmation = finish;
    confirmCancelButton.addEventListener('click', cancel);
    confirmOkButton.addEventListener('click', accept);
    confirmModal.addEventListener('click', outside);
    confirmModal.classList.add('show');
    syncModalState();
    confirmCancelButton.focus();
  });
}

export function closeConfirmModal() {
  if (settleConfirmation) {
    settleConfirmation(false);
  } else {
    confirmModal.classList.remove('show');
    syncModalState();
  }
}
