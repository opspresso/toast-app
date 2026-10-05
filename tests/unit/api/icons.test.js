jest.mock('../../../src/main/logger', () => ({ createLogger: () => ({ warn: jest.fn() }) }));
jest.mock('electron', () => ({ app: { getPath: () => '/mock/user-data' } }));
jest.mock('fs', () => ({ promises: { stat: jest.fn(), readFile: jest.fn(), realpath: jest.fn() } }));
let mockSession = 0;
const mockClient = {
  createApiClient: jest.fn(), getAccessToken: jest.fn(() => 'test-token'), getSessionVersion: () => mockSession,
  authenticatedRequest: jest.fn(), ENDPOINTS: { USER_ICONS: 'https://toastapp.dev/api/users/icons' },
};
jest.mock('../../../src/main/api/client', () => mockClient);
const fs = require('fs');
const { uploadIcon } = require('../../../src/main/api/icons');
const filePath = '/mock/user-data/icons/App.png';
const png = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 1]);
let post;
beforeEach(() => {
  jest.clearAllMocks();
  mockSession++;
  mockClient.getAccessToken.mockReturnValue('test-token');
  fs.promises.realpath.mockImplementation(async value => value);
  fs.promises.stat.mockResolvedValue({ mtimeMs: 1000, size: png.length, isFile: () => true });
  fs.promises.readFile.mockResolvedValue(png);
  post = jest.fn(async () => ({ data: { success: true, data: { url: `https://icons.example.test/account-${mockSession}/icon.png` } } }));
  mockClient.createApiClient.mockReturnValue({ post });
  mockClient.authenticatedRequest.mockImplementation(async fn => fn());
});

it('uploads extracted PNG data with authenticated multipart headers', async () => {
  expect((await uploadIcon({ filePath })).success).toBe(true);
  expect(mockClient.createApiClient).toHaveBeenCalledWith({ timeout: 15000, headers: {} });
  const [url, body, config] = post.mock.calls[0];
  expect(url).toBe(mockClient.ENDPOINTS.USER_ICONS);
  expect(body).toBeInstanceOf(FormData);
  expect(config.headers).toEqual({ Authorization: 'Bearer test-token' });
});
it('shares simultaneous uploads and caches their URL within the current account', async () => {
  const [first, second] = await Promise.all([uploadIcon({ filePath }), uploadIcon({ filePath })]);
  expect(first.url).toBe(second.url);
  expect(post).toHaveBeenCalledTimes(1);
  expect(fs.promises.readFile).toHaveBeenCalledTimes(1);
  expect(await uploadIcon({ filePath })).toMatchObject({ cached: true, url: first.url });
});
it('uploads again after file changes or account changes', async () => {
  const first = await uploadIcon({ filePath });
  fs.promises.stat.mockResolvedValue({ mtimeMs: 2000, size: png.length, isFile: () => true });
  await uploadIcon({ filePath });
  mockSession++;
  expect((await uploadIcon({ filePath })).url).not.toBe(first.url);
  expect(post).toHaveBeenCalledTimes(3);
});
it.each([404, 405, 503])('does not retain a %i outage after the server recovers', async statusCode => {
  mockClient.authenticatedRequest.mockResolvedValueOnce({ error: { statusCode, message: 'Unavailable' } });
  expect(await uploadIcon({ filePath })).toMatchObject({ success: false, unavailable: true });
  expect((await uploadIcon({ filePath })).success).toBe(true);
  expect(post).toHaveBeenCalledTimes(1);
});
it('does not use an old account response to populate the new account cache', async () => {
  let finish;
  post.mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
  const old = uploadIcon({ filePath });
  await new Promise(resolve => setImmediate(resolve));
  mockSession++;
  const current = await uploadIcon({ filePath });
  finish({ data: { success: true, data: { url: 'https://icons.example.test/old.png' } } });
  expect(await old).toMatchObject({ success: false, canceled: true });
  expect((await uploadIcon({ filePath })).url).toBe(current.url);
});
it('does not upload under a new account when the account changes during file reading', async () => {
  fs.promises.readFile.mockImplementationOnce(async () => { mockSession++; return png; });
  expect(await uploadIcon({ filePath })).toMatchObject({ canceled: true });
  expect(post).not.toHaveBeenCalled();
});
it('rejects paths outside the extraction cache before reading their contents', async () => {
  expect((await uploadIcon({ filePath: '/mock/user-data/auth-tokens.json' })).success).toBe(false);
  expect(fs.promises.readFile).not.toHaveBeenCalled();
  expect(post).not.toHaveBeenCalled();
});
it('rejects symlinks that leave the extraction cache', async () => {
  fs.promises.realpath.mockImplementation(async value => value === filePath ? '/private/data.png' : value);
  expect((await uploadIcon({ filePath })).success).toBe(false);
  expect(fs.promises.readFile).not.toHaveBeenCalled();
  expect(post).not.toHaveBeenCalled();
});
it('rejects oversized files before reading them and rejects non-PNG content before sending', async () => {
  fs.promises.stat.mockResolvedValueOnce({ size: 2_000_001, isFile: () => true });
  expect((await uploadIcon({ filePath })).success).toBe(false);
  expect(fs.promises.readFile).not.toHaveBeenCalled();
  fs.promises.readFile.mockResolvedValueOnce(Buffer.from('not an image'));
  expect((await uploadIcon({ filePath })).success).toBe(false);
  expect(post).not.toHaveBeenCalled();
});
it('passes the token refresh callback to the shared client', async () => {
  const onUnauthorized = jest.fn();
  await uploadIcon({ filePath, onUnauthorized });
  expect(mockClient.authenticatedRequest).toHaveBeenCalledWith(expect.any(Function), { onUnauthorized });
});
it('rejects cached uploads after logout and reports file read failures', async () => {
  await uploadIcon({ filePath });
  mockSession++;
  mockClient.getAccessToken.mockReturnValue(null);
  expect((await uploadIcon({ filePath })).success).toBe(false);
  mockClient.getAccessToken.mockReturnValue('test-token');
  fs.promises.stat.mockRejectedValueOnce(Object.assign(new Error('missing'), { code: 'ENOENT' }));
  expect(await uploadIcon({ filePath })).toMatchObject({ success: false, error: expect.stringContaining('ENOENT') });
});
it.each([{}, { url: 'file:///private/data' }, { url: 123 }])('rejects an invalid response URL: %j', async data => {
  post.mockResolvedValueOnce({ data: { success: true, data } });
  expect(await uploadIcon({ filePath })).toMatchObject({ success: false, error: 'Invalid icon upload response' });
});

it('evicts old entries instead of retaining an unbounded upload cache', async () => {
  for (let index = 0; index < 300; index++) {
    await uploadIcon({ filePath: `/mock/user-data/icons/App${index}.png` });
  }
  expect((await uploadIcon({ filePath: '/mock/user-data/icons/App0.png' })).cached).not.toBe(true);
  expect(post).toHaveBeenCalledTimes(301);
});
