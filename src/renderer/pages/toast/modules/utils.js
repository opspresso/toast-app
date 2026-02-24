/**
 * Toast - Utility Functions
 */

import { shortcuts } from './constants.js';
import { statusContainer } from './dom-elements.js';

/**
 * Creates a standardized no-results element with usage instructions and shortcuts
 * @returns {HTMLElement} - The created no-results element with instructions
 */
export function createNoResultsElement() {
  const container = document.createElement('div');
  container.className = 'no-results';

  // 단축키 섹션 - 앱 디자인 스타일에 맞게 구성
  const shortcutsContainer = document.createElement('div');
  shortcutsContainer.className = 'shortcuts-container';

  // 간결한 단축키 그리드 형태로 표시
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

/**
 * Extract favicon URL from a given website URL
 * @param {string} url - Website URL
 * @returns {string} Favicon URL
 */
export function getFaviconFromUrl(url) {
  try {
    // Create URL object
    const urlObj = new URL(url);
    // Return default favicon URL (domain/favicon.ico)
    return `${urlObj.protocol}//${urlObj.hostname}/favicon.ico`;
  }
  catch (e) {
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
export function isURL(str) {
  if (!str) {
    return false;
  }
  const pattern = /^(https?:\/\/|file:\/\/\/|data:image\/)/i;
  return pattern.test(str.trim());
}

/**
 * Extract initials from user name
 * @param {string} name - User name
 * @returns {string} User initials
 */
export function getInitials(name) {
  return name
    .split(' ')
    .map(part => part.charAt(0))
    .join('')
    .toUpperCase()
    .substring(0, 2);
}

/**
 * Show a status message
 * @param {string} message - Status message
 * @param {string} type - Status type (info, success, error)
 */
export function showStatus(message, type = 'info') {
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
export function applyAppearanceSettings(appearance) {
  const container = document.querySelector('.toast-container');
  const buttonsContainer = document.getElementById('buttons-container');

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
