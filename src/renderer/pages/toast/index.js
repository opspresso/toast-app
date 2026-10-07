/**
 * Toast - Main Entry Point
 */

import { closeButton, settingsModeToggle, settingsButton, addPageButton, removePageButton, userButton } from './modules/dom-elements.js';
import { applyAppearanceSettings } from './modules/utils.js';
import { initClock } from './modules/clock.js';
import {
  fetchUserProfileAndSubscription,
  updateProfileDisplay,
  updateUserButton,
  showUserProfile,
  setupAuthEventHandlers,
} from './modules/auth.js';
import { initializePages, addNewPage, removePage } from './modules/pages.js';
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
  }

  // Listen for configuration updates (only if window.toast exists)
  if (window.toast && window.toast.onConfigUpdated) {
    window.toast.onConfigUpdated(config => {
      // Handle cases where config.pages is undefined, null, or empty array
      if ('pages' in config) {
        const configPages = config.pages || [];
        initializePages(configPages, config.authSessionVersion);

        if (configPages.length === 0) {
          // Display guidance message when no pages exist
          showCurrentPageButtons();
        }
      }

      if (config.appearance) {
        applyAppearanceSettings(config.appearance);
      }

      if (config.subscription) {
        // Update subscription status in auth module
        import('./modules/auth.js')
          .then(({ setIsSubscribed }) => {
            setIsSubscribed(config.subscription.isSubscribed);
          })
          .catch(error => {
            console.error('Failed to update subscription state:', error);
          });
      }
    });
  }
}

/**
 * Initialize the application
 */
function initializeApp() {
  if (!window.toast) {
    const error = document.createElement('p');
    error.setAttribute('role', 'alert');
    error.textContent = 'Toast could not load its app connection. Restart the app to try again.';
    document.body.replaceChildren(error);
    return;
  }
  initClock();

  // Load configuration (only if window.toast exists)
  if (window.toast) {
    window.addEventListener('config-loaded', event => {
      const config = event.detail;

      // Page settings
      if (config.pages) {
        initializePages(config.pages, config.authSessionVersion);
      }
      // Check subscription status
      if (config.subscription) {
        import('./modules/auth.js')
          .then(({ setIsSubscribed }) => {
            setIsSubscribed(config.subscription.isSubscribed);
          })
          .catch(error => {
            console.error('Failed to update subscription state:', error);
          });
      }

      // Apply appearance settings
      if (config.appearance) {
        applyAppearanceSettings(config.appearance);
      }

      // Load user information when the app starts
      fetchUserProfileAndSubscription()
        .then(() => {
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
  }
  // Set up event listeners
  setupEventListeners();
}

// Modules execute after parsing. Select one startup path so subscriptions,
// event handlers, and the clock interval are registered only once.
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp, { once: true });
}
else {
  initializeApp();
}
