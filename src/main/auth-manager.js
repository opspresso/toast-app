/**
 * Toast App - Authentication Manager Module
 *
 * 설정 창과 토스트 창 간의 인증 상태 동기화를 위한 모듈입니다.
 * 로그인/로그아웃 처리를 중앙화하고 양쪽 창에 이벤트를 전송합니다.
 */

const auth = require('./auth');
const cloudSync = require('./cloud-sync');

// 창 참조 저장
let windows = null;
// 클라우드 동기화 객체
let syncManager = null;

/**
 * 인증 관리자 초기화
 * @param {Object} windowsRef - 애플리케이션 창 참조 객체
 */
function initialize(windowsRef) {
  windows = windowsRef;

  // 클라우드 동기화 초기화
  syncManager = cloudSync.initCloudSync();

  // authManager 참조 설정 - 순환 참조를 피하기 위해 필요한 메서드만 포함한 객체 전달
  cloudSync.setAuthManager({
    getAccessToken,
    hasValidToken
  });
}

/**
 * 로그인 프로세스 시작
 * @returns {Promise<boolean>} 프로세스 시작 성공 여부
 */
async function initiateLogin() {
  try {
    return await auth.initiateLogin();
  } catch (error) {
    console.error('Error initiating login:', error);
    return false;
  }
}

/**
 * 인증 코드로 토큰 교환
 * @param {string} code - OAuth 인증 코드
 * @returns {Promise<Object>} 토큰 교환 결과
 */
async function exchangeCodeForToken(code) {
  try {
    const result = await auth.exchangeCodeForToken(code);
    return result;
  } catch (error) {
    console.error('Error exchanging code for token:', error);
    return {
      success: false,
      error: error.message || 'Failed to exchange code for token'
    };
  }
}

/**
 * 인증 코드를 토큰으로 교환하고 구독 정보 업데이트
 * @param {string} code - OAuth 인증 코드
 * @returns {Promise<Object>} 처리 결과
 */
async function exchangeCodeForTokenAndUpdateSubscription(code) {
  try {
    const result = await auth.exchangeCodeForTokenAndUpdateSubscription(code);

    // 로그인 성공 시 양쪽 창에 알림
    if (result.success) {
      notifyLoginSuccess(result.subscription);

      // 로그인 성공 시 계정 정보 로깅 및 클라우드 동기화 수행
      if (syncManager) {
        const userEmail = result.subscription?.userId || 'unknown';
        const userName = result.subscription?.name || 'unknown user';
        const userPlan = result.subscription?.plan || 'free';
        const isVip = result.subscription?.isVip || false;

        console.log('====== 계정 정보 ======');
        console.log('사용자 이메일:', userEmail);
        console.log('사용자 이름:', userName);
        console.log('구독 플랜:', userPlan);
        console.log('VIP 상태:', isVip ? 'VIP 사용자' : '일반 사용자');
        console.log('=======================');
        console.log('로그인 성공 후 클라우드 동기화 시작');

        // cloud_sync 기능 상태 확인 및 설정
        const hasSyncFeature = result.subscription?.features?.cloud_sync === true;
        cloudSync.updateCloudSyncSettings(hasSyncFeature);

        // 페이지 설정 동기화 시작
        syncManager.syncAfterLogin().then(syncResult => {
          console.log('로그인 후 클라우드 동기화 결과:', syncResult);

          if (syncResult) {
            // 설정 동기화 성공 시 양쪽 창에 알림
            notifySettingsSynced();
          }
        });
      }
    } else {
      notifyLoginError(result.error || 'Unknown error');
    }

    return result;
  } catch (error) {
    console.error('Error in exchangeCodeForTokenAndUpdateSubscription:', error);

    // 오류 발생 시 양쪽 창에 알림
    notifyLoginError(error.message || 'Unknown error');

    return {
      success: false,
      error: error.message || 'Unknown error'
    };
  }
}

/**
 * 로그아웃 처리 (로컬 토큰만 삭제)
 * @returns {Promise<boolean>} 로그아웃 성공 여부
 */
async function logout() {
  try {
    const result = await auth.logout();

    // 로그아웃 성공 시 클라우드 동기화 설정 업데이트
    if (result && syncManager) {
      cloudSync.updateCloudSyncSettings(false);
    }

    // 로그아웃 성공 시 양쪽 창에 알림
    if (result) {
      notifyLogout();
    }

    return result;
  } catch (error) {
    console.error('Error logging out:', error);
    return false;
  }
}

/**
 * 로그아웃 및 페이지 그룹 설정 초기화
 * @returns {Promise<boolean>} 로그아웃 성공 여부
 */
async function logoutAndResetPageGroups() {
  try {
    const result = await auth.logoutAndResetPageGroups();

    // 로그아웃 성공 시 양쪽 창에 알림
    if (result) {
      notifyLogout();
    }

    return result;
  } catch (error) {
    console.error('Error in logoutAndResetPageGroups:', error);
    return false;
  }
}

/**
 * 사용자 프로필 정보 가져오기
 * @returns {Promise<Object>} 사용자 프로필 정보
 */
async function fetchUserProfile() {
  return await auth.fetchUserProfile();
}

/**
 * 구독 정보 가져오기
 * @returns {Promise<Object>} 구독 정보
 */
async function fetchSubscription() {
  return await auth.fetchSubscription();
}

/**
 * 현재 인증 토큰 가져오기
 * @returns {Promise<string|null>} 인증 토큰 또는 null
 */
async function getAccessToken() {
  return await auth.getAccessToken();
}

/**
 * 유효한 토큰이 있는지 확인
 * @returns {Promise<boolean>} 토큰 유효 여부
 */
async function hasValidToken() {
  return await auth.hasValidToken();
}

/**
 * 로그인 성공 알림을 양쪽 창에 전송
 * @param {Object} subscription - 구독 정보
 */
function notifyLoginSuccess(subscription) {
  if (!windows) return;

  const loginData = {
    isAuthenticated: true,
    isSubscribed: subscription?.active || subscription?.is_subscribed || false,
    pageGroups: subscription?.features?.page_groups || 3
  };

  // 토스트 창에 알림
  if (windows.toast && !windows.toast.isDestroyed()) {
    windows.toast.webContents.send('login-success', loginData);
  }

  // 설정 창에 알림
  if (windows.settings && !windows.settings.isDestroyed()) {
    windows.settings.webContents.send('login-success', loginData);
  }

  console.log('Login success notification sent to both windows');
}

/**
 * 로그인 오류 알림을 양쪽 창에 전송
 * @param {string} errorMessage - 오류 메시지
 */
function notifyLoginError(errorMessage) {
  if (!windows) return;

  const errorData = {
    error: errorMessage,
    message: '인증에 실패했습니다: ' + errorMessage
  };

  // 토스트 창에 알림
  if (windows.toast && !windows.toast.isDestroyed()) {
    windows.toast.webContents.send('login-error', errorData);
  }

  // 설정 창에 알림
  if (windows.settings && !windows.settings.isDestroyed()) {
    windows.settings.webContents.send('login-error', errorData);
  }

  console.log('Login error notification sent to both windows');
}

/**
 * 로그아웃 알림을 양쪽 창에 전송
 */
function notifyLogout() {
  if (!windows) return;

  // 토스트 창에 알림
  if (windows.toast && !windows.toast.isDestroyed()) {
    windows.toast.webContents.send('logout-success', {});
  }

  // 설정 창에 알림
  if (windows.settings && !windows.settings.isDestroyed()) {
    windows.settings.webContents.send('logout-success', {});
  }

  console.log('Logout notification sent to both windows');
}

/**
 * 설정 동기화 알림을 양쪽 창에 전송
 */
function notifySettingsSynced() {
  if (!windows) return;

  const syncData = {
    success: true,
    message: '설정이 클라우드와 성공적으로 동기화되었습니다.'
  };

  // 토스트 창에 알림
  if (windows.toast && !windows.toast.isDestroyed()) {
    windows.toast.webContents.send('settings-synced', syncData);
  }

  // 설정 창에 알림
  if (windows.settings && !windows.settings.isDestroyed()) {
    windows.settings.webContents.send('settings-synced', syncData);
  }

  console.log('설정 동기화 알림 전송 완료');
}

/**
 * 수동 동기화 요청 처리
 * @param {string} action - 동기화 액션 ('upload', 'download', 'resolve')
 * @returns {Promise<boolean>} 동기화 성공 여부
 */
async function syncSettings(action = 'resolve') {
  try {
    if (!syncManager) {
      return false;
    }

    const result = await syncManager.manualSync(action);

    if (result) {
      notifySettingsSynced();
    }

    return result;
  } catch (error) {
    console.error('수동 동기화 오류:', error);
    return false;
  }
}

/**
 * 클라우드 동기화 설정 업데이트
 * @param {boolean} enabled - 동기화 활성화 여부
 * @returns {boolean} 설정 변경 성공 여부
 */
function updateSyncSettings(enabled) {
  try {
    if (!syncManager) {
      return false;
    }

    if (enabled) {
      syncManager.enable();
    } else {
      syncManager.disable();
    }

    return true;
  } catch (error) {
    console.error('동기화 설정 변경 오류:', error);
    return false;
  }
}

/**
 * 인증 상태 변경 알림을 양쪽 창에 전송
 * @param {Object} authState - 인증 상태 정보
 */
function notifyAuthStateChange(authState) {
  if (!windows) return;

  // 토스트 창에 알림
  if (windows.toast && !windows.toast.isDestroyed()) {
    windows.toast.webContents.send('auth-state-changed', authState);
  }

  // 설정 창에 알림
  if (windows.settings && !windows.settings.isDestroyed()) {
    windows.settings.webContents.send('auth-state-changed', authState);
  }

  console.log('Auth state change notification sent to both windows');
}

module.exports = {
  initialize,
  initiateLogin,
  exchangeCodeForToken,
  exchangeCodeForTokenAndUpdateSubscription,
  logout,
  logoutAndResetPageGroups,
  fetchUserProfile,
  fetchSubscription,
  getAccessToken,
  hasValidToken,
  notifyLoginSuccess,
  notifyLoginError,
  notifyLogout,
  notifyAuthStateChange,
  notifySettingsSynced,
  syncSettings,
  updateSyncSettings
};
