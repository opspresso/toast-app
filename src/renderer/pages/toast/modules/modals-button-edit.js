/**
 * Toast - Button Edit Form Functions
 */

import {
  buttonEditModal,
  editButtonNameInput,
  editButtonIconInput,
  editButtonShortcutInput,
  editButtonActionSelect,
  editButtonCommandInput,
  editButtonWorkingDirInput,
  editButtonRunInTerminalCheckbox,
  editButtonUrlInput,
  editButtonPathInput,
  editButtonOpenApplicationInput,
  editButtonScriptInput,
  editButtonScriptTypeSelect,
  editButtonScriptParamsInput,
  editButtonApplicationInput,
  editButtonApplicationParametersInput,
  editButtonStopOnErrorCheckbox,
  commandInputGroup,
  urlInputGroup,
  scriptInputGroup,
  applicationInputGroup,
  chainInputGroup,
  reloadIconButton,
} from './dom-elements.js';
import { showStatus } from './utils.js';
import { UI_ICONS } from './constants.js';
import { beginButtonEditContext, invalidateButtonEditContext, syncModalState } from './modal-state.js';
import { getPageEditState, savePageEdit } from './pages.js';
import { updateIconPreview } from './modals-icon-browser.js';

// State variables
let currentEditingButton = null;
let editState = null;
let saving = false;

/**
 * Edit button settings (settings mode)
 * @param {Object} button - Button settings to edit
 */
export function editButtonSettings(button) {
  // Display button info in status message
  showStatus(`Editing: ${button.name}`, 'info');

  // Save the button being edited (global variable)
  const nextEditState = getPageEditState();
  const buttons = nextEditState.viewPages[nextEditState.index]?.buttons || [];
  nextEditState.buttonIndex = buttons.findIndex(item => button.id ? item.id === button.id : item.shortcut === button.shortcut);
  if (nextEditState.buttonIndex < 0) {
    showStatus('The button changed. Reopen it before editing.', 'error');
    return;
  }
  editState = nextEditState;
  beginButtonEditContext();
  if (reloadIconButton) {
    reloadIconButton.disabled = false;
    reloadIconButton.innerHTML = UI_ICONS.refresh;
    reloadIconButton.title = 'Reload Icon from Application';
  }
  currentEditingButton = { ...buttons[editState.buttonIndex] };
  button = currentEditingButton;
  showButtonError('');

  // Fill form fields with current button values
  editButtonNameInput.value = button.name || '';
  editButtonIconInput.value = button.icon || '';
  editButtonShortcutInput.value = button.shortcut || '';
  editButtonActionSelect.value = button.action || 'exec';

  // Set common field values
  editButtonCommandInput.value = button.command || '';
  editButtonWorkingDirInput.value = button.workingDir || '';
  editButtonRunInTerminalCheckbox.checked = button.runInTerminal || false;

  editButtonUrlInput.value = button.url || '';
  editButtonPathInput.value = button.path || '';
  editButtonOpenApplicationInput.value = button.application || '';

  editButtonScriptInput.value = button.script || '';
  editButtonScriptTypeSelect.value = button.scriptType || 'javascript';
  editButtonScriptParamsInput.value = button.scriptParams ? JSON.stringify(button.scriptParams, null, 2) : '';

  editButtonApplicationInput.value = button.applicationPath || '';
  editButtonApplicationParametersInput.value = button.applicationParameters || '';
  editButtonStopOnErrorCheckbox.checked = button.stopOnError !== false; // default value true

  // Show input fields appropriate for current action type
  showActionFields(button.action || 'exec');

  // Notify main process that modal is open
  window.toast.setModalOpen(true);

  // Show modal
  buttonEditModal.classList.add('show');

  // Update icon preview
  updateIconPreview();

  // Focus on name input field
  editButtonNameInput.focus();
}

/**
 * Close button edit modal
 */
export function closeButtonEditModal() {
  if (saving) {
    return;
  }
  buttonEditModal.classList.remove('show');
  currentEditingButton = null;
  editState = null;
  invalidateButtonEditContext();
  syncModalState();
}

/**
 * Show/hide input fields based on action type
 * @param {string} actionType - Action type
 */
export function showActionFields(actionType) {
  // Hide all input field groups
  applicationInputGroup.style.display = 'none';
  commandInputGroup.style.display = 'none';
  urlInputGroup.style.display = 'none';
  scriptInputGroup.style.display = 'none';
  chainInputGroup.style.display = 'none';

  editButtonScriptInput.readOnly = actionType === 'script' && editButtonScriptTypeSelect.value === 'special';
  editButtonScriptParamsInput.readOnly = editButtonScriptInput.readOnly;
  if (editButtonScriptInput.readOnly) {
    editButtonScriptInput.value = 'confetti';
    editButtonScriptParamsInput.value = '';
  }

  // Update icon field hint
  const iconHint = document.querySelector('.field-hint');
  if (iconHint) {
    // Show custom hint based on type
    if (actionType === 'open') {
      iconHint.textContent = 'Use emoji or leave empty to automatically use URL favicon';
    }
    else {
      iconHint.textContent = 'Use emoji (e.g. 🚀) or an image URL (https://...)';
    }
  }

  // Show corresponding input field group based on selected action type
  switch (actionType) {
    case 'application':
      applicationInputGroup.style.display = 'block';
      break;
    case 'exec':
      commandInputGroup.style.display = 'block';
      break;
    case 'open':
      urlInputGroup.style.display = 'block';
      break;
    case 'script':
      scriptInputGroup.style.display = 'block';
      break;
    case 'chain':
      chainInputGroup.style.display = 'block';
      break;
  }
}

/**
 * Save button settings
 */
export async function saveButtonSettings() {
  if (!currentEditingButton || saving) {
    return;
  }

  const pageIndex = editState.index;
  const buttonIndex = editState.buttonIndex;
  showButtonError('');

  // Create new button object with input values
  const action = editButtonActionSelect.value;
  const updatedButton = {
    ...currentEditingButton,
    id: currentEditingButton.id || crypto.randomUUID(),
    name: editButtonNameInput.value.trim(),
    icon: editButtonIconInput.value.trim(),
    shortcut: currentEditingButton.shortcut.trim(), // Shortcut cannot be changed
    action,
  };

  for (const key of ['applicationPath', 'applicationParameters', 'command', 'workingDir', 'runInTerminal', 'url', 'path', 'application', 'script', 'scriptType', 'scriptParams', 'actions', 'stopOnError']) {
    delete updatedButton[key];
  }

  // Set additional properties based on action type
  switch (action) {
    case 'application':
      updatedButton.applicationPath = editButtonApplicationInput.value.trim();

      // Add application parameters (optional)
      if (editButtonApplicationParametersInput.value.trim()) {
        updatedButton.applicationParameters = editButtonApplicationParametersInput.value.trim();
      }
      break;

    case 'exec':
      updatedButton.command = editButtonCommandInput.value.trim();

      // Add working directory (optional)
      if (editButtonWorkingDirInput.value.trim()) {
        updatedButton.workingDir = editButtonWorkingDirInput.value.trim();
      }

      // Add run in terminal option
      updatedButton.runInTerminal = editButtonRunInTerminalCheckbox.checked;
      break;

    case 'open':
      // URL or path is required (not both)
      if (editButtonUrlInput.value.trim()) {
        updatedButton.url = editButtonUrlInput.value.trim();
      }
      else if (editButtonPathInput.value.trim()) {
        updatedButton.path = editButtonPathInput.value.trim();
      }

      // Application setting (optional)
      if (editButtonOpenApplicationInput.value.trim()) {
        updatedButton.application = editButtonOpenApplicationInput.value.trim();
      }
      break;

    case 'script':
      updatedButton.script = editButtonScriptInput.value.trim();
      updatedButton.scriptType = editButtonScriptTypeSelect.value;
      if (updatedButton.scriptType === 'special') {
        updatedButton.script = 'confetti';
        break;
      }

      // Add script parameters (parse as JSON format)
      if (editButtonScriptParamsInput.value.trim()) {
        try {
          updatedButton.scriptParams = JSON.parse(editButtonScriptParamsInput.value.trim());
        }
        catch (error) {
          showButtonError('Script parameters must be valid JSON. Your draft is preserved.');
          return;
        }
      }
      break;

    case 'chain':
      // The edit modal has no chain action editor yet — keep the existing
      // actions so saving the button does not wipe them
      updatedButton.actions = Array.isArray(currentEditingButton.actions) ? currentEditingButton.actions : [];
      updatedButton.stopOnError = editButtonStopOnErrorCheckbox.checked;
      break;
  }

  const nextPages = JSON.parse(JSON.stringify(editState.pages));
  nextPages[pageIndex] = {
    ...nextPages[pageIndex],
    id: nextPages[pageIndex].id || crypto.randomUUID(),
    buttons: editState.viewPages[pageIndex].buttons.map((button, index) => index === buttonIndex ? updatedButton : button),
  };
  saving = true;
  const controls = buttonEditModal.querySelectorAll('input, textarea, select, button');
  controls.forEach(control => {
    control.disabled = true;
  });
  try {
    await savePageEdit(nextPages, editState);
    saving = false;
    closeButtonEditModal();
    showStatus(`Button "${updatedButton.name}" settings have been updated.`, 'success');
  }
  catch (error) {
    showButtonError(error.message);
  }
  finally {
    saving = false;
    controls.forEach(control => {
      control.disabled = false;
    });
  }
}

function showButtonError(message) {
  const element = document.getElementById('button-edit-error');
  element.textContent = message;
  element.classList.toggle('hidden', !message);
  if (message) {
    element.scrollIntoView({ block: 'nearest' });
  }
}
