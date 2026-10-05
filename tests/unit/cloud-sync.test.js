/** Behavioral sync tests: real merge/metadata logic, mocked network and Electron boundary. */
const { isDeepStrictEqual: equal } = require('util');
const mockApi = { isCloudSyncEnabled: jest.fn(), downloadSettings: jest.fn(), uploadSettings: jest.fn() };
jest.mock('../../src/main/api', () => ({ sync: mockApi }));
jest.mock('../../src/main/logger', () => ({ createLogger: () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() }) }));
jest.mock('../../src/main/action-approval', () => ({ sanitizeRemotePages: jest.fn(async pages => pages), recordRemoteChanges: jest.fn() }));
jest.mock('../../src/main/utils/icon-normalizer', () => ({ normalizeLocalIcons: jest.fn(async pages => ({ pages, failures: 0 })) }));
const { schema } = require('../../src/main/config');
const { createSyncManager } = require('../../src/main/cloud-sync');
const clone = value => JSON.parse(JSON.stringify(value));
const content = name => ({
  pages: [{ id: 'page', name, buttons: [{ shortcut: 'q', name: 'Button', action: 'open', url: 'https://toastapp.dev' }] }],
  snippets: [{ id: 'snippet', keyword: ':one', content: name }],
  appearance: { monitorPositions: {}, ...clone(schema.appearance.default) }, advanced: clone(schema.advanced.default),
});
function store(data = {}) {
  let values = { ...content('factory'), cloudSync: { enabled: true }, _sync: {}, ...data };
  const listeners = new Map();
  return {
    get: key => key.split('.').reduce((v, part) => v?.[part], values),
    set: jest.fn((key, value) => {
      const previous = values;
      const update = typeof key === 'object' ? key : key === 'cloudSync.enabled' ? { cloudSync: { enabled: value } } : { [key]: value };
      values = { ...values, ...clone(update) };
      for (const [field, callbacks] of listeners) {
        if (!equal(previous[field], values[field])) callbacks.forEach(callback => callback(values[field], previous[field]));
      }
    }),
    onDidChange: (key, callback) => {
      const callbacks = listeners.get(key) || new Set();
      callbacks.add(callback); listeners.set(key, callbacks);
      return () => callbacks.delete(callback);
    },
    listenerCount: () => [...listeners.values()].reduce((count, callbacks) => count + callbacks.size, 0),
  };
}
function deferred() {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { promise, resolve };
}
let remote;
let managers;
const envelope = () => ({ success: true, data: clone(remote), normalized: Object.fromEntries(['pages', 'snippets', 'appearance', 'advanced'].filter(key => Object.hasOwn(remote, key)).map(key => [key, clone(remote[key])])), syncMetadata: { revision: remote.revision } });
function setup(data) {
  const config = store(data);
  const auth = { hasValidToken: jest.fn(async () => true), refreshAccessToken: jest.fn(), fetchUserProfile: jest.fn(async () => ({ email: 'one@example.test' })), notifySettingsSynced: jest.fn() };
  const manager = createSyncManager(auth, config);
  managers.push(manager);
  return { config, auth, manager };
}

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  managers = [];
  remote = { ...content('cloud'), revision: 4 };
  mockApi.isCloudSyncEnabled.mockImplementation(async ({ hasValidToken }) => hasValidToken());
  mockApi.downloadSettings.mockImplementation(async () => envelope());
  mockApi.uploadSettings.mockImplementation(async ({ directData }) => {
    if (directData.baseRevision !== remote.revision) return { success: false, statusCode: 409 };
    const { baseRevision, ...settings } = directData;
    remote = { ...remote, ...clone(settings), revision: baseRevision + 1 };
    return envelope();
  });
});
afterEach(() => { managers.forEach(manager => manager.unsubscribe()); jest.useRealTimers(); });

it('downloads existing cloud buttons and snippets before any initial upload', async () => {
  const { manager, config } = setup();
  expect(await manager.syncAfterLogin('one@example.test')).toMatchObject({ success: true, revision: 4 });
  expect(config.get('pages')).toEqual(remote.pages);
  expect(config.get('snippets')).toEqual(remote.snippets);
  expect(config.get('_sync.bootstrapBackup').settings.pages[0].name).toBe('factory');
  expect(mockApi.uploadSettings).not.toHaveBeenCalled();
  const write = config.set.mock.calls.find(([value]) => typeof value === 'object' && value.pages);
  expect(write[0]).toHaveProperty('snippets');
  expect(write[0]._sync.baseRevision).toBe(4);
});

it('uploads local settings to an empty account after the initial GET succeeds', async () => {
  remote = { revision: 0 };
  const { manager } = setup();
  expect((await manager.syncAfterLogin()).success).toBe(true);
  expect(remote.pages[0].name).toBe('factory');
  expect(remote.revision).toBe(1);
  expect(mockApi.downloadSettings.mock.invocationCallOrder[0]).toBeLessThan(mockApi.uploadSettings.mock.invocationCallOrder[0]);
});

it('does not replace local settings or upload when the first read fails', async () => {
  mockApi.downloadSettings.mockResolvedValueOnce({ success: false, statusCode: 500 });
  const { manager, config } = setup();
  expect((await manager.syncAfterLogin()).success).toBe(false);
  expect(config.get('pages')[0].name).toBe('factory');
  expect(mockApi.uploadSettings).not.toHaveBeenCalled();
});

it('honors the disabled preference on login, then downloads immediately when enabled', async () => {
  const { manager, config } = setup({ cloudSync: { enabled: false } });
  expect((await manager.syncAfterLogin()).success).toBe(false);
  expect(mockApi.downloadSettings).not.toHaveBeenCalled();
  manager.enable();
  await jest.advanceTimersByTimeAsync(0);
  expect(config.get('pages')[0].name).toBe('cloud');
});

it('polls for remote edits every 15 minutes without redundant uploads', async () => {
  const { manager, config } = setup();
  await manager.syncAfterLogin();
  remote.snippets = [];
  remote.revision++;
  await jest.advanceTimersByTimeAsync(15 * 60 * 1000);
  expect(config.get('snippets')).toEqual([]);
  expect(mockApi.downloadSettings).toHaveBeenCalledTimes(2);
  expect(mockApi.uploadSettings).not.toHaveBeenCalled();
});

it('debounces edits and uploads intentional empty pages and snippets', async () => {
  const { manager, config } = setup();
  await manager.syncAfterLogin();
  config.set('pages', []);
  await jest.advanceTimersByTimeAsync(1000);
  config.set('snippets', []);
  await jest.advanceTimersByTimeAsync(4999);
  expect(mockApi.uploadSettings).not.toHaveBeenCalled();
  await jest.advanceTimersByTimeAsync(1);
  expect(remote.pages).toEqual([]);
  expect(remote.snippets).toEqual([]);
  expect(config.get('_sync.baseRevision')).toBe(5);
});

it('merges offline edits and independent remote changes regardless of device clocks', async () => {
  const { manager, config } = setup();
  await manager.syncAfterLogin();
  manager.disable();
  config.set('pages', [{ ...config.get('pages')[0], name: 'local' }]);
  config.set('_sync', { ...config.get('_sync'), lastModifiedAt: Number.MAX_SAFE_INTEGER });
  remote.snippets[0].content = 'remote';
  remote.revision++;
  manager.enable();
  await jest.advanceTimersByTimeAsync(0);
  expect(remote.pages[0].name).toBe('local');
  expect(remote.snippets[0].content).toBe('remote');
  expect(config.get('snippets')[0].content).toBe('remote');
});

it('retains local and remote values on true conflicts until an explicit choice', async () => {
  const { manager, config } = setup();
  await manager.syncAfterLogin();
  config.set('snippets', [{ ...config.get('snippets')[0], content: 'local' }]);
  remote.snippets[0].content = 'remote'; remote.revision++;
  expect((await manager.manualSync()).statusCode).toBe(409);
  expect(config.get('snippets')[0].content).toBe('local');
  expect(remote.snippets[0].content).toBe('remote');
  expect(manager.getCurrentStatus().isConflicted).toBe(true);
  expect((await manager.manualSync('upload')).success).toBe(true);
  expect(remote.snippets[0].content).toBe('local');
});

it('preserves edits made while GET is in flight', async () => {
  const { manager, config } = setup();
  await manager.syncAfterLogin();
  const pending = deferred();
  remote.pages[0].name = 'remote'; remote.revision++;
  mockApi.downloadSettings.mockReturnValueOnce(pending.promise);
  const sync = manager.manualSync();
  await jest.advanceTimersByTimeAsync(0);
  config.set('snippets', [{ id: 'snippet', keyword: ':one', content: 'during GET' }]);
  pending.resolve(envelope());
  expect((await sync).success).toBe(true);
  expect(config.get('snippets')[0].content).toBe('during GET');
  expect(config.get('pages')[0].name).toBe('remote');
});

it('acknowledges only the uploaded snapshot and queues edits made during PUT', async () => {
  const { manager, config } = setup();
  await manager.syncAfterLogin();
  config.set('snippets', [{ id: 'snippet', keyword: ':one', content: 'first' }]);
  const pending = deferred();
  const originalUpload = mockApi.uploadSettings.getMockImplementation();
  let acknowledge;
  mockApi.uploadSettings.mockImplementationOnce(async args => {
    acknowledge = await originalUpload(args);
    return pending.promise;
  });
  const sync = manager.manualSync();
  await jest.advanceTimersByTimeAsync(0);
  config.set('snippets', [{ id: 'snippet', keyword: ':one', content: 'second' }]);
  pending.resolve(acknowledge);
  await sync;
  expect(config.get('snippets')[0].content).toBe('second');
  expect(config.get('_sync.baseSnapshot').snippets[0].content).toBe('first');
  await jest.advanceTimersByTimeAsync(5000);
  expect(remote.snippets[0].content).toBe('second');
});

it('reconciles a rejected revision with remote edits under one sync operation', async () => {
  const { manager, config } = setup();
  await manager.syncAfterLogin();
  config.set('snippets', [{ id: 'snippet', keyword: ':one', content: 'local' }]);
  mockApi.uploadSettings.mockImplementationOnce(async () => {
    remote.pages[0].name = 'concurrent'; remote.revision++;
    return { success: false, statusCode: 409 };
  });
  expect((await manager.manualSync()).success).toBe(true);
  expect(remote.pages[0].name).toBe('concurrent');
  expect(remote.snippets[0].content).toBe('local');
});

it('discards a download that finishes after sync is disabled', async () => {
  const { manager, config } = setup();
  const pending = deferred();
  mockApi.downloadSettings.mockReturnValueOnce(pending.promise);
  const sync = manager.syncAfterLogin();
  await jest.advanceTimersByTimeAsync(0);
  manager.disable();
  pending.resolve(envelope());
  expect((await sync).canceled).toBe(true);
  expect(config.get('pages')[0].name).toBe('factory');
  expect(jest.getTimerCount()).toBe(0);
});

it('does not resume a pending login sync after logout stops it', async () => {
  const { manager } = setup();
  const pending = deferred();
  mockApi.downloadSettings.mockReturnValueOnce(pending.promise);
  const first = manager.manualSync();
  await jest.advanceTimersByTimeAsync(0);
  const login = manager.syncAfterLogin('two@example.test');
  manager.stopPeriodicSync();
  pending.resolve(envelope());
  await first;
  expect((await login).canceled).toBe(true);
  expect(jest.getTimerCount()).toBe(0);
});

it('never uploads the previous account settings into an empty new account', async () => {
  const { manager, config } = setup();
  await manager.syncAfterLogin('one@example.test');
  remote = { revision: 0 };
  await manager.syncAfterLogin('two@example.test');
  expect(config.get('pages')).toEqual([]);
  expect(config.get('snippets')).toEqual([]);
  expect(mockApi.uploadSettings).not.toHaveBeenCalled();
  expect(config.get('_sync.accountBackups')['one@example.test'].settings.pages[0].name).toBe('cloud');
});

it('checks authentication again instead of reusing a cached sync grant', async () => {
  const { manager, auth } = setup();
  await manager.syncAfterLogin();
  auth.hasValidToken.mockResolvedValue(false);
  expect((await manager.manualSync()).success).toBe(false);
  expect(mockApi.downloadSettings).toHaveBeenCalledTimes(1);
});

it('removes timers and listeners on unsubscribe', () => {
  const { manager, config } = setup();
  config.set('snippets', []);
  manager.unsubscribe();
  expect(config.listenerCount()).toBe(0);
  expect(jest.getTimerCount()).toBe(0);
});

it('preserves legacy offline edits until the user selects a direction', async () => {
  const { manager, config } = setup({ _sync: { lastSyncedAt: 10, lastModifiedAt: 20, dataHash: 'old-hash' } });
  expect((await manager.syncAfterLogin()).statusCode).toBe(409);
  expect(config.get('pages')[0].name).toBe('factory');
  expect(mockApi.uploadSettings).not.toHaveBeenCalled();
  expect((await manager.manualSync('download')).success).toBe(true);
  expect(config.get('pages')).toEqual(remote.pages);
});

it('retries a transient upload failure without dropping pending local edits', async () => {
  const { manager, config } = setup();
  await manager.syncAfterLogin();
  config.set('snippets', []);
  mockApi.uploadSettings.mockResolvedValueOnce({ success: false, statusCode: 503, error: 'Unavailable' });
  await jest.advanceTimersByTimeAsync(5000);
  expect(config.get('snippets')).toEqual([]);
  expect(config.get('_sync.baseSnapshot').snippets).toHaveLength(1);
  await jest.advanceTimersByTimeAsync(6000);
  expect(remote.snippets).toEqual([]);
  expect(manager.getCurrentStatus().error).toBeNull();
});

it('defers an icon normalization response if a user edits during that work', async () => {
  const { normalizeLocalIcons } = require('../../src/main/utils/icon-normalizer');
  const { manager, config } = setup();
  await manager.syncAfterLogin();
  config.set('pages', [{ ...config.get('pages')[0], name: 'first' }]);
  const pending = deferred();
  normalizeLocalIcons.mockReturnValueOnce(pending.promise);
  const sync = manager.manualSync();
  await jest.advanceTimersByTimeAsync(0);
  const first = config.get('pages');
  config.set('pages', [{ ...first[0], name: 'second' }]);
  pending.resolve({ pages: first, failures: 0 });
  expect((await sync).deferred).toBe(true);
  expect(config.get('pages')[0].name).toBe('second');
  await jest.advanceTimersByTimeAsync(5000);
  expect(remote.pages[0].name).toBe('second');
});

it('rejects invalid remote actions without dropping only the invalid buttons', async () => {
  const { sanitizeRemotePages } = require('../../src/main/action-approval');
  const { manager, config } = setup();
  sanitizeRemotePages.mockResolvedValueOnce([]);
  expect((await manager.syncAfterLogin()).success).toBe(false);
  expect(config.get('pages')[0].name).toBe('factory');
  expect(mockApi.uploadSettings).not.toHaveBeenCalled();
});

it("restores an account's offline edits after switching away and back", async () => {
  const { manager, config } = setup();
  await manager.syncAfterLogin('one@example.test');
  const firstCloud = clone(remote);
  config.set('snippets', [{ id: 'snippet', keyword: ':one', content: 'offline edit for first account' }]);
  remote = { revision: 0 };
  await manager.syncAfterLogin('two@example.test');
  expect(config.get('snippets')).toEqual([]);
  remote = firstCloud;
  await manager.syncAfterLogin('one@example.test');
  expect(config.get('snippets')[0].content).toBe('offline edit for first account');
  expect(remote.snippets[0].content).toBe('offline edit for first account');
});

it('treats omitted schema defaults as equal and avoids download-upload loops', async () => {
  remote.appearance = { theme: 'dark' };
  remote.advanced = { hideAfterAction: false };
  const { manager, config } = setup();
  await manager.syncAfterLogin();
  expect(config.get('appearance')).toMatchObject({ theme: 'dark', monitorPositions: {}, opacity: 0.95 });
  await jest.advanceTimersByTimeAsync(15000);
  expect(mockApi.uploadSettings).not.toHaveBeenCalled();
});
