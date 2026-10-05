const fs = require('fs');
const path = require('path');
const vm = require('vm');

function launch(readyState, hasBridge = true) {
  const listeners = {};
  const documentEvents = {};
  const api = Object.freeze({ onConfigUpdated: jest.fn() });
  const context = {
    document: {
      readyState,
      addEventListener: (event, callback) => { documentEvents[event] = callback; },
      createElement: () => ({ setAttribute: jest.fn() }),
      body: { replaceChildren: jest.fn() },
    },
    window: {
      toast: hasBridge ? api : undefined,
      addEventListener: (event, callback) => { (listeners[event] ||= []).push(callback); },
    },
    defaultButtons: [], console,
  };
  for (const name of ['closeButton', 'settingsModeToggle', 'settingsButton', 'addPageButton', 'removePageButton', 'userButton']) {
    context[name] = { addEventListener: jest.fn() };
  }
  for (const name of ['initClock', 'setupModalEventListeners', 'setupKeyboardEventListeners', 'setupAuthEventHandlers',
    'initializePages', 'addNewPage', 'removePage', 'toggleSettingsMode', 'showUserProfile']) {
    context[name] = jest.fn();
  }
  const source = fs.readFileSync(path.join(__dirname, '../../../src/renderer/pages/toast/index.js'), 'utf8')
    .replace(/^import [\s\S]*?;\n/gm, '');
  vm.runInNewContext(`'use strict';\n${source}`, context);
  return { context, api, listeners, documentEvents };
}

it('initializes an already parsed document once without mutating the frozen bridge', () => {
  const { context, api, listeners, documentEvents } = launch('interactive');
  expect(context.initClock).toHaveBeenCalledTimes(1);
  expect(api.onConfigUpdated).toHaveBeenCalledTimes(1);
  expect(listeners['config-loaded']).toHaveLength(1);
  expect(documentEvents.DOMContentLoaded).toBeUndefined();
});

it('defers initialization until parsing completes when the document is still loading', () => {
  const { context, documentEvents } = launch('loading');
  expect(context.initClock).not.toHaveBeenCalled();
  documentEvents.DOMContentLoaded();
  expect(context.initClock).toHaveBeenCalledTimes(1);
});

it('reports a missing preload bridge instead of pretending to run default buttons', () => {
  const { context } = launch('interactive', false);
  expect(context.document.body.replaceChildren).toHaveBeenCalledWith(expect.objectContaining({
    textContent: 'Toast could not load its app connection. Restart the app to try again.',
  }));
  expect(context.initializePages).not.toHaveBeenCalled();
  expect(context.initClock).not.toHaveBeenCalled();
});
