/** Cloud sync controls reflect the main process status and permissions. */
const state = { auth: null, logger: null, status: null, busy: false, initialized: false };
const dom = {};

function initElements() {
  for (const id of ['sync-status-badge', 'sync-status-text', 'last-synced-time', 'sync-device-info',
    'enable-cloud-sync', 'manual-sync-upload', 'manual-sync-download', 'manual-sync-resolve', 'sync-loading']) {
    dom[id] = document.getElementById(id);
  }
}

function render() {
  if (!dom['sync-status-text']) {
    return;
  }
  const status = state.status;
  const permitted = !!state.auth?.isLoggedIn && status?.hasPermission === true;
  const busy = state.busy || !!status?.isSyncing;
  const enabled = status?.enabled === true;
  const badge = dom['sync-status-badge'];
  badge.className = enabled && permitted ? 'badge premium' : 'badge secondary';
  badge.textContent = status?.error ? '!' : busy ? '↻' : enabled && permitted ? '✓' : '⏹';
  const message = !state.auth?.isLoggedIn ? 'Sign in to use Cloud Sync'
    : busy ? 'Synchronizing…'
      : status?.error || (!permitted ? 'Cloud Sync is not available for this account'
        : enabled ? 'Cloud Sync Enabled' : 'Cloud Sync Disabled');
  dom['sync-status-text'].textContent = message;
  dom['sync-status-text'].setAttribute('role', status?.error ? 'alert' : 'status');
  dom['last-synced-time'].textContent = status?.lastSyncTime
    ? `Last Synced: ${new Date(status.lastSyncTime).toLocaleString()}` : 'Not synced yet';
  dom['sync-device-info'].textContent = `Current Device: ${status?.deviceId || '-'}`;
  dom['enable-cloud-sync'].checked = enabled;
  // Disabling an in-flight sync remains available.
  dom['enable-cloud-sync'].disabled = !permitted || state.busy;
  for (const action of ['upload', 'download', 'resolve']) {
    dom[`manual-sync-${action}`].disabled = !permitted || !enabled || busy;
  }
  dom['manual-sync-resolve'].textContent = 'Sync Now';
  dom['sync-loading'].classList.toggle('hidden', !busy);
}

function showError(error) {
  state.logger?.error('Cloud synchronization:', error.message);
  state.status = { ...state.status, error: error.message };
  render();
}

async function refresh() {
  try {
    updateSyncStatusUI(await window.settings.getSyncStatus(), state.auth, state.logger);
  }
  catch (error) {
    showError(error);
  }
}

async function toggle() {
  const enabled = dom['enable-cloud-sync'].checked;
  state.busy = true;
  render();
  try {
    const result = await window.settings.setCloudSyncEnabled(enabled);
    if (!result.success) {
      throw new Error(result.error || 'Could not change cloud sync preference');
    }
    state.status = result.status;
  }
  catch (error) {
    showError(error);
  }
  finally {
    state.busy = false;
    render();
  }
}

async function sync(action) {
  if (action === 'upload' && !confirm('Replace cloud settings with this device’s buttons and snippets? Other devices will receive this copy.')) {
    return;
  }
  if (action === 'download' && !confirm('Replace this device’s settings with the cloud copy? Local edits will be overwritten.')) {
    return;
  }
  state.busy = true;
  render();
  try {
    const result = await window.settings.manualSync(action);
    if (!result.success) {
      throw new Error(result.error || 'Cloud synchronization failed');
    }
    await refresh();
  }
  catch (error) {
    showError(error);
  }
  finally {
    state.busy = false;
    render();
  }
}

function initializeCloudSyncUI(_config, authState, logger) {
  initElements();
  state.auth = authState;
  state.logger = logger;
  if (!state.initialized) {
    dom['enable-cloud-sync'].addEventListener('change', toggle);
    for (const action of ['upload', 'download', 'resolve']) {
      dom[`manual-sync-${action}`].addEventListener('click', () => {
        void sync(action);
      });
    }
    window.addEventListener('cloud-sync-status', event => {
      updateSyncStatusUI(event.detail, state.auth, state.logger);
    });
    state.initialized = true;
  }
  void refresh();
}

function updateSyncStatusUI(status, authState, logger) {
  initElements();
  state.status = status;
  state.auth = authState;
  state.logger = logger;
  render();
}

function disableCloudSyncUI(logger) {
  state.logger = logger;
  state.status = { ...state.status, hasPermission: false, isSyncing: false };
  render();
}

export { initializeCloudSyncUI, updateSyncStatusUI, disableCloudSyncUI };
