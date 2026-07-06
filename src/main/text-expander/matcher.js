/**
 * Toast - Text Expander Matcher (pure logic)
 *
 * Buffer management, snippet matching, and validation with no I/O and no
 * dependency on electron or the native uiohook module, so it is unit-testable
 * in isolation. The I/O layer (index.js) feeds it keycodes/characters and acts
 * on the returned matches.
 *
 * Privacy: this module never logs buffer contents or characters.
 */

// Default sliding-window buffer size. Long enough for any reasonable keyword,
// short enough to bound memory and matching cost.
const DEFAULT_MAX_BUFFER = 32;

// US QWERTY keycode → [unshifted, shifted] printable character.
// Keys absent from this table (arrows, F-keys, etc.) produce no character.
// Space is intentionally excluded here because it resets the buffer.
const KEYCODE_TO_CHAR = {
  // number row
  2: ['1', '!'],
  3: ['2', '@'],
  4: ['3', '#'],
  5: ['4', '$'],
  6: ['5', '%'],
  7: ['6', '^'],
  8: ['7', '&'],
  9: ['8', '*'],
  10: ['9', '('],
  11: ['0', ')'],
  // letters
  30: ['a', 'A'],
  48: ['b', 'B'],
  46: ['c', 'C'],
  32: ['d', 'D'],
  18: ['e', 'E'],
  33: ['f', 'F'],
  34: ['g', 'G'],
  35: ['h', 'H'],
  23: ['i', 'I'],
  36: ['j', 'J'],
  37: ['k', 'K'],
  38: ['l', 'L'],
  50: ['m', 'M'],
  49: ['n', 'N'],
  24: ['o', 'O'],
  25: ['p', 'P'],
  16: ['q', 'Q'],
  19: ['r', 'R'],
  31: ['s', 'S'],
  20: ['t', 'T'],
  22: ['u', 'U'],
  47: ['v', 'V'],
  17: ['w', 'W'],
  45: ['x', 'X'],
  21: ['y', 'Y'],
  44: ['z', 'Z'],
  // symbols
  12: ['-', '_'],
  13: ['=', '+'],
  39: [';', ':'],
  40: ["'", '"'],
  41: ['`', '~'],
  43: ['\\', '|'],
  51: [',', '<'],
  52: ['.', '>'],
  53: ['/', '?'],
};

// Keycodes that clear the buffer (word/line boundaries and navigation).
// Space (57) is included: typing past a keyword ends the token.
const RESET_KEYCODES = new Set([
  1, // Escape
  15, // Tab
  28, // Enter
  57, // Space
  57416, // ArrowUp
  57424, // ArrowDown
  57419, // ArrowLeft
  57421, // ArrowRight
  3655, // Home
  3663, // End
  3657, // PageUp
  3665, // PageDown
  3667, // Delete (forward delete)
]);

const BACKSPACE_KEYCODE = 14;

/**
 * Convert a keycode + shift state to a printable character.
 * @param {number} keycode - uiohook keycode
 * @param {boolean} shift - whether a shift modifier is held
 * @returns {string|null} the character, or null if the key produces none
 */
function keycodeToChar(keycode, shift) {
  const pair = KEYCODE_TO_CHAR[keycode];
  if (!pair) {
    return null;
  }
  return shift ? pair[1] : pair[0];
}

/**
 * Decide whether a key should reset the typing buffer.
 * A character-bearing key never resets; navigation/whitespace keys and any
 * key pressed with Ctrl/Meta/Alt (a command, not typed text) do.
 * @param {number} keycode - uiohook keycode
 * @param {{ctrl?: boolean, meta?: boolean, alt?: boolean}} modifiers
 * @returns {boolean}
 */
function shouldResetOnKey(keycode, modifiers = {}) {
  if (modifiers.ctrl || modifiers.meta || modifiers.alt) {
    return true;
  }
  return RESET_KEYCODES.has(keycode);
}

/**
 * Create a new buffer state.
 * @param {number} maxLen - maximum characters retained (sliding window)
 * @returns {{buffer: string, maxLen: number}}
 */
function createBufferState(maxLen = DEFAULT_MAX_BUFFER) {
  return { buffer: '', maxLen };
}

/**
 * Append a character to the buffer, keeping only the last maxLen characters.
 * @param {{buffer: string, maxLen: number}} state
 * @param {string} char
 * @returns {{buffer: string, maxLen: number}} the same state (mutated)
 */
function pushChar(state, char) {
  if (char === null || char === undefined || char === '') {
    return state;
  }
  const next = state.buffer + char;
  state.buffer = next.length > state.maxLen ? next.slice(-state.maxLen) : next;
  return state;
}

/**
 * Remove the last character from the buffer (Backspace).
 * @param {{buffer: string}} state
 * @returns {{buffer: string}} the same state (mutated)
 */
function popChar(state) {
  state.buffer = state.buffer.slice(0, -1);
  return state;
}

/**
 * Clear the buffer.
 * @param {{buffer: string}} state
 * @returns {{buffer: string}} the same state (mutated)
 */
function resetBuffer(state) {
  state.buffer = '';
  return state;
}

/**
 * Find the snippet whose keyword the buffer currently ends with.
 * Only enabled snippets are considered; on multiple matches the longest
 * keyword wins (so ":email" beats "email" when both exist).
 * @param {string} buffer - current typing buffer
 * @param {Array<{keyword: string, content: string, enabled?: boolean}>} snippets
 * @returns {{snippet: object, triggerLength: number}|null}
 */
function findMatch(buffer, snippets) {
  if (!buffer || !Array.isArray(snippets)) {
    return null;
  }

  let best = null;
  for (const snippet of snippets) {
    if (!snippet || snippet.enabled === false) {
      continue;
    }
    const keyword = snippet.keyword;
    if (!keyword || !buffer.endsWith(keyword)) {
      continue;
    }
    if (!best || keyword.length > best.triggerLength) {
      best = { snippet, triggerLength: keyword.length };
    }
  }
  return best;
}

// A keyword must be at least this many characters (a single char triggers far
// too easily during normal typing).
const MIN_KEYWORD_LENGTH = 2;

// Printable ASCII only (0x21 '!' .. 0x7e '~'); excludes space and control.
const ASCII_PRINTABLE = /^[\x21-\x7e]+$/;

/**
 * Validate a snippet against the existing set.
 * Rules: non-empty ASCII keyword (no whitespace), min length, non-empty
 * content, no duplicate keyword, and no suffix collision with another keyword
 * (which would make matching ambiguous).
 * @param {{keyword: string, content: string, id?: string}} snippet
 * @param {Array<{keyword: string, id?: string}>} existing - other snippets
 * @returns {{valid: boolean, errors: string[]}}
 */
function validateSnippet(snippet, existing = []) {
  const errors = [];
  const keyword = (snippet && snippet.keyword) || '';
  const content = (snippet && snippet.content) || '';

  if (keyword.length < MIN_KEYWORD_LENGTH) {
    errors.push(`Keyword must be at least ${MIN_KEYWORD_LENGTH} characters.`);
  }
  if (!ASCII_PRINTABLE.test(keyword)) {
    errors.push('Keyword may only contain printable ASCII characters with no spaces.');
  }
  if (content.length === 0) {
    errors.push('Content must not be empty.');
  }

  // Compare against other snippets (exclude self by id).
  const others = existing.filter(s => s && s.id !== snippet.id);
  for (const other of others) {
    const otherKeyword = other.keyword || '';
    if (!otherKeyword) {
      continue;
    }
    if (otherKeyword === keyword) {
      errors.push(`Keyword "${keyword}" is already used.`);
      continue;
    }
    // Ambiguity: if one keyword is a suffix of the other, a buffer ending in
    // the longer one would match both.
    if (keyword.endsWith(otherKeyword) || otherKeyword.endsWith(keyword)) {
      errors.push(`Keyword "${keyword}" conflicts with existing keyword "${otherKeyword}".`);
    }
  }

  return { valid: errors.length === 0, errors };
}

module.exports = {
  DEFAULT_MAX_BUFFER,
  BACKSPACE_KEYCODE,
  KEYCODE_TO_CHAR,
  RESET_KEYCODES,
  keycodeToChar,
  shouldResetOnKey,
  createBufferState,
  pushChar,
  popChar,
  resetBuffer,
  findMatch,
  validateSnippet,
};
