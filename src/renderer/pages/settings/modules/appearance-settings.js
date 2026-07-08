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
  window.settings.log.info('initializeAppearanceSettings 호출');

  try {
    // 테마 설정
    if (themeSelect) {
      themeSelect.value = config.appearance?.theme || 'system';
    }

    // 액센트 색상 설정
    updateAccentSwatchSelection(config.appearance?.accentColor || 'blue');

    // 창 위치 설정
    if (positionSelect) {
      positionSelect.value = config.appearance?.position || 'center';
    }

    // 창 크기 설정
    if (sizeSelect) {
      sizeSelect.value = config.appearance?.size || 'medium';
    }

    // 창 투명도 설정
    if (opacityRange) {
      opacityRange.value = config.appearance?.opacity || 0.95;

      if (opacityValue) {
        opacityValue.textContent = opacityRange.value;
      }
    }

    window.settings.log.info('모양 설정 탭 초기화 완료');
  }
  catch (error) {
    window.settings.log.error('모양 설정 탭 초기화 중 오류 발생:', error);
  }
}

/**
 * Setup appearance settings event listeners
 */
export function setupAppearanceEventListeners() {
  // 모양 설정
  if (themeSelect) {
    themeSelect.addEventListener('change', () => {
      window.settings.log.info('테마 설정 변경:', themeSelect.value);
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
      window.settings.log.info('액센트 색상 설정 변경:', accentColor);
      window.settings.setConfig('appearance.accentColor', accentColor);
      updateAccentSwatchSelection(accentColor);
      applyAccentColor(accentColor);
    });
  }

  if (positionSelect) {
    positionSelect.addEventListener('change', () => {
      window.settings.log.info('창 위치 설정 변경:', positionSelect.value);
      window.settings.setConfig('appearance.position', positionSelect.value);
    });
  }

  if (sizeSelect) {
    sizeSelect.addEventListener('change', () => {
      window.settings.log.info('창 크기 설정 변경:', sizeSelect.value);
      window.settings.setConfig('appearance.size', sizeSelect.value);
    });
  }

  if (opacityRange) {
    opacityRange.addEventListener('input', () => {
      // 슬라이더 이동 중에 값 표시 업데이트
      if (opacityValue) {
        opacityValue.textContent = opacityRange.value;
      }
    });

    opacityRange.addEventListener('change', () => {
      // 슬라이더 변경 완료 시 설정 저장
      window.settings.log.info('창 투명도 설정 변경:', opacityRange.value);
      window.settings.setConfig('appearance.opacity', parseFloat(opacityRange.value));
    });
  }
}
