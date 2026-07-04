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

const { analyzeConflict, mergePages, mergeAppearance, mergeAdvanced } = require('../../../src/main/cloud-sync/conflict-resolver');

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
    test('로컬 페이지가 있으면 로컬을 유지한다 (로컬 우선)', () => {
      const localPages = [{ id: 1 }, { id: 2 }];
      const serverPages = [{ id: 9 }];

      expect(mergePages(localPages, serverPages)).toBe(localPages);
    });

    test('로컬 페이지가 비어있으면 서버 페이지를 사용한다', () => {
      const serverPages = [{ id: 9 }];

      expect(mergePages([], serverPages)).toBe(serverPages);
    });

    test('인자 미제공 시 빈 배열로 처리한다', () => {
      expect(mergePages()).toEqual([]);
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
