/**
 * Toast - Icon Normalizer
 *
 * Converts local file:// button icons into cross-device https URLs by
 * uploading the referenced files to the server (S3). Runs as a one-time
 * migration per button during cloud sync upload; failed uploads keep the
 * original file:// value so current local behavior is preserved.
 */

const fs = require('fs');
const { createLogger } = require('./../logger');
const { resolveTildePath } = require('./app-icon-extractor');
const apiIcons = require('../api/icons');

const logger = createLogger('IconNormalizer');

// 오프라인·서버 장애 시 남은 버튼 업로드를 포기하는 연속 실패 한도
const MAX_CONSECUTIVE_FAILURES = 3;

/**
 * Convert a file:// icon value to an absolute local path
 * @param {string} icon - Icon value starting with file://
 * @returns {string} Absolute path
 */
function iconToAbsolutePath(icon) {
  const rawPath = icon.slice('file://'.length);
  return rawPath.startsWith('~') ? resolveTildePath(rawPath) : rawPath;
}

/**
 * Replace local file:// icons in pages with uploaded https URLs
 * @param {Array} pages - Pages array from the config store
 * @param {Object} [options] - Options
 * @param {Function} [options.uploadIcon] - Icon upload function (for tests)
 * @param {Function} [options.onUnauthorized] - Token refresh callback
 * @param {string} [options.platform] - Platform override (for tests)
 * @returns {Promise<Object>} { pages, changed, failures }
 */
async function normalizeLocalIcons(pages, options = {}) {
  const { uploadIcon = apiIcons.uploadIcon, onUnauthorized = null, platform = process.platform } = options;

  // 로컬 아이콘 파일은 macOS 추출 기능으로만 생성되므로 다른 플랫폼에서는 할 일이 없다
  if (platform !== 'darwin' || !Array.isArray(pages)) {
    return { pages, changed: false, failures: 0 };
  }

  let changed = false;
  let failures = 0;
  let consecutiveFailures = 0;
  const normalizedPages = [];

  for (const page of pages) {
    if (!page || !Array.isArray(page.buttons)) {
      normalizedPages.push(page);
      continue;
    }

    const buttons = [];
    for (const button of page.buttons) {
      const icon = button && typeof button.icon === 'string' ? button.icon : null;
      if (!icon || !icon.startsWith('file://') || consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
        buttons.push(button);
        continue;
      }

      const absolutePath = iconToAbsolutePath(icon);
      if (!fs.existsSync(absolutePath)) {
        // 이 기기에 파일이 없는 아이콘(다른 기기에서 동기화된 값 등)은 건드리지 않는다
        buttons.push(button);
        continue;
      }

      const result = await uploadIcon({ filePath: absolutePath, onUnauthorized });
      if (result.success) {
        buttons.push({ ...button, icon: result.url });
        changed = true;
        consecutiveFailures = 0;
      }
      else {
        failures++;
        // 엔드포인트 미지원(unavailable)은 즉시 전체 중단, 그 외에는 연속 실패 한도까지 시도
        consecutiveFailures = result.unavailable ? MAX_CONSECUTIVE_FAILURES : consecutiveFailures + 1;
        buttons.push(button);
      }
    }

    normalizedPages.push({ ...page, buttons });
  }

  if (failures > 0) {
    logger.info(`Icon normalization finished with ${failures} failed upload(s); failed icons keep their local paths`);
  }

  return { pages: changed ? normalizedPages : pages, changed, failures };
}

module.exports = {
  normalizeLocalIcons,
};
