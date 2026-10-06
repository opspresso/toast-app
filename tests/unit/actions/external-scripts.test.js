const fs = require('fs');
const os = require('os');
const path = require('path');
const processTools = jest.requireActual('child_process');
jest.mock('../../../src/main/logger', () => ({ createLogger: () => ({ error: jest.fn() }) }));
jest.mock('child_process', () => ({ exec: jest.fn(), execFile: jest.fn() }));
const child = require('child_process');
const { executeScript } = require('../../../src/main/actions/script');
// These integration checks execute POSIX interpreters; Windows contracts are covered in script.test.js.
(process.platform === 'win32' ? describe.skip : describe)('real external interpreters', () => {
  let directory;
  let pending;
  beforeEach(() => {
    directory = fs.mkdtempSync(path.join(os.tmpdir(), 'toast-script-proof-'));
    jest.spyOn(os, 'tmpdir').mockReturnValue(directory);
    jest.spyOn(Date, 'now').mockReturnValue(1000);
    pending = [];
    for (const kind of ['exec', 'execFile']) child[kind].mockImplementation((...args) => {
      pending.push(() => processTools[kind](...args));
    });
  });
  afterEach(() => {
    jest.restoreAllMocks();
    fs.rmSync(directory, { recursive: true, force: true });
  });
  async function startPending(count) {
    for (let tries = 0; tries < 100 && pending.length < count; tries++) await new Promise(resolve => setTimeout(resolve, 5));
    expect(pending).toHaveLength(count);
    pending.forEach(start => start());
  }
  it('isolates concurrent scripts even when started at the same clock value', async () => {
    const first = executeScript({ scriptType: 'bash', script: 'printf first' });
    const second = executeScript({ scriptType: 'bash', script: 'printf second' });
    await startPending(2);
    const results = await Promise.all([first, second]);
    expect(results.map(result => result.stdout)).toEqual(['first', 'second']);
    expect(results.every(result => result.success)).toBe(true);
    expect(fs.readdirSync(directory)).toEqual([]);
  });
  it('runs Bash syntax in Bash mode, without requiring a shebang', async () => {
    const work = executeScript({ scriptType: 'bash', script: '[[ -o posix ]] && exit 7\nvalues=(first second)\nprintf "%s" "${values[1]}"' });
    await startPending(1);
    const result = await work;
    expect(result.success).toBe(true);
    expect(result.stdout).toBe('second');
    expect(fs.readdirSync(directory)).toEqual([]);
  });
  it('removes its temporary directory after an interpreter failure', async () => {
    const work = executeScript({ scriptType: 'bash', script: 'printf "failure output" >&2; exit 9' });
    await startPending(1);
    const result = await work;
    expect(result.success).toBe(false);
    expect(result.stderr).toContain('failure output');
    expect(fs.readdirSync(directory)).toEqual([]);
  });
  it('creates private script files and excludes arbitrary parent environment variables', async () => {
    const key = 'TOAST_SCRIPT_TEST_SECRET';
    const original = process.env[key];
    process.env[key] = 'test-value-not-for-child';
    try {
      const work = executeScript({ scriptType: 'bash', script: `printf '%s' "\${${key}-unset}"` });
      for (let tries = 0; tries < 100 && !pending.length; tries++) await new Promise(resolve => setTimeout(resolve, 5));
      const dirs = fs.readdirSync(directory);
      expect(dirs).toHaveLength(1);
      const scriptDirectory = path.join(directory, dirs[0]);
      if (process.platform !== 'win32') {
        expect(fs.statSync(scriptDirectory).mode & 0o777).toBe(0o700);
        expect(fs.statSync(path.join(scriptDirectory, 'script.sh')).mode & 0o777).toBe(0o600);
      }
      await startPending(1);
      expect((await work).stdout).toBe('unset');
      expect(fs.readdirSync(directory)).toEqual([]);
    }
    finally {
      if (original === undefined) delete process.env[key];
      else process.env[key] = original;
    }
  });
  it('removes a private directory even when creating its script fails', async () => {
    jest.spyOn(fs.promises, 'writeFile').mockRejectedValueOnce(new Error('Test write failure'));
    const result = await executeScript({ scriptType: 'bash', script: 'printf unused' });
    expect(result.success).toBe(false);
    expect(result.message).toContain('Test write failure');
    expect(pending).toHaveLength(0);
    expect(fs.readdirSync(directory)).toEqual([]);
  });
  it('removes a private directory when the interpreter cannot start', async () => {
    child.execFile.mockImplementationOnce(() => { throw new Error('Test spawn failure'); });
    const result = await executeScript({ scriptType: 'bash', script: 'printf unused' });
    expect(result.success).toBe(false);
    expect(result.message).toContain('Test spawn failure');
    expect(fs.readdirSync(directory)).toEqual([]);
  });

});
