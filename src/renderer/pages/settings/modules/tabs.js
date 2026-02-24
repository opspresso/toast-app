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
  window.settings.log.info(`탭 전환 시작: ${tabId}`);

  try {
    // DOM 조작을 최소화하기 위해 직접 attribute 선택자로 요소 선택
    const allTabLinks = document.querySelectorAll('.settings-nav li');
    window.settings.log.info(`발견된 탭 링크 수: ${allTabLinks.length}`);

    // 명확한 로깅을 위해 처음 상태 기록
    for (const link of allTabLinks) {
      const tabID = link.getAttribute('data-tab');
      const isActive = link.classList.contains('active');
      window.settings.log.info(`탭 [${tabID}] 초기 상태: ${isActive ? '활성' : '비활성'}`);
    }

    // 먼저 모든 탭에서 active 클래스 제거 - 기본 DOM API 사용
    for (let i = 0; i < allTabLinks.length; i++) {
      allTabLinks[i].className = allTabLinks[i].className.replace(/\bactive\b/g, '').trim();
    }

    // 해당하는 탭에 active 클래스 추가 - 직접 속성 설정
    for (let i = 0; i < allTabLinks.length; i++) {
      const link = allTabLinks[i];
      const linkTabId = link.getAttribute('data-tab');

      if (linkTabId === tabId) {
        // active 클래스가 없을 경우에만 추가
        if (!link.className.includes('active')) {
          link.className = link.className ? link.className + ' active' : 'active';
          window.settings.log.info(`탭 링크 [${tabId}] 활성화됨 - 클래스: ${link.className}`);
        }
      }
    }

    // 모든 컨텐츠 영역 비활성화 및 선택한 영역만 활성화
    const contentTabs = document.querySelectorAll('.settings-tab');
    for (const tab of contentTabs) {
      if (tab.id === tabId) {
        tab.classList.add('active');
      }
      else {
        tab.classList.remove('active');
      }
    }

    // 탭 내용 초기화 (필요한 경우에만)
    if (tabId && !tabInitState[tabId]) {
      window.settings.log.info(`탭 컨텐츠 초기화 필요: ${tabId}`);
      initializeTabContent(tabId);
    }

    // DOM 갱신 후 최종 검증
    setTimeout(() => {
      // 최종 상태 확인
      const finalLinks = document.querySelectorAll('.settings-nav li');
      window.settings.log.info('탭 전환 후 최종 상태:');
      for (const link of finalLinks) {
        const linkId = link.getAttribute('data-tab');
        const hasActiveClass = link.classList.contains('active');
        window.settings.log.info(`  탭 [${linkId}]: ${hasActiveClass ? '활성' : '비활성'} (클래스: ${link.className})`);
      }

      // 선택된 탭 컨텐츠 확인
      const activeContent = document.querySelector('.settings-tab.active');
      if (activeContent) {
        window.settings.log.info(`활성 컨텐츠: [${activeContent.id}]`);
      }
      else {
        window.settings.log.error('활성화된 컨텐츠 탭이 없습니다.');
      }
    }, 10);
  }
  catch (error) {
    window.settings.log.error(`탭 전환 중 오류 발생: ${error.message}`, error);
  }
}

/**
 * 선택한 탭의 콘텐츠만 초기화하는 함수
 * @param {string} tabId - 초기화할 탭 ID
 */
export function initializeTabContent(tabId) {
  window.settings.log.info(`initializeTabContent 호출 - 탭 ID: ${tabId}`);

  // 이미 초기화된 탭이면 다시 초기화하지 않음
  if (tabInitState[tabId]) {
    window.settings.log.info(`${tabId} 탭은 이미 초기화되어 있습니다.`);
    return;
  }

  // 각 탭에 맞는 초기화 함수 호출 (동적 import 사용)
  switch (tabId) {
    case 'general':
      import('./general-settings.js').then(({ initializeGeneralSettings }) => {
        initializeGeneralSettings();
      });
      break;
    case 'appearance':
      import('./appearance-settings.js').then(({ initializeAppearanceSettings }) => {
        initializeAppearanceSettings();
      });
      break;
    case 'account':
      import('./account-settings.js').then(({ initializeAccountSettings }) => {
        initializeAccountSettings();
      });
      break;
    case 'advanced':
      import('./advanced-settings.js').then(({ initializeAdvancedSettings }) => {
        initializeAdvancedSettings();
      });
      break;
    case 'cloud-sync':
      import('./cloud-sync-settings.js').then(({ initializeCloudSyncUI }) => {
        initializeCloudSyncUI();
      });
      break;
    case 'about':
      import('./about-settings.js').then(({ initializeAboutSettings }) => {
        initializeAboutSettings();
      });
      break;
  }

  // 초기화 상태 업데이트
  setTabInitState(tabId, true);
  window.settings.log.info(`탭 초기화 상태 업데이트: ${tabId} = 초기화됨`);
}
