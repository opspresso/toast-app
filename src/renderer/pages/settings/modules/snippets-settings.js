/**
 * Settings - Snippets (Text Expander) Management
 */

import {
  snippetsUnsupported,
  snippetsPermission,
  snippetsRequestPermissionButton,
  snippetsOpenAccessibilityButton,
  snippetsOpenInputMonitoringButton,
  snippetsEnabledCheckbox,
  snippetsStatusText,
  snippetsList,
  snippetKeywordInput,
  snippetContentInput,
  snippetLabelInput,
  snippetFormError,
  snippetAddButton,
  snippetFormTitle,
  snippetCancelEditButton,
} from './dom-elements.js';
import { config, updateConfig, authState } from './state.js';

/**
 * Local working copy of the snippet array. Persisted via the main process,
 * which also refreshes the running matcher.
 */
let snippets = [];

let editingOriginal = null;
let editingAccount = null;
let saving = false;
let viewVersion = 0;

/**
 * Initialize the Snippets tab: load snippets, render, and reflect status.
 */
export function initializeSnippetsSettings() {
  window.settings.log.info('initializeSnippetsSettings called');

  try {
    viewVersion++;
    snippets = Array.isArray(config.snippets) ? config.snippets.map(s => ({ ...s })) : [];
    renderSnippets();
    refreshStatus();
  }
  catch (error) {
    window.settings.log.error('Error initializing snippets tab:', error);
  }
}

/**
 * Query current feature/permission status and update the UI affordances.
 */
function refreshStatus() {
  window.settings.textExpander
    .getStatus()
    .then(status => {
      const supported = status && status.supported;
      const hasPermission = status && status.permissions && status.permissions.accessibility;

      // Unsupported notice shows only when the feature can't run here.
      toggleHidden(snippetsUnsupported, !supported);

      // Permission block shows only when supported but not yet permitted.
      toggleHidden(snippetsPermission, supported && !hasPermission);

      if (snippetsEnabledCheckbox) {
        snippetsEnabledCheckbox.checked = !!(status && status.enabled);
        snippetsEnabledCheckbox.disabled = !supported;
      }

      if (snippetsStatusText) {
        if (!supported) {
          snippetsStatusText.textContent = 'Not available on this platform.';
        }
        else if (status.enabled && status.running) {
          snippetsStatusText.textContent = 'Text expansion is active.';
        }
        else if (status.enabled && !hasPermission) {
          snippetsStatusText.textContent = 'Enabled, but waiting for permission.';
        }
        else {
          snippetsStatusText.textContent = '';
        }
      }
    })
    .catch(error => {
      window.settings.log.error('Error querying snippet status:', error);
    });
}

/**
 * Render the current snippet list with enable/delete controls.
 */
function renderSnippets() {
  if (!snippetsList) {
    return;
  }
  snippetsList.innerHTML = '';

  if (snippets.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'help-text';
    empty.textContent = 'No snippets yet. Add one below.';
    snippetsList.appendChild(empty);
    return;
  }

  snippets.forEach(snippet => {
    const row = document.createElement('div');
    row.className = 'snippet-item';

    const enabledToggle = document.createElement('input');
    enabledToggle.type = 'checkbox';
    enabledToggle.checked = snippet.enabled !== false;
    enabledToggle.disabled = saving;
    enabledToggle.title = 'Enable this snippet';
    enabledToggle.addEventListener('change', () => {
      void persistChange({ type: 'update', original: snippet, snippet: { ...snippet, enabled: enabledToggle.checked } });
    });

    const info = document.createElement('div');
    info.className = 'snippet-info';
    const keyword = document.createElement('span');
    keyword.className = 'snippet-keyword';
    keyword.textContent = snippet.keyword;
    const preview = document.createElement('span');
    preview.className = 'snippet-preview';
    preview.textContent = snippet.label ? `${snippet.label} — ${snippet.content}` : snippet.content;
    info.appendChild(keyword);
    info.appendChild(preview);

    const editButton = document.createElement('button');
    editButton.className = 'secondary-button';
    editButton.textContent = 'Edit';
    editButton.disabled = saving;
    editButton.addEventListener('click', () => {
      startEditSnippet(snippet);
    });

    const deleteButton = document.createElement('button');
    deleteButton.className = 'secondary-button';
    deleteButton.textContent = 'Delete';
    deleteButton.disabled = saving;
    deleteButton.addEventListener('click', async () => {
      if (await persistChange({ type: 'delete', original: snippet })) {
        if (editingOriginal && sameSnippet(editingOriginal, snippet)) {
          exitEditMode();
        }
      }
    });

    row.appendChild(enabledToggle);
    row.appendChild(info);
    row.appendChild(editButton);
    row.appendChild(deleteButton);
    snippetsList.appendChild(row);
  });
}

function sameSnippet(left, right) {
  return left.id ? left.id === right.id : left.keyword === right.keyword;
}

async function persistChange(change) {
  if (saving) {
    return false;
  }
  saving = true;
  const version = viewVersion;
  for (const input of [snippetKeywordInput, snippetContentInput, snippetLabelInput, snippetAddButton, snippetCancelEditButton]) {
    if (input) {
      input.disabled = true;
    }
  }
  renderSnippets();
  try {
    const result = await window.settings.textExpander.changeSnippet(change);
    if (!result?.success) {
      showFormError(result?.error || 'Could not save the snippet.');
      return false;
    }
    // A config-updated broadcast may already contain a newer cloud snapshot.
    if (version === viewVersion) {
      snippets = result.snippets;
      updateConfig({ ...config, snippets });
    }
    return true;
  }
  catch (error) {
    window.settings.log.error('Error saving snippet:', error.message);
    showFormError('Could not save the snippet. Your draft is preserved.');
    return false;
  }
  finally {
    saving = false;
    for (const input of [snippetKeywordInput, snippetContentInput, snippetLabelInput, snippetAddButton, snippetCancelEditButton]) {
      if (input) {
        input.disabled = false;
      }
    }
    renderSnippets();
  }
}

/**
 * Switch the form into edit mode for an existing snippet.
 */
function startEditSnippet(snippet) {
  editingOriginal = { ...snippet };
  editingAccount = authState.profile?.email || null;
  snippetKeywordInput.value = snippet.keyword || '';
  snippetContentInput.value = snippet.content || '';
  snippetLabelInput.value = snippet.label || '';
  hideFormError();

  if (snippetFormTitle) {
    snippetFormTitle.textContent = 'Edit Snippet';
  }
  if (snippetAddButton) {
    snippetAddButton.textContent = 'Save Changes';
  }
  if (snippetCancelEditButton) {
    snippetCancelEditButton.classList.remove('hidden');
  }
  snippetKeywordInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
  snippetKeywordInput.focus();
}

/**
 * Reset the form back to add mode.
 */
function exitEditMode() {
  editingOriginal = null;
  editingAccount = null;
  snippetKeywordInput.value = '';
  snippetContentInput.value = '';
  snippetLabelInput.value = '';
  hideFormError();

  if (snippetFormTitle) {
    snippetFormTitle.textContent = 'Add Snippet';
  }
  if (snippetAddButton) {
    snippetAddButton.textContent = 'Add Snippet';
  }
  if (snippetCancelEditButton) {
    snippetCancelEditButton.classList.add('hidden');
  }
}

/**
 * Handle the snippet form submit: validate, then add or save edits.
 */
async function handleAddSnippet() {
  if (saving) {
    return;
  }
  if (editingOriginal && editingAccount !== (authState.profile?.email || null)) {
    showFormError('The account changed. Your draft is preserved; reopen a snippet from the current account before saving.');
    return;
  }
  const candidate = {
    ...(editingOriginal || {}),
    keyword: (snippetKeywordInput.value || '').trim(),
    content: snippetContentInput.value || '',
    label: (snippetLabelInput.value || '').trim(),
    enabled: editingOriginal ? editingOriginal.enabled !== false : true,
  };
  const change = editingOriginal
    ? { type: 'update', original: editingOriginal, snippet: candidate }
    : { type: 'add', snippet: candidate };
  hideFormError();
  if (await persistChange(change)) {
    exitEditMode();
  }
}

function showFormError(message) {
  if (snippetFormError) {
    snippetFormError.textContent = message;
    snippetFormError.className = 'error-message';
  }
}

function hideFormError() {
  if (snippetFormError) {
    snippetFormError.textContent = '';
    snippetFormError.className = 'error-message hidden';
  }
}

/**
 * Show or hide an element by toggling the 'hidden' class.
 * @param {HTMLElement} element
 * @param {boolean} visible
 */
function toggleHidden(element, visible) {
  if (!element) {
    return;
  }
  element.classList.toggle('hidden', !visible);
}

/**
 * Set up event listeners for the Snippets tab.
 */
export function setupSnippetsEventListeners() {
  if (snippetsEnabledCheckbox) {
    snippetsEnabledCheckbox.addEventListener('change', () => {
      window.settings.textExpander
        .setEnabled(snippetsEnabledCheckbox.checked)
        .then(() => refreshStatus())
        .catch(error => window.settings.log.error('Text expansion toggle error:', error));
    });
  }

  if (snippetsRequestPermissionButton) {
    snippetsRequestPermissionButton.addEventListener('click', () => {
      window.settings.textExpander
        .requestPermission()
        .then(() => refreshStatus())
        .catch(error => window.settings.log.error('Permission request error:', error));
    });
  }

  if (snippetsOpenAccessibilityButton) {
    snippetsOpenAccessibilityButton.addEventListener('click', () => {
      window.settings.textExpander.openPrivacySettings('accessibility');
    });
  }

  if (snippetsOpenInputMonitoringButton) {
    snippetsOpenInputMonitoringButton.addEventListener('click', () => {
      window.settings.textExpander.openPrivacySettings('inputMonitoring');
    });
  }

  if (snippetAddButton) {
    snippetAddButton.addEventListener('click', handleAddSnippet);
  }

  if (snippetCancelEditButton) {
    snippetCancelEditButton.addEventListener('click', exitEditMode);
  }
}
