/**
 * Toast - Chain Action Tests
 *
 * 체인 액션에 대한 단위 테스트 - 여러 액션을 순서대로 실행
 */

// Mock dependencies
jest.mock('../../../src/main/executor', () => ({
  executeAction: jest.fn(),
}));

const { executeChainedActions } = require('../../../src/main/actions/chain');
const { executeAction } = require('../../../src/main/executor');

describe('Chain Action', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
    
    // Setup default mock implementation for executeAction
    executeAction.mockResolvedValue({
      success: true,
      message: 'Action executed successfully',
    });
  });

  describe('executeChainedActions', () => {
    test('should return error when actions array is missing', async () => {
      const action = {};

      const result = await executeChainedActions(action);

      expect(result).toEqual({
        success: false,
        message: 'Chain action requires a non-empty array of actions',
        results: [],
      });
    });

    test('should return error when actions is null', async () => {
      const action = { actions: null };

      const result = await executeChainedActions(action);

      expect(result).toEqual({
        success: false,
        message: 'Chain action requires a non-empty array of actions',
        results: [],
      });
    });

    test('should return error when actions is not an array', async () => {
      const action = { actions: 'not-an-array' };

      const result = await executeChainedActions(action);

      expect(result).toEqual({
        success: false,
        message: 'Chain action requires a non-empty array of actions',
        results: [],
      });
    });

    test('should return error when actions array is empty', async () => {
      const action = { actions: [] };

      const result = await executeChainedActions(action);

      expect(result).toEqual({
        success: false,
        message: 'Chain action requires a non-empty array of actions',
        results: [],
      });
    });

    test('should execute single action successfully', async () => {
      const testAction = { action: 'application', applicationPath: '/test/app' };
      const action = { actions: [testAction] };
      const expectedResult = { success: true, message: 'App launched' };
      
      executeAction.mockResolvedValue(expectedResult);

      const result = await executeChainedActions(action);

      expect(executeAction).toHaveBeenCalledWith(testAction);
      expect(executeAction).toHaveBeenCalledTimes(1);
      expect(result).toEqual({
        success: true,
        message: 'Chain executed successfully',
        results: [
          {
            index: 0,
            action: testAction,
            result: expectedResult,
          },
        ],
      });
    });

    test('should execute multiple actions successfully', async () => {
      const testActions = [
        { action: 'application', applicationPath: '/test/app1' },
        { action: 'open', url: 'https://example.com' },
        { action: 'exec', command: 'echo hello' },
      ];
      const action = { actions: testActions };
      
      const expectedResults = [
        { success: true, message: 'App1 launched' },
        { success: true, message: 'URL opened' },
        { success: true, message: 'Command executed' },
      ];
      
      executeAction
        .mockResolvedValueOnce(expectedResults[0])
        .mockResolvedValueOnce(expectedResults[1])
        .mockResolvedValueOnce(expectedResults[2]);

      const result = await executeChainedActions(action);

      expect(executeAction).toHaveBeenCalledTimes(3);
      expect(executeAction).toHaveBeenNthCalledWith(1, testActions[0]);
      expect(executeAction).toHaveBeenNthCalledWith(2, testActions[1]);
      expect(executeAction).toHaveBeenNthCalledWith(3, testActions[2]);
      
      expect(result).toEqual({
        success: true,
        message: 'Chain executed successfully',
        results: [
          { index: 0, action: testActions[0], result: expectedResults[0] },
          { index: 1, action: testActions[1], result: expectedResults[1] },
          { index: 2, action: testActions[2], result: expectedResults[2] },
        ],
      });
    });
  });

  describe('stopOnError behavior', () => {
    test('should stop on first error by default (stopOnError=true implicit)', async () => {
      const testActions = [
        { action: 'application', applicationPath: '/test/app1' },
        { action: 'open', url: 'invalid-url' },
        { action: 'exec', command: 'echo hello' },
      ];
      const action = { actions: testActions }; // No stopOnError specified
      
      const expectedResults = [
        { success: true, message: 'App1 launched' },
        { success: false, message: 'Failed to open URL' },
      ];
      
      executeAction
        .mockResolvedValueOnce(expectedResults[0])
        .mockResolvedValueOnce(expectedResults[1]);

      const result = await executeChainedActions(action);

      expect(executeAction).toHaveBeenCalledTimes(2); // Should stop after second action fails
      expect(executeAction).toHaveBeenNthCalledWith(1, testActions[0]);
      expect(executeAction).toHaveBeenNthCalledWith(2, testActions[1]);
      expect(executeAction).not.toHaveBeenNthCalledWith(3, testActions[2]);
      
      expect(result).toEqual({
        success: false,
        message: 'Chain execution stopped due to an error',
        results: [
          { index: 0, action: testActions[0], result: expectedResults[0] },
          { index: 1, action: testActions[1], result: expectedResults[1] },
        ],
      });
    });

    test('should stop on first error when stopOnError=true explicit', async () => {
      const testActions = [
        { action: 'application', applicationPath: '/test/app1' },
        { action: 'open', url: 'invalid-url' },
        { action: 'exec', command: 'echo hello' },
      ];
      const action = { actions: testActions, stopOnError: true };
      
      const expectedResults = [
        { success: true, message: 'App1 launched' },
        { success: false, message: 'Failed to open URL' },
      ];
      
      executeAction
        .mockResolvedValueOnce(expectedResults[0])
        .mockResolvedValueOnce(expectedResults[1]);

      const result = await executeChainedActions(action);

      expect(executeAction).toHaveBeenCalledTimes(2);
      expect(result.success).toBe(false);
      expect(result.message).toBe('Chain execution stopped due to an error');
      expect(result.results).toHaveLength(2);
    });

    test('should continue execution when stopOnError=false', async () => {
      const testActions = [
        { action: 'application', applicationPath: '/test/app1' },
        { action: 'open', url: 'invalid-url' },
        { action: 'exec', command: 'echo hello' },
      ];
      const action = { actions: testActions, stopOnError: false };
      
      const expectedResults = [
        { success: true, message: 'App1 launched' },
        { success: false, message: 'Failed to open URL' },
        { success: true, message: 'Command executed' },
      ];
      
      executeAction
        .mockResolvedValueOnce(expectedResults[0])
        .mockResolvedValueOnce(expectedResults[1])
        .mockResolvedValueOnce(expectedResults[2]);

      const result = await executeChainedActions(action);

      expect(executeAction).toHaveBeenCalledTimes(3); // Should continue despite failure
      expect(executeAction).toHaveBeenNthCalledWith(1, testActions[0]);
      expect(executeAction).toHaveBeenNthCalledWith(2, testActions[1]);
      expect(executeAction).toHaveBeenNthCalledWith(3, testActions[2]);
      
      expect(result).toEqual({
        success: true, // Overall success because not all actions failed
        message: 'Chain executed successfully',
        results: [
          { index: 0, action: testActions[0], result: expectedResults[0] },
          { index: 1, action: testActions[1], result: expectedResults[1] },
          { index: 2, action: testActions[2], result: expectedResults[2] },
        ],
      });
    });

    test('should handle multiple failures with stopOnError=false', async () => {
      const testActions = [
        { action: 'application', applicationPath: '/invalid/app' },
        { action: 'open', url: 'invalid-url' },
        { action: 'exec', command: 'invalid-command' },
      ];
      const action = { actions: testActions, stopOnError: false };
      
      const expectedResults = [
        { success: false, message: 'App not found' },
        { success: false, message: 'Failed to open URL' },
        { success: false, message: 'Command failed' },
      ];
      
      executeAction
        .mockResolvedValueOnce(expectedResults[0])
        .mockResolvedValueOnce(expectedResults[1])
        .mockResolvedValueOnce(expectedResults[2]);

      const result = await executeChainedActions(action);

      expect(executeAction).toHaveBeenCalledTimes(3);
      expect(result).toEqual({
        success: true, // Success because execution completed without throwing
        message: 'Chain executed successfully',
        results: [
          { index: 0, action: testActions[0], result: expectedResults[0] },
          { index: 1, action: testActions[1], result: expectedResults[1] },
          { index: 2, action: testActions[2], result: expectedResults[2] },
        ],
      });
    });

    test('should handle first action failure with stopOnError=true', async () => {
      const testActions = [
        { action: 'application', applicationPath: '/invalid/app' },
        { action: 'exec', command: 'echo hello' },
      ];
      const action = { actions: testActions, stopOnError: true };
      
      const expectedResult = { success: false, message: 'App not found' };
      executeAction.mockResolvedValueOnce(expectedResult);

      const result = await executeChainedActions(action);

      expect(executeAction).toHaveBeenCalledTimes(1);
      expect(result).toEqual({
        success: false,
        message: 'Chain execution stopped due to an error',
        results: [
          { index: 0, action: testActions[0], result: expectedResult },
        ],
      });
    });

    test('should handle last action failure with stopOnError=true', async () => {
      const testActions = [
        { action: 'application', applicationPath: '/test/app' },
        { action: 'exec', command: 'invalid-command' },
      ];
      const action = { actions: testActions, stopOnError: true };
      
      const expectedResults = [
        { success: true, message: 'App launched' },
        { success: false, message: 'Command failed' },
      ];
      
      executeAction
        .mockResolvedValueOnce(expectedResults[0])
        .mockResolvedValueOnce(expectedResults[1]);

      const result = await executeChainedActions(action);

      expect(executeAction).toHaveBeenCalledTimes(2);
      expect(result).toEqual({
        success: false,
        message: 'Chain execution stopped due to an error',
        results: [
          { index: 0, action: testActions[0], result: expectedResults[0] },
          { index: 1, action: testActions[1], result: expectedResults[1] },
        ],
      });
    });
  });

  describe('error handling', () => {
    test('should handle executeAction throwing an error', async () => {
      const testActions = [
        { action: 'application', applicationPath: '/test/app' },
      ];
      const action = { actions: testActions };
      
      const error = new Error('Executor crashed');
      executeAction.mockRejectedValue(error);

      const result = await executeChainedActions(action);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Error executing chain action: Executor crashed');
      expect(result.error).toBe(error);
      expect(result.results).toEqual([]);
    });

    test('should handle unexpected errors in try-catch', async () => {
      const testActions = [
        { action: 'application', applicationPath: '/test/app' },
      ];
      const action = { actions: testActions };
      
      // Mock executeAction to throw during first call
      executeAction.mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      const result = await executeChainedActions(action);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Error executing chain action: Unexpected error');
      expect(result.error).toBeInstanceOf(Error);
      expect(result.results).toEqual([]);
    });

    test('should handle non-Error thrown objects', async () => {
      const testActions = [
        { action: 'application', applicationPath: '/test/app' },
      ];
      const action = { actions: testActions };
      
      executeAction.mockRejectedValue('String error');

      const result = await executeChainedActions(action);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Error executing chain action: String error');
      expect(result.error).toBe('String error');
      expect(result.results).toEqual([]);
    });
  });

  describe('edge cases', () => {
    test('should handle actions with complex nested objects', async () => {
      const complexAction = {
        action: 'script',
        script: 'console.log("test")',
        scriptType: 'javascript',
        scriptParams: { nested: { data: 'value' } },
      };
      const action = { actions: [complexAction] };
      const expectedResult = { success: true, message: 'Script executed' };
      
      executeAction.mockResolvedValue(expectedResult);

      const result = await executeChainedActions(action);

      expect(executeAction).toHaveBeenCalledWith(complexAction);
      expect(result).toEqual({
        success: true,
        message: 'Chain executed successfully',
        results: [
          {
            index: 0,
            action: complexAction,
            result: expectedResult,
          },
        ],
      });
    });

    test('should preserve action order in results', async () => {
      const testActions = [
        { action: 'exec', command: 'first' },
        { action: 'exec', command: 'second' },
        { action: 'exec', command: 'third' },
        { action: 'exec', command: 'fourth' },
        { action: 'exec', command: 'fifth' },
      ];
      const action = { actions: testActions };
      
      // Mock different results for each action
      const expectedResults = testActions.map((_, i) => ({
        success: true,
        message: `Command ${i + 1} executed`,
      }));
      
      executeAction
        .mockResolvedValueOnce(expectedResults[0])
        .mockResolvedValueOnce(expectedResults[1])
        .mockResolvedValueOnce(expectedResults[2])
        .mockResolvedValueOnce(expectedResults[3])
        .mockResolvedValueOnce(expectedResults[4]);

      const result = await executeChainedActions(action);

      expect(result.results).toHaveLength(5);
      result.results.forEach((resultItem, index) => {
        expect(resultItem.index).toBe(index);
        expect(resultItem.action).toEqual(testActions[index]);
        expect(resultItem.result).toEqual(expectedResults[index]);
      });
    });

    test('should handle mixed success/failure results correctly with stopOnError=false', async () => {
      const testActions = [
        { action: 'exec', command: 'success1' },
        { action: 'exec', command: 'failure1' },
        { action: 'exec', command: 'success2' },
        { action: 'exec', command: 'failure2' },
        { action: 'exec', command: 'success3' },
      ];
      const action = { actions: testActions, stopOnError: false };
      
      const expectedResults = [
        { success: true, message: 'Success 1' },
        { success: false, message: 'Failure 1' },
        { success: true, message: 'Success 2' },
        { success: false, message: 'Failure 2' },
        { success: true, message: 'Success 3' },
      ];
      
      expectedResults.forEach((result, index) => {
        executeAction.mockResolvedValueOnce(result);
      });

      const result = await executeChainedActions(action);

      expect(executeAction).toHaveBeenCalledTimes(5);
      expect(result.success).toBe(true); // Should be true because execution completed
      expect(result.message).toBe('Chain executed successfully');
      expect(result.results).toHaveLength(5);
      
      // Verify each result maintains correct structure
      result.results.forEach((resultItem, index) => {
        expect(resultItem.index).toBe(index);
        expect(resultItem.action).toEqual(testActions[index]);
        expect(resultItem.result).toEqual(expectedResults[index]);
      });
    });

    test('should handle undefined stopOnError (should default to true)', async () => {
      const testActions = [
        { action: 'exec', command: 'success' },
        { action: 'exec', command: 'failure' },
        { action: 'exec', command: 'never-reached' },
      ];
      const action = { actions: testActions, stopOnError: undefined };
      
      executeAction
        .mockResolvedValueOnce({ success: true, message: 'Success' })
        .mockResolvedValueOnce({ success: false, message: 'Failure' });

      const result = await executeChainedActions(action);

      expect(executeAction).toHaveBeenCalledTimes(2); // Should stop on error
      expect(result.success).toBe(false);
      expect(result.message).toBe('Chain execution stopped due to an error');
    });
  });
});