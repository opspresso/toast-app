/**
 * Toast - Tilde Expansion Utility Tests
 */

const os = require('os');
const path = require('path');
const { expandTilde } = require('../../../src/main/utils/expand-tilde');

describe('expandTilde', () => {
  test('expands a bare ~ to the home directory', () => {
    expect(expandTilde('~')).toBe(os.homedir());
  });

  test('expands ~/... to an absolute path under the home directory', () => {
    expect(expandTilde('~/workspace/project')).toBe(path.join(os.homedir(), 'workspace/project'));
  });

  test('leaves ~user forms untouched', () => {
    expect(expandTilde('~alice/docs')).toBe('~alice/docs');
  });

  test('leaves paths without a leading tilde untouched', () => {
    expect(expandTilde('/usr/local/bin')).toBe('/usr/local/bin');
  });
});
