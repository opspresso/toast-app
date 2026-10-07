const fs = require('fs');
const vm = require('vm');
const path = require('path');
const flush = () => new Promise(resolve => setImmediate(resolve));

let elements;
let events;
let api;
let ui;
let confirm;
let auth;
let status;

beforeEach(() => {
  elements = {};
  events = {};
  status = { enabled: true, hasPermission: true, isSyncing: false, lastSyncTime: 0, deviceId: 'test' };
  api = {
    getSyncStatus: jest.fn(async () => status),
    setCloudSyncEnabled: jest.fn(async enabled => ({ success: true, status: { ...status, enabled } })),
    manualSync: jest.fn(async () => ({ success: true })),
  };
  confirm = jest.fn(() => true);
  const context = vm.createContext({
    module: { exports: {} }, confirm,
    window: { settings: api, addEventListener: (name, callback) => { events[name] = callback; } },
    document: { getElementById: id => {
      if (!elements[id]) elements[id] = { textContent: '', disabled: false, checked: false, classList: { toggle: jest.fn() }, setAttribute: jest.fn(),
        addEventListener: (name, callback) => { elements[id][name] = callback; } };
      return elements[id];
    } },
  });
  const source = fs.readFileSync(path.join(__dirname, '../../../src/renderer/pages/settings/cloud-sync.js'), 'utf8')
    .replace('export { initializeCloudSyncUI, updateSyncStatusUI, disableCloudSyncUI };', 'module.exports = { initializeCloudSyncUI, updateSyncStatusUI, disableCloudSyncUI };');
  vm.runInContext(source, context);
  ui = context.module.exports;
  auth = { isLoggedIn: true, subscription: { plan: 'Premium', features: { cloud_sync: false } } };
  ui.initializeCloudSyncUI({}, auth, { error: jest.fn() });
});

it('displays actual idle status without an endless spinner or fabricated sync time', async () => {
  await flush();
  expect(elements['sync-status-text'].textContent).toBe('Cloud Sync Enabled');
  expect(elements['last-synced-time'].textContent).toBe('Not synced yet');
  expect(elements['sync-loading'].classList.toggle).toHaveBeenLastCalledWith('hidden', true);
  expect(auth.subscription.features.cloud_sync).toBe(false);
});

it('uses main-process permission instead of granting access from a plan name', async () => {
  await flush();
  events['cloud-sync-status']({ detail: { ...status, hasPermission: false } });
  expect(elements['manual-sync-upload'].disabled).toBe(true);
  expect(elements['enable-cloud-sync'].disabled).toBe(true);
});

it('shows automatic sync failures and re-enables actions after completion', async () => {
  await flush();
  events['cloud-sync-status']({ detail: { ...status, isSyncing: true } });
  expect(elements['manual-sync-resolve'].disabled).toBe(true);
  events['cloud-sync-status']({ detail: { ...status, error: 'Both devices edited this snippet' } });
  expect(elements['sync-status-text'].textContent).toBe('Both devices edited this snippet');
  expect(elements['manual-sync-resolve'].disabled).toBe(false);
});

it('shows a failed IPC preference change and restores the checkbox', async () => {
  await flush();
  api.setCloudSyncEnabled.mockResolvedValueOnce({ success: false, error: 'Store unavailable' });
  elements['enable-cloud-sync'].checked = false;
  await elements['enable-cloud-sync'].change();
  expect(elements['sync-status-text'].textContent).toBe('Store unavailable');
  expect(elements['enable-cloud-sync'].checked).toBe(true);
});

it('confirms explicit overwrites and leaves safe synchronization unprompted', async () => {
  await flush();
  confirm.mockReturnValue(false);
  elements['manual-sync-upload'].click();
  expect(api.manualSync).not.toHaveBeenCalled();
  api.manualSync.mockResolvedValueOnce({ success: false, error: 'Conflict: snippets' });
  elements['manual-sync-resolve'].click();
  await flush();
  expect(api.manualSync).toHaveBeenCalledWith('resolve');
  expect(elements['sync-status-text'].textContent).toBe('Conflict: snippets');
});
