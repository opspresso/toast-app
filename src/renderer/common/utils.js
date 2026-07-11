/**
 * Toast - Shared Renderer Utilities
 *
 * A collection of utility functions shared across multiple renderer pages.
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
