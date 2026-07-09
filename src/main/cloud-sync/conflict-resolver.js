/**
 * Toast - Cloud Sync Conflict Resolver
 *
 * 클라우드 동기화 충돌 분석 및 섹션별 병합 정책을 담당하는 순수 로직 모듈.
 * - pages: 로컬 우선 (사용자가 수정한 내용 보존)
 * - appearance/advanced: 최신(로컬) 값 우선
 */

const { createLogger } = require('../logger');

// Create logger for this module
const logger = createLogger('ConflictResolver');

/**
 * 충돌 분석 및 해결 전략 결정
 * @param {Object} localMeta - 로컬 메타데이터
 * @param {Object} serverMeta - 서버 메타데이터
 * @param {boolean} hasLocalChanges - 로컬 변경사항 존재 여부
 * @returns {Object} 해결 전략
 */
function analyzeConflict(localMeta, serverMeta, hasLocalChanges) {
  // Use lastModifiedAt if available, fall back to lastSyncedAt for server compatibility
  const localTime = localMeta.lastModifiedAt || localMeta.lastSyncedAt || 0;
  const serverTime = serverMeta.lastModifiedAt || serverMeta.lastSyncedAt || 0;
  const timeDifference = Math.abs(localTime - serverTime);

  // 시간 차이가 1분 미만이면 동일한 것으로 간주
  const TIME_THRESHOLD = 60000; // 1 minute

  logger.info(`Analyzing conflict - Local: ${localTime}, Server: ${serverTime}, Diff: ${timeDifference}ms, HasLocalChanges: ${hasLocalChanges}`);

  // 1. 로컬에 변경사항이 없는 경우
  if (!hasLocalChanges) {
    if (serverTime > localTime) {
      return { action: 'download_server', reason: 'No local changes, server is newer' };
    }
    else {
      return { action: 'no_action', reason: 'No changes needed' };
    }
  }

  // 2. 서버 데이터가 없는 경우
  if (!serverTime || serverTime === 0) {
    return { action: 'upload_local', reason: 'No server data, upload local changes' };
  }

  // 3. 타임스탬프 비교
  if (localTime > serverTime + TIME_THRESHOLD) {
    return { action: 'upload_local', reason: 'Local changes are significantly newer' };
  }
  else if (serverTime > localTime + TIME_THRESHOLD) {
    return { action: 'download_server', reason: 'Server changes are significantly newer' };
  }
  else {
    // 시간이 비슷하면 병합 시도
    return { action: 'merge_required', reason: 'Concurrent changes detected, merge required' };
  }
}

/**
 * 이름 기반 식별 키 (이름 우선, 없으면 위치 기준). 페이지와 버튼 병합에 공용으로 쓰인다.
 * @param {Object} item - 페이지 또는 버튼
 * @param {number} index - 위치
 * @returns {string} 식별 키
 */
function namedItemKey(item, index) {
  if (item && item.name !== undefined && item.name !== null && item.name !== '') {
    return `name:${item.name}`;
  }
  return `index:${index}`;
}

/**
 * 버튼 데이터 병합 (같은 페이지 내부).
 * 로컬 우선(사용자가 방금 수정한 내용 보존)이되, 서버에만 있는 이름의 버튼
 * (다른 기기가 같은 페이지에 추가/수정한 버튼)은 결과 끝에 append 해 유실을 막는다.
 * @param {Array} localButtons - 로컬 버튼
 * @param {Array} serverButtons - 서버 버튼
 * @returns {Array} 병합된 버튼
 */
function mergeButtons(localButtons = [], serverButtons = []) {
  if (localButtons.length === 0) {
    return serverButtons;
  }

  const localKeys = new Set(localButtons.map((button, index) => namedItemKey(button, index)));
  const merged = [...localButtons];

  serverButtons.forEach((serverButton, index) => {
    const key = namedItemKey(serverButton, index);
    if (key.startsWith('name:') && !localKeys.has(key)) {
      logger.info(`Appending server-only button "${key}" to preserve remote additions`);
      merged.push(serverButton);
    }
  });

  return merged;
}

/**
 * 페이지 데이터 병합
 * 로컬 우선(사용자가 수정한 내용 보존)이되:
 * - 로컬 페이지의 버튼이 비어 있고 대응하는 서버 페이지에 버튼이 있으면 서버 버전을 유지
 * - 같은 이름의 페이지가 로컬/서버 모두에 버튼을 갖고 있으면 페이지 전체가 아니라
 *   버튼 단위로 병합한다 (두 기기가 같은 페이지의 다른 버튼을 동시에 추가/수정해도
 *   한쪽 변경이 통째로 유실되지 않도록)
 * @param {Array} localPages - 로컬 페이지
 * @param {Array} serverPages - 서버 페이지
 * @returns {Array} 병합된 페이지
 */
function mergePages(localPages = [], serverPages = []) {
  if (localPages.length === 0) {
    return serverPages;
  }

  const serverByKey = new Map();
  serverPages.forEach((page, index) => {
    serverByKey.set(namedItemKey(page, index), page);
  });

  logger.info(`Merging pages: ${localPages.length} local, ${serverPages.length} server`);

  const localKeys = new Set(localPages.map((page, index) => namedItemKey(page, index)));

  const merged = localPages.map((localPage, index) => {
    const key = namedItemKey(localPage, index);
    // 이름으로 확실히 매칭될 때만 서버 페이지를 채택/병합한다.
    // index 폴백 매칭은 순서가 다를 때 무관한 서버 페이지로 치환할 수 있어 제외.
    if (!key.startsWith('name:')) {
      return localPage;
    }
    const serverPage = serverByKey.get(key);
    const serverHasButtons = serverPage && Array.isArray(serverPage.buttons) && serverPage.buttons.length > 0;

    const localButtons = Array.isArray(localPage.buttons) ? localPage.buttons : [];
    if (localButtons.length === 0) {
      if (serverHasButtons) {
        logger.warn(`Local page "${key}" has no buttons; keeping server version to avoid data loss`);
        return serverPage;
      }
      return localPage;
    }

    if (serverHasButtons) {
      return { ...localPage, buttons: mergeButtons(localButtons, serverPage.buttons) };
    }
    return localPage;
  });

  // 로컬에 없고 서버에만 있는 페이지(다른 기기가 추가한 페이지)를 병합 결과 끝에 보존한다.
  // 이렇게 하지 않으면 재업로드 시 서버 전용 페이지가 삭제된다.
  // 이름 키로만 매칭하며, 순서 의존적인 index 키는 무관한 페이지를 신규로 오인할 수 있어 제외한다.
  serverPages.forEach((serverPage, index) => {
    const key = namedItemKey(serverPage, index);
    if (key.startsWith('name:') && !localKeys.has(key)) {
      logger.info(`Appending server-only page "${key}" to preserve remote additions`);
      merged.push(serverPage);
    }
  });

  return merged;
}

/**
 * 스니펫 병합
 * keyword 를 키로 병합한다. 로컬 우선(사용자가 방금 수정한 내용 보존)이되,
 * 서버에만 있는 keyword(다른 기기가 추가)는 결과 끝에 append 해 유실을 막는다.
 * @param {Array} localSnippets - 로컬 스니펫
 * @param {Array} serverSnippets - 서버 스니펫
 * @returns {Array} 병합된 스니펫
 */
function mergeSnippets(localSnippets = [], serverSnippets = []) {
  if (localSnippets.length === 0) {
    return serverSnippets;
  }

  const localKeywords = new Set(localSnippets.map(s => s && s.keyword));
  const merged = [...localSnippets];

  serverSnippets.forEach(serverSnippet => {
    if (serverSnippet && serverSnippet.keyword && !localKeywords.has(serverSnippet.keyword)) {
      logger.info(`Appending server-only snippet "${serverSnippet.keyword}" to preserve remote additions`);
      merged.push(serverSnippet);
    }
  });

  return merged;
}

/**
 * 외관 설정 병합
 * @param {Object} localAppearance - 로컬 외관 설정
 * @param {Object} serverAppearance - 서버 외관 설정
 * @returns {Object} 병합된 외관 설정
 */
function mergeAppearance(localAppearance = {}, serverAppearance = {}) {
  // 외관 설정은 최신 값 우선
  return { ...serverAppearance, ...localAppearance };
}

/**
 * 고급 설정 병합
 * @param {Object} localAdvanced - 로컬 고급 설정
 * @param {Object} serverAdvanced - 서버 고급 설정
 * @returns {Object} 병합된 고급 설정
 */
function mergeAdvanced(localAdvanced = {}, serverAdvanced = {}) {
  // 고급 설정은 최신 값 우선
  return { ...serverAdvanced, ...localAdvanced };
}

module.exports = {
  analyzeConflict,
  mergePages,
  mergeButtons,
  mergeSnippets,
  mergeAppearance,
  mergeAdvanced,
};
