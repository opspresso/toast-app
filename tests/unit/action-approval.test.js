/**
 * Toast - Action Approval Tests
 *
 * 클라우드 동기화로 유입된 exec/script 액션의 승인 흐름에 대한 단위 테스트
 */

const { dialog } = require('electron');
const {
  computeFingerprint,
  collectRiskyFingerprints,
  initializeApprovals,
  recordRemoteChanges,
  trustCurrentConfig,
  ensureApproved,
  sanitizeRemotePages,
} = require('../../src/main/action-approval');

/**
 * Minimal in-memory stand-in for electron-store
 */
function createFakeStore(initial = {}) {
  const data = { ...initial };
  return {
    get: key => data[key],
    set: (key, value) => {
      data[key] = value;
    },
  };
}

const execAction = (command = 'echo hello') => ({
  name: 'Exec Button',
  icon: 'terminal',
  action: 'exec',
  command,
});

const scriptAction = (script = 'result = 1') => ({
  name: 'Script Button',
  action: 'script',
  script,
  scriptType: 'javascript',
});

const pagesWith = (...buttons) => [{ name: 'Page 1', buttons }];

describe('Action Approval', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    dialog.showMessageBox.mockResolvedValue({ response: 0 });
  });

  describe('computeFingerprint', () => {
    test('should be deterministic for identical exec actions', () => {
      expect(computeFingerprint(execAction())).toBe(computeFingerprint(execAction()));
    });

    test('should ignore fields that do not affect execution', () => {
      const a = execAction();
      const b = { ...execAction(), name: 'Renamed', icon: 'other', shortcut: 'A' };
      expect(computeFingerprint(a)).toBe(computeFingerprint(b));
    });

    test('should change when the command changes', () => {
      expect(computeFingerprint(execAction('echo a'))).not.toBe(computeFingerprint(execAction('echo b')));
    });

    test('should distinguish exec and script fingerprints', () => {
      expect(computeFingerprint(execAction())).not.toBe(computeFingerprint(scriptAction()));
    });

    test('should return null for non-risky actions', () => {
      expect(computeFingerprint({ action: 'open', url: 'https://example.com' })).toBeNull();
      expect(computeFingerprint({ action: 'application', applicationPath: '' })).toBeNull();
      expect(computeFingerprint(null)).toBeNull();
    });

    describe('on macOS', () => {
      let originalPlatform;

      beforeEach(() => {
        originalPlatform = process.platform;
        Object.defineProperty(process, 'platform', { value: 'darwin' });
      });

      afterEach(() => {
        Object.defineProperty(process, 'platform', { value: originalPlatform });
      });

      test('should stay gate-free for a plain .app bundle launch with no parameters', () => {
        expect(computeFingerprint({ action: 'application', applicationPath: '/Applications/Calculator.app' })).toBeNull();
        expect(computeFingerprint({ action: 'application', applicationPath: '/Applications/Visual Studio Code.app/' })).toBeNull();
      });

      test('should fingerprint a parameterless application launch when the path is not a .app bundle', () => {
        expect(computeFingerprint({ action: 'application', applicationPath: '/usr/local/bin/some-script.sh' })).not.toBeNull();
        expect(computeFingerprint({ action: 'application', applicationPath: '/Users/me/run.command' })).not.toBeNull();
      });

      test('should fingerprint application actions that carry launch parameters', () => {
        const withParams = { action: 'application', applicationPath: '/Applications/Calculator.app', applicationParameters: '--flag' };
        expect(computeFingerprint(withParams)).not.toBeNull();
        // Empty parameters stay gate-free for an actual .app bundle
        expect(computeFingerprint({ action: 'application', applicationPath: '/Applications/Calculator.app', applicationParameters: '' })).toBeNull();
        // Fingerprint tracks the parameters that make it risky
        const other = { action: 'application', applicationPath: '/Applications/Calculator.app', applicationParameters: '--other' };
        expect(computeFingerprint(withParams)).not.toBe(computeFingerprint(other));
      });
    });

    describe('on Windows', () => {
      let originalPlatform;
      let originalEnv;

      beforeEach(() => {
        originalPlatform = process.platform;
        originalEnv = { ...process.env };
        Object.defineProperty(process, 'platform', { value: 'win32' });
        process.env.ProgramFiles = 'C:\\Program Files';
        process.env['ProgramFiles(x86)'] = 'C:\\Program Files (x86)';
        process.env.LOCALAPPDATA = 'C:\\Users\\test\\AppData\\Local';
        process.env.WINDIR = 'C:\\Windows';
      });

      afterEach(() => {
        Object.defineProperty(process, 'platform', { value: originalPlatform });
        process.env = originalEnv;
      });

      test('should stay gate-free for a .exe under a standard install directory', () => {
        expect(computeFingerprint({ action: 'application', applicationPath: 'C:\\Program Files\\Toast\\Toast.exe' })).toBeNull();
        expect(computeFingerprint({ action: 'application', applicationPath: 'C:\\Program Files (x86)\\App\\App.exe' })).toBeNull();
        expect(computeFingerprint({ action: 'application', applicationPath: 'C:\\Users\\test\\AppData\\Local\\Programs\\App\\App.exe' })).toBeNull();
        expect(computeFingerprint({ action: 'application', applicationPath: 'C:\\Windows\\notepad.exe' })).toBeNull();
      });

      test('should fingerprint a .exe outside the standard install directories', () => {
        expect(computeFingerprint({ action: 'application', applicationPath: 'C:\\Users\\test\\Downloads\\random.exe' })).not.toBeNull();
      });

      test('should fingerprint a non-.exe launch even under a standard install directory', () => {
        expect(computeFingerprint({ action: 'application', applicationPath: 'C:\\Program Files\\Toast\\run.bat' })).not.toBeNull();
      });
    });
  });

  describe('collectRiskyFingerprints', () => {
    test('should collect exec and script actions from buttons', () => {
      const pages = pagesWith(execAction(), scriptAction(), { action: 'open', url: 'x' });
      expect(collectRiskyFingerprints(pages).size).toBe(2);
    });

    test('should collect actions nested in chains, including chain-in-chain', () => {
      const pages = pagesWith({
        action: 'chain',
        actions: [execAction('outer'), { action: 'chain', actions: [scriptAction('inner')] }],
      });
      const found = collectRiskyFingerprints(pages);
      expect(found.size).toBe(2);
      expect(found.has(computeFingerprint(execAction('outer')))).toBe(true);
      expect(found.has(computeFingerprint(scriptAction('inner')))).toBe(true);
    });

    test('should handle empty or malformed pages', () => {
      expect(collectRiskyFingerprints([]).size).toBe(0);
      expect(collectRiskyFingerprints(null).size).toBe(0);
      expect(collectRiskyFingerprints([{ name: 'no buttons' }]).size).toBe(0);
    });

    test('should not exhaust the call stack on a pathologically deep chain', () => {
      // Build a chain nested 50 levels deep, well past the depth guard.
      let deepAction = execAction('innermost');
      for (let i = 0; i < 50; i++) {
        deepAction = { action: 'chain', actions: [deepAction] };
      }
      const pages = pagesWith(deepAction);

      expect(() => collectRiskyFingerprints(pages)).not.toThrow();
    });
  });

  describe('initializeApprovals', () => {
    test('should seed trusted list with existing risky actions on first run', () => {
      const store = createFakeStore({ pages: pagesWith(execAction()) });

      initializeApprovals(store);

      const security = store.get('security');
      expect(security.approvalsInitialized).toBe(true);
      expect(security.trustedActions).toContain(computeFingerprint(execAction()));
    });

    test('should be a no-op when already initialized', () => {
      const store = createFakeStore({
        pages: pagesWith(execAction()),
        security: { approvalsInitialized: true, trustedActions: [], pendingApprovals: [] },
      });

      initializeApprovals(store);

      expect(store.get('security').trustedActions).toEqual([]);
    });
  });

  describe('recordRemoteChanges', () => {
    test('should queue new remote risky actions for approval', () => {
      const store = createFakeStore({
        security: { approvalsInitialized: true, trustedActions: [], pendingApprovals: [] },
      });

      recordRemoteChanges(store, pagesWith(execAction('rm -rf /tmp/x')));

      const pending = store.get('security').pendingApprovals;
      expect(pending).toHaveLength(1);
      expect(pending[0].actionType).toBe('exec');
      expect(pending[0].preview).toContain('rm -rf /tmp/x');
    });

    test('should not queue trusted actions', () => {
      const store = createFakeStore({
        security: {
          approvalsInitialized: true,
          trustedActions: [computeFingerprint(execAction())],
          pendingApprovals: [],
        },
      });

      recordRemoteChanges(store, pagesWith(execAction()));

      expect(store.get('security').pendingApprovals).toHaveLength(0);
    });

    test('should not duplicate an already pending action on repeated sync', () => {
      const store = createFakeStore({
        security: { approvalsInitialized: true, trustedActions: [], pendingApprovals: [] },
      });

      recordRemoteChanges(store, pagesWith(execAction()));
      recordRemoteChanges(store, pagesWith(execAction()));

      expect(store.get('security').pendingApprovals).toHaveLength(1);
    });

    test('should remove pending entries whose actions disappeared from remote data', () => {
      const store = createFakeStore({
        security: { approvalsInitialized: true, trustedActions: [], pendingApprovals: [] },
      });

      recordRemoteChanges(store, pagesWith(execAction('old')));
      recordRemoteChanges(store, pagesWith(execAction('new')));

      const pending = store.get('security').pendingApprovals;
      expect(pending).toHaveLength(1);
      expect(pending[0].preview).toBe('new');
    });
  });

  describe('trustCurrentConfig', () => {
    test('should trust locally saved risky actions', () => {
      const store = createFakeStore({
        pages: pagesWith(execAction()),
        security: { approvalsInitialized: true, trustedActions: [], pendingApprovals: [] },
      });

      trustCurrentConfig(store);

      expect(store.get('security').trustedActions).toContain(computeFingerprint(execAction()));
    });

    test('should not trust actions still pending remote approval', () => {
      const fingerprint = computeFingerprint(execAction());
      const store = createFakeStore({
        pages: pagesWith(execAction(), scriptAction()),
        security: {
          approvalsInitialized: true,
          trustedActions: [],
          pendingApprovals: [{ fingerprint, actionType: 'exec', preview: '', source: 'cloud-sync', receivedAt: 0 }],
        },
      });

      trustCurrentConfig(store);

      const security = store.get('security');
      expect(security.trustedActions).not.toContain(fingerprint);
      expect(security.trustedActions).toContain(computeFingerprint(scriptAction()));
      expect(security.pendingApprovals).toHaveLength(1);
    });
  });

  describe('ensureApproved', () => {
    function initializedStore(security) {
      const store = createFakeStore({
        pages: [],
        security: { approvalsInitialized: true, trustedActions: [], pendingApprovals: [], ...security },
      });
      initializeApprovals(store);
      return store;
    }

    test('should approve actions that are not pending without showing a dialog', async () => {
      initializedStore();

      const result = await ensureApproved(execAction());

      expect(result.approved).toBe(true);
      expect(dialog.showMessageBox).not.toHaveBeenCalled();
    });

    test('should show dialog for pending action and trust it when user allows', async () => {
      const fingerprint = computeFingerprint(execAction());
      const store = initializedStore({
        pendingApprovals: [{ fingerprint, actionType: 'exec', preview: 'echo hello', source: 'cloud-sync', receivedAt: 0 }],
      });
      dialog.showMessageBox.mockResolvedValue({ response: 0 });

      const result = await ensureApproved(execAction());

      expect(dialog.showMessageBox).toHaveBeenCalledTimes(1);
      expect(result.approved).toBe(true);
      const security = store.get('security');
      expect(security.trustedActions).toContain(fingerprint);
      expect(security.pendingApprovals).toHaveLength(0);
    });

    test('should block pending action and keep it pending when user cancels', async () => {
      const fingerprint = computeFingerprint(execAction());
      const store = initializedStore({
        pendingApprovals: [{ fingerprint, actionType: 'exec', preview: 'echo hello', source: 'cloud-sync', receivedAt: 0 }],
      });
      dialog.showMessageBox.mockResolvedValue({ response: 1 });

      const result = await ensureApproved(execAction());

      expect(result.approved).toBe(false);
      expect(result.reason).toContain('pending user approval');
      const security = store.get('security');
      expect(security.trustedActions).not.toContain(fingerprint);
      expect(security.pendingApprovals).toHaveLength(1);
    });

    test('should deduplicate concurrent prompts for the same action', async () => {
      const fingerprint = computeFingerprint(execAction());
      initializedStore({
        pendingApprovals: [{ fingerprint, actionType: 'exec', preview: 'echo hello', source: 'cloud-sync', receivedAt: 0 }],
      });

      let resolveDialog;
      dialog.showMessageBox.mockReturnValue(new Promise(resolve => (resolveDialog = resolve)));

      const first = ensureApproved(execAction());
      const second = ensureApproved(execAction());
      resolveDialog({ response: 0 });

      const results = await Promise.all([first, second]);

      expect(dialog.showMessageBox).toHaveBeenCalledTimes(1);
      expect(results[0].approved).toBe(true);
      expect(results[1].approved).toBe(true);
    });
  });

  describe('sanitizeRemotePages', () => {
    test('should keep valid actions and drop invalid ones', async () => {
      const pages = pagesWith(
        execAction(),
        { name: 'Broken', action: 'exec' }, // command 누락
        { name: 'Bad type', action: 'unknown-type' },
      );

      const result = await sanitizeRemotePages(pages);

      expect(result[0].buttons).toHaveLength(1);
      expect(result[0].buttons[0].name).toBe('Exec Button');
    });

    test('should keep empty slot buttons (application action without path)', async () => {
      const emptySlot = {
        name: '',
        shortcut: 'Q',
        icon: '',
        action: 'application',
        application: '',
        applicationParameters: '',
      };

      const result = await sanitizeRemotePages(pagesWith(emptySlot, execAction()));

      expect(result[0].buttons).toHaveLength(2);
      expect(result[0].buttons[0]).toEqual(emptySlot);
    });

    test('should return empty array for non-array input', async () => {
      expect(await sanitizeRemotePages(null)).toEqual([]);
      expect(await sanitizeRemotePages('bad')).toEqual([]);
    });

    test('should keep pages without buttons untouched', async () => {
      const result = await sanitizeRemotePages([{ name: 'Empty' }]);
      expect(result).toEqual([{ name: 'Empty' }]);
    });
  });
});
