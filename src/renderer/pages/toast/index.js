/**
 * Toast - Toast Window JavaScript
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
const userButton = document.getElementById('user-button');

// 로그인 및 사용자 정보 관련 요소
const loginLoadingOverlay = document.getElementById('login-loading-overlay');
const profileModal = document.getElementById('profile-modal');
const closeProfileModal = document.getElementById('close-profile-modal');
const profileAvatar = document.getElementById('profile-avatar');
const profileName = document.getElementById('profile-name');
const profileEmail = document.getElementById('profile-email');
const subscriptionStatus = document.getElementById('subscription-status');
const subscriptionPlan = document.getElementById('subscription-plan');
const subscriptionExpiry = document.getElementById('subscription-expiry');
const subscriptionPages = document.getElementById('subscription-pages');
const logoutButton = document.getElementById('logout-button');
const closeProfileButton = document.getElementById('close-profile-button');

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

// Default buttons - shortened for brevity
const defaultButtons = [
  {
    name: 'VSCode',
    shortcut: 'Q',
    icon: 'https://code.visualstudio.com/favicon.ico',
    action: 'exec',
    command: window.toast?.platform === 'darwin' ? 'open -a "Visual Studio Code"' : 'start code'
  }
];

// Define empty button set (15 buttons)
const emptyButtons = Array(15).fill(null).map((_, index) => {
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
let userProfile = null; // 사용자 프로필 정보
let userSubscription = null; // 사용자 구독 정보
let isLoggingIn = false; // 로그인 진행 상태

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  // Load configuration
  window.addEventListener('config-loaded', (event) => {
    const config = event.detail;

    // Page settings
    if (config.pages) {
      pages = config.pages;
      renderPagingButtons();
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

  function hideToastWindow() {
    if (isSettingsMode) {
      toggleSettingsMode();
    }
    window.toast.hideWindow();
  }

  // Settings mode toggle button
  settingsModeToggle.addEventListener('click', toggleSettingsMode);

  // User button - 사용자 정보 버튼
  userButton.addEventListener('click', showUserProfile);

  // Add page button
  addPageButton.addEventListener('click', addNewPage);

  // Remove page button
  removePageButton.addEventListener('click', removePage);

  // 프로필 모달 관련 이벤트 리스너 설정
  closeProfileModal.addEventListener('click', hideProfileModal);
  closeProfileButton.addEventListener('click', hideProfileModal);
  logoutButton.addEventListener('click', handleLogout);

  // Set up modal event listeners
  setupModalEventListeners();

  // Keyboard event listeners
  document.addEventListener('keydown', (event) => {
    if (/^[1-9]$/.test(event.key) && !event.ctrlKey && !event.altKey && !event.metaKey) {
      const pageNum = parseInt(event.key) - 1;
      if (pageNum >= 0 && pageNum < pages.length) {
        changePage(pageNum);
      }
    }
  });

  document.addEventListener('keydown', handleKeyDown);

  // Listen for configuration updates
  window.toast.onConfigUpdated((config) => {
    if ('pages' in config) {
      pages = config.pages || [];
      renderPagingButtons();

      if (pages.length > 0) {
        changePage(currentPageIndex < pages.length ? currentPageIndex : 0);
      } else {
        buttonsContainer.innerHTML = '';
        const emptyMessage = document.createElement('div');
        emptyMessage.className = 'no-results';
        emptyMessage.textContent = 'No pages found. Press the + button to add a new page.';
        buttonsContainer.appendChild(emptyMessage);
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
 * 로그인 프로세스 시작 및 로딩 화면 표시
 */
async function initiateSignIn() {
  try {
    // 로딩 화면 활성화
    showLoginLoadingScreen();
    isLoggingIn = true;

    // 로그인 프로세스 시작
    const result = await window.toast.initiateLogin();

    if (result.success) {
      // 사용자 정보 및 구독 정보 가져오기
      await fetchUserProfileAndSubscription();

      showStatus('로그인 성공', 'success');

      // 로그인 성공 시 사용자 프로필 모달 표시
      showUserProfile();
    } else {
      showStatus(`로그인 실패: ${result.error || '알 수 없는 오류'}`, 'error');
    }
  } catch (error) {
    console.error('로그인 중 오류 발생:', error);
    showStatus(`로그인 오류: ${error.message || '알 수 없는 오류'}`, 'error');
  } finally {
    // 로딩 화면 비활성화
    hideLoginLoadingScreen();
    isLoggingIn = false;
  }
}

/**
 * 사용자 프로필 및 구독 정보 가져오기
 */
async function fetchUserProfileAndSubscription() {
  try {
    // 사용자 프로필 가져오기
    const profileResult = await window.toast.fetchUserProfile();
    if (!profileResult.error) {
      userProfile = profileResult;
    } else {
      console.error('사용자 프로필 정보를 가져오지 못했습니다:', profileResult.error);
    }

    // 구독 정보 가져오기
    const subscriptionResult = await window.toast.fetchSubscription();
    if (!subscriptionResult.error) {
      userSubscription = subscriptionResult;

      // 구독 상태 업데이트
      isSubscribed = subscriptionResult.active || subscriptionResult.is_subscribed || false;
    } else {
      console.error('구독 정보를 가져오지 못했습니다:', subscriptionResult.error);
    }

    return {
      profile: userProfile,
      subscription: userSubscription
    };
  } catch (error) {
    console.error('사용자 정보 가져오기 오류:', error);
    throw error;
  }
}

/**
 * 로그인 로딩 화면 표시
 */
function showLoginLoadingScreen() {
  loginLoadingOverlay.classList.add('show');
}

/**
 * 로그인 로딩 화면 숨기기
 */
function hideLoginLoadingScreen() {
  loginLoadingOverlay.classList.remove('show');
}

/**
 * 사용자 프로필 모달 표시
 */
async function showUserProfile() {
  // 사용자 프로필 정보가 없으면 가져오기
  if (!userProfile || !userSubscription) {
    try {
      showStatus('사용자 정보를 가져오는 중...', 'info');
      showLoginLoadingScreen();

      const result = await fetchUserProfileAndSubscription();
      hideLoginLoadingScreen();

      if (!result.profile || !result.subscription) {
        // 사용자 정보가 없으면 로그인 실행
        initiateSignIn();
        return;
      }
    } catch (error) {
      hideLoginLoadingScreen();
      showStatus('사용자 정보를 가져오지 못했습니다. 다시 로그인 해주세요.', 'error');
      initiateSignIn();
      return;
    }
  }

  // 프로필 정보 채우기
  updateProfileDisplay();

  // 모달 표시
  profileModal.classList.add('show');
  window.toast.setModalOpen(true);
}

/**
 * 프로필 표시 업데이트
 */
function updateProfileDisplay() {
  if (userProfile) {
    // 프로필 이미지 (아바타)
    if (userProfile.profile_image || userProfile.avatar) {
      profileAvatar.innerHTML = '';
      const img = document.createElement('img');
      img.src = userProfile.profile_image || userProfile.avatar;
      img.alt = '프로필 이미지';
      profileAvatar.appendChild(img);
    } else {
      // 이미지가 없으면 이니셜 사용
      profileAvatar.innerHTML = getInitials(userProfile.name || userProfile.display_name || '사용자');
    }

    // 이름 및 이메일 설정
    profileName.textContent = userProfile.name || userProfile.display_name || '사용자';
    profileEmail.textContent = userProfile.email || '';
  }

  if (userSubscription) {
    // 구독 상태 및 플랜 (한 줄로 표시)
    const isActive = userSubscription.active || userSubscription.is_subscribed || false;
    subscriptionStatus.textContent = isActive ? '활성' : '비활성';
    subscriptionStatus.className = 'subscription-value ' + (isActive ? 'subscription-status-active' : 'subscription-status-inactive');

    // 구독 플랜
    const planName = (userSubscription.plan || 'free').toUpperCase();
    subscriptionPlan.textContent = planName;
    if (planName === 'PREMIUM' || planName === 'PRO') {
      subscriptionPlan.classList.add('subscription-plan-premium');
    }

    // 만료일
    const expiryDate = userSubscription.expiresAt || userSubscription.subscribed_until;
    subscriptionExpiry.textContent = expiryDate ? new Date(expiryDate).toLocaleDateString() : '없음';

    // 페이지 그룹 정보는 저장은 하되 표시하지 않음
    const pageGroups = userSubscription.features?.page_groups || '1';
    subscriptionPages.textContent = pageGroups;
    // HTML에서 이미 display: none 처리함
  }
}

/**
 * 사용자 이름에서 이니셜 추출
 */
function getInitials(name) {
  return name
    .split(' ')
    .map(part => part.charAt(0))
    .join('')
    .toUpperCase()
    .substring(0, 2);
}

/**
 * 프로필 모달 숨기기
 */
function hideProfileModal() {
  profileModal.classList.remove('show');
  window.toast.setModalOpen(false);
}

/**
 * 앱 설정을 기본값으로 초기화
 * @param {Object} options - 초기화 옵션
 * @param {boolean} options.keepAppearance - 외관 설정 유지 여부
 * @returns {Promise<Object>} 결과 객체
 */
async function resetToDefaults(options = { keepAppearance: true }) {
  try {
    showStatus('설정을 초기화하는 중...', 'info');

    // resetToDefaults 함수 호출 (preload에서 노출된 함수)
    const result = await window.toast.resetToDefaults(options);

    if (result.success) {
      // 기본 페이지 생성 (페이지가 없는 경우)
      if (pages.length === 0) {
        const newPage = {
          name: 'Page 1',
          shortcut: '1',
          buttons: [...defaultButtons]
        };

        pages = [newPage];
        await window.toast.saveConfig({ pages });
      }

      // UI 갱신
      currentPageIndex = 0;
      renderPagingButtons();
      showCurrentPageButtons();

      showStatus('설정이 기본값으로 초기화되었습니다.', 'success');
      return { success: true };
    } else {
      showStatus(`설정 초기화 실패: ${result.error}`, 'error');
      return { success: false, error: result.error };
    }
  } catch (error) {
    console.error('설정 초기화 오류:', error);
    showStatus(`설정 초기화 오류: ${error.message || '알 수 없는 오류'}`, 'error');
    return { success: false, error: error.message };
  }
}

/**
 * 로그아웃 처리
 */
async function handleLogout() {
  try {
    showStatus('로그아웃 중...', 'info');
    const result = await window.toast.logout();

    if (result) {
      // 사용자 프로필 및 구독 정보 초기화
      userProfile = null;
      userSubscription = null;
      isSubscribed = false;

      // 현재 설정 가져오기 (백업용)
      const currentAppearance = await window.toast.getConfig('appearance') || {};

      // 전체 설정 초기화 시도
      try {
        // logoutAndResetPageGroups 호출 (auth.js에서 제공하는 함수)
        await window.toast.invoke('logoutAndResetPageGroups');
        console.log('전체 설정 초기화 성공');
      } catch (resetError) {
        console.error('설정 초기화 중 오류:', resetError);

        // 대체 방법: 수동으로 설정 리셋
        await window.toast.saveConfig({
          subscription: {
            isAuthenticated: false,
            isSubscribed: false,
            plan: 'free',
            subscribedUntil: '',
            pageGroups: 1,
            isVip: false,
            additionalFeatures: {
              advancedActions: false,
              cloudSync: false
            }
          }
        });
      }

      // 외관 설정은 유지하기 위해 다시 저장
      if (currentAppearance && Object.keys(currentAppearance).length > 0) {
        await window.toast.saveConfig({ appearance: currentAppearance });
      }

      // 페이지 수 제한 (비인증 사용자는 1페이지로 제한)
      if (pages.length > 1) {
        // 첫 번째 페이지만 유지하고 나머지 삭제
        const firstPage = pages[0];
        pages = [firstPage];

        // 현재 페이지를 첫 번째 페이지로 설정
        currentPageIndex = 0;

        // UI 업데이트
        renderPagingButtons();
        showCurrentPageButtons();

        // 구성 저장
        await window.toast.saveConfig({ pages });

        showStatus('인증되지 않은 사용자는 1개의 페이지만 사용할 수 있습니다. 첫 번째 페이지만 유지됩니다.', 'info');
      }

      showStatus('로그아웃 되었습니다.', 'success');
      hideProfileModal();
    } else {
      showStatus('로그아웃 실패', 'error');
    }
  } catch (error) {
    console.error('로그아웃 오류:', error);
    showStatus(`로그아웃 오류: ${error.message || '알 수 없는 오류'}`, 'error');
  }
}

/**
 * Toggle settings mode
 */
function toggleSettingsMode() {
  isSettingsMode = !isSettingsMode;
  document.body.classList.toggle('settings-mode', isSettingsMode);

  if (isSettingsMode) {
    showStatus('Settings mode activated. Click buttons to edit settings.', 'info');
  } else {
    showStatus('Settings mode deactivated.', 'info');
  }

  showCurrentPageButtons();
}

/**
 * Display buttons for current page
 */
function showCurrentPageButtons() {
  // If there are no pages
  if (pages.length === 0) {
    buttonsContainer.innerHTML = '';
    const emptyMessage = document.createElement('div');
    emptyMessage.className = 'no-results';
    emptyMessage.textContent = 'No pages found. Press the + button to add a new page.';
    buttonsContainer.appendChild(emptyMessage);
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

  // 인증 여부 확인
  if (!userProfile) {
    // 인증되지 않은 사용자는 최대 1개 페이지만 가능
    if (pageNumber > 1) {
      showStatus('인증되지 않은 사용자는 1개의 페이지만 사용할 수 있습니다. 로그인해 주세요.', 'error');
      // 로그인 유도
      setTimeout(() => {
        showUserProfile(); // 로그인 모달 표시
      }, 1500);
      return;
    }
  } else {
    // 인증된 사용자 중 구독자가 아닌 경우 3개 제한
    if (pageNumber > 3 && !isSubscribed) {
      showStatus('무료 사용자는 최대 3개의 페이지만 사용할 수 있습니다. 구독을 통해 더 많은 페이지를 추가하세요.', 'error');
      return;
    }
  }

  // Maximum 9 pages limit (구독 사용자)
  if (pageNumber > 9) {
    showStatus('최대 9개의 페이지만 사용할 수 있습니다.', 'error');
    return;
  }

  let newPage = {
    name: `Page ${pageNumber}`,
    shortcut: pageNumber.toString(),
    buttons: []
  };

  if (pages.length === 0) {
    newPage.buttons = [...defaultButtons];
  } else {
    newPage.buttons = [...emptyButtons];
  }

  pages.push(newPage);
  renderPagingButtons();
  changePage(pages.length - 1);
  window.toast.saveConfig({ pages });
  showStatus(`Page ${pageNumber} has been added.`, 'success');
}

/**
 * Handle keyboard events
 */
function handleKeyDown(event) {
  if (buttonEditModal.classList.contains('show') || profileModal.classList.contains('show')) {
    return;
  }

  // 키보드 이벤트 처리 로직 (생략)
}

/**
 * Switch to a different page
 */
function changePage(pageIndex) {
  if (pageIndex >= 0 && pageIndex < pages.length) {
    currentPageIndex = pageIndex;

    document.querySelectorAll('.paging-button').forEach(button => {
      const index = parseInt(button.dataset.page);
      if (index === currentPageIndex) {
        button.classList.add('active');
      } else {
        button.classList.remove('active');
      }
    });

    showCurrentPageButtons();
    const pageName = pages[currentPageIndex].name || `Page ${currentPageIndex + 1}`;
    showStatus(`Navigated to ${pageName}`, 'info');
  }
}

/**
 * Render buttons to container
 */
function renderButtons(buttons) {
  filteredButtons = buttons || [];
  buttonsContainer.innerHTML = '';

  filteredButtons.forEach((button, index) => {
    const buttonElement = createButtonElement(button);

    buttonElement.addEventListener('click', () => {
      executeButton(button);
    });

    buttonElement.addEventListener('mouseenter', () => {
      selectButton(index);
    });

    buttonsContainer.appendChild(buttonElement);
  });

  if (filteredButtons.length === 0) {
    const noResults = document.createElement('div');
    noResults.className = 'no-results';
    noResults.textContent = 'No buttons available';
    buttonsContainer.appendChild(noResults);
  }
}

/**
 * Create a button element from configuration
 */
function createButtonElement(button) {
  const buttonElement = buttonTemplate.content.cloneNode(true).querySelector('.toast-button');
  buttonElement.dataset.action = JSON.stringify(button);

  const nameElement = buttonElement.querySelector('.button-name');
  nameElement.textContent = button.name;

  const iconElement = buttonElement.querySelector('.button-icon');
  if (button.action === 'open' && (!button.icon || button.icon.trim() === '') && button.url) {
    const faviconUrl = getFaviconFromUrl(button.url);
    iconElement.textContent = '';
    const img = document.createElement('img');
    img.src = faviconUrl;
    img.alt = button.name || 'Button icon';
    img.onerror = function() {
      iconElement.textContent = '🌐';
    };
    iconElement.appendChild(img);
  } else if (button.icon && isURL(button.icon)) {
    iconElement.textContent = '';
    const img = document.createElement('img');
    img.src = button.icon;
    img.alt = button.name || 'Button icon';
    img.onerror = function() {
      iconElement.textContent = '🔘';
    };
    iconElement.appendChild(img);
  } else {
    iconElement.textContent = button.icon || '🔘';
  }

  const shortcutElement = buttonElement.querySelector('.button-shortcut');
  if (button.shortcut) {
    shortcutElement.textContent = button.shortcut;
  } else {
    shortcutElement.style.display = 'none';
  }

  return buttonElement;
}

/**
 * Extract favicon URL from a given website URL
 */
function getFaviconFromUrl(url) {
  try {
    const urlObj = new URL(url);
    return `${urlObj.protocol}//${urlObj.hostname}/favicon.ico`;
  } catch (e) {
    if (url && url.includes('://')) {
      const domain = url.split('://')[1].split('/')[0];
      return `https://www.google.com/s2/favicons?domain=${domain}`;
    }
    return '';
  }
}

/**
 * Check if a string is a URL
 */
function isURL(str) {
  if (!str) return false;
  const pattern = /^(https?:\/\/|file:\/\/\/|data:image\/)/i;
  return pattern.test(str.trim());
}

/**
 * Execute a button's action
 */
function executeButton(button) {
  if (isSettingsMode) {
    editButtonSettings(button);
    return;
  }

  showStatus('Executing...', 'info');
  const action = {
    action: button.action,
    ...button
  };

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
  if (closeModalButton) {
    closeModalButton.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      closeButtonEditModal();
    });
  }

  cancelButtonEdit.addEventListener('click', () => {
    closeButtonEditModal();
  });

  saveButtonEdit.addEventListener('click', saveButtonSettings);

  editButtonActionSelect.addEventListener('change', () => {
    showActionFields(editButtonActionSelect.value);
  });

  // 나머지 이벤트 리스너 설정 (간략화)
}

/**
 * Edit button settings
 */
function editButtonSettings(button) {
  // 버튼 설정 편집 로직 (간략화)
}

/**
 * Close button edit modal
 */
function closeButtonEditModal() {
  window.toast.setModalOpen(false);
  buttonEditModal.classList.remove('show');
  currentEditingButton = null;
}

/**
 * Show status message
 */
function showStatus(message, type = 'info') {
  statusContainer.textContent = message;
  statusContainer.className = 'toast-status';
  statusContainer.classList.add(type);

  if (type === 'success') {
    setTimeout(() => {
      statusContainer.textContent = '';
      statusContainer.className = 'toast-status';
    }, 3000);
  }
}

/**
 * Apply appearance settings
 */
function applyAppearanceSettings(appearance) {
  const container = document.querySelector('.toast-container');

  if (appearance.theme) {
    document.documentElement.removeAttribute('data-theme');
    if (appearance.theme === 'light' || appearance.theme === 'dark') {
      document.documentElement.setAttribute('data-theme', appearance.theme);
    }
  }

  if (appearance.buttonLayout) {
    buttonsContainer.className = 'toast-buttons';
    buttonsContainer.classList.add(appearance.buttonLayout);
  }

  if (appearance.size) {
    container.className = 'toast-container';
    container.classList.add(`size-${appearance.size}`);
  }
}

/**
 * Remove current page
 */
function removePage() {
  if (!isSettingsMode) {
    showStatus('Page deletion is only available in settings mode.', 'error');
    return;
  }

  if (pages.length === 0) {
    return;
  }

  const pageName = pages[currentPageIndex].name || `Page ${currentPageIndex + 1}`;
  const isConfirmed = confirm(`Are you sure you want to delete "${pageName}"?`);

  if (!isConfirmed) {
    showStatus('Page deletion canceled.', 'info');
    return;
  }

  pages.splice(currentPageIndex, 1);
  const newPageIndex = Math.min(currentPageIndex, pages.length - 1);

  pages.forEach((page, index) => {
    if (!page.name || page.name.startsWith('Page ')) {
      page.name = `Page ${index + 1}`;
    }
    if (!page.shortcut || /^\d+$/.test(page.shortcut)) {
      page.shortcut = (index + 1).toString();
    }
  });

  window.toast.saveConfig({ pages });
  renderPagingButtons();

  if (pages.length > 0) {
    changePage(newPageIndex);
  } else {
    buttonsContainer.innerHTML = '';
    filteredButtons = [];
    const emptyMessage = document.createElement('div');
    emptyMessage.className = 'no-results';
    emptyMessage.textContent = 'No pages found. Press the + button to add a new page.';
    buttonsContainer.appendChild(emptyMessage);
    showStatus(`All pages have been deleted. Press the + button to add a new page.`, 'info');
  }
}

// 기본 구현 함수들 - 컴파일 오류 방지용
function showActionFields() {}
function saveButtonSettings() {}
function selectButton() {}
function navigateButtons() {}
function getButtonsPerRow() { return 3; }
