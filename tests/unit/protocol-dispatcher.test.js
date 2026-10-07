const { createProtocolDispatcher } = require('../../src/main/protocol-dispatcher');

it('delivers a macOS callback received before app readiness exactly once', () => {
  const dispatcher = createProtocolDispatcher();
  const url = 'toast-app://auth?code=test-code&state=test-state';
  dispatcher.receive(url);
  dispatcher.receive(url);
  const handler = jest.fn();
  dispatcher.setHandler(handler);
  expect(handler).toHaveBeenCalledTimes(1);
  expect(handler).toHaveBeenCalledWith(url);
});

it('accepts cold-start command-line and later second-instance callbacks', () => {
  const dispatcher = createProtocolDispatcher();
  ['Toast.exe', '--argument', 'toast-app://auth?code=first'].forEach(dispatcher.receive);
  const handler = jest.fn();
  dispatcher.setHandler(handler);
  dispatcher.receive('toast-app://auth?code=second');
  expect(handler.mock.calls).toEqual([['toast-app://auth?code=first'], ['toast-app://auth?code=second']]);
});

it('does not deliver unrelated input and releases queued callbacks on cleanup', () => {
  const dispatcher = createProtocolDispatcher();
  expect(dispatcher.receive(null)).toBe(false);
  expect(dispatcher.receive('https://example.test')).toBe(false);
  dispatcher.receive('toast-app://auth?code=old');
  dispatcher.clear();
  const handler = jest.fn();
  dispatcher.setHandler(handler);
  expect(handler).not.toHaveBeenCalled();
});
