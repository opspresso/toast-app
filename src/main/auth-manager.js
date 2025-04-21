/**
 * Toast App - Authentication Manager Module
 *
 * 설정 창과 토스트 창 간의 인증 상태 동기화를 위한 모듈입니다.
 * 로그인/로그아웃 처리를 중앙화하고 양쪽 창에 이벤트를 전송합니다.
 * 공용 API 모듈을 사용하여 구현되었습니다.
 */

const auth = require('./auth');
const cloudSync = require('./cloud-sync');
const { createConfigStore } = require('./config');

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
    hasValidToken,
    refreshAccessToken: () => auth.refreshAccessToken()
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

        // ==========================================
        // 시점 1: 사용자 로그인 성공 시 클라우드 싱크
        // ==========================================
        console.log('로그인 성공 후 클라우드 동기화 시작');

        // 1. cloud_sync 기능 상태 확인 및 설정
        let hasSyncFeature = false;

        // features 객체가 있는지 확인
        if (result.subscription?.features && typeof result.subscription.features === 'object') {
          hasSyncFeature = result.subscription.features.cloud_sync === true;
          console.log('구독 정보의 features에서 cloud_sync 기능 확인:', hasSyncFeature);
        }
        // features_array 배열에서 확인 (대체 방법)
        else if (Array.isArray(result.subscription?.features_array)) {
          hasSyncFeature = result.subscription.features_array.includes('cloud_sync');
          console.log('구독 정보의 features_array에서 cloud_sync 기능 확인:', hasSyncFeature);
        }
        // 구독자는 기본적으로 cloud_sync 가능
        else if (result.subscription?.isSubscribed === true ||
                 result.subscription?.active === true ||
                 result.subscription?.is_subscribed === true) {
          hasSyncFeature = true;
          console.log('구독 상태가 활성화되어 있어 cloud_sync 기능 활성화');
        }

        // 구독 정보에 cloud_sync 기능 강제 추가 (디버깅용)
        if (result.subscription && typeof result.subscription === 'object') {
          // 기존 구독 정보 복사
          const updatedSubscription = { ...result.subscription };

          // features 객체가 없으면 생성
          if (!updatedSubscription.features || typeof updatedSubscription.features !== 'object') {
            updatedSubscription.features = {};
          }

          // cloud_sync 기능 설정
          updatedSubscription.features.cloud_sync = hasSyncFeature;

          // 설정 저장소에 업데이트된 구독 정보 저장
          const config = createConfigStore();
          config.set('subscription', updatedSubscription);
          console.log('업데이트된 구독 정보 저장됨:', JSON.stringify(updatedSubscription));
        }

        console.log('클라우드 동기화 기능 상태 설정:', hasSyncFeature);
        cloudSync.updateCloudSyncSettings(hasSyncFeature);

        // 2. 서버에서 최신 데이터 다운로드 (서버 데이터 우선)
        if (hasSyncFeature) {
          console.log('클라우드 동기화 기능이 활성화되어 있습니다. 서버에서 설정 가져오는 중...');
          // 페이지 설정 동기화 시작
          syncManager.syncAfterLogin().then(syncResult => {
            console.log('로그인 후 클라우드 동기화 결과:', syncResult);

            if (syncResult && syncResult.success) {
              // 설정 동기화 성공 시 양쪽 창에 알림
              notifySettingsSynced();
            } else {
              console.log('로그인 후 동기화 실패:', syncResult?.error || '알 수 없는 오류');
            }
          });
        } else {
          console.log('클라우드 동기화 기능이 비활성화되어 있습니다. 구독 상태를 확인하세요.');
        }
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
 * 토큰 갱신
 * @returns {Promise<Object>} 갱신 결과
 */
async function refreshAccessToken() {
  return await auth.refreshAccessToken();
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

    if (result && result.success) {
      notifySettingsSynced();
      return true;
    }

    return false;
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
  refreshAccessToken,
  notifyLoginSuccess,
  notifyLoginError,
  notifyLogout,
  notifyAuthStateChange,
  notifySettingsSynced,
  syncSettings,
  updateSyncSettings
};
