const fs = require('fs');
const path = require('path');
const vm = require('vm');
const folder = path.join(__dirname, '../../../src/renderer/pages/settings/modules');
function node() {
  const listeners = new Map();
  return { value: '', checked: false, disabled: false, classList: { toggle: jest.fn(), add: jest.fn(), remove: jest.fn() },
    addEventListener(type, listener) { if (!listeners.has(type)) listeners.set(type, new Set()); listeners.get(type).add(listener); },
    async fire(type, event = {}) { for (const callback of listeners.get(type) || []) await callback({ preventDefault() {}, stopImmediatePropagation() {}, ...event }); },
  };
}
let ctx;
let api;
let saved;
function run(text) { return vm.runInContext(text, ctx); }
function load(file) { run(fs.readFileSync(path.join(folder, file), 'utf8').replace(/^import [\s\S]*?;\n/gm, '').replaceAll('export ', '')); }
const flush = async () => { for (let i = 0; i < 10; i++) await Promise.resolve(); };
beforeEach(() => {
  saved = { globalHotkey: 'Alt+Space', appearance: { theme: 'dark' }, advanced: { hideOnBlur: true } };
  api = { setConfig: jest.fn(async (key, value) => {
    const parts = key.split('.');
    if (parts.length === 1) saved[key] = value;
    else saved[parts[0]][parts[1]] = value;
    run(`updateConfig(${JSON.stringify(saved)})`);
    return true;
  }), getConfig: jest.fn(async () => structuredClone(saved)), resetConfig: jest.fn(async () => false),
    temporarilyDisableShortcuts: jest.fn(async () => true), restoreShortcuts: jest.fn(async () => true), closeWindow: jest.fn(),
    log: { error: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn() },
  };
  const dom = {};
  const source = fs.readFileSync(path.join(folder, 'dom-elements.js'), 'utf8');
  for (const match of source.matchAll(/export const (\w+) = document.getElementById/g)) dom[match[1]] = node();
  ctx = vm.createContext({ ...dom, window: { settings: api }, alert: jest.fn(), confirm: jest.fn(() => true),
    document: { ...node(), querySelector: () => null }, applyTheme: jest.fn(), applyAccentColor: jest.fn(), switchTab: jest.fn(),
    setupAccountEventListeners: jest.fn(), setupAboutEventListeners: jest.fn(), setupSnippetsEventListeners: jest.fn(),
  });
  for (const file of ['state.js', 'preference-writes.js', 'general-settings.js', 'appearance-settings.js', 'advanced-settings.js', 'event-handlers.js']) load(file);
  run(`updateConfig(${JSON.stringify(saved)})`);
  ctx.initializeGeneralSettings();
  ctx.setupEventListeners();
});

it('does not report a failed reset as success', async () => {
  await ctx.resetSettingsButton.fire('click');
  expect(ctx.alert).toHaveBeenCalledTimes(1);
  expect(ctx.alert.mock.calls[0][0]).toMatch(/Could not reset/);
  expect(ctx.resetSettingsButton.disabled).toBe(false);
});
it.each([false, new Error('IPC unavailable')])('restores a rejected preference and reports the error: %s', async failure => {
  api.setConfig.mockImplementation(async () => { if (failure instanceof Error) throw failure; return failure; });
  ctx.hideOnBlurCheckbox.checked = false;
  await ctx.hideOnBlurCheckbox.fire('change'); await flush();
  expect(ctx.hideOnBlurCheckbox.checked).toBe(true);
  expect(ctx.alert).toHaveBeenCalledTimes(1);
});
it('does not apply an unsaved theme', async () => {
  api.setConfig.mockResolvedValue(false);
  ctx.themeSelect.value = 'light';
  await ctx.themeSelect.fire('change');
  expect(ctx.themeSelect.value).toBe('dark');
  expect(ctx.applyTheme).not.toHaveBeenCalled();
});
it('cancels recording without clearing the saved hotkey or asking to discard saved changes', async () => {
  await ctx.startRecordingHotkey();
  expect(run('isRecordingHotkey')).toBe(true);
  await ctx.handleHotkeyRecording({ key: 'Escape', preventDefault() {}, stopImmediatePropagation() {} });
  expect(api.setConfig).not.toHaveBeenCalled();
  expect(ctx.globalHotkeyInput.value).toBe('Alt+Space');
  expect(run('isRecordingHotkey')).toBe(false);
  await ctx.document.fire('keydown', { key: 'Escape' });
  expect(api.closeWindow).toHaveBeenCalledTimes(1);
  expect(ctx.confirm).not.toHaveBeenCalled();
});
it('does not start recording when disabling the current hotkey fails', async () => {
  api.temporarilyDisableShortcuts.mockResolvedValue(false);
  await ctx.startRecordingHotkey();
  expect(run('isRecordingHotkey')).toBe(false);
  expect(ctx.globalHotkeyInput.value).toBe('Alt+Space');
  expect(ctx.recordHotkeyButton.disabled).toBe(false);
  expect(ctx.alert).toHaveBeenCalled();
});
it('clears and persists an empty hotkey once even if setup is repeated', async () => {
  ctx.setupEventListeners();
  await ctx.clearHotkeyButton.fire('click');
  expect(api.setConfig).toHaveBeenCalledTimes(1);
  expect(api.setConfig).toHaveBeenCalledWith('globalHotkey', '');
  expect(ctx.globalHotkeyInput.value).toBe('');
  expect(api.restoreShortcuts).toHaveBeenCalledTimes(1);
});
it('restores shortcuts after a hotkey save fails', async () => {
  await ctx.startRecordingHotkey();
  api.setConfig.mockResolvedValue(false);
  await ctx.handleHotkeyRecording({ key: 'x', code: 'KeyX', ctrlKey: true, preventDefault() {}, stopImmediatePropagation() {} });
  expect(api.restoreShortcuts).toHaveBeenCalledTimes(1);
  expect(ctx.globalHotkeyInput.value).toBe('Alt+Space');
  expect(ctx.alert).toHaveBeenCalledTimes(1);
});
it('keeps a newer broadcast when failure recovery returns an older configuration', async () => {
  api.setConfig.mockResolvedValue(false);
  let resolve;
  api.getConfig.mockReturnValue(new Promise(done => { resolve = done; }));
  const pending = ctx.savePreference('appearance.theme', 'light');
  await flush();
  run('updateConfig({appearance: {theme: "system"}})');
  resolve(saved); await pending;
  expect(run('config.appearance.theme')).toBe('system');
});
