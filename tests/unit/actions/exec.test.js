/**
 * Toast - Exec Action Tests
 *
 * 명령어 실행 액션에 대한 단위 테스트
 */

// Mock dependencies
jest.mock('fs', () => ({
  existsSync: jest.fn(),
  statSync: jest.fn(),
}));

jest.mock('child_process', () => ({
  exec: jest.fn(),
}));

jest.mock('os', () => ({
  homedir: jest.fn(),
}));

jest.mock('path', () => ({
  join: jest.fn(),
}));

const { executeCommand } = require('../../../src/main/actions/exec');
const fs = require('fs');
const { exec } = require('child_process');
const os = require('os');
const path = require('path');

describe('Exec Action', () => {
  let originalPlatform;

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
    
    // Store original platform
    originalPlatform = process.platform;
    
    // Setup default mock implementations
    os.homedir.mockReturnValue('/mock/home');
    path.join.mockImplementation((...parts) => parts.join('/'));
    fs.existsSync.mockReturnValue(true);
    fs.statSync.mockReturnValue({ isDirectory: () => true });
    exec.mockImplementation((command, options, callback) => {
      if (typeof options === 'function') {
        callback = options;
      }
      callback(null, 'mock stdout', 'mock stderr');
    });
  });

  afterEach(() => {
    // Restore original platform
    Object.defineProperty(process, 'platform', {
      value: originalPlatform,
    });
  });

  describe('executeCommand', () => {
    test('should return error when command is missing', async () => {
      const action = {};

      const result = await executeCommand(action);

      expect(result).toEqual({
        success: false,
        message: 'Command is required',
      });
    });

    test('should execute basic command successfully', async () => {
      const action = { command: 'echo "hello"' };

      const result = await executeCommand(action);

      expect(exec).toHaveBeenCalledWith('echo "hello"', { shell: true }, expect.any(Function));
      expect(result).toEqual({
        success: true,
        message: 'Command executed successfully',
        stdout: 'mock stdout',
        stderr: 'mock stderr',
      });
    });

    test('should handle command execution error', async () => {
      const action = { command: 'invalid-command' };
      const error = new Error('Command not found');
      
      exec.mockImplementation((command, options, callback) => {
        if (typeof options === 'function') {
          callback = options;
        }
        callback(error, null, 'error output');
      });

      try {
        await executeCommand(action);
        fail('Should have rejected');
      } catch (result) {
        expect(result.success).toBe(false);
        expect(result.message).toBe('Command execution failed: Command not found');
        expect(result.stderr).toBe('error output');
      }
    });

    describe('workingDir handling', () => {
      test('should execute command with working directory', async () => {
        const action = {
          command: 'ls',
          workingDir: '/test/dir',
        };

        const result = await executeCommand(action);

        expect(exec).toHaveBeenCalledWith(
          'ls',
          { shell: true, cwd: '/test/dir' },
          expect.any(Function)
        );
        expect(result.success).toBe(true);
      });

      test('should expand tilde in working directory', async () => {
        const action = {
          command: 'ls',
          workingDir: '~/documents',
        };

        const result = await executeCommand(action);

        expect(path.join).toHaveBeenCalledWith('/mock/home', 'documents');
        expect(exec).toHaveBeenCalledWith(
          'ls',
          { shell: true, cwd: '/mock/home/documents' },
          expect.any(Function)
        );
        expect(result.success).toBe(true);
      });

      test('should reject when working directory does not exist', async () => {
        const action = {
          command: 'ls',
          workingDir: '/nonexistent',
        };

        fs.existsSync.mockReturnValue(false);

        try {
          await executeCommand(action);
          fail('Should have rejected');
        } catch (result) {
          expect(result.success).toBe(false);
          expect(result.message).toBe('Working directory does not exist: /nonexistent');
        }
      });

      test('should reject when working directory is not a directory', async () => {
        const action = {
          command: 'ls',
          workingDir: '/test/file.txt',
        };

        fs.statSync.mockReturnValue({ isDirectory: () => false });

        try {
          await executeCommand(action);
          fail('Should have rejected');
        } catch (result) {
          expect(result.success).toBe(false);
          expect(result.message).toBe('Working directory path is not a directory: /test/file.txt');
        }
      });
    });

    describe('macOS open -a special handling', () => {
      beforeEach(() => {
        Object.defineProperty(process, 'platform', {
          value: 'darwin',
        });
      });

      test('should handle open -a command with working directory', async () => {
        const action = {
          command: 'open -a "Visual Studio Code"',
          workingDir: '/test/project',
        };

        const result = await executeCommand(action);

        expect(exec).toHaveBeenCalledWith(
          'open -a Visual Studio Code "/test/project"',
          { shell: true },
          expect.any(Function)
        );
        expect(result).toEqual({
          success: true,
          message: 'Application "Visual Studio Code" opened with working directory: /test/project',
          stdout: 'mock stdout',
          stderr: 'mock stderr',
        });
      });

      test('should handle open -a command with app name without quotes', async () => {
        const action = {
          command: 'open -a Calculator',
          workingDir: '/test/project',
        };

        const result = await executeCommand(action);

        expect(exec).toHaveBeenCalledWith(
          'open -a Calculator "/test/project"',
          { shell: true },
          expect.any(Function)
        );
        expect(result.success).toBe(true);
      });

      test('should handle open -a command with additional arguments', async () => {
        const action = {
          command: 'open -a "Visual Studio Code" --new-window',
          workingDir: '/test/project',
        };

        const result = await executeCommand(action);

        expect(exec).toHaveBeenCalledWith(
          'open -a Visual Studio Code --new-window "/test/project"',
          { shell: true },
          expect.any(Function)
        );
        expect(result.success).toBe(true);
      });

      test('should handle open -a command with app name containing spaces', async () => {
        const action = {
          command: 'open -a Visual Studio Code',
          workingDir: '/test/project',
        };

        const result = await executeCommand(action);

        expect(exec).toHaveBeenCalledWith(
          'open -a "Visual Studio Code" "/test/project"',
          { shell: true },
          expect.any(Function)
        );
        expect(result.success).toBe(true);
      });

      test('should reject when working directory does not exist for open -a', async () => {
        const action = {
          command: 'open -a Calculator',
          workingDir: '/nonexistent',
        };

        fs.existsSync.mockReturnValue(false);

        const result = await executeCommand(action);

        expect(result).toEqual({
          success: false,
          message: 'Working directory does not exist: /nonexistent',
        });
      });

      test('should reject when working directory is not a directory for open -a', async () => {
        const action = {
          command: 'open -a Calculator',
          workingDir: '/test/file.txt',
        };

        fs.statSync.mockReturnValue({ isDirectory: () => false });

        const result = await executeCommand(action);

        expect(result).toEqual({
          success: false,
          message: 'Working directory path is not a directory: /test/file.txt',
        });
      });

      test('should handle open -a execution error', async () => {
        const action = {
          command: 'open -a Calculator',
          workingDir: '/test/project',
        };

        const error = new Error('App not found');
        exec.mockImplementation((command, options, callback) => {
          callback(error, null, 'error output');
        });

        try {
          await executeCommand(action);
          fail('Should have rejected');
        } catch (result) {
          expect(result.success).toBe(false);
          expect(result.message).toBe('Command execution failed: App not found');
          expect(result.stderr).toBe('error output');
        }
      });
    });

    describe('runInTerminal mode', () => {
      beforeEach(() => {
        Object.defineProperty(process, 'platform', {
          value: 'darwin',
        });
      });

      test('should execute command in terminal on macOS', async () => {
        const action = {
          command: 'npm start',
          runInTerminal: true,
        };

        const result = await executeCommand(action);

        expect(exec).toHaveBeenCalledWith(
          'osascript -e \'tell application "Terminal" to do script "npm start"\'',
          { shell: true },
          expect.any(Function)
        );
        expect(result).toEqual({
          success: true,
          message: 'Command opened in terminal',
        });
      });

      test('should execute command in terminal with working directory on macOS', async () => {
        const action = {
          command: 'npm start',
          workingDir: '/test/project',
          runInTerminal: true,
        };

        const result = await executeCommand(action);

        expect(exec).toHaveBeenCalledWith(
          'osascript -e \'tell application "Terminal" to do script "cd /test/project && npm start"\'',
          { shell: true },
          expect.any(Function)
        );
        expect(result.success).toBe(true);
      });

      test('should handle terminal execution error', async () => {
        const action = {
          command: 'npm start',
          runInTerminal: true,
        };

        const error = new Error('Terminal error');
        exec.mockImplementation((command, options, callback) => {
          callback(error);
        });

        const result = await executeCommand(action);

        expect(result).toEqual({
          success: false,
          message: 'Error opening terminal: Terminal error',
        });
      });

      describe('Windows platform', () => {
        beforeEach(() => {
          Object.defineProperty(process, 'platform', {
            value: 'win32',
          });
        });

        test('should execute command in terminal on Windows', async () => {
          const action = {
            command: 'npm start',
            runInTerminal: true,
          };

          const result = await executeCommand(action);

          expect(exec).toHaveBeenCalledWith(
            'start cmd.exe /K "npm start"',
            { shell: true },
            expect.any(Function)
          );
          expect(result.success).toBe(true);
        });

        test('should execute command in terminal with working directory on Windows', async () => {
          const action = {
            command: 'npm start',
            workingDir: 'C:\\test\\project',
            runInTerminal: true,
          };

          const result = await executeCommand(action);

          expect(exec).toHaveBeenCalledWith(
            'start cmd.exe /K "cd /d C:\\test\\project && npm start"',
            { shell: true },
            expect.any(Function)
          );
          expect(result.success).toBe(true);
        });
      });

      describe('Linux platform', () => {
        beforeEach(() => {
          Object.defineProperty(process, 'platform', {
            value: 'linux',
          });
        });

        test('should execute command in terminal on Linux', async () => {
          const action = {
            command: 'npm start',
            runInTerminal: true,
          };

          const result = await executeCommand(action);

          expect(exec).toHaveBeenCalledWith(
            'x-terminal-emulator -e "bash -c \'npm start; exec bash\'"',
            { shell: true },
            expect.any(Function)
          );
          expect(result.success).toBe(true);
        });

        test('should execute command in terminal with working directory on Linux', async () => {
          const action = {
            command: 'npm start',
            workingDir: '/test/project',
            runInTerminal: true,
          };

          const result = await executeCommand(action);

          expect(exec).toHaveBeenCalledWith(
            'x-terminal-emulator -e "bash -c \'cd /test/project && npm start; exec bash\'"',
            { shell: true },
            expect.any(Function)
          );
          expect(result.success).toBe(true);
        });
      });

      test('should handle open -a command in terminal without working directory', async () => {
        Object.defineProperty(process, 'platform', {
          value: 'darwin',
        });

        const action = {
          command: 'open -a "Visual Studio Code"',
          runInTerminal: true,
        };

        const result = await executeCommand(action);

        expect(exec).toHaveBeenCalledWith(
          'osascript -e \'tell application "Terminal" to do script "open -a "Visual Studio Code""\'',
          { shell: true },
          expect.any(Function)
        );
        expect(result.success).toBe(true);
      });
    });

    describe('edge cases', () => {
      test('should handle empty command', async () => {
        const action = { command: '' };

        const result = await executeCommand(action);

        expect(result).toEqual({
          success: false,
          message: 'Command is required',
        });
      });

      test('should handle null command', async () => {
        const action = { command: null };

        const result = await executeCommand(action);

        expect(result).toEqual({
          success: false,
          message: 'Command is required',
        });
      });

      test('should handle tilde expansion without working directory change', async () => {
        const action = { command: 'echo ~/test' };

        const result = await executeCommand(action);

        // Should not expand tilde in command itself, only in workingDir
        expect(exec).toHaveBeenCalledWith('echo ~/test', { shell: true }, expect.any(Function));
        expect(result.success).toBe(true);
      });
    });
  });
});