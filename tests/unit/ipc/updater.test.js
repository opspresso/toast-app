/**
 * Toast - Updater IPC Handlers Tests
 */

const mockIpcMain = {
  handle: jest.fn(),
};

jest.mock('electron', () => ({
  ipcMain: mockIpcMain,
}));

const mockUpdater = {
  checkForUpdates: jest.fn(),
  downloadUpdate: jest.fn(),
  installUpdate: jest.fn(),
};

jest.mock('../../../src/main/updater', () => mockUpdater);

jest.mock('../../../src/main/logger', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  })),
}));

const { setupUpdaterHandlers } = require('../../../src/main/ipc/updater');

function getHandler(channel) {
  const call = mockIpcMain.handle.mock.calls.find(([name]) => name === channel);
  return call && call[1];
}

describe('Updater IPC Handlers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupUpdaterHandlers();
  });

  describe('check-latest-version', () => {
    test('checks for updates non-silently', async () => {
      mockUpdater.checkForUpdates.mockResolvedValue({ success: true, hasUpdate: true });

      const result = await getHandler('check-latest-version')();

      expect(mockUpdater.checkForUpdates).toHaveBeenCalledWith(false);
      expect(result).toEqual({ success: true, hasUpdate: true });
    });
  });

  describe('check-for-updates', () => {
    test('defaults to non-silent when no argument is provided', async () => {
      mockUpdater.checkForUpdates.mockResolvedValue({ success: true, hasUpdate: false });

      await getHandler('check-for-updates')({});

      expect(mockUpdater.checkForUpdates).toHaveBeenCalledWith(false);
    });

    test('passes through the silent flag', async () => {
      mockUpdater.checkForUpdates.mockResolvedValue({ success: true, hasUpdate: false });

      await getHandler('check-for-updates')({}, true);

      expect(mockUpdater.checkForUpdates).toHaveBeenCalledWith(true);
    });
  });

  describe('download-update', () => {
    test('delegates directly to updater.downloadUpdate', async () => {
      mockUpdater.downloadUpdate.mockResolvedValue({ success: true });

      const result = await getHandler('download-update')();

      expect(mockUpdater.downloadUpdate).toHaveBeenCalled();
      expect(result).toEqual({ success: true });
    });
  });

  describe('download-auto-update', () => {
    test('downloads silently when an update is available', async () => {
      mockUpdater.checkForUpdates.mockResolvedValue({ success: true, hasUpdate: true });
      mockUpdater.downloadUpdate.mockResolvedValue({ success: true });

      const result = await getHandler('download-auto-update')();

      expect(mockUpdater.checkForUpdates).toHaveBeenCalledWith(true);
      expect(mockUpdater.downloadUpdate).toHaveBeenCalled();
      expect(result).toEqual({ success: true });
    });

    test('does not download when already on the latest version', async () => {
      mockUpdater.checkForUpdates.mockResolvedValue({ success: true, hasUpdate: false });

      const result = await getHandler('download-auto-update')();

      expect(mockUpdater.downloadUpdate).not.toHaveBeenCalled();
      expect(result).toEqual({ success: false, error: 'You are already on the latest version.' });
    });

    test('returns a failure result when the update check fails', async () => {
      mockUpdater.checkForUpdates.mockResolvedValue({ success: false, error: 'network down' });

      const result = await getHandler('download-auto-update')();

      expect(mockUpdater.downloadUpdate).not.toHaveBeenCalled();
      expect(result).toEqual({ success: false, error: 'network down' });
    });

    test('returns a generic failure message when the check result is falsy', async () => {
      mockUpdater.checkForUpdates.mockResolvedValue(null);

      const result = await getHandler('download-auto-update')();

      expect(result).toEqual({ success: false, error: 'Failed to check for updates. Please try again later.' });
    });

    test('catches a thrown error from checkForUpdates', async () => {
      mockUpdater.checkForUpdates.mockRejectedValue(new Error('boom'));

      const result = await getHandler('download-auto-update')();

      expect(result).toEqual({ success: false, error: 'An error occurred during the auto-update download: boom' });
    });
  });

  describe('download-manual-update', () => {
    test('downloads non-silently when an update is available', async () => {
      mockUpdater.checkForUpdates.mockResolvedValue({ success: true, hasUpdate: true });
      mockUpdater.downloadUpdate.mockResolvedValue({ success: true });

      const result = await getHandler('download-manual-update')();

      expect(mockUpdater.checkForUpdates).toHaveBeenCalledWith(false);
      expect(mockUpdater.downloadUpdate).toHaveBeenCalled();
      expect(result).toEqual({ success: true });
    });

    test('does not download when already on the latest version', async () => {
      mockUpdater.checkForUpdates.mockResolvedValue({ success: true, hasUpdate: false });

      const result = await getHandler('download-manual-update')();

      expect(mockUpdater.downloadUpdate).not.toHaveBeenCalled();
      expect(result).toEqual({ success: false, error: 'You are already on the latest version.' });
    });

    test('returns a failure result when the update check fails', async () => {
      mockUpdater.checkForUpdates.mockResolvedValue({ success: false, error: 'server error' });

      const result = await getHandler('download-manual-update')();

      expect(result).toEqual({ success: false, error: 'server error' });
    });

    test('catches a thrown error from downloadUpdate', async () => {
      mockUpdater.checkForUpdates.mockResolvedValue({ success: true, hasUpdate: true });
      mockUpdater.downloadUpdate.mockRejectedValue(new Error('disk full'));

      const result = await getHandler('download-manual-update')();

      expect(result).toEqual({ success: false, error: 'An error occurred during the manual update download: disk full' });
    });
  });

  describe('install-update', () => {
    test('delegates directly to updater.installUpdate', async () => {
      mockUpdater.installUpdate.mockResolvedValue({ success: true });

      const result = await getHandler('install-update')();

      expect(mockUpdater.installUpdate).toHaveBeenCalled();
      expect(result).toEqual({ success: true });
    });
  });

  describe('install-auto-update', () => {
    test('delegates directly to updater.installUpdate', async () => {
      mockUpdater.installUpdate.mockResolvedValue({ success: true });

      const result = await getHandler('install-auto-update')();

      expect(mockUpdater.installUpdate).toHaveBeenCalled();
      expect(result).toEqual({ success: true });
    });
  });
});
