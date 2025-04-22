/**
 * Toast App - User Data Manager Module
 *
 * 사용자 프로필, 구독 정보, 설정 등을 파일로 저장하고 조회하는 기능을 제공합니다.
 * 주기적인 데이터 갱신 및 파일 관리를 담당합니다.
 */

const { app } = require('electron');
const path = require('path');
const fs = require('fs');
const { DEFAULT_ANONYMOUS } = require('./constants');

// 파일 경로 상수 정의
const USER_DATA_PATH = app.getPath('userData');
const PROFILE_FILE_PATH = path.join(USER_DATA_PATH, 'user-profile.json');
const SETTINGS_FILE_PATH = path.join(USER_DATA_PATH, 'user-settings.json');

// 주기적 갱신 설정
const REFRESH_INTERVAL_MS = 30 * 60 * 1000; // 30분마다 갱신
let profileRefreshTimer = null;
let settingsRefreshTimer = null;

// API 참조 저장
let apiClientRef = null;
let authManagerRef = null;

/**
 * 파일이 존재하는지 확인
 * @param {string} filePath - 확인할 파일 경로
 * @returns {boolean} 파일 존재 여부
 */
function fileExists(filePath) {
  try {
    return fs.existsSync(filePath);
  } catch (error) {
    console.error(`파일 존재 확인 오류 (${filePath}):`, error);
    return false;
  }
}

/**
 * 파일에서 데이터 읽기
 * @param {string} filePath - 읽을 파일 경로
 * @returns {Object|null} 파일 내용 또는 실패 시 null
 */
function readFromFile(filePath) {
  try {
    if (!fileExists(filePath)) {
      console.log(`파일이 존재하지 않음: ${filePath}`);
      return null;
    }

    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`파일 읽기 오류 (${filePath}):`, error);
    return null;
  }
}

/**
 * 데이터를 파일에 저장
 * @param {string} filePath - 저장할 파일 경로
 * @param {Object} data - 저장할 데이터
 * @returns {boolean} 저장 성공 여부
 */
function writeToFile(filePath, data) {
  try {
    const dirPath = path.dirname(filePath);

    // 디렉토리가 없으면 생성
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }

    // 파일에 JSON 형태로 저장
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    console.log(`파일 저장 성공: ${filePath}`);
    return true;
  } catch (error) {
    console.error(`파일 저장 오류 (${filePath}):`, error);
    return false;
  }
}

/**
 * 파일 삭제
 * @param {string} filePath - 삭제할 파일 경로
 * @returns {boolean} 삭제 성공 여부
 */
function deleteFile(filePath) {
  try {
    if (fileExists(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`파일 삭제 성공: ${filePath}`);
      return true;
    }
    return false;
  } catch (error) {
    console.error(`파일 삭제 오류 (${filePath}):`, error);
    return false;
  }
}

/**
 * 사용자 프로필 및 구독 정보 가져오기
 * @param {boolean} forceRefresh - 강제 갱신 여부 (true: API 호출, false: 파일 우선)
 * @returns {Promise<Object>} 사용자 프로필 및 구독 정보
 */
async function getUserProfile(forceRefresh = false) {
  try {
    console.log(`사용자 프로필 정보 가져오기 (강제 갱신: ${forceRefresh ? '예' : '아니오'})`);

    // 인증 상태 확인
    if (!authManagerRef) {
      console.error('인증 관리자가 초기화되지 않음');
      return null;
    }

    const hasToken = await authManagerRef.hasValidToken();
    if (!hasToken) {
      console.log('유효한 토큰이 없음, 익명 프로필 반환');
      return DEFAULT_ANONYMOUS;
    }

    // 1. 로컬 파일 확인 (강제 갱신이 아닌 경우)
    if (!forceRefresh && fileExists(PROFILE_FILE_PATH)) {
      const profileData = readFromFile(PROFILE_FILE_PATH);
      if (profileData) {
        // 로컬 파일에 인증 상태 정보가 없으면 추가
        if (profileData.is_authenticated === undefined || profileData.isAuthenticated === undefined) {
          profileData.is_authenticated = true;
          profileData.isAuthenticated = true;
          writeToFile(PROFILE_FILE_PATH, profileData);
          console.log('파일에서 로드한 프로필에 인증 상태 추가');
        }
        console.log('파일에서 프로필 정보 로드 성공');

        // 구독 정보 로그 출력
        if (profileData.subscription) {
          const plan = profileData.subscription.plan || 'free';
          const isSubscribed = profileData.subscription.active ||
            profileData.subscription.is_subscribed || false;
          const pageGroups = profileData.subscription.features.page_groups || 1;
          console.log(`로드된 구독 정보: 플랜=${plan}, 구독상태=${isSubscribed ? '활성' : '비활성'}, pages=${pageGroups}`);
        }

        return profileData;
      }
    }

    // 2. API에서 프로필 조회
    console.log('API에서 프로필 정보 조회 중...');
    const profileData = await authManagerRef.fetchUserProfile();

    // 응답에 에러가 있으면 파일에서 다시 시도
    if (profileData?.error) {
      console.error('API 프로필 조회 오류:', profileData.error);

      // 파일에 저장된 기존 데이터 반환 시도
      const savedProfileData = readFromFile(PROFILE_FILE_PATH);
      if (savedProfileData) {
        console.log('이전에 저장된 프로필 정보 반환');
        return savedProfileData;
      }

      return null;
    }

    // 3. 성공적으로 조회한 경우 인증 상태를 명시적으로 추가하고 파일에 저장
    if (profileData && !profileData.error) {
      // 인증 상태 추가 (is_authenticated와 isAuthenticated 모두 설정)
      profileData.is_authenticated = true;
      profileData.isAuthenticated = true;

      // 로그 추가
      console.log('API에서 가져온 프로필 정보:', {
        name: profileData.name || '이름 없음',
        email: profileData.email || '이메일 없음',
        hasSubscription: profileData.subscription?.active || profileData.subscription?.is_subscribed,
        plan: profileData.subscription?.plan || 'free'
      });

      // 파일에 저장
      writeToFile(PROFILE_FILE_PATH, profileData);
      console.log('프로필 정보 파일에 저장 완료');
    }

    return profileData;
  } catch (error) {
    console.error('프로필 정보 가져오기 오류:', error);

    // 오류 발생 시 파일에서 시도
    const savedProfileData = readFromFile(PROFILE_FILE_PATH);
    if (savedProfileData) {
      console.log('이전에 저장된 프로필 정보 반환');
      return savedProfileData;
    }

    return null;
  }
}

/**
 * 사용자 설정 정보 가져오기
 * @param {boolean} forceRefresh - 강제 갱신 여부 (true: API 호출, false: 파일 우선)
 * @returns {Promise<Object>} 사용자 설정 정보
 */
async function getUserSettings(forceRefresh = false) {
  try {
    console.log(`사용자 설정 정보 가져오기 (강제 갱신: ${forceRefresh ? '예' : '아니오'})`);

    // 인증 상태 확인
    if (!authManagerRef) {
      console.error('인증 관리자가 초기화되지 않음');
      return null;
    }

    const hasToken = await authManagerRef.hasValidToken();
    if (!hasToken) {
      console.log('유효한 토큰이 없음, 기본 설정 반환');
      return { isAuthenticated: false };
    }

    // 1. 로컬 파일에서 우선 조회 (강제 갱신이 아닌 경우)
    if (!forceRefresh && fileExists(SETTINGS_FILE_PATH)) {
      const settingsData = readFromFile(SETTINGS_FILE_PATH);
      if (settingsData) {
        // 로컬 파일에 인증 상태 정보가 없으면 추가
        if (settingsData.is_authenticated === undefined || settingsData.isAuthenticated === undefined) {
          settingsData.is_authenticated = true;
          settingsData.isAuthenticated = true;
          writeToFile(SETTINGS_FILE_PATH, settingsData);
          console.log('파일에서 로드한 설정에 인증 상태 추가');
        }

        // 로그 추가
        console.log('파일에서 설정 정보 로드 성공:', {
          dataFields: Object.keys(settingsData),
          timestamp: new Date().toISOString()
        });

        return settingsData;
      }
    }

    // 2. API 참조 확인
    if (!apiClientRef) {
      console.error('API 클라이언트가 초기화되지 않음');
      return null;
    }

    // 3. API에서 설정 조회
    console.log('API에서 설정 정보 조회 중...');
    const token = await authManagerRef.getAccessToken();

    if (!token) {
      console.error('유효한 액세스 토큰이 없음');
      return { isAuthenticated: false };
    }

    // API 요청
    const headers = { 'Authorization': `Bearer ${token}` };
    const apiClient = apiClientRef.createApiClient();
    const response = await apiClient.get(apiClientRef.ENDPOINTS.SETTINGS, { headers });

    if (response.data) {
      const settingsData = response.data.data || response.data;

      // 인증 상태 표시를 명시적으로 추가
      if (settingsData) {
        // is_authenticated가 없거나 false인 경우 true로 설정
        settingsData.is_authenticated = true;
        settingsData.isAuthenticated = true;

        writeToFile(SETTINGS_FILE_PATH, settingsData);

        // 로그 추가
        console.log('API에서 설정 정보 조회 및 파일 저장 성공:', {
          dataFields: Object.keys(settingsData),
          timestamp: new Date().toISOString()
        });
      }

      return settingsData;
    }

    console.log('API에서 설정 정보를 가져오지 못함, 기본 설정 반환');
    return { isAuthenticated: false };
  } catch (error) {
    console.error('설정 정보 가져오기 오류:', error);

    // 오류 발생 시 파일에서 시도
    const savedSettingsData = readFromFile(SETTINGS_FILE_PATH);
    if (savedSettingsData) {
      console.log('이전에 저장된 설정 정보 반환');
      return savedSettingsData;
    }

    console.log('저장된 설정 정보도 없음, 기본 설정 반환');
    return { isAuthenticated: false };
  }
}

/**
 * 설정 정보 업데이트
 * @param {Object} settings - 저장할 설정 정보
 * @returns {boolean} 업데이트 성공 여부
 */
function updateSettings(settings) {
  try {
    if (!settings) {
      console.error('업데이트할 설정 정보가 없음');
      return false;
    }

    // 파일에 설정 저장
    const result = writeToFile(SETTINGS_FILE_PATH, settings);

    if (result) {
      console.log('설정 정보 파일 업데이트 성공');
      return true;
    } else {
      console.error('설정 정보 파일 업데이트 실패');
      return false;
    }
  } catch (error) {
    console.error('설정 정보 업데이트 오류:', error);
    return false;
  }
}

/**
 * 동기화 메타데이터만 업데이트
 * @param {Object} metadata - 업데이트할 메타데이터
 * @returns {boolean} 업데이트 성공 여부
 */
function updateSyncMetadata(metadata) {
  try {
    if (!metadata) {
      console.error('업데이트할 메타데이터가 없음');
      return false;
    }

    // 현재 설정 파일 읽기
    const currentSettings = readFromFile(SETTINGS_FILE_PATH) || {};

    // 메타데이터만 업데이트
    const updatedSettings = {
      ...currentSettings,
      // 타임스탬프 정보 업데이트
      lastSyncedAt: metadata.lastSyncedAt || currentSettings.lastSyncedAt,
      lastModifiedAt: metadata.lastModifiedAt || currentSettings.lastModifiedAt,
      lastSyncedDevice: metadata.lastSyncedDevice || currentSettings.lastSyncedDevice,
      lastModifiedDevice: metadata.lastModifiedDevice || currentSettings.lastModifiedDevice
    };

    // 파일에 저장
    const result = writeToFile(SETTINGS_FILE_PATH, updatedSettings);

    if (result) {
      console.log('동기화 메타데이터 업데이트 성공');
      return true;
    } else {
      console.error('동기화 메타데이터 업데이트 실패');
      return false;
    }
  } catch (error) {
    console.error('동기화 메타데이터 업데이트 오류:', error);
    return false;
  }
}

/**
 * 주기적인 프로필 갱신 시작
 */
function startProfileRefresh() {
  // 이미 실행 중인 타이머가 있으면 중지
  stopProfileRefresh();

  console.log(`주기적 프로필 갱신 시작 (${Math.floor(REFRESH_INTERVAL_MS / 60000)}분 간격)`);

  // 즉시 한 번 실행 후 타이머 시작
  getUserProfile(true).then(profile => {
    if (profile) {
      console.log('초기 프로필 갱신 완료');
    }
  });

  // 주기적 갱신 타이머 설정
  profileRefreshTimer = setInterval(async () => {
    try {
      const profile = await getUserProfile(true);
      if (profile) {
        console.log('주기적 프로필 갱신 완료');
      }
    } catch (error) {
      console.error('주기적 프로필 갱신 오류:', error);
    }
  }, REFRESH_INTERVAL_MS);
}

/**
 * 주기적인 프로필 갱신 중지
 */
function stopProfileRefresh() {
  if (profileRefreshTimer) {
    clearInterval(profileRefreshTimer);
    profileRefreshTimer = null;
    console.log('주기적 프로필 갱신 중지');
  }
}

/**
 * 주기적인 설정 갱신 시작
 */
function startSettingsRefresh() {
  // 이미 실행 중인 타이머가 있으면 중지
  stopSettingsRefresh();

  console.log(`주기적 설정 갱신 시작 (${Math.floor(REFRESH_INTERVAL_MS / 60000)}분 간격)`);

  // 즉시 한 번 실행 후 타이머 시작
  getUserSettings(true).then(settings => {
    if (settings) {
      console.log('초기 설정 갱신 완료');
    }
  });

  // 주기적 갱신 타이머 설정
  settingsRefreshTimer = setInterval(async () => {
    try {
      const settings = await getUserSettings(true);
      if (settings) {
        console.log('주기적 설정 갱신 완료');
      }
    } catch (error) {
      console.error('주기적 설정 갱신 오류:', error);
    }
  }, REFRESH_INTERVAL_MS);
}

/**
 * 주기적인 설정 갱신 중지
 */
function stopSettingsRefresh() {
  if (settingsRefreshTimer) {
    clearInterval(settingsRefreshTimer);
    settingsRefreshTimer = null;
    console.log('주기적 설정 갱신 중지');
  }
}

/**
 * 사용자 데이터 관리자 초기화
 * @param {Object} apiClient - API 클라이언트 참조
 * @param {Object} authManager - 인증 관리자 참조
 */
function initialize(apiClient, authManager) {
  apiClientRef = apiClient;
  authManagerRef = authManager;

  console.log('사용자 데이터 관리자 초기화 완료');
}

/**
 * 로그인 성공 후 데이터 동기화 및 주기적 갱신 시작
 */
async function syncAfterLogin() {
  try {
    console.log('로그인 후 사용자 데이터 동기화 시작');

    // 프로필 및 설정 정보 갱신
    const profile = await getUserProfile(true);
    const settings = await getUserSettings(true);

    if (profile) {
      console.log('로그인 후 프로필 갱신 성공');
    }

    if (settings) {
      console.log('로그인 후 설정 갱신 성공');
    }

    // 주기적 갱신 시작
    startProfileRefresh();
    startSettingsRefresh();

    return { profile, settings };
  } catch (error) {
    console.error('로그인 후 데이터 동기화 오류:', error);
    return { error: error.message };
  }
}

/**
 * 로그아웃 시 데이터 정리
 * @returns {boolean} 정리 성공 여부
 */
function cleanupOnLogout() {
  try {
    console.log('로그아웃: 사용자 데이터 정리 시작');

    // 1. 파일 삭제 전에 현재 상태 확인
    const profileExists = fileExists(PROFILE_FILE_PATH);
    const settingsExists = fileExists(SETTINGS_FILE_PATH);

    console.log('현재 상태:', {
      profileFileExists: profileExists,
      settingsFileExists: settingsExists,
      profileRefreshActive: !!profileRefreshTimer,
      settingsRefreshActive: !!settingsRefreshTimer
    });

    // 2. 주기적 갱신 중지
    stopProfileRefresh();
    stopSettingsRefresh();
    console.log('주기적 갱신 타이머 중지 완료');

    // 3. 저장된 파일 삭제
    const profileDeleted = deleteFile(PROFILE_FILE_PATH);
    const settingsDeleted = deleteFile(SETTINGS_FILE_PATH);

    console.log('파일 삭제 결과:', {
      profileDeleted: profileDeleted ? '성공' : '실패 또는 파일 없음',
      settingsDeleted: settingsDeleted ? '성공' : '실패 또는 파일 없음'
    });

    // 4. 최종 결과 보고
    const finalCheck = {
      profileFileExists: fileExists(PROFILE_FILE_PATH),
      settingsFileExists: fileExists(SETTINGS_FILE_PATH),
      allDataCleared: !fileExists(PROFILE_FILE_PATH) && !fileExists(SETTINGS_FILE_PATH)
    };

    console.log('사용자 데이터 정리 완료 상태:', finalCheck);

    if (finalCheck.allDataCleared) {
      console.log('모든 사용자 데이터가 성공적으로 정리되었습니다.');
    } else {
      console.warn('일부 사용자 데이터 파일이 정리되지 않았습니다. 확인이 필요합니다.');
    }

    return finalCheck.allDataCleared;
  } catch (error) {
    console.error('로그아웃 데이터 정리 오류:', error);
    return false;
  }
}

module.exports = {
  initialize,
  getUserProfile,
  getUserSettings,
  updateSettings,
  updateSyncMetadata,
  syncAfterLogin,
  cleanupOnLogout,
  startProfileRefresh,
  stopProfileRefresh,
  startSettingsRefresh,
  stopSettingsRefresh
};
