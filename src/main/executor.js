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

// Upper bound on chain nesting depth. Without this, a deeply/self nested
// chain (e.g. from a malformed or malicious cloud-sync payload) could exhaust
// the call stack during validation before it is ever rejected for other reasons.
const MAX_CHAIN_DEPTH = 10;

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
    // application actions only carry risk when they pass launch parameters;
    // ensureApproved/computeFingerprint returns allow for a plain app launch.
    if (action.action === 'exec' || action.action === 'script' || action.action === 'application') {
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

/**
 * Test an action without executing it
 * @param {Object} action - Action configuration
 * @param {number} [depth] - Current chain nesting depth (internal use)
 * @returns {Promise<Object>} Validation result
 */
async function validateAction(action, depth = 0) {
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
        if (depth >= MAX_CHAIN_DEPTH) {
          return { valid: false, message: `Chain nesting exceeds maximum depth of ${MAX_CHAIN_DEPTH}` };
        }

        if (!action.actions || !Array.isArray(action.actions) || action.actions.length === 0) {
          return { valid: false, message: 'Actions array is required for chain action' };
        }

        // Validate each action in the chain
        for (let i = 0; i < action.actions.length; i++) {
          const subAction = action.actions[i];
          const validation = await validateAction(subAction, depth + 1);

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
