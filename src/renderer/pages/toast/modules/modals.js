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
  editButtonShortcutInput,
  editButtonActionSelect,
  editButtonCommandInput,
  editButtonWorkingDirInput,
  editButtonRunInTerminalCheckbox,
  editButtonUrlInput,
  editButtonPathInput,
  editButtonOpenApplicationInput,
  browsePathButton,
  editButtonScriptInput,
  editButtonScriptTypeSelect,
  editButtonScriptParamsInput,
  editButtonApplicationInput,
  editButtonApplicationParametersInput,
  browseApplicationButton,
  editButtonStopOnErrorCheckbox,
  commandInputGroup,
  urlInputGroup,
  scriptInputGroup,
  applicationInputGroup,
  chainInputGroup,
  profileModal,
  closeProfileModal,
  closeProfileButton,
  logoutButton,
  confirmModal,
  confirmTitle,
  confirmMessage,
  confirmCancelButton,
  confirmOkButton,
} from './dom-elements.js';
import { showStatus } from './utils.js';
import { hideProfileModal, handleLogout } from './auth.js';
import { pages, currentPageIndex, updateCurrentPageButtons } from './pages.js';

// State variables
let currentEditingButton = null;
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

  // Switch input fields based on action type
  editButtonActionSelect.addEventListener('change', () => {
    showActionFields(editButtonActionSelect.value);
  });

  // Browse button for application selection
  if (browseApplicationButton) {
    browseApplicationButton.addEventListener('click', async () => {
      try {
        // Set Application folder as default path
        const defaultPath =
          window.toast?.platform === 'darwin' ? '/Applications' : 'C:\\Program Files';

        // Configure file selection dialog options
        const options = {
          title: 'Select Application',
          defaultPath: defaultPath,
          properties: ['openFile'],
          filters:
            window.toast?.platform === 'darwin'
              ? [{ name: 'Applications', extensions: ['app'] }]
              : [{ name: 'Executable Files', extensions: ['exe'] }],
        };

        // Call file selection dialog directly without window manipulation
        const result = await window.toast.showOpenDialog(options);

        if (!result.canceled && result.filePaths.length > 0) {
          // Set selected application path to input field
          editButtonApplicationInput.value = result.filePaths[0];
          showStatus('Application selected successfully.', 'success');
        } else {
          showStatus('Application selection canceled.', 'info');
        }
      } catch (error) {
        console.error('Error selecting application:', error);
        showStatus('An error occurred while selecting the application.', 'error');
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
        } else {
          showStatus('File/folder selection canceled.', 'info');
        }
      } catch (error) {
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
      } else if (iconSearchModal.classList.contains('show')) {
        closeIconSearchModal();
        event.stopPropagation();
      } else if (buttonEditModal.classList.contains('show')) {
        closeButtonEditModal();
        event.stopPropagation();
      } else if (profileModal.classList.contains('show')) {
        hideProfileModal();
        event.stopPropagation();
      }
    }
  });

  // Set up profile modal related event listeners
  closeProfileModal.addEventListener('click', hideProfileModal);
  closeProfileButton.addEventListener('click', hideProfileModal);
  logoutButton.addEventListener('click', handleLogout);

  // Icon search modal event listeners
  setupIconSearchModal();
}

/**
 * Setup icon search modal functionality
 */
function setupIconSearchModal() {
  const browseIconButton = document.getElementById('browse-icon-button');
  const closeIconSearch = document.getElementById('close-icon-search');
  const closeIconBrowser = document.getElementById('close-icon-browser');
  const iconSearchInput = document.getElementById('icon-search-input');
  const categorySelect = document.getElementById('category-select');
  const iconsContainer = document.getElementById('icons-container');

  // Icon search button click event
  browseIconButton.addEventListener('click', () => {
    // Initialize icon container and render icon grid
    renderIconsGrid();

    // Show icon search modal
    iconSearchModal.classList.add('show');
    window.toast.setModalOpen(true);

    // Focus on search field
    setTimeout(() => {
      iconSearchInput.focus();
    }, 300);
  });

  // Icon search modal close button event
  closeIconSearch.addEventListener('click', closeIconSearchModal);
  closeIconBrowser.addEventListener('click', closeIconSearchModal);

  // Icon search field input event
  iconSearchInput.addEventListener('input', () => {
    renderIconsGrid();
  });

  // Category selection change event
  categorySelect.addEventListener('change', () => {
    renderIconsGrid();
  });

  // Icon grid rendering function
  function renderIconsGrid() {
    // Initialize container
    iconsContainer.innerHTML = '';

    const searchQuery = iconSearchInput.value.trim().toLowerCase();
    const selectedCategory = categorySelect.value;

    // Display all categories or only selected category
    if (selectedCategory === 'all') {
      // Display all categories
      Object.keys(window.IconsCatalog).forEach(category => {
        renderCategoryIcons(category, searchQuery);
      });
    } else {
      // Display only selected category
      renderCategoryIcons(selectedCategory, searchQuery);
    }
  }

  // Category icon rendering function
  function renderCategoryIcons(categoryKey, searchQuery) {
    if (!window.IconsCatalog || !window.IconsCatalog[categoryKey]) return;

    const category = window.IconsCatalog[categoryKey];
    const icons = category.icons;
    const filteredIcons = {};

    // Filter icons by search query
    Object.keys(icons).forEach(iconKey => {
      if (!searchQuery || iconKey.toLowerCase().includes(searchQuery)) {
        filteredIcons[iconKey] = icons[iconKey];
      }
    });

    // Add category only if there are filtered icons
    if (Object.keys(filteredIcons).length > 0) {
      // Add category title
      const categoryTitle = document.createElement('div');
      categoryTitle.className = 'icon-category-title';
      categoryTitle.textContent = category.name;
      iconsContainer.appendChild(categoryTitle);

      // Add icons
      Object.keys(filteredIcons).forEach(iconKey => {
        const iconPath = filteredIcons[iconKey];
        const iconValue = `FlatColorIcons.${iconKey}`;

        // Create icon item
        const iconItem = document.createElement('div');
        iconItem.className = 'icon-item';
        iconItem.setAttribute('data-icon', iconValue);

        // Check if this is the currently selected icon
        if (editButtonIconInput.value === iconValue) {
          iconItem.classList.add('selected');
        }

        // Create icon image
        const img = document.createElement('img');
        img.src = iconPath;
        img.alt = iconKey;

        // Icon click event
        iconItem.addEventListener('click', () => {
          // Remove selection from previously selected icon
          document.querySelectorAll('.icons-container .icon-item.selected').forEach(item => {
            item.classList.remove('selected');
          });

          // Select current icon
          iconItem.classList.add('selected');

          // Set value to icon field
          editButtonIconInput.value = iconValue;

          // Close modal
          closeIconSearchModal();

          // Show status message
          showStatus(`Icon selected`, 'info');
        });

        // Add only image to icon item (remove name)
        iconItem.appendChild(img);
        iconsContainer.appendChild(iconItem);
      });
    }
  }
}

/**
 * Icon search modal close function
 */
function closeIconSearchModal() {
  iconSearchModal.classList.remove('show');
  window.toast.setModalOpen(false);
}

/**
 * Edit button settings (settings mode)
 * @param {Object} button - Button settings to edit
 */
export function editButtonSettings(button) {
  // Display button info in status message
  showStatus(`Editing: ${button.name}`, 'info');

  // Save the button being edited (global variable)
  currentEditingButton = button;

  // Fill form fields with current button values
  editButtonNameInput.value = button.name || '';
  editButtonIconInput.value = button.icon || '';
  editButtonShortcutInput.value = button.shortcut || '';
  editButtonActionSelect.value = button.action || 'exec';

  // Set common field values
  editButtonCommandInput.value = button.command || '';
  editButtonWorkingDirInput.value = button.workingDir || '';
  editButtonRunInTerminalCheckbox.checked = button.runInTerminal || false;

  editButtonUrlInput.value = button.url || '';
  editButtonPathInput.value = button.path || '';
  editButtonOpenApplicationInput.value = button.application || '';

  editButtonScriptInput.value = button.script || '';
  editButtonScriptTypeSelect.value = button.scriptType || 'javascript';
  editButtonScriptParamsInput.value = button.scriptParams
    ? JSON.stringify(button.scriptParams, null, 2)
    : '';

  editButtonApplicationInput.value = button.applicationPath || '';
  editButtonApplicationParametersInput.value = button.applicationParameters || '';
  editButtonStopOnErrorCheckbox.checked = button.stopOnError !== false; // default value true

  // Show input fields appropriate for current action type
  showActionFields(button.action || 'exec');

  // Notify main process that modal is open
  window.toast.setModalOpen(true);

  // Show modal
  buttonEditModal.classList.add('show');

  // Focus on name input field
  editButtonNameInput.focus();
}

/**
 * Close button edit modal
 */
export function closeButtonEditModal() {
  // Notify main process that modal is closed
  window.toast.setModalOpen(false);

  buttonEditModal.classList.remove('show');
  currentEditingButton = null;
}

/**
 * Show/hide input fields based on action type
 * @param {string} actionType - Action type
 */
function showActionFields(actionType) {
  // Hide all input field groups
  applicationInputGroup.style.display = 'none';
  commandInputGroup.style.display = 'none';
  urlInputGroup.style.display = 'none';
  scriptInputGroup.style.display = 'none';
  chainInputGroup.style.display = 'none';

  // Update icon field hint
  const iconHint = document.querySelector('.field-hint');
  if (iconHint) {
    // Show custom hint based on type
    if (actionType === 'open') {
      iconHint.textContent = 'Use emoji or leave empty to automatically use URL favicon';
    } else {
      iconHint.textContent = 'Use emoji (e.g. 🚀) or an image URL (https://...)';
    }
  }

  // Show corresponding input field group based on selected action type
  switch (actionType) {
    case 'application':
      applicationInputGroup.style.display = 'block';
      break;
    case 'exec':
      commandInputGroup.style.display = 'block';
      break;
    case 'open':
      urlInputGroup.style.display = 'block';
      break;
    case 'script':
      scriptInputGroup.style.display = 'block';
      break;
    case 'chain':
      chainInputGroup.style.display = 'block';
      break;
  }
}

/**
 * Save button settings
 */
function saveButtonSettings() {
  if (!currentEditingButton) return;

  // Get current page and button index
  const pageIndex = currentPageIndex;
  const buttonIndex = pages[pageIndex].buttons.findIndex(
    b => b.shortcut === currentEditingButton.shortcut,
  );

  if (buttonIndex < 0) {
    showStatus('Button not found.', 'error');
    return;
  }

  // Create new button object with input values
  const action = editButtonActionSelect.value;
  const updatedButton = {
    name: editButtonNameInput.value.trim(),
    icon: editButtonIconInput.value.trim(),
    shortcut: currentEditingButton.shortcut.trim(), // Shortcut cannot be changed
    action: action,
  };

  // Set additional properties based on action type
  switch (action) {
    case 'application':
      updatedButton.applicationPath = editButtonApplicationInput.value.trim();

      // Add application parameters (optional)
      if (editButtonApplicationParametersInput.value.trim()) {
        updatedButton.applicationParameters = editButtonApplicationParametersInput.value.trim();
      }
      break;

    case 'exec':
      updatedButton.command = editButtonCommandInput.value.trim();

      // Add working directory (optional)
      if (editButtonWorkingDirInput.value.trim()) {
        updatedButton.workingDir = editButtonWorkingDirInput.value.trim();
      }

      // Add run in terminal option
      updatedButton.runInTerminal = editButtonRunInTerminalCheckbox.checked;
      break;

    case 'open':
      // URL or path is required (not both)
      if (editButtonUrlInput.value.trim()) {
        updatedButton.url = editButtonUrlInput.value.trim();
      } else if (editButtonPathInput.value.trim()) {
        updatedButton.path = editButtonPathInput.value.trim();
      }

      // Application setting (optional)
      if (editButtonOpenApplicationInput.value.trim()) {
        updatedButton.application = editButtonOpenApplicationInput.value.trim();
      }
      break;

    case 'script':
      updatedButton.script = editButtonScriptInput.value.trim();
      updatedButton.scriptType = editButtonScriptTypeSelect.value;

      // Add script parameters (parse as JSON format)
      if (editButtonScriptParamsInput.value.trim()) {
        try {
          updatedButton.scriptParams = JSON.parse(editButtonScriptParamsInput.value.trim());
        } catch (error) {
          showStatus('Script parameter JSON format is invalid. Using an empty object.', 'error');
          updatedButton.scriptParams = {};
        }
      }
      break;

    case 'chain':
      // Chain action add functionality needs to be implemented
      updatedButton.actions = []; // In actual implementation, get the list of actions added from GUI
      updatedButton.stopOnError = editButtonStopOnErrorCheckbox.checked;
      break;
  }

  // Update button
  pages[pageIndex].buttons[buttonIndex] = updatedButton;

  // Update current page buttons
  updateCurrentPageButtons(pages[pageIndex].buttons);

  // Save configuration
  window.toast
    .saveConfig({ pages })
    .then(() => {
      // Close modal
      closeButtonEditModal();

      // Update UI - stay on current page
      import('./buttons.js').then(({ showCurrentPageButtons }) => {
        showCurrentPageButtons();
      });

      // Show success message
      showStatus(`Button "${updatedButton.name}" settings have been updated.`, 'success');
    })
    .catch(error => {
      showStatus(`Error saving settings: ${error}`, 'error');
    });
}

/**
 * Show confirm modal
 * @param {string} title - Modal title
 * @param {string} message - Confirmation message
 * @param {string} okButtonText - OK button text (default: 'Delete')
 * @returns {Promise<boolean>} - Returns true if confirmed, false if canceled
 */
export function showConfirmModal(title = 'Confirm', message = 'Are you sure?', okButtonText = 'Delete') {
  return new Promise((resolve) => {
    // Set modal content
    confirmTitle.textContent = title;
    confirmMessage.textContent = message;
    confirmOkButton.textContent = okButtonText;

    // Store event handlers for cleanup
    let cancelHandler, okHandler, outsideClickHandler;

    // Cleanup function to remove event listeners and close modal
    const cleanup = () => {
      if (cancelHandler) {
        confirmCancelButton.removeEventListener('click', cancelHandler);
      }
      if (okHandler) {
        confirmOkButton.removeEventListener('click', okHandler);
      }
      if (outsideClickHandler) {
        confirmModal.removeEventListener('click', outsideClickHandler);
      }
      closeConfirmModal();
    };

    // Define event handlers
    cancelHandler = () => {
      cleanup();
      resolve(false);
    };

    okHandler = () => {
      cleanup();
      resolve(true);
    };

    outsideClickHandler = (event) => {
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
