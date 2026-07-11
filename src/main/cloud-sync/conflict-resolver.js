/**
 * Toast - Cloud Sync Conflict Resolver
 *
 * Pure logic module responsible for cloud sync conflict analysis and per-section merge policies.
 * - pages: local first (preserve user-modified content)
 * - appearance/advanced: newest (local) value first
 */

const { createLogger } = require('../logger');

// Create logger for this module
const logger = createLogger('ConflictResolver');

/**
 * Analyze conflict and determine resolution strategy
 * @param {Object} localMeta - Local metadata
 * @param {Object} serverMeta - Server metadata
 * @param {boolean} hasLocalChanges - Whether local changes exist
 * @returns {Object} Resolution strategy
 */
function analyzeConflict(localMeta, serverMeta, hasLocalChanges) {
  // Use lastModifiedAt if available, fall back to lastSyncedAt for server compatibility
  const localTime = localMeta.lastModifiedAt || localMeta.lastSyncedAt || 0;
  const serverTime = serverMeta.lastModifiedAt || serverMeta.lastSyncedAt || 0;
  const timeDifference = Math.abs(localTime - serverTime);

  // Treat as identical if the time difference is less than 1 minute
  const TIME_THRESHOLD = 60000; // 1 minute

  logger.info(`Analyzing conflict - Local: ${localTime}, Server: ${serverTime}, Diff: ${timeDifference}ms, HasLocalChanges: ${hasLocalChanges}`);

  // 1. No local changes
  if (!hasLocalChanges) {
    if (serverTime > localTime) {
      return { action: 'download_server', reason: 'No local changes, server is newer' };
    }
    else {
      return { action: 'no_action', reason: 'No changes needed' };
    }
  }

  // 2. No server data
  if (!serverTime || serverTime === 0) {
    return { action: 'upload_local', reason: 'No server data, upload local changes' };
  }

  // 3. Compare timestamps
  if (localTime > serverTime + TIME_THRESHOLD) {
    return { action: 'upload_local', reason: 'Local changes are significantly newer' };
  }
  else if (serverTime > localTime + TIME_THRESHOLD) {
    return { action: 'download_server', reason: 'Server changes are significantly newer' };
  }
  else {
    // Attempt merge if the times are similar
    return { action: 'merge_required', reason: 'Concurrent changes detected, merge required' };
  }
}

/**
 * Name-based identity key (name first, position as fallback). Shared by page and button merging.
 * @param {Object} item - Page or button
 * @param {number} index - Position
 * @returns {string} Identity key
 */
function namedItemKey(item, index) {
  if (item && item.name !== undefined && item.name !== null && item.name !== '') {
    return `name:${item.name}`;
  }
  return `index:${index}`;
}

/**
 * Merge button data (within the same page).
 * Local first (preserve content the user just modified), but server-only named buttons
 * (buttons another device added/modified on the same page) are appended to the end to prevent loss.
 * @param {Array} localButtons - Local buttons
 * @param {Array} serverButtons - Server buttons
 * @returns {Array} Merged buttons
 */
function mergeButtons(localButtons = [], serverButtons = []) {
  if (localButtons.length === 0) {
    return serverButtons;
  }

  const localKeys = new Set(localButtons.map((button, index) => namedItemKey(button, index)));
  const merged = [...localButtons];

  serverButtons.forEach((serverButton, index) => {
    const key = namedItemKey(serverButton, index);
    if (key.startsWith('name:') && !localKeys.has(key)) {
      logger.info(`Appending server-only button "${key}" to preserve remote additions`);
      merged.push(serverButton);
    }
  });

  return merged;
}

/**
 * Merge page data
 * Local first (preserve user-modified content), but:
 * - If a local page has no buttons and the corresponding server page has buttons, keep the server version
 * - If a page with the same name has buttons on both local and server, merge at the button level
 *   rather than the whole page (so that even when two devices add/modify different buttons on the
 *   same page at once, neither side's change is lost wholesale)
 * @param {Array} localPages - Local pages
 * @param {Array} serverPages - Server pages
 * @returns {Array} Merged pages
 */
function mergePages(localPages = [], serverPages = []) {
  if (localPages.length === 0) {
    return serverPages;
  }

  const serverByKey = new Map();
  serverPages.forEach((page, index) => {
    serverByKey.set(namedItemKey(page, index), page);
  });

  logger.info(`Merging pages: ${localPages.length} local, ${serverPages.length} server`);

  const localKeys = new Set(localPages.map((page, index) => namedItemKey(page, index)));

  const merged = localPages.map((localPage, index) => {
    const key = namedItemKey(localPage, index);
    // Only adopt/merge a server page when it matches reliably by name.
    // Index fallback matching is excluded because it could replace with an unrelated server page when order differs.
    if (!key.startsWith('name:')) {
      return localPage;
    }
    const serverPage = serverByKey.get(key);
    const serverHasButtons = serverPage && Array.isArray(serverPage.buttons) && serverPage.buttons.length > 0;

    const localButtons = Array.isArray(localPage.buttons) ? localPage.buttons : [];
    if (localButtons.length === 0) {
      if (serverHasButtons) {
        logger.warn(`Local page "${key}" has no buttons; keeping server version to avoid data loss`);
        return serverPage;
      }
      return localPage;
    }

    if (serverHasButtons) {
      return { ...localPage, buttons: mergeButtons(localButtons, serverPage.buttons) };
    }
    return localPage;
  });

  // Preserve pages that exist only on the server and not locally (pages another device added) at the end of the merge result.
  // Without this, server-only pages would be deleted on re-upload.
  // Match by name key only; order-dependent index keys are excluded because they could mistake an unrelated page for a new one.
  serverPages.forEach((serverPage, index) => {
    const key = namedItemKey(serverPage, index);
    if (key.startsWith('name:') && !localKeys.has(key)) {
      logger.info(`Appending server-only page "${key}" to preserve remote additions`);
      merged.push(serverPage);
    }
  });

  return merged;
}

/**
 * Merge snippets
 * Merge keyed by keyword. Local first (preserve content the user just modified), but
 * server-only keywords (added by another device) are appended to the end to prevent loss.
 * @param {Array} localSnippets - Local snippets
 * @param {Array} serverSnippets - Server snippets
 * @returns {Array} Merged snippets
 */
function mergeSnippets(localSnippets = [], serverSnippets = []) {
  if (localSnippets.length === 0) {
    return serverSnippets;
  }

  const localKeywords = new Set(localSnippets.map(s => s && s.keyword));
  const merged = [...localSnippets];

  serverSnippets.forEach(serverSnippet => {
    if (serverSnippet && serverSnippet.keyword && !localKeywords.has(serverSnippet.keyword)) {
      logger.info(`Appending server-only snippet "${serverSnippet.keyword}" to preserve remote additions`);
      merged.push(serverSnippet);
    }
  });

  return merged;
}

/**
 * Merge appearance settings
 * @param {Object} localAppearance - Local appearance settings
 * @param {Object} serverAppearance - Server appearance settings
 * @returns {Object} Merged appearance settings
 */
function mergeAppearance(localAppearance = {}, serverAppearance = {}) {
  // Appearance settings prefer the newest value
  return { ...serverAppearance, ...localAppearance };
}

/**
 * Merge advanced settings
 * @param {Object} localAdvanced - Local advanced settings
 * @param {Object} serverAdvanced - Server advanced settings
 * @returns {Object} Merged advanced settings
 */
function mergeAdvanced(localAdvanced = {}, serverAdvanced = {}) {
  // Advanced settings prefer the newest value
  return { ...serverAdvanced, ...localAdvanced };
}

module.exports = {
  analyzeConflict,
  mergePages,
  mergeButtons,
  mergeSnippets,
  mergeAppearance,
  mergeAdvanced,
};
