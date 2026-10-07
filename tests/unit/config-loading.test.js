const fs = require('fs');
const path = require('path');
const os = require('os');
let mockDirectory;
let mockWriteFailure = false;
const mockLogger = { error: jest.fn(), info: jest.fn() };
jest.mock('electron', () => ({ app: { getPath: () => mockDirectory } }));
jest.mock('../../src/main/logger', () => ({ createLogger: () => mockLogger }));
jest.mock('../../src/main/config/env', () => ({ getEnv: (_key, fallback) => fallback }));
jest.mock('electron-store', () => {
  const Conf = jest.requireActual('conf');
  return class TestStore extends Conf {
    constructor({ name, ...options }) {
      super({ ...options, configName: name, cwd: mockDirectory });
    }
    _write(value) {
      if (mockWriteFailure) throw new Error('Disk full');
      return super._write(value);
    }
  };
});
let configModule;
let file;
beforeEach(() => {
  jest.resetModules();
  jest.clearAllMocks();
  mockDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'toast-config-loading-'));
  mockWriteFailure = false;
  file = path.join(mockDirectory, 'config.json');
  configModule = require('../../src/main/config');
});
afterEach(() => fs.rmSync(mockDirectory, { recursive: true, force: true }));
function write(value) {
  const text = typeof value === 'string' ? value : JSON.stringify(value, null, 4);
  fs.writeFileSync(file, text);
  return text;
}
const content = () => ({
  pages: [{ name: 'Offline page', buttons: [] }], snippets: [{ keyword: ':offline', content: 'Unsent edit' }],
  _sync: { accountId: 'account', baseRevision: 4, accountBackups: { previous: { settings: { pages: [] } } } },
  security: { pendingApprovals: [{ fingerprint: 'pending' }] },
});

it('migrates legacy values only after the complete configuration passes validation', () => {
  const original = content();
  write({ ...original, subscription: { isSubscribed: 'false', isAuthenticated: 'true', subscribedUntil: 2000000000000, pageGroups: '9' } });
  const config = configModule.createConfigStore();
  expect(configModule.createConfigStore()).toBe(config);
  expect(config.get('subscription')).toMatchObject({ isSubscribed: false, isAuthenticated: true, expiresAt: new Date(2000000000000).toISOString(), pageGroups: 9 });
  expect(config.get('subscription')).not.toHaveProperty('subscribedUntil');
  const saved = JSON.parse(fs.readFileSync(file, 'utf8'));
  for (const key of Object.keys(original)) expect(saved[key]).toMatchObject(original[key]);
  expect(saved.subscription.isSubscribed).toBe(false);
  expect(fs.statSync(file).mode & 0o777).toBe(0o600);
  expect(() => config.set('appearance.opacity', 99)).toThrow('schema violation');
});

it('does not partially migrate when another section is invalid', () => {
  const original = write({ ...content(), appearance: { opacity: 99 }, subscription: { isAuthenticated: 'true', expiresAt: null } });
  expect(() => configModule.createConfigStore()).toThrow('could not read or validate');
  expect(fs.readFileSync(file, 'utf8')).toBe(original);
  // A failed initialization must not cache a schema-less instance.
  write({ ...content(), appearance: { opacity: 0.7 }, subscription: { isAuthenticated: 'true', expiresAt: null } });
  const recovered = configModule.createConfigStore();
  expect(recovered.get('appearance.opacity')).toBe(0.7);
  expect(() => recovered.set('advanced.launchAtLogin', 'true')).toThrow('schema violation');
});

it.each([
  { subscription: { isAuthenticated: 'unknown' } },
  { subscription: { pageGroups: '99' } },
  { subscription: [] },
  { snippets: 'not-an-array' },
])('keeps invalid configuration intact without disabling validation: %j', invalid => {
  const original = write({ ...content(), ...invalid });
  expect(() => configModule.createConfigStore()).toThrow('existing settings file was not cleared');
  expect(fs.readFileSync(file, 'utf8')).toBe(original);
});

it('preserves corrupt JSON and does not expose its contents in the reported error or log', () => {
  const original = write('{"snippets": [SENSITIVE_TEST_MARKER');
  let error;
  try { configModule.createConfigStore(); } catch (caught) { error = caught; }
  expect(error.code).toBe('CONFIG_READ_FAILED');
  expect(error.message).toContain(file);
  expect(error.message).not.toContain('SENSITIVE_TEST_MARKER');
  expect(JSON.stringify(mockLogger.error.mock.calls)).not.toContain('SENSITIVE_TEST_MARKER');
  expect(fs.readFileSync(file, 'utf8')).toBe(original);
});

it('preserves the original file when persisting a valid migration fails', () => {
  const original = write({ ...content(), subscription: { expiresAt: null } });
  mockWriteFailure = true;
  expect(() => configModule.createConfigStore()).toThrow('could not read or validate');
  expect(fs.readFileSync(file, 'utf8')).toBe(original);
  mockWriteFailure = false;
  expect(configModule.createConfigStore().get('subscription.expiresAt')).toBe('');
});

it('does not rewrite an already compatible file on startup', () => {
  const original = write({ ...content(), subscription: { isSubscribed: false, isAuthenticated: true, expiresAt: '', pageGroups: 3 } });
  configModule.createConfigStore();
  expect(fs.readFileSync(file, 'utf8')).toBe(original);
});
