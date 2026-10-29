const fs = require('fs');
const path = require('path');
const vm = require('vm');

const source = fs
  .readFileSync(path.join(__dirname, '../../../src/renderer/pages/toast/modules/keyboard.js'), 'utf8')
  .replace(/^import [\s\S]*?;\n/gm, '')
  .replaceAll('export ', '');

function load({ isSettingsMode = false, hideOnEscape = true } = {}) {
  const context = vm.createContext({
    document: { addEventListener() {} },
    window: { addEventListener() {}, toast: { getConfig: jest.fn(async () => hideOnEscape), hideWindow: jest.fn(), showSettings: jest.fn() } },
    isAnyModalOpen: () => false,
    filteredButtons: [{ name: 'Copy runner', shortcut: 'C' }],
    selectedButtonIndex: 0,
    isSettingsMode,
    pages: [{}, {}],
    navigateButtons: jest.fn(),
    executeButton: jest.fn(),
    toggleSettingsMode: jest.fn(),
    changePage: jest.fn(),
    addNewPage: jest.fn(),
    removePage: jest.fn(),
  });
  vm.runInContext(source, context);
  return context;
}

function keydown(context, key, code, modifiers = {}) {
  const event = { key, code, metaKey: false, ctrlKey: false, altKey: false, shiftKey: false, defaultPrevented: false, ...modifiers };
  event.preventDefault = () => {
    event.defaultPrevented = true;
  };
  context.handleKeyDown(event);
  return event;
}

describe('popup keyboard shortcuts', () => {
  it('runs a button from its single-key shortcut', () => {
    const context = load();
    keydown(context, 'c', 'KeyC');
    expect(context.executeButton).toHaveBeenCalledWith(context.filteredButtons[0]);
  });

  it.each([['metaKey'], ['ctrlKey'], ['altKey']])('ignores button shortcuts combined with %s', modifier => {
    const context = load();
    const event = keydown(context, 'c', 'KeyC', { [modifier]: true });
    expect(context.executeButton).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(false);
  });

  it('does not add or remove pages for zoom shortcuts', () => {
    const context = load({ isSettingsMode: true });
    keydown(context, '=', 'Equal', { metaKey: true });
    keydown(context, '-', 'Minus', { ctrlKey: true });
    expect(context.addNewPage).not.toHaveBeenCalled();
    expect(context.removePage).not.toHaveBeenCalled();
  });

  it('still opens Settings with Cmd+,', () => {
    const context = load();
    keydown(context, ',', 'Comma', { metaKey: true });
    expect(context.window.toast.showSettings).toHaveBeenCalled();
    expect(context.toggleSettingsMode).not.toHaveBeenCalled();
  });

  it('exits edit mode on Escape without hiding the popup', async () => {
    const context = load({ isSettingsMode: true });
    keydown(context, 'Escape', 'Escape');
    await Promise.resolve();
    expect(context.toggleSettingsMode).toHaveBeenCalledTimes(1);
    expect(context.window.toast.hideWindow).not.toHaveBeenCalled();
  });

  it('hides the popup on Escape in normal mode', async () => {
    const context = load();
    keydown(context, 'Escape', 'Escape');
    await new Promise(setImmediate);
    expect(context.window.toast.hideWindow).toHaveBeenCalledTimes(1);
  });
});
