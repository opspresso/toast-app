/**
 * Toast - Snippets IPC Handlers Tests
 */

const mockIpcMain = {
  handle: jest.fn(),
};

const mockShell = {
  openExternal: jest.fn(),
};

jest.mock('electron', () => ({
  ipcMain: mockIpcMain,
  shell: mockShell,
}));

jest.mock('../../../src/main/text-expander', () => ({
  getStatus: jest.fn(),
  checkAccessibilityPermission: jest.fn(),
  setEnabled: jest.fn(),
  refreshSnippets: jest.fn(),
}));

jest.mock('../../../src/main/logger', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  })),
}));

const { setupSnippetsHandlers } = require('../../../src/main/ipc/snippets');

function getHandler(channel) {
  const call = mockIpcMain.handle.mock.calls.find(([name]) => name === channel);
  return call && call[1];
}

describe('Snippets IPC Handlers', () => {
  describe('text-expander:open-privacy-settings', () => {
    let mockSettingsWindow;
    let windows;
    let config;

    beforeEach(() => {
      jest.clearAllMocks();
      mockShell.openExternal.mockResolvedValue(undefined);

      mockSettingsWindow = {
        isDestroyed: jest.fn(() => false),
        setAlwaysOnTop: jest.fn(),
        once: jest.fn(),
      };
      windows = { settings: mockSettingsWindow };
      config = { get: jest.fn(), set: jest.fn() };

      setupSnippetsHandlers(windows, config);
    });

    test('releases alwaysOnTop so System Settings is not hidden behind the settings window', async () => {
      const handler = getHandler('text-expander:open-privacy-settings');

      const result = await handler({}, 'accessibility');

      expect(result).toBe(true);
      expect(mockSettingsWindow.setAlwaysOnTop).toHaveBeenCalledWith(false);
      expect(mockShell.openExternal).toHaveBeenCalledWith(
        'x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility',
      );
    });

    test('restores alwaysOnTop when the settings window regains focus', async () => {
      const handler = getHandler('text-expander:open-privacy-settings');

      await handler({}, 'accessibility');

      expect(mockSettingsWindow.once).toHaveBeenCalledWith('focus', expect.any(Function));
      const focusCallback = mockSettingsWindow.once.mock.calls[0][1];
      focusCallback();

      expect(mockSettingsWindow.setAlwaysOnTop).toHaveBeenLastCalledWith(true, 'screen-saver');
    });

    test('does not restore alwaysOnTop if the settings window was destroyed before focus', async () => {
      const handler = getHandler('text-expander:open-privacy-settings');

      await handler({}, 'accessibility');
      mockSettingsWindow.setAlwaysOnTop.mockClear();

      mockSettingsWindow.isDestroyed.mockReturnValue(true);
      const focusCallback = mockSettingsWindow.once.mock.calls[0][1];
      focusCallback();

      expect(mockSettingsWindow.setAlwaysOnTop).not.toHaveBeenCalled();
    });

    test('opens System Settings even when the settings window is missing', async () => {
      windows.settings = null;
      const handler = getHandler('text-expander:open-privacy-settings');

      const result = await handler({}, 'inputMonitoring');

      expect(result).toBe(true);
      expect(mockShell.openExternal).toHaveBeenCalledWith(
        'x-apple.systempreferences:com.apple.preference.security?Privacy_ListenEvent',
      );
    });

    test('returns false when opening System Settings fails', async () => {
      mockShell.openExternal.mockRejectedValue(new Error('boom'));
      const handler = getHandler('text-expander:open-privacy-settings');

      const result = await handler({}, 'accessibility');

      expect(result).toBe(false);
    });
  });
});

describe('atomic snippet edits', () => {
  let data;
  let config;
  let handler;
  beforeEach(() => {
    jest.clearAllMocks();
    data = [{ keyword: ':one', content: 'first' }, { keyword: ':two', content: 'second' }];
    config = { get: () => data, set: jest.fn((_key, next) => { data = next; }) };
    setupSnippetsHandlers({}, config);
    handler = getHandler('text-expander:change-snippet');
  });

  test('deletes only the selected legacy snippet when IDs are absent', () => {
    expect(handler({}, { type: 'delete', original: data[0] }).success).toBe(true);
    expect(data).toEqual([{ keyword: ':two', content: 'second' }]);
  });

  test('rejects a stale edit and preserves the newer cloud value', () => {
    const original = { ...data[0] };
    data[0] = { ...data[0], content: 'cloud changed' };
    const result = handler({}, { type: 'update', original, snippet: { ...original, content: 'local draft' } });
    expect(result).toMatchObject({ success: false, conflict: true });
    expect(data[0].content).toBe('cloud changed');
    expect(config.set).not.toHaveBeenCalled();
  });

  test('retains unrelated cloud additions when editing one snippet', () => {
    const original = { ...data[0] };
    data.push({ keyword: ':three', content: 'new cloud entry' });
    expect(handler({}, { type: 'update', original, snippet: { ...original, keyword: ':renamed' } }).success).toBe(true);
    expect(data).toHaveLength(3);
    expect(data[0]).toMatchObject({ keyword: ':renamed', id: expect.any(String) });
    expect(data[2].content).toBe('new cloud entry');
  });

  test('rejects invalid input at the main process boundary', () => {
    const result = handler({}, { type: 'add', snippet: { keyword: 'x', content: 'too short' } });
    expect(result.success).toBe(false);
    expect(config.set).not.toHaveBeenCalled();
  });

  test('rejects duplicate keywords even when all snippets lack IDs', () => {
    const result = handler({}, { type: 'add', snippet: { keyword: ':one', content: 'duplicate' } });
    expect(result.success).toBe(false);
    expect(config.set).not.toHaveBeenCalled();
  });

  test('reports a failed store write without changing the current list', () => {
    config.set.mockImplementationOnce(() => { throw new Error('Disk full'); });
    expect(handler({}, { type: 'delete', original: data[0] }).success).toBe(false);
    expect(data).toHaveLength(2);
  });
});
