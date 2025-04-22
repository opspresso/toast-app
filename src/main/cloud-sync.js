/**
 * Toast - Cloud Synchronization Module
 *
 * 이 모듈은 Toast-App의 설정(페이지와 버튼 정보 등)을 Toast-Web 서버와 동기화합니다.
 * 사용자가 페이지를 추가/삭제하거나 버튼을 수정할 때 변경사항을 감지하고 서버에 업로드합니다.
 * 공용 API 모듈을 사용하여 구현되었습니다.
 */

// API 공용 모듈 불러오기
const { sync: apiSync } = require('./api');
const { createConfigStore } = require('./config');
let userDataManagerRef = null;

// 동기화 관련 상수
const SYNC_DEBOUNCE_MS = 2000; // 마지막 변경 후 2초 후에 동기화
const PERIODIC_SYNC_INTERVAL_MS = 15 * 60 * 1000; // 15분마다 자동 동기화
let syncTimer = null;
let periodicSyncTimer = null;
let syncEnabled = true;

// 전역 참조 저장
let configStore = null;
let authManagerRef = null;

/**
 * 사용자 데이터 관리자 참조 설정
 * @param {Object} userDataManager - 사용자 데이터 관리자 객체
 */
function setUserDataManager(userDataManager) {
  userDataManagerRef = userDataManager;
  console.log('Cloud Sync: 사용자 데이터 관리자 참조 설정 완료');
}

/**
 * 주기적인 설정 동기화 시작
 */
function startPeriodicSync() {
  // 이미 실행 중인 타이머가 있으면 중지
  stopPeriodicSync();

  console.log(`주기적 동기화 시작 (${Math.floor(PERIODIC_SYNC_INTERVAL_MS / 60000)}분 간격)`);

  // 첫 실행은 1분 후부터 (앱 시작 시 부하 분산)
  periodicSyncTimer = setTimeout(async function runPeriodicSync() {
    // 활성화 상태 및 인증 상태 확인
    if (syncEnabled && authManagerRef) {
      const canSync = await isCloudSyncEnabled();
      if (canSync) {
        console.log('주기적 설정 동기화 수행 중...');

        // 구독 정보 갱신
        try {
          const token = await authManagerRef.getAccessToken();
          if (token) {
            console.log('구독 정보 갱신 중...');
            const subscription = await authManagerRef.fetchSubscription();
            console.log('구독 정보 갱신 완료');
          }
        } catch (error) {
          console.error('주기적 구독 정보 갱신 오류:', error);
        }

        // 설정 동기화
        try {
          const result = await downloadSettings();
          if (result.success) {
            console.log('주기적 설정 동기화 성공');
          } else {
            console.error('주기적 설정 동기화 실패:', result.error);
          }
        } catch (error) {
          console.error('주기적 설정 동기화 오류:', error);
        }
      } else {
        console.log('주기적 동기화 건너뜀: 클라우드 동기화 비활성화 상태');
      }
    } else {
      console.log('주기적 동기화 건너뜀: 동기화 기능 비활성화 또는 인증되지 않음');
    }

    // 다음 실행 예약
    periodicSyncTimer = setTimeout(runPeriodicSync, PERIODIC_SYNC_INTERVAL_MS);
  }, 60000); // 첫 실행은 1분 후
}

/**
 * 주기적인 설정 동기화 중지
 */
function stopPeriodicSync() {
  if (periodicSyncTimer) {
    clearTimeout(periodicSyncTimer);
    periodicSyncTimer = null;
    console.log('주기적 동기화 중지됨');
  }
}

/**
 * 클라우드 동기화 초기화 - authManager에서 호출됨
 * @returns {Object} 동기화 관리자 객체
 */
function initCloudSync() {
  // 설정 스토어 생성
  configStore = createConfigStore();

  // 페이지 설정 변경 감지
  const unsubscribePages = configStore.onDidChange('pages', async (newValue, oldValue) => {
    // ==========================================
    // 시점 2-4: 페이지 추가/삭제 및 버튼 수정 시 클라우드 싱크
    // ==========================================

    // 동기화가 비활성화되었거나 로그인하지 않은 경우 동기화 스킵
    if (!syncEnabled) {
      console.log('동기화 비활성화됨, 설정 변경 무시');
      return;
    }

    // 구독 및 동기화 가능 여부 확인
    const canSync = await isCloudSyncEnabled();
    if (!canSync) {
      console.log('클라우드 동기화 비활성화됨: 인증되지 않았거나 구독이 없음');
      return;
    }

    // 변경 유형 감지 (페이지 추가, 삭제, 버튼 수정)
    let changeType = '알 수 없는 변경';
    let changeDetails = '';

    if (Array.isArray(newValue) && Array.isArray(oldValue)) {
      // 시점 2: 페이지 추가 감지
      if (newValue.length > oldValue.length) {
        changeType = '페이지 추가';
        const addedPages = newValue.filter(page =>
          !oldValue.some(oldPage => oldPage.id === page.id)
        );
        if (addedPages.length > 0) {
          changeDetails = `추가된 페이지: ${addedPages.map(p => p.name).join(', ')}`;
        }
      }
      // 시점 3: 페이지 삭제 감지
      else if (newValue.length < oldValue.length) {
        changeType = '페이지 삭제';
        const removedPages = oldValue.filter(page =>
          !newValue.some(newPage => newPage.id === page.id)
        );
        if (removedPages.length > 0) {
          changeDetails = `삭제된 페이지: ${removedPages.map(p => p.name).join(', ')}`;
        }
      }
      // 시점 4: 버튼 수정 감지 (페이지 수는 같지만 내용이 다름)
      else if (newValue.length === oldValue.length) {
        changeType = '버튼 수정';

        // 수정된 페이지 찾기
        const modifiedPageIndexes = [];
        for (let i = 0; i < newValue.length; i++) {
          const newPage = newValue[i];
          const oldPage = oldValue[i];

          // 페이지 내용 비교 (버튼 개수 또는 버튼 내용 변경 확인)
          if (JSON.stringify(newPage) !== JSON.stringify(oldPage)) {
            modifiedPageIndexes.push(i);
          }
        }

        if (modifiedPageIndexes.length > 0) {
          changeDetails = `수정된 페이지: ${modifiedPageIndexes.map(idx => newValue[idx].name).join(', ')}`;
        }
      }
    }

    console.log(`페이지 설정 변경 감지됨 (${changeType}): ${changeDetails}, 동기화 예약...`);

    // 사용자 설정 파일 업데이트
    if (userDataManagerRef) {
      try {
        // 현재 설정 정보 가져오기
        const currentSettings = await userDataManagerRef.getUserSettings();
        if (currentSettings) {
          // 현재 설정에 업데이트된 pages 정보 병합
          const updatedSettings = {
            ...currentSettings,
            pages: newValue
          };

          // 설정 정보 파일에 저장
          userDataManagerRef.updateSettings(updatedSettings);
          console.log('로컬 설정 파일 업데이트 완료');
        }
      } catch (error) {
        console.error('설정 파일 업데이트 오류:', error);
      }
    }

    // 디바운스 처리: 연속적인 변경이 있을 경우 마지막 변경 후 2초 후에 동기화
    clearTimeout(syncTimer);
    syncTimer = setTimeout(async () => {
      console.log(`변경 유형 '${changeType}'에 대한 설정 업로드 시작...`);
      const result = await uploadSettings();
      if (result.success) {
        console.log(`'${changeType}' 변경에 대한 클라우드 동기화 성공!`);
      } else {
        console.error(`'${changeType}' 변경에 대한 클라우드 동기화 실패:`, result.error);
      }
    }, SYNC_DEBOUNCE_MS);
  });

  // 인터페이스 객체 생성
  const syncManager = {
    // auth-manager.js가 기대하는 인터페이스
    unsubscribe: () => {
      unsubscribePages();
      stopPeriodicSync();
    },
    enable: () => {
      syncEnabled = true;
      console.log('클라우드 동기화 활성화됨');
      startPeriodicSync(); // 동기화 활성화 시 주기적 동기화 시작
    },
    disable: () => {
      syncEnabled = false;
      console.log('클라우드 동기화 비활성화됨');
      stopPeriodicSync(); // 동기화 비활성화 시 주기적 동기화 중지
    },
    getLastSyncStatus: () => apiSync.getLastSyncStatus(),
    syncAfterLogin: async () => {
      console.log('로그인 후 클라우드 동기화 수행 중...');
      // 로그인 후에는 기본적으로 다운로드 우선 (서버 데이터 우선)
      const result = await downloadSettings();

      // 로그인 성공 시 주기적 동기화 시작
      if (syncEnabled) {
        startPeriodicSync();
      }

      return result;
    },
    manualSync: async (action = 'resolve') => {
      console.log(`수동 동기화 요청: ${action}`);
      return await syncSettings(action);
    },
    // 추가 인터페이스
    startPeriodicSync,
    stopPeriodicSync
  };

  return syncManager;
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
  if (!authManagerRef) {
    console.log('인증 관리자 참조가 없습니다.');
    return false;
  }

  // 공용 모듈을 사용하여 동기화 가능 여부 확인
  try {
    return await apiSync.isCloudSyncEnabled({
      hasValidToken: authManagerRef.hasValidToken,
      configStore
    });
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
  console.log('설정 업로드 시작...');

  // 동기화가 비활성화 상태면 스킵
  if (!syncEnabled) {
    console.log('클라우드 동기화 비활성화됨, 업로드 스킵');
    return { success: false, error: 'Cloud sync disabled' };
  }

  if (!authManagerRef) {
    console.log('인증 관리자 참조가 없습니다.');
    return { success: false, error: '인증 관리자 초기화되지 않음' };
  }

  // 공용 모듈을 사용하여 설정 업로드
  try {
    return await apiSync.uploadSettings({
      hasValidToken: authManagerRef.hasValidToken,
      onUnauthorized: refreshToken,
      configStore
    });
  } catch (error) {
    console.error('설정 업로드 오류:', error);
    return {
      success: false,
      error: error.message || '알 수 없는 오류'
    };
  }
}

/**
 * 서버에서 설정 다운로드
 * @returns {Promise<Object>} 다운로드 결과
 */
async function downloadSettings() {
  console.log('설정 다운로드 시작...');

  // 동기화가 비활성화 상태면 스킵
  if (!syncEnabled) {
    console.log('클라우드 동기화 비활성화됨, 다운로드 스킵');
    return { success: false, error: 'Cloud sync disabled' };
  }

  if (!authManagerRef) {
    console.log('인증 관리자 참조가 없습니다.');
    return { success: false, error: '인증 관리자 초기화되지 않음' };
  }

  // 공용 모듈을 사용하여 설정 다운로드
  try {
    return await apiSync.downloadSettings({
      hasValidToken: authManagerRef.hasValidToken,
      onUnauthorized: refreshToken,
      configStore
    });
  } catch (error) {
    console.error('설정 다운로드 오류:', error);
    return {
      success: false,
      error: error.message || '알 수 없는 오류'
    };
  }
}

/**
 * 토큰 갱신 콜백 함수
 * @returns {Promise<Object>} 토큰 갱신 결과
 */
async function refreshToken() {
  try {
    // authManager를 통해 토큰 갱신
    if (authManagerRef && typeof authManagerRef.refreshAccessToken === 'function') {
      return await authManagerRef.refreshAccessToken();
    }
    return { success: false, error: '토큰 갱신 함수가 없음' };
  } catch (error) {
    return { success: false, error: error.message || '토큰 갱신 오류' };
  }
}

/**
 * 수동 동기화 수행
 * @param {string} action - 동기화 액션 ('upload', 'download', 'resolve')
 * @returns {Promise<Object>} 동기화 결과
 */
async function syncSettings(action = 'resolve') {
  console.log(`수동 동기화 요청: ${action}`);

  if (!authManagerRef) {
    console.log('인증 관리자 참조가 없습니다.');
    return { success: false, error: '인증 관리자 초기화되지 않음' };
  }

  // 공용 모듈을 사용하여 수동 동기화 수행
  try {
    return await apiSync.manualSync({
      action,
      hasValidToken: authManagerRef.hasValidToken,
      onUnauthorized: refreshToken,
      configStore
    });
  } catch (error) {
    console.error('수동 동기화 오류:', error);
    return {
      success: false,
      error: error.message || '알 수 없는 오류'
    };
  }
}

module.exports = {
  initCloudSync,
  setAuthManager,
  setUserDataManager,
  updateCloudSyncSettings,
  startPeriodicSync,
  stopPeriodicSync
};
