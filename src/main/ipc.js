/**
 * Toast - IPC Handlers
 *
 * This module sets up IPC (Inter-Process Communication) handlers for
 * communication between the main process and renderer processes.
 */

const config = require('./config').createConfigStore();
const updater = require('./updater');
const { setupWindowHandlers, isModalOpened } = require('./ipc/window');
const { setupConfigHandlers } = require('./ipc/config');
const { setupActionHandlers } = require('./ipc/actions');
const { setupAuthHandlers } = require('./ipc/auth');
const { setupCloudSyncHandlers } = require('./ipc/cloud-sync');
const { setupUpdaterHandlers } = require('./ipc/updater');
const { setupSystemHandlers } = require('./ipc/system');
const { setupSnippetsHandlers } = require('./ipc/snippets');

/**
 * Set up IPC handlers
 * @param {Object} windows - Object containing application windows
 */
function setupIpcHandlers(windows) {
  // Initialize auto updater (pass window references)
  // Note: authManager/userDataManager initialization and the protocol request
  // handler are owned by src/index.js — the single initialization entry point.
  updater.initAutoUpdater(windows);

  setupWindowHandlers(windows);
  setupActionHandlers();
  setupConfigHandlers(windows, config);
  setupAuthHandlers();
  setupCloudSyncHandlers(windows, config);
  setupSystemHandlers(windows, config);
  setupSnippetsHandlers(windows, config);
  setupUpdaterHandlers();
}

module.exports = {
  setupIpcHandlers,
  isModalOpened,
};
