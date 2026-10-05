const fs = require('fs');
const path = require('path');
const vm = require('vm');
function element() {
  const classes = new Set();
  return { disabled: false, textContent: '', className: '', innerHTML: '',
    classList: { add: x => classes.add(x), remove: x => classes.delete(x), contains: x => classes.has(x), toggle: (x, on) => on ? classes.add(x) : classes.delete(x) },
    addEventListener: jest.fn(), replaceChildren() {}, appendChild() {},
  };
}
const makeProfile = (email = 'a@example.test', session = 1) => ({
  email, name: 'Test account', isAuthenticated: true, authSessionVersion: session,
  subscription: { active: true, is_subscribed: true, plan: 'Premium', features: { cloud_sync: false } },
});
let context;
let account;
let bridge;
let events;
beforeEach(() => {
  jest.useFakeTimers();
  events = new Map();
  bridge = {
    fetchUserProfile: jest.fn().mockResolvedValue(makeProfile()),
    getSyncStatus: jest.fn().mockResolvedValue({}), setConfig: jest.fn(),
    logout: jest.fn().mockResolvedValue(true), log: { error: jest.fn(), info: jest.fn() },
  };
  const source = fs.readFileSync(path.join(__dirname, '../../../src/renderer/pages/settings/modules/account-settings.js'), 'utf8');
  const names = source.match(/import \{([\s\S]*?)\} from '\.\/dom-elements.js';/)[1].split(',').map(x => x.trim()).filter(Boolean);
  const authState = {};
  context = vm.createContext({ ...Object.fromEntries(names.map(x => [x, element()])), module: { exports: {} },
    authState, updateAuthState: data => Object.assign(authState, data),
    window: { settings: bridge, addEventListener: (name, callback) => events.set(name, callback) },
    document: { getElementById: () => context.error, createElement: () => element() }, error: element(),
    setLoading: (node, value) => node.classList.toggle('hidden', !value), getInitials: () => 'TA',
    cloudSyncUI: { updateSyncStatusUI: jest.fn(), disableCloudSyncUI: jest.fn() }, setTimeout, clearTimeout,
  });
  vm.runInContext(source.replace(/^import [\s\S]*?;\n/gm, '').replaceAll('export ', '') +
    '\nmodule.exports = { fetchUserProfile, handleRefreshSubscription, setupAccountEventListeners, handleLogout };', context);
  account = context.module.exports;
  account.setupAccountEventListeners();
});
afterEach(() => jest.useRealTimers());

it('refreshes through main even with a displayed profile and never grants or writes entitlement', async () => {
  await account.fetchUserProfile();
  await account.handleRefreshSubscription();
  expect(bridge.fetchUserProfile).toHaveBeenLastCalledWith(true);
  expect(context.authState.subscription.features.cloud_sync).toBe(false);
  expect(bridge.setConfig).not.toHaveBeenCalled();
  expect(context.refreshSubscriptionButton.textContent).toBe('Refresh Complete!');
});
it('shows refresh failure instead of claiming success or replacing the displayed account', async () => {
  await account.fetchUserProfile();
  bridge.fetchUserProfile.mockResolvedValueOnce({ error: { message: 'Offline' } });
  await account.handleRefreshSubscription();
  expect(context.refreshSubscriptionButton.textContent).toBe('Refresh Failed');
  expect(context.error.textContent).toBe('Offline');
  expect(context.authState.profile.email).toBe('a@example.test');
  expect(context.error.classList.contains('hidden')).toBe(false);
});
it('ignores an old profile response after a logout notification', async () => {
  let resolve;
  bridge.fetchUserProfile.mockReturnValueOnce(new Promise(done => { resolve = done; }));
  const request = account.fetchUserProfile();
  events.get('logout-success')();
  resolve(makeProfile());
  await expect(request).rejects.toThrow('account changed');
  expect(context.authState.isLoggedIn).toBe(false);
  expect(context.authState.profile).toBeNull();
});
it('keeps the new account when an earlier IPC response arrives late', async () => {
  let resolve;
  bridge.fetchUserProfile.mockReturnValueOnce(new Promise(done => { resolve = done; }));
  const request = account.fetchUserProfile();
  events.get('auth-state-changed')({ detail: { profile: makeProfile('b@example.test', 2) } });
  resolve(makeProfile());
  await expect(request).rejects.toThrow('account changed');
  expect(context.userEmail.textContent).toBe('b@example.test');
});
it('handles session expiry from main without requiring the user to press logout', async () => {
  await account.fetchUserProfile();
  events.get('auth-state-changed')({ detail: { isAuthenticated: false } });
  expect(context.authState.isLoggedIn).toBe(false);
  expect(context.profileSection.classList.contains('hidden')).toBe(true);
});
it('reports a failed local logout and retains the signed-in UI', async () => {
  await account.fetchUserProfile();
  bridge.logout.mockResolvedValueOnce(false);
  await account.handleLogout();
  expect(context.authState.isLoggedIn).toBe(true);
  expect(context.error.textContent).toBe('Could not finish logout.');
});
