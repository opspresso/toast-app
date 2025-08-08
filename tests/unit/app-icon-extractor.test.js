/**
 * Toast - App Icon Extractor Tests
 *
 * 아이콘 추출 유틸리티 함수들에 대한 단위 테스트
 */

const { extractAppNameFromPath, getExistingIconPath } = require('../../src/main/utils/app-icon-extractor');

// Mock fs and path modules for testing
jest.mock('fs', () => ({
  existsSync: jest.fn(),
}));

jest.mock('path', () => ({
  join: jest.fn((...parts) => parts.join('/')),
}));

// Mock logger to prevent issues
jest.mock('../../src/main/logger', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  })),
}));

const fs = require('fs');
const path = require('path');

describe('App Icon Extractor', () => {
  describe('extractAppNameFromPath', () => {
    test('should extract app name from .app bundle path', () => {
      const appName = extractAppNameFromPath('/Applications/Visual Studio Code.app');
      expect(appName).toBe('Visual Studio Code');
    });

    test('should extract app name from regular file path', () => {
      const appName = extractAppNameFromPath('/usr/bin/git');
      expect(appName).toBe('git');
    });

    test('should return null for empty path', () => {
      const appName = extractAppNameFromPath('');
      expect(appName).toBe(null);
    });

    test('should return null for null path', () => {
      const appName = extractAppNameFromPath(null);
      expect(appName).toBe(null);
    });

    test('should handle paths with special characters', () => {
      const appName = extractAppNameFromPath('/Applications/App Store.app');
      expect(appName).toBe('App Store');
    });
  });

  describe('getExistingIconPath', () => {
    beforeEach(() => {
      // Reset mocks before each test
      jest.clearAllMocks();
    });

    test('should be a function', () => {
      expect(getExistingIconPath).toBeDefined();
      expect(typeof getExistingIconPath).toBe('function');
    });

    test('should return icon path when file exists', () => {
      // Mock fs.existsSync to return true
      fs.existsSync.mockReturnValue(true);

      const iconPath = getExistingIconPath('Visual Studio Code', '/test/icons');
      
      // Since fs.existsSync returns true, we should get a path back
      expect(iconPath).toBeTruthy();
      expect(iconPath).toMatch(/Visual_Studio_Code\.png$/);
    });

    test('should return null when file does not exist', () => {
      // Mock fs.existsSync to return false
      fs.existsSync.mockReturnValue(false);

      const iconPath = getExistingIconPath('NonExistent App', '/test/icons');
      
      // Since fs.existsSync returns false, we should get null
      expect(iconPath).toBe(null);
    });

    test('should sanitize app names with special characters', () => {
      fs.existsSync.mockReturnValue(true);

      const iconPath = getExistingIconPath('App Store!@#$%', '/test/icons');
      
      // Should convert special characters to underscores
      expect(iconPath).toBeTruthy();
      expect(iconPath).toMatch(/App_Store_____\.png$/);
    });

    test('should handle errors gracefully', () => {
      // Mock fs.existsSync to throw an error
      fs.existsSync.mockImplementation(() => {
        throw new Error('File system error');
      });

      const iconPath = getExistingIconPath('Test App', '/test/icons');
      expect(iconPath).toBe(null);
    });
  });
});
