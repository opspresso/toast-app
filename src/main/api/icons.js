/** Upload extracted PNG icons. The sync manager owns retry timing. */
const fs = require('fs');
const path = require('path');
const { app } = require('electron');
const { createLogger } = require('../logger');
const { ENDPOINTS, createApiClient, getAccessToken, getSessionVersion, authenticatedRequest } = require('./client');

const logger = createLogger('ApiIcons');
const MAX_ICON_UPLOAD_BYTES = 2_000_000;
const MAX_CACHED_ICONS = 256;
const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const uploaded = new Map();
const pending = new Map();
let cacheSession = null;
const sessionChanged = () => ({ success: false, canceled: true, error: 'The account changed during icon upload' });

function isWithin(root, target) {
  const relative = path.relative(root, target);
  return relative !== '' && relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
}

async function uploadIcon({ filePath, onUnauthorized = null }) {
  const session = getSessionVersion();
  if (cacheSession !== session) {
    cacheSession = session;
    uploaded.clear();
    pending.clear();
  }
  if (!getAccessToken()) {
    return { success: false, error: 'Sign in before uploading icons' };
  }

  let resolvedPath;
  let cacheKey;
  try {
    const directory = path.join(app.getPath('userData'), 'icons');
    if (typeof filePath !== 'string' || !isWithin(path.resolve(directory), path.resolve(filePath))) {
      return { success: false, error: 'Only icons extracted into the Toast icon cache can be uploaded' };
    }
    const [root, target] = await Promise.all([fs.promises.realpath(directory), fs.promises.realpath(filePath)]);
    if (!isWithin(root, target)) {
      return { success: false, error: 'Icon symlinks must remain inside the Toast icon cache' };
    }
    resolvedPath = target;
    const stats = await fs.promises.stat(resolvedPath);
    if (!stats.isFile() || stats.size <= 0 || stats.size > MAX_ICON_UPLOAD_BYTES) {
      return { success: false, error: `Extracted icons must be nonempty files of at most ${MAX_ICON_UPLOAD_BYTES} bytes` };
    }
    if (session !== getSessionVersion()) {
      return sessionChanged();
    }
    cacheKey = `${resolvedPath}:${stats.mtimeMs}:${stats.size}`;
    const cached = uploaded.get(cacheKey);
    if (cached) {
      uploaded.delete(cacheKey);
      uploaded.set(cacheKey, cached);
      return { success: true, url: cached, cached: true };
    }
  }
  catch (error) {
    return { success: false, error: `Failed to read icon file (${error.code || error.name})` };
  }

  if (pending.has(cacheKey)) {
    return pending.get(cacheKey);
  }
  const request = uploadFile(resolvedPath, session, onUnauthorized).then(result => {
    if (session !== getSessionVersion()) {
      return sessionChanged();
    }
    if (result.success) {
      uploaded.set(cacheKey, result.url);
      if (uploaded.size > MAX_CACHED_ICONS) {
        uploaded.delete(uploaded.keys().next().value);
      }
    }
    return result;
  });
  pending.set(cacheKey, request);
  try {
    return await request;
  }
  finally {
    if (pending.get(cacheKey) === request) {
      pending.delete(cacheKey);
    }
  }
}

async function uploadFile(filePath, session, onUnauthorized) {
  let buffer;
  try {
    buffer = await fs.promises.readFile(filePath);
  }
  catch (error) {
    return { success: false, error: `Failed to read icon file (${error.code || error.name})` };
  }
  if (session !== getSessionVersion()) {
    return sessionChanged();
  }
  if (buffer.length > MAX_ICON_UPLOAD_BYTES || !buffer.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE)) {
    return { success: false, error: 'The extracted icon is not a supported PNG file' };
  }
  const response = await authenticatedRequest(async () => {
    const form = new FormData();
    form.append('icon', new Blob([buffer], { type: 'image/png' }), path.basename(filePath));
    const client = createApiClient({ timeout: 15000, headers: {} });
    return client.post(ENDPOINTS.USER_ICONS, form, { headers: { Authorization: `Bearer ${getAccessToken()}` } });
  }, { onUnauthorized });

  if (response?.error) {
    const statusCode = response.error.statusCode;
    logger.warn('Icon upload failed:', statusCode || response.error.code);
    return {
      success: false, error: response.error, statusCode,
      // Stop this batch after a service/configuration failure. A later sync may
      // retry immediately; a temporary 503 must not suppress uploads for hours.
      ...([404, 405, 503].includes(statusCode) ? { unavailable: true } : {}),
    };
  }
  const url = response?.data?.data?.url;
  let validUrl = false;
  if (response?.data?.success === true && typeof url === 'string') {
    try {
      validUrl = ['http:', 'https:'].includes(new URL(url).protocol);
    }
    catch {
      validUrl = false;
    }
  }
  return validUrl ? { success: true, url } : { success: false, error: 'Invalid icon upload response' };
}

module.exports = { uploadIcon };
