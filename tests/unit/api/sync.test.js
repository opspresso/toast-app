const mockHttp = { get: jest.fn(), put: jest.fn() };
const mockClient = {
  ENDPOINTS: { SETTINGS: '/api/users/settings' },
  createApiClient: () => mockHttp,
  getAuthHeaders: () => ({ Authorization: 'Bearer test-token' }),
  authenticatedRequest: jest.fn(),
};
jest.mock('../../../src/main/api/client', () => mockClient);
const sync = require('../../../src/main/api/sync');
const settings = { revision: 4, pages: [{ name: 'Cloud', buttons: [] }], snippets: [] };

beforeEach(() => {
  jest.clearAllMocks();
  mockClient.authenticatedRequest.mockImplementation(fn => fn());
  mockHttp.get.mockResolvedValue({ data: { success: true, data: settings } });
  mockHttp.put.mockResolvedValue({ data: { success: true, data: { ...settings, revision: 5 } } });
});

it('normalizes the real server envelope including its revision and empty arrays', async () => {
  const result = await sync.downloadSettings();
  expect(result).toMatchObject({ success: true, normalized: { pages: settings.pages, snippets: [] }, syncMetadata: { revision: 4 } });
  expect(result.normalized).not.toHaveProperty('advanced');
  expect(mockHttp.get).toHaveBeenCalledWith('/api/users/settings', { headers: { Authorization: 'Bearer test-token' } });
});

it('accepts an account without synced sections instead of guessing an array field', async () => {
  mockHttp.get.mockResolvedValueOnce({ data: { success: true, data: { theme: 'system', revision: 0 } } });
  expect(await sync.downloadSettings()).toMatchObject({ success: true, normalized: {}, syncMetadata: { revision: 0 } });
});

it.each([
  null, {}, [], { success: true, data: { pages: [] } },
  { success: true, data: { revision: -1, pages: [] } },
  { success: true, data: { revision: 0, pages: [null] } },
  { success: true, data: { revision: 0, snippets: [{ keyword: ':x', content: 2 }] } },
  { success: true, data: { revision: 0, appearance: [] } },
])('rejects malformed settings instead of returning partial data: %j', async data => {
  mockHttp.get.mockResolvedValueOnce({ data });
  expect((await sync.downloadSettings()).success).toBe(false);
});

it('returns the acknowledged upload snapshot and revision', async () => {
  const directData = { snippets: [], baseRevision: 4 };
  const onUnauthorized = jest.fn();
  expect(await sync.uploadSettings({ directData, onUnauthorized })).toMatchObject({ success: true, syncMetadata: { revision: 5 } });
  expect(mockHttp.put).toHaveBeenCalledWith('/api/users/settings', directData, expect.any(Object));
  expect(mockClient.authenticatedRequest).toHaveBeenCalledWith(expect.any(Function), { onUnauthorized });
});

it.each([400, 401, 409, 428, 429, 500])('preserves HTTP %s from the authenticated transport', async statusCode => {
  mockClient.authenticatedRequest.mockResolvedValueOnce({ error: { message: 'failed', statusCode } });
  expect(await sync.downloadSettings()).toMatchObject({ success: false, error: 'failed', statusCode });
  expect(sync.getLastSyncStatus()).toMatchObject({ success: false, error: 'failed' });
});

it('reports network errors without logging settings payloads', async () => {
  mockHttp.get.mockRejectedValueOnce(new Error('Offline'));
  expect(await sync.downloadSettings()).toMatchObject({ success: false, error: 'Offline' });
});
