/**
 * Toast - Tilde Expansion Utility
 */

const os = require('os');
const path = require('path');

/**
 * Expand a leading `~` to the user's home directory.
 * Only `~` and `~/...` are expanded; `~user` forms are left untouched.
 * @param {string} value - Path or argument that may start with a tilde
 * @returns {string} Value with a leading tilde expanded
 */
function expandTilde(value) {
  if (value === '~') {
    return os.homedir();
  }
  if (value.startsWith('~/')) {
    return path.join(os.homedir(), value.slice(2));
  }
  return value;
}

module.exports = { expandTilde };
