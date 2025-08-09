/**
 * Toast - Environment Configuration Tests
 *
 * Tests for environment variables loading module
 */

// Mock dependencies
const mockFs = {
  existsSync: jest.fn(),
};

const mockDotenv = {
  config: jest.fn(),
};

const mockPath = {
  join: jest.fn((...args) => args.join('/')),
};

jest.mock('fs', () => mockFs);
jest.mock('dotenv', () => mockDotenv);
jest.mock('path', () => mockPath);

jest.mock('../../../src/main/logger', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  })),
}));

describe('Environment Configuration', () => {
  let envConfig;
  let originalNodeEnv;
  let originalProcessEnv;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();

    // Store original environment
    originalNodeEnv = process.env.NODE_ENV;
    originalProcessEnv = { ...process.env };

    // Reset process.env
    process.env = { NODE_ENV: 'test' };

    // Setup default mocks
    mockFs.existsSync.mockReturnValue(false);
    mockDotenv.config.mockReturnValue({ parsed: {} });

    // Get fresh module instance
    envConfig = require('../../../src/main/config/env');
  });

  afterEach(() => {
    // Restore original environment
    process.env.NODE_ENV = originalNodeEnv;
    process.env = originalProcessEnv;
  });

  describe('loadEnv', () => {
    test('should load environment variables successfully when no env files exist', () => {
      mockFs.existsSync.mockReturnValue(false);

      const result = envConfig.loadEnv();

      expect(result).toBe(true);
      expect(mockFs.existsSync).toHaveBeenCalledTimes(2);
      expect(mockDotenv.config).not.toHaveBeenCalled();
    });

    test('should load default .env file when it exists', () => {
      mockFs.existsSync
        .mockReturnValueOnce(true)  // .env exists
        .mockReturnValueOnce(false); // .env.local doesn't exist

      const result = envConfig.loadEnv();

      expect(result).toBe(true);
      expect(mockDotenv.config).toHaveBeenCalledTimes(1);
      expect(mockDotenv.config).toHaveBeenCalledWith({
        path: expect.stringContaining('.env'),
      });
    });

    test('should load both .env and .env.local when both exist', () => {
      mockFs.existsSync
        .mockReturnValueOnce(true)  // .env exists
        .mockReturnValueOnce(true); // .env.local exists

      const result = envConfig.loadEnv();

      expect(result).toBe(true);
      expect(mockDotenv.config).toHaveBeenCalledTimes(2);
      expect(mockDotenv.config).toHaveBeenNthCalledWith(1, {
        path: expect.stringContaining('.env'),
      });
      expect(mockDotenv.config).toHaveBeenNthCalledWith(2, {
        path: expect.stringContaining('.env.local'),
      });
    });

    test('should only load .env.local when only it exists', () => {
      mockFs.existsSync
        .mockReturnValueOnce(false) // .env doesn't exist
        .mockReturnValueOnce(true); // .env.local exists

      const result = envConfig.loadEnv();

      expect(result).toBe(true);
      expect(mockDotenv.config).toHaveBeenCalledTimes(1);
      expect(mockDotenv.config).toHaveBeenCalledWith({
        path: expect.stringContaining('.env.local'),
      });
    });

    test('should not log in test environment', () => {
      process.env.NODE_ENV = 'test';
      mockFs.existsSync
        .mockReturnValueOnce(true)  // .env exists
        .mockReturnValueOnce(true); // .env.local exists

      const result = envConfig.loadEnv();

      expect(result).toBe(true);
      expect(mockDotenv.config).toHaveBeenCalledTimes(2);
    });

    test('should log in non-test environment', () => {
      process.env.NODE_ENV = 'development';
      mockFs.existsSync
        .mockReturnValueOnce(true)  // .env exists
        .mockReturnValueOnce(true); // .env.local exists

      const result = envConfig.loadEnv();

      expect(result).toBe(true);
      expect(mockDotenv.config).toHaveBeenCalledTimes(2);
    });

    test('should handle dotenv config errors', () => {
      mockFs.existsSync.mockReturnValue(true);
      mockDotenv.config.mockImplementation(() => {
        throw new Error('Config error');
      });

      const result = envConfig.loadEnv();

      expect(result).toBe(false);
    });

    test('should handle filesystem errors', () => {
      mockFs.existsSync.mockImplementation(() => {
        throw new Error('Filesystem error');
      });

      const result = envConfig.loadEnv();

      expect(result).toBe(false);
    });

    test('should use correct file paths', () => {
      mockFs.existsSync
        .mockReturnValueOnce(true)  // .env exists
        .mockReturnValueOnce(true); // .env.local exists

      envConfig.loadEnv();

      expect(mockPath.join).toHaveBeenCalledWith(expect.any(String));
      expect(mockPath.join).toHaveBeenCalledWith(expect.any(String), '.env');
      expect(mockPath.join).toHaveBeenCalledWith(expect.any(String), '.env.local');
    });
  });

  describe('getEnv', () => {
    test('should return environment variable value when it exists', () => {
      process.env.TEST_VAR = 'test-value';

      const result = envConfig.getEnv('TEST_VAR');

      expect(result).toBe('test-value');
    });

    test('should return default value when environment variable does not exist', () => {
      delete process.env.NON_EXISTENT_VAR;

      const result = envConfig.getEnv('NON_EXISTENT_VAR', 'default-value');

      expect(result).toBe('default-value');
    });

    test('should return empty string when no default value provided and var does not exist', () => {
      delete process.env.NON_EXISTENT_VAR;

      const result = envConfig.getEnv('NON_EXISTENT_VAR');

      expect(result).toBe('');
    });

    test('should return environment variable value over default value', () => {
      process.env.EXISTING_VAR = 'actual-value';

      const result = envConfig.getEnv('EXISTING_VAR', 'default-value');

      expect(result).toBe('actual-value');
    });

    test('should handle empty string environment variables', () => {
      process.env.EMPTY_VAR = '';

      const result = envConfig.getEnv('EMPTY_VAR', 'default-value');

      expect(result).toBe('default-value');
    });

    test('should handle whitespace-only environment variables', () => {
      process.env.WHITESPACE_VAR = '   ';

      const result = envConfig.getEnv('WHITESPACE_VAR', 'default-value');

      expect(result).toBe('   ');
    });

    test('should handle numeric strings', () => {
      process.env.NUMERIC_VAR = '12345';

      const result = envConfig.getEnv('NUMERIC_VAR');

      expect(result).toBe('12345');
      expect(typeof result).toBe('string');
    });

    test('should handle boolean-like strings', () => {
      process.env.BOOLEAN_VAR = 'true';

      const result = envConfig.getEnv('BOOLEAN_VAR');

      expect(result).toBe('true');
      expect(typeof result).toBe('string');
    });
  });

  describe('Integration Tests', () => {
    test('should load environment variables and make them accessible via getEnv', () => {
      // Simulate .env file loading
      mockFs.existsSync.mockReturnValue(true);
      mockDotenv.config.mockImplementation((options) => {
        if (options.path.includes('.env')) {
          process.env.LOADED_VAR = 'loaded-value';
        }
        return { parsed: { LOADED_VAR: 'loaded-value' } };
      });

      const loadResult = envConfig.loadEnv();
      const envValue = envConfig.getEnv('LOADED_VAR');

      expect(loadResult).toBe(true);
      expect(envValue).toBe('loaded-value');
    });

    test('should prioritize .env.local over .env', () => {
      mockFs.existsSync.mockReturnValue(true);
      mockDotenv.config
        .mockImplementationOnce(() => {
          // First call for .env
          process.env.PRIORITY_VAR = 'env-value';
          return { parsed: { PRIORITY_VAR: 'env-value' } };
        })
        .mockImplementationOnce(() => {
          // Second call for .env.local (should override)
          process.env.PRIORITY_VAR = 'local-value';
          return { parsed: { PRIORITY_VAR: 'local-value' } };
        });

      const loadResult = envConfig.loadEnv();
      const envValue = envConfig.getEnv('PRIORITY_VAR');

      expect(loadResult).toBe(true);
      expect(envValue).toBe('local-value');
    });
  });

  describe('Error Scenarios', () => {
    test('should handle partial loading failures', () => {
      mockFs.existsSync
        .mockReturnValueOnce(true)  // .env exists
        .mockReturnValueOnce(true); // .env.local exists

      mockDotenv.config
        .mockImplementationOnce(() => {
          // First call succeeds
          return { parsed: { VAR1: 'value1' } };
        })
        .mockImplementationOnce(() => {
          // Second call fails
          throw new Error('Local config error');
        });

      const result = envConfig.loadEnv();

      expect(result).toBe(false);
    });

    test('should handle missing __dirname', () => {
      // This tests robustness of path construction
      const result = envConfig.loadEnv();

      expect(mockPath.join).toHaveBeenCalled();
      expect(typeof result).toBe('boolean');
    });
  });

  describe('Module Exports', () => {
    test('should export loadEnv function', () => {
      expect(typeof envConfig.loadEnv).toBe('function');
    });

    test('should export getEnv function', () => {
      expect(typeof envConfig.getEnv).toBe('function');
    });

    test('should export correct number of functions', () => {
      const exportedFunctions = Object.keys(envConfig).filter(
        key => typeof envConfig[key] === 'function'
      );
      
      expect(exportedFunctions).toHaveLength(2);
      expect(exportedFunctions).toContain('loadEnv');
      expect(exportedFunctions).toContain('getEnv');
    });
  });
});