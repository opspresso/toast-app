/**
 * Settings - Cloud Sync Settings Management
 *
 * cloud-sync.js 모듈을 Settings 상태(config, authState)와 연결하는 어댑터입니다.
 * 실제 UI 로직과 이벤트 리스너는 cloud-sync.js가 담당합니다.
 */

import { config, authState } from './state.js';
import * as cloudSyncUI from '../cloud-sync.js';

/**
 * Initialize Cloud Sync UI
 */
export function initializeCloudSyncUI() {
  window.settings.log.info('initializeCloudSyncUI 호출 - 구독:', authState.subscription ? authState.subscription.plan : 'none');

  try {
    cloudSyncUI.initializeCloudSyncUI(config, authState, window.settings.log);
  }
  catch (error) {
    window.settings.log.error('Error initializing Cloud Sync UI:', error);
  }
}
