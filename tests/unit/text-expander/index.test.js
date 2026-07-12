/**
 * Toast - Text Expander (I/O layer) Tests
 *
 * Covers the clipboard snapshot/restore behavior and the error-path buffer
 * reset in performReplacement(), which the pure matcher tests cannot reach.
 */

jest.mock('../../../src/main/logger', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  })),
}));

const mockUiohook = {
  on: jest.fn(),
  start: jest.fn(),
  stop: jest.fn(),
  keyTap: jest.fn(),
};

const mockUiohookKey = { Backspace: 14, V: 47, Meta: 3675 };

jest.mock(
  'uiohook-napi',
  () => ({
    uIOhook: mockUiohook,
    UiohookKey: mockUiohookKey,
  }),
  { virtual: true },
);

// Captured fresh in beforeEach: jest.resetModules() clears the require cache,
// so a reference grabbed at file-load time would point at a stale electron
// mock instance instead of the one text-expander/index.js actually requires.
let clipboard;
let systemPreferences;

// h and i keycodes from the US QWERTY table in matcher.js
const H_KEYCODE = 35;
const I_KEYCODE = 23;

function keyEvent(keycode) {
  return { keycode, shiftKey: false, ctrlKey: false, altKey: false, metaKey: false };
}

function getRegisteredHandler(eventName) {
  const call = mockUiohook.on.mock.calls.find(args => args[0] === eventName);
  return call && call[1];
}

describe('Text Expander (I/O layer)', () => {
  let textExpander;
  let configStore;
  let originalPlatform;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    jest.useFakeTimers();

    // This module is macOS-only (isSupported() gates on process.platform ===
    // 'darwin'), so CI running on a non-macOS runner must not see the real
    // platform here or startExpander() silently no-ops and never registers
    // the 'keydown' listener the tests below rely on.
    originalPlatform = process.platform;
    Object.defineProperty(process, 'platform', {
      value: 'darwin',
      configurable: true,
    });

    ({ clipboard, systemPreferences } = require('electron'));
    systemPreferences.isTrustedAccessibilityClient.mockReturnValue(true);
    clipboard.availableFormats.mockReturnValue(['text/plain']);
    clipboard.readText.mockReturnValue('previous text');

    const listeners = {};
    configStore = {
      get: jest.fn(key => {
        if (key === 'textExpander') {
          return { enabled: true };
        }
        if (key === 'snippets') {
          return [{ id: 's1', keyword: 'hi', content: 'hello there', enabled: true }];
        }
        return undefined;
      }),
      set: jest.fn(),
      onDidChange: jest.fn((key, cb) => {
        listeners[key] = cb;
      }),
    };

    textExpander = require('../../../src/main/text-expander/index');
    textExpander.initTextExpander(configStore);
  });

  afterEach(() => {
    jest.useRealTimers();
    Object.defineProperty(process, 'platform', {
      value: originalPlatform,
      configurable: true,
    });
  });

  function typeKeyword() {
    const onKeydown = getRegisteredHandler('keydown');
    onKeydown(keyEvent(H_KEYCODE));
    onKeydown(keyEvent(I_KEYCODE));
  }

  test('starts the hook and registers a keydown listener when enabled', () => {
    expect(mockUiohook.start).toHaveBeenCalled();
    expect(getRegisteredHandler('keydown')).toBeInstanceOf(Function);
  });

  test('preserves a non-text clipboard (e.g. a copied image) across a snippet expansion', () => {
    clipboard.availableFormats.mockReturnValue(['image/png']);
    clipboard.readImage.mockReturnValue({ isEmpty: () => false });
    // Writing the snippet content actually replaces clipboard contents with that text —
    // mirror that so the restore-time "does the clipboard still hold what we wrote" check
    // (which reads availableFormats/readText) sees it instead of the stale image mock.
    clipboard.writeText.mockImplementation(text => {
      clipboard.availableFormats.mockReturnValue(['text/plain']);
      clipboard.readText.mockReturnValue(text);
    });

    typeKeyword();

    // Snippet content is pasted via the clipboard immediately...
    expect(clipboard.writeText).toHaveBeenCalledWith('hello there');

    jest.advanceTimersByTime(300);

    // ...then the original image is restored instead of being clobbered by writeText('').
    expect(clipboard.write).toHaveBeenCalledWith(expect.objectContaining({ image: expect.anything() }));
    expect(clipboard.writeText).not.toHaveBeenCalledWith('');
  });

  test('clears the clipboard on restore when it was empty beforehand', () => {
    clipboard.availableFormats.mockReturnValue([]);
    // See the previous test: writing the snippet content actually replaces clipboard
    // contents, so the restore-time check must see it instead of the stale empty mock.
    clipboard.writeText.mockImplementation(text => {
      clipboard.availableFormats.mockReturnValue(['text/plain']);
      clipboard.readText.mockReturnValue(text);
    });

    typeKeyword();
    jest.advanceTimersByTime(300);

    expect(clipboard.clear).toHaveBeenCalled();
  });

  test('does not restore the previous clipboard if the user copied something else during the paste', () => {
    typeKeyword();
    expect(clipboard.writeText).toHaveBeenCalledWith('hello there');

    // Before the restore delay elapses, the user copies something new.
    clipboard.readText.mockReturnValue('user copied this');

    jest.advanceTimersByTime(300);

    // Restoring now would clobber what the user just copied.
    expect(clipboard.write).not.toHaveBeenCalled();
    expect(clipboard.clear).not.toHaveBeenCalled();
  });

  test('does not crash and still resets injecting when the post-paste clipboard check throws', () => {
    // clipboard.availableFormats()/readText() here were unguarded by a catch (unlike
    // snapshotClipboard/restoreClipboard, which both have their own). An exception from
    // either would propagate out of the setTimeout callback as an uncaught exception.
    clipboard.availableFormats.mockImplementation(() => {
      throw new Error('clipboard unavailable');
    });

    typeKeyword();

    expect(() => jest.advanceTimersByTime(300)).not.toThrow();
    expect(clipboard.write).not.toHaveBeenCalled();

    // injecting must still be reset so subsequent keystrokes aren't ignored forever.
    clipboard.availableFormats.mockReturnValue(['text/plain']);
    const onKeydown = getRegisteredHandler('keydown');
    onKeydown(keyEvent(H_KEYCODE));
    onKeydown(keyEvent(I_KEYCODE));
    expect(clipboard.writeText).toHaveBeenCalledTimes(2); // once per typeKeyword() trigger
  });

  test('does not restore a snapshotted secret onto the clipboard after an external auto-clear', () => {
    // Simulate having copied a password just before the snippet trigger: the pre-paste
    // snapshot captured it.
    clipboard.readText.mockReturnValue('super-secret-password');

    typeKeyword();
    expect(clipboard.writeText).toHaveBeenCalledWith('hello there');

    // Before the restore delay elapses, an external tool (e.g. a password manager's
    // auto-clear) wipes the clipboard.
    clipboard.availableFormats.mockReturnValue([]);

    jest.advanceTimersByTime(300);

    // Restoring now would re-expose the password the auto-clear had just wiped.
    expect(clipboard.write).not.toHaveBeenCalled();
    expect(clipboard.clear).not.toHaveBeenCalled();
  });

  test('resets the match buffer when replacement throws, preventing a re-trigger loop', () => {
    // Repeated-character keyword ("hh"): if the buffer is left holding "hh"
    // after a failed replacement, one more "h" keystroke makes it "hhh",
    // which still ends with "hh" and would immediately re-trigger. A clean
    // reset leaves the buffer as just "h", which does not match.
    configStore.get.mockImplementation(key => {
      if (key === 'textExpander') {
        return { enabled: true };
      }
      if (key === 'snippets') {
        return [{ id: 's2', keyword: 'hh', content: 'hello there', enabled: true }];
      }
      return undefined;
    });
    textExpander.refreshSnippets();

    mockUiohook.keyTap.mockImplementationOnce(() => {
      throw new Error('synthetic key injection failed');
    });

    const onKeydown = getRegisteredHandler('keydown');
    onKeydown(keyEvent(H_KEYCODE));
    onKeydown(keyEvent(H_KEYCODE)); // completes "hh" -> match -> throws -> caught

    mockUiohook.keyTap.mockClear();
    onKeydown(keyEvent(H_KEYCODE));

    expect(mockUiohook.keyTap).not.toHaveBeenCalled();
  });

  test('setEnabled preserves other device-local textExpander fields (e.g. seeded)', () => {
    configStore.get.mockImplementation(key => {
      if (key === 'textExpander') {
        return { enabled: true, seeded: true };
      }
      if (key === 'snippets') {
        return [];
      }
      return undefined;
    });

    textExpander.setEnabled(false);

    expect(configStore.set).toHaveBeenCalledWith('textExpander', { enabled: false, seeded: true });
  });
});
