/**
 * Toast - Keyboard Navigation and Shortcuts
 */

import {
  buttonEditModal,
  profileModal,
  iconSearchModal
} from './dom-elements.js';
import {
  filteredButtons,
  selectedButtonIndex,
  isSettingsMode,
  navigateButtons,
  executeButton,
  toggleSettingsMode
} from './buttons.js';
import { changePage, addNewPage, removePage } from './pages.js';

/**
 * Handle keyboard events
 * @param {KeyboardEvent} event - Keyboard event
 */
export function handleKeyDown(event) {
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
      // Use event.code to get physical key location instead of event.key
      const keyCode = event.code;
      // Extract the relevant part from the code (e.g., 'KeyQ' -> 'Q')
      const keyValue = keyCode.startsWith('Key') ? keyCode.slice(3) :
                      keyCode.startsWith('Digit') ? keyCode.slice(5) : keyCode;

      const buttonIndex = filteredButtons.findIndex(
        button => button.shortcut && button.shortcut.toUpperCase() === keyValue,
      );

      if (buttonIndex >= 0) {
        event.preventDefault();
        executeButton(filteredButtons[buttonIndex]);
      }
      break;
  }
}

/**
 * Handle keyboard page switching (1-9 key events)
 * @param {KeyboardEvent} event - Keyboard event
 */
export async function handlePageSwitching(event) {
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
    const { pages } = await import('./pages.js');
    if (pageNum >= 0 && pageNum < pages.length) {
      changePage(pageNum);
    }
  }
}

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

/**
 * Setup keyboard event listeners
 */
export function setupKeyboardEventListeners() {
  // Keyboard page switching (1-9 key events)
  document.addEventListener('keydown', async (event) => {
    await handlePageSwitching(event);
  });

  // Keyboard navigation
  document.addEventListener('keydown', handleKeyDown);

  // Exit edit mode before window hides
  window.addEventListener('before-window-hide', () => {
    if (isSettingsMode) {
      toggleSettingsMode();
    }
  });
}
