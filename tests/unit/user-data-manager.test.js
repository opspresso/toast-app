const mockFs = { existsSync: jest.fn(), unlinkSync: jest.fn(), readFileSync: jest.fn() };
jest.mock('fs', () => mockFs);
jest.mock('electron', () => ({ app: { getPath: () => '/test/user-data' } }));
jest.mock('../../src/main/logger', () => ({ createLogger: () => ({ warn: jest.fn() }) }));
jest.mock('../../src/main/config/env', () => ({ getEnv: (_key, fallback) => fallback }));

const deferred = () => {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { promise, resolve };
};
const profile = email => ({ email, subscription: { active: true, features: { cloud_sync: true } } });

describe('Session-bound profile cache', () => {
  let manager;
  let client;
  let auth;
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(new Date('2026-10-05T00:00:00Z'));
    mockFs.existsSync.mockReturnValue(false);
    mockFs.unlinkSync.mockReset();
    client = { getSessionVersion: jest.fn(() => 1), getAccessToken: jest.fn(() => 'token-a') };
    auth = { hasValidToken: jest.fn().mockResolvedValue(true), fetchUserProfile: jest.fn().mockResolvedValue(profile('a@example.test')) };
    manager = require('../../src/main/user-data-manager');
    manager.initialize(client, auth);
  });
  afterEach(() => jest.useRealTimers());

  test('shares concurrent profile/subscription loads and returns independent copies', async () => {
    const results = await Promise.all([manager.getUserProfile(), manager.getUserProfile(true), manager.getUserProfile()]);
    expect(auth.fetchUserProfile).toHaveBeenCalledTimes(1);
    results[0].subscription.active = false;
    expect(results[1].subscription.active).toBe(true);
    expect((await manager.getUserProfile()).subscription.active).toBe(true);
    expect(auth.fetchUserProfile).toHaveBeenCalledTimes(1);
  });

  test('expires after five minutes and force refresh makes exactly one request', async () => {
    await manager.getUserProfile();
    jest.advanceTimersByTime(299999);
    await manager.getUserProfile();
    expect(auth.fetchUserProfile).toHaveBeenCalledTimes(1);
    jest.advanceTimersByTime(1);
    await manager.getUserProfile();
    expect(auth.fetchUserProfile).toHaveBeenCalledTimes(2);
    await manager.getUserProfile(true);
    expect(auth.fetchUserProfile).toHaveBeenCalledTimes(3);
  });

  test('never reads a previous installation/account profile from disk', async () => {
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readFileSync.mockReturnValue(JSON.stringify(profile('old@example.test')));
    expect(await manager.getUserProfile()).toMatchObject({ email: 'a@example.test', authSessionVersion: 1 });
    expect(mockFs.readFileSync).not.toHaveBeenCalled();
  });

  test('invalidates cached identity on a new credential session', async () => {
    await manager.getUserProfile();
    client.getSessionVersion.mockReturnValue(2);
    auth.fetchUserProfile.mockResolvedValue(profile('b@example.test'));
    expect(await manager.getUserProfile()).toMatchObject({ email: 'b@example.test', authSessionVersion: 2 });
  });

  test('a late account A response cannot replace account B or its pending request', async () => {
    const old = deferred();
    auth.fetchUserProfile.mockReturnValueOnce(old.promise);
    const first = manager.getUserProfile();
    await Promise.resolve();
    client.getSessionVersion.mockReturnValue(2);
    auth.fetchUserProfile.mockResolvedValue(profile('b@example.test'));
    await manager.getUserProfile();
    old.resolve(profile('a@example.test'));
    expect(await first).toMatchObject({ error: { code: 'AUTH_SESSION_CHANGED' } });
    expect(await manager.getUserProfile()).toMatchObject({ email: 'b@example.test' });
    expect(auth.fetchUserProfile).toHaveBeenCalledTimes(2);
  });

  test('logout invalidates a pending response even before tokens finish clearing', async () => {
    const old = deferred();
    auth.fetchUserProfile.mockReturnValueOnce(old.promise);
    const first = manager.getUserProfile();
    await Promise.resolve();
    manager.cleanupOnLogout();
    old.resolve(profile('a@example.test'));
    expect(await first).toMatchObject({ error: { code: 'AUTH_SESSION_CHANGED' } });
  });

  test.each([
    { error: { code: 'HTTP_503', message: 'Service unavailable' } },
    { error: { code: 'AUTH_REFRESH_FAILED', requireRelogin: true } },
  ])('preserves API failure instead of substituting cached identity: %j', async error => {
    await manager.getUserProfile();
    auth.fetchUserProfile.mockResolvedValue(error);
    expect(await manager.getUserProfile(true)).toEqual(error);
    expect(await manager.getUserProfile()).toEqual(error);
    expect(auth.fetchUserProfile).toHaveBeenCalledTimes(3);
  });

  test('does not turn refresh outages into a guest profile', async () => {
    auth.hasValidToken.mockResolvedValue(false);
    expect(await manager.getUserProfile()).toMatchObject({ error: { code: 'AUTH_UNAVAILABLE' } });
    client.getAccessToken.mockReturnValue(null);
    expect(await manager.getUserProfile()).toMatchObject({ isAuthenticated: false });
  });

  test.each([null, {}, { email: 'a@example.test' }])('rejects malformed profile %j', async value => {
    auth.fetchUserProfile.mockResolvedValue(value);
    expect(await manager.getUserProfile()).toMatchObject({ error: { code: 'INVALID_PROFILE' } });
  });

  test('reports a thrown transport error and can retry', async () => {
    auth.fetchUserProfile.mockRejectedValueOnce(new Error('Offline'));
    expect(await manager.getUserProfile()).toMatchObject({ error: { message: 'Offline' } });
    expect(await manager.getUserProfile()).toMatchObject({ email: 'a@example.test' });
  });

  test('cleanup attempts both legacy caches and reports removal failure', () => {
    mockFs.existsSync.mockReturnValue(true);
    mockFs.unlinkSync.mockImplementationOnce(() => { throw new Error('Read only'); });
    expect(manager.cleanupOnLogout()).toBe(false);
    expect(mockFs.unlinkSync).toHaveBeenCalledTimes(2);
  });
});
