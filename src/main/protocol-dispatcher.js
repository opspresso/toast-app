/** Keep startup deep links until the windows and authentication handlers are ready. */
function createProtocolDispatcher() {
  let handler = null;
  const pending = new Set();

  function receive(value) {
    if (typeof value !== 'string' || !value.startsWith('toast-app://')) {
      return false;
    }
    if (handler) {
      handler(value);
    }
    else {
      pending.add(value);
    }
    return true;
  }

  function setHandler(callback) {
    handler = callback;
    const queued = [...pending];
    pending.clear();
    queued.forEach(receive);
  }

  function clear() {
    handler = null;
    pending.clear();
  }

  return { receive, setHandler, clear };
}

module.exports = { createProtocolDispatcher };
