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

// Login and user information related elements
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

// Define default button set
const defaultButtons = [
  // qwert row
  {
    name: 'Toast',
    shortcut: 'Q',
    icon: 'https://web.toast.sh/favicon.ico',
    action: 'open',
    url: 'https://web.toast.sh'
  },
  {
    name: 'Empty',
    shortcut: 'W',
    icon: '➕',
    action: 'exec',
    command: ''
  },
  {
    name: 'Empty',
    shortcut: 'E',
    icon: '➕',
    action: 'exec',
    command: ''
  },
  {
    name: 'Empty',
    shortcut: 'R',
    icon: '➕',
    action: 'exec',
    command: ''
  },
  {
    name: 'iTerm',
    shortcut: 'T',
    icon: '⌨️',
    action: 'exec',
    command: window.toast?.platform === 'darwin' ? 'open -a "iTerm"' : 'start cmd'
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
    name: 'Slack',
    shortcut: 'S',
    icon: 'https://slack.com/favicon.ico',
    action: 'exec',
    command: window.toast?.platform === 'darwin' ? 'open -a Slack' : 'start slack:'
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
    icon: 'https://github.com/favicon.ico',
    action: 'open',
    url: 'https://github.com'
  },
  // zxcvb row
  {
    name: 'Zoom',
    shortcut: 'Z',
    icon: 'https://zoom.us/favicon.ico',
    action: 'exec',
    command: window.toast?.platform === 'darwin' ? 'open -a zoom.us' : 'start zoommtg:'
  },
  {
    name: 'Mail',
    shortcut: 'X',
    icon: '✉️',
    action: 'exec',
    command: window.toast?.platform === 'darwin' ? 'open -a Mail' : 'start outlookmail:'
  },
  {
    name: 'Calendar',
    shortcut: 'C',
    icon: '📅',
    action: 'exec',
    command: window.toast?.platform === 'darwin' ? 'open -a Calendar' : 'start outlookcal:'
  },
  {
    name: 'VSCode',
    shortcut: 'V',
    icon: 'https://code.visualstudio.com/favicon.ico',
    action: 'exec',
    command: window.toast?.platform === 'darwin' ? 'open -a "Visual Studio Code"' : 'start code'
  },
  {
    name: 'Chrome',
    shortcut: 'B',
    icon: 'https://www.google.com/chrome/static/images/chrome-logo-m100.svg',
    action: 'exec',
    command: window.toast?.platform === 'darwin' ? 'open -a "Google Chrome"' : 'start chrome'
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
let userProfile = null; // User profile information
let userSubscription = null; // User subscription information
let isLoggingIn = false; // Login progress status

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

  // User button - User information button
  userButton.addEventListener('click', showUserProfile);

  // Add page button
  addPageButton.addEventListener('click', addNewPage);

  // Remove page button
  removePageButton.addEventListener('click', removePage);

  // Set up profile modal related event listeners
  closeProfileModal.addEventListener('click', hideProfileModal);
  closeProfileButton.addEventListener('click', hideProfileModal);
  logoutButton.addEventListener('click', handleLogout);

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

  // 인증 관련 이벤트 리스너 설정
  if (window.toast.onLoginSuccess) {
    window.toast.onLoginSuccess((data) => {
      console.log('Login success:', data);
      isSubscribed = data.isSubscribed;

      // 사용자 정보 업데이트
      fetchUserProfileAndSubscription()
        .then(() => {
          showStatus('Login successful', 'success');
        })
        .catch(error => {
          console.error('Error updating user information after login:', error);
        });
    });
  }

  if (window.toast.onLoginError) {
    window.toast.onLoginError((data) => {
      console.error('Login error:', data);
      showStatus(`Login failed: ${data.message || data.error || 'Unknown error'}`, 'error');
    });
  }

  if (window.toast.onAuthReloadSuccess) {
    window.toast.onAuthReloadSuccess((data) => {
      console.log('Auth reload success:', data);

      // 구독 정보 업데이트
      if (data.subscription) {
        userSubscription = data.subscription;
        isSubscribed = data.subscription.active || data.subscription.is_subscribed || false;

        // 사용자 버튼 UI 업데이트
        updateUserButton();
      }

      showStatus(data.message || 'Authentication refreshed', 'success');
    });
  }

  // Exit edit mode before window hides
  window.addEventListener('before-window-hide', () => {
    if (isSettingsMode) {
      toggleSettingsMode();
    }
  });
}

/**
 * Start login process and show loading screen
 */
async function initiateSignIn() {
  try {
    // Activate loading screen
    showLoginLoadingScreen();
    isLoggingIn = true;

    // Start login process
    const result = await window.toast.initiateLogin();

    if (result.success) {
      // Get user profile and subscription information
      await fetchUserProfileAndSubscription();

      showStatus('Login successful', 'success');

      // Show user profile modal on successful login
      showUserProfile();
    } else {
      showStatus(`Login failed: ${result.error || 'Unknown error'}`, 'error');
    }
  } catch (error) {
    console.error('Error during login:', error);
    showStatus(`Login error: ${error.message || 'Unknown error'}`, 'error');
  } finally {
    // Deactivate loading screen
    hideLoginLoadingScreen();
    isLoggingIn = false;
  }
}

/**
 * Fetch user profile and subscription information
 */
async function fetchUserProfileAndSubscription() {
  try {
    // Fetch user profile
    const profileResult = await window.toast.fetchUserProfile();
    if (!profileResult.error) {
      userProfile = profileResult;
      // Update user button UI immediately
      updateUserButton();
    } else {
      console.error('Failed to fetch user profile information:', profileResult.error);
    }

    // Fetch subscription information
    const subscriptionResult = await window.toast.fetchSubscription();
    if (!subscriptionResult.error) {
      userSubscription = subscriptionResult;

      // Update subscription status
      isSubscribed = subscriptionResult.active || subscriptionResult.is_subscribed || false;
    } else {
      console.error('Failed to fetch subscription information:', subscriptionResult.error);
    }

    return {
      profile: userProfile,
      subscription: userSubscription
    };
  } catch (error) {
    console.error('Error fetching user information:', error);
    throw error;
  }
}

/**
 * Show login loading screen
 */
function showLoginLoadingScreen() {
  loginLoadingOverlay.classList.add('show');
}

/**
 * Hide login loading screen
 */
function hideLoginLoadingScreen() {
  loginLoadingOverlay.classList.remove('show');
}

/**
 * Show user profile modal
 */
async function showUserProfile() {
  // 사용자가 로그인되어 있지 않은 경우
  if (!userProfile || !userSubscription) {
    try {
      showStatus('Fetching user information...', 'info');
      showLoginLoadingScreen();

      const result = await fetchUserProfileAndSubscription();
      hideLoginLoadingScreen();

      // 사용자 정보를 가져오지 못한 경우 로그인 프로세스 시작
      if (!result.profile || !result.subscription) {
        // 로그인 화면 표시 전에 프로필 정보 초기화
        updateProfileDisplay();

        // 로그인 모달 표시
        profileModal.classList.add('show');
        window.toast.setModalOpen(true);

        // 로그인 버튼 텍스트 변경
        if (logoutButton) {
          logoutButton.textContent = 'Login';

          // 일시적으로 이벤트 리스너 교체
          const originalHandler = logoutButton.onclick;
          logoutButton.onclick = () => {
            // 모달 닫기
            hideProfileModal();

            // 로그인 프로세스 시작
            setTimeout(() => {
              initiateSignIn();

              // 원래 이벤트 리스너 복원
              logoutButton.textContent = 'Logout';
              logoutButton.onclick = originalHandler;
            }, 300);
          };
        }

        return;
      }
    } catch (error) {
      hideLoginLoadingScreen();
      showStatus('Failed to fetch user information. Please login again.', 'error');

      // 오류 발생 시에도 프로필 정보 초기화
      updateProfileDisplay();

      // 로그인 모달 표시
      profileModal.classList.add('show');
      window.toast.setModalOpen(true);
      return;
    }
  }

  // 프로필 정보 업데이트
  updateProfileDisplay();

  // 모달 표시
  profileModal.classList.add('show');
  window.toast.setModalOpen(true);
}

/**
 * Display profile image in user button
 */
function updateUserButton() {
  userButton.innerHTML = ''; // Remove existing content

  if (userProfile) {
    if (userProfile.profile_image || userProfile.avatar || userProfile.image) {
      // If profile image exists
      const img = document.createElement('img');
      img.src = userProfile.profile_image || userProfile.avatar || userProfile.image;
      img.alt = 'Profile';
      img.style.width = '100%';
      img.style.height = '100%';
      img.style.objectFit = 'cover';
      img.style.borderRadius = '50%';

      // Handle image load error
      img.onerror = function() {
        // Use initials as fallback if image load fails
        const initials = getInitials(userProfile.name || userProfile.display_name || 'User');
        userButton.textContent = initials;
        userButton.style.fontSize = '12px';
        userButton.style.backgroundColor = 'var(--primary-color)';
        userButton.style.color = 'white';
      };

      userButton.appendChild(img);
    } else {
      // Display initials if no image available
      const initials = getInitials(userProfile.name || userProfile.display_name || 'User');
      userButton.textContent = initials;
      userButton.style.fontSize = '12px';
      userButton.style.backgroundColor = 'var(--primary-color)';
      userButton.style.color = 'white';
    }
  } else {
    // Default icon if not logged in
    userButton.textContent = '👤';
    userButton.style.fontSize = '16px';
    userButton.style.backgroundColor = 'transparent';
    userButton.style.color = 'var(--text-color)';
  }
}

/**
 * Update profile display
 */
function updateProfileDisplay() {
  // 프로필 이미지 초기화
  profileAvatar.innerHTML = '';

  if (userProfile) {
    // 사용자 프로필이 있는 경우
    if (userProfile.profile_image || userProfile.avatar || userProfile.image) {
      const img = document.createElement('img');
      img.src = userProfile.profile_image || userProfile.avatar || userProfile.image;
      img.alt = 'Profile image';

      // Handle image load error
      img.onerror = function() {
        // Replace with initials if image load fails
        profileAvatar.innerHTML = getInitials(userProfile.name || userProfile.display_name || 'User');
      };

      // Apply effect when image load completes
      img.onload = function() {
        img.style.opacity = 1;
      };

      img.style.opacity = 0;
      img.style.transition = 'opacity 0.3s ease';
      profileAvatar.appendChild(img);
    } else {
      // Use initials if no image available
      profileAvatar.innerHTML = getInitials(userProfile.name || userProfile.display_name || 'User');
    }

    // Set name and email
    profileName.textContent = userProfile.name || userProfile.display_name || 'User';
    profileEmail.textContent = userProfile.email || '';
  } else {
    // 사용자 프로필이 없는 경우 (로그아웃 상태)
    profileAvatar.innerHTML = '👤';
    profileName.textContent = 'Guest User';
    profileEmail.textContent = 'Not logged in';
  }

  // 항상 사용자 버튼 UI 업데이트
  updateUserButton();

  // 구독 정보 초기화
  subscriptionStatus.className = 'subscription-value subscription-status-inactive';
  subscriptionPlan.className = 'subscription-value';

  if (userSubscription) {
    // 구독 정보가 있는 경우
    const isActive = userSubscription.active || userSubscription.is_subscribed || false;
    subscriptionStatus.textContent = isActive ? 'Active' : 'Inactive';
    subscriptionStatus.className = 'subscription-value ' + (isActive ? 'subscription-status-active' : 'subscription-status-inactive');

    // Subscription plan
    const planName = (userSubscription.plan || 'free').toUpperCase();
    subscriptionPlan.textContent = planName;
    if (planName === 'PREMIUM' || planName === 'PRO') {
      subscriptionPlan.classList.add('subscription-plan-premium');
    }

    // Expiry date
    const expiryDate = userSubscription.expiresAt || userSubscription.subscribed_until;
    subscriptionExpiry.textContent = expiryDate ? new Date(expiryDate).toLocaleDateString() : 'None';

    // Page group information is saved but not displayed
    const pageGroups = userSubscription.features?.page_groups || '1';
    subscriptionPages.textContent = pageGroups;
  } else {
    // 구독 정보가 없는 경우 (로그아웃 상태)
    subscriptionStatus.textContent = 'Inactive';
    subscriptionPlan.textContent = 'FREE';
    subscriptionExpiry.textContent = 'None';
    subscriptionPages.textContent = '1';
  }
}

/**
 * Extract initials from user name
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
 * Hide profile modal
 */
function hideProfileModal() {
  profileModal.classList.remove('show');
  window.toast.setModalOpen(false);
}

/**
 * Reset app settings to default values
 * @param {Object} options - Reset options
 * @param {boolean} options.keepAppearance - Whether to keep appearance settings
 * @returns {Promise<Object>} Result object
 */
async function resetToDefaults(options = { keepAppearance: true }) {
  try {
    showStatus('Resetting settings...', 'info');

    // Call resetToDefaults function (exposed from preload)
    const result = await window.toast.resetToDefaults(options);

    if (result.success) {
      // Create default page (if no pages exist)
      if (pages.length === 0) {
        const newPage = {
          name: 'Page 1',
          shortcut: '1',
          buttons: [...defaultButtons]
        };

        pages = [newPage];
        await window.toast.saveConfig({ pages });
      }

      // Update UI
      currentPageIndex = 0;
      renderPagingButtons();
      showCurrentPageButtons();

      showStatus('Settings have been reset to defaults.', 'success');
      return { success: true };
    } else {
      showStatus(`Failed to reset settings: ${result.error}`, 'error');
      return { success: false, error: result.error };
    }
  } catch (error) {
    console.error('Error resetting settings:', error);
    showStatus(`Error resetting settings: ${error.message || 'Unknown error'}`, 'error');
    return { success: false, error: error.message };
  }
}

/**
 * Handle logout process
 */
async function handleLogout() {
  try {
    showStatus('Logging out...', 'info');
    const result = await window.toast.logout();

    if (result) {
      // Reset user profile and subscription information
      userProfile = null;
      userSubscription = null;
      isSubscribed = false;

      // Update user button UI to reflect logged out state
      updateUserButton();

      // Get current settings (for backup)
      const currentAppearance = await window.toast.getConfig('appearance') || {};

      // Attempt to reset all settings
      try {
        // Call logoutAndResetPageGroups (function provided in auth.js)
        await window.toast.invoke('logoutAndResetPageGroups');
        console.log('Settings reset successful');
      } catch (resetError) {
        console.error('Error resetting settings:', resetError);

        // Alternative method: manually reset settings
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

      // Save appearance settings again to preserve them
      if (currentAppearance && Object.keys(currentAppearance).length > 0) {
        await window.toast.saveConfig({ appearance: currentAppearance });
      }

      // Limit number of pages (unauthenticated users are limited to 1 page)
      if (pages.length > 1) {
        // Keep only the first page and delete the rest
        const firstPage = pages[0];
        pages = [firstPage];

        // Set current page to the first page
        currentPageIndex = 0;

        // Update UI
        renderPagingButtons();
        showCurrentPageButtons();

        // Save configuration
        await window.toast.saveConfig({ pages });

        showStatus('Unauthenticated users can only use 1 page. Only the first page has been kept.', 'info');
      }

      showStatus('Logged out successfully.', 'success');
      hideProfileModal();
    } else {
      showStatus('Logout failed', 'error');
    }
  } catch (error) {
    console.error('Logout error:', error);
    showStatus(`Logout error: ${error.message || 'Unknown error'}`, 'error');
  }
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

  // Check authentication status
  if (!userProfile) {
    // Unauthenticated users are limited to 1 page only
    if (pageNumber > 1) {
      showStatus('Unauthenticated users can only use 1 page. Please login.', 'error');
      // Prompt login
      setTimeout(() => {
        showUserProfile(); // Show login modal
      }, 1500);
      return;
    }
  } else {
    // Free authenticated users are limited to 3 pages
    if (pageNumber > 3 && !isSubscribed) {
      showStatus('Free users can only use up to 3 pages. Subscribe to add more pages.', 'error');
      return;
    }
  }

  // Maximum 9 pages limit (for subscribed users)
  if (pageNumber > 9) {
    showStatus('Maximum of 9 pages allowed.', 'error');
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
  // Ignore shortcuts when modal is open (except ESC key)
  if (buttonEditModal.classList.contains('show') || profileModal.classList.contains('show')) {
    // ESC key is only used to close modals (already handled in separate event listeners)
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
      // Open settings window with cmd+, (or ctrl+, on Windows) shortcut
      if (event.metaKey || event.ctrlKey) {
        event.preventDefault();
        window.toast.showSettings();
      } else {
        // Regular comma key continues to toggle settings mode
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
 * Extract favicon URL from a given website URL
 * @param {string} url - Website URL
 * @returns {string} Favicon URL
 */
function getFaviconFromUrl(url) {
  try {
    // Create URL object
    const urlObj = new URL(url);
    // Return default favicon URL (domain/favicon.ico)
    return `${urlObj.protocol}//${urlObj.hostname}/favicon.ico`;
  } catch (e) {
    // Use Google's favicon service when URL parsing fails (fallback)
    if (url && url.includes('://')) {
      const domain = url.split('://')[1].split('/')[0];
      return `https://www.google.com/s2/favicons?domain=${domain}`;
    }
    // Default value for all cases
    return '';
  }
}

/**
 * Check if a string is a URL
 * @param {string} str - String to check
 * @returns {boolean} True if URL, false otherwise
 */
function isURL(str) {
  if (!str) return false;
  const pattern = /^(https?:\/\/|file:\/\/\/|data:image\/)/i;
  return pattern.test(str.trim());
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

  // If URL type and icon is empty but URL exists, use URL's favicon
  if (button.action === 'open' && (!button.icon || button.icon.trim() === '') && button.url) {
    // Extract domain from URL and create favicon path
    const faviconUrl = getFaviconFromUrl(button.url);
    iconElement.textContent = '';
    const img = document.createElement('img');
    img.src = faviconUrl;
    img.alt = button.name || 'Button icon';
    img.onerror = function() {
      // Use default icon if favicon load fails
      iconElement.textContent = '🌐';
    };
    iconElement.appendChild(img);
  } else if (button.action === 'application' && (!button.icon || button.icon.trim() === '')) {
    // Use default app icon if application type and icon is empty
    iconElement.textContent = '🚀';
  } else if (button.icon && isURL(button.icon)) {
    // Create image tag if icon is a URL image
    iconElement.textContent = '';
    const img = document.createElement('img');
    img.src = button.icon;
    img.alt = button.name || 'Button icon';
    img.onerror = function() {
      // Replace with default icon if image load fails
      iconElement.textContent = '🔘';
    };
    iconElement.appendChild(img);
  } else {
    // Use as emoji or plain text
    iconElement.textContent = button.icon || '🔘';
  }

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
        // Set Application folder as default path
        const defaultPath = window.toast?.platform === 'darwin' ? '/Applications' : 'C:\\Program Files';

        // Configure file selection dialog options
        const options = {
          title: 'Select Application',
          defaultPath: defaultPath,
          properties: ['openFile'],
          filters: window.toast?.platform === 'darwin'
            ? [{ name: 'Applications', extensions: ['app'] }]
            : [{ name: 'Executable Files', extensions: ['exe'] }]
        };

        // Call ipcRenderer to save current toast window position
        const windowPosition = await window.toast.getWindowPosition();

        // Hide toast window (so file selection dialog appears in front)
        await window.toast.hideWindowTemporarily();

        try {
          // Call file selection dialog
          const result = await window.toast.showOpenDialog(options);

          if (!result.canceled && result.filePaths.length > 0) {
            // Set selected application path to input field
            editButtonApplicationInput.value = result.filePaths[0];
          }
        } finally {
          // Show toast window again after file selection dialog is closed
          await window.toast.showWindowAfterDialog(windowPosition);
        }
      } catch (error) {
        console.error('Error selecting application:', error);
        showStatus('An error occurred while selecting the application.', 'error');
        // Restore alwaysOnTop property even if an error occurs
        await window.toast.setAlwaysOnTop(true);
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
function closeButtonEditModal() {
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
  commandInputGroup.style.display = 'none';
  urlInputGroup.style.display = 'none';
  scriptInputGroup.style.display = 'none';
  shortcutInputGroup.style.display = 'none';
  applicationInputGroup.style.display = 'none';

  // Update icon field hint
  const iconHint = document.querySelector('.field-hint');
  if (iconHint) {
    // Show custom hint based on type
    if (actionType === 'open') {
      iconHint.textContent = 'Use emoji or leave empty to automatically use URL favicon';
    } else if (actionType === 'application') {
      iconHint.textContent = 'Use emoji or leave empty to use default app icon';
    } else {
      iconHint.textContent = 'Use emoji (e.g. 🚀) or an image URL (https://...)';
    }
  }

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
    name: editButtonNameInput.value.trim(),
    icon: editButtonIconInput.value.trim(),
    shortcut: currentEditingButton.shortcut.trim(), // Shortcut cannot be changed
    action: action
  };

  // Set additional properties based on action type
  switch (action) {
    case 'exec':
      updatedButton.command = editButtonCommandInput.value.trim();
      break;
    case 'open':
      updatedButton.url = editButtonUrlInput.value.trim();
      break;
    case 'script':
      updatedButton.script = editButtonScriptInput.value.trim();
      break;
    case 'shortcut':
      updatedButton.keyShortcut = editButtonKeyShortcutInput.value.trim();
      break;
    case 'application':
      updatedButton.applicationPath = editButtonApplicationInput.value.trim();
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
    // First remove data-theme attribute (reset existing theme)
    document.documentElement.removeAttribute('data-theme');

    // Set data-theme attribute only if it's not system theme
    if (appearance.theme === 'light' || appearance.theme === 'dark') {
      document.documentElement.setAttribute('data-theme', appearance.theme);
    }
    // For system theme, let media query work without data-theme attribute
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
