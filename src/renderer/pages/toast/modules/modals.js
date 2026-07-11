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
import { UI_ICONS } from './constants.js';
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

    // Detect the 'open -a AppName' pattern in exec actions
    if (editButtonActionSelect.value === 'exec' && command) {
      // Supports various patterns: open -a AppName, open -a "App Name", open -a domain.com
      const openAppMatch = command.match(/^open\s+-a\s+(?:"([^"]+)"|([\w\s.-]+))/);
      if (openAppMatch) {
        const appName = (openAppMatch[1] || openAppMatch[2]).trim();
        console.log('Detected app name:', appName, 'from command:', command);

        // Only run when the icon is empty and local icon extraction is supported
        console.log('Icon input value:', editButtonIconInput.value.trim());
        console.log('Is local icon extraction supported:', isLocalIconExtractionSupported());
        console.log('Platform:', window.toast?.platform);
        console.log('extractAppIcon function:', typeof window.toast?.extractAppIcon);

        if (!editButtonIconInput.value.trim() && isLocalIconExtractionSupported()) {
          try {
            // Build the /Applications/AppName.app path
            const appPath = `/Applications/${appName}.app`;

            // Attempt icon extraction
            const success = await updateButtonIconFromLocalApp(appPath, editButtonIconInput, editButtonNameInput);

            if (success) {
              showStatus(`The ${appName} icon has been set automatically.`, 'success');
            }
          }
          catch (error) {
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
        }
        catch (error) {
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
    }
    catch (err) {
      return null;
    }
  }

  // Switch input fields based on action type
  editButtonActionSelect.addEventListener('change', () => {
    showActionFields(editButtonActionSelect.value);
    // Update the preview when the action type changes
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
                showStatus('The icon and button name have been set automatically.', 'success');
              }
            }
            catch (error) {
              console.warn('Automatic icon extraction failed:', error);
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
            showStatus('Please select an application first.', 'warning');
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
            showStatus('exec actions require a command in the form "open -a AppName".', 'warning');
            return;
          }
        }
        else {
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
        }
        else {
          showStatus('Failed to refresh the icon.', 'error');
        }
      }
      catch (error) {
        console.error('Icon reload error:', error);
        showStatus('An error occurred while refreshing the icon.', 'error');
      }
      finally {
        // Re-enable button
        reloadIconButton.disabled = false;
        reloadIconButton.innerHTML = UI_ICONS.refresh;
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
