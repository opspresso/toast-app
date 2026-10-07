const fs = require('fs');
const os = require('os');
const path = require('path');
const vm = require('vm');
const { createRequire } = require('module');
const { spawnSync } = require('child_process');
const file = path.resolve(__dirname, '../../../src/main/actions/exec.js');
const source = fs.readFileSync(file, 'utf8');
const itPosix = process.platform === 'win32' ? it.skip : it;
let directory;
let child;
function load(platform) {
  const module = { exports: {} };
  const requireHere = createRequire(file);
  vm.runInNewContext('(function(require, module, process) {' + source + '\n})', {})(name => name === 'child_process' ? child : requireHere(name), module, { platform });
  return module.exports.executeCommand;
}
beforeEach(() => {
  directory = fs.mkdtempSync(path.join(os.tmpdir(), 'toast-terminal-'));
  child = { exec: jest.fn((_text, _options, callback) => callback(null, '', '')), execFile: jest.fn() };
});
afterEach(() => fs.rmSync(directory, { recursive: true, force: true }));

itPosix('keeps a real macOS terminal command in a directory containing quotes, spaces and dollar expressions', async () => {
  const cwd = path.join(directory, "project's $(printf expanded) space");
  fs.mkdirSync(cwd);
  let execution;
  child.execFile.mockImplementation((program, args, callback) => {
    expect(program).toBe('osascript');
    const literal = args[1].match(/do script "([\s\S]*)"$/)[1];
    const command = literal.replace(/\\([\\"])/g, '$1');
    // Exercise the shell text delivered to Terminal, without opening a user's terminal.
    execution = spawnSync('/bin/sh', ['-c', command], { encoding: 'utf8' });
    callback(execution.status === 0 ? null : new Error('Shell command failed'));
  });
  const result = await load('darwin')({ command: 'pwd -P', workingDir: cwd, runInTerminal: true });
  expect(result.success).toBe(true);
  expect(execution.stdout.trim()).toBe(fs.realpathSync(cwd));
});

it('honors runInTerminal for open -a with a working directory', async () => {
  child.execFile.mockImplementation((_program, _args, callback) => callback(null));
  const result = await load('darwin')({ command: 'open -a "Fixture App"', workingDir: directory, runInTerminal: true });
  expect(result.success).toBe(true);
  expect(child.exec).not.toHaveBeenCalled();
  expect(child.execFile.mock.calls[0][0]).toBe('osascript');
  expect(child.execFile.mock.calls[0][1][1]).toContain('Fixture App');
});

it.each(['darwin', 'linux', 'win32'])('rejects a missing terminal working directory on %s before starting a process', async platform => {
  child.execFile.mockImplementation((_program, _args, callback) => callback(null));
  const result = await load(platform)({ command: 'printf test', workingDir: path.join(directory, 'missing'), runInTerminal: true });
  expect(result.success).toBe(false);
  expect(child.exec).not.toHaveBeenCalled();
  expect(child.execFile).not.toHaveBeenCalled();
});

itPosix('passes Linux terminal argv and cwd without an outer shell expanding either', async () => {
  const cwd = path.join(directory, 'folder $(printf expanded)');
  fs.mkdirSync(cwd);
  let execution;
  child.execFile.mockImplementation((program, args, options, callback) => {
    expect(program).toBe('x-terminal-emulator');
    expect(args[0]).toBe('-e');
    execution = spawnSync(args[1], args.slice(2), { ...options, encoding: 'utf8' });
    callback(execution.status === 0 ? null : new Error('Shell command failed'));
  });
  const result = await load('linux')({ command: "pwd -P; printf '%s\\n' 'literal $(printf expanded)'", workingDir: cwd, runInTerminal: true });
  expect(result.success).toBe(true);
  expect(execution.stdout.trim().split('\n')).toEqual([fs.realpathSync(cwd), 'literal $(printf expanded)']);
  expect(child.exec).not.toHaveBeenCalled();
});

itPosix('keeps a macOS open folder before application arguments', async () => {
  child.exec.mockImplementation((command, options, callback) => {
    const execution = spawnSync('/bin/sh', ['-c', `open() { printf '%s\\n' "$@"; }; ${command}`], { cwd: options.cwd, encoding: 'utf8' });
    callback(null, execution.stdout, execution.stderr);
  });
  const result = await load('darwin')({ command: 'open -a "Fixture App" --args --fixture', workingDir: directory });
  expect(result.stdout.trim().split('\n')).toEqual(['-a', 'Fixture App', directory, '--args', '--fixture']);
});
