/**
 * Settings - Appearance Settings Management
 */

import { themeSelect, accentColorPicker, positionSelect, sizeSelect, opacityRange, opacityValue } from './dom-elements.js';
import { config } from './state.js';
import { applyTheme, applyAccentColor } from './utils.js';

/**
 * Mark the swatch matching the given accent color as selected
 * @param {string} accentColor - Accent color name
 */
function updateAccentSwatchSelection(accentColor) {
  if (!accentColorPicker) {
    return;
  }

  accentColorPicker.querySelectorAll('.accent-swatch').forEach(swatch => {
    const isSelected = swatch.dataset.accentColor === accentColor;
    swatch.classList.toggle('selected', isSelected);
    swatch.setAttribute('aria-pressed', String(isSelected));
  });
}

/**
 * Initialize Appearance Settings tab
 */
export function initializeAppearanceSettings() {
  window.settings.log.info('initializeAppearanceSettings called');

  try {
    // Theme setting
    if (themeSelect) {
      themeSelect.value = config.appearance?.theme || 'system';
    }

    // Accent color setting
    updateAccentSwatchSelection(config.appearance?.accentColor || 'blue');

    // Window position setting
    if (positionSelect) {
      positionSelect.value = config.appearance?.position || 'center';
    }

    // Window size setting
    if (sizeSelect) {
      sizeSelect.value = config.appearance?.size || 'medium';
    }

    // Window opacity setting
    if (opacityRange) {
      opacityRange.value = config.appearance?.opacity || 0.95;

      if (opacityValue) {
        opacityValue.textContent = opacityRange.value;
      }
    }

    window.settings.log.info('Appearance settings tab initialization complete');
  }
  catch (error) {
    window.settings.log.error('Error occurred while initializing Appearance settings tab:', error);
  }
}

/**
 * Setup appearance settings event listeners
 */
export function setupAppearanceEventListeners() {
  // Appearance settings
  if (themeSelect) {
    themeSelect.addEventListener('change', () => {
      window.settings.log.info('Theme setting changed:', themeSelect.value);
      window.settings.setConfig('appearance.theme', themeSelect.value);
      applyTheme(themeSelect.value);
    });
  }

  if (accentColorPicker) {
    accentColorPicker.addEventListener('click', event => {
      const swatch = event.target.closest('.accent-swatch');
      if (!swatch) {
        return;
      }

      const accentColor = swatch.dataset.accentColor;
      window.settings.log.info('Accent color setting changed:', accentColor);
      window.settings.setConfig('appearance.accentColor', accentColor);
      updateAccentSwatchSelection(accentColor);
      applyAccentColor(accentColor);
    });
  }

  if (positionSelect) {
    positionSelect.addEventListener('change', () => {
      window.settings.log.info('Window position setting changed:', positionSelect.value);
      window.settings.setConfig('appearance.position', positionSelect.value);
    });
  }

  if (sizeSelect) {
    sizeSelect.addEventListener('change', () => {
      window.settings.log.info('Window size setting changed:', sizeSelect.value);
      window.settings.setConfig('appearance.size', sizeSelect.value);
    });
  }

  if (opacityRange) {
    opacityRange.addEventListener('input', () => {
      // Update value display while the slider is moving
      if (opacityValue) {
        opacityValue.textContent = opacityRange.value;
      }
    });

    opacityRange.addEventListener('change', () => {
      // Save setting when slider change is complete
      window.settings.log.info('Window opacity setting changed:', opacityRange.value);
      window.settings.setConfig('appearance.opacity', parseFloat(opacityRange.value));
    });
  }
}
