/**
 * Toast - Page Management Functions
 */

import { defaultButtons, emptyButtons, reassignButtonShortcuts } from './constants.js';
import { pagingButtonsContainer } from './dom-elements.js';
import { showStatus, createNoResultsElement } from './utils.js';
import { userProfile, userSubscription, isSubscribed } from './auth.js';
// Note: showCurrentPageButtons is imported dynamically to avoid circular dependency

// State variables
export let pages = [];
export let currentPageIndex = 0;

/**
 * Render paging buttons
 */
export function renderPagingButtons() {
  // Initialize paging button container
  pagingButtonsContainer.innerHTML = '';

  // Create buttons for each page
  pages.forEach((page, index) => {
    const button = document.createElement('button');
    button.className = 'paging-button';
    button.dataset.page = index;
    button.textContent = page.shortcut || (index + 1).toString();

    // Indicate current page
    if (index === currentPageIndex) {
      button.classList.add('active');
    }

    // Click event
    button.addEventListener('click', () => {
      changePage(index);
    });

    pagingButtonsContainer.appendChild(button);
  });
}

/**
 * Switch to a different page
 * @param {number} pageIndex - Index of the page to switch to
 */
export function changePage(pageIndex) {
  // Check if page index is valid
  if (pageIndex >= 0 && pageIndex < pages.length) {
    // Update current page index
    currentPageIndex = pageIndex;

    // Update paging buttons
    document.querySelectorAll('.paging-button').forEach(button => {
      const index = parseInt(button.dataset.page);
      if (index === currentPageIndex) {
        button.classList.add('active');
      } else {
        button.classList.remove('active');
      }
    });

    // Display buttons for current page
    import('./buttons.js').then(({ showCurrentPageButtons }) => {
      showCurrentPageButtons();
    });

    // Show status
    const pageName = pages[currentPageIndex].name || `Page ${currentPageIndex + 1}`;
    showStatus(`Navigated to ${pageName}`, 'info');
  }
}

/**
 * Add a new page
 */
export function addNewPage() {
  const pageNumber = pages.length + 1;

  // Calculate allowed maximum number of pages
  let maxPages = 1; // Default: anonymous users are allowed only 1 page

  if (userProfile && userProfile.is_authenticated !== false) {
    // Authenticated user
    maxPages = userSubscription?.features?.page_groups || 3;
  } else {
  }

  // Check if current page count exceeds maximum pages
  if (pageNumber > maxPages) {
    if (!userProfile || userProfile.is_authenticated === false) {
      showStatus(`Anonymous users can only use ${maxPages} page(s). Please login.`, 'error');
      // Login prompt
      setTimeout(async () => {
        const { showUserProfile } = await import('./auth.js');
        showUserProfile(); // Show login modal
      }, 1500);
    } else {
      // Authenticated user
      if (isSubscribed || userSubscription?.active || userSubscription?.is_subscribed) {
        // Subscribed user
        showStatus(`You can only use a maximum of ${maxPages} page(s).`, 'error');
      } else {
        // Authenticated but not subscribed user
        showStatus(`Free users can only use a maximum of ${maxPages} page(s). Please subscribe.`, 'error');
      }
    }
    return;
  }

  // Default new page configuration
  const newPage = {
    name: `Page ${pageNumber}`,
    shortcut: pageNumber.toString(),
    buttons: [],
  };

  // Use default app buttons for first page, empty buttons for others
  if (pages.length === 0) {
    newPage.buttons = [...defaultButtons]; // Use default button set
  } else {
    newPage.buttons = [...emptyButtons]; // Use empty button set
  }

  // Add to pages array
  pages.push(newPage);

  // Update paging buttons
  renderPagingButtons();

  // Navigate to new page
  changePage(pages.length - 1);

  // Save configuration
  window.toast.saveConfig({ pages });

  showStatus(`Page ${pageNumber} has been added.`, 'success');
}

/**
 * Remove current page
 */
export async function removePage() {
  // Only works in settings mode
  const { isSettingsMode } = await import('./buttons.js');
  if (!isSettingsMode) {
    showStatus('Page deletion is only available in settings mode.', 'error');
    return;
  }

  // Nothing to delete if there are no pages
  if (pages.length === 0) {
    return;
  }

  // Save current page info
  const pageName = pages[currentPageIndex].name || `Page ${currentPageIndex + 1}`;

  // Show deletion confirmation using custom modal
  const { showConfirmModal } = await import('./modals.js');
  const isConfirmed = await showConfirmModal('Delete Page', `Are you sure you want to delete "${pageName}"?`, 'Delete');

  if (!isConfirmed) {
    showStatus('Page deletion canceled.', 'info');
    return;
  }

  // Delete page
  pages.splice(currentPageIndex, 1);

  // Calculate new current page index (move to previous page, or to new last page if this was the last page)
  const newPageIndex = Math.min(currentPageIndex, pages.length - 1);

  // Readjust page numbers and shortcuts
  pages.forEach((page, index) => {
    if (!page.name || page.name.startsWith('Page ')) {
      page.name = `Page ${index + 1}`;
    }
    if (!page.shortcut || /^\d+$/.test(page.shortcut)) {
      page.shortcut = (index + 1).toString();
    }
  });

  // If all pages were deleted, prompt user to add a page
  if (pages.length === 0) {
    // Save changes
    window.toast.saveConfig({ pages });

    // Update paging buttons
    renderPagingButtons();

    // Show empty screen (initialize button container)
    const { buttonsContainer } = await import('./dom-elements.js');
    const { filteredButtons } = await import('./buttons.js');
    buttonsContainer.innerHTML = '';
    filteredButtons.length = 0;

    // Display message to add a page
    const noResults = createNoResultsElement();
    buttonsContainer.appendChild(noResults);

    showStatus('All pages have been deleted. Press the + button to add a new page.', 'info');
    return;
  }

  // Save changes
  window.toast.saveConfig({ pages });

  // Update paging buttons
  renderPagingButtons();

  // Switch to page
  changePage(newPageIndex);

  showStatus(`${pageName} has been deleted.`, 'success');
}

/**
 * Initialize pages from configuration
 * @param {Array} configPages - Pages from configuration
 */
export function initializePages(configPages) {
  if (configPages) {
    const previousPageIndex = currentPageIndex;

    // 각 페이지의 버튼들에 대해 단축키 재할당
    pages = configPages.map(page => ({
      ...page,
      buttons: reassignButtonShortcuts(page.buttons || []),
    }));

    // Initialize paging buttons
    renderPagingButtons();

    // Stay on current page if it exists, otherwise go to first page
    const targetPageIndex = previousPageIndex < pages.length ? previousPageIndex : 0;
    changePage(targetPageIndex);
  }
}

/**
 * Get current page buttons
 * @returns {Array} Current page buttons
 */
export function getCurrentPageButtons() {
  if (pages.length === 0) {
    return [];
  }

  if (currentPageIndex >= 0 && currentPageIndex < pages.length) {
    return pages[currentPageIndex].buttons || [];
  }

  return [];
}

/**
 * Update current page buttons
 * @param {Array} buttons - New buttons array
 */
export function updateCurrentPageButtons(buttons) {
  if (currentPageIndex >= 0 && currentPageIndex < pages.length) {
    // 버튼 위치 변경 시 단축키 자동 재할당
    const buttonsWithReassignedShortcuts = reassignButtonShortcuts(buttons);
    pages[currentPageIndex].buttons = buttonsWithReassignedShortcuts;

    // 구성 저장
    if (window.toast && window.toast.saveConfig) {
      window.toast.saveConfig({ pages });
    }
  }
}

/**
 * Handle page limit for unauthenticated users after logout
 */
export async function handlePageLimitAfterLogout() {
  // Limit number of pages (unauthenticated users are limited to 1 page)
  if (pages.length > 1) {
    // Keep only the first page and delete the rest
    const firstPage = pages[0];
    pages = [firstPage];

    // Set current page to the first page
    currentPageIndex = 0;

    // Update UI
    renderPagingButtons();
    import('./buttons.js').then(({ showCurrentPageButtons }) => {
      showCurrentPageButtons();
    });

    // Save configuration
    await window.toast.saveConfig({ pages });

    showStatus('Unauthenticated users can only use 1 page. Only the first page has been kept.', 'info');
  }
}
