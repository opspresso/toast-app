/**
 * Toast - Chain Action Module
 *
 * This module handles executing a series of actions in sequence.
 */

/**
 * Execute a chain of actions in sequence
 * @param {Object} action - Chain action configuration
 * @param {Array} action.actions - Array of actions to execute in sequence
 * @param {boolean} [action.stopOnError=true] - Whether to stop execution if an action fails
 * @returns {Promise<Object>} Result object
 */
async function executeChainedActions(action) {
  // 순환 참조를 피하기 위해 executeAction을 동적으로 가져옵니다
  const { executeAction } = require('../executor');
  try {
    if (!action.actions || !Array.isArray(action.actions) || action.actions.length === 0) {
      return {
        success: false,
        message: 'Chain action requires a non-empty array of actions',
        results: []
      };
    }

    const stopOnError = action.stopOnError !== false; // Default to true if not specified
    const results = [];
    let hasErrors = false;

    // Execute actions in sequence
    for (let i = 0; i < action.actions.length; i++) {
      const currentAction = action.actions[i];
      const result = await executeAction(currentAction);

      results.push({
        index: i,
        action: currentAction,
        result: result
      });

      // If this action failed and stopOnError is true, stop execution
      if (!result.success && stopOnError) {
        hasErrors = true;
        break;
      }
    }

    return {
      success: !hasErrors,
      message: hasErrors ? 'Chain execution stopped due to an error' : 'Chain executed successfully',
      results: results
    };
  } catch (error) {
    return {
      success: false,
      message: `Error executing chain action: ${error.message || error}`,
      error: error,
      results: []
    };
  }
}

module.exports = {
  executeChainedActions
};
