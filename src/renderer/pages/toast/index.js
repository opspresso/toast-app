/**
 * Toast - Main Entry Point
 */

import { defaultButtons } from './modules/constants.js';
import {
  closeButton,
  settingsModeToggle,
  settingsButton,
  addPageButton,
  removePageButton,
  userButton,
} from './modules/dom-elements.js';
import { applyAppearanceSettings, showStatus } from './modules/utils.js';
import { initClock } from './modules/clock.js';
import {
  fetchUserProfileAndSubscription,
  updateProfileDisplay,
  updateUserButton,
  showUserProfile,
  setupAuthEventHandlers,
  handlePageLimitAfterLogout,
} from './modules/auth.js';
import {
  initializePages,
  addNewPage,
  removePage,
  pages,
  renderPagingButtons,
  changePage,
} from './modules/pages.js';
import { toggleSettingsMode, showCurrentPageButtons } from './modules/buttons.js';
import { setupKeyboardEventListeners } from './modules/keyboard.js';
import { setupModalEventListeners } from './modules/modals.js';

/**
 * Hide toast window function (including checking and exiting edit mode)
 */
async function hideToastWindow() {
  // Exit edit mode first if active
  const { isSettingsMode } = await import('./modules/buttons.js');
  if (isSettingsMode) {
    toggleSettingsMode();
  }
  // Hide toast window (only if window.toast exists)
  if (window.toast && window.toast.hideWindow) {
    window.toast.hideWindow();
  }
}

/**
 * Sets up all event listeners for UI controls, keyboard shortcuts, authentication events, configuration updates, and modal interactions in the Toast window.
 *
 * This function binds handlers for button clicks, keyboard navigation, authentication state changes, configuration updates, and modal dialogs, ensuring the UI responds appropriately to user actions and system events.
 */
function setupEventListeners() {
  // Close button
  if (closeButton) {
    closeButton.addEventListener('click', () => {
      hideToastWindow();
    });
  }

  // Settings mode toggle button
  if (settingsModeToggle) {
    settingsModeToggle.addEventListener('click', toggleSettingsMode);
  }

  // Settings button - Open settings window
  if (settingsButton) {
    settingsButton.addEventListener('click', () => {
      if (window.toast && window.toast.showSettings) {
        window.toast.showSettings();
      }
    });
  }

  // User button - User information button
  if (userButton) {
    userButton.addEventListener('click', showUserProfile);
  }

  // Add page button
  if (addPageButton) {
    addPageButton.addEventListener('click', addNewPage);
  }

  // Remove page button
  if (removePageButton) {
    removePageButton.addEventListener('click', removePage);
  }

  // Set up modal event listeners
  setupModalEventListeners();

  // Set up keyboard event listeners
  setupKeyboardEventListeners();

  // Set up authentication event handlers (only if window.toast exists)
  if (window.toast) {
    setupAuthEventHandlers();
  }

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

  // Listen for configuration updates (only if window.toast exists)
  if (window.toast && window.toast.onConfigUpdated) {
    window.toast.onConfigUpdated(config => {
      // Handle cases where config.pages is undefined, null, or empty array
      if ('pages' in config) {
        const configPages = config.pages || [];
        initializePages(configPages);

        if (configPages.length === 0) {
          // Display guidance message when no pages exist
          showCurrentPageButtons();
        }
      }

      if (config.appearance) {
        applyAppearanceSettings(config.appearance);
      }

      if (config.subscription) {
        // Update subscription status from auth module
        import('./modules/auth.js').then(({ isSubscribed }) => {
          isSubscribed = config.subscription.isSubscribed;
        });
      }
    });
  }

  // 특별 명령어 처리 (꽃가루 애니메이션 등) - only if window.toast exists
  if (window.toast) {
    window.toast.onSpecialCommand = function (command) {
      console.log('Special command received:', command);

      if (command === 'confetti' || command === '꽃가루') {
        // 꽃가루 애니메이션 실행
        showStatus('🎉 Let it go!', 'success');
        if (window.confetti && window.confetti.start) {
          window.confetti.start({
            duration: 5,  // 5초 동안 실행
            density: 100  // 꽃가루 밀도
          });
        }
        return true; // 명령 처리 완료
      }

      return false; // 처리할 수 없는 명령
    };
  }
}

/**
 * Initialize the application
 */
function initializeApp() {
  console.log('Initializing Toast application...');

  // Always initialize clock first (independent of window.toast)
  initClock();

  // Load configuration (only if window.toast exists)
  if (window.toast) {
    window.addEventListener('config-loaded', event => {
      const config = event.detail;

      // Page settings
      if (config.pages) {
        initializePages(config.pages);
      } else {
        // Create default page if no pages exist
        const newPage = {
          name: 'Page 1',
          shortcut: '1',
          buttons: [...defaultButtons],
        };

        const newPages = [newPage];
        initializePages(newPages);

        // Save the default configuration
        if (window.toast.saveConfig) {
          window.toast.saveConfig({ pages: newPages });
        }
      }

      // Check subscription status
      if (config.subscription) {
        import('./modules/auth.js').then(({ isSubscribed }) => {
          isSubscribed = config.subscription.isSubscribed;
        });
      }

      // Apply appearance settings
      if (config.appearance) {
        applyAppearanceSettings(config.appearance);
      }

      // Load user information when the app starts
      fetchUserProfileAndSubscription()
        .then(() => {
          console.log('User information loading complete');
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
  } else {
    // If window.toast doesn't exist, just show default buttons
    console.log('window.toast not available, showing default buttons');
    const newPage = {
      name: 'Page 1',
      shortcut: '1',
      buttons: [...defaultButtons],
    };
    initializePages([newPage]);
  }

  // Set up event listeners
  setupEventListeners();
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initializeApp);

// Also try to initialize clock immediately in case DOMContentLoaded already fired
if (document.readyState === 'loading') {
  // Document is still loading, wait for DOMContentLoaded
} else {
  // Document is already loaded, initialize immediately
  initializeApp();
}
