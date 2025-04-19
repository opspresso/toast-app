/**
 * Toast App - Toast Window JavaScript
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

// 기본 버튼 세트 정의
const defaultButtons = [
  // qwert 행
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
  // asdfg 행
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
  // zxcvb 행
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

// 빈 버튼 세트 정의 (15개)
const emptyButtons = Array(15).fill(null).map((_, index) => {
  const row = Math.floor(index / 5);
  const col = index % 5;
  const rowLetters = ['Q', 'W', 'E', 'R', 'T', 'A', 'S', 'D', 'F', 'G', 'Z', 'X', 'C', 'V', 'B'];

  return {
    name: `버튼 ${rowLetters[index]}`,
    shortcut: rowLetters[index],
    icon: '➕',
    action: 'exec',
    command: ''
  };
});

// State
let pages = []; // 페이지 배열 (각 페이지는 버튼 배열을 가짐)
let selectedButtonIndex = -1; // 현재 선택된 버튼 인덱스
let filteredButtons = []; // 필터링된 버튼들
let currentPageIndex = 0; // 현재 페이지 인덱스
let isSettingsMode = false; // 설정 모드 상태
let isSubscribed = true; // 구독 상태 (기본값: 구독 중)

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  // Load configuration
  window.addEventListener('config-loaded', (event) => {
    const config = event.detail;

    // 페이지 설정
    if (config.pages) {
      pages = config.pages;

      // 페이징 버튼 초기화
      renderPagingButtons();

      // 첫 페이지 표시
      changePage(0);
    }

    // 구독 상태 확인
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
 * 페이징 버튼 렌더링
 */
function renderPagingButtons() {
  // 페이징 버튼 컨테이너 초기화
  pagingButtonsContainer.innerHTML = '';

  // 각 페이지에 대한 버튼 생성
  pages.forEach((page, index) => {
    const button = document.createElement('button');
    button.className = 'paging-button';
    button.dataset.page = index;
    button.textContent = page.shortcut || (index + 1).toString();

    // 현재 페이지 표시
    if (index === currentPageIndex) {
      button.classList.add('active');
    }

    // 클릭 이벤트
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
    window.toast.hideWindow();
  });

  // 설정 모드 토글 버튼
  settingsModeToggle.addEventListener('click', toggleSettingsMode);

  // 페이지 추가 버튼
  addPageButton.addEventListener('click', addNewPage);

  // 페이지 삭제 버튼
  removePageButton.addEventListener('click', removePage);

  // 키보드 페이지 전환 (1-9 키 이벤트)
  document.addEventListener('keydown', (event) => {
    // 숫자 키 1-9 처리
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
    if (config.pages) {
      pages = config.pages;
      renderPagingButtons();
      changePage(currentPageIndex < pages.length ? currentPageIndex : 0);
    }

    if (config.appearance) {
      applyAppearanceSettings(config.appearance);
    }

    if (config.subscription) {
      isSubscribed = config.subscription.isSubscribed;
    }
  });
}

/**
 * 설정 모드 토글
 */
function toggleSettingsMode() {
  isSettingsMode = !isSettingsMode;

  // 문서에 설정 모드 클래스 토글
  document.body.classList.toggle('settings-mode', isSettingsMode);

  // 상태 메시지 표시
  if (isSettingsMode) {
    showStatus('설정 모드가 활성화되었습니다. 버튼을 클릭하여 설정을 변경하세요.', 'info');
  } else {
    showStatus('설정 모드가 비활성화되었습니다.', 'info');
  }

  // 현재 페이지 다시 렌더링
  showCurrentPageButtons();
}

/**
 * 현재 페이지 버튼 표시
 */
function showCurrentPageButtons() {
  if (currentPageIndex >= 0 && currentPageIndex < pages.length) {
    const currentPageButtons = pages[currentPageIndex].buttons || [];
    renderButtons(currentPageButtons);
  }
}

/**
 * 새 페이지 추가
 */
function addNewPage() {
  const pageNumber = pages.length + 1;

  // 구독 상태에 따른 페이지 추가 제한
  if (pageNumber > 3 && !isSubscribed) {
    showStatus('구독자만 4페이지 이상 추가할 수 있습니다.', 'error');
    return;
  }

  // 최대 9페이지 제한
  if (pageNumber > 9) {
    showStatus('최대 9페이지까지만 추가할 수 있습니다.', 'error');
    return;
  }

  // 새 페이지 기본 구성
  let newPage = {
    name: `페이지 ${pageNumber}`,
    shortcut: pageNumber.toString(),
    buttons: []
  };

  // 첫 페이지인 경우에만 기본 앱 설정, 그 외에는 빈 버튼
  if (pages.length === 0) {
    newPage.buttons = [...defaultButtons]; // 기본 버튼 세트 사용
  } else {
    newPage.buttons = [...emptyButtons]; // 빈 버튼 세트 사용
  }

  // 페이지 배열에 추가
  pages.push(newPage);

  // 페이징 버튼 업데이트
  renderPagingButtons();

  // 새 페이지로 이동
  changePage(pages.length - 1);

  // 설정 저장
  window.toast.saveConfig({ pages });

  showStatus(`페이지 ${pageNumber}가 추가되었습니다.`, 'success');
}

/**
 * Handle keyboard events
 * @param {KeyboardEvent} event - Keyboard event
 */
function handleKeyDown(event) {
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
    case ',':  // 콤마 키를 눌렀을 때 설정 모드 토글
      event.preventDefault();
      toggleSettingsMode();
      break;
    case '+': // Shift+= 키를 눌렀을 때 페이지 추가
      if (event.shiftKey) {
        event.preventDefault();
        addNewPage();
      }
      break;
    case '=': // Shift+= 키를 눌렀을 때 페이지 추가 (다른 키보드 레이아웃 지원)
      if (event.shiftKey) {
        event.preventDefault();
        addNewPage();
      }
      break;
    case '-': // 설정 모드에서 페이지 삭제
      if (isSettingsMode) {
        event.preventDefault();
        removePage();
      }
      break;
    case '_': // 설정 모드에서 페이지 삭제 (Shift+- 지원)
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
 * 페이지 전환
 * @param {number} pageIndex - 전환할 페이지 인덱스
 */
function changePage(pageIndex) {
  // 페이지 인덱스가 유효한지 확인
  if (pageIndex >= 0 && pageIndex < pages.length) {
    // 현재 페이지 인덱스 업데이트
    currentPageIndex = pageIndex;

    // 페이징 버튼 업데이트
    document.querySelectorAll('.paging-button').forEach(button => {
      const index = parseInt(button.dataset.page);
      if (index === currentPageIndex) {
        button.classList.add('active');
      } else {
        button.classList.remove('active');
      }
    });

    // 현재 페이지의 버튼들 표시
    showCurrentPageButtons();

    // 상태 표시
    const pageName = pages[currentPageIndex].name || `페이지 ${currentPageIndex + 1}`;
    showStatus(`${pageName} 로 이동`, 'info');
  }
}

/**
 * 버튼을 컨테이너에 렌더링
 * @param {Array} buttons - 표시할 버튼 배열
 */
function renderButtons(buttons) {
  // 렌더링할 버튼 배열 저장 (키보드 탐색용)
  filteredButtons = buttons || [];

  // 컨테이너 초기화
  buttonsContainer.innerHTML = '';

  // 버튼 생성 및 추가
  filteredButtons.forEach((button, index) => {
    const buttonElement = createButtonElement(button);

    // 클릭 이벤트
    buttonElement.addEventListener('click', () => {
      executeButton(button);
    });

    // 호버 이벤트
    buttonElement.addEventListener('mouseenter', () => {
      selectButton(index);
    });

    buttonsContainer.appendChild(buttonElement);
  });

  // 결과 없음 표시
  if (filteredButtons.length === 0) {
    const noResults = document.createElement('div');
    noResults.className = 'no-results';
    noResults.textContent = '버튼이 없습니다';
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
  // 설정 모드인 경우 버튼 설정 변경
  if (isSettingsMode) {
    editButtonSettings(button);
    return;
  }

  // 일반 모드에서는 버튼 액션 실행
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
 * 버튼 설정 편집 (설정 모드)
 * @param {Object} button - 편집할 버튼 설정
 */
function editButtonSettings(button) {
  // 편집할 버튼 정보를 상태 메시지로 표시
  showStatus(`편집 중: ${button.name}`, 'info');

  // 버튼 이름 및 아이콘 변경 안내
  showStatus(`'${button.shortcut}' 키 버튼 설정 중. 다시 클릭하면 설정이 저장됩니다.`, 'info');

  // 편집중인 버튼 표시를 위한 클래스 추가
  const buttonElements = document.querySelectorAll('.toast-button');
  buttonElements.forEach(element => {
    const buttonData = JSON.parse(element.dataset.action || '{}');
    if (buttonData.name === button.name && buttonData.shortcut === button.shortcut) {
      element.classList.add('editing');
    }
  });

  // 편집 완료 후, 다음 클릭 시 저장하도록 플래그 설정
  // 현재 버튼 정보 저장
  const currentButton = button;

  // 임시 이벤트 리스너 함수
  const completeEditing = function(event) {
    // 버튼 업데이트 (간단한 예시, 실제로는 더 많은 설정이 필요할 수 있음)
    const updatedButton = {
      ...currentButton,
      name: '수정된 ' + currentButton.name,
      icon: '✅'
    };

    // 페이지 내 버튼 업데이트
    const pageIndex = currentPageIndex;
    const buttonIndex = pages[pageIndex].buttons.findIndex(b =>
      b.name === currentButton.name && b.shortcut === currentButton.shortcut
    );

    if (buttonIndex >= 0) {
      pages[pageIndex].buttons[buttonIndex] = updatedButton;

      // 변경사항 저장
      window.toast.saveConfig({ pages });

      // UI 업데이트
      showCurrentPageButtons();

      showStatus(`버튼 ${updatedButton.name} 설정이 변경되었습니다.`, 'success');
    }

    // 이벤트 리스너 제거
    document.removeEventListener('click', completeEditing);

    // 편집 모드에서 기본 모드로 전환
    toggleSettingsMode();

    // 이벤트 전파 방지
    event.stopPropagation();
  };

  // 문서에 임시 이벤트 리스너 추가 (다음 클릭에서 편집 완료)
  document.addEventListener('click', completeEditing);
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
    document.documentElement.setAttribute('data-theme', appearance.theme);
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
 * 현재 페이지 삭제
 */
function removePage() {
  // 설정 모드에서만 동작
  if (!isSettingsMode) {
    showStatus('페이지 삭제는 설정 모드에서만 가능합니다.', 'error');
    return;
  }

  // 페이지가 하나뿐이면 삭제 불가
  if (pages.length <= 1) {
    showStatus('마지막 페이지는 삭제할 수 없습니다.', 'error');
    return;
  }

  // 현재 페이지 정보 저장
  const pageName = pages[currentPageIndex].name || `페이지 ${currentPageIndex + 1}`;

  // 삭제 확인을 표시
  const isConfirmed = confirm(`정말 "${pageName}"을(를) 삭제하시겠습니까?`);

  if (!isConfirmed) {
    showStatus('페이지 삭제가 취소되었습니다.', 'info');
    return;
  }

  // 페이지 삭제
  pages.splice(currentPageIndex, 1);

  // 새로운 현재 페이지 인덱스 계산 (이전 페이지로 이동, 또는 마지막 페이지였다면 새로운 마지막 페이지로 이동)
  const newPageIndex = Math.min(currentPageIndex, pages.length - 1);

  // 페이지 번호와 단축키 재조정
  pages.forEach((page, index) => {
    if (!page.name || page.name.startsWith('페이지 ')) {
      page.name = `페이지 ${index + 1}`;
    }
    if (!page.shortcut || /^\d+$/.test(page.shortcut)) {
      page.shortcut = (index + 1).toString();
    }
  });

  // 변경사항 저장
  window.toast.saveConfig({ pages });

  // 페이징 버튼 업데이트
  renderPagingButtons();

  // 페이지 전환
  changePage(newPageIndex);

  showStatus(`${pageName}이(가) 삭제되었습니다.`, 'success');
}
