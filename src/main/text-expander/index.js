/**
 * Toast - Text Expander (I/O layer)
 *
 * Wires the pure matcher to the native global keyboard hook (uiohook-napi)
 * and the system clipboard to perform inline text expansion: typing a
 * snippet keyword in any app replaces it with the snippet content.
 *
 * macOS only for now. Requires Accessibility (and Input Monitoring) permission.
 * Disabled by default; the user must opt in from the Snippets settings tab.
 *
 * Privacy: this module never logs keystrokes, buffer contents, or snippet
 * text. Only a matched snippet id is logged at debug level.
 */

const { clipboard, systemPreferences } = require('electron');
const { createLogger } = require('../logger');
const matcher = require('./matcher');

const logger = createLogger('TextExpander');

// How long to wait before restoring the user's previous clipboard after a
// paste. Long enough for the synthetic Cmd+V to be delivered.
const CLIPBOARD_RESTORE_DELAY_MS = 250;

let configRef = null;
let uio = null; // lazily-loaded uiohook-napi module
let running = false;
let injecting = false; // true while we synthesize keystrokes (ignore our own)
let listenersBound = false;
let snippets = [];
const bufferState = matcher.createBufferState();

/**
 * Lazily load the native module so a load failure degrades gracefully
 * instead of crashing the whole app at require time.
 */
function loadUio() {
  if (uio) {
    return uio;
  }
  try {
    uio = require('uiohook-napi');
  }
  catch (error) {
    logger.error('Failed to load uiohook-napi:', error.message);
    uio = null;
  }
  return uio;
}

/**
 * Whether text expansion can run on this build/platform (macOS, non-MAS).
 */
function isSupported() {
  return process.platform === 'darwin' && !process.mas;
}

/**
 * Query (and optionally prompt for) macOS Accessibility permission.
 * @param {boolean} prompt - show the system prompt if not yet trusted
 */
function checkAccessibilityPermission(prompt = false) {
  if (process.platform !== 'darwin') {
    return true;
  }
  try {
    return systemPreferences.isTrustedAccessibilityClient(prompt);
  }
  catch (error) {
    logger.error('Accessibility permission check failed:', error.message);
    return false;
  }
}

/**
 * Reload the snippet cache from config. Called on config change and after
 * the settings UI saves snippets (which may go through a different config
 * instance, so an explicit refresh is required).
 */
function refreshSnippets() {
  try {
    snippets = (configRef && configRef.get('snippets')) || [];
  }
  catch (error) {
    logger.error('Failed to load snippets from config');
    snippets = [];
  }
}

function isEnabled() {
  try {
    const te = configRef && configRef.get('textExpander');
    return !!(te && te.enabled);
  }
  catch (error) {
    return false;
  }
}

/**
 * Perform the replacement: delete the typed trigger, paste the content via
 * the clipboard, then restore the previous clipboard.
 * @param {{snippet: object, triggerLength: number}} match
 */
function performReplacement(match) {
  const mod = loadUio();
  if (!mod) {
    return;
  }
  const { uIOhook, UiohookKey } = mod;

  injecting = true;
  try {
    // Remove the characters the user typed for the trigger.
    for (let i = 0; i < match.triggerLength; i++) {
      uIOhook.keyTap(UiohookKey.Backspace);
    }

    // Paste content via clipboard (robust for unicode/Hangul/emoji).
    const previousClipboard = clipboard.readText();
    clipboard.writeText(match.snippet.content);
    uIOhook.keyTap(UiohookKey.V, [UiohookKey.Meta]);

    matcher.resetBuffer(bufferState);
    logger.debug(`Expanded snippet id=${match.snippet.id}`);

    // Restore the previous clipboard and re-enable event handling after the
    // synthetic paste has been delivered.
    setTimeout(() => {
      try {
        clipboard.writeText(previousClipboard);
      }
      catch (error) {
        logger.error('Failed to restore clipboard');
      }
      injecting = false;
    }, CLIPBOARD_RESTORE_DELAY_MS);
  }
  catch (error) {
    injecting = false;
    logger.error('Error during snippet replacement');
  }
}

/**
 * Global keydown handler. Feeds characters into the buffer and triggers a
 * replacement on a match. Ignores synthetic keys emitted during injection.
 */
function onKeydown(event) {
  if (injecting) {
    return;
  }

  const modifiers = {
    shift: event.shiftKey,
    ctrl: event.ctrlKey,
    alt: event.altKey,
    meta: event.metaKey,
  };

  if (event.keycode === matcher.BACKSPACE_KEYCODE) {
    matcher.popChar(bufferState);
    return;
  }

  if (matcher.shouldResetOnKey(event.keycode, modifiers)) {
    matcher.resetBuffer(bufferState);
    return;
  }

  const char = matcher.keycodeToChar(event.keycode, modifiers.shift);
  if (char === null) {
    // Unmapped key: reset so a keyword can't span an untracked character.
    matcher.resetBuffer(bufferState);
    return;
  }

  matcher.pushChar(bufferState, char);

  const match = matcher.findMatch(bufferState.buffer, snippets);
  if (match) {
    performReplacement(match);
  }
}

function onMousedown() {
  // A click moves the caret; the token is no longer contiguous.
  matcher.resetBuffer(bufferState);
}

/**
 * Start the global hook. No-op if already running. Returns a result object
 * rather than throwing so callers (UI toggle, startup) can react.
 */
function startExpander() {
  if (running) {
    return { success: true, alreadyRunning: true };
  }
  if (!isSupported()) {
    return { success: false, error: 'unsupported' };
  }
  if (!checkAccessibilityPermission(false)) {
    return { success: false, error: 'no-permission' };
  }

  const mod = loadUio();
  if (!mod) {
    return { success: false, error: 'module-load-failed' };
  }

  refreshSnippets();
  matcher.resetBuffer(bufferState);

  if (!listenersBound) {
    mod.uIOhook.on('keydown', onKeydown);
    mod.uIOhook.on('mousedown', onMousedown);
    listenersBound = true;
  }

  try {
    mod.uIOhook.start();
    running = true;
    logger.info('Text expander started');
    return { success: true };
  }
  catch (error) {
    // uIOhook.start() throws without Accessibility/Input Monitoring permission.
    logger.error('Failed to start global hook:', error.message);
    return { success: false, error: 'start-failed', detail: error.message };
  }
}

/**
 * Stop the global hook. Safe to call when not running. Must be called on
 * app quit or the uiohook thread can keep the process alive.
 */
function stopExpander() {
  if (!running) {
    return;
  }
  const mod = loadUio();
  try {
    if (mod) {
      mod.uIOhook.stop();
    }
  }
  catch (error) {
    logger.error('Failed to stop global hook:', error.message);
  }
  running = false;
  matcher.resetBuffer(bufferState);
  logger.info('Text expander stopped');
}

/**
 * Start or stop the hook to match the current enabled/permission state.
 */
function syncRunningState() {
  if (isEnabled() && isSupported() && checkAccessibilityPermission(false)) {
    startExpander();
  }
  else {
    stopExpander();
  }
}

/**
 * Enable or disable the feature, persist it, and start/stop accordingly.
 * @param {boolean} enabled
 * @returns {object} current status
 */
function setEnabled(enabled) {
  if (configRef) {
    configRef.set('textExpander', { enabled: !!enabled });
  }
  syncRunningState();
  return getStatus();
}

/**
 * Current feature status for the settings UI.
 */
function getStatus() {
  return {
    supported: isSupported(),
    enabled: isEnabled(),
    running,
    permissions: {
      accessibility: checkAccessibilityPermission(false),
    },
  };
}

/**
 * Initialize on app startup. Subscribes to config changes (same-instance
 * path, e.g. cloud-sync downloads) and starts the hook if already enabled.
 * @param {Object} config - shared config store
 */
function initTextExpander(config) {
  configRef = config;
  refreshSnippets();

  try {
    config.onDidChange('snippets', () => {
      refreshSnippets();
    });
    config.onDidChange('textExpander', () => {
      syncRunningState();
    });
  }
  catch (error) {
    logger.error('Failed to subscribe to config changes:', error.message);
  }

  syncRunningState();

  return {
    startExpander,
    stopExpander,
    getStatus,
    checkAccessibilityPermission,
    setEnabled,
    refreshSnippets,
  };
}

module.exports = {
  initTextExpander,
  startExpander,
  stopExpander,
  getStatus,
  checkAccessibilityPermission,
  setEnabled,
  refreshSnippets,
  isSupported,
};
