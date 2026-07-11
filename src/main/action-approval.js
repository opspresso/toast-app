/**
 * Toast - Action Approval
 *
 * Guards exec/script actions that arrive via cloud sync. Actions created or
 * edited locally are trusted; risky actions first seen in remote data are put
 * on a pending list and require a one-time user confirmation before they run.
 *
 * Only fingerprints on the pending list ever trigger a dialog — actions that
 * are neither trusted nor pending run as before, so ad-hoc executions and
 * pre-existing configurations are unaffected.
 */

const crypto = require('crypto');
const path = require('path');
const { createLogger } = require('./logger');

const logger = createLogger('ActionApproval');

const MAX_TRUSTED_ACTIONS = 1000;
const PREVIEW_LENGTH = 200;

/**
 * Directories Windows installers place executables under. A .exe launched
 * from one of these is the Windows equivalent of a macOS .app bundle — it
 * came from a normal install, not a script dropped in an arbitrary location.
 * @returns {string[]} Existing trusted install directories
 */
function getWindowsTrustedInstallDirs() {
  return [
    process.env.ProgramFiles,
    process.env['ProgramFiles(x86)'],
    process.env.LOCALAPPDATA && path.win32.join(process.env.LOCALAPPDATA, 'Programs'),
    process.env.WINDIR,
  ].filter(Boolean);
}

/**
 * Whether a parameterless application launch targets something that looks
 * like a normal installed app rather than an arbitrary script or executable.
 * macOS: an actual .app bundle. Windows: a .exe under a standard install
 * directory (Program Files, per-user Programs, or the Windows directory).
 * Other platforms have no equivalent convention, so nothing qualifies.
 * @param {string} applicationPath - Application path to check
 * @returns {boolean} Whether the launch stays gate-free without parameters
 */
function isTrustedAppLaunch(applicationPath) {
  if (process.platform === 'darwin') {
    return /\.app\/?$/i.test(applicationPath);
  }

  if (process.platform === 'win32') {
    if (!/\.exe$/i.test(applicationPath)) {
      return false;
    }
    // Use path.win32 explicitly rather than the platform-dependent path module,
    // since this branch must parse Windows-style paths correctly even when
    // Toast itself is (hypothetically) running on a non-Windows host.
    const normalizedPath = path.win32.normalize(applicationPath).toLowerCase();
    return getWindowsTrustedInstallDirs().some(dir => {
      const normalizedDir = path.win32.normalize(dir).toLowerCase();
      return normalizedPath === normalizedDir || normalizedPath.startsWith(`${normalizedDir}${path.win32.sep}`);
    });
  }

  return false;
}

// Set via initializeApprovals(); ensureApproved falls back to allow when unset
const state = {
  configStore: null,
  windows: null,
  inFlight: new Map(),
};

/**
 * Compute a stable fingerprint for a risky action.
 * Only fields that affect execution are hashed, so renaming a button or
 * changing its icon does not require re-approval.
 * @param {Object} action - Action (or button) object
 * @returns {string|null} sha256 hex fingerprint, or null for non-risky actions
 */
function computeFingerprint(action) {
  if (!action || typeof action !== 'object') {
    return null;
  }

  let canonical;
  if (action.action === 'exec') {
    canonical = {
      action: 'exec',
      command: action.command || '',
      workingDir: action.workingDir || '',
      runInTerminal: !!action.runInTerminal,
    };
  }
  else if (action.action === 'script') {
    canonical = {
      action: 'script',
      script: action.script || '',
      scriptType: action.scriptType || '',
      scriptParams: action.scriptParams || '',
    };
  }
  else if (action.action === 'application') {
    const applicationPath = action.applicationPath || '';
    if (!applicationPath) {
      // Empty slot placeholder; nothing to execute.
      return null;
    }

    // A plain launch of a trusted installed app stays gate-free to avoid
    // prompting on every synced button. Launch parameters are
    // attacker-controllable capability regardless of target, and a path that
    // doesn't look like a normal installed app (e.g. a script or arbitrary
    // executable) is gated even without parameters, since it isn't a normal
    // "open this app" button.
    if (!action.applicationParameters && isTrustedAppLaunch(applicationPath)) {
      return null;
    }

    canonical = {
      action: 'application',
      applicationPath,
      applicationParameters: action.applicationParameters || '',
    };
  }
  else {
    return null;
  }

  return crypto.createHash('sha256').update(JSON.stringify(canonical)).digest('hex');
}

// Upper bound on chain nesting depth when walking actions, matching
// executor.js's validateAction. Guards local (not-yet-sanitized) config data
// against a pathologically/self nested chain exhausting the call stack.
const MAX_CHAIN_DEPTH = 10;

/**
 * Collect fingerprints of all risky actions in the given pages,
 * including actions nested inside chain actions.
 * @param {Array} pages - Pages array (each page has a buttons array)
 * @returns {Map<string, Object>} fingerprint -> action object
 */
function collectRiskyFingerprints(pages) {
  const found = new Map();

  const visit = (action, depth = 0) => {
    if (!action || typeof action !== 'object' || depth > MAX_CHAIN_DEPTH) {
      return;
    }
    const fingerprint = computeFingerprint(action);
    if (fingerprint) {
      found.set(fingerprint, action);
    }
    if (action.action === 'chain' && Array.isArray(action.actions)) {
      action.actions.forEach(sub => visit(sub, depth + 1));
    }
  };

  if (Array.isArray(pages)) {
    for (const page of pages) {
      if (page && Array.isArray(page.buttons)) {
        page.buttons.forEach(visit);
      }
    }
  }

  return found;
}

function getSecurity(configStore) {
  const security = configStore.get('security') || {};
  return {
    approvalsInitialized: !!security.approvalsInitialized,
    trustedActions: Array.isArray(security.trustedActions) ? security.trustedActions : [],
    pendingApprovals: Array.isArray(security.pendingApprovals) ? security.pendingApprovals : [],
  };
}

function setSecurity(configStore, security) {
  configStore.set('security', security);
}

function addTrusted(security, fingerprints) {
  const trusted = new Set(security.trustedActions);
  for (const fingerprint of fingerprints) {
    trusted.add(fingerprint);
  }
  let trustedList = [...trusted];
  if (trustedList.length > MAX_TRUSTED_ACTIONS) {
    trustedList = trustedList.slice(trustedList.length - MAX_TRUSTED_ACTIONS);
  }
  return { ...security, trustedActions: trustedList };
}

/**
 * Initialize the approval module. On first run, seeds the trusted list with
 * every risky action already present in the local configuration so existing
 * users are never re-prompted for their own actions.
 * @param {Object} configStore - electron-store instance
 * @param {Object} [windows] - Window references ({ toast, settings }) used as dialog parent
 */
function initializeApprovals(configStore, windows) {
  state.configStore = configStore;
  state.windows = windows || null;

  const security = getSecurity(configStore);
  if (security.approvalsInitialized) {
    return;
  }

  const current = collectRiskyFingerprints(configStore.get('pages'));
  const seeded = addTrusted(security, current.keys());
  setSecurity(configStore, { ...seeded, approvalsInitialized: true });
  logger.info(`Action approvals initialized: ${current.size} existing risky action(s) trusted`);
}

/**
 * Record risky actions arriving from remote sync data. New (untrusted)
 * fingerprints are queued for user approval; pending entries whose actions
 * no longer exist in the incoming data are removed.
 * Call this right before persisting remote pages to the config store.
 * @param {Object} configStore - electron-store instance
 * @param {Array} incomingPages - Pages downloaded from the server
 */
function recordRemoteChanges(configStore, incomingPages) {
  const security = getSecurity(configStore);
  const incoming = collectRiskyFingerprints(incomingPages);
  const trusted = new Set(security.trustedActions);

  const pending = security.pendingApprovals.filter(entry => incoming.has(entry.fingerprint));
  const pendingSet = new Set(pending.map(entry => entry.fingerprint));

  for (const [fingerprint, action] of incoming) {
    if (!trusted.has(fingerprint) && !pendingSet.has(fingerprint)) {
      let preview;
      if (action.action === 'exec') {
        preview = action.command || '';
      }
      else if (action.action === 'application') {
        preview = `${action.applicationPath || ''} ${action.applicationParameters || ''}`.trim();
      }
      else {
        preview = action.script || '';
      }
      pending.push({
        fingerprint,
        actionType: action.action,
        preview: String(preview).substring(0, PREVIEW_LENGTH),
        source: 'cloud-sync',
        receivedAt: Date.now(),
      });
      logger.warn(`New remote ${action.action} action queued for user approval (${fingerprint.substring(0, 12)}...)`);
    }
  }

  setSecurity(configStore, { ...security, pendingApprovals: pending });
}

/**
 * Trust all risky actions currently present in the local configuration.
 * Call this when the user saves pages locally. Fingerprints still pending
 * remote approval are excluded so an unrelated local edit cannot silently
 * approve a remote action.
 * @param {Object} configStore - electron-store instance
 */
function trustCurrentConfig(configStore) {
  const security = getSecurity(configStore);
  const current = collectRiskyFingerprints(configStore.get('pages'));
  const pendingSet = new Set(security.pendingApprovals.map(entry => entry.fingerprint));

  const toTrust = [...current.keys()].filter(fingerprint => !pendingSet.has(fingerprint));
  if (toTrust.length === 0) {
    return;
  }

  setSecurity(configStore, addTrusted(security, toTrust));
}

/**
 * Ensure a risky action is approved before execution. Only actions on the
 * pending list trigger a confirmation dialog; everything else is allowed.
 * @param {Object} action - Action about to be executed
 * @returns {Promise<{approved: boolean, reason?: string}>}
 */
async function ensureApproved(action) {
  if (!state.configStore) {
    return { approved: true };
  }

  const security = getSecurity(state.configStore);
  // 승인 대기 중인 액션이 없으면(실행 시점의 대부분의 경우) fingerprint 계산 없이 즉시 허용
  if (security.pendingApprovals.length === 0) {
    return { approved: true };
  }

  const fingerprint = computeFingerprint(action);
  if (!fingerprint) {
    return { approved: true };
  }

  const entry = security.pendingApprovals.find(item => item.fingerprint === fingerprint);
  if (!entry) {
    return { approved: true };
  }

  // Deduplicate concurrent prompts for the same action (e.g. double-click)
  if (state.inFlight.has(fingerprint)) {
    return state.inFlight.get(fingerprint);
  }

  const prompt = promptUser(entry, fingerprint);
  state.inFlight.set(fingerprint, prompt);
  try {
    return await prompt;
  }
  finally {
    state.inFlight.delete(fingerprint);
  }
}

async function promptUser(entry, fingerprint) {
  const { dialog } = require('electron');

  const toastWindow = state.windows && state.windows.toast && !state.windows.toast.isDestroyed() ? state.windows.toast : null;

  // Release alwaysOnTop so the dialog is not hidden behind the toast popup
  if (toastWindow) {
    toastWindow.setAlwaysOnTop(false);
  }

  try {
    const options = {
      type: 'warning',
      buttons: ['Run', 'Cancel'],
      defaultId: 1,
      cancelId: 1,
      title: 'New action from cloud sync',
      message: `A new ${entry.actionType} action was downloaded from cloud sync.\nDo you want to allow it to run on this device?`,
      detail: entry.preview,
    };
    const { response } = toastWindow ? await dialog.showMessageBox(toastWindow, options) : await dialog.showMessageBox(options);

    if (response === 0) {
      const security = getSecurity(state.configStore);
      const remaining = security.pendingApprovals.filter(item => item.fingerprint !== fingerprint);
      setSecurity(state.configStore, addTrusted({ ...security, pendingApprovals: remaining }, [fingerprint]));
      logger.info(`Remote ${entry.actionType} action approved by user (${fingerprint.substring(0, 12)}...)`);
      return { approved: true };
    }

    logger.info(`Remote ${entry.actionType} action declined by user (${fingerprint.substring(0, 12)}...)`);
    return { approved: false, reason: 'Action blocked: pending user approval' };
  }
  finally {
    if (toastWindow && !toastWindow.isDestroyed()) {
      toastWindow.setAlwaysOnTop(true);
    }
  }
}

/**
 * Empty page slots are stored as application buttons without a path. They
 * cannot execute anything, so they are preserved instead of being dropped.
 * @param {Object} button - Button from remote page data
 * @returns {boolean} Whether the button is an inert empty slot
 */
function isEmptySlotButton(button) {
  return Boolean(button) && button.action === 'application' && !button.applicationPath;
}

/**
 * Validate remote pages before persisting them: every button action must pass
 * executor validation. Invalid actions are dropped with a warning so malformed
 * or malicious sync data cannot enter the local configuration.
 * @param {Array} pages - Pages downloaded from the server
 * @returns {Promise<Array>} Pages with invalid actions removed
 */
async function sanitizeRemotePages(pages) {
  if (!Array.isArray(pages)) {
    return [];
  }

  // Lazy require to avoid a load-time cycle (executor also requires this module)
  const { validateAction } = require('./executor');

  const sanitized = [];
  for (const page of pages) {
    if (!page || typeof page !== 'object') {
      logger.warn('Dropping invalid page entry from remote data');
      continue;
    }
    if (!Array.isArray(page.buttons)) {
      sanitized.push(page);
      continue;
    }

    const buttons = [];
    for (const button of page.buttons) {
      if (isEmptySlotButton(button)) {
        buttons.push(button);
        continue;
      }
      const validation = await validateAction(button);
      if (validation.valid) {
        buttons.push(button);
      }
      else {
        logger.warn(`Dropping invalid remote action "${button && button.name}": ${validation.message}`);
      }
    }
    sanitized.push({ ...page, buttons });
  }

  return sanitized;
}

module.exports = {
  computeFingerprint,
  collectRiskyFingerprints,
  initializeApprovals,
  recordRemoteChanges,
  trustCurrentConfig,
  ensureApproved,
  sanitizeRemotePages,
};
