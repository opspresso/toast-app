/**
 * Toast API - API Module Integration Index
 *
 * Integrates and exports all API-related modules.
 */

const client = require('./client');
const auth = require('./auth');
const sync = require('./sync');
const icons = require('./icons');

module.exports = {
  // Base API client module
  client,

  // Authentication related API module
  auth,

  // Settings synchronization API module
  sync,

  // Button icon upload API module
  icons,
};
