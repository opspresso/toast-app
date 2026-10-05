/** Page editing keeps the main-process snapshot separate from the padded display grid. */
import { defaultButtons, emptyButtons, normalizePageButtons, reassignButtonShortcuts } from './constants.js';
import { pagingButtonsContainer } from './dom-elements.js';
import { showStatus } from './utils.js';
import { userProfile, userSubscription } from './auth.js';

export let pages = [];
export let currentPageIndex = 0;
let storedPages = [];
let authSessionVersion = 0;
let viewVersion = 0;
let saving = false;
const clone = value => JSON.parse(JSON.stringify(value));

export function getPageContextKey() {
  return `${viewVersion}:${currentPageIndex}`;
}

export function getPageEditState() {
  return {
    pages: clone(storedPages),
    viewPages: clone(pages),
    index: currentPageIndex,
    base: { pages: clone(storedPages), session: authSessionVersion },
  };
}

export function renderPagingButtons() {
  pagingButtonsContainer.innerHTML = '';
  pages.forEach((page, index) => {
    const button = document.createElement('button');
    button.className = 'paging-button';
    button.dataset.page = index;
    button.textContent = page.shortcut || String(index + 1);
    button.classList.toggle('active', index === currentPageIndex);
    button.addEventListener('click', () => changePage(index));
    pagingButtonsContainer.appendChild(button);
  });
}

export function changePage(index) {
  if (index < 0 || index >= pages.length) {
    return;
  }
  currentPageIndex = index;
  renderPagingButtons();
  void import('./buttons.js').then(({ showCurrentPageButtons }) => showCurrentPageButtons());
  showStatus(`Navigated to ${pages[index].name || `Page ${index + 1}`}`, 'info');
}

export function initializePages(configPages, session = authSessionVersion) {
  storedPages = clone(configPages);
  authSessionVersion = session;
  viewVersion++;
  pages = configPages.map(page => ({ ...page, buttons: reassignButtonShortcuts(normalizePageButtons(page.buttons)) }));
  currentPageIndex = Math.max(0, Math.min(currentPageIndex, pages.length - 1));
  renderPagingButtons();
  void import('./buttons.js').then(({ showCurrentPageButtons }) => showCurrentPageButtons());
}

export async function savePageEdit(nextPages, editState, targetIndex = editState.index) {
  if (saving) {
    throw new Error('A page save is already in progress. Please try again.');
  }
  saving = true;
  const version = viewVersion;
  try {
    const result = await window.toast.savePages(nextPages, editState.base);
    if (!result?.success) {
      throw new Error(result?.error || 'Could not save pages. Your changes were not saved.');
    }
    // A broadcast can already hold a newer cloud snapshot than this reply.
    if (version === viewVersion) {
      initializePages(result.pages, result.session);
    }
    const targetId = nextPages[targetIndex]?.id;
    const index = targetId ? pages.findIndex(page => page.id === targetId) : targetIndex;
    if (index >= 0) {
      changePage(Math.min(index, pages.length - 1));
    }
    return result;
  }
  finally {
    saving = false;
  }
}

export async function addNewPage() {
  const editState = getPageEditState();
  const pageNumber = editState.pages.length + 1;
  const authenticated = userProfile?.is_authenticated === true;
  const limit = authenticated ? userSubscription?.features?.page_groups || 3 : 1;
  if (pageNumber > limit) {
    showStatus(`This account can add up to ${limit} pages.`, 'error');
    return;
  }
  const page = {
    id: crypto.randomUUID(), name: `Page ${pageNumber}`, shortcut: String(pageNumber),
    buttons: clone(editState.pages.length === 0 ? defaultButtons : emptyButtons).map(button => ({ ...button, id: crypto.randomUUID() })),
  };
  try {
    await savePageEdit([...editState.pages, page], editState, pageNumber - 1);
    showStatus(`Page ${pageNumber} has been added.`, 'success');
  }
  catch (error) {
    showStatus(error.message, 'error');
  }
}

export async function removePage() {
  const editState = getPageEditState();
  const page = editState.pages[editState.index];
  const { isSettingsMode } = await import('./buttons.js');
  if (!isSettingsMode || !page) {
    return;
  }
  const { showConfirmModal } = await import('./modals.js');
  if (!(await showConfirmModal('Delete Page', `Are you sure you want to delete "${page.name}"?`, 'Delete'))) {
    return;
  }
  const nextPages = editState.pages.filter((_page, index) => index !== editState.index).map((item, index) => ({
    ...item,
    shortcut: !item.shortcut || /^\d+$/.test(item.shortcut) ? String(index + 1) : item.shortcut,
  }));
  try {
    await savePageEdit(nextPages, editState, Math.max(0, Math.min(editState.index, nextPages.length - 1)));
    showStatus(`${page.name} has been deleted.`, 'success');
  }
  catch (error) {
    showStatus(error.message, 'error');
  }
}

export function getCurrentPageButtons() {
  return pages[currentPageIndex]?.buttons || [];
}

export async function updateCurrentPageButtons(buttons, editState = getPageEditState()) {
  const page = editState.pages[editState.index];
  if (!page) {
    return;
  }
  editState.pages[editState.index] = {
    ...page, id: page.id || crypto.randomUUID(), buttons: reassignButtonShortcuts(buttons),
  };
  try {
    await savePageEdit(editState.pages, editState);
  }
  catch (error) {
    showStatus(error.message, 'error');
  }
}
