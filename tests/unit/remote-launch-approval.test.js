const fs = require('fs');
const os = require('os');
const path = require('path');
jest.mock('child_process', () => ({ execFile: jest.fn((_file, _args, callback) => callback(null, '', '')) }));
const { execFile } = require('child_process');
const { dialog, shell } = require('electron');
const { executeAction } = require('../../src/main/executor');
const { initializeApprovals, recordRemoteChanges, computeFingerprint, trustCurrentConfig } = require('../../src/main/action-approval');
const pages = action => [{ name: 'Remote', buttons: [action] }];
let store;
let directory;
let originalPlatform;
const launch = { action: 'application', applicationPath: '/bin/sh', applicationParameters: '-c "printf toast-test"' };
beforeEach(() => {
  jest.clearAllMocks();
  originalPlatform = process.platform;
  Object.defineProperty(process, 'platform', { value: 'linux' });
  directory = fs.mkdtempSync(path.join(os.tmpdir(), 'toast-approval-'));
  const values = { pages: [] };
  store = { get: key => values[key], set: (key, value) => { values[key] = value; } };
  initializeApprovals(store);
  dialog.showMessageBox.mockResolvedValue({ response: 1 });
});
afterEach(() => {
  Object.defineProperty(process, 'platform', { value: originalPlatform });
  fs.rmSync(directory, { recursive: true, force: true });
});

it.each(['application', 'path', 'custom application', 'custom protocol', 'nested chain'])('requires approval before a remote %s reaches the OS', async kind => {
  const file = path.join(directory, 'fixture.sh');
  fs.writeFileSync(file, 'printf toast-test\n');
  const action = {
    application: launch,
    path: { action: 'open', path: file },
    'custom application': { action: 'open', path: file, application: '/bin/sh' },
    'custom protocol': { action: 'open', url: 'toast-test:launch' },
    'nested chain': { action: 'chain', actions: [{ action: 'chain', actions: [launch] }] },
  }[kind];
  recordRemoteChanges(store, pages(action));
  const result = await executeAction(action);
  expect(result.success).toBe(false);
  expect(dialog.showMessageBox).toHaveBeenCalledTimes(1);
  expect(execFile).not.toHaveBeenCalled();
  expect(shell.openPath).not.toHaveBeenCalled();
  expect(shell.openExternal).not.toHaveBeenCalled();
});

it('approves a launch once and requires new approval when its parameters change', async () => {
  recordRemoteChanges(store, pages(launch));
  dialog.showMessageBox.mockResolvedValueOnce({ response: 0 });
  expect((await executeAction(launch)).success).toBe(true);
  expect((await executeAction(launch)).success).toBe(true);
  expect(dialog.showMessageBox).toHaveBeenCalledTimes(1);
  expect(execFile).toHaveBeenCalledTimes(2);
  const changed = { ...launch, applicationParameters: '-c "printf changed"' };
  recordRemoteChanges(store, pages(changed));
  expect((await executeAction(changed)).success).toBe(false);
  expect(execFile).toHaveBeenCalledTimes(2);
  expect(computeFingerprint(changed)).not.toBe(computeFingerprint(launch));
});

it('keeps existing local launches trusted while migrating an older approval store', async () => {
  const oldPending = computeFingerprint({ action: 'exec', command: 'printf pending' });
  store.set('pages', pages(launch));
  store.set('security', { approvalsInitialized: true, trustedActions: [], pendingApprovals: [{ fingerprint: oldPending }] });
  initializeApprovals(store);
  recordRemoteChanges(store, pages({ action: 'chain', actions: [launch, { action: 'exec', command: 'printf pending' }] }));
  expect((await executeAction(launch)).success).toBe(true);
  expect(dialog.showMessageBox).not.toHaveBeenCalled();
  expect(store.get('security').pendingApprovals.map(entry => entry.fingerprint)).toEqual([oldPending]);
});

it('does not approve a downloaded launch during an unrelated local save', async () => {
  recordRemoteChanges(store, pages(launch));
  store.set('pages', pages(launch));
  trustCurrentConfig(store);
  expect((await executeAction(launch)).success).toBe(false);
  expect(execFile).not.toHaveBeenCalled();
});

it.each(['https://example.test', 'localhost:3000/path', 'example.test/docs'])('keeps normal web links available: %s', async url => {
  const action = { action: 'open', url };
  recordRemoteChanges(store, pages(action));
  expect((await executeAction(action)).success).toBe(true);
  expect(dialog.showMessageBox).not.toHaveBeenCalled();
  expect(shell.openExternal).toHaveBeenCalledTimes(1);
});
