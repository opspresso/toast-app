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

/**
 * Execute an action based on its type
 * @param {Object} action - Action configuration
 * @returns {Promise<Object>} Result object
 */
async function executeAction(action) {
  try {
    // Validate action
    if (!action) {
      return { success: false, message: 'No action provided' };
    }

    if (!action.action) {
      return { success: false, message: 'Action type is required' };
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
        return await executeChainedActions(action);
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

/**
 * Test an action without executing it
 * @param {Object} action - Action configuration
 * @returns {Promise<Object>} Validation result
 */
async function validateAction(action) {
  try {
    // Validate action
    if (!action) {
      return { valid: false, message: 'No action provided' };
    }

    if (!action.action) {
      return { valid: false, message: 'Action type is required' };
    }

    // Validate based on action type
    switch (action.action) {
      case 'application':
        if (!action.applicationPath) {
          return { valid: false, message: 'Application path is required for application action' };
        }
        break;
      case 'exec':
        if (!action.command) {
          return { valid: false, message: 'Command is required for exec action' };
        }
        break;
      case 'open':
        if (!action.url && !action.path) {
          return { valid: false, message: 'URL or path is required for open action' };
        }
        break;
      case 'script':
        if (!action.script) {
          return { valid: false, message: 'Script content is required for script action' };
        }
        if (!action.scriptType) {
          return { valid: false, message: 'Script type is required for script action' };
        }
        break;
      case 'chain':
        if (!action.actions || !Array.isArray(action.actions) || action.actions.length === 0) {
          return { valid: false, message: 'Actions array is required for chain action' };
        }

        // Validate each action in the chain
        for (let i = 0; i < action.actions.length; i++) {
          const subAction = action.actions[i];
          const validation = await validateAction(subAction);

          if (!validation.valid) {
            return {
              valid: false,
              message: `Invalid action at index ${i}: ${validation.message}`,
            };
          }
        }
        break;
      default:
        return { valid: false, message: `Unsupported action type: ${action.action}` };
    }

    return { valid: true };
  }
  catch (error) {
    return {
      valid: false,
      message: `Error validating action: ${error.message}`,
      error,
    };
  }
}

module.exports = {
  executeAction,
  validateAction,
};
