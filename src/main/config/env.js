/**
 * Toast - 환경 변수 로드 모듈
 *
 * 이 모듈은 .env 파일에서 환경 변수를 로드합니다.
 */

const path = require('path');
const dotenv = require('dotenv');
const fs = require('fs');

/**
 * 환경 변수를 로드합니다.
 * 우선순위: .env.local (로컬 개발 환경) > .env (기본 환경)
 */
function loadEnv() {
  try {
    const configDir = path.join(__dirname); // src/main/config 디렉토리

    // 기본 .env 파일 로드
    const defaultEnvPath = path.join(configDir, '.env');
    if (fs.existsSync(defaultEnvPath)) {
      dotenv.config({ path: defaultEnvPath });
      console.log('환경 변수 기본 설정이 로드되었습니다.');
    }

    // .env.local 파일이 있는 경우 추가로 로드 (우선 적용)
    const localEnvPath = path.join(configDir, '.env.local');
    if (fs.existsSync(localEnvPath)) {
      dotenv.config({ path: localEnvPath });
      console.log('환경 변수 로컬 설정이 로드되었습니다.');
    }

    return true;
  } catch (error) {
    console.error('환경 변수 로드 중 오류 발생:', error);
    return false;
  }
}

/**
 * 환경 변수 값을 가져옵니다.
 * @param {string} key - 환경 변수 키
 * @param {string} defaultValue - 기본값 (변수가 없을 경우)
 * @returns {string} 환경 변수 값 또는 기본값
 */
function getEnv(key, defaultValue = '') {
  return process.env[key] || defaultValue;
}

module.exports = {
  loadEnv,
  getEnv
};
