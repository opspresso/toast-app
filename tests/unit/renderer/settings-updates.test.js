const fs = require('fs');
const path = require('path');
const vm = require('vm');
function load(file, context, exports) {
  const source = fs.readFileSync(path.join(__dirname, '../../../src/renderer/pages/settings', file), 'utf8');
  vm.runInContext(source.replace(/^import [\s\S]*?;\n/gm, '').replaceAll('export ', '') + `\nmodule.exports = { ${exports} };`, context);
  return context.module.exports;
}
let context;
let update;
beforeEach(() => {
  context = vm.createContext({ module: { exports: {} },
    config: { appearance: { theme: 'dark', accentColor: 'blue' }, advanced: {}, snippets: [{ keyword: ':old', content: 'old' }] },
    updateConfig: value => { context.config = value; },
    applyTheme: jest.fn(), applyAccentColor: jest.fn(), initializeAppearanceSettings: jest.fn(),
    initializeGeneralSettings: jest.fn(), initializeAdvancedSettings: jest.fn(), initializeSnippetsSettings: jest.fn(),
    document: { addEventListener: jest.fn(), querySelectorAll: () => [{ id: 'account', classList: { contains: () => true } }] },
    window: { settings: { log: { info: jest.fn(), error: jest.fn() } } },
  });
  update = load('index.js', context, 'applyConfigUpdate').applyConfigUpdate;
});
it('applies cloud theme and accent changes while the Account tab is selected', () => {
  update({ appearance: { theme: 'light', accentColor: 'purple' } });
  expect(context.applyTheme).toHaveBeenCalledWith('light');
  expect(context.applyAccentColor).toHaveBeenCalledWith('purple');
  expect(context.initializeAppearanceSettings).toHaveBeenCalledTimes(1);
});
it('does not rebuild an unchanged snippet form on account or page notifications', () => {
  update({ subscription: { active: true }, pages: [] });
  expect(context.config.snippets).toEqual([{ keyword: ':old', content: 'old' }]);
  expect(context.initializeSnippetsSettings).not.toHaveBeenCalled();
  update({ snippets: [] });
  expect(context.initializeSnippetsSettings).toHaveBeenCalledTimes(1);
});
it('updates hidden advanced controls only when their values change', () => {
  update({ advanced: { showInTaskbar: true } });
  update({ advanced: { showInTaskbar: true } });
  expect(context.initializeAdvancedSettings).toHaveBeenCalledTimes(1);
  expect(context.initializeGeneralSettings).toHaveBeenCalledTimes(1);
});
it('does not overwrite an in-progress hotkey recording during a background settings update', () => {
  context.globalHotkeyInput = { value: 'Waiting for hotkey input...' };
  context.launchAtLoginCheckbox = { checked: false };
  context.isRecordingHotkey = true;
  context.config.globalHotkey = 'Alt+Space';
  const { initializeGeneralSettings } = load('modules/general-settings.js', context, 'initializeGeneralSettings');
  initializeGeneralSettings();
  expect(context.globalHotkeyInput.value).toBe('Waiting for hotkey input...');
  context.isRecordingHotkey = false;
  initializeGeneralSettings();
  expect(context.globalHotkeyInput.value).toBe('Alt+Space');
});
