/**
 * Toast App - Configuration Module
 *
 * This module handles the application configuration using electron-store.
 */

const Store = require('electron-store');
const { app } = require('electron');

// Default configuration schema
const schema = {
  globalHotkey: {
    type: 'string',
    default: 'Alt+Space'
  },
  pages: {
    type: 'array',
    default: [
      {
        name: '앱',
        shortcut: '1',
        buttons: [
          // 첫 번째 행 - qwert
          {
            name: 'Music',
            shortcut: 'Q',
            icon: '🎵',
            action: 'exec',
            command: process.platform === 'darwin' ? 'open -a Music' : 'start mswindowsmusic:'
          },
          {
            name: 'Chrome',
            shortcut: 'W',
            icon: '🌐',
            action: 'exec',
            command: process.platform === 'darwin' ? 'open -a "Google Chrome"' : 'start chrome'
          },
          {
            name: 'Mail',
            shortcut: 'E',
            icon: '✉️',
            action: 'exec',
            command: process.platform === 'darwin' ? 'open -a Mail' : 'start outlook:'
          },
          {
            name: 'Calendar',
            shortcut: 'R',
            icon: '📅',
            action: 'exec',
            command: process.platform === 'darwin' ? 'open -a Calendar' : 'start outlookcal:'
          },
          {
            name: 'Terminal',
            shortcut: 'T',
            icon: '⌨️',
            action: 'exec',
            command: process.platform === 'darwin' ? 'open -a Terminal' : 'start cmd.exe'
          },
          // 두 번째 행 - asdfg
          {
            name: 'A',
            shortcut: 'A',
            icon: 'A',
            action: 'shortcut',
            keys: ['a']
          },
          {
            name: 'S',
            shortcut: 'S',
            icon: 'S',
            action: 'shortcut',
            keys: ['s']
          },
          {
            name: 'D',
            shortcut: 'D',
            icon: 'D',
            action: 'shortcut',
            keys: ['d']
          },
          {
            name: 'F',
            shortcut: 'F',
            icon: 'F',
            action: 'shortcut',
            keys: ['f']
          },
          {
            name: 'G',
            shortcut: 'G',
            icon: 'G',
            action: 'shortcut',
            keys: ['g']
          },
          // 세 번째 행 - zxcvb
          {
            name: 'Z',
            shortcut: 'Z',
            icon: 'Z',
            action: 'shortcut',
            keys: ['z']
          },
          {
            name: 'X',
            shortcut: 'X',
            icon: 'X',
            action: 'shortcut',
            keys: ['x']
          },
          {
            name: 'C',
            shortcut: 'C',
            icon: 'C',
            action: 'shortcut',
            keys: ['c']
          },
          {
            name: 'V',
            shortcut: 'V',
            icon: 'V',
            action: 'shortcut',
            keys: ['v']
          },
          {
            name: 'B',
            shortcut: 'B',
            icon: 'B',
            action: 'shortcut',
            keys: ['b']
          }
        ]
      }
    ]
  },
  appearance: {
    type: 'object',
    properties: {
      theme: {
        type: 'string',
        enum: ['light', 'dark', 'system'],
        default: 'system'
      },
      position: {
        type: 'string',
        enum: ['center', 'top', 'bottom', 'cursor'],
        default: 'center'
      },
      size: {
        type: 'string',
        enum: ['small', 'medium', 'large'],
        default: 'medium'
      },
      opacity: {
        type: 'number',
        minimum: 0.1,
        maximum: 1.0,
        default: 0.95
      },
      buttonLayout: {
        type: 'string',
        enum: ['grid', 'list'],
        default: 'grid'
      }
    },
    default: {
      theme: 'system',
      position: 'center',
      size: 'medium',
      opacity: 0.95,
      buttonLayout: 'grid'
    }
  },
  advanced: {
    type: 'object',
    properties: {
      launchAtLogin: {
        type: 'boolean',
        default: false
      },
      hideAfterAction: {
        type: 'boolean',
        default: true
      },
      hideOnBlur: {
        type: 'boolean',
        default: true
      },
      hideOnEscape: {
        type: 'boolean',
        default: true
      },
      showInTaskbar: {
        type: 'boolean',
        default: false
      }
    },
    default: {
      launchAtLogin: false,
      hideAfterAction: true,
      hideOnBlur: true,
      hideOnEscape: true,
      showInTaskbar: false
    }
  },
  subscription: {
    type: 'object',
    properties: {
      isSubscribed: {
        type: 'boolean',
        default: false
      },
      subscribedUntil: {
        type: 'string',
        default: ''
      },
      pageGroups: {
        type: 'number',
        default: 1
      }
    },
    default: {
      isSubscribed: false,
      subscribedUntil: '',
      pageGroups: 1
    }
  },
  firstLaunchCompleted: {
    type: 'boolean',
    default: false
  }
};

/**
 * Create a configuration store
 * @returns {Store} Configuration store instance
 */
function createConfigStore() {
  return new Store({ schema });
}

/**
 * Reset configuration to default values
 * @param {Store} config - Configuration store instance
 */
function resetToDefaults(config) {
  // Clear all existing settings
  config.clear();

  // Set default values for each key
  config.set('globalHotkey', schema.globalHotkey.default);
  config.set('pages', schema.pages.default);
  config.set('appearance', schema.appearance.default);
  config.set('advanced', schema.advanced.default);
  config.set('firstLaunchCompleted', false);
}

/**
 * Import configuration from a file
 * @param {Store} config - Configuration store instance
 * @param {string} filePath - Path to the configuration file
 * @returns {boolean} Success status
 */
function importConfig(config, filePath) {
  try {
    const fs = require('fs');
    const importedConfig = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    // Validate imported configuration
    if (!importedConfig || typeof importedConfig !== 'object') {
      throw new Error('Invalid configuration format');
    }

    // Clear existing configuration
    config.clear();

    // Import each section with validation
    if (importedConfig.globalHotkey && typeof importedConfig.globalHotkey === 'string') {
      config.set('globalHotkey', importedConfig.globalHotkey);
    } else {
      config.set('globalHotkey', schema.globalHotkey.default);
    }

    if (Array.isArray(importedConfig.pages)) {
      config.set('pages', importedConfig.pages);
    } else {
      config.set('pages', schema.pages.default);
    }

    if (importedConfig.appearance && typeof importedConfig.appearance === 'object') {
      config.set('appearance', {
        ...schema.appearance.default,
        ...importedConfig.appearance
      });
    } else {
      config.set('appearance', schema.appearance.default);
    }

    if (importedConfig.advanced && typeof importedConfig.advanced === 'object') {
      config.set('advanced', {
        ...schema.advanced.default,
        ...importedConfig.advanced
      });
    } else {
      config.set('advanced', schema.advanced.default);
    }

    return true;
  } catch (error) {
    console.error('Error importing configuration:', error);
    return false;
  }
}

/**
 * Export configuration to a file
 * @param {Store} config - Configuration store instance
 * @param {string} filePath - Path to save the configuration file
 * @returns {boolean} Success status
 */
function exportConfig(config, filePath) {
  try {
    const fs = require('fs');
    const configData = {
      globalHotkey: config.get('globalHotkey'),
      pages: config.get('pages'),
      appearance: config.get('appearance'),
      advanced: config.get('advanced')
    };

    fs.writeFileSync(filePath, JSON.stringify(configData, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('Error exporting configuration:', error);
    return false;
  }
}

module.exports = {
  createConfigStore,
  resetToDefaults,
  importConfig,
  exportConfig,
  schema
};
