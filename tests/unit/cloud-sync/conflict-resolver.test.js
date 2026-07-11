/**
 * Toast - Cloud Sync Conflict Resolver Tests
 *
 * Unit tests for conflict analysis and per-section merge policies.
 * Locks in the policies as actually implemented (pages: local-first, appearance/advanced: local-first).
 */

// Mock logger
jest.mock('../../../src/main/logger', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  })),
}));

const { analyzeConflict, mergePages, mergeButtons, mergeSnippets, mergeAppearance, mergeAdvanced } = require('../../../src/main/cloud-sync/conflict-resolver');

const TIME_THRESHOLD = 60000; // 1 minute (matches the implementation)

describe('conflict-resolver', () => {
  describe('analyzeConflict', () => {
    test('download_server when there are no local changes and the server is newer', () => {
      const result = analyzeConflict({ lastModifiedAt: 1000 }, { lastModifiedAt: 2000 }, false);

      expect(result.action).toBe('download_server');
    });

    test('no_action when there are no local changes and the server is older', () => {
      const result = analyzeConflict({ lastModifiedAt: 2000 }, { lastModifiedAt: 1000 }, false);

      expect(result.action).toBe('no_action');
    });

    test('no_action when there are no local changes and the timestamps are equal', () => {
      const result = analyzeConflict({ lastModifiedAt: 1000 }, { lastModifiedAt: 1000 }, false);

      expect(result.action).toBe('no_action');
    });

    test('upload_local when there are local changes and no server data (0)', () => {
      const result = analyzeConflict({ lastModifiedAt: 1000 }, {}, true);

      expect(result.action).toBe('upload_local');
    });

    test('upload_local when local is newer by more than the threshold', () => {
      const now = 1_000_000;
      const result = analyzeConflict({ lastModifiedAt: now }, { lastModifiedAt: now - TIME_THRESHOLD - 1 }, true);

      expect(result.action).toBe('upload_local');
    });

    test('download_server when the server is newer by more than the threshold', () => {
      const now = 1_000_000;
      const result = analyzeConflict({ lastModifiedAt: now }, { lastModifiedAt: now + TIME_THRESHOLD + 1 }, true);

      expect(result.action).toBe('download_server');
    });

    test('merge_required when the time difference is within the threshold', () => {
      const now = 1_000_000;
      const result = analyzeConflict({ lastModifiedAt: now }, { lastModifiedAt: now + 1000 }, true);

      expect(result.action).toBe('merge_required');
    });

    test('falls back to lastSyncedAt when lastModifiedAt is absent', () => {
      const result = analyzeConflict({ lastSyncedAt: 1000 }, { lastSyncedAt: 5000 }, false);

      expect(result.action).toBe('download_server');
    });
  });

  describe('mergePages', () => {
    test('merges per-button when a same-named page has buttons on both local and server (keeps both)', () => {
      const localPages = [{ name: 'Page 1', buttons: [{ name: 'A' }] }, { name: 'Page 2', buttons: [] }];
      const serverPages = [{ name: 'Page 1', buttons: [{ name: 'Z' }] }];

      expect(mergePages(localPages, serverPages)).toEqual([
        { name: 'Page 1', buttons: [{ name: 'A' }, { name: 'Z' }] },
        { name: 'Page 2', buttons: [] },
      ]);
    });

    test('does not append duplicates when the name and button are the same', () => {
      const localPages = [{ name: 'Page 1', buttons: [{ name: 'A' }] }];
      const serverPages = [{ name: 'Page 1', buttons: [{ name: 'A' }] }];

      expect(mergePages(localPages, serverPages)).toEqual(localPages);
    });

    test('uses the server pages when the local pages are empty', () => {
      const serverPages = [{ name: 'Page 1' }];

      expect(mergePages([], serverPages)).toBe(serverPages);
    });

    test('keeps the server page when the local page has no buttons but the matching server page does', () => {
      const localPages = [{ name: 'Page 1', buttons: [] }];
      const serverPages = [{ name: 'Page 1', buttons: [{ name: 'A' }] }];

      expect(mergePages(localPages, serverPages)).toEqual([{ name: 'Page 1', buttons: [{ name: 'A' }] }]);
    });

    test('keeps local when local buttons are empty and the server also has no buttons', () => {
      const localPages = [{ name: 'Page 1', buttons: [] }];
      const serverPages = [{ name: 'Page 1', buttons: [] }];

      expect(mergePages(localPages, serverPages)).toEqual(localPages);
    });

    test('keeps local for unnamed pages instead of replacing with the server via index fallback', () => {
      const localPages = [{ buttons: [] }];
      const serverPages = [{ buttons: [{ name: 'X' }] }];

      expect(mergePages(localPages, serverPages)).toEqual(localPages);
    });

    test('preserves a named page that exists only on the server at the end of the merge result', () => {
      const localPages = [{ name: 'Page 1', buttons: [{ name: 'A' }] }];
      const serverPages = [
        { name: 'Page 1', buttons: [{ name: 'A' }] },
        { name: 'Work', buttons: [{ name: 'B' }] },
      ];

      expect(mergePages(localPages, serverPages)).toEqual([
        { name: 'Page 1', buttons: [{ name: 'A' }] },
        { name: 'Work', buttons: [{ name: 'B' }] },
      ]);
    });

    test('does not append unnamed server-only pages', () => {
      const localPages = [{ name: 'Page 1', buttons: [{ name: 'A' }] }];
      const serverPages = [{ name: 'Page 1', buttons: [{ name: 'A' }] }, { buttons: [{ name: 'B' }] }];

      expect(mergePages(localPages, serverPages)).toEqual(localPages);
    });

    test('treats missing arguments as an empty array', () => {
      expect(mergePages()).toEqual([]);
    });
  });

  describe('mergeButtons', () => {
    test('adopts the server buttons when local is empty', () => {
      const server = [{ name: 'A' }];
      expect(mergeButtons([], server)).toEqual(server);
    });

    test('prefers local but appends server-only named buttons at the end', () => {
      const local = [{ name: 'A', shortcut: 'Q' }];
      const server = [
        { name: 'A', shortcut: 'W' },
        { name: 'B', shortcut: 'E' },
      ];
      expect(mergeButtons(local, server)).toEqual([
        { name: 'A', shortcut: 'Q' },
        { name: 'B', shortcut: 'E' },
      ]);
    });

    test('does not re-add a same-named button from the server', () => {
      const local = [{ name: 'A' }];
      const server = [{ name: 'A' }];
      expect(mergeButtons(local, server)).toEqual(local);
    });

    test('does not append unnamed server-only buttons', () => {
      const local = [{ name: 'A' }];
      const server = [{ name: 'A' }, { shortcut: 'E' }];
      expect(mergeButtons(local, server)).toEqual(local);
    });

    test('treats missing arguments as an empty array', () => {
      expect(mergeButtons()).toEqual([]);
    });
  });

  describe('mergeSnippets', () => {
    test('adopts the server snippets when local is empty', () => {
      const server = [{ keyword: ':email', content: 'a@b.com' }];
      expect(mergeSnippets([], server)).toEqual(server);
    });

    test('prefers local but appends server-only keywords at the end', () => {
      const local = [{ keyword: ':email', content: 'local@b.com' }];
      const server = [
        { keyword: ':email', content: 'server@b.com' },
        { keyword: ':addr', content: 'Seoul' },
      ];
      const result = mergeSnippets(local, server);
      // keeps local :email, adds server-only :addr
      expect(result).toEqual([
        { keyword: ':email', content: 'local@b.com' },
        { keyword: ':addr', content: 'Seoul' },
      ]);
    });

    test('does not re-add a duplicate keyword from the server', () => {
      const local = [{ keyword: ':x', content: '1' }];
      const server = [{ keyword: ':x', content: '2' }];
      expect(mergeSnippets(local, server)).toEqual(local);
    });

    test('treats missing arguments as an empty array', () => {
      expect(mergeSnippets()).toEqual([]);
    });
  });

  describe('mergeAppearance', () => {
    test('local values override server values (local-first)', () => {
      const result = mergeAppearance({ theme: 'dark' }, { theme: 'light', size: 'lg' });

      expect(result).toEqual({ theme: 'dark', size: 'lg' });
    });

    test('keys that exist only on local are preserved', () => {
      const result = mergeAppearance({ opacity: 0.5 }, { theme: 'light' });

      expect(result).toEqual({ theme: 'light', opacity: 0.5 });
    });

    test('returns an empty object when no arguments are provided', () => {
      expect(mergeAppearance()).toEqual({});
    });
  });

  describe('mergeAdvanced', () => {
    test('local values override server values (local-first)', () => {
      const result = mergeAdvanced({ autoStart: true }, { autoStart: false, hideAfterAction: true });

      expect(result).toEqual({ autoStart: true, hideAfterAction: true });
    });

    test('keys that exist only on local are preserved', () => {
      const result = mergeAdvanced({ launchAtStartup: true }, { autoStart: false });

      expect(result).toEqual({ autoStart: false, launchAtStartup: true });
    });

    test('returns an empty object when no arguments are provided', () => {
      expect(mergeAdvanced()).toEqual({});
    });
  });
});
