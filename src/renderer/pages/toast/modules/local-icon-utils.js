/**
 * Toast - Local Icon Utilities
 *
 * Simplified local app icon extraction utilities
 */

/**
 * Core feature: extract the icon and name from an application and update the UI
 * @param {string} applicationPath - Application file path
 * @param {HTMLElement} iconInput - Icon input field
 * @param {HTMLElement} nameInput - Name input field (optional)
 * @param {boolean} forceRefresh - Whether to force a refresh
 * @returns {Promise<boolean>} - Whether it succeeded
 */
async function updateButtonIconFromLocalApp(applicationPath, iconInput, nameInput = null, forceRefresh = false) {
  if (!applicationPath || !iconInput) {
    return false;
  }

  try {
    const result = await window.toast.extractAppIcon(applicationPath, forceRefresh);

    if (result.success) {
      // 1. Update the icon input field
      // If the server upload succeeded, prefer the cross-device shareable https URL;
      // otherwise use the local tilde-path-based file:// URL as before
      iconInput.value = result.remoteUrl || `file://${result.iconPath}`;

      // 2. Update the button name (only when empty)
      if (nameInput && !nameInput.value.trim()) {
        nameInput.value = result.appName;
      }

      // 3. Trigger the input event (to update the preview)
      iconInput.dispatchEvent(new Event('input', { bubbles: true }));

      return true;
    }
    return false;
  }
  catch (err) {
    console.error('Icon extraction error:', err);
    return false;
  }
}

/**
 * Check whether local icon extraction is supported
 * @returns {boolean} - Whether it is supported
 */
function isLocalIconExtractionSupported() {
  return window.toast.platform === 'darwin' && typeof window.toast.extractAppIcon === 'function';
}

// Export as ES6 module
export { updateButtonIconFromLocalApp, isLocalIconExtractionSupported };
