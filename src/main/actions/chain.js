/**
 * Toast - Chain Action Module
 *
 * This module handles executing a series of actions in sequence.
 */

// Upper bound on chain nesting depth, matching executor.js's validateAction.
// Without this, a deeply/self nested chain could exhaust the call stack at
// execution time even if it somehow bypassed validation.
const MAX_CHAIN_DEPTH = 10;

/**
 * Execute a chain of actions in sequence
 * @param {Object} action - Chain action configuration
 * @param {Array} action.actions - Array of actions to execute in sequence
 * @param {boolean} [action.stopOnError=true] - Whether to stop execution if an action fails
 * @param {number} [depth] - Current chain nesting depth (internal use)
 * @returns {Promise<Object>} Result object
 */
async function executeChainedActions(action, depth = 0) {
  // Dynamically require executeAction to avoid a circular reference
  const { executeAction } = require('../executor');
  try {
    if (depth >= MAX_CHAIN_DEPTH) {
      return {
        success: false,
        message: `Chain nesting exceeds maximum depth of ${MAX_CHAIN_DEPTH}`,
        results: [],
      };
    }

    if (!action.actions || !Array.isArray(action.actions) || action.actions.length === 0) {
      return {
        success: false,
        message: 'Chain action requires a non-empty array of actions',
        results: [],
      };
    }

    const stopOnError = action.stopOnError !== false; // Default to true if not specified
    const results = [];
    let hasErrors = false;
    let stoppedEarly = false;

    // Execute actions in sequence
    for (let i = 0; i < action.actions.length; i++) {
      const currentAction = action.actions[i];
      const result = await executeAction(currentAction, depth + 1);

      results.push({
        index: i,
        action: currentAction,
        result,
      });

      if (!result.success) {
        hasErrors = true;
        // If this action failed and stopOnError is true, stop execution
        if (stopOnError) {
          stoppedEarly = true;
          break;
        }
      }
    }

    let message = 'Chain executed successfully';
    if (stoppedEarly) {
      message = 'Chain execution stopped due to an error';
    }
    else if (hasErrors) {
      message = 'Chain completed with one or more errors';
    }

    return {
      success: !hasErrors,
      message,
      results,
    };
  }
  catch (error) {
    return {
      success: false,
      message: `Error executing chain action: ${error.message || error}`,
      error,
      results: [],
    };
  }
}

module.exports = {
  executeChainedActions,
};
