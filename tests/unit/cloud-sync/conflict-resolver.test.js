/**
 * Toast - Cloud Sync Conflict Resolver Tests
 *
 * 충돌 분석 및 섹션별 병합 정책에 대한 단위 테스트.
 * 실제 구현된 정책을 그대로 잠근다 (pages: 로컬 우선, appearance/advanced: 로컬 우선).
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

const TIME_THRESHOLD = 60000; // 1 minute (구현과 동일)

describe('conflict-resolver', () => {
  describe('analyzeConflict', () => {
    test('로컬 변경사항 없고 서버가 더 최신이면 download_server', () => {
      const result = analyzeConflict({ lastModifiedAt: 1000 }, { lastModifiedAt: 2000 }, false);

      expect(result.action).toBe('download_server');
    });

    test('로컬 변경사항 없고 서버가 더 오래됐으면 no_action', () => {
      const result = analyzeConflict({ lastModifiedAt: 2000 }, { lastModifiedAt: 1000 }, false);

      expect(result.action).toBe('no_action');
    });

    test('로컬 변경사항 없고 시간이 같으면 no_action', () => {
      const result = analyzeConflict({ lastModifiedAt: 1000 }, { lastModifiedAt: 1000 }, false);

      expect(result.action).toBe('no_action');
    });

    test('로컬 변경사항 있고 서버 데이터가 없으면(0) upload_local', () => {
      const result = analyzeConflict({ lastModifiedAt: 1000 }, {}, true);

      expect(result.action).toBe('upload_local');
    });

    test('로컬이 임계값 이상 더 최신이면 upload_local', () => {
      const now = 1_000_000;
      const result = analyzeConflict({ lastModifiedAt: now }, { lastModifiedAt: now - TIME_THRESHOLD - 1 }, true);

      expect(result.action).toBe('upload_local');
    });

    test('서버가 임계값 이상 더 최신이면 download_server', () => {
      const now = 1_000_000;
      const result = analyzeConflict({ lastModifiedAt: now }, { lastModifiedAt: now + TIME_THRESHOLD + 1 }, true);

      expect(result.action).toBe('download_server');
    });

    test('시간 차이가 임계값 이내면 merge_required', () => {
      const now = 1_000_000;
      const result = analyzeConflict({ lastModifiedAt: now }, { lastModifiedAt: now + 1000 }, true);

      expect(result.action).toBe('merge_required');
    });

    test('lastModifiedAt이 없으면 lastSyncedAt으로 폴백한다', () => {
      const result = analyzeConflict({ lastSyncedAt: 1000 }, { lastSyncedAt: 5000 }, false);

      expect(result.action).toBe('download_server');
    });
  });

  describe('mergePages', () => {
    test('같은 이름 페이지에 로컬/서버 모두 버튼이 있으면 버튼 단위로 병합한다 (양쪽 보존)', () => {
      const localPages = [{ name: 'Page 1', buttons: [{ name: 'A' }] }, { name: 'Page 2', buttons: [] }];
      const serverPages = [{ name: 'Page 1', buttons: [{ name: 'Z' }] }];

      expect(mergePages(localPages, serverPages)).toEqual([
        { name: 'Page 1', buttons: [{ name: 'A' }, { name: 'Z' }] },
        { name: 'Page 2', buttons: [] },
      ]);
    });

    test('같은 이름/같은 버튼이면 중복으로 append하지 않는다', () => {
      const localPages = [{ name: 'Page 1', buttons: [{ name: 'A' }] }];
      const serverPages = [{ name: 'Page 1', buttons: [{ name: 'A' }] }];

      expect(mergePages(localPages, serverPages)).toEqual(localPages);
    });

    test('로컬 페이지가 비어있으면 서버 페이지를 사용한다', () => {
      const serverPages = [{ name: 'Page 1' }];

      expect(mergePages([], serverPages)).toBe(serverPages);
    });

    test('로컬 페이지의 버튼이 비었고 서버 대응 페이지에 버튼이 있으면 서버를 유지한다', () => {
      const localPages = [{ name: 'Page 1', buttons: [] }];
      const serverPages = [{ name: 'Page 1', buttons: [{ name: 'A' }] }];

      expect(mergePages(localPages, serverPages)).toEqual([{ name: 'Page 1', buttons: [{ name: 'A' }] }]);
    });

    test('로컬 버튼이 비었지만 서버에도 버튼이 없으면 로컬을 유지한다', () => {
      const localPages = [{ name: 'Page 1', buttons: [] }];
      const serverPages = [{ name: 'Page 1', buttons: [] }];

      expect(mergePages(localPages, serverPages)).toEqual(localPages);
    });

    test('이름 없는 페이지는 index 폴백으로 서버를 치환하지 않고 로컬을 유지한다', () => {
      const localPages = [{ buttons: [] }];
      const serverPages = [{ buttons: [{ name: 'X' }] }];

      expect(mergePages(localPages, serverPages)).toEqual(localPages);
    });

    test('로컬에 없고 서버에만 있는 이름 페이지는 병합 결과 끝에 보존한다', () => {
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

    test('이름 없는 서버 전용 페이지는 append하지 않는다', () => {
      const localPages = [{ name: 'Page 1', buttons: [{ name: 'A' }] }];
      const serverPages = [{ name: 'Page 1', buttons: [{ name: 'A' }] }, { buttons: [{ name: 'B' }] }];

      expect(mergePages(localPages, serverPages)).toEqual(localPages);
    });

    test('인자 미제공 시 빈 배열로 처리한다', () => {
      expect(mergePages()).toEqual([]);
    });
  });

  describe('mergeButtons', () => {
    test('로컬이 비어 있으면 서버 버튼을 채택한다', () => {
      const server = [{ name: 'A' }];
      expect(mergeButtons([], server)).toEqual(server);
    });

    test('로컬 우선하되 서버 전용 이름 버튼은 끝에 append 한다', () => {
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

    test('같은 이름 버튼을 서버에서 다시 추가하지 않는다', () => {
      const local = [{ name: 'A' }];
      const server = [{ name: 'A' }];
      expect(mergeButtons(local, server)).toEqual(local);
    });

    test('이름 없는 서버 전용 버튼은 append하지 않는다', () => {
      const local = [{ name: 'A' }];
      const server = [{ name: 'A' }, { shortcut: 'E' }];
      expect(mergeButtons(local, server)).toEqual(local);
    });

    test('인자 미제공 시 빈 배열로 처리한다', () => {
      expect(mergeButtons()).toEqual([]);
    });
  });

  describe('mergeSnippets', () => {
    test('로컬이 비어 있으면 서버 스니펫을 채택한다', () => {
      const server = [{ keyword: ':email', content: 'a@b.com' }];
      expect(mergeSnippets([], server)).toEqual(server);
    });

    test('로컬 우선하되 서버 전용 keyword 는 끝에 append 한다', () => {
      const local = [{ keyword: ':email', content: 'local@b.com' }];
      const server = [
        { keyword: ':email', content: 'server@b.com' },
        { keyword: ':addr', content: 'Seoul' },
      ];
      const result = mergeSnippets(local, server);
      // 로컬 :email 유지, 서버 전용 :addr 추가
      expect(result).toEqual([
        { keyword: ':email', content: 'local@b.com' },
        { keyword: ':addr', content: 'Seoul' },
      ]);
    });

    test('중복 keyword 를 서버에서 다시 추가하지 않는다', () => {
      const local = [{ keyword: ':x', content: '1' }];
      const server = [{ keyword: ':x', content: '2' }];
      expect(mergeSnippets(local, server)).toEqual(local);
    });

    test('인자 미제공 시 빈 배열로 처리한다', () => {
      expect(mergeSnippets()).toEqual([]);
    });
  });

  describe('mergeAppearance', () => {
    test('로컬 값이 서버 값을 덮어쓴다 (로컬 우선)', () => {
      const result = mergeAppearance({ theme: 'dark' }, { theme: 'light', size: 'lg' });

      expect(result).toEqual({ theme: 'dark', size: 'lg' });
    });

    test('로컬에만 있는 키는 유지된다', () => {
      const result = mergeAppearance({ opacity: 0.5 }, { theme: 'light' });

      expect(result).toEqual({ theme: 'light', opacity: 0.5 });
    });

    test('인자 미제공 시 빈 객체를 반환한다', () => {
      expect(mergeAppearance()).toEqual({});
    });
  });

  describe('mergeAdvanced', () => {
    test('로컬 값이 서버 값을 덮어쓴다 (로컬 우선)', () => {
      const result = mergeAdvanced({ autoStart: true }, { autoStart: false, hideAfterAction: true });

      expect(result).toEqual({ autoStart: true, hideAfterAction: true });
    });

    test('로컬에만 있는 키는 유지된다', () => {
      const result = mergeAdvanced({ launchAtStartup: true }, { autoStart: false });

      expect(result).toEqual({ autoStart: false, launchAtStartup: true });
    });

    test('인자 미제공 시 빈 객체를 반환한다', () => {
      expect(mergeAdvanced()).toEqual({});
    });
  });
});
