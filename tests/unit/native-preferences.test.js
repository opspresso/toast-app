const fs = require('fs');
const os = require('os');
const path = require('path');
const Conf = require('conf');
let mockConfig;
const mockHandlers = {};
const mockApp = { getPath: () => '/tmp', setLoginItemSettings: jest.fn() };
const mockApi = { downloadSettings: jest.fn(), uploadSettings: jest.fn() };
jest.mock('electron', () => ({
  app: mockApp, ipcMain: { handle: (name, callback) => { mockHandlers[name] = callback; } },
  globalShortcut: { unregisterAll: jest.fn(), register: () => true }, dialog: { showErrorBox: jest.fn() },
  screen: { getCursorScreenPoint: () => ({ x: 960, y: 540 }), getDisplayNearestPoint: () => ({ id: 1, workArea: { x: 0, y: 0, width: 1920, height: 1080 } }) },
}));
jest.mock('../../src/main/config', () => ({ ...jest.requireActual('../../src/main/config'), createConfigStore: () => mockConfig }));
jest.mock('../../src/main/auth', () => ({ setSessionExpiredHandler: jest.fn() }));
jest.mock('../../src/main/user-data-manager', () => ({ initialize: jest.fn(), getUserProfile: async () => ({ email: 'test@example.test', isAuthenticated: true, subscription: { active: true, features: { cloud_sync: true } } }) }));
jest.mock('../../src/main/api', () => ({ sync: mockApi }));
jest.mock('../../src/main/logger', () => ({ createLogger: () => ({ info() {}, warn() {}, error() {}, debug() {} }) }));
jest.mock('../../src/main/action-approval', () => ({ sanitizeRemotePages: async pages => pages, recordRemoteChanges: jest.fn(), trustCurrentConfig: jest.fn() }));
jest.mock('../../src/main/utils/icon-normalizer', () => ({ normalizeLocalIcons: async pages => ({ pages, failures: 0 }) }));
const { schema } = require('../../src/main/config');
const { applyNativePreferences } = require('../../src/main/native-preferences');
const { createSyncManager } = require('../../src/main/cloud-sync');
const { setupConfigHandlers } = require('../../src/main/ipc/config');
const authManager = require('../../src/main/auth-manager');
let directory;
let windows;
let manager;
let bounds;
let cloud;

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
  directory = fs.mkdtempSync(path.join(os.tmpdir(), 'toast-native-preferences-'));
  mockConfig = new Conf({ cwd: directory, schema });
  mockConfig.set('globalHotkey', '');
  bounds = { width: 700, height: 500 };
  windows = { toast: {
    isDestroyed: () => false, getBounds: () => bounds,
    setSize: jest.fn((width, height) => { bounds = { width, height }; }), setOpacity: jest.fn(),
    setSkipTaskbar: jest.fn(), setPosition: jest.fn(), webContents: { send: jest.fn() },
  }, settings: { isDestroyed: () => false, webContents: { send: jest.fn() } } };
  applyNativePreferences(mockConfig, windows);
  authManager.initialize(windows);
  manager = createSyncManager(authManager, mockConfig);
  authManager.setSyncManager(manager);
  setupConfigHandlers(windows, mockConfig);
  cloud = {
    pages: [], snippets: [],
    appearance: { ...mockConfig.get('appearance'), monitorPositions: {}, opacity: 0.65, size: 'small', position: 'bottom' },
    advanced: { ...mockConfig.get('advanced'), launchAtLogin: true, showInTaskbar: true },
  };
  mockApi.downloadSettings.mockImplementation(async () => ({ success: true, normalized: cloud, syncMetadata: { revision: 4 } }));
  jest.clearAllMocks();
});
afterEach(() => {
  manager.unsubscribe();
  jest.useRealTimers();
  fs.rmSync(directory, { recursive: true, force: true });
});

it('applies downloaded preferences to native windows and the OS once', async () => {
  expect((await manager.manualSync()).success).toBe(true);
  expect(mockConfig.get('appearance.opacity')).toBe(0.65);
  expect(windows.toast.setOpacity).toHaveBeenCalledWith(0.65);
  expect(windows.toast.setSize).toHaveBeenCalledWith(500, 350);
  expect(windows.toast.setPosition).toHaveBeenCalledWith(710, 710);
  expect(windows.toast.setSkipTaskbar).toHaveBeenCalledWith(false);
  expect(mockApp.setLoginItemSettings).toHaveBeenCalledWith({ openAtLogin: true });
  await manager.manualSync();
  expect(windows.toast.setOpacity).toHaveBeenCalledTimes(1);
  expect(windows.toast.setSize).toHaveBeenCalledTimes(1);
  expect(mockApp.setLoginItemSettings).toHaveBeenCalledTimes(1);
});

it('reports native application failure and retries unapplied values on the next sync', async () => {
  windows.toast.setOpacity.mockImplementationOnce(() => { throw new Error('Native window unavailable'); });
  expect(await manager.manualSync()).toMatchObject({ success: false, error: 'Native window unavailable' });
  expect((await manager.manualSync()).success).toBe(true);
  expect(windows.toast.setOpacity).toHaveBeenLastCalledWith(0.65);
  expect(windows.toast.setSize).toHaveBeenCalledWith(500, 350);
});

it('applies imported preferences and notifies both existing windows', async () => {
  const file = path.join(directory, 'import.json');
  fs.writeFileSync(file, JSON.stringify({ appearance: cloud.appearance, advanced: cloud.advanced }));
  expect(await mockHandlers['import-config']({}, file)).toBe(true);
  expect(windows.toast.setOpacity).toHaveBeenCalledWith(0.65);
  expect(mockApp.setLoginItemSettings).toHaveBeenCalledWith({ openAtLogin: true });
  expect(windows.settings.webContents.send).toHaveBeenCalledWith('config-updated', expect.objectContaining({ appearance: cloud.appearance }));
});

it('uses the new position preset after a saved manual window position', () => {
  mockConfig.set('appearance.monitorPositions', { 1: { x: 20, y: 30 } });
  expect(mockHandlers['set-config']({}, 'appearance.position', 'bottom')).toBe(true);
  expect(windows.toast.setPosition).toHaveBeenLastCalledWith(610, 560);
});

it('applies batch settings and resets through the same native effect path', async () => {
  expect(mockHandlers['set-config']({}, null, { appearance: cloud.appearance, advanced: cloud.advanced })).toBe(true);
  expect(windows.toast.setSize).toHaveBeenCalledWith(500, 350);
  expect(await mockHandlers['reset-config']()).toBe(true);
  expect(windows.toast.setSize).toHaveBeenLastCalledWith(700, 500);
  expect(windows.toast.setOpacity).toHaveBeenLastCalledWith(0.95);
  expect(mockApp.setLoginItemSettings).toHaveBeenLastCalledWith({ openAtLogin: false });
});

it('does not announce sync success before native settings are applied', () => {
  mockConfig.set('appearance.opacity', 0.7);
  windows.toast.setOpacity.mockImplementationOnce(() => { throw new Error('Native failure'); });
  expect(() => authManager.notifySettingsSynced()).toThrow('Native failure');
  expect(windows.toast.webContents.send).not.toHaveBeenCalledWith('settings-synced', expect.anything());
});
