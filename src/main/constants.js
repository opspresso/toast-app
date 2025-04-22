/**
 * Toast App - 공통 상수 모듈
 *
 * 앱 전체에서 공통으로 사용되는 상수값을 정의합니다.
 */

// 구독 등급에 따른 페이지 그룹 수 상수
const PAGE_GROUPS = {
  ANONYMOUS: 1, // 인증되지 않은 사용자
  AUTHENTICATED: 3, // 인증된 사용자
  PREMIUM: 9 // 구독 또는 VIP 사용자
};

// 익명 사용자 기본 구독 정보
const DEFAULT_ANONYMOUS_SUBSCRIPTION = {
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

// 익명 사용자 기본 프로필 정보
const DEFAULT_ANONYMOUS = {
  id: 'anonymous',
  email: 'anonymous@user.com',
  name: 'Guest User',
  image: 'https://web.toast.sh/logo192.png',
  slug: 'guest',
  is_authenticated: false,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  subscription: DEFAULT_ANONYMOUS_SUBSCRIPTION
};

module.exports = {
  PAGE_GROUPS,
  DEFAULT_ANONYMOUS,
  DEFAULT_ANONYMOUS_SUBSCRIPTION
};
