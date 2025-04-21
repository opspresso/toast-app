/**
 * Toast App - Authentication Module
 *
 * OAuth 2.0 인증과 구독 관리를 위한 모듈입니다.
 * 공용 API 모듈을 사용하여 구현되었습니다.
 */

const { app, shell } = require('electron');
const path = require('path');
const os = require('os');
const fs = require('fs');
const { createConfigStore } = require('./config');

// API 공용 모듈 불러오기
const { client, auth: apiAuth } = require('./api');

// 토큰 저장 파일 경로 설정
const USER_DATA_PATH = app.getPath('userData');
const TOKEN_FILE_PATH = path.join(USER_DATA_PATH, 'auth-tokens.json');

// 토큰 키 상수
const TOKEN_KEY = 'auth-token';
const REFRESH_TOKEN_KEY = 'refresh-token';

// ENV
const { getEnv } = require('./config/env');
const NODE_ENV = getEnv('NODE_ENV', 'development');
const CLIENT_ID = getEnv('CLIENT_ID', NODE_ENV === 'production' ? '' : 'toast-app-client');
const CLIENT_SECRET = getEnv('CLIENT_SECRET', NODE_ENV === 'production' ? '' : 'toast-app-secret');

// 구독 등급에 따른 페이지 그룹 수 상수
const PAGE_GROUPS = {
  ANONYMOUS: 1, // 인증되지 않은 사용자
  AUTHENTICATED: 3, // 인증된 사용자
  PREMIUM: 9 // 구독 또는 VIP 사용자
};

console.log('API 모듈 초기화 완료');

// 토큰을 메모리에 설정
async function initializeTokensFromStorage() {
  try {
    const accessToken = await getStoredToken();
    const refreshToken = await getStoredRefreshToken();

    if (accessToken) {
      client.setAccessToken(accessToken);
    }

    if (refreshToken) {
      client.setRefreshToken(refreshToken);
    }

    return { accessToken, refreshToken };
  } catch (error) {
    console.error('토큰 초기화 중 오류:', error);
    return { accessToken: null, refreshToken: null };
  }
}

/**
 * 로컬 파일에서 토큰 데이터를 읽습니다
 * @returns {Object|null} 토큰 데이터 객체 또는 null
 */
function readTokenFile() {
  try {
    if (!fs.existsSync(TOKEN_FILE_PATH)) {
      return null;
    }

    const data = fs.readFileSync(TOKEN_FILE_PATH, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('토큰 파일 읽기 오류:', error);
    return null;
  }
}

/**
 * 토큰 데이터를 로컬 파일에 저장합니다
 * @param {Object} tokenData - 저장할 토큰 데이터 객체
 * @returns {boolean} 저장 성공 여부
 */
function writeTokenFile(tokenData) {
  try {
    const dirPath = path.dirname(TOKEN_FILE_PATH);

    // 디렉토리가 없으면 생성
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }

    // 파일에 JSON 형태로 저장
    fs.writeFileSync(TOKEN_FILE_PATH, JSON.stringify(tokenData, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('토큰 파일 저장 오류:', error);
    return false;
  }
}

/**
 * 인증 토큰을 로컬 파일에서 가져옵니다
 * @returns {Promise<string|null>} 저장된 토큰이나 없으면 null
 */
async function getStoredToken() {
  try {
    const tokenData = readTokenFile();
    return tokenData ? tokenData[TOKEN_KEY] : null;
  } catch (error) {
    console.error('로컬 파일에서 토큰 가져오기 실패:', error);
    return null;
  }
}

/**
 * 리프레시 토큰을 로컬 파일에서 가져옵니다
 * @returns {Promise<string|null>} 저장된 리프레시 토큰이나 없으면 null
 */
async function getStoredRefreshToken() {
  try {
    const tokenData = readTokenFile();
    return tokenData ? tokenData[REFRESH_TOKEN_KEY] : null;
  } catch (error) {
    console.error('로컬 파일에서 리프레시 토큰 가져오기 실패:', error);
    return null;
  }
}

/**
 * 토큰을 로컬 파일에 저장합니다
 * @param {string} token - 저장할 인증 토큰
 * @returns {Promise<void>}
 */
async function storeToken(token) {
  try {
    // 클라이언트에 토큰 설정
    client.setAccessToken(token);

    // 기존 토큰 데이터 읽기
    const tokenData = readTokenFile() || {};

    // 새 토큰 저장
    tokenData[TOKEN_KEY] = token;

    // 파일에 저장
    if (!writeTokenFile(tokenData)) {
      throw new Error('토큰 파일 저장 실패');
    }
  } catch (error) {
    console.error('토큰 저장 실패:', error);
    throw error;
  }
}

/**
 * 리프레시 토큰을 로컬 파일에 저장합니다
 * @param {string} refreshToken - 저장할 리프레시 토큰
 * @returns {Promise<void>}
 */
async function storeRefreshToken(refreshToken) {
  try {
    // 클라이언트에 리프레시 토큰 설정
    client.setRefreshToken(refreshToken);

    // 기존 토큰 데이터 읽기
    const tokenData = readTokenFile() || {};

    // 새 리프레시 토큰 저장
    tokenData[REFRESH_TOKEN_KEY] = refreshToken;

    // 파일에 저장
    if (!writeTokenFile(tokenData)) {
      throw new Error('리프레시 토큰 파일 저장 실패');
    }
  } catch (error) {
    console.error('리프레시 토큰 저장 실패:', error);
    throw error;
  }
}

/**
 * 토큰과 리프레시 토큰을 로컬 파일에서 삭제합니다
 * @returns {Promise<void>}
 */
async function clearTokens() {
  try {
    // 클라이언트 토큰 초기화
    client.clearTokens();

    // 토큰 파일이 존재하면 삭제
    if (fs.existsSync(TOKEN_FILE_PATH)) {
      fs.unlinkSync(TOKEN_FILE_PATH);
    }
  } catch (error) {
    console.error('토큰 삭제 실패:', error);
    throw error;
  }
}

/**
 * 로그인 프로세스를 시작합니다 (OAuth 인증 페이지 열기)
 * @returns {Promise<boolean>} 프로세스가 시작되었으면 true
 */
async function initiateLogin() {
  try {
    // 공용 모듈을 통해 로그인 URL 생성
    const loginResult = apiAuth.initiateLogin(CLIENT_ID);

    if (!loginResult.success) {
      throw new Error(loginResult.error || '로그인 프로세스 시작 실패');
    }

    // 기본 브라우저에서 인증 페이지 열기
    await shell.openExternal(loginResult.url);

    return true;
  } catch (error) {
    console.error('Failed to initiate login:', error);
    throw error;
  }
}

/**
 * 인증 URL로부터 받은 리디렉션 처리
 * @param {string} url - 리디렉션 URL
 * @returns {Promise<Object>} 처리 결과
 */
async function handleAuthRedirect(url) {
  try {
    console.log('Processing auth redirect:', url);

    // 공용 모듈을 통해 리디렉션 URL 처리
    const redirectResult = await apiAuth.handleAuthRedirect({
      url,
      onCodeExchange: async (code) => {
        // 코드를 토큰으로 교환하고 구독 정보 업데이트
        return await exchangeCodeForTokenAndUpdateSubscription(code);
      }
    });

    // 'reload_auth' 액션 처리
    if (redirectResult.success && redirectResult.action === 'reload_auth') {
      console.log('Auth reload action detected');

      // 토큰이 있는지 확인
      if (!redirectResult.token) {
        console.error('No token provided for auth reload');
        return {
          success: false,
          error: 'Missing token for auth reload'
        };
      }

      // 현재 인증 상태 확인
      const hasToken = await hasValidToken();

      if (hasToken) {
        // 이미 인증된 상태라면 구독 정보만 다시 가져옴
        console.log('Already authenticated, refreshing subscription info');
        const subscription = await fetchSubscription();
        await updatePageGroupSettings(subscription);

        return {
          success: true,
          message: 'Authentication refreshed',
          subscription
        };
      } else {
        // 인증되지 않은 상태라면 로그인 프로세스 시작
        console.log('Not authenticated, initiating login process');
        return await initiateLogin();
      }
    }

    return redirectResult;
  } catch (error) {
    console.error('Failed to handle auth redirect:', error);
    return {
      success: false,
      error: error.message || 'Unknown error'
    };
  }
}

/**
 * 인증 코드를 토큰으로 교환합니다
 * @param {string} code - OAuth 인증 코드
 * @returns {Promise<Object>} 토큰 교환 결과
 */
async function exchangeCodeForToken(code) {
  try {
    console.log('인증 코드를 토큰으로 교환 시작:', code.substring(0, 8) + '...');

    // 공용 모듈을 통해 코드를 토큰으로 교환
    const tokenResult = await apiAuth.exchangeCodeForToken({
      code,
      clientId: CLIENT_ID,
      clientSecret: CLIENT_SECRET
    });

    if (!tokenResult.success) {
      return tokenResult;
    }

    // 토큰 저장
    const { access_token, refresh_token, expires_in } = tokenResult;

    // 안전한 저장소에 토큰 저장
    await storeToken(access_token);
    console.log('액세스 토큰 저장 완료');

    // 리프레시 토큰 저장 (있는 경우)
    if (refresh_token) {
      await storeRefreshToken(refresh_token);
      console.log('리프레시 토큰 저장 완료');
    }

    // 토큰이 정상적으로 저장되었는지 검증
    const storedToken = await getStoredToken();
    if (!storedToken) {
      console.error('토큰 저장 확인 실패. 저장소에서 토큰을 찾을 수 없음');
    } else {
      console.log('토큰 저장 확인 성공');
    }

    return tokenResult;
  } catch (error) {
    console.error('토큰 교환 중 오류 발생:', error);

    return {
      success: false,
      error: error.message || 'Unknown error',
      error_details: error.response?.data
    };
  }
}

/**
 * 리프레시 토큰을 사용하여 새 액세스 토큰을 얻습니다
 * @returns {Promise<object>} 토큰 새로고침 결과 (success: boolean, error?: string)
 */
async function refreshAccessToken() {
  try {
    console.log('토큰 리프레시 프로세스 시작');

    // 리프레시 토큰 가져오기
    const refreshToken = client.getRefreshToken() || await getStoredRefreshToken();

    if (!refreshToken) {
      console.error('리프레시 토큰이 없음');
      return {
        success: false,
        error: 'No refresh token available',
        code: 'NO_REFRESH_TOKEN'
      };
    }

    console.log('리프레시 토큰 존재, 교환 시도 중');

    // 공용 모듈을 통해 리프레시 토큰 교환
    const refreshResult = await apiAuth.refreshAccessToken({
      refreshToken,
      clientId: CLIENT_ID,
      clientSecret: CLIENT_SECRET
    });

    if (!refreshResult.success) {
      // 실패 시 401 오류이면 토큰 초기화
      if (refreshResult.code === 'SESSION_EXPIRED') {
        await clearTokens();
        console.log('만료된 토큰 초기화 완료');
      }

      return refreshResult;
    }

    // 성공 시 새 토큰 저장
    const { access_token, refresh_token } = refreshResult;

    await storeToken(access_token);
    console.log('새 액세스 토큰 저장 완료');

    // 새 리프레시 토큰 저장 (있는 경우)
    if (refresh_token) {
      await storeRefreshToken(refresh_token);
      console.log('새 리프레시 토큰 저장 완료');
    }

    return { success: true };
  } catch (error) {
    console.error('토큰 리프레시 과정 중 예외 발생:', error);

    // 치명적인 오류이지만 앱 실행은 유지
    const errorMessage = error.message || 'Unknown error in refresh token process';
    return {
      success: false,
      error: errorMessage,
      code: 'REFRESH_EXCEPTION'
    };
  }
}

/**
 * 로그아웃 처리 (클라이언트 측에서만 토큰 삭제)
 * @returns {Promise<boolean>} 로그아웃 성공 여부
 */
async function logout() {
  try {
    // 서버 호출 없이 로컬 토큰만 삭제
    await clearTokens();
    console.log('로컬 토큰 삭제 완료');

    return true;
  } catch (error) {
    console.error('Logout error:', error);
    return false;
  }
}

/**
 * 사용자 프로필 정보를 가져옵니다
 * @returns {Promise<Object>} 사용자 프로필 정보
 */
async function fetchUserProfile() {
  try {
    return await apiAuth.fetchUserProfile(refreshAccessToken);
  } catch (error) {
    console.error('프로필 정보 가져오기 오류:', error);
    return {
      error: {
        code: 'PROFILE_ERROR',
        message: error.message || '프로필 정보를 가져올 수 없습니다.'
      }
    };
  }
}

/**
 * 구독 정보를 가져옵니다
 * @returns {Promise<Object>} 구독 정보
 */
async function fetchSubscription() {
  try {
    return await apiAuth.fetchSubscription(refreshAccessToken);
  } catch (error) {
    console.error('구독 정보 가져오기 오류:', error);

    // 기본 구독 정보 반환
    return {
      id: 'sub_free_anonymous',
      userId: 'anonymous',
      plan: 'free',
      status: 'active',
      active: false,
      is_subscribed: false,
      features: {
        page_groups: PAGE_GROUPS.ANONYMOUS
      },
      features_array: ['basic_shortcuts'],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      expiresAt: null,
      subscribed_until: null,
      isVip: false
    };
  }
}

/**
 * 인증 코드를 토큰으로 교환하고 구독 정보를 업데이트합니다
 * @param {string} code - OAuth 인증 코드
 * @returns {Promise<Object>} 처리 결과
 */
async function exchangeCodeForTokenAndUpdateSubscription(code) {
  try {
    // 토큰 교환
    const tokenResult = await exchangeCodeForToken(code);
    if (!tokenResult.success) {
      return tokenResult;
    }

    // 구독 정보 가져오기
    try {
      const subscription = await fetchSubscription();
      console.log('구독 정보 조회 성공');

      // 구독 정보를 config에 저장
      await updatePageGroupSettings(subscription);

      return {
        success: true,
        subscription
      };
    } catch (subError) {
      console.error('구독 정보 조회 실패:', subError);

      // 토큰 교환은 성공했으므로 성공으로 처리하고 경고만 함
      return {
        success: true,
        warning: '로그인은 성공했으나 구독 정보를 가져오지 못했습니다.',
        error_details: subError.message
      };
    }
  } catch (error) {
    console.error('인증 코드 교환 및 구독 업데이트 중 오류 발생:', error);
    return {
      success: false,
      error: error.message || '인증 처리 중 오류가 발생했습니다.',
      details: error.stack
    };
  }
}

/**
 * URI 프로토콜 핸들러를 등록합니다 (toast-app:// 프로토콜)
 * @returns {void}
 */
function registerProtocolHandler() {
  if (process.platform === 'darwin' || process.platform === 'win32') {
    app.setAsDefaultProtocolClient('toast-app');
  }
}

/**
 * 유효한 액세스 토큰이 있는지 확인합니다
 * @returns {Promise<boolean>} 토큰이 있으면 true
 */
async function hasValidToken() {
  try {
    const token = client.getAccessToken() || await getStoredToken();
    return !!token;
  } catch (error) {
    console.error('Token validation error:', error);
    return false;
  }
}

/**
 * 현재 액세스 토큰을 가져옵니다
 * @returns {Promise<string|null>} 액세스 토큰 또는 null
 */
async function getAccessToken() {
  return client.getAccessToken() || await getStoredToken();
}

/**
 * 구독 정보에 따라 페이지 그룹 설정을 업데이트합니다
 * @param {Object} subscription - 구독 정보
 * @returns {Promise<void>}
 */
async function updatePageGroupSettings(subscription) {
  try {
    const config = createConfigStore();

    // 활성 상태 및 구독 여부 확인
    const isActive = subscription.active || subscription.is_subscribed || false;
    const isVip = subscription.isVip || false;

    // 페이지 그룹 수 계산
    let pageGroups = PAGE_GROUPS.ANONYMOUS;
    if (isActive || isVip) {
      if (subscription.plan === 'premium' || subscription.plan === 'pro' || isVip) {
        pageGroups = PAGE_GROUPS.PREMIUM;
      } else {
        pageGroups = PAGE_GROUPS.AUTHENTICATED;
      }
    } else if (subscription.userId && subscription.userId !== 'anonymous') {
      // 비활성 사용자지만 로그인은 된 경우
      pageGroups = PAGE_GROUPS.AUTHENTICATED;
    }

    // subscribedUntil 값 처리 - 항상 문자열로 변환
    let subscribedUntilStr = '';
    try {
      if (subscription.subscribed_until) {
        // 명시적으로 문자열로 변환하고 유효한 문자열인지 확인
        subscribedUntilStr = typeof subscription.subscribed_until === 'string'
          ? subscription.subscribed_until
          : String(subscription.subscribed_until);
      } else if (subscription.expiresAt) {
        // 명시적으로 문자열로 변환하고 유효한 문자열인지 확인
        subscribedUntilStr = typeof subscription.expiresAt === 'string'
          ? subscription.expiresAt
          : String(subscription.expiresAt);
      }

      // 값이 undefined나 null이면 빈 문자열로 설정
      if (subscribedUntilStr === 'undefined' || subscribedUntilStr === 'null') {
        subscribedUntilStr = '';
      }
    } catch (error) {
      console.error('subscribedUntil 값 변환 오류:', error);
      subscribedUntilStr = ''; // 오류 발생 시 빈 문자열로 설정
    }

    console.log('구독 정보 저장 전 확인:', {
      plan: subscription.plan || 'free',
      subscribedUntil: subscribedUntilStr,
      subscribedUntilType: typeof subscribedUntilStr,
      pageGroups: subscription.features?.page_groups || pageGroups
    });

    // 안전하게 구독 정보 저장
    config.set('subscription', {
      isAuthenticated: true,
      isSubscribed: isActive,
      plan: subscription.plan || 'free',
      subscribedUntil: subscribedUntilStr, // 안전하게 문자열로 변환된 값
      pageGroups: subscription.features?.page_groups || pageGroups,
      isVip: isVip,
      additionalFeatures: {
        advancedActions: subscription.features?.advanced_actions || false,
        cloudSync: subscription.features?.cloud_sync || false
      }
    });

    console.log('구독 설정 업데이트 완료:', {
      isAuthenticated: true,
      isSubscribed: isActive,
      plan: subscription.plan || 'free',
      pageGroups: subscription.features?.page_groups || pageGroups
    });
  } catch (error) {
    console.error('페이지 그룹 설정 업데이트 오류:', error);
    throw error;
  }
}

/**
 * 로그아웃 후 페이지 그룹 설정을 초기화합니다
 * @returns {Promise<boolean>} 로그아웃 성공 여부
 */
async function logoutAndResetPageGroups() {
  try {
    // 로그아웃 처리
    const logoutSuccess = await logout();

    if (logoutSuccess) {
      // 페이지 그룹 설정 초기화
      const config = createConfigStore();
      config.set('subscription', {
        isAuthenticated: false,
        isSubscribed: false,
        subscribedUntil: '',
        pageGroups: 1
      });

      console.log('Logged out and reset page group settings to defaults');
    }

    return logoutSuccess;
  } catch (error) {
    console.error('Logout and reset page groups error:', error);
    return false;
  }
}

// 초기화: 저장된 토큰 메모리에 로드
initializeTokensFromStorage().then(() => {
  console.log('토큰 상태 초기화 완료');
});

module.exports = {
  initiateLogin,
  exchangeCodeForToken,
  exchangeCodeForTokenAndUpdateSubscription,
  logout,
  logoutAndResetPageGroups,
  fetchUserProfile,
  fetchSubscription,
  registerProtocolHandler,
  handleAuthRedirect,
  hasValidToken,
  getAccessToken,
  updatePageGroupSettings
};
