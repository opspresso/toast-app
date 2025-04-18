/**
 * Toast App - Global Shortcuts
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

  // If config is not provided, get it from the window
  if (!config) {
    const { screen } = require('electron');

    // Get the window size
    const windowBounds = toastWindow.getBounds();

    // Get the screen size
    const displayBounds = screen.getPrimaryDisplay().workAreaSize;

    // Default to center position
    let x = Math.round((displayBounds.width - windowBounds.width) / 2);
    let y = Math.round((displayBounds.height - windowBounds.height) / 2);

    // Set the window position
    toastWindow.setPosition(x, y);
    return;
  }

  // Get position setting from config
  const position = config.get('appearance.position') || 'center';
  const { screen } = require('electron');

  // Get the window size
  const windowBounds = toastWindow.getBounds();

  // Get the screen size
  const displayBounds = screen.getPrimaryDisplay().workAreaSize;

  // Calculate position based on setting
  let x, y;

  switch (position) {
    case 'top':
      x = Math.round((displayBounds.width - windowBounds.width) / 2);
      y = 20;
      break;
    case 'bottom':
      x = Math.round((displayBounds.width - windowBounds.width) / 2);
      y = displayBounds.height - windowBounds.height - 20;
      break;
    case 'cursor':
      const cursorPosition = screen.getCursorScreenPoint();
      x = cursorPosition.x - Math.round(windowBounds.width / 2);
      y = cursorPosition.y - 10;

      // Ensure the window is within the screen bounds
      x = Math.max(0, Math.min(x, displayBounds.width - windowBounds.width));
      y = Math.max(0, Math.min(y, displayBounds.height - windowBounds.height));
      break;
    case 'center':
    default:
      x = Math.round((displayBounds.width - windowBounds.width) / 2);
      y = Math.round((displayBounds.height - windowBounds.height) / 2);
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
