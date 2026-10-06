const handlers = {};
let mockSession = 0;
const mockExtract = jest.fn();
const mockUpload = jest.fn();
const mockHasToken = jest.fn();
jest.mock('electron', () => ({ ipcMain: { handle: (name, fn) => { handlers[name] = fn; } } }));
jest.mock('../../../src/main/api/client', () => ({ getSessionVersion: () => mockSession }));
jest.mock('../../../src/main/api/icons', () => ({ uploadIcon: (...args) => mockUpload(...args) }));
jest.mock('../../../src/main/auth-manager', () => ({ hasValidToken: () => mockHasToken(), refreshAccessToken: jest.fn() }));
jest.mock('../../../src/main/shortcuts', () => ({ unregisterGlobalShortcuts: jest.fn(), registerGlobalShortcuts: jest.fn() }));
jest.mock('../../../src/main/logger', () => ({ createLogger: () => ({ debug() {}, error() {}, info() {} }), handleIpcLogging: jest.fn() }));
jest.mock('../../../src/main/utils/app-icon-extractor', () => ({
  extractAppNameFromPath: () => 'Calculator', extractAppIcon: (...args) => mockExtract(...args), convertToTildePath: value => value,
}));
const { setupSystemHandlers } = require('../../../src/main/ipc/system');
beforeEach(() => {
  jest.clearAllMocks();
  mockSession++;
  mockExtract.mockResolvedValue('/tmp/icons/App.png');
  mockHasToken.mockResolvedValue(true);
  mockUpload.mockResolvedValue({ success: true, url: 'https://icons.example.test/app.png' });
  setupSystemHandlers({}, {});
});
it('forwards the selected full path instead of reconstructing an Applications path', async () => {
  const result = await handlers['extract-app-icon']({}, '/System/Applications/Calculator.app', true);
  expect(result.success).toBe(true);
  expect(mockExtract).toHaveBeenCalledWith('/System/Applications/Calculator.app', null, true);
});
it('does not upload under a different account after slow extraction', async () => {
  let finish;
  mockExtract.mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
  const result = handlers['extract-app-icon']({}, '/System/Applications/Calculator.app');
  mockSession++;
  finish('/tmp/icons/App.png');
  expect(await result).toMatchObject({ success: false, canceled: true });
  expect(mockUpload).not.toHaveBeenCalled();
});
it('does not publish a late upload URL into a new login session', async () => {
  mockUpload.mockImplementationOnce(async () => { mockSession++; return { success: true, url: 'https://icons.example.test/old.png' }; });
  expect(await handlers['extract-app-icon']({}, 'Calculator')).toMatchObject({ success: false, canceled: true });
});
