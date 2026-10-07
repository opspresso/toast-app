const fs = require('fs');
const path = require('path');
const vm = require('vm');
const clone = value => JSON.parse(JSON.stringify(value));
const button = { id: 'button', name: 'Original', shortcut: 'Q', action: 'open', url: 'https://example.test' };
const initial = [{ id: 'page', name: 'Page', buttons: [button] }];
let context;
let api;
let pagesModule;
function element() {
  return { value: '', children: [], dataset: {}, classList: { toggle() {} }, appendChild(node) { this.children.push(node); }, addEventListener() {} };
}
beforeEach(() => {
  api = jest.fn(async (pages, base) => ({ success: true, pages, session: base.session }));
  context = vm.createContext({ module: { exports: {} },
    window: { toast: { savePages: api } }, crypto: require('crypto').webcrypto,
    document: { createElement: element }, pagingButtonsContainer: element(),
    invalidateButtonEditContext: jest.fn(),
    showStatus: jest.fn(), userProfile: { is_authenticated: true }, userSubscription: { features: { page_groups: 9 } },
    normalizePageButtons: buttons => [...buttons, { name: '', shortcut: 'W', action: 'application' }],
    reassignButtonShortcuts: buttons => buttons, defaultButtons: [], emptyButtons: [],
    loadButtons: async () => ({ showCurrentPageButtons() {}, isSettingsMode: true }),
    loadModals: async () => ({ showConfirmModal: async () => true }),
  });
  const source = fs.readFileSync(path.join(__dirname, '../../../src/renderer/pages/toast/modules/pages.js'), 'utf8')
    .replace(/^import [\s\S]*?;\n/gm, '').replaceAll('export ', '')
    .replaceAll("import('./buttons.js')", 'loadButtons()').replaceAll("import('./modals.js')", 'loadModals()');
  vm.runInContext(source + '\nmodule.exports = { initializePages, getPageEditState, savePageEdit, removePage, changePage };', context);
  pagesModule = context.module.exports;
  pagesModule.initializePages(initial, 4);
});
it('sends the unpadded main-process baseline separately from display slots', async () => {
  const edit = pagesModule.getPageEditState();
  expect(edit.pages[0].buttons).toHaveLength(1);
  expect(edit.viewPages[0].buttons).toHaveLength(2);
  const next = clone(edit.pages);
  next[0].name = 'Edited';
  await pagesModule.savePageEdit(next, edit);
  expect(api).toHaveBeenCalledTimes(1);
  expect(api.mock.calls[0][1]).toEqual({ pages: initial, session: 4 });
});
it('does not update the displayed baseline when persistence fails', async () => {
  api.mockResolvedValueOnce({ success: false, error: 'Conflict' });
  const edit = pagesModule.getPageEditState();
  const next = clone(edit.pages); next[0].name = 'Draft';
  await expect(pagesModule.savePageEdit(next, edit)).rejects.toThrow('Conflict');
  expect(pagesModule.getPageEditState().pages).toEqual(initial);
});
it('does not replace a newer cloud broadcast with an old save response', async () => {
  let finish;
  api.mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
  const edit = pagesModule.getPageEditState();
  const saving = pagesModule.savePageEdit(edit.pages, edit);
  const remote = [{ ...initial[0], name: 'New remote state' }];
  pagesModule.initializePages(remote, 4);
  finish({ success: true, pages: initial, session: 4 });
  await saving;
  expect(pagesModule.getPageEditState().pages).toEqual(remote);
});
it('deletes the originally selected page even if navigation changes during confirmation', async () => {
  const two = [...initial, { id: 'other', name: 'Other', buttons: [] }];
  pagesModule.initializePages(two, 4);
  let answer;
  context.loadModals = async () => ({ showConfirmModal: () => new Promise(resolve => { answer = resolve; }) });
  const deleting = pagesModule.removePage();
  await new Promise(resolve => setImmediate(resolve));
  pagesModule.changePage(1);
  answer(true);
  await deleting;
  expect(api.mock.calls[0][0].map(page => page.id)).toEqual(['other']);
  expect(api.mock.calls[0][1].pages).toEqual(two);
});
