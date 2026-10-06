const fs = require('fs');
const path = require('path');
const vm = require('vm');
const directory = path.join(__dirname, '../../../src/renderer/pages/toast/modules');
function element(id = '') {
  const classes = new Set();
  const events = new Map();
  return {
    id,
    value: '',
    textContent: '',
    innerHTML: '',
    style: {},
    disabled: false,
    checked: false,
    classList: {
      add: key => classes.add(key),
      remove: key => classes.delete(key),
      contains: key => classes.has(key),
      toggle: (key, yes) => (yes ? classes.add(key) : classes.delete(key)),
    },
    addEventListener(type, fn) {
      if (!events.has(type)) events.set(type, new Set());
      events.get(type).add(fn);
    },
    removeEventListener(type, fn) {
      events.get(type)?.delete(fn);
    },
    async fire(type, data = {}) {
      const event = {
        target: this,
        defaultPrevented: false,
        ...data,
        preventDefault() {
          this.defaultPrevented = true;
        },
        stopPropagation() {},
        stopImmediatePropagation() {
          this.stopped = true;
        },
      };
      for (const fn of [...(events.get(type) || [])]) {
        await fn(event);
        if (event.stopped) break;
      }
    },
    dispatchEvent(event) {
      for (const fn of [...(events.get(event.type) || [])]) fn(event);
    },
    count: type => events.get(type)?.size || 0,
    removeAttribute(name) {
      delete this[name];
    },
    setAttribute(name, value) {
      this[name] = value;
    },
    focus: jest.fn(),
    appendChild() {},
    querySelectorAll: () => [],
    querySelector: () => null,
    tabIndex: 0,
    getClientRects: () => [{}],
    contains(target) {
      return this === target;
    },
  };
}
function deferred() {
  let resolve;
  const promise = new Promise(done => {
    resolve = done;
  });
  return { promise, resolve };
}
let context;
let dom;
let buttons;
let api;
function load(name) {
  const source = fs
    .readFileSync(path.join(directory, name), 'utf8')
    .replace(/^import [\s\S]*?;\n/gm, '')
    .replace(/export \{[^}]+\};/g, '')
    .replaceAll('export ', '');
  vm.runInContext(source, context);
}
beforeEach(() => {
  jest.useFakeTimers();
  dom = new Map();
  const get = id => {
    if (!dom.has(id)) dom.set(id, element(id));
    return dom.get(id);
  };
  const names = {};
  const source = fs.readFileSync(path.join(directory, 'dom-elements.js'), 'utf8');
  for (const match of source.matchAll(/export const (\w+) = document.getElementById\('([^']+)'\)/g)) names[match[1]] = get(match[2]);
  const document = element('document');
  document.getElementById = get;
  document.querySelector = selector =>
    selector === '.modal.show' ? [...dom.values()].find(node => node.id.endsWith('-modal') && node.classList.contains('show')) || null : null;
  document.querySelectorAll = () => [];
  names.iconPreview.querySelector = () => get('placeholder');
  names.confirmModal.querySelectorAll = () => [names.confirmCancelButton, names.confirmOkButton];
  names.confirmModal.contains = node => [names.confirmModal, names.confirmCancelButton, names.confirmOkButton].includes(node);
  for (const node of dom.values())
    node.focus.mockImplementation(() => {
      document.activeElement = node;
    });
  api = {
    setModalOpen: jest.fn(),
    platform: 'darwin',
    extractAppIcon: jest.fn(),
    showOpenDialog: jest.fn(),
    resolveTildePath: jest.fn(),
    getConfig: jest.fn(),
    hideWindow: jest.fn(),
  };
  buttons = [
    { id: 'a', name: 'A', icon: 'A', action: 'application', applicationPath: '/Applications/A.app', shortcut: 'Q' },
    { id: 'b', name: 'B', icon: 'B', action: 'application', applicationPath: '/Applications/B.app', shortcut: 'W' },
  ];
  const page = { id: 'page', name: 'Page', buttons };
  context = vm.createContext({
    ...names,
    document,
    window: { toast: api, IconsCatalog: {}, addEventListener() {} },
    UI_ICONS: { refresh: 'refresh', image: 'image' },
    showStatus: jest.fn(),
    console: { error: jest.fn(), warn: jest.fn() },
    hideProfileModal: jest.fn(),
    handleLogout: jest.fn(),
    getFaviconFromUrl: url => `${url}/favicon.ico`,
    getPageEditState: () => JSON.parse(JSON.stringify({ pages: [page], viewPages: [page], index: 0, base: { pages: [page], session: 1 } })),
    savePageEdit: jest.fn(async () => ({ success: true })),
    crypto: require('crypto').webcrypto,
    Event: class {
      constructor(type) {
        this.type = type;
      }
    },
    setTimeout,
    clearTimeout,
    filteredButtons: buttons,
    selectedButtonIndex: 0,
    isSettingsMode: true,
    pages: [page],
    navigateButtons: jest.fn(),
    executeButton: jest.fn(),
    toggleSettingsMode: jest.fn(),
    changePage: jest.fn(),
    addNewPage: jest.fn(),
    removePage: jest.fn(),
  });
  for (const file of ['modal-state.js', 'local-icon-utils.js', 'modals-icon-browser.js', 'modals-button-edit.js', 'modals.js', 'keyboard.js']) load(file);
  context.setupModalEventListeners();
  context.setupKeyboardEventListeners();
});
afterEach(() => jest.useRealTimers());
const response = { success: true, remoteUrl: 'https://example.test/a.png', iconUrl: 'file:///tmp/a.png', iconPath: '/tmp/a.png', appName: 'Automatic A' };

it('discards icon results after another button opens', async () => {
  context.editButtonSettings(buttons[0]);
  context.editButtonIconInput.value = '';
  const job = deferred();
  api.extractAppIcon.mockReturnValueOnce(job.promise);
  const result = context.updateButtonIconFromLocalApp('/Applications/A.app', context.editButtonIconInput, context.editButtonNameInput);
  context.closeButtonEditModal();
  context.editButtonSettings(buttons[1]);
  context.editButtonIconInput.value = 'B draft';
  context.editButtonNameInput.value = 'B name';
  job.resolve(response);
  expect(await result).toBeNull();
  expect(context.editButtonIconInput.value).toBe('B draft');
  expect(context.editButtonNameInput.value).toBe('B name');
});
it.each(['manual icon', 'changed application', 'account changed'])('does not overwrite %s during extraction', async reason => {
  context.editButtonSettings(buttons[0]);
  context.editButtonIconInput.value = '';
  const job = deferred();
  api.extractAppIcon.mockReturnValueOnce(job.promise);
  const result = context.updateButtonIconFromLocalApp('/Applications/A.app', context.editButtonIconInput, context.editButtonNameInput);
  if (reason === 'manual icon') context.editButtonIconInput.value = '⭐';
  else if (reason === 'changed application') context.editButtonApplicationInput.value = '/Applications/B.app';
  else context.invalidateButtonEditContext();
  job.resolve(response);
  expect(await result).toBeNull();
  expect(context.editButtonIconInput.value).not.toBe(response.remoteUrl);
});
it('preserves a manually cleared name while still accepting an unchanged icon request', async () => {
  context.editButtonSettings(buttons[0]);
  context.editButtonIconInput.value = '';
  const job = deferred();
  api.extractAppIcon.mockReturnValueOnce(job.promise);
  const result = context.updateButtonIconFromLocalApp('/Applications/A.app', context.editButtonIconInput, context.editButtonNameInput);
  context.editButtonNameInput.value = '';
  job.resolve(response);
  expect(await result).toBe(true);
  expect(context.editButtonNameInput.value).toBe('');
});
it('does not let an old file dialog select a path in another button', async () => {
  context.editButtonSettings(buttons[0]);
  const job = deferred();
  api.showOpenDialog.mockReturnValueOnce(job.promise);
  const picked = context.browseApplicationButton.fire('click');
  context.closeButtonEditModal();
  context.editButtonSettings(buttons[1]);
  job.resolve({ canceled: false, filePaths: ['/Applications/Old.app'] });
  await picked;
  expect(context.editButtonApplicationInput.value).toBe('/Applications/B.app');
});
it('ignores a late tilde resolution after a new preview is selected', async () => {
  context.editButtonSettings(buttons[0]);
  context.editButtonIconInput.value = 'file://~/a.png';
  const job = deferred();
  api.resolveTildePath.mockReturnValueOnce(job.promise);
  const preview = context.updateIconPreview();
  context.editButtonIconInput.value = 'https://example.test/b.png';
  await context.updateIconPreview();
  job.resolve('/Users/test/a.png');
  await preview;
  expect(dom.get('icon-preview-img').src).toBe('https://example.test/b.png');
});
it('settles Escape as cancellation and does not run launcher shortcuts underneath a confirmation', async () => {
  const old = context.showConfirmModal('Delete A');
  await context.document.fire('keydown', { key: '1', code: 'Digit1' });
  await context.document.fire('keydown', { key: 'Enter', code: 'Enter' });
  expect(context.changePage).not.toHaveBeenCalled();
  expect(context.executeButton).not.toHaveBeenCalled();
  await context.document.fire('keydown', { key: 'Escape', code: 'Escape' });
  expect(await old).toBe(false);
  expect(context.toggleSettingsMode).not.toHaveBeenCalled();
  expect(context.confirmOkButton.count('click')).toBe(0);
  const current = context.showConfirmModal('Delete B');
  await context.confirmOkButton.fire('click');
  expect(await current).toBe(true);
});
it('cancels a replaced confirmation and keeps parent modal protection', async () => {
  context.editButtonSettings(buttons[0]);
  context.iconSearchModal.classList.add('show');
  context.closeIconSearchModal();
  expect(api.setModalOpen).toHaveBeenLastCalledWith(true);
  const first = context.showConfirmModal('First');
  const second = context.showConfirmModal('Second');
  expect(await first).toBe(false);
  context.closeConfirmModal();
  expect(await second).toBe(false);
  expect(api.setModalOpen).toHaveBeenLastCalledWith(true);
});

it('keeps Tab and Shift+Tab inside the confirmation controls', async () => {
  const result = context.showConfirmModal('Confirm');
  expect(context.document.activeElement).toBe(context.confirmCancelButton);
  context.confirmOkButton.focus();
  await context.document.fire('keydown', { key: 'Tab', code: 'Tab', target: context.confirmOkButton });
  expect(context.document.activeElement).toBe(context.confirmCancelButton);
  await context.document.fire('keydown', { key: 'Tab', code: 'Tab', shiftKey: true, target: context.confirmCancelButton });
  expect(context.document.activeElement).toBe(context.confirmOkButton);
  context.closeConfirmModal();
  expect(await result).toBe(false);
});
