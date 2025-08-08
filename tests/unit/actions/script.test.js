/**
 * Toast - Script Action Tests
 *
 * 스크립트 실행 액션에 대한 단위 테스트
 */

// Mock dependencies
jest.mock('fs', () => ({
  writeFileSync: jest.fn(),
  unlinkSync: jest.fn(),
  chmodSync: jest.fn(),
}));

jest.mock('path', () => ({
  join: jest.fn((...parts) => parts.join('/')),
}));

jest.mock('os', () => ({
  tmpdir: jest.fn(() => '/tmp'),
}));

jest.mock('child_process', () => ({
  exec: jest.fn(),
}));

jest.mock('vm', () => ({
  createContext: jest.fn(),
  runInContext: jest.fn(),
}));

jest.mock('electron', () => ({
  app: {
    getAppPath: jest.fn(() => '/app/path'),
  },
}));

jest.mock('../../../src/main/logger', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  })),
}));

const { executeScript } = require('../../../src/main/actions/script');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { exec } = require('child_process');
const vm = require('vm');
const { app } = require('electron');

describe('Script Action', () => {
  let originalPlatform;

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
    
    // Store original platform
    originalPlatform = process.platform;
    
    // Setup default mock implementations
    exec.mockImplementation((command, callback) => {
      callback(null, 'mock stdout', 'mock stderr');
    });
    
    vm.createContext.mockReturnValue({});
    vm.runInContext.mockImplementation((code, context) => {
      // Mock basic script execution
    });
  });

  afterEach(() => {
    // Restore original platform
    Object.defineProperty(process, 'platform', {
      value: originalPlatform,
    });
  });

  describe('executeScript', () => {
    test('should return error when script content is missing', async () => {
      const action = { scriptType: 'javascript' };

      const result = await executeScript(action);

      expect(result).toEqual({
        success: false,
        message: 'Script content is required',
      });
    });

    test('should return error when script type is missing', async () => {
      const action = { script: 'console.log("test")' };

      const result = await executeScript(action);

      expect(result).toEqual({
        success: false,
        message: 'Script type is required',
      });
    });

    test('should execute JavaScript script', async () => {
      const action = {
        script: 'console.log("hello world")',
        scriptType: 'javascript',
      };

      const result = await executeScript(action);

      expect(vm.createContext).toHaveBeenCalled();
      expect(vm.runInContext).toHaveBeenCalled();
      expect(result).toEqual({
        success: true,
        message: 'JavaScript executed successfully',
      });
    });

    test('should handle case-insensitive script types', async () => {
      const action = {
        script: 'console.log("test")',
        scriptType: 'JAVASCRIPT',
      };

      const result = await executeScript(action);

      expect(result.success).toBe(true);
      expect(result.message).toContain('JavaScript');
    });

    test('should return error for unsupported script type', async () => {
      const action = {
        script: 'print("hello")',
        scriptType: 'python',
      };

      const result = await executeScript(action);

      expect(result).toEqual({
        success: false,
        message: 'Unsupported script type: python',
      });
    });

    test('should handle unexpected errors gracefully', async () => {
      const action = {
        script: 'console.log("test")',
        scriptType: 'javascript',
      };

      const error = new Error('Unexpected error');
      vm.createContext.mockImplementation(() => {
        throw error;
      });

      const result = await executeScript(action);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Error executing JavaScript: Unexpected error');
      expect(result.error).toBe(error);
    });
  });

  describe('JavaScript execution', () => {
    test('should create sandbox with proper context', async () => {
      const action = {
        script: 'result = { success: true, data: "test" }',
        scriptType: 'javascript',
        scriptParams: { input: 'value' },
      };

      const mockContext = {};
      vm.createContext.mockReturnValue(mockContext);

      await executeScript(action);

      expect(vm.createContext).toHaveBeenCalledWith(
        expect.objectContaining({
          console: expect.anything(),
          require: expect.anything(),
          process: expect.objectContaining({
            platform: process.platform,
            arch: process.arch,
          }),
          params: { input: 'value' },
          result: null,
        })
      );
    });

    test('should return script result when available', async () => {
      const action = {
        script: 'result = { success: true, data: "custom result" }',
        scriptType: 'javascript',
      };

      // Mock createContext to return the same object that was passed to it
      // This simulates how vm.createContext actually works with the sandbox
      vm.createContext.mockImplementation((sandbox) => sandbox);
      vm.runInContext.mockImplementation((code, context) => {
        // Simulate the script execution setting the result property on the sandbox
        context.result = { success: true, data: 'custom result' };
      });

      const result = await executeScript(action);

      expect(result).toEqual({ success: true, data: 'custom result' });
    });

    test('should handle JavaScript execution errors', async () => {
      const action = {
        script: 'throw new Error("Script error")',
        scriptType: 'javascript',
      };

      const error = new Error('VM execution error');
      vm.runInContext.mockImplementation(() => {
        throw error;
      });

      const result = await executeScript(action);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Error executing JavaScript: VM execution error');
      expect(result.error).toBe(error);
    });
  });

  describe('AppleScript execution', () => {
    test('should execute AppleScript on macOS', async () => {
      Object.defineProperty(process, 'platform', {
        value: 'darwin',
      });

      const action = {
        script: 'display dialog "Hello World"',
        scriptType: 'applescript',
      };

      const result = await executeScript(action);

      expect(fs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('toast-applescript-'),
        'display dialog "Hello World"'
      );
      expect(exec).toHaveBeenCalledWith(
        expect.stringContaining('osascript'),
        expect.any(Function)
      );
      expect(result).toEqual({
        success: true,
        message: 'AppleScript executed successfully',
        stdout: 'mock stdout',
        stderr: 'mock stderr',
      });
    });

    test('should return error for AppleScript on non-macOS', async () => {
      Object.defineProperty(process, 'platform', {
        value: 'win32',
      });

      const action = {
        script: 'display dialog "Hello World"',
        scriptType: 'applescript',
      };

      const result = await executeScript(action);

      expect(result).toEqual({
        success: false,
        message: 'AppleScript is only supported on macOS',
      });
    });

    test('should handle AppleScript execution error', async () => {
      Object.defineProperty(process, 'platform', {
        value: 'darwin',
      });

      const action = {
        script: 'invalid applescript',
        scriptType: 'applescript',
      };

      const error = new Error('AppleScript error');
      exec.mockImplementation((command, callback) => {
        callback(error, null, 'error output');
      });

      try {
        await executeScript(action);
        fail('Should have rejected');
      } catch (result) {
        expect(result.success).toBe(false);
        expect(result.message).toBe('AppleScript error');
        expect(result.error).toBe(error);
        expect(result.stderr).toBe('error output');
      }
    });

    test('should clean up temporary AppleScript file', async () => {
      Object.defineProperty(process, 'platform', {
        value: 'darwin',
      });

      const action = {
        script: 'display dialog "Hello World"',
        scriptType: 'applescript',
      };

      await executeScript(action);

      expect(fs.unlinkSync).toHaveBeenCalledWith(
        expect.stringContaining('toast-applescript-')
      );
    });

    test('should handle file cleanup error gracefully', async () => {
      Object.defineProperty(process, 'platform', {
        value: 'darwin',
      });

      const action = {
        script: 'display dialog "Hello World"',
        scriptType: 'applescript',
      };

      fs.unlinkSync.mockImplementation(() => {
        throw new Error('File deletion error');
      });

      const result = await executeScript(action);

      // Should still succeed despite cleanup error
      expect(result.success).toBe(true);
    });
  });

  describe('PowerShell execution', () => {
    test('should execute PowerShell on Windows', async () => {
      Object.defineProperty(process, 'platform', {
        value: 'win32',
      });

      const action = {
        script: 'Write-Host "Hello World"',
        scriptType: 'powershell',
      };

      const result = await executeScript(action);

      expect(fs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('toast-powershell-'),
        'Write-Host "Hello World"'
      );
      expect(exec).toHaveBeenCalledWith(
        expect.stringContaining('powershell -ExecutionPolicy Bypass'),
        expect.any(Function)
      );
      expect(result).toEqual({
        success: true,
        message: 'PowerShell script executed successfully',
        stdout: 'mock stdout',
        stderr: 'mock stderr',
      });
    });

    test('should return error for PowerShell on non-Windows', async () => {
      Object.defineProperty(process, 'platform', {
        value: 'darwin',
      });

      const action = {
        script: 'Write-Host "Hello World"',
        scriptType: 'powershell',
      };

      const result = await executeScript(action);

      expect(result).toEqual({
        success: false,
        message: 'PowerShell is only supported on Windows',
      });
    });

    test('should handle PowerShell execution error', async () => {
      Object.defineProperty(process, 'platform', {
        value: 'win32',
      });

      const action = {
        script: 'Invalid-PowerShellCommand',
        scriptType: 'powershell',
      };

      const error = new Error('PowerShell error');
      exec.mockImplementation((command, callback) => {
        callback(error, null, 'error output');
      });

      try {
        await executeScript(action);
        fail('Should have rejected');
      } catch (result) {
        expect(result.success).toBe(false);
        expect(result.message).toBe('PowerShell error');
        expect(result.error).toBe(error);
        expect(result.stderr).toBe('error output');
      }
    });
  });

  describe('Bash execution', () => {
    test('should execute Bash on macOS', async () => {
      Object.defineProperty(process, 'platform', {
        value: 'darwin',
      });

      const action = {
        script: 'echo "Hello World"',
        scriptType: 'bash',
      };

      const result = await executeScript(action);

      expect(fs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('toast-bash-'),
        'echo "Hello World"'
      );
      expect(fs.chmodSync).toHaveBeenCalledWith(
        expect.stringContaining('toast-bash-'),
        '755'
      );
      expect(exec).toHaveBeenCalledWith(
        expect.stringContaining('/tmp/toast-bash-'),
        expect.any(Function)
      );
      expect(result).toEqual({
        success: true,
        message: 'Bash script executed successfully',
        stdout: 'mock stdout',
        stderr: 'mock stderr',
      });
    });

    test('should execute Bash on Linux', async () => {
      Object.defineProperty(process, 'platform', {
        value: 'linux',
      });

      const action = {
        script: 'echo "Hello World"',
        scriptType: 'bash',
      };

      const result = await executeScript(action);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Bash script executed successfully');
    });

    test('should return error for Bash on Windows', async () => {
      Object.defineProperty(process, 'platform', {
        value: 'win32',
      });

      const action = {
        script: 'echo "Hello World"',
        scriptType: 'bash',
      };

      const result = await executeScript(action);

      expect(result).toEqual({
        success: false,
        message: 'Bash is not supported on Windows',
      });
    });

    test('should handle Bash execution error', async () => {
      Object.defineProperty(process, 'platform', {
        value: 'darwin',
      });

      const action = {
        script: 'invalid-command',
        scriptType: 'bash',
      };

      const error = new Error('Bash error');
      exec.mockImplementation((command, callback) => {
        callback(error, null, 'error output');
      });

      try {
        await executeScript(action);
        fail('Should have rejected');
      } catch (result) {
        expect(result.success).toBe(false);
        expect(result.message).toBe('Bash error');
        expect(result.error).toBe(error);
        expect(result.stderr).toBe('error output');
      }
    });
  });

  describe('edge cases', () => {
    test('should handle empty script content', async () => {
      const action = {
        script: '',
        scriptType: 'javascript',
      };

      const result = await executeScript(action);

      expect(result).toEqual({
        success: false,
        message: 'Script content is required',
      });
    });

    test('should handle null script content', async () => {
      const action = {
        script: null,
        scriptType: 'javascript',
      };

      const result = await executeScript(action);

      expect(result).toEqual({
        success: false,
        message: 'Script content is required',
      });
    });

    test('should handle empty script type', async () => {
      const action = {
        script: 'console.log("test")',
        scriptType: '',
      };

      const result = await executeScript(action);

      expect(result).toEqual({
        success: false,
        message: 'Script type is required',
      });
    });

    test('should handle null script type', async () => {
      const action = {
        script: 'console.log("test")',
        scriptType: null,
      };

      const result = await executeScript(action);

      expect(result).toEqual({
        success: false,
        message: 'Script type is required',
      });
    });

    test('should handle JavaScript with no result', async () => {
      const action = {
        script: 'console.log("no result set")',
        scriptType: 'javascript',
      };

      const mockSandbox = { result: null };
      vm.createContext.mockReturnValue(mockSandbox);

      const result = await executeScript(action);

      expect(result).toEqual({
        success: true,
        message: 'JavaScript executed successfully',
      });
    });

    test('should handle file system errors gracefully', async () => {
      Object.defineProperty(process, 'platform', {
        value: 'darwin',
      });

      const action = {
        script: 'echo "test"',
        scriptType: 'bash',
      };

      const error = new Error('File system error');
      fs.writeFileSync.mockImplementation(() => {
        throw error;
      });

      const result = await executeScript(action);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Error executing Bash script: File system error');
      expect(result.error).toBe(error);
    });
  });
});