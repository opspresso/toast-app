/**
 * Toast API - Icon Upload Module
 *
 * Uploads locally extracted button icons to the server (S3) so the same
 * account can use them on any device. Falls back silently when the server
 * does not support icon upload yet or the user is offline.
 */

const fs = require('fs');
const path = require('path');
const { createLogger } = require('../logger');
const { ENDPOINTS, createApiClient, getAccessToken, authenticatedRequest } = require('./client');

const logger = createLogger('ApiIcons');

// 서버가 아이콘 업로드를 지원하지 않을 때(404/405/503) 재시도를 미루는 기간
const UNAVAILABLE_RETRY_MS = 6 * 60 * 60 * 1000; // 6 hours
let unavailableUntil = 0;

// 세션 내 중복 업로드 방지 캐시 (파일 경로+수정시각 → 업로드된 URL)
const uploadedIconCache = new Map();

/**
 * Check whether icon upload is temporarily disabled
 * (server responded 404/405/503 recently)
 * @returns {boolean}
 */
function isUploadUnavailable() {
  return Date.now() < unavailableUntil;
}

/**
 * Reset availability/cache state (for tests and re-login)
 */
function resetUploadState() {
  unavailableUntil = 0;
  uploadedIconCache.clear();
}

/**
 * Upload a local icon file and get a cross-device https URL
 * @param {Object} options - Options
 * @param {string} options.filePath - Absolute path of the icon file (PNG)
 * @param {Function} [options.onUnauthorized] - Token refresh callback for 401 handling
 * @returns {Promise<Object>} { success: true, url } or { success: false, error, unavailable? }
 */
async function uploadIcon({ filePath, onUnauthorized = null }) {
  if (isUploadUnavailable()) {
    return { success: false, unavailable: true, error: 'Icon upload temporarily unavailable' };
  }

  let fileBuffer;
  let cacheKey;
  try {
    const stats = await fs.promises.stat(filePath);
    cacheKey = `${filePath}:${stats.mtimeMs}`;

    const cachedUrl = uploadedIconCache.get(cacheKey);
    if (cachedUrl) {
      return { success: true, url: cachedUrl, cached: true };
    }

    fileBuffer = await fs.promises.readFile(filePath);
  }
  catch (error) {
    return { success: false, error: `Failed to read icon file: ${error.message}` };
  }

  const apiCall = async () => {
    const form = new FormData();
    form.append('icon', new Blob([fileBuffer], { type: 'image/png' }), path.basename(filePath));

    // multipart boundary 는 axios 가 설정하므로 JSON 기본 헤더 없이 생성한다
    const client = createApiClient({ timeout: 15000, headers: {} });
    return await client.post(ENDPOINTS.USER_ICONS, form, {
      headers: { Authorization: `Bearer ${getAccessToken()}` },
    });
  };

  const response = await authenticatedRequest(apiCall, { onUnauthorized });

  if (response && response.error) {
    const statusCode = response.error.statusCode;
    if (statusCode === 404 || statusCode === 405 || statusCode === 503) {
      unavailableUntil = Date.now() + UNAVAILABLE_RETRY_MS;
      logger.info(`Icon upload endpoint unavailable (${statusCode}), retrying after ${UNAVAILABLE_RETRY_MS / 1000}s`);
      return { success: false, unavailable: true, error: response.error };
    }
    logger.debug('Icon upload failed:', response.error.message || response.error.code);
    return { success: false, error: response.error };
  }

  const url = response?.data?.data?.url;
  if (!url) {
    logger.debug('Icon upload returned an unexpected response shape');
    return { success: false, error: 'Invalid icon upload response' };
  }

  uploadedIconCache.set(cacheKey, url);
  logger.info('Icon uploaded successfully');
  return { success: true, url };
}

module.exports = {
  uploadIcon,
  isUploadUnavailable,
  resetUploadState,
};
