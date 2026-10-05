const fs = require('fs');
const os = require('os');
const path = require('path');
let mockDirectory;
let mockSession = 0;
const mockPost = jest.fn();
jest.mock('electron', () => ({ app: { getPath: () => mockDirectory } }));
jest.mock('../../../src/main/logger', () => ({ createLogger: () => ({ warn() {} }) }));
jest.mock('../../../src/main/api/client', () => ({
  ENDPOINTS: { USER_ICONS: 'https://example.test/icons' }, getSessionVersion: () => mockSession,
  getAccessToken: () => 'local-test-token', authenticatedRequest: fn => fn(), createApiClient: () => ({ post: mockPost }),
}));
const { uploadIcon } = require('../../../src/main/api/icons');
let file;
beforeEach(() => {
  mockSession++;
  mockPost.mockReset().mockResolvedValue({ data: { success: true, data: { url: 'https://example.test/icon.png' } } });
  mockDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'toast-icon-upload-'));
  fs.mkdirSync(path.join(mockDirectory, 'icons'));
  file = path.join(mockDirectory, 'icons', 'App.png');
  fs.copyFileSync(path.join(__dirname, '../../../assets/icons/icon.png'), file);
});
afterEach(() => fs.rmSync(mockDirectory, { recursive: true, force: true }));
it('uploads a real cached PNG through multipart FormData', async () => {
  expect((await uploadIcon({ filePath: file })).success).toBe(true);
  const form = mockPost.mock.calls[0][1];
  const uploaded = form.get('icon');
  expect(uploaded.type).toBe('image/png');
  expect(Buffer.from(await uploaded.arrayBuffer())).toEqual(fs.readFileSync(file));
});
it('does not follow a real symlink from the icon cache to private data', async () => {
  const privateFile = path.join(mockDirectory, 'auth-tokens.json');
  fs.writeFileSync(privateFile, '{"test":"private fixture"}');
  const symlink = path.join(mockDirectory, 'icons', 'Symlink.png');
  fs.symlinkSync(privateFile, symlink);
  expect((await uploadIcon({ filePath: symlink })).success).toBe(false);
  expect(mockPost).not.toHaveBeenCalled();
});
