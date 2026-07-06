/**
 * Toast - Text Expander Matcher Tests
 *
 * Pure-logic tests: no electron mock or native module required.
 */

const {
  keycodeToChar,
  shouldResetOnKey,
  createBufferState,
  pushChar,
  popChar,
  resetBuffer,
  findMatch,
  validateSnippet,
} = require('../../../src/main/text-expander/matcher');

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
