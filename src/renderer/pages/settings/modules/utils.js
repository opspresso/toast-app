/**
 * Settings - Utility Functions
 */

/**
 * Show/hide loading state for UI elements
 * @param {HTMLElement} loadingElement - Loading indicator element
 * @param {boolean} isLoading - Loading state
 */
export function setLoading(loadingElement, isLoading) {
  if (loadingElement) {
    if (isLoading) {
      loadingElement.classList.remove('hidden');
    }
    else {
      loadingElement.classList.add('hidden');
    }
  }
}

export { getInitials } from '../../../common/utils.js';

/**
 * Apply theme to the application
 * @param {string} theme - The theme to apply ('light', 'dark', or 'system')
 */
export function applyTheme(theme) {
  // Remove any existing theme classes first
  document.documentElement.classList.remove('theme-light', 'theme-dark');

  // Remove data-theme attribute (used for forced themes)
  document.documentElement.removeAttribute('data-theme');

  // Apply the selected theme
  if (theme === 'light') {
    document.documentElement.setAttribute('data-theme', 'light');
  }
  else if (theme === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
  }

  // Log theme change
  window.settings.log.info('Theme changed to:', theme);
}

/**
 * Apply accent color theme (tokens.css [data-accent] blocks; default is blue)
 * @param {string} accentColor - One of 'blue' | 'red' | 'orange' | 'green' | 'purple' | 'mono'
 */
export function applyAccentColor(accentColor) {
  document.documentElement.setAttribute('data-accent', accentColor || 'blue');
}

/**
 * Convert file size to a human-readable format
 * @param {number} bytes - Number of bytes
 * @returns {string} Converted string (e.g., 1.5 MB)
 */
export function formatFileSize(bytes) {
  if (bytes === 0) {
    return '0 Bytes';
  }

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
