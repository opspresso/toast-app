/**
 * Toast - Global Shortcuts
 *
 * This module handles the registration and management of global shortcuts.
 */

const { globalShortcut } = require('electron');
const { createLogger } = require('./logger');

// Create module-specific logger
const logger = createLogger('Shortcuts');

/**
 * Convert a hotkey string to Electron format
 * @param {string} hotkey - User-defined hotkey
 * @returns {string} Hotkey in Electron format
 */
function convertHotkeyToElectronFormat(hotkey) {
  if (!hotkey) {
    return '';
  }

  // Log the original hotkey before conversion
  logger.info(`Converting hotkey format: "${hotkey}"`);

  // Handle special case - when the Space key is included
  if (hotkey.includes('+ ') || hotkey.endsWith('+ ')) {
    // Convert '+ ' to '+Space'
    hotkey = hotkey.replace(/\+ (?=\+|$)/g, '+Space');
    hotkey = hotkey.replace(/\+ $/g, '+Space');
    logger.info(`Space key detected, converted format: "${hotkey}"`);
  }

  // Also check when the last part is empty (e.g. 'Alt+')
  if (hotkey.endsWith('+')) {
    // Invalid hotkey format
    logger.warn(`Invalid hotkey format detected: "${hotkey}"`);
    return '';
  }

  // Trim whitespace and split
  const parts = hotkey.split('+').map(part => part.trim());

  // Array to hold the converted parts
  const convertedParts = [];

  // Separate modifier keys from the main key
  const modifiers = [];
  let mainKey = '';

  for (const part of parts) {
    if (!part) {
      continue;
    } // Skip empty parts

    // Handle modifier keys
    if (part === 'Ctrl' || part === 'Control') {
      modifiers.push('CommandOrControl');
    }
    else if (part === 'Alt') {
      modifiers.push('Alt');
    }
    else if (part === 'Shift') {
      modifiers.push('Shift');
    }
    else if (part === 'Meta' || part === 'Command' || part === 'Super') {
      modifiers.push('Super');
    }
    else {
      // Handle the main key (convert to lowercase)
      // Convert the Space key to 'space'
      if (part === 'Space') {
        mainKey = 'space';
      }
      else {
        mainKey = part.toLowerCase();
      }
    }
  }

  // No modifier key or no main key - invalid hotkey
  if (modifiers.length === 0 || !mainKey) {
    logger.warn(`Invalid hotkey configuration detected: modifiers=${modifiers.join(',')}, mainKey=${mainKey}`);
    return '';
  }

  // Add the modifier keys first, if any
  convertedParts.push(...modifiers);

  // Add the main key last, if any
  convertedParts.push(mainKey);

  // Converted hotkey format
  const electronHotkey = convertedParts.join('+');

  // Log the conversion result
  logger.info(`Converted hotkey: "${hotkey}" -> "${electronHotkey}"`);

  return electronHotkey;
}

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
    const originalHotkey = config.get('globalHotkey');

    if (!originalHotkey) {
      logger.warn('No global hotkey configured');
      return false;
    }

    // Convert the hotkey format
    const electronHotkey = convertHotkeyToElectronFormat(originalHotkey);

    if (!electronHotkey) {
      logger.warn(`Invalid hotkey format: ${originalHotkey}`);
      return false;
    }

    // Register the global hotkey
    const registered = globalShortcut.register(electronHotkey, () => {
      toggleToastWindow(windows.toast, config);
    });

    if (!registered) {
      logger.error(`Failed to register global hotkey: ${originalHotkey} (converted: ${electronHotkey})`);
      return false;
    }

    logger.info(`Registered global hotkey: ${originalHotkey} (converted: ${electronHotkey})`);
    return true;
  }
  catch (error) {
    logger.error('Error registering global shortcuts:', error);
    return false;
  }
}

/**
 * Toggle the visibility of the Toast window
 * @param {BrowserWindow} toastWindow - Toast window
 * @param {Object} [config] - Configuration store (optional)
 */
function toggleToastWindow(toastWindow, config) {
  if (!toastWindow) {
    logger.error('Toast window not available');
    return;
  }

  if (toastWindow.isVisible()) {
    toastWindow.hide();
  }
  else {
    // Position the window before showing it
    positionToastWindow(toastWindow, config);

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
    const x = displayWorkArea.x + Math.round((displayWorkArea.width - windowBounds.width) / 2);
    const y = displayWorkArea.y + Math.round((displayWorkArea.height - windowBounds.height) / 2);

    // Set the window position
    toastWindow.setPosition(x, y);
    return;
  }

  // Get the monitor positions saved for each display
  const monitorPositions = config.get('appearance.monitorPositions') || {};
  const displayId = `${currentDisplay.id}`;
  const savedPosition = monitorPositions[displayId];

  // If we have a saved position for this display, use it
  if (savedPosition) {
    // Get the current display work area to ensure position is within bounds
    const displayWorkArea = currentDisplay.workArea;

    // Ensure position is within screen bounds
    let x = savedPosition.x;
    let y = savedPosition.y;

    // If the position would be off-screen, adjust it
    if (x < displayWorkArea.x) {
      x = displayWorkArea.x;
    }
    if (y < displayWorkArea.y) {
      y = displayWorkArea.y;
    }
    if (x + windowBounds.width > displayWorkArea.x + displayWorkArea.width) {
      x = displayWorkArea.x + displayWorkArea.width - windowBounds.width;
    }
    if (y + windowBounds.height > displayWorkArea.y + displayWorkArea.height) {
      y = displayWorkArea.y + displayWorkArea.height - windowBounds.height;
    }

    // Set the window position to the saved position
    toastWindow.setPosition(x, y);
    return;
  }

  // If no saved position exists, use the global position setting
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
  logger.info('Unregistered all global shortcuts');
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
  positionToastWindow,
};
