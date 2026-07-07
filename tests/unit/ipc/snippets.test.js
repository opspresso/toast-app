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

jest.mock('../../../src/main/text-expander/matcher', () => ({
  validateSnippet: jest.fn(),
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
