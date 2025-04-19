/**
 * Toast - Keyboard Shortcut Action
 *
 * This module handles sending keyboard shortcuts to the system.
 */

const { keyboard, Key } = require('@nut-tree-fork/nut-js');

// Configure nut-js
keyboard.config.autoDelayMs = 100;

/**
 * Execute a keyboard shortcut
 * @param {Object} action - Action configuration
 * @param {string} action.keys - Keyboard shortcut to execute (e.g., "Ctrl+C")
 * @returns {Promise<Object>} Result object
 */
async function executeShortcut(action) {
  try {
    // Validate required parameters
    if (!action.keys) {
      return { success: false, message: 'Keyboard shortcut is required' };
    }

    // Parse the shortcut string
    const keys = parseShortcut(action.keys);

    // Execute the shortcut
    await pressKeys(keys);

    return {
      success: true,
      message: `Executed keyboard shortcut: ${action.keys}`
    };
  } catch (error) {
    return {
      success: false,
      message: `Error executing keyboard shortcut: ${error.message}`,
      error: error
    };
  }
}

/**
 * Parse a shortcut string into an array of keys
 * @param {string} shortcutString - Shortcut string (e.g., "Ctrl+Shift+A")
 * @returns {Array} Array of key constants
 */
function parseShortcut(shortcutString) {
  // Split the shortcut string by '+' or ' '
  const keyStrings = shortcutString.split(/[+\s]/);

  // Map key strings to nut-js key constants
  return keyStrings.map(keyString => {
    const key = keyString.trim().toLowerCase();

    // Map common key names to nut-js constants
    switch (key) {
      case 'ctrl':
      case 'control':
        return Key.LeftControl;
      case 'alt':
        return Key.LeftAlt;
      case 'shift':
        return Key.LeftShift;
      case 'cmd':
      case 'command':
      case 'meta':
      case 'win':
      case 'windows':
        return process.platform === 'darwin' ? Key.LeftSuper : Key.LeftWindows;
      case 'enter':
      case 'return':
        return Key.Enter;
      case 'esc':
      case 'escape':
        return Key.Escape;
      case 'tab':
        return Key.Tab;
      case 'space':
      case 'spacebar':
        return Key.Space;
      case 'backspace':
        return Key.Backspace;
      case 'delete':
      case 'del':
        return Key.Delete;
      case 'home':
        return Key.Home;
      case 'end':
        return Key.End;
      case 'pageup':
      case 'pgup':
        return Key.PageUp;
      case 'pagedown':
      case 'pgdn':
        return Key.PageDown;
      case 'up':
      case 'uparrow':
        return Key.Up;
      case 'down':
      case 'downarrow':
        return Key.Down;
      case 'left':
      case 'leftarrow':
        return Key.Left;
      case 'right':
      case 'rightarrow':
        return Key.Right;
      case 'f1':
        return Key.F1;
      case 'f2':
        return Key.F2;
      case 'f3':
        return Key.F3;
      case 'f4':
        return Key.F4;
      case 'f5':
        return Key.F5;
      case 'f6':
        return Key.F6;
      case 'f7':
        return Key.F7;
      case 'f8':
        return Key.F8;
      case 'f9':
        return Key.F9;
      case 'f10':
        return Key.F10;
      case 'f11':
        return Key.F11;
      case 'f12':
        return Key.F12;
      default:
        // For single characters, use the character itself
        if (key.length === 1) {
          return key.toUpperCase();
        }

        // For unknown keys, throw an error
        throw new Error(`Unknown key: ${keyString}`);
    }
  });
}

/**
 * Press a combination of keys
 * @param {Array} keys - Array of key constants
 * @returns {Promise<void>}
 */
async function pressKeys(keys) {
  try {
    // Press all modifier keys
    for (let i = 0; i < keys.length - 1; i++) {
      await keyboard.pressKey(keys[i]);
    }

    // Press and release the last key
    const lastKey = keys[keys.length - 1];
    await keyboard.pressKey(lastKey);
    await keyboard.releaseKey(lastKey);

    // Release all modifier keys in reverse order
    for (let i = keys.length - 2; i >= 0; i--) {
      await keyboard.releaseKey(keys[i]);
    }
  } catch (error) {
    throw new Error(`Failed to press keys: ${error.message}`);
  }
}

module.exports = {
  executeShortcut
};
