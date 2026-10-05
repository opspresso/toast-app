const fs = require('fs');
const vm = require('vm');
const path = require('path');
const { changeSnippet } = require('../../../src/main/snippets');
const clone = value => JSON.parse(JSON.stringify(value));
const flush = () => new Promise(resolve => setImmediate(resolve));

function element() {
  return {
    children: [], value: '', disabled: false,
    set innerHTML(_value) { this.children = []; },
    appendChild(child) { this.children.push(child); },
    classList: { add() {}, remove() {}, toggle() {} },
    addEventListener(name, callback) { this[name] = callback; },
    scrollIntoView() {}, focus() {},
  };
}
let context;
let ui;
let current;
let bridge;

beforeEach(() => {
  current = [{ keyword: ':one', content: 'first' }, { keyword: ':two', content: 'second' }];
  bridge = jest.fn(async change => {
    const result = changeSnippet(current, clone(change));
    if (result.success) current = result.snippets;
    return result;
  });
  const source = fs.readFileSync(path.join(__dirname, '../../../src/renderer/pages/settings/modules/snippets-settings.js'), 'utf8');
  const names = source.match(/import \{([\s\S]*?)\} from '\.\/dom-elements.js';/)[1].split(',').map(name => name.trim()).filter(Boolean);
  context = vm.createContext({
    ...Object.fromEntries(names.map(name => [name, element()])),
    config: { snippets: clone(current) }, authState: { profile: { email: 'one@example.test' } },
    updateConfig(value) { context.config = value; },
    window: { settings: { log: { info() {}, error() {} }, textExpander: { changeSnippet: bridge, getStatus: async () => ({ supported: false }) } } },
    document: { createElement: element }, module: { exports: {} },
  });
  vm.runInContext(source.replace(/^import [\s\S]*?;\n/gm, '').replaceAll('export function', 'function') +
    '\nmodule.exports = { initializeSnippetsSettings, setupSnippetsEventListeners };', context);
  ui = context.module.exports;
  ui.initializeSnippetsSettings();
  ui.setupSnippetsEventListeners();
});

it('updates an ID-less snippet instead of adding another entry', async () => {
  context.snippetsList.children[0].children[2].click();
  context.snippetContentInput.value = 'edited';
  await context.snippetAddButton.click();
  expect(current).toHaveLength(2);
  expect(current[0]).toMatchObject({ keyword: ':one', content: 'edited', id: expect.any(String) });
  expect(bridge.mock.calls[0][0].type).toBe('update');
});

it('preserves the form on a stale cloud edit and leaves cloud data unchanged', async () => {
  context.snippetsList.children[0].children[2].click();
  context.snippetContentInput.value = 'local draft';
  current[0] = { ...current[0], content: 'remote edit' };
  context.config = { snippets: clone(current) };
  ui.initializeSnippetsSettings();
  await context.snippetAddButton.click();
  expect(context.snippetContentInput.value).toBe('local draft');
  expect(context.snippetFormError.textContent).toContain('changed or was deleted');
  expect(current[0].content).toBe('remote edit');
});

it('preserves an unsaved draft after a persistence failure', async () => {
  bridge.mockResolvedValueOnce({ success: false, error: 'Disk full' });
  context.snippetKeywordInput.value = ':new';
  context.snippetContentInput.value = 'draft';
  await context.snippetAddButton.click();
  expect(context.snippetContentInput.value).toBe('draft');
  expect(context.snippetFormError.textContent).toBe('Disk full');
  expect(current).toHaveLength(2);
});

it('prevents edits while saving and does not replace a newer config broadcast with an older reply', async () => {
  let resolve;
  bridge.mockImplementationOnce(() => new Promise(done => { resolve = done; }));
  context.snippetKeywordInput.value = ':new';
  context.snippetContentInput.value = 'draft';
  const save = context.snippetAddButton.click();
  expect(context.snippetContentInput.disabled).toBe(true);
  context.config = { snippets: [{ keyword: ':latest', content: 'cloud' }] };
  ui.initializeSnippetsSettings();
  resolve({ success: true, snippets: [{ keyword: ':old', content: 'old response' }] });
  await save;
  expect(context.config.snippets[0].keyword).toBe(':latest');
  expect(context.snippetContentInput.disabled).toBe(false);
});

it('does not apply an open edit to a different account', async () => {
  context.snippetsList.children[0].children[2].click();
  context.snippetContentInput.value = 'draft';
  context.authState.profile = { email: 'two@example.test' };
  await context.snippetAddButton.click();
  expect(bridge).not.toHaveBeenCalled();
  expect(context.snippetFormError.textContent).toContain('account changed');
  await flush();
});
