/**
 * Toast API - API 모듈 통합 인덱스
 *
 * 모든 API 관련 모듈을 통합하여 내보냅니다.
 */

const client = require('./client');
const auth = require('./auth');
const sync = require('./sync');

module.exports = {
  // API 클라이언트 기본 모듈
  client,

  // 인증 관련 API 모듈
  auth,

  // 설정 동기화 API 모듈
  sync
};
