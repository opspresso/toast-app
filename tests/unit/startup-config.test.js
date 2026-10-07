const fs = require('fs');
const path = require('path');
const vm = require('vm');

it('shows a recoverable config error before creating windows or starting synchronization', () => {
  const events = new Map();
  let ready;
  const app = { requestSingleInstanceLock: () => true, whenReady: () => ({ then: fn => { ready = fn; } }), on: (name, fn) => events.set(name, fn), quit: jest.fn() };
  const dialog = { showErrorBox: jest.fn() };
  const createToastWindow = jest.fn();
  const initCloudSync = jest.fn();
  const error = Object.assign(new Error('Back up config.json and restore a valid copy.'), { code: 'CONFIG_READ_FAILED' });
  const modules = {
    electron: { app, dialog },
    './main/config/env': { loadEnv() {} },
    './main/logger': { createLogger: () => ({ info() {}, error() {} }), maskAuthUrl: value => value },
    './main/config': { createConfigStore: () => { throw error; } },
    './main/shortcuts': {}, './main/tray': {}, './main/ipc': {}, './main/auth-manager': {}, './main/auth': {}, './main/user-data-manager': {}, './main/action-approval': {},
    './main/cloud-sync': { initCloudSync },
    './main/windows': { createToastWindow, windows: {} },
    './main/protocol-dispatcher': { createProtocolDispatcher: () => ({ receive() {} }) },
  };
  const context = vm.createContext({ require: name => modules[name] || require(name), process: { platform: 'darwin', argv: [] }, console });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../../src/index.js'), 'utf8'), context);
  events.get('activate')();
  expect(createToastWindow).not.toHaveBeenCalled();
  ready();
  expect(dialog.showErrorBox).toHaveBeenCalledWith('Toast could not load its settings', error.message);
  expect(app.quit).toHaveBeenCalledTimes(1);
  expect(createToastWindow).not.toHaveBeenCalled();
  expect(initCloudSync).not.toHaveBeenCalled();
});
