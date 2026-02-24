/**
 * Toast - Global Shortcuts
 *
 * This module handles the registration and management of global shortcuts.
 */

const { globalShortcut } = require('electron');
const { createLogger } = require('./logger');

// 모듈별 로거 생성
const logger = createLogger('Shortcuts');

/**
 * 단축키 형식을 Electron 형식으로 변환
 * @param {string} hotkey - 사용자 정의 단축키
 * @returns {string} Electron 형식 단축키
 */
function convertHotkeyToElectronFormat(hotkey) {
  if (!hotkey) {
    return '';
  }

  // 변환 전 원본 핫키 로깅
  logger.info(`Converting hotkey format: "${hotkey}"`);

  // 특수 케이스 처리 - 스페이스 키가 포함된 경우
  if (hotkey.includes('+ ') || hotkey.endsWith('+ ')) {
    // '+ '를 '+Space'로 변환
    hotkey = hotkey.replace(/\+ (?=\+|$)/g, '+Space');
    hotkey = hotkey.replace(/\+ $/g, '+Space');
    logger.info(`스페이스 키 포함 감지, 변환된 형식: "${hotkey}"`);
  }

  // 또한 마지막 부분이 공백인 경우 ('Alt+'와 같은 경우) 이것도 확인
  if (hotkey.endsWith('+')) {
    // 유효하지 않은 핫키 형식
    logger.warn(`유효하지 않은 핫키 형식 감지: "${hotkey}"`);
    return '';
  }

  // 공백 제거 및 분할
  const parts = hotkey.split('+').map(part => part.trim());

  // 변환된 부분들을 보관할 배열
  const convertedParts = [];

  // 모디파이어 키와 일반 키 분리
  const modifiers = [];
  let mainKey = '';

  for (const part of parts) {
    if (!part) {
      continue;
    } // 빈 부분 건너뛰기

    // 모디파이어 키 처리
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
      // 일반 키 처리 (소문자로 변환)
      // Space 키는 그대로 space로 변환
      if (part === 'Space') {
        mainKey = 'space';
      }
      else {
        mainKey = part.toLowerCase();
      }
    }
  }

  // 모디파이어 키가 하나도 없거나 일반 키가 없는 경우 - 유효하지 않은 핫키
  if (modifiers.length === 0 || !mainKey) {
    logger.warn(`유효하지 않은 핫키 구성 감지: 모디파이어=${modifiers.join(',')}, 일반키=${mainKey}`);
    return '';
  }

  // 모디파이어 키가 있으면 먼저 추가
  convertedParts.push(...modifiers);

  // 일반 키가 있으면 마지막에 추가
  convertedParts.push(mainKey);

  // 변환된 단축키 형식
  const electronHotkey = convertedParts.join('+');

  // 변환 결과 로깅
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

    // 핫키 형식 변환
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
