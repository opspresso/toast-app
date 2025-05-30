/**
 * Toast - App Icon Extractor Tests
 *
 * 아이콘 추출 유틸리티 함수들에 대한 단위 테스트
 */

const { extractAppNameFromPath, getExistingIconPath } = require('../../src/main/utils/app-icon-extractor');
const fs = require('fs');
const path = require('path');

// Mock fs module for testing
jest.mock('fs');

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

    test('should return icon path if file exists', () => {
      // Mock fs.existsSync to return true
      fs.existsSync.mockReturnValue(true);

      const iconPath = getExistingIconPath('Visual Studio Code', '/test/icons');
      expect(iconPath).toBe('/test/icons/Visual_Studio_Code.png');
      expect(fs.existsSync).toHaveBeenCalledWith('/test/icons/Visual_Studio_Code.png');
    });

    test('should return null if file does not exist', () => {
      // Mock fs.existsSync to return false
      fs.existsSync.mockReturnValue(false);

      const iconPath = getExistingIconPath('NonExistent App', '/test/icons');
      expect(iconPath).toBe(null);
      expect(fs.existsSync).toHaveBeenCalledWith('/test/icons/NonExistent_App.png');
    });

    test('should sanitize app name with special characters', () => {
      fs.existsSync.mockReturnValue(true);

      const iconPath = getExistingIconPath('App Store!@#$%', '/test/icons');
      expect(iconPath).toBe('/test/icons/App_Store_____.png');
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
