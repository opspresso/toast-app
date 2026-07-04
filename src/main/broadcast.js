/**
 * Toast - Window Broadcast Utility
 *
 * Dependency-free helper for sending an event to both application windows.
 * Kept separate from windows.js so modules like auth-manager can use it
 * without pulling in the window/IPC dependency graph.
 */

/**
 * Send an event to both application windows, skipping destroyed ones
 * @param {Object} windowsRef - Window references ({ toast, settings })
 * @param {string} channel - IPC channel name
 * @param {*} payload - Event payload
 */
function broadcastToWindows(windowsRef, channel, payload) {
  if (!windowsRef) {
    return;
  }
  for (const win of [windowsRef.toast, windowsRef.settings]) {
    if (win && !win.isDestroyed()) {
      win.webContents.send(channel, payload);
    }
  }
}

module.exports = {
  broadcastToWindows,
};
