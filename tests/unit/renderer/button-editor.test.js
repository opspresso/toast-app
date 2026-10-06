const fs = require('fs');
const path = require('path');
const vm = require('vm');
const clone = value => JSON.parse(JSON.stringify(value));
function element() {
  const classes = new Set();
  return { value: '', checked: false, style: {}, disabled: false, textContent: '',
    classList: { add: value => classes.add(value), remove: value => classes.delete(value), toggle: (key, value) => value ? classes.add(key) : classes.delete(key), contains: value => classes.has(value) },
    focus() {}, scrollIntoView() {}, querySelectorAll: () => [],
  };
}
let context;
let editor;
let state;
let button;
let save;
beforeEach(() => {
  button = { id: 'button', name: 'Original', shortcut: 'Q', color: 'blue', action: 'open', url: 'https://example.test' };
  state = { pages: [{ id: 'page', name: 'Page', buttons: [button] }], viewPages: [{ id: 'page', name: 'Page', buttons: [button] }], index: 0, base: { pages: [], session: 7 } };
  save = jest.fn(async () => ({ success: true }));
  const source = fs.readFileSync(path.join(__dirname, '../../../src/renderer/pages/toast/modules/modals-button-edit.js'), 'utf8');
  const names = source.match(/import \{([\s\S]*?)\} from '\.\/dom-elements.js';/)[1].split(',').map(value => value.trim()).filter(Boolean);
  const error = element();
  context = vm.createContext({ ...Object.fromEntries(names.map(name => [name, element()])),
    crypto: require('crypto').webcrypto, module: { exports: {} },
    getPageEditState: () => clone(state), savePageEdit: save,
    showStatus: jest.fn(), updateIconPreview: jest.fn(), UI_ICONS: { refresh: 'refresh' },
    beginButtonEditContext: jest.fn(), invalidateButtonEditContext: jest.fn(), syncModalState: jest.fn(),
    window: { toast: { setModalOpen: jest.fn() } },
    document: { querySelector: () => null, getElementById: () => error }, error,
  });
  vm.runInContext(source.replace(/^import [\s\S]*?;\n/gm, '').replaceAll('export ', '') +
    '\nmodule.exports = { editButtonSettings, saveButtonSettings };', context);
  editor = context.module.exports;
});
it('saves once against the captured page, preserving identity and unrelated fields', async () => {
  editor.editButtonSettings(button);
  context.editButtonNameInput.value = 'Renamed';
  state.index = 1;
  state.pages = [{ id: 'other-page', name: 'Other', buttons: [] }];
  await editor.saveButtonSettings();
  expect(save).toHaveBeenCalledTimes(1);
  const [pages, captured] = save.mock.calls[0];
  expect(pages[0].id).toBe('page');
  expect(pages[0].buttons[0]).toMatchObject({ id: 'button', name: 'Renamed', color: 'blue' });
  expect(captured.base.session).toBe(7);
  expect(context.buttonEditModal.classList.contains('show')).toBe(false);
});
it('preserves the draft and modal when saving fails', async () => {
  editor.editButtonSettings(button);
  context.editButtonNameInput.value = 'Unsaved';
  save.mockRejectedValueOnce(new Error('Conflicting edit'));
  await editor.saveButtonSettings();
  expect(context.editButtonNameInput.value).toBe('Unsaved');
  expect(context.buttonEditModal.classList.contains('show')).toBe(true);
  expect(context.error.textContent).toBe('Conflicting edit');
});
it('rejects malformed JSON parameters without replacing them with an empty object', async () => {
  button = { ...button, action: 'script', scriptType: 'javascript', script: 'result = params.value' };
  state.pages[0].buttons = state.viewPages[0].buttons = [button];
  editor.editButtonSettings(button);
  context.editButtonScriptParamsInput.value = '{broken';
  await editor.saveButtonSettings();
  expect(save).not.toHaveBeenCalled();
  expect(context.editButtonScriptParamsInput.value).toBe('{broken');
  expect(context.error.textContent).toContain('valid JSON');
});
it('keeps the built-in Confetti action when editing its name', async () => {
  button = { ...button, action: 'script', scriptType: 'special', script: 'confetti' };
  state.pages[0].buttons = state.viewPages[0].buttons = [button];
  editor.editButtonSettings(button);
  context.editButtonNameInput.value = 'Celebrate';
  await editor.saveButtonSettings();
  expect(save.mock.calls[0][0][0].buttons[0]).toMatchObject({ name: 'Celebrate', scriptType: 'special', script: 'confetti' });
});
