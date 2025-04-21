/**
 * Toast - Global Shortcuts
 *
 * This module handles the registration and management of global shortcuts.
 */

const { globalShortcut } = require('electron');

/**
 * Register global shortcuts
 * @param {Object} config - Configuration store
 * @param {Object} windows - Object containing application windows
 * @returns {boolean} Success status
 */
function registerGlobalShortcuts(config, windows) {
  try {
    // Unregister any existing shortcuts
    globalShortcut.unregisterAll();

    // Get the global hotkey from config
    const globalHotkey = config.get('globalHotkey');

    if (!globalHotkey) {
      console.warn('No global hotkey configured');
      return false;
    }

    // Register the global hotkey
    const registered = globalShortcut.register(globalHotkey, () => {
      toggleToastWindow(windows.toast);
    });

    if (!registered) {
      console.error(`Failed to register global hotkey: ${globalHotkey}`);
      return false;
    }

    console.log(`Registered global hotkey: ${globalHotkey}`);
    return true;
  } catch (error) {
    console.error('Error registering global shortcuts:', error);
    return false;
  }
}

/**
 * Toggle the visibility of the Toast window
 * @param {BrowserWindow} toastWindow - Toast window
 */
function toggleToastWindow(toastWindow) {
  if (!toastWindow) {
    console.error('Toast window not available');
    return;
  }

  if (toastWindow.isVisible()) {
    toastWindow.hide();
  } else {
    // Position the window before showing it
    positionToastWindow(toastWindow);

    // Show and focus the window
    toastWindow.show();
    toastWindow.focus();
  }
}

/**
 * Position the Toast window based on configuration
 * @param {BrowserWindow} toastWindow - Toast window
 * @param {Object} [config] - Configuration store (optional)
 */
function positionToastWindow(toastWindow, config) {
  if (!toastWindow) {
    return;
  }

  const { screen } = require('electron');

  // Get the cursor position to find which display the cursor is on
  const cursorPosition = screen.getCursorScreenPoint();

  // Get the display where the cursor is currently located
  const currentDisplay = screen.getDisplayNearestPoint(cursorPosition);

  // Get the window size
  const windowBounds = toastWindow.getBounds();

  // If config is not provided, default to center position on current display
  if (!config) {
    // Get the current display work area
    const displayWorkArea = currentDisplay.workArea;

    // Default to center position on current display
    let x = displayWorkArea.x + Math.round((displayWorkArea.width - windowBounds.width) / 2);
    let y = displayWorkArea.y + Math.round((displayWorkArea.height - windowBounds.height) / 2);

    // Set the window position
    toastWindow.setPosition(x, y);
    return;
  }

  // Get position setting from config
  const position = config.get('appearance.position') || 'center';

  // Get the current display work area
  const displayWorkArea = currentDisplay.workArea;

  // Calculate position based on setting
  let x, y;

  switch (position) {
    case 'top':
      x = displayWorkArea.x + Math.round((displayWorkArea.width - windowBounds.width) / 2);
      y = displayWorkArea.y + 20;
      break;
    case 'bottom':
      x = displayWorkArea.x + Math.round((displayWorkArea.width - windowBounds.width) / 2);
      y = displayWorkArea.y + displayWorkArea.height - windowBounds.height - 20;
      break;
    case 'cursor':
      x = cursorPosition.x - Math.round(windowBounds.width / 2);
      y = cursorPosition.y - 10;

      // Ensure the window is within the screen bounds
      x = Math.max(displayWorkArea.x, Math.min(x, displayWorkArea.x + displayWorkArea.width - windowBounds.width));
      y = Math.max(displayWorkArea.y, Math.min(y, displayWorkArea.y + displayWorkArea.height - windowBounds.height));
      break;
    case 'center':
    default:
      x = displayWorkArea.x + Math.round((displayWorkArea.width - windowBounds.width) / 2);
      y = displayWorkArea.y + Math.round((displayWorkArea.height - windowBounds.height) / 2);
      break;
  }

  // Set the window position
  toastWindow.setPosition(x, y);
}

/**
 * Unregister all global shortcuts
 */
function unregisterGlobalShortcuts() {
  globalShortcut.unregisterAll();
  console.log('Unregistered all global shortcuts');
}

/**
 * Check if a shortcut is registered
 * @param {string} accelerator - Shortcut to check
 * @returns {boolean} Whether the shortcut is registered
 */
function isShortcutRegistered(accelerator) {
  return globalShortcut.isRegistered(accelerator);
}

module.exports = {
  registerGlobalShortcuts,
  unregisterGlobalShortcuts,
  isShortcutRegistered,
  positionToastWindow
};
