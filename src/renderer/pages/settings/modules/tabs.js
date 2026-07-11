/**
 * Settings - Tab Management
 */

import { tabContents } from './dom-elements.js';
import { tabInitState, setTabInitState } from './state.js';

/**
 * Switch between tabs
 * @param {string} tabId - ID of the tab to switch to
 */
export function switchTab(tabId) {
  window.settings.log.info(`Tab switch started: ${tabId}`);

  try {
    // Select elements directly with attribute selector to minimize DOM manipulation
    const allTabLinks = document.querySelectorAll('.settings-nav li');
    window.settings.log.info(`Number of tab links found: ${allTabLinks.length}`);

    // Record initial state for clear logging
    for (const link of allTabLinks) {
      const tabID = link.getAttribute('data-tab');
      const isActive = link.classList.contains('active');
      window.settings.log.info(`Tab [${tabID}] initial state: ${isActive ? 'active' : 'inactive'}`);
    }

    // First remove the active class from all tabs - using basic DOM API
    for (let i = 0; i < allTabLinks.length; i++) {
      allTabLinks[i].className = allTabLinks[i].className.replace(/\bactive\b/g, '').trim();
    }

    // Add the active class to the matching tab - setting attribute directly
    for (let i = 0; i < allTabLinks.length; i++) {
      const link = allTabLinks[i];
      const linkTabId = link.getAttribute('data-tab');

      if (linkTabId === tabId) {
        // Add only if the active class is not present
        if (!link.className.includes('active')) {
          link.className = link.className ? link.className + ' active' : 'active';
          window.settings.log.info(`Tab link [${tabId}] activated - class: ${link.className}`);
        }
      }
    }

    // Deactivate all content areas and activate only the selected one
    const contentTabs = document.querySelectorAll('.settings-tab');
    for (const tab of contentTabs) {
      if (tab.id === tabId) {
        tab.classList.add('active');
      }
      else {
        tab.classList.remove('active');
      }
    }

    // Initialize tab content (only if needed)
    if (tabId && !tabInitState[tabId]) {
      window.settings.log.info(`Tab content initialization needed: ${tabId}`);
      initializeTabContent(tabId);
    }

    // Final verification after DOM update
    setTimeout(() => {
      // Check final state
      const finalLinks = document.querySelectorAll('.settings-nav li');
      window.settings.log.info('Final state after tab switch:');
      for (const link of finalLinks) {
        const linkId = link.getAttribute('data-tab');
        const hasActiveClass = link.classList.contains('active');
        window.settings.log.info(`  Tab [${linkId}]: ${hasActiveClass ? 'active' : 'inactive'} (class: ${link.className})`);
      }

      // Check selected tab content
      const activeContent = document.querySelector('.settings-tab.active');
      if (activeContent) {
        window.settings.log.info(`Active content: [${activeContent.id}]`);
      }
      else {
        window.settings.log.error('No active content tab found.');
      }
    }, 10);
  }
  catch (error) {
    window.settings.log.error(`Error during tab switch: ${error.message}`, error);
  }
}

/**
 * Function that initializes only the selected tab's content
 * @param {string} tabId - ID of the tab to initialize
 */
export function initializeTabContent(tabId) {
  window.settings.log.info(`initializeTabContent called - tab ID: ${tabId}`);

  // Do not re-initialize if the tab is already initialized
  if (tabInitState[tabId]) {
    window.settings.log.info(`${tabId} tab is already initialized.`);
    return;
  }

  // Call the initialization function for each tab (using dynamic import)
  switch (tabId) {
    case 'settings':
      // Combined Settings tab: General / Appearance / Advanced sections
      import('./general-settings.js').then(({ initializeGeneralSettings }) => {
        initializeGeneralSettings();
      });
      import('./appearance-settings.js').then(({ initializeAppearanceSettings }) => {
        initializeAppearanceSettings();
      });
      import('./advanced-settings.js').then(({ initializeAdvancedSettings }) => {
        initializeAdvancedSettings();
      });
      break;
    case 'account':
      // Combined Account tab: Account/Subscription + Cloud Sync sections
      import('./account-settings.js').then(({ initializeAccountSettings }) => {
        initializeAccountSettings();
      });
      import('./cloud-sync-settings.js').then(({ initializeCloudSyncUI }) => {
        initializeCloudSyncUI();
      });
      break;
    case 'snippets':
      import('./snippets-settings.js').then(({ initializeSnippetsSettings }) => {
        initializeSnippetsSettings();
      });
      break;
    case 'about':
      import('./about-settings.js').then(({ initializeAboutSettings }) => {
        initializeAboutSettings();
      });
      break;
  }

  // Update initialization state
  setTabInitState(tabId, true);
  window.settings.log.info(`Tab initialization state updated: ${tabId} = initialized`);
}
