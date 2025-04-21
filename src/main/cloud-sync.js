/**
 * Toast - Cloud Synchronization Module
 *
 * 이 모듈은 Toast-App의 설정(페이지와 버튼 정보 등)을 Toast-Web 서버와 동기화합니다.
 * 사용자가 페이지를 추가/삭제하거나 버튼을 수정할 때 변경사항을 감지하고 서버에 업로드합니다.
 */

const axios = require('axios');
const { getEnv } = require('./config/env');
const os = require('os');
const { createConfigStore } = require('./config');

// 환경 변수로부터 서버 URL 가져오기
const TOAST_URL = getEnv('TOAST_URL', 'https://web.toast.sh');
const SETTINGS_API_URL = `${TOAST_URL}/api/users/settings`;

// 동기화 관련 상수
const SYNC_DEBOUNCE_MS = 2000; // 마지막 변경 후 2초 후에 동기화
let syncTimer = null;
let lastSyncTime = 0;
let isSyncing = false;
let syncEnabled = true;

// 마지막 동기화 상태 정보
let lastSyncStatus = {
  success: false,
  timestamp: 0,
  error: null
};

// 전역 참조 저장
let configStore = null;
let authManagerRef = null;

/**
 * 클라우드 동기화 초기화 - authManager에서 호출됨
 * @returns {Object} 동기화 관리자 객체
 */
function initCloudSync() {
  // 설정 스토어 생성
  configStore = createConfigStore();

  // 페이지 설정 변경 감지
  const unsubscribePages = configStore.onDidChange('pages', async (newValue, oldValue) => {
    // 동기화가 비활성화되었거나 로그인하지 않은 경우 동기화 스킵
    if (!syncEnabled) {
      console.log('동기화 비활성화됨, 설정 변경 무시');
      return;
    }

    // 설정이 서버에서 다운로드된 경우 다시 업로드하지 않음 (루프 방지)
    if (Date.now() - lastSyncTime < 1000) {
      console.log('다운로드한 설정 감지됨, 동기화 스킵');
      return;
    }

    // 구독 및 동기화 가능 여부 확인
    const canSync = await isCloudSyncEnabled();
    if (!canSync) {
      console.log('클라우드 동기화 비활성화됨: 인증되지 않았거나 구독이 없음');
      return;
    }

    console.log('페이지 설정 변경 감지됨, 동기화 예약...');

    // 디바운스 처리: 연속적인 변경이 있을 경우 마지막 변경 후 2초 후에 동기화
    clearTimeout(syncTimer);
    syncTimer = setTimeout(async () => {
      await uploadSettings();
    }, SYNC_DEBOUNCE_MS);
  });

  return {
    // auth-manager.js가 기대하는 인터페이스
    unsubscribe: () => {
      unsubscribePages();
    },
    enable: () => {
      syncEnabled = true;
      console.log('클라우드 동기화 활성화됨');
    },
    disable: () => {
      syncEnabled = false;
      console.log('클라우드 동기화 비활성화됨');
    },
    getLastSyncStatus: () => ({ ...lastSyncStatus }),
    syncAfterLogin: async () => {
      console.log('로그인 후 클라우드 동기화 수행 중...');
      // 로그인 후에는 기본적으로 다운로드 우선 (서버 데이터 우선)
      return await downloadSettings();
    },
    manualSync: async (action = 'resolve') => {
      console.log(`수동 동기화 요청: ${action}`);
      if (action === 'upload') {
        return await uploadSettings();
      } else if (action === 'download') {
        return await downloadSettings();
      } else {
        // 'resolve' - 가장 최신 데이터 사용 (기본 동작)
        // 여기서는 간단하게 다운로드 우선으로 구현
        return await downloadSettings();
      }
    }
  };
}

/**
 * 인증 관리자 참조 설정 - 초기화 이후 호출 필요
 * @param {Object} authManager - 인증 관리자 인스턴스
 */
function setAuthManager(authManager) {
  authManagerRef = authManager;
}

/**
 * 클라우드 동기화 설정 업데이트
 * @param {boolean} enabled - 동기화 활성화 여부
 */
function updateCloudSyncSettings(enabled) {
  syncEnabled = enabled;
  console.log(`클라우드 동기화 ${enabled ? '활성화' : '비활성화'}`);
}

/**
 * 클라우드 동기화 가능 여부 확인
 * @returns {Promise<boolean>} 동기화 가능 여부
 */
async function isCloudSyncEnabled() {
  try {
    if (!authManagerRef) {
      return false;
    }

    // 인증 여부 확인
    const isAuthenticated = await authManagerRef.hasValidToken();
    if (!isAuthenticated) {
      return false;
    }

    // 구독 정보 확인
    const subscription = configStore.get('subscription') || {};
    const features = subscription.features || {};

    // cloud_sync 기능이 활성화되어 있는지 확인
    return features.cloud_sync === true;
  } catch (error) {
    console.error('동기화 가능 여부 확인 오류:', error);
    return false;
  }
}

/**
 * 현재 설정을 서버에 업로드
 * @returns {Promise<Object>} 업로드 결과
 */
async function uploadSettings() {
  // 동기화 비활성화 상태면 스킵
  if (!syncEnabled) {
    console.log('클라우드 동기화 비활성화됨, 업로드 스킵');
    return { success: false, error: 'Cloud sync disabled' };
  }

  // 이미 동기화 중이면 스킵
  if (isSyncing) {
    console.log('이미 동기화 중, 요청 스킵됨');
    return { success: false, error: 'Already syncing' };
  }

  isSyncing = true;

  try {
    if (!authManagerRef) {
      throw new Error('인증 관리자가 초기화되지 않음');
    }

    // 액세스 토큰 가져오기
    const token = await authManagerRef.getAccessToken();
    if (!token) {
      throw new Error('액세스 토큰을 가져올 수 없음');
    }

    // 페이지 설정 가져오기
    const pages = configStore.get('pages') || [];
    const deviceInfo = getDeviceInfo();

    // 서버에 설정 업로드
    console.log(`서버에 ${pages.length}개 페이지 설정 업로드 중...`);

    const response = await axios.put(SETTINGS_API_URL, {
      pages,
      lastSyncedDevice: deviceInfo,
      lastSyncedAt: Date.now()
    }, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    // 동기화 완료 시간 기록
    lastSyncTime = Date.now();
    lastSyncStatus = {
      success: true,
      timestamp: lastSyncTime,
      error: null
    };

    console.log('페이지 설정 업로드 성공:', response.data);
    return { success: true, data: response.data };
  } catch (error) {
    console.error('페이지 설정 업로드 오류:', error);

    lastSyncStatus = {
      success: false,
      timestamp: Date.now(),
      error: error.message || '알 수 없는 오류'
    };

    return {
      success: false,
      error: error.message || '알 수 없는 오류'
    };
  } finally {
    isSyncing = false;
  }
}

/**
 * 서버에서 설정 다운로드
 * @returns {Promise<Object>} 다운로드 결과
 */
async function downloadSettings() {
  // 동기화 비활성화 상태면 스킵
  if (!syncEnabled) {
    console.log('클라우드 동기화 비활성화됨, 다운로드 스킵');
    return { success: false, error: 'Cloud sync disabled' };
  }

  // 이미 동기화 중이면 스킵
  if (isSyncing) {
    console.log('이미 동기화 중, 다운로드 스킵됨');
    return { success: false, error: 'Already syncing' };
  }

  isSyncing = true;

  try {
    if (!authManagerRef) {
      throw new Error('인증 관리자가 초기화되지 않음');
    }

    // 액세스 토큰 가져오기
    const token = await authManagerRef.getAccessToken();
    if (!token) {
      throw new Error('액세스 토큰을 가져올 수 없음');
    }

    // 서버에서 설정 다운로드
    console.log('서버에서 설정 다운로드 중...');

    const response = await axios.get(SETTINGS_API_URL, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    const settings = response.data;

    // 유효성 검사
    if (!settings || !settings.data || !Array.isArray(settings.data.pages)) {
      throw new Error('유효하지 않은 설정 데이터');
    }

    // 서버에서 받은 페이지 설정을 로컬에 적용
    lastSyncTime = Date.now();
    configStore.set('pages', settings.data.pages);

    lastSyncStatus = {
      success: true,
      timestamp: lastSyncTime,
      error: null
    };

    console.log('설정 다운로드 성공:', settings);
    return { success: true, data: settings };
  } catch (error) {
    console.error('설정 다운로드 오류:', error);

    lastSyncStatus = {
      success: false,
      timestamp: Date.now(),
      error: error.message || '알 수 없은 오류'
    };

    return {
      success: false,
      error: error.message || '알 수 없는 오류'
    };
  } finally {
    isSyncing = false;
  }
}

/**
 * 현재 장치 정보 가져오기
 * @returns {string} 장치 정보 문자열
 */
function getDeviceInfo() {
  const platform = process.platform;
  const hostname = os.hostname();
  const username = os.userInfo().username;

  return `${platform}-${hostname}-${username}`;
}

module.exports = {
  initCloudSync,
  setAuthManager,
  updateCloudSyncSettings
};
