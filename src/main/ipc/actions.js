/**
 * Toast - Action IPC Handlers
 *
 * Handlers for executing, validating, and testing actions.
 */

const { ipcMain } = require('electron');
const { executeAction, validateAction } = require('../executor');

/**
 * Set up action IPC handlers
 */
function setupActionHandlers() {
  // Execute an action
  ipcMain.handle('execute-action', async (event, action) => {
    try {
      return await executeAction(action);
    }
    catch (error) {
      return {
        success: false,
        message: `Error executing action: ${error.message}`,
        error: error.toString(),
      };
    }
  });

  // Test an action without executing it
  ipcMain.handle('validate-action', async (event, action) => {
    try {
      return await validateAction(action);
    }
    catch (error) {
      return {
        valid: false,
        message: `Error validating action: ${error.message}`,
        error: error.toString(),
      };
    }
  });

  // Test an action (for settings UI)
  ipcMain.handle('test-action', async (event, action) => {
    try {
      // First validate the action
      const validation = await validateAction(action);
      if (!validation.valid) {
        return {
          success: false,
          message: `Invalid action: ${validation.message}`,
        };
      }

      // Then execute it
      return await executeAction(action);
    }
    catch (error) {
      return {
        success: false,
        message: `Error testing action: ${error.message}`,
        error: error.toString(),
      };
    }
  });
}

module.exports = {
  setupActionHandlers,
};
