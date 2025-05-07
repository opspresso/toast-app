/**
 * Toast - Toast Window JavaScript
 */

// Toast URL configuration
const TOAST_URL = window.toast?.apiBaseUrl || 'https://app.toast.sh';
const SUBSCRIPTION_URL = `${TOAST_URL}/subscription`;
const DASHBOARD_URL = `${TOAST_URL}/dashboard`;

// DOM Elements
const buttonsContainer = document.getElementById('buttons-container');
const pagingContainer = document.getElementById('paging-container');
const pagingButtonsContainer = document.getElementById('paging-buttons-container');
const closeButton = document.getElementById('close-button');
const statusContainer = document.getElementById('status-container');
const buttonTemplate = document.getElementById('button-template');
const settingsModeToggle = document.getElementById('settings-mode-toggle');
const settingsButton = document.getElementById('settings-button');
const addPageButton = document.getElementById('add-page-button');
const removePageButton = document.getElementById('remove-page-button');
const userButton = document.getElementById('user-button');
const toastClock = document.getElementById('toast-clock');

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
const subscribeButton = document.getElementById('subscribe-button');
const dashboardButton = document.getElementById('dashboard-button');
const logoutButton = document.getElementById('logout-button');
const closeProfileButton = document.getElementById('close-profile-button');

// Modal related DOM elements
const buttonEditModal = document.getElementById('button-edit-modal');
const iconSearchModal = document.getElementById('icon-search-modal');
const closeButtonEdit = document.getElementById('close-button-edit');
const saveButtonEdit = document.getElementById('save-button-edit');
const cancelButtonEdit = document.getElementById('cancel-button-edit');
const editButtonNameInput = document.getElementById('edit-button-name');
const editButtonIconInput = document.getElementById('edit-button-icon');
const editButtonShortcutInput = document.getElementById('edit-button-shortcut');
const editButtonActionSelect = document.getElementById('edit-button-action');

// Command action elements
const editButtonCommandInput = document.getElementById('edit-button-command');
const editButtonWorkingDirInput = document.getElementById('edit-button-workingDir');
const editButtonRunInTerminalCheckbox = document.getElementById('edit-button-runInTerminal');

// Open action elements
const editButtonUrlInput = document.getElementById('edit-button-url');
const editButtonPathInput = document.getElementById('edit-button-path');
const editButtonOpenApplicationInput = document.getElementById('edit-button-open-application');
const browsePathButton = document.getElementById('browse-path-button');

// Script action elements
const editButtonScriptInput = document.getElementById('edit-button-script');
const editButtonScriptTypeSelect = document.getElementById('edit-button-scriptType');
const editButtonScriptParamsInput = document.getElementById('edit-button-scriptParams');

// Application action elements
const editButtonApplicationInput = document.getElementById('edit-button-application');
const editButtonApplicationParametersInput = document.getElementById(
  'edit-button-application-parameters',
);
const browseApplicationButton = document.getElementById('browse-application-button');

// Chain action elements
const chainActionsContainer = document.getElementById('chain-actions-container');
const addChainActionButton = document.getElementById('add-chain-action');
const editButtonStopOnErrorCheckbox = document.getElementById('edit-button-stopOnError');

// Input groups
const commandInputGroup = document.getElementById('command-input-group');
const urlInputGroup = document.getElementById('url-input-group');
const scriptInputGroup = document.getElementById('script-input-group');
const shortcutInputGroup = document.getElementById('shortcut-input-group');
const applicationInputGroup = document.getElementById('application-input-group');
const chainInputGroup = document.getElementById('chain-input-group');

// Define default button set
const defaultButtons = [
  // qwert row
  {
    name: 'Toast',
    shortcut: 'Q',
    icon: 'https://app.toast.sh/favicon.ico',
    action: 'open',
    url: 'https://app.toast.sh',
  },
  {
    name: 'How to Use',
    shortcut: 'W',
    icon: 'FlatColorIcons.questions',
    action: 'open',
    url: 'https://app.toast.sh/how-to-use',
  },
  {
    name: 'Subscribe',
    shortcut: 'E',
    icon: 'FlatColorIcons.synchronize',
    action: 'open',
    url: 'https://app.toast.sh/subscription',
  },
  {
    name: 'Confetti',
    shortcut: 'R',
    icon: '🎉',
    action: 'script',
    script: 'confetti',
    scriptType: 'special',
  },
  {
    name: 'iTerm',
    shortcut: 'T',
    icon: '⌨️',
    action: 'exec',
    command: window.toast?.platform === 'darwin' ? 'open -a "iTerm"' : 'start cmd',
  },
  // asdfg row
  {
    name: 'App Store',
    shortcut: 'A',
    icon: '🛒',
    action: 'exec',
    command:
      window.toast?.platform === 'darwin' ? 'open -a "App Store"' : 'start ms-windows-store:',
  },
  {
    name: 'Slack',
    shortcut: 'S',
    icon: 'https://slack.com/favicon.ico',
    action: 'exec',
    command: window.toast?.platform === 'darwin' ? 'open -a Slack' : 'start slack:',
  },
  {
    name: 'Dictionary',
    shortcut: 'D',
    icon: '📚',
    action: 'exec',
    command: window.toast?.platform === 'darwin' ? 'open -a Dictionary' : 'start ms-dictionary:',
  },
  {
    name: 'Finder',
    shortcut: 'F',
    icon: '🔍',
    action: 'exec',
    command: window.toast?.platform === 'darwin' ? 'open ~' : 'explorer ~',
  },
  {
    name: 'GitHub',
    shortcut: 'G',
    icon: 'https://github.com/favicon.ico',
    action: 'open',
    url: 'https://github.com',
  },
  // zxcvb row
  {
    name: 'Zoom',
    shortcut: 'Z',
    icon: 'https://zoom.us/favicon.ico',
    action: 'exec',
    command: window.toast?.platform === 'darwin' ? 'open -a zoom.us' : 'start zoommtg:',
  },
  {
    name: 'Mail',
    shortcut: 'X',
    icon: '✉️',
    action: 'exec',
    command: window.toast?.platform === 'darwin' ? 'open -a Mail' : 'start outlookmail:',
  },
  {
    name: 'Calendar',
    shortcut: 'C',
    icon: '📅',
    action: 'exec',
    command: window.toast?.platform === 'darwin' ? 'open -a Calendar' : 'start outlookcal:',
  },
  {
    name: 'VSCode',
    shortcut: 'V',
    icon: 'https://code.visualstudio.com/favicon.ico',
    action: 'exec',
    command: window.toast?.platform === 'darwin' ? 'open -a "Visual Studio Code"' : 'start code',
  },
  {
    name: 'Chrome',
    shortcut: 'B',
    icon: 'https://www.google.com/chrome/static/images/chrome-logo-m100.svg',
    action: 'exec',
    command: window.toast?.platform === 'darwin' ? 'open -a "Google Chrome"' : 'start chrome',
  },
];

// Define empty button set (15 buttons)
const emptyButtons = Array(15)
  .fill(null)
  .map((_, index) => {
    const rowLetters = ['Q', 'W', 'E', 'R', 'T', 'A', 'S', 'D', 'F', 'G', 'Z', 'X', 'C', 'V', 'B'];
    return {
      name: ``,
      shortcut: rowLetters[index],
      icon: '',
      action: 'application',
      application: '',
      applicationParameters: '',
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
let isRecordingKeyShortcut = false; // Key shortcut recording state

/**
 * Creates a standardized no-results element with usage instructions and shortcuts
 * @returns {HTMLElement} - The created no-results element with instructions
 */
function createNoResultsElement() {
  const container = document.createElement('div');
  container.className = 'no-results';

  // 단축키 섹션 - 앱 디자인 스타일에 맞게 구성
  const shortcutsContainer = document.createElement('div');
  shortcutsContainer.className = 'shortcuts-container';

  // 간결한 단축키 그리드 형태로 표시
  const shortcuts = [
    { key: 'Alt+Space', desc: 'Open Toast window', icon: '🔍' },
    { key: 'ESC', desc: 'Close window', icon: '✖️' },
    { key: '+', desc: 'Add page', icon: '➕' },
    { key: '-', desc: 'Delete page', icon: '➖' },
    { key: '1-9', desc: 'Switch page', icon: '📄' },
    { key: 'qwert asdfg zxcvb', desc: 'Execute action', icon: '🚀' },
    { key: ',', desc: 'Toggle settings mode', icon: '📝' },
    { key: 'Cmd+,', desc: 'Open settings window', icon: '⚙️' },
  ];

  // 2x4 그리드 형태로 배치
  const shortcutsGrid = document.createElement('div');
  shortcutsGrid.className = 'shortcuts-grid';

  shortcuts.forEach(item => {
    const shortcutItem = document.createElement('div');
    shortcutItem.className = 'shortcut-item';

    const itemIcon = document.createElement('span');
    itemIcon.className = 'shortcut-icon';
    itemIcon.textContent = item.icon;

    const itemContent = document.createElement('div');
    itemContent.className = 'shortcut-content';

    const keySpan = document.createElement('div');
    keySpan.className = 'shortcut-key';
    keySpan.textContent = item.key;

    const descSpan = document.createElement('div');
    descSpan.className = 'shortcut-desc';
    descSpan.textContent = item.desc;

    itemContent.appendChild(keySpan);
    itemContent.appendChild(descSpan);

    shortcutItem.appendChild(itemIcon);
    shortcutItem.appendChild(itemContent);
    shortcutsGrid.appendChild(shortcutItem);
  });

  shortcutsContainer.appendChild(shortcutsGrid);
  container.appendChild(shortcutsContainer);

  // 컨테이너에 스타일 추가
  container.style.display = 'flex';
  container.style.flexDirection = 'column';
  container.style.alignItems = 'center';
  container.style.justifyContent = 'center';
  container.style.padding = '20px';
  container.style.textAlign = 'center';
  container.style.height = '310px';

  return container;
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  // Load configuration
  window.addEventListener('config-loaded', event => {
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

    // Load user information when the app starts
    fetchUserProfileAndSubscription()
      .then(() => {
        console.log('User information loading complete:', {
          profileExists: !!userProfile,
          subscriptionExists: !!userSubscription,
        });
        // Update user information UI
        updateProfileDisplay();
        updateUserButton();
      })
      .catch(error => {
        console.error('Error loading user information:', error);
        // Update UI anyway (display as anonymous user) even if error occurs
        updateProfileDisplay();
        updateUserButton();
      });
  });

  // Set up event listeners
  setupEventListeners();

  // Initialize clock
  initClock();
});

/**
 * Initialize the clock and start updating it
 */
function initClock() {
  updateClock();
  // Update clock every second
  setInterval(updateClock, 1000);
}

/**
 * Update the clock display with current time
 */
function updateClock() {
  const now = new Date();
  const hours = now.getHours();
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');

  // Determine AM/PM
  const ampm = hours >= 12 ? 'PM' : 'AM';

  // Convert to 12-hour format
  const hours12 = hours % 12 || 12;
  const hours12Str = String(hours12).padStart(2, '0');

  // Update clock display with HTML formatting
  if (toastClock) {
    toastClock.innerHTML = `<span class="ampm">${ampm}</span> ${hours12Str}:${minutes}<span class="seconds">:${seconds}</span>`;
  }
}

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
 * Sets up all event listeners for UI controls, keyboard shortcuts, authentication events, configuration updates, and modal interactions in the Toast window.
 *
 * This function binds handlers for button clicks, keyboard navigation, authentication state changes, configuration updates, and modal dialogs, ensuring the UI responds appropriately to user actions and system events.
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

  // Settings button - Open settings window
  settingsButton.addEventListener('click', () => {
    window.toast.showSettings();
  });

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

  // Add subscribe button click event
  if (subscribeButton) {
    subscribeButton.addEventListener('click', () => {
      // Open subscription page in browser using defined constant
      window.toast.executeAction({
        action: 'open',
        url: SUBSCRIPTION_URL,
      });

      // Hide profile modal
      hideProfileModal();
    });
  }

  // Add dashboard button click event
  if (dashboardButton) {
    dashboardButton.addEventListener('click', () => {
      // Open dashboard page in browser using defined constant
      window.toast.executeAction({
        action: 'open',
        url: DASHBOARD_URL,
      });

      // Hide profile modal
      hideProfileModal();
    });
  }

  // Set up modal event listeners
  setupModalEventListeners();

  // Process FlatColorIcons object programmatically instead of adding script to HTML
  if (window.IconsCatalog && window.AllIcons) {
    // Create FlatColorIcons object if it doesn't exist
    window.FlatColorIcons = {};

    // Add paths to FlatColorIcons object for all icons
    Object.keys(window.AllIcons).forEach(iconName => {
      window.FlatColorIcons[iconName] = window.AllIcons[iconName];
    });

    console.log('FlatColorIcons object has been initialized.');
  }

  // Keyboard page switching (1-9 key events)
  document.addEventListener('keydown', event => {
    // Keyboard paging does not work when a modal is open
    if (
      buttonEditModal.classList.contains('show') ||
      profileModal.classList.contains('show') ||
      iconSearchModal.classList.contains('show')
    ) {
      return;
    }

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
  window.toast.onConfigUpdated(config => {
    // Handle cases where config.pages is undefined, null, or empty array
    if ('pages' in config) {
      pages = config.pages || [];
      renderPagingButtons();

      if (pages.length > 0) {
        changePage(currentPageIndex < pages.length ? currentPageIndex : 0);
      } else {
        // Initialize button container when no pages exist
        buttonsContainer.innerHTML = '';

        // Display guidance message
        const noResults = createNoResultsElement();
        buttonsContainer.appendChild(noResults);

        // Reset filtered buttons array
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

  // Set up authentication related event listeners
  if (window.toast.onLoginSuccess) {
    window.toast.onLoginSuccess(data => {
      console.log('Login success:', data);
      isSubscribed = data.isSubscribed;

      // Update user information
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
    window.toast.onLoginError(data => {
      console.error('Login error:', data);
      showStatus(`Login failed: ${data.message || data.error || 'Unknown error'}`, 'error');
    });
  }

  if (window.toast.onLogoutSuccess) {
    window.toast.onLogoutSuccess(data => {
      console.log('Logout success event received in toast window');

      // Update UI on successful logout
      userProfile = null;
      userSubscription = null;
      isSubscribed = false;

      // Update user button UI
      updateUserButton();

      showStatus('Logged out successfully', 'success');
    });
  }

  if (window.toast.onAuthStateChanged) {
    window.toast.onAuthStateChanged(data => {
      console.log('Auth state changed event received in toast window:', data);

      // Handle based on authentication state change type
      if (data.type === 'auth-reload') {
        // Load user data and update UI when authentication info is refreshed
        fetchUserProfileAndSubscription()
          .then(() => {
            showStatus(data.message || 'Authentication refreshed', 'success');
          })
          .catch(error => {
            console.error('Error updating user information after auth reload:', error);
          });
      }
    });
  }

  if (window.toast.onAuthReloadSuccess) {
    window.toast.onAuthReloadSuccess(data => {
      console.log('Auth reload success:', data);

      // Update subscription information
      if (data.subscription) {
        userSubscription = data.subscription;
        isSubscribed = data.subscription.active || data.subscription.is_subscribed || false;

        // Update user button UI
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

  // 특별 명령어 처리 (꽃가루 애니메이션 등)
  window.toast.onSpecialCommand = function (command) {
    console.log('Special command received:', command);

    if (command === 'confetti' || command === '꽃가루') {
      // 꽃가루 애니메이션 실행
      showStatus('🎉 Let it go!', 'success');
      window.confetti.start({
        duration: 5,  // 5초 동안 실행
        density: 100  // 꽃가루 밀도
      });
      return true; // 명령 처리 완료
    }

    return false; // 처리할 수 없는 명령
  };
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
 * Fetch user profile information
 * (subscription information is provided by the profile API)
 */
async function fetchUserProfileAndSubscription() {
  try {
    console.log('Starting to fetch user profile and subscription information...');
    // Fetch user profile (only call profile API once)
    const profileResult = await window.toast.fetchUserProfile();
    console.log('Profile API response:', profileResult);

    if (!profileResult.error) {
      userProfile = profileResult;

      // Check and validate is_authenticated value
      if (userProfile.is_authenticated === undefined) {
        console.warn('is_authenticated flag is missing in user profile, assuming authenticated');
        userProfile.is_authenticated = true; // Assume authenticated if value is missing
      }

      // Extract subscription information (provided in profile)
      if (profileResult.subscription) {
        userSubscription = profileResult.subscription;
        console.log('Subscription information extraction successful:', {
          plan: userSubscription.plan || 'free',
          isActive: userSubscription.active || userSubscription.is_subscribed || false,
          pageGroups: userSubscription.features?.page_groups || 1,
        });

        // Update subscription status
        isSubscribed = userSubscription.active || userSubscription.is_subscribed || false;
      } else {
        console.log('No subscription information, using default values');
        // Set default values when no subscription information exists
        userSubscription = {
          active: false,
          is_subscribed: false,
          plan: 'free',
          features: { page_groups: 1 },
        };
        isSubscribed = false;
      }

      // UI update - display profile and subscription information
      updateUserButton();
      updateProfileDisplay();

      console.log('User information update complete: profile and subscription information loaded');
    } else {
      console.error('Failed to fetch user profile information:', profileResult.error);
    }

    return {
      profile: userProfile,
      subscription: userSubscription,
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
  // When user is not logged in
  // Explicitly check is_authenticated flag
  if (
    !userProfile ||
    !userSubscription ||
    (userProfile && userProfile.is_authenticated === false)
  ) {
    try {
      showStatus('Fetching user information...', 'info');
      showLoginLoadingScreen();

      const result = await fetchUserProfileAndSubscription();
      hideLoginLoadingScreen();

      // Start login process if unable to get user information
      if (!result.profile || !result.subscription) {
        // Initialize profile information before showing login screen
        updateProfileDisplay();

        // Change login button text
        if (logoutButton) {
          logoutButton.textContent = 'Sign In';
        }

        // Show login modal
        profileModal.classList.add('show');
        window.toast.setModalOpen(true);

        // Set login button event handler (not logged in state)
        if (logoutButton) {
          // Set completely new event handler (don't restore to original handler)
          logoutButton.onclick = () => {
            // Close modal
            hideProfileModal();

            // Start login process
            setTimeout(() => {
              initiateSignIn();
            }, 300);
          };
        }

        return;
      }
    } catch (error) {
      hideLoginLoadingScreen();
      showStatus('Failed to fetch user information. Please login again.', 'error');

      // Initialize profile information even if error occurs
      updateProfileDisplay();

      // Change login button text
      if (logoutButton) {
        logoutButton.textContent = 'Sign In';
      }

      // Show login modal
      profileModal.classList.add('show');
      window.toast.setModalOpen(true);
      return;
    }
  }

  // Update profile information
  updateProfileDisplay();

  // Show modal
  profileModal.classList.add('show');
  window.toast.setModalOpen(true);
}

/**
 * Display profile image in user button
 */
function updateUserButton() {
  console.log('Starting user button UI update');
  console.log(
    'Current user profile status:',
    userProfile
      ? {
        name: userProfile.name || userProfile.display_name,
        hasImage: !!(userProfile.profile_image || userProfile.avatar || userProfile.image),
        isAuthenticated: userProfile.is_authenticated !== false,
      }
      : 'No userProfile',
  );

  userButton.innerHTML = ''; // Remove existing content

  // Authentication status check - consider logged in only if user profile exists and is_authenticated is true
  const isAuthenticated = userProfile && userProfile.is_authenticated !== false;

  if (isAuthenticated) {
    console.log('Authenticated user - displaying profile image or initials');

    if (userProfile.profile_image || userProfile.avatar || userProfile.image) {
      // If profile image exists
      const img = document.createElement('img');
      const imageUrl = userProfile.profile_image || userProfile.avatar || userProfile.image;
      console.log('Profile image URL:', imageUrl);
      img.src = imageUrl;
      img.alt = 'Profile';
      img.style.width = '100%';
      img.style.height = '100%';
      img.style.objectFit = 'cover';
      img.style.borderRadius = '50%';

      // Handle image load error
      img.onerror = function () {
        console.log('Profile image load failed, using initials');
        // Use initials as fallback if image load fails
        const initials = getInitials(userProfile.name || userProfile.display_name || 'User');
        userButton.textContent = initials;
        userButton.style.fontSize = '12px';
        userButton.style.backgroundColor = 'var(--primary-color)';
        userButton.style.color = 'white';
      };

      // Log on successful image load
      img.onload = function () {
        console.log('Profile image loaded successfully');
      };

      userButton.appendChild(img);
    } else {
      // Display initials if no image available
      const initials = getInitials(userProfile.name || userProfile.display_name || 'User');
      console.log('No profile image, using initials:', initials);
      userButton.textContent = initials;
      userButton.style.fontSize = '12px';
      userButton.style.backgroundColor = 'var(--primary-color)';
      userButton.style.color = 'white';
    }

    // Update tooltip for logged in user
    userButton.title = 'View User Information';
  } else {
    console.log('Unauthenticated user - displaying default icon');
    // Default icon if not logged in
    userButton.textContent = '👤';
    userButton.style.fontSize = '16px';
    userButton.style.backgroundColor = 'transparent';
    userButton.style.color = 'var(--text-color)';
    userButton.style.border = 'none';

    // Change tooltip to login prompt message
    userButton.title = 'Click to login';

    // Change login button style - add border to make it more noticeable
    userButton.style.border = '2px dashed var(--accent-color)';
    userButton.style.boxShadow = '0 0 5px rgba(var(--accent-color-rgb), 0.5)';
  }

  console.log('User button UI update complete');
}

/**
 * Update profile display
 */
function updateProfileDisplay() {
  console.log('Starting profile display update');
  // Initialize profile image
  profileAvatar.innerHTML = '';

  // Authentication status check - consider logged in only if user profile exists and is_authenticated is true
  const isAuthenticated = userProfile && userProfile.is_authenticated !== false;
  console.log('Authentication status:', isAuthenticated);

  if (isAuthenticated) {
    console.log('Displaying authenticated user information');
    // When user profile exists and is authenticated
    if (userProfile.profile_image || userProfile.avatar || userProfile.image) {
      const img = document.createElement('img');
      const imageUrl = userProfile.profile_image || userProfile.avatar || userProfile.image;
      console.log('Profile modal image URL:', imageUrl);
      img.src = imageUrl;
      img.alt = 'Profile image';

      // Handle image load error
      img.onerror = function () {
        console.log('Profile modal image load failed, using initials');
        // Replace with initials if image load fails
        profileAvatar.innerHTML = getInitials(
          userProfile.name || userProfile.display_name || 'User',
        );
      };

      // Apply effect when image load completes
      img.onload = function () {
        console.log('Profile modal image loaded successfully');
        img.style.opacity = 1;
      };

      img.style.opacity = 0;
      img.style.transition = 'opacity 0.3s ease';
      profileAvatar.appendChild(img);
    } else {
      // Use initials if no image available
      const initials = getInitials(userProfile.name || userProfile.display_name || 'User');
      console.log('No profile image, using initials in profile modal:', initials);
      profileAvatar.innerHTML = initials;
    }

    // Set name and email
    profileName.textContent = userProfile.name || userProfile.display_name || 'User';
    profileEmail.textContent = userProfile.email || '';
    console.log('Profile name/email set:', {
      name: profileName.textContent,
      email: profileEmail.textContent,
    });

    // Show logout button when logged in
    if (logoutButton) {
      logoutButton.textContent = 'Sign Out';
    }
  } else {
    console.log('Displaying unauthenticated user status');
    // When no user profile (logged out state)
    profileAvatar.innerHTML = '👤';
    profileName.textContent = 'Guest User';
    profileEmail.textContent = 'Not logged in';

    // Show login button when not logged in
    if (logoutButton) {
      logoutButton.textContent = 'Sign In';
    }
  }

  // Initialize subscription information
  subscriptionStatus.className = 'subscription-value subscription-status-inactive';
  subscriptionPlan.className = 'subscription-value';

  // Initialize button initial state
  if (subscribeButton) {
    subscribeButton.style.display = 'none';
  }

  if (dashboardButton) {
    dashboardButton.style.display = 'none';
  }

  if (userSubscription) {
    console.log('Displaying subscription information:', userSubscription);
    // When subscription information exists
    const isActive = userSubscription.active || userSubscription.is_subscribed || false;
    subscriptionStatus.textContent = isActive ? 'Active' : 'Inactive';
    subscriptionStatus.className =
      'subscription-value ' +
      (isActive ? 'subscription-status-active' : 'subscription-status-inactive');

    // Subscription plan
    const planName = (userSubscription.plan || 'free').toUpperCase();
    subscriptionPlan.textContent = planName;
    if (planName === 'PREMIUM' || planName === 'VIP') {
      subscriptionPlan.classList.add('subscription-plan-premium');
    }

    // Expiry date
    const expiryDate = userSubscription.expiresAt || userSubscription.subscribed_until;
    subscriptionExpiry.textContent = expiryDate
      ? new Date(expiryDate).toLocaleDateString()
      : 'None';

    // Page group information
    const pageGroups = userSubscription.features?.page_groups || '1';
    subscriptionPages.textContent = pageGroups;
    console.log('Subscription information set complete:', {
      status: subscriptionStatus.textContent,
      plan: subscriptionPlan.textContent,
      expiry: subscriptionExpiry.textContent,
      pages: subscriptionPages.textContent,
    });

    // Show subscribe button - when not subscribed (including anonymous users)
    if (!isActive && subscribeButton) {
      subscribeButton.style.display = 'block';
    }

    // Show dashboard button - only for subscribed users
    if (isActive && dashboardButton) {
      dashboardButton.style.display = 'block';
    }
  } else {
    console.log('No subscription information, using default values');
    // When no subscription information (logged out state)
    subscriptionStatus.textContent = 'Inactive';
    subscriptionPlan.textContent = 'FREE';
    subscriptionExpiry.textContent = 'None';
    subscriptionPages.textContent = '1';
  }

  console.log('Profile display update complete');
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
          buttons: [...defaultButtons],
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
  // Check authentication status - consider logged in only if user profile exists and is_authenticated is true
  const isAuthenticated = userProfile && userProfile.is_authenticated !== false;

  // Start login process if not logged in
  if (!isAuthenticated) {
    // Start login process when not logged in
    hideProfileModal();
    setTimeout(() => {
      initiateSignIn();
    }, 300);
    return;
  }

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
      const currentAppearance = (await window.toast.getConfig('appearance')) || {};

      // Attempt to reset all settings
      try {
        // Call logout (function provided in auth.js)
        await window.toast.invoke('logout');
        console.log('Settings reset successful');
      } catch (resetError) {
        console.error('Error resetting settings:', resetError);

        // Alternative method: manually reset settings
        await window.toast.saveConfig({
          subscription: {
            isAuthenticated: false,
            isSubscribed: false,
            plan: 'free',
            expiresAt: '',
            pageGroups: 1,
            isVip: false,
            additionalFeatures: {
              advancedActions: false,
              cloudSync: false,
            },
          },
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

        showStatus(
          'Unauthenticated users can only use 1 page. Only the first page has been kept.',
          'info',
        );
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
    const noResults = createNoResultsElement();
    buttonsContainer.appendChild(noResults);

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

  console.log('New page add request, subscription info:', {
    userProfile: userProfile ? 'exists' : 'none',
    isSubscribed: isSubscribed,
    pageGroups: userSubscription?.features?.page_groups || 1,
  });

  // Calculate allowed maximum number of pages
  let maxPages = 1; // Default: anonymous users are allowed only 1 page

  if (userProfile && userProfile.is_authenticated !== false) {
    // Authenticated user
    maxPages = userSubscription?.features?.page_groups || 3;
    console.log('Authenticated user: max pages =', maxPages);
  } else {
    console.log('Anonymous user: max pages =', maxPages);
  }

  // Check if current page count exceeds maximum pages
  if (pageNumber > maxPages) {
    if (!userProfile || userProfile.is_authenticated === false) {
      showStatus(`Anonymous users can only use ${maxPages} page(s). Please login.`, 'error');
      // Login prompt
      setTimeout(() => {
        showUserProfile(); // Show login modal
      }, 1500);
    } else {
      // Authenticated user
      if (isSubscribed || userSubscription?.active || userSubscription?.is_subscribed) {
        // Subscribed user
        showStatus(`You can only use a maximum of ${maxPages} page(s).`, 'error');
      } else {
        // Authenticated but not subscribed user
        showStatus(
          `Free users can only use a maximum of ${maxPages} page(s). Please subscribe.`,
          'error',
        );
      }
    }
    return;
  }

  // Default new page configuration
  let newPage = {
    name: `Page ${pageNumber}`,
    shortcut: pageNumber.toString(),
    buttons: [],
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
      } else if (!isSettingsMode) {
        // Hide window when ESC is pressed in normal mode (if hideOnEscape is enabled)
        event.preventDefault();
        // Get hideOnEscape setting and hide window if enabled
        window.toast.getConfig('advanced.hideOnEscape').then(hideOnEscape => {
          if (hideOnEscape !== false) {
            hideToastWindow();
          }
        });
      }
      break;
    case ',': // Toggle settings mode when comma key is pressed
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
    case '=': // Add page when = key is pressed (with or without Shift)
      event.preventDefault();
      addNewPage();
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
      const buttonIndex = filteredButtons.findIndex(
        button => button.shortcut && button.shortcut.toUpperCase() === upperKey,
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
      newIndex =
        direction === 'up'
          ? filteredButtons.length -
          (filteredButtons.length % buttonsPerRow || buttonsPerRow) +
          (selectedButtonIndex % buttonsPerRow)
          : direction === 'left'
            ? selectedButtonIndex + buttonsPerRow - 1
            : 0;

      if (newIndex >= filteredButtons.length) {
        newIndex = filteredButtons.length - 1;
      }
    } else if (newIndex >= filteredButtons.length) {
      newIndex =
        direction === 'down'
          ? selectedButtonIndex % buttonsPerRow
          : direction === 'right'
            ? selectedButtonIndex - buttonsPerRow + 1
            : filteredButtons.length - 1;

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
    const noResults = createNoResultsElement();
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

  // Process FlatColorIcons format icon
  if (button.icon && button.icon.startsWith('FlatColorIcons.')) {
    const iconName = button.icon.split('.')[1]; // 'FlatColorIcons.home' -> 'home'
    if (window.AllIcons && window.AllIcons[iconName]) {
      iconElement.textContent = '';
      const img = document.createElement('img');
      img.src = window.AllIcons[iconName];
      img.alt = button.name || iconName;
      img.onerror = function () {
        // Display default icon if image loading fails
        iconElement.textContent = '🔍';
      };
      iconElement.appendChild(img);
    } else {
      // Display only icon name if icon not found
      iconElement.textContent = iconName || '❓';
    }
  }
  // URL type and icon is empty but URL exists, use URL's favicon
  else if (button.action === 'open' && (!button.icon || button.icon.trim() === '') && button.url) {
    // Extract domain from URL and create favicon path
    const faviconUrl = getFaviconFromUrl(button.url);
    iconElement.textContent = '';
    const img = document.createElement('img');
    img.src = faviconUrl;
    img.alt = button.name || 'Button icon';
    img.onerror = function () {
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
    img.onerror = function () {
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

  // 특별 명령어 처리 (꽃가루 애니메이션)
  if (button.action === 'script' && button.scriptType === 'special' && button.script === 'confetti') {
    // 꽃가루 애니메이션 실행
    showStatus('🎉 Let it go!', 'success');
    window.confetti.start({
      duration: 5,  // 5초 동안 실행
      density: 100  // 꽃가루 밀도
    });
    return;
  }

  // Create action object
  const action = {
    action: button.action,
    ...button,
  };

  // Execute the action
  window.toast
    .executeAction(action)
    .then(result => {
      if (result.success) {
        showStatus(result.message || 'Action completed successfully', 'success');

        // Check hideAfterAction setting and hide window if enabled
        window.toast.getConfig('advanced.hideAfterAction').then(hideAfterAction => {
          if (hideAfterAction !== false) {
            window.toast.hideWindow();
          }
        });
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

        // Call ipcRenderer to save current toast window position
        const windowPosition = await window.toast.getWindowPosition();

        // Hide toast window (so file selection dialog appears in front)
        await window.toast.hideWindowTemporarily();

        try {
          // Call file selection dialog
          const result = await window.toast.showOpenDialog(options);

          if (!result.canceled && result.filePaths.length > 0) {
            // Set selected path to input field
            editButtonPathInput.value = result.filePaths[0];
          }
        } finally {
          // Show toast window again after file selection dialog is closed
          await window.toast.showWindowAfterDialog(windowPosition);
        }
      } catch (error) {
        console.error('Error selecting file or folder:', error);
        showStatus('An error occurred while selecting the file or folder.', 'error');
        // Restore alwaysOnTop property even if an error occurs
        await window.toast.setAlwaysOnTop(true);
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
      if (iconSearchModal.classList.contains('show')) {
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

  // Icon search modal event listeners
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

  // Icon search modal close function
  function closeIconSearchModal() {
    iconSearchModal.classList.remove('show');
    window.toast.setModalOpen(false);
  }

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

  // Remove shortcut action type

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
function closeButtonEditModal() {
  // Notify main process that modal is closed
  window.toast.setModalOpen(false);

  buttonEditModal.classList.remove('show');
  currentEditingButton = null;
}

/**
 * Displays the appropriate input fields for the selected button action type in the edit modal.
 *
 * Hides all action-specific input groups, then shows only the group relevant to the provided {@link actionType}. Also updates the icon field hint based on the action type.
 *
 * @param {string} actionType - The selected action type for the button (e.g., 'application', 'exec', 'open', 'script', 'shortcut', 'chain').
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
    case 'shortcut':
      shortcutInputGroup.style.display = 'block';
      break;
    case 'chain':
      chainInputGroup.style.display = 'block';
      break;
  }
}

/**
 * Saves the current button's settings from the edit modal to the active page.
 *
 * Updates the button's properties based on the selected action type and input values, validates script parameters if present, persists the updated configuration, refreshes the UI, and displays a status message.
 *
 * @remark If script parameters are not valid JSON, an error message is shown and an empty object is used instead.
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

  // Save configuration
  window.toast
    .saveConfig({ pages })
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
    const noResults = createNoResultsElement();
    buttonsContainer.appendChild(noResults);

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
