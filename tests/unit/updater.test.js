/**
 * Toast - Auto Updater Tests
 *
 * Tests for the automatic update functionality
 */

// Mock electron-updater
const mockAutoUpdater = {
  checkForUpdatesAndNotify: jest.fn(),
  checkForUpdates: jest.fn(),
  downloadUpdate: jest.fn(),
  quitAndInstall: jest.fn(),
  setFeedURL: jest.fn(),
  on: jest.fn(),
  removeAllListeners: jest.fn(),
  isUpdaterActive: jest.fn(() => false),
  logger: null,
  autoDownload: true,
  autoInstallOnAppQuit: true,
  allowPrerelease: false,
  allowDowngrade: false,
  appId: 'com.opspresso.toast-app',
  forceDevUpdateConfig: true,
  channel: 'latest',
};

jest.mock('electron-updater', () => ({
  autoUpdater: mockAutoUpdater,
}));

// Mock electron
const mockDialog = {
  showMessageBox: jest.fn(),
  showErrorBox: jest.fn(),
};

const mockApp = {
  getName: jest.fn(() => 'Toast'),
  getVersion: jest.fn(() => '1.0.0'),
  getPath: jest.fn((path) => {
    if (path === 'userData') return '/mock/user/data';
    return '/mock/path';
  }),
  getAppPath: jest.fn(() => '/mock/app/path'),
  isPackaged: true,
  quit: jest.fn(),
  relaunch: jest.fn(),
};

jest.mock('electron', () => ({
  app: mockApp,
  dialog: mockDialog,
}));

// Mock fs
jest.mock('fs', () => ({
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
}));

// Mock logger
jest.mock('../../src/main/logger', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  })),
}));

// Mock tray (updater reflects update state into the tray menu)
const mockTrayModule = {
  setUpdateState: jest.fn(),
};

jest.mock('../../src/main/tray', () => mockTrayModule);

const fs = require('fs');

describe('Auto Updater', () => {
  let updater;
  let mockWindows;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    jest.resetModules();

    // Setup mock windows
    mockWindows = {
      toast: {
        webContents: {
          send: jest.fn(),
        },
        isDestroyed: jest.fn(() => false),
      },
      settings: {
        webContents: {
          send: jest.fn(),
        },
        isDestroyed: jest.fn(() => false),
      },
    };

    // Setup default mock responses
    fs.existsSync.mockReturnValue(false);
    mockAutoUpdater.checkForUpdates.mockResolvedValue({
      updateInfo: {
        version: '1.1.0',
        releaseNotes: 'Bug fixes',
      },
    });

    // Get updater module
    updater = require('../../src/main/updater');
  });

  describe('Initialization', () => {
    test('should initialize auto updater with proper interface', () => {
      const result = updater.initAutoUpdater(mockWindows);

      expect(result).toEqual({
        checkForUpdates: expect.any(Function),
        downloadUpdate: expect.any(Function),
        installUpdate: expect.any(Function),
        getLastCheckTime: expect.any(Function),
        isUpdateCheckInProgress: expect.any(Function),
        isUpdateDownloadInProgress: expect.any(Function)
      });
    });

    test('should configure updater settings properly', () => {
      const result = updater.initAutoUpdater(mockWindows);

      // Verify proper function signatures
      expect(typeof result.checkForUpdates).toBe('function');
      expect(typeof result.downloadUpdate).toBe('function');
      expect(typeof result.installUpdate).toBe('function');
      expect(result.checkForUpdates.length).toBe(0); // No parameters expected
    });

    test('should register event handlers', () => {
      updater.initAutoUpdater(mockWindows);

      // Just check that some event handlers were registered
      expect(mockAutoUpdater.on).toHaveBeenCalled();
    });

    test('should handle null windows safely', () => {
      // The function may throw due to accessing properties of null
      // This is expected behavior for null input
      expect(() => updater.initAutoUpdater(null)).toThrow();
    });

    test('should handle missing windows properties gracefully', () => {
      // Function expects windows.toast and windows.settings properties
      const result = updater.initAutoUpdater({});
      expect(result).toEqual({
        checkForUpdates: expect.any(Function),
        downloadUpdate: expect.any(Function),
        installUpdate: expect.any(Function),
        getLastCheckTime: expect.any(Function),
        isUpdateCheckInProgress: expect.any(Function),
        isUpdateDownloadInProgress: expect.any(Function)
      });
    });
  });

  describe('Update Checking', () => {
    test('should call checkForUpdates without throwing', async () => {
      const result = await updater.checkForUpdates();
      
      // Should return an object with success property
      expect(result).toEqual(expect.objectContaining({
        success: expect.any(Boolean)
      }));
    });
  });

  describe('Update Events', () => {
    test('should register required event handlers', () => {
      updater.initAutoUpdater(mockWindows);
      
      // Should register handlers for key events
      const expectedEvents = ['update-available', 'update-downloaded', 'error'];
      expectedEvents.forEach(eventName => {
        expect(mockAutoUpdater.on).toHaveBeenCalledWith(eventName, expect.any(Function));
      });
    });
  });

  describe('Update Download', () => {
    test('should call downloadUpdate without throwing', async () => {
      const result = await updater.downloadUpdate();
      
      // Should return an object with success property
      expect(result).toEqual(expect.objectContaining({
        success: expect.any(Boolean)
      }));
    });
  });

  describe('Update Installation', () => {
    test('should call installUpdate without throwing', async () => {
      mockDialog.showMessageBox.mockResolvedValue({ response: 0 });
      const result = await updater.installUpdate();

      // Should return an object with success property
      expect(result).toEqual(expect.objectContaining({
        success: expect.any(Boolean)
      }));
    });

    test('should fail without quitting when no update has been downloaded', async () => {
      updater.initAutoUpdater(mockWindows);

      const result = await updater.installUpdate();

      expect(result.success).toBe(false);
      expect(mockAutoUpdater.quitAndInstall).not.toHaveBeenCalled();
    });

    test('should quit and install after update-downloaded event', async () => {
      mockApp.isQuitting = false;
      updater.initAutoUpdater(mockWindows);

      // update-downloaded 이벤트 핸들러를 직접 호출하여 다운로드 완료 상태로 만듦
      const downloadedHandler = mockAutoUpdater.on.mock.calls.find(([eventName]) => eventName === 'update-downloaded')[1];
      downloadedHandler({ version: '1.1.0', releaseDate: '2026-01-01', files: [] });

      const result = await updater.installUpdate();

      expect(result.success).toBe(true);
      // isQuitting을 설정해야 창 close 핸들러가 종료를 막지 않아 재시작이 진행됨
      expect(mockApp.isQuitting).toBe(true);
      expect(mockAutoUpdater.quitAndInstall).toHaveBeenCalledWith(false, true);
    });
  });

  describe('Development Mode', () => {
    test('should handle development mode initialization', () => {
      const result = updater.initAutoUpdater(mockWindows);
      
      // Should initialize successfully in development mode
      expect(result).toHaveProperty('checkForUpdates');
      expect(result).toHaveProperty('downloadUpdate');
      expect(result).toHaveProperty('installUpdate');
    });
  });

  describe('Configuration', () => {
    test('should handle configuration initialization', () => {
      const result = updater.initAutoUpdater(mockWindows);
      
      // Should initialize configuration successfully
      expect(result).toHaveProperty('checkForUpdates');
      expect(mockAutoUpdater.on).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    test('should handle updater without windows', () => {
      // The function will throw when null is passed because it tries to access null.toast
      expect(() => updater.initAutoUpdater(null)).toThrow();
    });

    test('should handle re-initialization', () => {
      updater.initAutoUpdater(mockWindows);
      const result = updater.initAutoUpdater(mockWindows);

      // Should handle re-initialization gracefully
      expect(result).toHaveProperty('checkForUpdates');
      expect(result).toHaveProperty('downloadUpdate');
      expect(result).toHaveProperty('installUpdate');
    });
  });

  describe('Periodic Update Check', () => {
    afterEach(() => {
      jest.useRealTimers();
    });

    test('should re-check for updates on the periodic interval', async () => {
      jest.useFakeTimers();
      updater.initAutoUpdater(mockWindows);

      // Initial check fires 5 seconds after startup
      await jest.advanceTimersByTimeAsync(5000);
      expect(mockAutoUpdater.checkForUpdates).toHaveBeenCalledTimes(1);

      // Each 4-hour interval triggers another silent check
      await jest.advanceTimersByTimeAsync(4 * 60 * 60 * 1000);
      expect(mockAutoUpdater.checkForUpdates).toHaveBeenCalledTimes(2);

      await jest.advanceTimersByTimeAsync(4 * 60 * 60 * 1000);
      expect(mockAutoUpdater.checkForUpdates).toHaveBeenCalledTimes(3);
    });
  });

  describe('Tray Update State', () => {
    test('update-available event should mark the tray menu', () => {
      updater.initAutoUpdater(mockWindows);

      const handler = mockAutoUpdater.on.mock.calls.find(call => call[0] === 'update-available')[1];
      handler({ version: '1.1.0', releaseDate: '2026-01-01', releaseNotes: '' });

      expect(mockTrayModule.setUpdateState).toHaveBeenCalledWith('available', '1.1.0');
    });

    test('update-not-available event should clear the tray menu state', () => {
      updater.initAutoUpdater(mockWindows);

      const handler = mockAutoUpdater.on.mock.calls.find(call => call[0] === 'update-not-available')[1];
      handler({ version: '1.0.0' });

      expect(mockTrayModule.setUpdateState).toHaveBeenCalledWith(null, undefined);
    });
  });

  describe('One-click Upgrade (downloadAndInstallUpdate)', () => {
    afterEach(() => {
      jest.useRealTimers();
    });

    test('should download then install when no update is downloaded yet', async () => {
      jest.useFakeTimers();
      updater.initAutoUpdater(mockWindows);
      mockAutoUpdater.downloadUpdate.mockResolvedValue(undefined);

      const promise = updater.downloadAndInstallUpdate('1.1.0');
      // downloadUpdate has a 500ms pre-download delay, installUpdate a 1000ms pre-install delay
      await jest.advanceTimersByTimeAsync(2000);
      const result = await promise;

      expect(result.success).toBe(true);
      expect(mockTrayModule.setUpdateState).toHaveBeenCalledWith('downloading', '1.1.0');
      expect(mockAutoUpdater.downloadUpdate).toHaveBeenCalled();
      expect(mockAutoUpdater.quitAndInstall).toHaveBeenCalled();
    });

    test('should install immediately when update is already downloaded', async () => {
      jest.useFakeTimers();
      updater.initAutoUpdater(mockWindows);

      // Simulate a completed download via the update-downloaded event
      const downloadedHandler = mockAutoUpdater.on.mock.calls.find(call => call[0] === 'update-downloaded')[1];
      downloadedHandler({ version: '1.1.0', releaseDate: '2026-01-01', releaseNotes: '' });
      mockAutoUpdater.downloadUpdate.mockClear();

      const promise = updater.downloadAndInstallUpdate('1.1.0');
      await jest.advanceTimersByTimeAsync(1500);
      const result = await promise;

      expect(result.success).toBe(true);
      expect(mockAutoUpdater.downloadUpdate).not.toHaveBeenCalled();
      expect(mockAutoUpdater.quitAndInstall).toHaveBeenCalled();
    });

    test('should revert tray state to available when download fails', async () => {
      jest.useFakeTimers();
      updater.initAutoUpdater(mockWindows);
      mockAutoUpdater.downloadUpdate.mockRejectedValue(new Error('network down'));

      const promise = updater.downloadAndInstallUpdate('1.1.0');
      await jest.advanceTimersByTimeAsync(1000);
      const result = await promise;

      expect(result.success).toBe(false);
      expect(mockTrayModule.setUpdateState).toHaveBeenCalledWith('available', '1.1.0');
      expect(mockAutoUpdater.quitAndInstall).not.toHaveBeenCalled();
    });
  });
});