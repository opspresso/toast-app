/**
 * Toast - Authentication IPC Handlers
 *
 * Handlers for login, logout, tokens, profile, and subscription.
 */

const { ipcMain } = require('electron');
const authManager = require('../auth-manager');

/**
 * Set up authentication IPC handlers
 */
function setupAuthHandlers() {
  // Start login process
  ipcMain.handle('initiate-login', async () => await authManager.initiateLogin());

  // Exchange authentication code for token
  ipcMain.handle('exchange-code-for-token', async (event, code) => await authManager.exchangeCodeForToken(code));

  // Logout
  ipcMain.handle('logout', async () => await authManager.logout());

  // Get user profile information
  ipcMain.handle('fetch-user-profile', async () => await authManager.fetchUserProfile());

  // Get user settings information
  ipcMain.handle('get-user-settings', async () => await authManager.getUserSettings());

  // Get subscription information
  ipcMain.handle('fetch-subscription', async () => await authManager.fetchSubscription());

  // Return current authentication token
  ipcMain.handle('get-auth-token', async () => await authManager.getAccessToken());
}

module.exports = {
  setupAuthHandlers,
};
