const fs = require('fs');
const os = require('os');
const path = require('path');
const Conf = require('conf');
jest.mock('../../src/main/logger', () => ({ createLogger: () => ({ info() {}, error() {}, debug() {}, warn() {} }) }));
const { schema, importConfig, resetToDefaults } = require('../../src/main/config');
let directory;
let config;
let original;
beforeEach(() => {
  directory = fs.mkdtempSync(path.join(os.tmpdir(), 'toast-config-test-'));
  config = new Conf({ cwd: directory, schema });
  config.set({ pages: [{ id: 'p', name: 'Saved', buttons: [] }], snippets: [{ keyword: ':saved', content: 'keep' }],
    subscription: { isAuthenticated: true }, cloudSync: { enabled: false },
    security: { pendingApprovals: [{ fingerprint: 'pending-action' }] },
    _sync: { accountId: 'account', baseRevision: 5, baseSnapshot: { pages: [] }, accountBackups: { other: {} } },
    textExpander: { seeded: true, enabled: true },
  });
  original = config.store;
});
afterEach(() => fs.rmSync(directory, { recursive: true, force: true }));
function write(value) {
  const file = path.join(directory, 'import.json');
  fs.writeFileSync(file, JSON.stringify(value));
  return file;
}
it('keeps all sections unchanged if any imported preference fails schema validation', () => {
  expect(importConfig(config, write({ pages: [], snippets: [], appearance: { opacity: 99 } }))).toBe(false);
  expect(config.store).toEqual(original);
});
it('imports requested content once without erasing accounts or approvals', () => {
  const changed = jest.fn();
  const unsubscribe = config.onDidAnyChange(changed);
  expect(importConfig(config, write({ pages: [] }))).toBe(true);
  expect(changed).toHaveBeenCalledTimes(1);
  expect(config.get('pages')).toEqual([]);
  for (const key of ['snippets', 'subscription', 'cloudSync', 'security', '_sync', 'textExpander']) {
    expect(config.get(key)).toEqual(original[key]);
  }
  unsubscribe();
});
it('rejects invalid snippets and page actions before changing anything', () => {
  expect(importConfig(config, write({ snippets: [{ keyword: 'x', content: 'invalid' }] }))).toBe(false);
  expect(importConfig(config, write({ pages: [{ name: 'Bad', buttons: [{ name: 'Bad', action: 'exec', command: '' }] }] }))).toBe(false);
  expect(config.store).toEqual(original);
});
it('resets device preferences without clearing cloud state, content, or approvals', () => {
  resetToDefaults(config);
  for (const key of ['pages', 'snippets', 'subscription', 'cloudSync', 'security', '_sync']) {
    expect(config.get(key)).toEqual(original[key]);
  }
  expect(config.get('textExpander')).toMatchObject({ enabled: false, seeded: true });
});
