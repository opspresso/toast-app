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
import { config, updateConfig } from './state.js';

/**
 * Local working copy of the snippet array. Persisted via the main process,
 * which also refreshes the running matcher.
 */
let snippets = [];

// id of the snippet currently being edited in the form (null = add mode)
let editingId = null;

/**
 * Generate a stable-enough id for a new snippet without extra dependencies.
 */
function newSnippetId() {
  return `sn-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}

/**
 * Initialize the Snippets tab: load snippets, render, and reflect status.
 */
export function initializeSnippetsSettings() {
  window.settings.log.info('initializeSnippetsSettings called');

  try {
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
    enabledToggle.title = 'Enable this snippet';
    enabledToggle.addEventListener('change', () => {
      snippet.enabled = enabledToggle.checked;
      persistSnippets();
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
    editButton.addEventListener('click', () => {
      startEditSnippet(snippet);
    });

    const deleteButton = document.createElement('button');
    deleteButton.className = 'secondary-button';
    deleteButton.textContent = 'Delete';
    deleteButton.addEventListener('click', () => {
      if (editingId === snippet.id) {
        exitEditMode();
      }
      snippets = snippets.filter(s => s.id !== snippet.id);
      renderSnippets();
      persistSnippets();
    });

    row.appendChild(enabledToggle);
    row.appendChild(info);
    row.appendChild(editButton);
    row.appendChild(deleteButton);
    snippetsList.appendChild(row);
  });
}

/**
 * Persist snippets through the main process (which refreshes the matcher and
 * lets cloud sync pick up the change), and update the local settings config.
 */
function persistSnippets() {
  window.settings.textExpander
    .saveSnippets(snippets)
    .then(result => {
      if (!result || !result.success) {
        window.settings.log.error('Failed to save snippets:', result && result.error);
        return;
      }
      updateConfig({ ...config, snippets: snippets.map(s => ({ ...s })) });
    })
    .catch(error => {
      window.settings.log.error('Error saving snippets:', error);
    });
}

/**
 * Switch the form into edit mode for an existing snippet.
 */
function startEditSnippet(snippet) {
  editingId = snippet.id;
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
  editingId = null;
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
function handleAddSnippet() {
  const keyword = (snippetKeywordInput.value || '').trim();
  const content = snippetContentInput.value || '';
  const label = (snippetLabelInput.value || '').trim();

  const existing = editingId ? snippets.find(s => s.id === editingId) : null;
  const candidate = {
    id: editingId || newSnippetId(),
    keyword,
    content,
    label,
    enabled: existing ? existing.enabled !== false : true,
  };

  // validateSnippet excludes the snippet's own id, so editing a snippet
  // without changing its keyword does not trip the duplicate check.
  window.settings.textExpander
    .validateSnippet(candidate, snippets)
    .then(result => {
      if (!result.valid) {
        showFormError(result.errors.join(' '));
        return;
      }
      hideFormError();

      if (editingId) {
        snippets = snippets.map(s => (s.id === editingId ? candidate : s));
      }
      else {
        snippets = [...snippets, candidate];
      }
      renderSnippets();
      persistSnippets();
      exitEditMode();
    })
    .catch(error => {
      window.settings.log.error('Snippet validation error:', error);
      showFormError('Validation failed.');
    });
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
