/**
 * Settings - Account Settings Management
 */

import {
  loginSection,
  profileSection,
  subscriptionSection,
  loginButton,
  logoutButton,
  userAvatar,
  userName,
  userEmail,
  subscriptionBadge,
  subscriptionStatus,
  subscriptionExpiry,
  subscriptionFeatures,
  manageSubscriptionButton,
  refreshSubscriptionButton,
  authLoading,
  subscriptionLoading,
} from './dom-elements.js';
import {
  authState,
  authStateInitialized,
  profileDataFetchInProgress,
  updateAuthState,
  setAuthStateInitialized,
  setProfileDataFetchInProgress,
} from './state.js';
import { setLoading, getInitials, saveSubscriptionToConfig, handleTokenExpired } from './utils.js';

/**
 * 계정 설정 탭 초기화
 */
export function initializeAccountSettings() {
  window.settings.log.info('initializeAccountSettings 호출');

  try {
    // 중복 호출 방지를 위해 인증 상태 초기화만 수행
    // initializeAuthState()는 이미 내부적으로 필요한 프로필 및 구독 정보를 로드함
    initializeAuthState();
  } catch (error) {
    window.settings.log.error('계정 설정 초기화 중 오류 발생:', error);
  }
}

/**
 * Initialize authentication state - 중복 호출 방지 및 최적화
 */
export async function initializeAuthState() {
  if (authStateInitialized) {
    window.settings.log.info('인증 상태가 이미 초기화되어 있어 중복 초기화를 건너뜁니다.');
    return;
  }

  // 초기화 진행 중 표시
  setAuthStateInitialized(true);

  try {
    // Check if we have authentication tokens
    const token = await window.settings.getAuthToken();

    if (token) {
      // 로그인 상태 UI 업데이트
      updateAuthStateUI(true);

      // 프로필 및 구독 정보 로드 (중복 호출 방지)
      if (!profileDataFetchInProgress && !authState.profile) {
        await loadUserDataEfficiently();
      }
    } else {
      // No tokens, show login UI
      updateAuthStateUI(false);
    }
  } catch (error) {
    window.settings.log.error('Failed to initialize auth state:', error);
    // Show login UI when error occurs
    updateAuthStateUI(false);
    // 오류 발생 시 초기화 상태 리셋
    setAuthStateInitialized(false);
  }
}

/**
 * 프로필 및 구독 정보 효율적으로 로드 (중복 호출 방지)
 */
export async function loadUserDataEfficiently() {
  // 이미 데이터 로드 중이면 건너뜀
  if (profileDataFetchInProgress) {
    window.settings.log.info('프로필 데이터 로드가 이미 진행 중입니다.');
    return;
  }

  setProfileDataFetchInProgress(true);

  try {
    window.settings.log.info('사용자 프로필 및 구독 정보 효율적 로드 시작');

    // 로딩 표시
    if (authLoading) {
      setLoading(authLoading, true);
    }
    if (subscriptionLoading) {
      setLoading(subscriptionLoading, true);
    }

    // 프로필 정보 로드
    await fetchUserProfile();

    // 구독 정보 로드 (프로필 이미 있으면 중복 요청 방지)
    await fetchSubscriptionInfo();

    // 로딩 숨김
    if (authLoading) {
      setLoading(authLoading, false);
    }
    if (subscriptionLoading) {
      setLoading(subscriptionLoading, false);
    }

    window.settings.log.info('사용자 프로필 및 구독 정보 로드 완료');
  } catch (error) {
    window.settings.log.error('사용자 데이터 로드 중 오류:', error);
    if (authLoading) {
      setLoading(authLoading, false);
    }
    if (subscriptionLoading) {
      setLoading(subscriptionLoading, false);
    }
  } finally {
    // 데이터 로드 완료 표시
    setProfileDataFetchInProgress(false);
  }
}

/**
 * Update UI based on authentication state
 * @param {boolean} isLoggedIn - Whether the user is logged in
 */
export function updateAuthStateUI(isLoggedIn) {
  updateAuthState({ isLoggedIn });

  if (isLoggedIn) {
    // Show profile and subscription sections, hide login section
    loginSection.classList.add('hidden');
    profileSection.classList.remove('hidden');
    subscriptionSection.classList.remove('hidden');

    // Update Cloud Sync UI as well (will only show if user has permission)
    window.settings
      .getSyncStatus()
      .then(status => {
        if (window.cloudSyncUI) {
          window.cloudSyncUI.updateSyncStatusUI(status, authState, window.settings.log);
        }
      })
      .catch(error => {
        window.settings.log.error('Error getting sync status:', error);
      });
  } else {
    // Show login section, hide profile and subscription sections
    loginSection.classList.remove('hidden');
    profileSection.classList.add('hidden');
    subscriptionSection.classList.add('hidden');

    // Reset profile and subscription UI
    userAvatar.src = '';
    userName.textContent = '-';
    userEmail.textContent = '-';
    subscriptionBadge.textContent = 'Free';
    subscriptionBadge.className = 'badge free';
    subscriptionStatus.textContent = '-';
    subscriptionExpiry.textContent = '-';
    subscriptionFeatures.textContent = '-';

    // Disable Cloud Sync UI
    if (window.cloudSyncUI) {
      window.cloudSyncUI.disableCloudSyncUI(window.settings.log);
    }
  }
}

/**
 * Handle login button click
 */
export function handleLogin() {
  window.settings.log.info('로그인 시작');

  try {
    // 로딩 표시
    if (authLoading) {
      setLoading(authLoading, true);
    }
    if (loginButton) {
      loginButton.disabled = true;
    }

    // 로그인 시작
    window.settings
      .initiateLogin()
      .then(success => {
        if (!success) {
          // 로그인 실패
          if (authLoading) {
            setLoading(authLoading, false);
          }
          if (loginButton) {
            loginButton.disabled = false;
          }
          window.settings.log.error('로그인 시작 실패');
        }
      })
      .catch(error => {
        // 오류 처리
        window.settings.log.error('로그인 오류:', error);
        if (authLoading) {
          setLoading(authLoading, false);
        }
        if (loginButton) {
          loginButton.disabled = false;
        }
      });
  } catch (error) {
    window.settings.log.error('로그인 처리 중 오류:', error);
    if (authLoading) {
      setLoading(authLoading, false);
    }
    if (loginButton) {
      loginButton.disabled = false;
    }
  }
}

/**
 * Handle logout button click
 */
export function handleLogout() {
  window.settings.log.info('로그아웃 시작');

  try {
    window.settings
      .logout()
      .then(() => {
        // 로그아웃 성공 시 UI 업데이트
        updateAuthStateUI(false);
        window.settings.log.info('로그아웃 성공');
      })
      .catch(error => {
        window.settings.log.error('로그아웃 오류:', error);
      });
  } catch (error) {
    window.settings.log.error('로그아웃 처리 중 오류:', error);
  }
}

/**
 * Handle manage subscription button click
 */
export function handleManageSubscription() {
  window.settings.log.info('구독 관리 페이지 열기');
  window.settings.openUrl('https://toastapp.io/subscription');
}

/**
 * Handle refresh subscription button click
 */
export function handleRefreshSubscription() {
  window.settings.log.info('구독 정보 새로고침');

  try {
    // 버튼 비활성화 및 로딩 표시
    if (refreshSubscriptionButton) {
      refreshSubscriptionButton.disabled = true;
      refreshSubscriptionButton.textContent = 'Refreshing...';
    }

    if (subscriptionLoading) {
      setLoading(subscriptionLoading, true);
    }

    // 구독 정보 다시 로드
    fetchSubscriptionInfo()
      .then(() => {
        // 성공 메시지 표시
        if (refreshSubscriptionButton) {
          refreshSubscriptionButton.textContent = 'Refresh Complete!';
          setTimeout(() => {
            refreshSubscriptionButton.textContent = 'Refresh Subscription Info';
            refreshSubscriptionButton.disabled = false;
          }, 1500);
        }
      })
      .catch(error => {
        window.settings.log.error('구독 정보 새로고침 오류:', error);

        // 오류 메시지 표시
        if (refreshSubscriptionButton) {
          refreshSubscriptionButton.textContent = 'Refresh Failed';
          setTimeout(() => {
            refreshSubscriptionButton.textContent = 'Refresh Subscription Info';
            refreshSubscriptionButton.disabled = false;
          }, 1500);
        }
      });
  } catch (error) {
    window.settings.log.error('구독 정보 새로고침 처리 중 오류:', error);

    // 오류 시 버튼 및 로딩 상태 복원
    if (subscriptionLoading) {
      setLoading(subscriptionLoading, false);
    }
    if (refreshSubscriptionButton) {
      refreshSubscriptionButton.textContent = 'Refresh Subscription Info';
      refreshSubscriptionButton.disabled = false;
    }
  }
}

/**
 * Fetch user profile information - 중복 요청 방지
 */
export async function fetchUserProfile() {
  try {
    // 이미 프로필 정보가 있으면 중복 요청 방지
    if (authState.profile) {
      window.settings.log.info('기존 프로필 정보 사용 (중복 요청 방지)');
      updateProfileDisplay(authState.profile);
      return authState.profile;
    }

    // Check if token exists first
    const token = await window.settings.getAuthToken();
    if (!token) {
      window.settings.log.info('No auth token available, skipping profile fetch');
      return null;
    }

    window.settings.log.info('프로필 정보 새로 요청');
    const profile = await window.settings.fetchUserProfile();
    if (profile) {
      updateAuthState({ profile });

      // Update UI with profile information
      updateProfileDisplay(profile);
      return profile;
    }
    return null;
  } catch (error) {
    window.settings.log.error('Failed to fetch user profile:', error);
    // Handle token expired case
    if (error.message && error.message.includes('token expired')) {
      handleTokenExpired();
    }
    return null;
  }
}

/**
 * Update profile display with user information
 * @param {Object} profile - User profile information
 */
export function updateProfileDisplay(profile) {
  // Clear previous content
  userAvatar.innerHTML = '';

  if (profile.avatar_url || profile.profile_image || profile.avatar || profile.image) {
    // If profile image exists
    const img = document.createElement('img');
    img.src = profile.avatar_url || profile.profile_image || profile.avatar || profile.image;
    img.alt = 'Profile';

    // Handle image load error
    img.onerror = function () {
      // Use initials as fallback if image load fails
      const initials = getInitials(profile.name || profile.display_name || 'User');
      userAvatar.textContent = initials;
    };

    userAvatar.appendChild(img);
  } else {
    // Display initials if no image available
    const initials = getInitials(profile.name || profile.display_name || 'User');
    userAvatar.textContent = initials;
  }

  // Set name and email
  userName.textContent = profile.name || profile.display_name || 'User';
  userEmail.textContent = profile.email || '';
}

/**
 * Fetch subscription information - 중복 요청 및 불필요한 API 호출 방지
 */
export async function fetchSubscriptionInfo() {
  try {
    // 이미 구독 정보가 있으면 중복 요청 방지
    if (authState.subscription) {
      window.settings.log.info('기존 구독 정보 사용 (중복 요청 방지)');
      updateSubscriptionUI(authState.subscription);
      return authState.subscription;
    }

    // Check if token exists first
    const token = await window.settings.getAuthToken();
    if (!token) {
      window.settings.log.info('No auth token available, skipping subscription fetch');
      setLoading(subscriptionLoading, false);
      return null;
    }

    // 구독 정보 확인을 위한 로그
    window.settings.log.info('구독 정보 요청 시작');

    // 이미 프로필 정보가 있으면 재사용, 없으면 가져오기
    let profile = authState.profile;
    if (!profile) {
      profile = await fetchUserProfile();
    }

    // 프로필에 이미 구독 정보가 포함되어 있으면 재사용
    if (profile && profile.subscription) {
      window.settings.log.info('프로필에서 구독 정보 사용:', JSON.stringify(profile.subscription));
      updateAuthState({ subscription: profile.subscription });
      updateSubscriptionUI(profile.subscription);
      saveSubscriptionToConfig(profile.subscription);
      return profile.subscription;
    }

    // 프로필에 구독 정보가 없는 경우에만 별도 요청
    window.settings.log.info('구독 정보 별도 요청');
    const subscription = await window.settings.fetchSubscription();
    window.settings.log.info('구독 정보 수신:', subscription ? '성공' : '실패');

    if (subscription) {
      window.settings.log.info('수신된 구독 정보:', JSON.stringify(subscription));

      // 구독 정보에 cloud_sync 정보가 없으면 추가 (프리미엄 사용자면)
      if (subscription.plan && subscription.plan.toLowerCase().includes('premium')) {
        if (!subscription.features) {
          subscription.features = {};
        }
        // 프리미엄 사용자라면 cloud_sync 기능 활성화
        subscription.features.cloud_sync = true;
        window.settings.log.info('Premium 구독 감지, cloud_sync 활성화');
      }

      updateAuthState({ subscription });

      // Update subscription UI
      updateSubscriptionUI(subscription);

      // Save subscription info to config
      saveSubscriptionToConfig(subscription);

      // 구독 정보를 설정에 직접 저장
      await window.settings.setConfig('subscription', subscription);

      return subscription;
    }

    return null;
  } catch (error) {
    window.settings.log.error('Failed to fetch subscription info:', error);

    // Handle token expired case
    if (error.message && error.message.includes('token expired')) {
      handleTokenExpired();
    }

    return null;
  } finally {
    // Hide loading state
    setLoading(subscriptionLoading, false);
  }
}

/**
 * Update subscription UI with subscription information
 * @param {Object} subscription - Subscription information
 */
export function updateSubscriptionUI(subscription) {
  // Update subscription badge
  if (subscription.is_subscribed) {
    subscriptionBadge.textContent = subscription.plan || 'Premium';
    subscriptionBadge.className = 'badge premium';
    subscriptionStatus.textContent = 'Active';
  } else {
    subscriptionBadge.textContent = 'Free';
    subscriptionBadge.className = 'badge free';
    subscriptionStatus.textContent = 'Free Plan';
  }

  // Update subscription expiry
  if (subscription.expiresAt || subscription.subscribed_until) {
    const expiryValue = subscription.expiresAt || subscription.subscribed_until;
    const expiryDate = new Date(expiryValue);
    subscriptionExpiry.textContent = `Subscription valid until: ${expiryDate.toLocaleDateString()}`;
  } else {
    subscriptionExpiry.textContent = '';
  }

  // Update subscription features
  const featuresText = [];
  if (subscription.features) {
    if (subscription.features.page_groups) {
      featuresText.push(`${subscription.features.page_groups} page groups`);
    }
    if (subscription.features.advanced_actions) {
      featuresText.push('Advanced actions');
    }
    if (subscription.features.cloud_sync) {
      featuresText.push('Cloud sync');
    }
  }

  subscriptionFeatures.textContent = featuresText.length > 0 ? `Features: ${featuresText.join(', ')}` : 'Basic features';
}

/**
 * Setup account settings event listeners
 */
export function setupAccountEventListeners() {
  // 계정 관련 버튼
  if (loginButton) {
    loginButton.addEventListener('click', handleLogin);
  }

  if (logoutButton) {
    logoutButton.addEventListener('click', handleLogout);
  }

  if (manageSubscriptionButton) {
    manageSubscriptionButton.addEventListener('click', handleManageSubscription);
  }

  if (refreshSubscriptionButton) {
    refreshSubscriptionButton.addEventListener('click', handleRefreshSubscription);
  }

  // 구독 정보와 관련된 이벤트
  window.addEventListener('login-success', event => {
    window.settings.log.info('Login success event received in settings window');
    // Load user data and update UI when login is successful
    loadUserDataAndUpdateUI();
  });
}

/**
 * Load user profile information and update UI - 효율적 데이터 로드 사용
 */
export async function loadUserDataAndUpdateUI() {
  window.settings.log.info('loadUserDataAndUpdateUI 호출');

  // 최적화된 데이터 로드 함수 호출
  await loadUserDataEfficiently();

  // 인증 상태 UI 업데이트
  updateAuthStateUI(true);
}
