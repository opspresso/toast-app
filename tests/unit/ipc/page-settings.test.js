const handlers = {};
jest.mock('electron', () => ({ app: {}, ipcMain: { handle: (name, fn) => { handlers[name] = fn; } } }));
jest.mock('../../../src/main/logger', () => ({ createLogger: () => ({ info() {}, error() {} }) }));
jest.mock('../../../src/main/action-approval', () => ({ trustCurrentConfig: jest.fn() }));
jest.mock('../../../src/main/broadcast', () => ({ broadcastToWindows: jest.fn() }));
const { setupConfigHandlers } = require('../../../src/main/ipc/config');
const client = require('../../../src/main/api/client');
const clone = value => JSON.parse(JSON.stringify(value));
let pages;
let config;
let base;
beforeEach(() => {
  client.clearTokens();
  pages = [{ id: 'page', name: 'Page', buttons: [
    { id: 'a', name: 'A', shortcut: 'Q', action: 'open', url: 'https://a.test' },
    { id: 'b', name: 'B', shortcut: 'W', action: 'open', url: 'https://b.test' },
  ] }];
  config = { get: key => key === 'pages' ? pages : 9, set: jest.fn((_key, value) => { pages = value; }) };
  base = { pages: clone(pages), session: client.getSessionVersion() };
  setupConfigHandlers({}, config);
});
it('merges independent edits against the exact original snapshot', () => {
  const desired = clone(pages);
  desired[0].buttons[0].name = 'Local';
  pages[0].buttons[1].url = 'https://remote.test';
  expect(handlers['save-pages']({}, desired, base).success).toBe(true);
  expect(pages[0].buttons[0].name).toBe('Local');
  expect(pages[0].buttons[1].url).toBe('https://remote.test');
  expect(config.set).toHaveBeenCalledTimes(1);
});
it('rejects a stale same-field edit or deletion without losing the newer settings', () => {
  const desired = clone(pages);
  desired[0].buttons[0].name = 'Local';
  pages[0].buttons[0].name = 'Remote';
  expect(handlers['save-pages']({}, desired, base)).toMatchObject({ success: false, conflict: true });
  expect(handlers['save-pages']({}, [], base)).toMatchObject({ success: false, conflict: true });
  expect(config.set).not.toHaveBeenCalled();
});
it('rejects edits from a previous account even if its page data is identical', () => {
  client.setAccessToken('different-account');
  expect(handlers['save-pages']({}, pages, base)).toMatchObject({ success: false, conflict: true });
  expect(config.set).not.toHaveBeenCalled();
});
it('retries a failed write instead of suppressing an identical retry as a duplicate success', () => {
  config.set.mockImplementationOnce(() => { throw new Error('Disk full'); });
  const desired = clone(pages);
  desired[0].name = 'Changed';
  expect(handlers['save-pages']({}, desired, base).success).toBe(false);
  expect(handlers['save-pages']({}, desired, base).success).toBe(true);
  expect(config.set).toHaveBeenCalledTimes(2);
});
it('rejects malformed actions before writing', () => {
  const desired = clone(pages);
  desired[0].buttons[0] = { name: 'Broken', action: 'exec', command: '' };
  expect(handlers['save-pages']({}, desired, base).success).toBe(false);
  expect(config.set).not.toHaveBeenCalled();
});
it.each(['pages', '_sync', 'security', 'cloudSync.enabled'])('does not let generic writes bypass the owning handler: %s', key => {
  expect(handlers['set-config']({}, key, {})).toBe(false);
  expect(config.set).not.toHaveBeenCalled();
});
