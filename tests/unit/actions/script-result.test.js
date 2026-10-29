/**
 * Runs JavaScript actions in a real VM to check the documented `result` contract.
 */
jest.mock('electron', () => ({ app: { getAppPath: jest.fn(() => '/app/path') } }));
jest.mock('../../../src/main/logger', () => ({
  createLogger: jest.fn(() => ({ info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() })),
}));

const { executeScript } = require('../../../src/main/actions/script');

const run = (script, scriptParams) => executeScript({ action: 'script', scriptType: 'javascript', script, scriptParams });

describe('JavaScript action result', () => {
  test('reports a string result as a successful message', async () => {
    await expect(run('result = `Hello ${params.name}!`;', { name: 'World' })).resolves.toEqual({
      success: true,
      message: 'Hello World!',
      result: 'Hello World!',
    });
  });

  test('awaits a Promise result', async () => {
    await expect(run("result = Promise.resolve(`Hello, ${params.name || 'Toast'}`);")).resolves.toMatchObject({
      success: true,
      message: 'Hello, Toast',
    });
  });

  test('serializes a non-action object result', async () => {
    await expect(run('result = { count: 2 };')).resolves.toEqual({ success: true, message: '{"count":2}', result: { count: 2 } });
  });

  test('returns an action result object unchanged', async () => {
    await expect(run("result = { success: false, message: 'Not ready' };")).resolves.toEqual({ success: false, message: 'Not ready' });
  });

  test('reports a rejected Promise as a failure', async () => {
    await expect(run("result = Promise.reject(new Error('Offline'));")).resolves.toMatchObject({
      success: false,
      message: 'Error executing JavaScript: Offline',
    });
  });

  test('reports a falsy value instead of replacing it with the default message', async () => {
    await expect(run('result = 0;')).resolves.toEqual({ success: true, message: '0', result: 0 });
  });

  test('keeps the default message when no result is assigned', async () => {
    await expect(run('const unused = 1;')).resolves.toEqual({ success: true, message: 'JavaScript executed successfully' });
  });
});
