/**
 * Toast - Action Executor
 *
 * This module orchestrates the execution of different action types.
 */

// Import action handlers
const { executeApplication } = require('./actions/application');
const { executeChainedActions } = require('./actions/chain');
const { executeCommand } = require('./actions/exec');
const { executeScript } = require('./actions/script');
const { openItem } = require('./actions/open');
const { ensureApproved } = require('./action-approval');

const { validateAction } = require('./action-validation');

/**
 * Execute an action based on its type
 * @param {Object} action - Action configuration
 * @param {number} [depth] - Current chain nesting depth (internal use)
 * @returns {Promise<Object>} Result object
 */
async function executeAction(action, depth = 0) {
  try {
    // Validate action
    if (!action) {
      return { success: false, message: 'No action provided' };
    }

    if (!action.action) {
      return { success: false, message: 'Action type is required' };
    }

    // Risky actions downloaded from cloud sync need one-time user approval.
    if (action.action === 'exec' || action.action === 'script') {
      const { approved, reason } = await ensureApproved(action);
      if (!approved) {
        return { success: false, message: reason };
      }
    }

    // Execute based on action type
    switch (action.action) {
      case 'application':
        return await executeApplication(action);
      case 'exec':
        return await executeCommand(action);
      case 'open':
        return await openItem(action);
      case 'script':
        return await executeScript(action);
      case 'chain':
        return await executeChainedActions(action, depth);
      default:
        return {
          success: false,
          message: `Unsupported action type: ${action.action}`,
        };
    }
  }
  catch (error) {
    return {
      success: false,
      message: `Error executing action: ${error.message}`,
      error,
    };
  }
}

module.exports = {
  executeAction,
  validateAction,
};
