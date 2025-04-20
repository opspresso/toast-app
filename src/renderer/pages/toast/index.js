/**
 * Toast - Toast Window JavaScript
 *
 * This script handles the functionality of the Toast popup window.
 */

// DOM Elements
const buttonsContainer = document.getElementById('buttons-container');
const pagingContainer = document.getElementById('paging-container');
const pagingButtonsContainer = document.getElementById('paging-buttons-container');
const closeButton = document.getElementById('close-button');
const statusContainer = document.getElementById('status-container');
const buttonTemplate = document.getElementById('button-template');
const settingsModeToggle = document.getElementById('settings-mode-toggle');
const addPageButton = document.getElementById('add-page-button');
const removePageButton = document.getElementById('remove-page-button');

// Modal related DOM elements
const buttonEditModal = document.getElementById('button-edit-modal');
const closeModalButton = document.querySelector('.close-modal');
const saveButtonEdit = document.getElementById('save-button-edit');
const cancelButtonEdit = document.getElementById('cancel-button-edit');
const editButtonNameInput = document.getElementById('edit-button-name');
const editButtonIconInput = document.getElementById('edit-button-icon');
const editButtonShortcutInput = document.getElementById('edit-button-shortcut');
const editButtonActionSelect = document.getElementById('edit-button-action');
const editButtonCommandInput = document.getElementById('edit-button-command');
const editButtonUrlInput = document.getElementById('edit-button-url');
const editButtonScriptInput = document.getElementById('edit-button-script');
const editButtonKeyShortcutInput = document.getElementById('edit-button-key-shortcut');
const editButtonApplicationInput = document.getElementById('edit-button-application');
const browseApplicationButton = document.getElementById('browse-application-button');
const commandInputGroup = document.getElementById('command-input-group');
const urlInputGroup = document.getElementById('url-input-group');
const scriptInputGroup = document.getElementById('script-input-group');
const shortcutInputGroup = document.getElementById('shortcut-input-group');
const applicationInputGroup = document.getElementById('application-input-group');

// Define default button set
const defaultButtons = [
  // qwert row
  {
    name: 'VSCode',
    shortcut: 'Q',
    icon: '💻',
    action: 'exec',
    command: window.toast?.platform === 'darwin' ? 'open -a "Visual Studio Code"' : 'start code'
  },
  {
    name: 'Photos',
    shortcut: 'W',
    icon: '🖼️',
    action: 'exec',
    command: window.toast?.platform === 'darwin' ? 'open -a Photos' : 'start ms-photos:'
  },
  {
    name: 'Notes',
    shortcut: 'E',
    icon: '📝',
    action: 'exec',
    command: window.toast?.platform === 'darwin' ? 'open -a Notes' : 'start onenote:'
  },
  {
    name: 'Maps',
    shortcut: 'R',
    icon: '🗺️',
    action: 'exec',
    command: window.toast?.platform === 'darwin' ? 'open -a Maps' : 'start bingmaps:'
  },
  {
    name: 'Messages',
    shortcut: 'T',
    icon: '💬',
    action: 'exec',
    command: window.toast?.platform === 'darwin' ? 'open -a Messages' : 'start ms-chat:'
  },
  // asdfg row
  {
    name: 'App Store',
    shortcut: 'A',
    icon: '🛒',
    action: 'exec',
    command: window.toast?.platform === 'darwin' ? 'open -a "App Store"' : 'start ms-windows-store:'
  },
  {
    name: 'Spotify',
    shortcut: 'S',
    icon: '🎧',
    action: 'exec',
    command: window.toast?.platform === 'darwin' ? 'open -a Spotify' : 'start spotify:'
  },
  {
    name: 'Dictionary',
    shortcut: 'D',
    icon: '📚',
    action: 'exec',
    command: window.toast?.platform === 'darwin' ? 'open -a Dictionary' : 'start ms-dictionary:'
  },
  {
    name: 'Finder',
    shortcut: 'F',
    icon: '🔍',
    action: 'exec',
    command: window.toast?.platform === 'darwin' ? 'open .' : 'explorer .'
  },
  {
    name: 'GitHub',
    shortcut: 'G',
    icon: '🐙',
    action: 'open',
    url: 'https://github.com'
  },
  // zxcvb row
  {
    name: 'Zoom',
    shortcut: 'Z',
    icon: '📹',
    action: 'exec',
    command: window.toast?.platform === 'darwin' ? 'open -a zoom.us' : 'start zoommtg:'
  },
  {
    name: 'Excel',
    shortcut: 'X',
    icon: '📊',
    action: 'exec',
    command: window.toast?.platform === 'darwin' ? 'open -a "Microsoft Excel"' : 'start excel'
  },
  {
    name: 'Calculator',
    shortcut: 'C',
    icon: '🧮',
    action: 'exec',
    command: window.toast?.platform === 'darwin' ? 'open -a Calculator' : 'calc'
  },
  {
    name: 'Video Player',
    shortcut: 'V',
    icon: '🎬',
    action: 'exec',
    command: window.toast?.platform === 'darwin' ? 'open -a "QuickTime Player"' : 'start wmplayer'
  },
  {
    name: 'Brave',
    shortcut: 'B',
    icon: '🦁',
    action: 'exec',
    command: window.toast?.platform === 'darwin' ? 'open -a "Brave Browser"' : 'start brave'
  }
];

// Define empty button set (15 buttons)
const emptyButtons = Array(15).fill(null).map((_, index) => {
  const row = Math.floor(index / 5);
  const col = index % 5;
  const rowLetters = ['Q', 'W', 'E', 'R', 'T', 'A', 'S', 'D', 'F', 'G', 'Z', 'X', 'C', 'V', 'B'];

  return {
    name: `Button ${rowLetters[index]}`,
    shortcut: rowLetters[index],
    icon: '➕',
    action: 'exec',
    command: ''
  };
});

// State
let pages = []; // Array of pages (each page has an array of buttons)
let selectedButtonIndex = -1; // Currently selected button index
let filteredButtons = []; // Filtered buttons
let currentPageIndex = 0; // Current page index
let isSettingsMode = false; // Settings mode state
let isSubscribed = true; // Subscription status (default: subscribed)
let currentEditingButton = null; // Currently editing button

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  // Load configuration
  window.addEventListener('config-loaded', (event) => {
    const config = event.detail;

    // Page settings
    if (config.pages) {
      pages = config.pages;

      // Initialize paging buttons
      renderPagingButtons();

      // Show first page
      changePage(0);
    }

    // Check subscription status
    if (config.subscription) {
      isSubscribed = config.subscription.isSubscribed;
    }

    // Apply appearance settings
    if (config.appearance) {
      applyAppearanceSettings(config.appearance);
    }
  });

  // Set up event listeners
  setupEventListeners();
});

/**
 * Render paging buttons
 */
function renderPagingButtons() {
  // Initialize paging button container
  pagingButtonsContainer.innerHTML = '';

  // Create buttons for each page
  pages.forEach((page, index) => {
    const button = document.createElement('button');
    button.className = 'paging-button';
    button.dataset.page = index;
    button.textContent = page.shortcut || (index + 1).toString();

    // Indicate current page
    if (index === currentPageIndex) {
      button.classList.add('active');
    }

    // Click event
    button.addEventListener('click', () => {
      changePage(index);
    });

    pagingButtonsContainer.appendChild(button);
  });
}

/**
 * Set up event listeners
 */
function setupEventListeners() {
  // Close button
  closeButton.addEventListener('click', () => {
    hideToastWindow();
  });

  /**
   * Hide toast window function (including checking and exiting edit mode)
   */
  function hideToastWindow() {
    // Exit edit mode first if active
    if (isSettingsMode) {
      toggleSettingsMode();
    }
    // Hide toast window
    window.toast.hideWindow();
  }

  // Settings mode toggle button
  settingsModeToggle.addEventListener('click', toggleSettingsMode);

  // Add page button
  addPageButton.addEventListener('click', addNewPage);

  // Remove page button
  removePageButton.addEventListener('click', removePage);

  // Set up modal event listeners
  setupModalEventListeners();

  // Keyboard page switching (1-9 key events)
  document.addEventListener('keydown', (event) => {
    // Handle number keys 1-9
    if (/^[1-9]$/.test(event.key) && !event.ctrlKey && !event.altKey && !event.metaKey) {
      const pageNum = parseInt(event.key) - 1;
      if (pageNum >= 0 && pageNum < pages.length) {
        changePage(pageNum);
      }
    }
  });

  // Keyboard navigation
  document.addEventListener('keydown', handleKeyDown);

  // Listen for configuration updates
  window.toast.onConfigUpdated((config) => {
    // config.pages가 undefined, null, 빈 배열인 경우에도 처리
    if ('pages' in config) {
      pages = config.pages || [];
      renderPagingButtons();

      if (pages.length > 0) {
        changePage(currentPageIndex < pages.length ? currentPageIndex : 0);
      } else {
        // 페이지가 없는 경우 버튼 컨테이너 초기화
        buttonsContainer.innerHTML = '';

        // 안내 메시지 표시
        const emptyMessage = document.createElement('div');
        emptyMessage.className = 'no-results';
        emptyMessage.textContent = 'No pages found. Press the + button to add a new page.';
        buttonsContainer.appendChild(emptyMessage);

        // 필터링된 버튼 배열 초기화
        filteredButtons = [];
      }
    }

    if (config.appearance) {
      applyAppearanceSettings(config.appearance);
    }

    if (config.subscription) {
      isSubscribed = config.subscription.isSubscribed;
    }
  });

  // Exit edit mode before window hides
  window.addEventListener('before-window-hide', () => {
    if (isSettingsMode) {
      toggleSettingsMode();
    }
  });
}

/**
 * Toggle settings mode
 */
function toggleSettingsMode() {
  isSettingsMode = !isSettingsMode;

  // Toggle settings mode class on document
  document.body.classList.toggle('settings-mode', isSettingsMode);

  // Show status message
  if (isSettingsMode) {
    showStatus('Settings mode activated. Click buttons to edit settings.', 'info');
  } else {
    showStatus('Settings mode deactivated.', 'info');
  }

  // Re-render current page
  showCurrentPageButtons();
}

/**
 * Display buttons for current page
 */
function showCurrentPageButtons() {
  // If there are no pages
  if (pages.length === 0) {
    // Initialize button container
    buttonsContainer.innerHTML = '';

    // Show message instructing to add a page
    const emptyMessage = document.createElement('div');
    emptyMessage.className = 'no-results';
    emptyMessage.textContent = 'No pages found. Press the + button to add a new page.';
    buttonsContainer.appendChild(emptyMessage);

    // Reset filtered buttons array
    filteredButtons = [];
    return;
  }

  // If pages exist, display buttons from current page
  if (currentPageIndex >= 0 && currentPageIndex < pages.length) {
    const currentPageButtons = pages[currentPageIndex].buttons || [];
    renderButtons(currentPageButtons);
  }
}

/**
 * Add a new page
 */
function addNewPage() {
  const pageNumber = pages.length + 1;

  // Page limit based on subscription status
  if (pageNumber > 3 && !isSubscribed) {
    showStatus('Only subscribers can add more than 3 pages.', 'error');
    return;
  }

  // Maximum 9 pages limit
  if (pageNumber > 9) {
    showStatus('Maximum 9 pages allowed.', 'error');
    return;
  }

  // Default new page configuration
  let newPage = {
    name: `Page ${pageNumber}`,
    shortcut: pageNumber.toString(),
    buttons: []
  };

  // Use default app buttons for first page, empty buttons for others
  if (pages.length === 0) {
    newPage.buttons = [...defaultButtons]; // Use default button set
  } else {
    newPage.buttons = [...emptyButtons]; // Use empty button set
  }

  // Add to pages array
  pages.push(newPage);

  // Update paging buttons
  renderPagingButtons();

  // Navigate to new page
  changePage(pages.length - 1);

  // Save configuration
  window.toast.saveConfig({ pages });

  showStatus(`Page ${pageNumber} has been added.`, 'success');
}

/**
 * Handle keyboard events
 * @param {KeyboardEvent} event - Keyboard event
 */
function handleKeyDown(event) {
  // 모달이 열려있을 때는 단축키를 무시합니다 (ESC 키 제외)
  if (buttonEditModal.classList.contains('show')) {
    // ESC 키는 모달 닫기용으로만 사용 (이미 별도 이벤트 리스너에서 처리됨)
    return;
  }

  switch (event.key) {
    case 'ArrowUp':
      event.preventDefault();
      navigateButtons('up');
      break;
    case 'ArrowDown':
      event.preventDefault();
      navigateButtons('down');
      break;
    case 'ArrowLeft':
      event.preventDefault();
      navigateButtons('left');
      break;
    case 'ArrowRight':
      event.preventDefault();
      navigateButtons('right');
      break;
    case 'Enter':
      event.preventDefault();
      if (selectedButtonIndex >= 0 && selectedButtonIndex < filteredButtons.length) {
        executeButton(filteredButtons[selectedButtonIndex]);
      }
      break;
    case 'Escape':
      // Exit edit mode when ESC key is pressed in settings mode
      // Note: Modal closing is handled separately when modal is open
      if (isSettingsMode && !buttonEditModal.classList.contains('show')) {
        event.preventDefault();
        toggleSettingsMode();
      }
      break;
    case ',':  // Toggle settings mode when comma key is pressed
      // cmd+, (or ctrl+, on Windows) 단축키로는 설정 창을 엽니다
      if (event.metaKey || event.ctrlKey) {
        event.preventDefault();
        window.toast.showSettings();
      } else {
        // 일반 콤마 키는 계속 설정 모드 토글로 작동
        event.preventDefault();
        toggleSettingsMode();
      }
      break;
    case '+': // Add page when Shift+= is pressed
      if (event.shiftKey) {
        event.preventDefault();
        addNewPage();
      }
      break;
    case '=': // Add page when Shift+= is pressed (supporting different keyboard layouts)
      if (event.shiftKey) {
        event.preventDefault();
        addNewPage();
      }
      break;
    case '-': // Delete page in settings mode
      if (isSettingsMode) {
        event.preventDefault();
        removePage();
      }
      break;
    case '_': // Delete page in settings mode (supporting Shift+-)
      if (isSettingsMode && event.shiftKey) {
        event.preventDefault();
        removePage();
      }
      break;
    default:
      // Check if key matches a button shortcut
      const upperKey = event.key.toUpperCase();
      const buttonIndex = filteredButtons.findIndex(button =>
        button.shortcut && button.shortcut.toUpperCase() === upperKey
      );

      if (buttonIndex >= 0) {
        event.preventDefault();
        executeButton(filteredButtons[buttonIndex]);
      }
      break;
  }
}

/**
 * Navigate between buttons using keyboard
 * @param {string} direction - Direction to navigate (up, down, left, right)
 */
function navigateButtons(direction) {
  if (filteredButtons.length === 0) return;

  const buttonsPerRow = getButtonsPerRow();
  let newIndex = selectedButtonIndex;

  if (selectedButtonIndex === -1) {
    // No button selected, select the first one
    newIndex = 0;
  } else {
    // Calculate new index based on direction
    switch (direction) {
      case 'up':
        newIndex = selectedButtonIndex - buttonsPerRow;
        break;
      case 'down':
        newIndex = selectedButtonIndex + buttonsPerRow;
        break;
      case 'left':
        newIndex = selectedButtonIndex - 1;
        break;
      case 'right':
        newIndex = selectedButtonIndex + 1;
        break;
    }

    // Ensure index is within bounds
    if (newIndex < 0) {
      newIndex = direction === 'up' ?
        filteredButtons.length - (filteredButtons.length % buttonsPerRow || buttonsPerRow) + (selectedButtonIndex % buttonsPerRow) :
        direction === 'left' ?
          selectedButtonIndex + buttonsPerRow - 1 :
          0;

      if (newIndex >= filteredButtons.length) {
        newIndex = filteredButtons.length - 1;
      }
    } else if (newIndex >= filteredButtons.length) {
      newIndex = direction === 'down' ?
        selectedButtonIndex % buttonsPerRow :
        direction === 'right' ?
          selectedButtonIndex - buttonsPerRow + 1 :
          filteredButtons.length - 1;

      if (newIndex < 0) {
        newIndex = 0;
      }
    }
  }

  // Update selected button
  selectButton(newIndex);
}

/**
 * Get the number of buttons per row based on current layout
 * @returns {number} Buttons per row
 */
function getButtonsPerRow() {
  const containerStyle = window.getComputedStyle(buttonsContainer);
  const columns = containerStyle.gridTemplateColumns.split(' ').length;
  return columns;
}

/**
 * Select a button by index
 * @param {number} index - Button index
 */
function selectButton(index) {
  // Remove selection from current button
  if (selectedButtonIndex >= 0 && selectedButtonIndex < filteredButtons.length) {
    const currentButton = buttonsContainer.children[selectedButtonIndex];
    if (currentButton) {
      currentButton.classList.remove('selected');
    }
  }

  // Update selected index
  selectedButtonIndex = index;

  // Add selection to new button
  if (selectedButtonIndex >= 0 && selectedButtonIndex < filteredButtons.length) {
    const newButton = buttonsContainer.children[selectedButtonIndex];
    if (newButton) {
      newButton.classList.add('selected');
      newButton.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }
}

/**
 * Switch to a different page
 * @param {number} pageIndex - Index of the page to switch to
 */
function changePage(pageIndex) {
  // Check if page index is valid
  if (pageIndex >= 0 && pageIndex < pages.length) {
    // Update current page index
    currentPageIndex = pageIndex;

    // Update paging buttons
    document.querySelectorAll('.paging-button').forEach(button => {
      const index = parseInt(button.dataset.page);
      if (index === currentPageIndex) {
        button.classList.add('active');
      } else {
        button.classList.remove('active');
      }
    });

    // Display buttons for current page
    showCurrentPageButtons();

    // Show status
    const pageName = pages[currentPageIndex].name || `Page ${currentPageIndex + 1}`;
    showStatus(`Navigated to ${pageName}`, 'info');
  }
}

/**
 * Render buttons to container
 * @param {Array} buttons - Array of buttons to display
 */
function renderButtons(buttons) {
  // Store button array for keyboard navigation
  filteredButtons = buttons || [];

  // Clear container
  buttonsContainer.innerHTML = '';

  // Create and add buttons
  filteredButtons.forEach((button, index) => {
    const buttonElement = createButtonElement(button);

    // Click event
    buttonElement.addEventListener('click', () => {
      executeButton(button);
    });

    // Hover event
    buttonElement.addEventListener('mouseenter', () => {
      selectButton(index);
    });

    buttonsContainer.appendChild(buttonElement);
  });

  // Show empty state if no buttons
  if (filteredButtons.length === 0) {
    const noResults = document.createElement('div');
    noResults.className = 'no-results';
    noResults.textContent = 'No buttons available';
    buttonsContainer.appendChild(noResults);
  }
}

/**
 * Create a button element from a button configuration
 * @param {Object} button - Button configuration
 * @returns {HTMLElement} Button element
 */
function createButtonElement(button) {
  // Clone the template
  const buttonElement = buttonTemplate.content.cloneNode(true).querySelector('.toast-button');

  // Set button data
  buttonElement.dataset.action = JSON.stringify(button);

  // Set button name
  const nameElement = buttonElement.querySelector('.button-name');
  nameElement.textContent = button.name;

  // Set button icon
  const iconElement = buttonElement.querySelector('.button-icon');
  iconElement.textContent = button.icon || '🔘';

  // Set button shortcut
  const shortcutElement = buttonElement.querySelector('.button-shortcut');
  if (button.shortcut) {
    shortcutElement.textContent = button.shortcut;
  } else {
    shortcutElement.style.display = 'none';
  }

  return buttonElement;
}

/**
 * Execute a button's action or edit in settings mode
 * @param {Object} button - Button configuration
 */
function executeButton(button) {
  // Change button settings if in settings mode
  if (isSettingsMode) {
    editButtonSettings(button);
    return;
  }

  // Execute button action in normal mode
  showStatus('Executing...', 'info');

  // Create action object
  const action = {
    action: button.action,
    ...button
  };

  // Execute the action
  window.toast.executeAction(action)
    .then(result => {
      if (result.success) {
        showStatus(result.message || 'Action completed successfully', 'success');
      } else {
        showStatus(result.message || 'Action failed', 'error');
      }
    })
    .catch(error => {
      showStatus(`Error: ${error.message || 'Unknown error'}`, 'error');
    });
}

/**
 * Initialize modal and set up event listeners
 */
function setupModalEventListeners() {
  // Modal close button (X button)
  if (closeModalButton) {
    closeModalButton.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      closeButtonEditModal();
    });
  } else {
    console.error('Close button not found.');
  }

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
        // Application 폴더를 기본 경로로 설정
        const defaultPath = window.toast?.platform === 'darwin' ? '/Applications' : 'C:\\Program Files';

        // 파일 선택 대화상자 옵션 설정
        const options = {
          title: '애플리케이션 선택',
          defaultPath: defaultPath,
          properties: ['openFile'],
          filters: window.toast?.platform === 'darwin'
            ? [{ name: '애플리케이션', extensions: ['app'] }]
            : [{ name: '실행 파일', extensions: ['exe'] }]
        };

        // 파일 선택 대화상자 호출
        const result = await window.toast.showOpenDialog(options);

        if (!result.canceled && result.filePaths.length > 0) {
          // 선택한 애플리케이션 경로를 입력 필드에 설정
          editButtonApplicationInput.value = result.filePaths[0];
        }
      } catch (error) {
        console.error('애플리케이션 선택 중 오류 발생:', error);
        showStatus('애플리케이션 선택 중 오류가 발생했습니다.', 'error');
      }
    });
  }

  // Close on click outside modal
  buttonEditModal.addEventListener('click', (event) => {
    if (event.target === buttonEditModal) {
      closeButtonEditModal();
    }
  });

  // Close modal with ESC key
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && buttonEditModal.classList.contains('show')) {
      closeButtonEditModal();
    }
  });
}

/**
 * Edit button settings (settings mode)
 * @param {Object} button - Button settings to edit
 */
function editButtonSettings(button) {
  // Display button info in status message
  showStatus(`Editing: ${button.name}`, 'info');

  // Save the button being edited (global variable)
  currentEditingButton = button;

  // Fill form fields with current button values
  editButtonNameInput.value = button.name || '';
  editButtonIconInput.value = button.icon || '';
  editButtonShortcutInput.value = button.shortcut || '';
  editButtonActionSelect.value = button.action || 'exec';

  // Set field values based on action type
  editButtonCommandInput.value = button.command || '';
  editButtonUrlInput.value = button.url || '';
  editButtonScriptInput.value = button.script || '';
  editButtonKeyShortcutInput.value = button.keyShortcut || '';
  editButtonApplicationInput.value = button.applicationPath || '';

  // Show input fields appropriate for current action type
  showActionFields(button.action || 'exec');

  // Show modal
  buttonEditModal.classList.add('show');

  // Focus on name input field
  editButtonNameInput.focus();
}

/**
 * Close button edit modal
 */
function closeButtonEditModal() {
  buttonEditModal.classList.remove('show');
  currentEditingButton = null;
}

/**
 * Show/hide input fields based on action type
 * @param {string} actionType - Action type
 */
function showActionFields(actionType) {
  // Hide all input field groups
  commandInputGroup.style.display = 'none';
  urlInputGroup.style.display = 'none';
  scriptInputGroup.style.display = 'none';
  shortcutInputGroup.style.display = 'none';
  applicationInputGroup.style.display = 'none';

  // Show corresponding input field group based on selected action type
  switch (actionType) {
    case 'exec':
      commandInputGroup.style.display = 'block';
      break;
    case 'open':
      urlInputGroup.style.display = 'block';
      break;
    case 'script':
      scriptInputGroup.style.display = 'block';
      break;
    case 'shortcut':
      shortcutInputGroup.style.display = 'block';
      break;
    case 'application':
      applicationInputGroup.style.display = 'block';
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
  const buttonIndex = pages[pageIndex].buttons.findIndex(b =>
    b.shortcut === currentEditingButton.shortcut
  );

  if (buttonIndex < 0) {
    showStatus('Button not found.', 'error');
    return;
  }

  // Create new button object with input values
  const action = editButtonActionSelect.value;
  const updatedButton = {
    name: editButtonNameInput.value,
    icon: editButtonIconInput.value,
    shortcut: currentEditingButton.shortcut, // Shortcut cannot be changed
    action: action
  };

  // Set additional properties based on action type
  switch (action) {
    case 'exec':
      updatedButton.command = editButtonCommandInput.value;
      break;
    case 'open':
      updatedButton.url = editButtonUrlInput.value;
      break;
    case 'script':
      updatedButton.script = editButtonScriptInput.value;
      break;
    case 'shortcut':
      updatedButton.keyShortcut = editButtonKeyShortcutInput.value;
      break;
    case 'application':
      updatedButton.applicationPath = editButtonApplicationInput.value;
      break;
  }

  // Update button
  pages[pageIndex].buttons[buttonIndex] = updatedButton;

  // Save configuration
  window.toast.saveConfig({ pages })
    .then(() => {
      // Close modal
      closeButtonEditModal();

      // Update UI
      showCurrentPageButtons();

      // Show success message
      showStatus(`Button "${updatedButton.name}" settings have been updated.`, 'success');
    })
    .catch(error => {
      showStatus(`Error saving settings: ${error}`, 'error');
    });
}

/**
 * Show a status message
 * @param {string} message - Status message
 * @param {string} type - Status type (info, success, error)
 */
function showStatus(message, type = 'info') {
  statusContainer.textContent = message;
  statusContainer.className = 'toast-status';
  statusContainer.classList.add(type);

  // Clear status after a delay for success messages
  if (type === 'success') {
    setTimeout(() => {
      statusContainer.textContent = '';
      statusContainer.className = 'toast-status';
    }, 3000);
  }
}

/**
 * Apply appearance settings
 * @param {Object} appearance - Appearance settings
 */
function applyAppearanceSettings(appearance) {
  const container = document.querySelector('.toast-container');

  // Apply theme
  if (appearance.theme) {
    // 먼저 data-theme 속성 제거 (기존 테마 초기화)
    document.documentElement.removeAttribute('data-theme');

    // 시스템 테마가 아닌 경우에만 data-theme 속성 설정
    if (appearance.theme === 'light' || appearance.theme === 'dark') {
      document.documentElement.setAttribute('data-theme', appearance.theme);
    }
    // 시스템 테마인 경우 data-theme 속성 없이 media query가 작동하도록 함
  }

  // Apply button layout
  if (appearance.buttonLayout) {
    buttonsContainer.className = 'toast-buttons';
    buttonsContainer.classList.add(appearance.buttonLayout);
  }

  // Apply size
  if (appearance.size) {
    container.className = 'toast-container';
    container.classList.add(`size-${appearance.size}`);
  }
}

/**
 * Remove current page
 */
function removePage() {
  // Only works in settings mode
  if (!isSettingsMode) {
    showStatus('Page deletion is only available in settings mode.', 'error');
    return;
  }

  // Nothing to delete if there are no pages
  if (pages.length === 0) {
    return;
  }

  // Save current page info
  const pageName = pages[currentPageIndex].name || `Page ${currentPageIndex + 1}`;

  // Show deletion confirmation
  const isConfirmed = confirm(`Are you sure you want to delete "${pageName}"?`);

  if (!isConfirmed) {
    showStatus('Page deletion canceled.', 'info');
    return;
  }

  // Delete page
  pages.splice(currentPageIndex, 1);

  // Calculate new current page index (move to previous page, or to new last page if this was the last page)
  const newPageIndex = Math.min(currentPageIndex, pages.length - 1);

  // Readjust page numbers and shortcuts
  pages.forEach((page, index) => {
    if (!page.name || page.name.startsWith('Page ')) {
      page.name = `Page ${index + 1}`;
    }
    if (!page.shortcut || /^\d+$/.test(page.shortcut)) {
      page.shortcut = (index + 1).toString();
    }
  });

  // If all pages were deleted, prompt user to add a page
  if (pages.length === 0) {
    // Save changes
    window.toast.saveConfig({ pages });

    // Update paging buttons
    renderPagingButtons();

    // Show empty screen (initialize button container)
    buttonsContainer.innerHTML = '';
    filteredButtons = [];

    // Display message to add a page
    const emptyMessage = document.createElement('div');
    emptyMessage.className = 'no-results';
    emptyMessage.textContent = 'No pages found. Press the + button to add a new page.';
    buttonsContainer.appendChild(emptyMessage);

    showStatus(`All pages have been deleted. Press the + button to add a new page.`, 'info');
    return;
  }

  // Save changes
  window.toast.saveConfig({ pages });

  // Update paging buttons
  renderPagingButtons();

  // Switch to page
  changePage(newPageIndex);

  showStatus(`${pageName} has been deleted.`, 'success');
}
