/**
 * Toast - Text Expander Matcher Tests
 *
 * Pure-logic tests: no electron mock or native module required.
 */

const {
  keycodeToChar,
  shouldResetOnKey,
  isModifierKey,
  createBufferState,
  pushChar,
  popChar,
  resetBuffer,
  findMatch,
  validateSnippet,
  BACKSPACE_KEYCODE,
} = require('../../../src/main/text-expander/matcher');

// Mirrors the onKeydown pipeline in text-expander/index.js so key sequences
// (with real uiohook keycodes) can be exercised without the native module.
function feedKeys(state, events, snippets) {
  let lastMatch = null;
  for (const event of events) {
    if (event.keycode === BACKSPACE_KEYCODE) {
      popChar(state);
      continue;
    }
    const modifiers = { shift: event.shift, ctrl: event.ctrl, alt: event.alt, meta: event.meta };
    if (shouldResetOnKey(event.keycode, modifiers)) {
      resetBuffer(state);
      continue;
    }
    if (isModifierKey(event.keycode)) {
      continue;
    }
    const char = keycodeToChar(event.keycode, modifiers.shift);
    if (char === null) {
      resetBuffer(state);
      continue;
    }
    pushChar(state, char);
    lastMatch = findMatch(state.buffer, snippets);
  }
  return lastMatch;
}

// Real uiohook keycodes captured from a running app.
const K = { Shift: 42, One: 2, e: 18, k: 37, d: 32, three: 4, f: 33, o: 24, b: 48, a: 30, r: 19 };

describe('Text Expander Matcher', () => {
  describe('keycodeToChar', () => {
    test('maps letters with shift state', () => {
      expect(keycodeToChar(30, false)).toBe('a');
      expect(keycodeToChar(30, true)).toBe('A');
    });

    test('maps semicolon to colon when shifted (":" for :keyword)', () => {
      expect(keycodeToChar(39, false)).toBe(';');
      expect(keycodeToChar(39, true)).toBe(':');
    });

    test('maps number row with and without shift', () => {
      expect(keycodeToChar(2, false)).toBe('1');
      expect(keycodeToChar(2, true)).toBe('!');
    });

    test('returns null for keys without a character (e.g. arrow)', () => {
      expect(keycodeToChar(57416, false)).toBeNull();
      expect(keycodeToChar(99999, false)).toBeNull();
    });
  });

  describe('shouldResetOnKey', () => {
    test('resets on whitespace/navigation keys', () => {
      expect(shouldResetOnKey(57)).toBe(true); // Space
      expect(shouldResetOnKey(28)).toBe(true); // Enter
      expect(shouldResetOnKey(1)).toBe(true); // Escape
      expect(shouldResetOnKey(57419)).toBe(true); // ArrowLeft
    });

    test('resets when a command modifier is held', () => {
      expect(shouldResetOnKey(30, { meta: true })).toBe(true);
      expect(shouldResetOnKey(30, { ctrl: true })).toBe(true);
      expect(shouldResetOnKey(30, { alt: true })).toBe(true);
    });

    test('does not reset on a plain character key', () => {
      expect(shouldResetOnKey(30)).toBe(false); // 'a'
      expect(shouldResetOnKey(30, { shift: true })).toBe(false); // 'A' still typed
    });
  });

  describe('isModifierKey', () => {
    test('identifies Shift/CapsLock/Ctrl/Meta/Alt', () => {
      expect(isModifierKey(42)).toBe(true); // Shift
      expect(isModifierKey(58)).toBe(true); // CapsLock
      expect(isModifierKey(3675)).toBe(true); // Meta
      expect(isModifierKey(18)).toBe(false); // 'e'
    });
  });

  describe('key sequence (onKeydown pipeline)', () => {
    const snippets = [{ id: '1', keyword: '!ekd3', content: 'x', enabled: true }];

    test('matches "!ekd3" typed with Shift for the leading "!"', () => {
      const state = createBufferState();
      const match = feedKeys(
        state,
        [
          { keycode: K.Shift, shift: true }, // Shift down (produces no char)
          { keycode: K.One, shift: true }, // "!"
          { keycode: K.e }, // e
          { keycode: K.k }, // k
          { keycode: K.d }, // d
          { keycode: K.three }, // 3
        ],
        snippets,
      );
      expect(match).not.toBeNull();
      expect(match.snippet.id).toBe('1');
    });

    test('matches a keyword with a shifted character in the middle (Shift must not reset)', () => {
      const state = createBufferState();
      const midSnippets = [{ id: 'm', keyword: 'foo!bar', content: 'y', enabled: true }];
      const match = feedKeys(
        state,
        [
          { keycode: K.f },
          { keycode: K.o },
          { keycode: K.o },
          { keycode: K.Shift, shift: true }, // Shift down — must be ignored, not reset
          { keycode: K.One, shift: true }, // "!"
          { keycode: K.b },
          { keycode: K.a },
          { keycode: K.r },
        ],
        midSnippets,
      );
      expect(match).not.toBeNull();
      expect(match.snippet.id).toBe('m');
    });
  });

  describe('buffer operations', () => {
    test('pushChar appends characters', () => {
      const state = createBufferState();
      pushChar(state, ':');
      pushChar(state, 'a');
      expect(state.buffer).toBe(':a');
    });

    test('pushChar keeps only the last maxLen characters', () => {
      const state = createBufferState(3);
      ['a', 'b', 'c', 'd'].forEach(c => pushChar(state, c));
      expect(state.buffer).toBe('bcd');
    });

    test('pushChar ignores null/empty', () => {
      const state = createBufferState();
      pushChar(state, 'a');
      pushChar(state, null);
      pushChar(state, '');
      expect(state.buffer).toBe('a');
    });

    test('popChar removes the last character', () => {
      const state = createBufferState();
      pushChar(state, 'a');
      pushChar(state, 'b');
      popChar(state);
      expect(state.buffer).toBe('a');
    });

    test('popChar on empty buffer is safe', () => {
      const state = createBufferState();
      popChar(state);
      expect(state.buffer).toBe('');
    });

    test('resetBuffer clears the buffer', () => {
      const state = createBufferState();
      pushChar(state, 'x');
      resetBuffer(state);
      expect(state.buffer).toBe('');
    });
  });

  describe('findMatch', () => {
    const snippets = [
      { id: '1', keyword: ':email', content: 'email@toast.sh', enabled: true },
      { id: '2', keyword: ':addr', content: 'Seoul', enabled: true },
      { id: '3', keyword: ':off', content: 'nope', enabled: false },
    ];

    test('matches when buffer ends with a keyword', () => {
      const match = findMatch('hello :email', snippets);
      expect(match).not.toBeNull();
      expect(match.snippet.id).toBe('1');
      expect(match.triggerLength).toBe(':email'.length);
    });

    test('returns null when no keyword matches', () => {
      expect(findMatch('hello world', snippets)).toBeNull();
    });

    test('skips disabled snippets', () => {
      expect(findMatch('text :off', snippets)).toBeNull();
    });

    test('prefers the longest keyword on overlap', () => {
      const overlap = [
        { id: 'a', keyword: 'email', content: 'short', enabled: true },
        { id: 'b', keyword: ':email', content: 'long', enabled: true },
      ];
      const match = findMatch('type :email', overlap);
      expect(match.snippet.id).toBe('b');
    });

    test('matches immediately after a backspace correction', () => {
      const state = createBufferState();
      ':emailx'.split('').forEach(c => pushChar(state, c));
      popChar(state); // remove the stray 'x'
      const match = findMatch(state.buffer, snippets);
      expect(match.snippet.id).toBe('1');
    });

    test('handles empty buffer and non-array snippets', () => {
      expect(findMatch('', snippets)).toBeNull();
      expect(findMatch(':email', null)).toBeNull();
    });
  });

  describe('validateSnippet', () => {
    test('accepts a valid snippet', () => {
      const result = validateSnippet({ id: '1', keyword: ':email', content: 'a@b.com' }, []);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('rejects a too-short keyword', () => {
      const result = validateSnippet({ keyword: ':', content: 'x' }, []);
      expect(result.valid).toBe(false);
      expect(result.errors.join(' ')).toMatch(/at least/);
    });

    test('rejects a keyword longer than the match buffer (it could never match)', () => {
      const keyword = ':'.repeat(33); // DEFAULT_MAX_BUFFER is 32
      const result = validateSnippet({ keyword, content: 'x' }, []);
      expect(result.valid).toBe(false);
      expect(result.errors.join(' ')).toMatch(/at most/);
    });

    test('accepts a keyword exactly at the match buffer length', () => {
      const keyword = ':'.repeat(32);
      const result = validateSnippet({ keyword, content: 'x' }, []);
      expect(result.valid).toBe(true);
    });

    test('rejects a keyword with whitespace or non-ASCII', () => {
      expect(validateSnippet({ keyword: ':my email', content: 'x' }, []).valid).toBe(false);
      expect(validateSnippet({ keyword: ':이메일', content: 'x' }, []).valid).toBe(false);
    });

    test('rejects empty content', () => {
      const result = validateSnippet({ keyword: ':email', content: '' }, []);
      expect(result.valid).toBe(false);
      expect(result.errors.join(' ')).toMatch(/Content/);
    });

    test('rejects a duplicate keyword', () => {
      const existing = [{ id: '1', keyword: ':email' }];
      const result = validateSnippet({ id: '2', keyword: ':email', content: 'x' }, existing);
      expect(result.valid).toBe(false);
      expect(result.errors.join(' ')).toMatch(/already used/);
    });

    test('rejects a suffix-colliding keyword', () => {
      const existing = [{ id: '1', keyword: 'email' }];
      const result = validateSnippet({ id: '2', keyword: ':email', content: 'x' }, existing);
      expect(result.valid).toBe(false);
      expect(result.errors.join(' ')).toMatch(/conflicts/);
    });

    test('excludes self by id when re-validating an edit', () => {
      const existing = [{ id: '1', keyword: ':email' }];
      const result = validateSnippet({ id: '1', keyword: ':email', content: 'updated' }, existing);
      expect(result.valid).toBe(true);
    });
  });
});
