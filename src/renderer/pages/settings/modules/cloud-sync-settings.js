/**
 * Settings - Cloud Sync Settings Management
 *
 * An adapter connecting the cloud-sync.js module to the Settings state (config, authState).
 * The actual UI logic and event listeners are handled by cloud-sync.js.
 */

import { config, authState } from './state.js';
import * as cloudSyncUI from '../cloud-sync.js';

/**
 * Initialize Cloud Sync UI
 */
export function initializeCloudSyncUI() {
  window.settings.log.info('initializeCloudSyncUI called - subscription:', authState.subscription ? authState.subscription.plan : 'none');

  try {
    cloudSyncUI.initializeCloudSyncUI(config, authState, window.settings.log);
  }
  catch (error) {
    window.settings.log.error('Error initializing Cloud Sync UI:', error);
  }
}
