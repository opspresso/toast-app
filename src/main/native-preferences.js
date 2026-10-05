/** Apply stored preferences to Electron. Remember only successfully applied values. */
const { app } = require('electron');
const { positionToastWindow } = require('./shortcuts');
const applied = new WeakMap();

function getToastSize(size) {
  const sizes = { small: [500, 350], medium: [700, 500], large: [800, 550] };
  return sizes[Object.hasOwn(sizes, size) ? size : 'medium'];
}

function applyNativePreferences(config, windows) {
  let state = applied.get(config);
  if (!state) {
    state = {};
    applied.set(config, state);
  }
  const launchAtLogin = config.get('advanced.launchAtLogin') === true;
  if (state.launchAtLogin !== launchAtLogin) {
    app.setLoginItemSettings({ openAtLogin: launchAtLogin });
    state.launchAtLogin = launchAtLogin;
  }

  const window = windows.toast;
  if (!window || window.isDestroyed()) {
    return;
  }
  if (state.window !== window) {
    state.window = window;
    state.values = {};
  }
  const previous = state.values;
  const opacity = config.get('appearance.opacity') ?? 0.95;
  const size = config.get('appearance.size') || 'medium';
  const position = config.get('appearance.position') || 'center';
  const showInTaskbar = config.get('advanced.showInTaskbar') === true;
  const sizeChanged = previous.size !== size;
  const presetChanged = previous.position !== undefined && previous.position !== position;

  if (previous.opacity !== opacity) {
    window.setOpacity(opacity);
    previous.opacity = opacity;
  }
  if (sizeChanged) {
    const [width, height] = getToastSize(size);
    const bounds = window.getBounds();
    if (bounds.width !== width || bounds.height !== height) {
      window.setSize(width, height);
    }
    previous.size = size;
  }
  if (previous.showInTaskbar !== showInTaskbar) {
    window.setSkipTaskbar(!showInTaskbar);
    previous.showInTaskbar = showInTaskbar;
  }
  const layout = `${size}:${position}`;
  if (previous.layout !== layout) {
    // A newly selected preset must take effect even after the user dragged the
    // popup. Its resulting moved event updates the current monitor's saved point.
    positionToastWindow(window, config, { useSavedPosition: !presetChanged });
    previous.position = position;
    previous.layout = layout;
  }
}

module.exports = { applyNativePreferences, getToastSize };
