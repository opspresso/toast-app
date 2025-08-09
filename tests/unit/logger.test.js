/**
 * Toast - Logger Tests
 *
 * Tests for the logging functionality
 */

// Mock electron-log
const mockElectronLog = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  verbose: jest.fn(),
  silly: jest.fn(),
  transports: {
    file: {
      resolvePathFn: null,
      maxSize: 0,
      maxFiles: 0,
      level: 'info',
      format: '',
    },
    console: {
      level: 'info',
      format: '',
    },
  },
};

jest.mock('electron-log', () => mockElectronLog);

// Mock electron app
const mockApp = {
  getPath: jest.fn(() => '/mock/user/data'),
};

jest.mock('electron', () => ({
  app: mockApp,
}));

// Mock path
jest.mock('path', () => ({
  join: jest.fn((...args) => args.join('/')),
}));

describe('Logger', () => {
  let logger;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Setup default mock responses
    mockApp.getPath.mockReturnValue('/mock/user/data');

    // Clear require cache to get fresh module
    delete require.cache[require.resolve('../../src/main/logger')];
    
    // Re-require the module
    logger = require('../../src/main/logger');
  });

  describe('Module Configuration', () => {
    test('should configure file transport', () => {
      expect(mockElectronLog.transports.file.resolvePathFn).toBeInstanceOf(Function);
      expect(mockElectronLog.transports.file.maxSize).toBe(5 * 1024 * 1024);
      expect(mockElectronLog.transports.file.maxFiles).toBe(5);
      expect(mockElectronLog.transports.file.level).toBe('info');
      expect(mockElectronLog.transports.file.format).toContain('{y}-{m}-{d}');
    });

    test('should configure console transport', () => {
      expect(mockElectronLog.transports.console.level).toBe('info');
      expect(mockElectronLog.transports.console.format).toContain('{h}:{i}:{s}');
    });

    test('should have console transport configured', () => {
      expect(mockElectronLog.transports.console.level).toBeDefined();
      expect(typeof mockElectronLog.transports.console.level).toBe('string');
    });

    test('should handle app path error', () => {
      const originalEnv = process.env;
      process.env.HOME = '/mock/home';
      
      mockApp.getPath.mockImplementation(() => {
        throw new Error('App not ready');
      });

      // Clear cache and re-require
      delete require.cache[require.resolve('../../src/main/logger')];
      
      const logger = require('../../src/main/logger');
      
      // Should load logger module successfully
      expect(typeof logger.createLogger).toBe('function');
      
      process.env = originalEnv;
    });

    test('should handle environment variables for path resolution', () => {
      expect(mockElectronLog.transports.file.resolvePathFn).toBeInstanceOf(Function);
      
      const logPath = mockElectronLog.transports.file.resolvePathFn();
      expect(typeof logPath).toBe('string');
      expect(logPath).toContain('toast-app.log');
    });
  });

  describe('Logger Creation', () => {
    test('should create logger for module', () => {
      const moduleLogger = logger.createLogger('TestModule');

      expect(moduleLogger).toBeDefined();
      expect(moduleLogger.info).toBeInstanceOf(Function);
      expect(moduleLogger.warn).toBeInstanceOf(Function);
      expect(moduleLogger.error).toBeInstanceOf(Function);
      expect(moduleLogger.debug).toBeInstanceOf(Function);
      expect(moduleLogger.verbose).toBeInstanceOf(Function);
      expect(moduleLogger.silly).toBeInstanceOf(Function);
    });

    test('should provide raw logger access', () => {
      const moduleLogger = logger.createLogger('TestModule');

      expect(moduleLogger.raw).toBe(mockElectronLog);
    });

    test('should handle undefined module name', () => {
      const moduleLogger = logger.createLogger(undefined);

      moduleLogger.info('test message');

      expect(mockElectronLog.info).toHaveBeenCalledWith('[undefined] test message');
    });

    test('should handle null module name', () => {
      const moduleLogger = logger.createLogger(null);

      moduleLogger.info('test message');

      expect(mockElectronLog.info).toHaveBeenCalledWith('[null] test message');
    });

    test('should handle empty module name', () => {
      const moduleLogger = logger.createLogger('');

      moduleLogger.info('test message');

      expect(mockElectronLog.info).toHaveBeenCalledWith('[] test message');
    });
  });

  describe('Logging Methods', () => {
    let moduleLogger;

    beforeEach(() => {
      moduleLogger = logger.createLogger('TestModule');
    });

    test('should log info messages', () => {
      moduleLogger.info('test info message');

      expect(mockElectronLog.info).toHaveBeenCalledWith('[TestModule] test info message');
    });

    test('should log warning messages', () => {
      moduleLogger.warn('test warning message');

      expect(mockElectronLog.warn).toHaveBeenCalledWith('[TestModule] test warning message');
    });

    test('should log error messages', () => {
      moduleLogger.error('test error message');

      expect(mockElectronLog.error).toHaveBeenCalledWith('[TestModule] test error message');
    });

    test('should log debug messages', () => {
      moduleLogger.debug('test debug message');

      expect(mockElectronLog.debug).toHaveBeenCalledWith('[TestModule] test debug message');
    });

    test('should log verbose messages', () => {
      moduleLogger.verbose('test verbose message');

      expect(mockElectronLog.verbose).toHaveBeenCalledWith('[TestModule] test verbose message');
    });

    test('should log silly messages', () => {
      moduleLogger.silly('test silly message');

      expect(mockElectronLog.silly).toHaveBeenCalledWith('[TestModule] test silly message');
    });

    test('should pass additional arguments', () => {
      const error = new Error('Test error');
      const data = { key: 'value' };

      moduleLogger.error('test error', error, data);

      expect(mockElectronLog.error).toHaveBeenCalledWith(
        '[TestModule] test error',
        error,
        data
      );
    });

    test('should handle no arguments', () => {
      moduleLogger.info();

      expect(mockElectronLog.info).toHaveBeenCalledWith('[TestModule] undefined');
    });

    test('should handle multiple arguments', () => {
      moduleLogger.info('message', 'arg1', 'arg2', { data: 'test' });

      expect(mockElectronLog.info).toHaveBeenCalledWith(
        '[TestModule] message',
        'arg1',
        'arg2',
        { data: 'test' }
      );
    });
  });

  describe('IPC Logging', () => {
    test('should handle IPC logging requests', () => {
      logger.handleIpcLogging('info', 'test message from renderer');

      expect(mockElectronLog.info).toHaveBeenCalledWith('[Renderer] test message from renderer');
    });

    test('should handle IPC logging with additional arguments', () => {
      const error = new Error('Renderer error');
      
      logger.handleIpcLogging('error', 'renderer error', error);

      expect(mockElectronLog.error).toHaveBeenCalledWith(
        '[Renderer] renderer error',
        error
      );
    });

    test('should handle different log levels via IPC', () => {
      logger.handleIpcLogging('warn', 'warning from renderer');
      logger.handleIpcLogging('debug', 'debug from renderer');
      logger.handleIpcLogging('verbose', 'verbose from renderer');

      expect(mockElectronLog.warn).toHaveBeenCalledWith('[Renderer] warning from renderer');
      expect(mockElectronLog.debug).toHaveBeenCalledWith('[Renderer] debug from renderer');
      expect(mockElectronLog.verbose).toHaveBeenCalledWith('[Renderer] verbose from renderer');
    });

    test('should handle invalid log level via IPC', () => {
      // This would normally throw if electron-log doesn't have the method
      mockElectronLog.invalidLevel = jest.fn();
      
      logger.handleIpcLogging('invalidLevel', 'test message');

      expect(mockElectronLog.invalidLevel).toHaveBeenCalledWith('[Renderer] test message');
    });
  });

  describe('Log File Path Resolution', () => {
    test('should resolve log file path correctly', () => {
      const path = require('path');
      const resolvePathFn = mockElectronLog.transports.file.resolvePathFn;
      
      const logPath = resolvePathFn();

      expect(path.join).toHaveBeenCalledWith('/mock/user/data', 'logs/toast-app.log');
      expect(logPath).toBe('/mock/user/data/logs/toast-app.log');
    });
  });

  describe('Module Exports', () => {
    test('should export createLogger function', () => {
      expect(logger.createLogger).toBeInstanceOf(Function);
    });

    test('should export handleIpcLogging function', () => {
      expect(logger.handleIpcLogging).toBeInstanceOf(Function);
    });

    test('should export electronLog instance', () => {
      expect(logger.electronLog).toBe(mockElectronLog);
    });
  });

  describe('Multiple Logger Instances', () => {
    test('should create independent logger instances', () => {
      const logger1 = logger.createLogger('Module1');
      const logger2 = logger.createLogger('Module2');

      logger1.info('message from module 1');
      logger2.warn('warning from module 2');

      expect(mockElectronLog.info).toHaveBeenCalledWith('[Module1] message from module 1');
      expect(mockElectronLog.warn).toHaveBeenCalledWith('[Module2] warning from module 2');
    });

    test('should handle same module name for multiple instances', () => {
      const logger1 = logger.createLogger('SameModule');
      const logger2 = logger.createLogger('SameModule');

      logger1.info('message from instance 1');
      logger2.error('error from instance 2');

      expect(mockElectronLog.info).toHaveBeenCalledWith('[SameModule] message from instance 1');
      expect(mockElectronLog.error).toHaveBeenCalledWith('[SameModule] error from instance 2');
    });
  });

  describe('Edge Cases', () => {
    test('should handle very long module names', () => {
      const longModuleName = 'A'.repeat(1000);
      const longLogger = logger.createLogger(longModuleName);

      longLogger.info('test message');

      expect(mockElectronLog.info).toHaveBeenCalledWith(`[${longModuleName}] test message`);
    });

    test('should handle special characters in module names', () => {
      const specialModule = 'Module-With.Special_Characters@123';
      const specialLogger = logger.createLogger(specialModule);

      specialLogger.debug('special message');

      expect(mockElectronLog.debug).toHaveBeenCalledWith(`[${specialModule}] special message`);
    });

    test('should handle objects as log messages', () => {
      const moduleLogger = logger.createLogger('ObjectTest');
      const objectMessage = { message: 'object message', data: [1, 2, 3] };

      moduleLogger.info(objectMessage);

      expect(mockElectronLog.info).toHaveBeenCalledWith('[ObjectTest] [object Object]');
    });
  });
});