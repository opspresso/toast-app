/**
 * Toast - Application Action Tests
 *
 * 애플리케이션 실행 액션에 대한 단위 테스트
 */

// Mock dependencies
jest.mock('fs', () => ({
  existsSync: jest.fn(),
}));

jest.mock('child_process', () => ({
  exec: jest.fn(),
}));

const { executeApplication } = require('../../../src/main/actions/application');
const fs = require('fs');
const { exec } = require('child_process');

describe('Application Action', () => {
  let originalPlatform;

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
    
    // Store original platform
    originalPlatform = process.platform;
  });

  afterEach(() => {
    // Restore original platform
    Object.defineProperty(process, 'platform', {
      value: originalPlatform,
    });
  });

  describe('executeApplication', () => {
    test('should return error when applicationPath is missing', async () => {
      const action = {};

      const result = await executeApplication(action);

      expect(result).toEqual({
        success: false,
        message: 'Application path is required',
      });
    });

    test('should return error when application file does not exist', async () => {
      const action = { applicationPath: '/nonexistent/app.exe' };
      fs.existsSync.mockReturnValue(false);

      const result = await executeApplication(action);

      expect(fs.existsSync).toHaveBeenCalledWith('/nonexistent/app.exe');
      expect(result).toEqual({
        success: false,
        message: 'Application not found at /nonexistent/app.exe',
      });
    });

    describe('macOS platform', () => {
      beforeEach(() => {
        Object.defineProperty(process, 'platform', {
          value: 'darwin',
        });
        fs.existsSync.mockReturnValue(true);
      });

      test('should execute application without parameters', async () => {
        const action = { applicationPath: '/Applications/Calculator.app' };
        exec.mockImplementation((command, callback) => {
          callback(null);
        });

        const result = await executeApplication(action);

        expect(exec).toHaveBeenCalledWith('open "/Applications/Calculator.app"', expect.any(Function));
        expect(result).toEqual({
          success: true,
          message: 'Application launched successfully',
        });
      });

      test('should execute application with parameters', async () => {
        const action = {
          applicationPath: '/Applications/Calculator.app',
          applicationParameters: '--some-param',
        };
        exec.mockImplementation((command, callback) => {
          callback(null);
        });

        const result = await executeApplication(action);

        expect(exec).toHaveBeenCalledWith(
          'open -a "/Applications/Calculator.app" --some-param',
          expect.any(Function)
        );
        expect(result).toEqual({
          success: true,
          message: 'Application launched successfully',
        });
      });

      test('should handle execution error', async () => {
        const action = { applicationPath: '/Applications/Calculator.app' };
        const error = new Error('Command failed');
        exec.mockImplementation((command, callback) => {
          callback(error);
        });

        try {
          const result = await executeApplication(action);
          // The promise should reject, so we shouldn't reach here
          expect(result.success).toBe(false);
          expect(result.message).toBe('Error executing application: Command failed');
          expect(result.error).toBe(error);
        } catch (rejectedValue) {
          // Promise rejects with the error object
          expect(rejectedValue.success).toBe(false);
          expect(rejectedValue.message).toBe('Error executing application: Command failed');
          expect(rejectedValue.error).toBe(error);
        }
      });
    });

    describe('Windows platform', () => {
      beforeEach(() => {
        Object.defineProperty(process, 'platform', {
          value: 'win32',
        });
        fs.existsSync.mockReturnValue(true);
      });

      test('should execute application without parameters', async () => {
        const action = { applicationPath: 'C:\\Program Files\\App\\app.exe' };
        exec.mockImplementation((command, callback) => {
          callback(null);
        });

        const result = await executeApplication(action);

        expect(exec).toHaveBeenCalledWith('"C:\\Program Files\\App\\app.exe"', expect.any(Function));
        expect(result).toEqual({
          success: true,
          message: 'Application launched successfully',
        });
      });

      test('should execute application with parameters', async () => {
        const action = {
          applicationPath: 'C:\\Program Files\\App\\app.exe',
          applicationParameters: '/param value',
        };
        exec.mockImplementation((command, callback) => {
          callback(null);
        });

        const result = await executeApplication(action);

        expect(exec).toHaveBeenCalledWith(
          '"C:\\Program Files\\App\\app.exe" /param value',
          expect.any(Function)
        );
        expect(result).toEqual({
          success: true,
          message: 'Application launched successfully',
        });
      });
    });

    describe('Linux platform', () => {
      beforeEach(() => {
        Object.defineProperty(process, 'platform', {
          value: 'linux',
        });
        fs.existsSync.mockReturnValue(true);
      });

      test('should execute application without parameters using xdg-open', async () => {
        const action = { applicationPath: '/usr/bin/calculator' };
        exec.mockImplementation((command, callback) => {
          callback(null);
        });

        const result = await executeApplication(action);

        expect(exec).toHaveBeenCalledWith('xdg-open "/usr/bin/calculator"', expect.any(Function));
        expect(result).toEqual({
          success: true,
          message: 'Application launched successfully',
        });
      });

      test('should execute application with parameters directly', async () => {
        const action = {
          applicationPath: '/usr/bin/calculator',
          applicationParameters: '--advanced',
        };
        exec.mockImplementation((command, callback) => {
          callback(null);
        });

        const result = await executeApplication(action);

        expect(exec).toHaveBeenCalledWith(
          '"/usr/bin/calculator" --advanced',
          expect.any(Function)
        );
        expect(result).toEqual({
          success: true,
          message: 'Application launched successfully',
        });
      });
    });

    describe('error handling', () => {
      beforeEach(() => {
        fs.existsSync.mockReturnValue(true);
      });

      test('should handle unexpected errors in try-catch', async () => {
        const action = { applicationPath: '/test/app' };
        
        // Mock fs.existsSync to throw an error
        fs.existsSync.mockImplementation(() => {
          throw new Error('File system error');
        });

        const result = await executeApplication(action);

        expect(result.success).toBe(false);
        expect(result.message).toBe('Error launching application: File system error');
        expect(result.error).toBeInstanceOf(Error);
      });

      test('should handle Promise rejection from exec', async () => {
        const action = { applicationPath: '/test/app' };
        const error = new Error('Execution failed');
        
        exec.mockImplementation((command, callback) => {
          callback(error);
        });

        try {
          const result = await executeApplication(action);
          // The promise should reject, so we shouldn't reach here normally
          expect(result.success).toBe(false);
          expect(result.message).toBe('Error executing application: Execution failed');
          expect(result.error).toBe(error);
        } catch (rejectedValue) {
          // Promise rejects with the error object
          expect(rejectedValue.success).toBe(false);
          expect(rejectedValue.message).toBe('Error executing application: Execution failed');
          expect(rejectedValue.error).toBe(error);
        }
      });
    });

    describe('edge cases', () => {
      test('should handle empty applicationPath', async () => {
        const action = { applicationPath: '' };

        const result = await executeApplication(action);

        expect(result).toEqual({
          success: false,
          message: 'Application path is required',
        });
      });

      test('should handle null applicationPath', async () => {
        const action = { applicationPath: null };

        const result = await executeApplication(action);

        expect(result).toEqual({
          success: false,
          message: 'Application path is required',
        });
      });

      test('should handle undefined applicationPath', async () => {
        const action = { applicationPath: undefined };

        const result = await executeApplication(action);

        expect(result).toEqual({
          success: false,
          message: 'Application path is required',
        });
      });

      test('should handle empty applicationParameters', async () => {
        const action = {
          applicationPath: '/test/app',
          applicationParameters: '',
        };
        
        Object.defineProperty(process, 'platform', {
          value: 'darwin',
        });
        fs.existsSync.mockReturnValue(true);
        exec.mockImplementation((command, callback) => {
          callback(null);
        });

        const result = await executeApplication(action);

        // Empty string is falsy, so it uses the regular form
        expect(exec).toHaveBeenCalledWith('open "/test/app"', expect.any(Function));
        expect(result.success).toBe(true);
      });
    });
  });
});