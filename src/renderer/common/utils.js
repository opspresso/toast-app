/**
 * Toast - Shared Renderer Utilities
 *
 * 여러 renderer 페이지에서 공용으로 사용하는 유틸리티 함수 모음입니다.
 */

/**
 * Extract initials from user name
 * @param {string} name - User name
 * @returns {string} User initials (up to 2 characters)
 */
export function getInitials(name) {
  return name
    .split(' ')
    .map(part => part.charAt(0))
    .join('')
    .toUpperCase()
    .substring(0, 2);
}
