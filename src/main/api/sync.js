/** Cloud settings transport. The sync manager owns serialization and persistence. */
const { ENDPOINTS, createApiClient, getAuthHeaders, authenticatedRequest } = require('./client');
const { validateSnippets } = require('../snippets');
const { validatePages } = require('../action-validation');

let lastSyncStatus = { success: false, timestamp: 0, error: null };

function normalizeSettings(response) {
  const data = response && response.data;
  if (!response || response.success !== true || !data || typeof data !== 'object' || Array.isArray(data) ||
      !Number.isSafeInteger(data.revision) || data.revision < 0) {
    throw new Error('Invalid cloud settings response: expected settings with a server revision. Update Toast Web.');
  }
  const normalized = {};
  for (const key of ['pages', 'snippets', 'appearance', 'advanced']) {
    if (!Object.hasOwn(data, key)) {
      continue;
    }
    const value = data[key];
    if (key === 'pages') {
      const validation = validatePages(value);
      if (!validation.valid) {
        throw new Error(`Invalid cloud pages: ${validation.message}`);
      }
    }
    else if (key === 'snippets') {
      const validation = validateSnippets(value);
      if (!validation.valid) {
        throw new Error(`Invalid cloud snippets: ${validation.error}`);
      }
    }
    else if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new Error(`Invalid cloud ${key}`);
    }
    normalized[key] = value;
  }
  return { data, normalized, syncMetadata: { revision: data.revision, lastModifiedAt: data.lastModifiedAt, lastModifiedDevice: data.lastModifiedDevice } };
}

async function requestSettings(method, { onUnauthorized, directData } = {}) {
  try {
    const result = await authenticatedRequest(async () => {
      const client = createApiClient();
      const options = { headers: getAuthHeaders() };
      const response = method === 'get'
        ? await client.get(ENDPOINTS.SETTINGS, options)
        : await client.put(ENDPOINTS.SETTINGS, directData, options);
      return { success: true, ...normalizeSettings(response.data) };
    }, { onUnauthorized });
    if (!result.success) {
      const error = result.error;
      const failure = {
        success: false,
        error: typeof error === 'object' ? error.message || error.code : error || 'Cloud settings request failed',
        statusCode: typeof error === 'object' ? error.statusCode : result.statusCode,
      };
      lastSyncStatus = { success: false, timestamp: Date.now(), error: failure.error };
      return failure;
    }
    lastSyncStatus = { success: true, timestamp: Date.now(), error: null };
    return result;
  }
  catch (error) {
    lastSyncStatus = { success: false, timestamp: Date.now(), error: error.message };
    return { success: false, error: error.message, statusCode: error.response?.status };
  }
}

function uploadSettings(params) {
  return requestSettings('put', params);
}

function downloadSettings(params) {
  return requestSettings('get', params);
}

function getLastSyncStatus() {
  return { ...lastSyncStatus };
}

module.exports = { uploadSettings, downloadSettings, getLastSyncStatus };
