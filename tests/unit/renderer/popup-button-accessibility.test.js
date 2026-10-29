const fs = require('fs');
const path = require('path');
const vm = require('vm');

const source = fs
  .readFileSync(path.join(__dirname, '../../../src/renderer/pages/toast/modules/buttons.js'), 'utf8')
  .replace(/^import [\s\S]*?;\n/gm, '')
  .replaceAll('export ', '');

function fakeElement() {
  const attributes = {};
  return {
    attributes,
    dataset: {},
    style: {},
    textContent: '',
    setAttribute(name, value) {
      attributes[name] = String(value);
    },
    appendChild() {},
  };
}

function createButton(button) {
  const parts = { '.button-name': fakeElement(), '.button-icon': fakeElement(), '.button-shortcut': fakeElement() };
  const root = { ...fakeElement(), querySelector: selector => parts[selector] };
  const context = vm.createContext({
    buttonTemplate: { content: { cloneNode: () => ({ querySelector: () => root }) } },
    window: {},
    isURL: () => false,
    document: { createElement: fakeElement },
  });
  vm.runInContext(source, context);
  return context.createButtonElement(button);
}

describe('popup button accessibility', () => {
  it('names each button and exposes its single-key shortcut', () => {
    const element = createButton({ name: 'Copy runner', shortcut: 'C', action: 'exec', icon: '⚡' });
    expect(element.attributes['aria-label']).toBe('Copy runner');
    expect(element.attributes['aria-keyshortcuts']).toBe('C');
  });

  it('omits the shortcut attribute when the button has no shortcut', () => {
    const element = createButton({ name: 'Docs', action: 'open', icon: '🌐' });
    expect(element.attributes['aria-label']).toBe('Docs');
    expect(element.attributes).not.toHaveProperty('aria-keyshortcuts');
  });

});
