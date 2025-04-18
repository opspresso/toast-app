/**
 * Toast App - Settings Window JavaScript
 *
 * This script handles the functionality of the Settings window.
 */

// DOM Elements - Tabs
const tabLinks = document.querySelectorAll('.settings-nav li');
const tabContents = document.querySelectorAll('.settings-tab');

// DOM Elements - General Settings
const globalHotkeyInput = document.getElementById('global-hotkey');
const recordHotkeyButton = document.getElementById('record-hotkey');
const clearHotkeyButton = document.getElementById('clear-hotkey');
const launchAtLoginCheckbox = document.getElementById('launch-at-login');

// DOM Elements - Appearance Settings
const themeSelect = document.getElementById('theme');
const positionSelect = document.getElementById('position');
const sizeSelect = document.getElementById('size');
const opacityRange = document.getElementById('opacity');
const opacityValue = document.getElementById('opacity-value');
const buttonLayoutSelect = document.getElementById('button-layout');

// DOM Elements - Advanced Settings
const hideAfterActionCheckbox = document.getElementById('hide-after-action');
const hideOnBlurCheckbox = document.getElementById('hide-on-blur');
const hideOnEscapeCheckbox = document.getElementById('hide-on-escape');
const showInTaskbarCheckbox = document.getElementById('show-in-taskbar');
const resetSettingsButton = document.getElementById('reset-settings');

// DOM Elements - Buttons
const buttonsList = document.getElementById('buttons-list');
const addButtonButton = document.getElementById('add-button');
const importButtonsButton = document.getElementById('import-buttons');
const exportButtonsButton = document.getElementById('export-buttons');

// DOM Elements - Dialog
const buttonEditor = document.getElementById('button-editor');
const dialogTitle = document.getElementById('dialog-title');
const closeDialogButton = document.getElementById('close-dialog');
const buttonNameInput = document.getElementById('button-name');
const buttonShortcutInput = document.getElementById('button-shortcut');
const buttonIconInput = document.getElementById('button-icon');
const actionTypeSelect = document.getElementById('action-type');
const actionParamsContainer = document.getElementById('action-params');
const testActionButton = document.getElementById('test-action');
const saveButtonDialog = document.getElementById('save-button-dialog');
const cancelButtonDialog = document.getElementById('cancel-button-dialog');

// DOM Elements - Action Parameter Templates
const execParamsTemplate = document.getElementById('exec-params-template');
const openParamsTemplate = document.getElementById('open-params-template');
const shortcutParamsTemplate = document.getElementById('shortcut-params-template');
const scriptParamsTemplate = document.getElementById('script-params-template');

// DOM Elements - Main Buttons
const saveButton = document.getElementById('save-button');
const cancelButton = document.getElementById('cancel-button');

// State
let config = {};
let currentButtons = [];
let isRecordingHotkey = false;
let editingButtonIndex = -1;
let unsavedChanges = false;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  // Load configuration
  window.addEventListener('config-loaded', (event) => {
    config = event.detail;

    // Initialize UI with config values
    initializeUI();

    // Set up event listeners
    setupEventListeners();
  });

  // Load config
  window.settings.getConfig().then(loadedConfig => {
    config = loadedConfig;
    initializeUI();
  });
});

/**
 * Initialize UI with config values
 */
function initializeUI() {
  // General settings
  globalHotkeyInput.value = config.globalHotkey || '';
  launchAtLoginCheckbox.checked = config.advanced?.launchAtLogin || false;

  // Appearance settings
  themeSelect.value = config.appearance?.theme || 'system';
  positionSelect.value = config.appearance?.position || 'center';
  sizeSelect.value = config.appearance?.size || 'medium';
  opacityRange.value = config.appearance?.opacity || 0.95;
  opacityValue.textContent = opacityRange.value;
  buttonLayoutSelect.value = config.appearance?.buttonLayout || 'grid';

  // Advanced settings
  hideAfterActionCheckbox.checked = config.advanced?.hideAfterAction !== false;
  hideOnBlurCheckbox.checked = config.advanced?.hideOnBlur !== false;
  hideOnEscapeCheckbox.checked = config.advanced?.hideOnEscape !== false;
  showInTaskbarCheckbox.checked = config.advanced?.showInTaskbar || false;

  // Buttons
  currentButtons = [...(config.buttons || [])];
  renderButtonsList();
}

/**
 * Set up event listeners
 */
function setupEventListeners() {
  // Tab navigation
  tabLinks.forEach(link => {
    link.addEventListener('click', () => {
      const tabId = link.getAttribute('data-tab');
      switchTab(tabId);
    });
  });

  // General settings
  recordHotkeyButton.addEventListener('click', startRecordingHotkey);
  clearHotkeyButton.addEventListener('click', clearHotkey);
  launchAtLoginCheckbox.addEventListener('change', () => {
    markUnsavedChanges();
  });

  // Appearance settings
  themeSelect.addEventListener('change', markUnsavedChanges);
  positionSelect.addEventListener('change', markUnsavedChanges);
  sizeSelect.addEventListener('change', markUnsavedChanges);
  buttonLayoutSelect.addEventListener('change', markUnsavedChanges);

  opacityRange.addEventListener('input', () => {
    opacityValue.textContent = opacityRange.value;
    markUnsavedChanges();
  });

  // Advanced settings
  hideAfterActionCheckbox.addEventListener('change', markUnsavedChanges);
  hideOnBlurCheckbox.addEventListener('change', markUnsavedChanges);
  hideOnEscapeCheckbox.addEventListener('change', markUnsavedChanges);
  showInTaskbarCheckbox.addEventListener('change', markUnsavedChanges);

  resetSettingsButton.addEventListener('click', confirmResetSettings);

  // Buttons
  addButtonButton.addEventListener('click', () => showButtonEditor());
  importButtonsButton.addEventListener('click', importButtons);
  exportButtonsButton.addEventListener('click', exportButtons);

  // Dialog
  closeDialogButton.addEventListener('click', hideButtonEditor);
  cancelButtonDialog.addEventListener('click', hideButtonEditor);
  saveButtonDialog.addEventListener('click', saveButtonFromDialog);

  actionTypeSelect.addEventListener('change', updateActionParams);
  testActionButton.addEventListener('click', testAction);

  // Main buttons
  saveButton.addEventListener('click', saveSettings);
  cancelButton.addEventListener('click', confirmCancel);

  // Hotkey recording
  document.addEventListener('keydown', handleHotkeyRecording);

  // Before unload
  window.addEventListener('beforeunload', (event) => {
    if (unsavedChanges) {
      event.preventDefault();
      event.returnValue = '';
    }
  });
}

/**
 * Switch between tabs
 * @param {string} tabId - ID of the tab to switch to
 */
function switchTab(tabId) {
  // Update tab links
  tabLinks.forEach(link => {
    link.classList.toggle('active', link.getAttribute('data-tab') === tabId);
  });

  // Update tab contents
  tabContents.forEach(content => {
    content.classList.toggle('active', content.id === tabId);
  });
}

/**
 * Start recording a hotkey
 */
function startRecordingHotkey() {
  isRecordingHotkey = true;
  globalHotkeyInput.value = 'Press a key combination...';
  globalHotkeyInput.classList.add('recording');
  recordHotkeyButton.disabled = true;
}

/**
 * Handle hotkey recording
 * @param {KeyboardEvent} event - Keyboard event
 */
function handleHotkeyRecording(event) {
  if (!isRecordingHotkey) return;

  // Prevent default behavior
  event.preventDefault();

  // Get modifier keys
  const modifiers = [];
  if (event.ctrlKey) modifiers.push('Ctrl');
  if (event.altKey) modifiers.push('Alt');
  if (event.shiftKey) modifiers.push('Shift');
  if (event.metaKey) modifiers.push(process.platform === 'darwin' ? 'Cmd' : 'Super');

  // Get the key
  let key = event.key;

  // Skip if only modifier keys are pressed
  if (['Control', 'Alt', 'Shift', 'Meta'].includes(key)) {
    return;
  }

  // Format key name
  if (key === ' ') key = 'Space';
  else if (key.length === 1) key = key.toUpperCase();
  else key = key.charAt(0).toUpperCase() + key.slice(1);

  // Create hotkey string
  const hotkey = [...modifiers, key].join('+');

  // Set the hotkey
  globalHotkeyInput.value = hotkey;
  globalHotkeyInput.classList.remove('recording');
  recordHotkeyButton.disabled = false;
  isRecordingHotkey = false;

  // Mark as unsaved
  markUnsavedChanges();
}

/**
 * Clear the hotkey
 */
function clearHotkey() {
  globalHotkeyInput.value = '';
  isRecordingHotkey = false;
  globalHotkeyInput.classList.remove('recording');
  recordHotkeyButton.disabled = false;

  // Mark as unsaved
  markUnsavedChanges();
}

/**
 * Render the buttons list
 */
function renderButtonsList() {
  // Clear the list
  buttonsList.innerHTML = '';

  // Add buttons
  currentButtons.forEach((button, index) => {
    const li = document.createElement('li');
    li.className = 'button-item';

    // Button info
    const buttonInfo = document.createElement('div');
    buttonInfo.className = 'button-info';

    // Icon
    const iconElement = document.createElement('div');
    iconElement.className = 'button-icon';
    iconElement.textContent = button.icon || '🔘';
    buttonInfo.appendChild(iconElement);

    // Details
    const details = document.createElement('div');
    details.className = 'button-details';

    const name = document.createElement('div');
    name.className = 'button-name';
    name.textContent = button.name;
    details.appendChild(name);

    const action = document.createElement('div');
    action.className = 'button-action';
    action.textContent = getActionDescription(button);
    details.appendChild(action);

    buttonInfo.appendChild(details);
    li.appendChild(buttonInfo);

    // Button actions
    const buttonActions = document.createElement('div');
    buttonActions.className = 'button-actions';

    // Shortcut
    if (button.shortcut) {
      const shortcut = document.createElement('div');
      shortcut.className = 'button-shortcut';
      shortcut.textContent = button.shortcut;
      buttonActions.appendChild(shortcut);
    }

    // Edit button
    const editButton = document.createElement('button');
    editButton.className = 'secondary-button';
    editButton.textContent = 'Edit';
    editButton.addEventListener('click', () => showButtonEditor(index));
    buttonActions.appendChild(editButton);

    // Delete button
    const deleteButton = document.createElement('button');
    deleteButton.className = 'danger-button';
    deleteButton.textContent = 'Delete';
    deleteButton.addEventListener('click', () => confirmDeleteButton(index));
    buttonActions.appendChild(deleteButton);

    li.appendChild(buttonActions);
    buttonsList.appendChild(li);
  });

  // Add empty state if no buttons
  if (currentButtons.length === 0) {
    const emptyState = document.createElement('li');
    emptyState.className = 'button-item empty-state';
    emptyState.textContent = 'No buttons added yet. Click "Add Button" to create one.';
    buttonsList.appendChild(emptyState);
  }
}

/**
 * Get a description of an action
 * @param {Object} button - Button configuration
 * @returns {string} Action description
 */
function getActionDescription(button) {
  switch (button.action) {
    case 'exec':
      return `Execute: ${button.command}`;
    case 'open':
      return button.url ? `Open URL: ${button.url}` : `Open File: ${button.path}`;
    case 'shortcut':
      return `Keyboard Shortcut: ${button.keys}`;
    case 'script':
      return `Script: ${button.scriptType}`;
    default:
      return 'Unknown action';
  }
}

/**
 * Show the button editor
 * @param {number} [index] - Index of the button to edit
 */
function showButtonEditor(index = -1) {
  // Set dialog title
  dialogTitle.textContent = index >= 0 ? 'Edit Button' : 'Add Button';

  // Clear form
  buttonNameInput.value = '';
  buttonShortcutInput.value = '';
  buttonIconInput.value = '';
  actionTypeSelect.value = 'exec';
  actionParamsContainer.innerHTML = '';

  // If editing, fill form with button data
  if (index >= 0 && index < currentButtons.length) {
    const button = currentButtons[index];
    buttonNameInput.value = button.name || '';
    buttonShortcutInput.value = button.shortcut || '';
    buttonIconInput.value = button.icon || '';
    actionTypeSelect.value = button.action || 'exec';

    // Fill action params
    updateActionParams();
    fillActionParams(button);
  } else {
    // Just update action params for new button
    updateActionParams();
  }

  // Store editing index
  editingButtonIndex = index;

  // Show dialog
  buttonEditor.classList.add('active');
}

/**
 * Hide the button editor
 */
function hideButtonEditor() {
  buttonEditor.classList.remove('active');
}

/**
 * Update action parameters based on selected action type
 */
function updateActionParams() {
  // Clear container
  actionParamsContainer.innerHTML = '';

  // Get selected action type
  const actionType = actionTypeSelect.value;

  // Add appropriate template
  let template;
  switch (actionType) {
    case 'exec':
      template = execParamsTemplate.content.cloneNode(true);
      break;
    case 'open':
      template = openParamsTemplate.content.cloneNode(true);

      // Add browse button event listener
      template.querySelector('#browse-file').addEventListener('click', browseFile);
      break;
    case 'shortcut':
      template = shortcutParamsTemplate.content.cloneNode(true);
      break;
    case 'script':
      template = scriptParamsTemplate.content.cloneNode(true);
      break;
  }

  // Add template to container
  actionParamsContainer.appendChild(template);
}

/**
 * Fill action parameters with button data
 * @param {Object} button - Button configuration
 */
function fillActionParams(button) {
  switch (button.action) {
    case 'exec':
      document.getElementById('command').value = button.command || '';
      document.getElementById('working-dir').value = button.workingDir || '';
      document.getElementById('run-in-terminal').checked = button.runInTerminal || false;
      break;
    case 'open':
      document.getElementById('url-or-path').value = button.url || button.path || '';
      document.getElementById('application').value = button.application || '';
      break;
    case 'shortcut':
      document.getElementById('keys').value = button.keys || '';
      break;
    case 'script':
      document.getElementById('script-type').value = button.scriptType || 'javascript';
      document.getElementById('script').value = button.script || '';
      break;
  }
}

/**
 * Browse for a file
 */
async function browseFile() {
  const result = await window.settings.showOpenDialog({
    properties: ['openFile', 'openDirectory']
  });

  if (!result.canceled && result.filePaths.length > 0) {
    document.getElementById('url-or-path').value = result.filePaths[0];
  }
}

/**
 * Test the current action
 */
async function testAction() {
  // Get action data
  const action = getActionFromForm();

  // Validate action
  const validation = await window.settings.validateAction(action);

  if (!validation.valid) {
    alert(`Invalid action: ${validation.message}`);
    return;
  }

  // Test the action
  try {
    const result = await window.settings.testAction(action);

    if (result.success) {
      alert(`Action executed successfully: ${result.message || 'No message'}`);
    } else {
      alert(`Action failed: ${result.message || 'Unknown error'}`);
    }
  } catch (error) {
    alert(`Error testing action: ${error.message || 'Unknown error'}`);
  }
}

/**
 * Get action data from form
 * @returns {Object} Action data
 */
function getActionFromForm() {
  const action = {
    name: buttonNameInput.value,
    shortcut: buttonShortcutInput.value,
    icon: buttonIconInput.value,
    action: actionTypeSelect.value
  };

  // Add action-specific parameters
  switch (action.action) {
    case 'exec':
      action.command = document.getElementById('command').value;
      action.workingDir = document.getElementById('working-dir').value;
      action.runInTerminal = document.getElementById('run-in-terminal').checked;
      break;
    case 'open':
      const urlOrPath = document.getElementById('url-or-path').value;

      // Determine if it's a URL or path
      if (urlOrPath.match(/^https?:\/\//i)) {
        action.url = urlOrPath;
      } else {
        action.path = urlOrPath;
      }

      action.application = document.getElementById('application').value;
      break;
    case 'shortcut':
      action.keys = document.getElementById('keys').value;
      break;
    case 'script':
      action.scriptType = document.getElementById('script-type').value;
      action.script = document.getElementById('script').value;
      break;
  }

  return action;
}

/**
 * Save button from dialog
 */
async function saveButtonFromDialog() {
  // Get action data
  const action = getActionFromForm();

  // Validate action
  const validation = await window.settings.validateAction(action);

  if (!validation.valid) {
    alert(`Invalid action: ${validation.message}`);
    return;
  }

  // Validate required fields
  if (!action.name) {
    alert('Button name is required');
    return;
  }

  // Update or add button
  if (editingButtonIndex >= 0 && editingButtonIndex < currentButtons.length) {
    currentButtons[editingButtonIndex] = action;
  } else {
    currentButtons.push(action);
  }

  // Update UI
  renderButtonsList();

  // Hide dialog
  hideButtonEditor();

  // Mark as unsaved
  markUnsavedChanges();
}

/**
 * Confirm deleting a button
 * @param {number} index - Index of the button to delete
 */
function confirmDeleteButton(index) {
  if (confirm(`Are you sure you want to delete the button "${currentButtons[index].name}"?`)) {
    currentButtons.splice(index, 1);
    renderButtonsList();
    markUnsavedChanges();
  }
}

/**
 * Import buttons from a file
 */
async function importButtons() {
  const result = await window.settings.showOpenDialog({
    filters: [
      { name: 'JSON Files', extensions: ['json'] },
      { name: 'All Files', extensions: ['*'] }
    ],
    properties: ['openFile']
  });

  if (result.canceled || result.filePaths.length === 0) {
    return;
  }

  try {
    const success = await window.settings.importConfig(result.filePaths[0]);

    if (success) {
      // Reload config
      const newConfig = await window.settings.getConfig();
      config = newConfig;
      currentButtons = [...(config.buttons || [])];

      // Update UI
      renderButtonsList();

      alert('Buttons imported successfully');
    } else {
      alert('Failed to import buttons');
    }
  } catch (error) {
    alert(`Error importing buttons: ${error.message || 'Unknown error'}`);
  }
}

/**
 * Export buttons to a file
 */
async function exportButtons() {
  const result = await window.settings.showSaveDialog({
    filters: [
      { name: 'JSON Files', extensions: ['json'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });

  if (result.canceled || !result.filePath) {
    return;
  }

  try {
    const success = await window.settings.exportConfig(result.filePath);

    if (success) {
      alert('Buttons exported successfully');
    } else {
      alert('Failed to export buttons');
    }
  } catch (error) {
    alert(`Error exporting buttons: ${error.message || 'Unknown error'}`);
  }
}

/**
 * Confirm resetting settings
 */
function confirmResetSettings() {
  if (confirm('Are you sure you want to reset all settings to their default values? This cannot be undone.')) {
    resetSettings();
  }
}

/**
 * Reset settings to defaults
 */
async function resetSettings() {
  try {
    const success = await window.settings.resetConfig();

    if (success) {
      // Reload config
      const newConfig = await window.settings.getConfig();
      config = newConfig;

      // Update UI
      initializeUI();

      alert('Settings reset to defaults');
    } else {
      alert('Failed to reset settings');
    }
  } catch (error) {
    alert(`Error resetting settings: ${error.message || 'Unknown error'}`);
  }
}

/**
 * Save settings
 */
async function saveSettings() {
  // Collect settings
  const settings = {
    globalHotkey: globalHotkeyInput.value,
    buttons: currentButtons,
    appearance: {
      theme: themeSelect.value,
      position: positionSelect.value,
      size: sizeSelect.value,
      opacity: parseFloat(opacityRange.value),
      buttonLayout: buttonLayoutSelect.value
    },
    advanced: {
      launchAtLogin: launchAtLoginCheckbox.checked,
      hideAfterAction: hideAfterActionCheckbox.checked,
      hideOnBlur: hideOnBlurCheckbox.checked,
      hideOnEscape: hideOnEscapeCheckbox.checked,
      showInTaskbar: showInTaskbarCheckbox.checked
    }
  };

  // Save settings
  try {
    // Save each section
    await window.settings.setConfig('globalHotkey', settings.globalHotkey);
    await window.settings.setConfig('buttons', settings.buttons);
    await window.settings.setConfig('appearance', settings.appearance);
    await window.settings.setConfig('advanced', settings.advanced);

    // Update config
    config = await window.settings.getConfig();

    // Clear unsaved changes flag
    unsavedChanges = false;

    // Show success message
    alert('Settings saved successfully');

    // Show toast window
    window.settings.showToast();
  } catch (error) {
    alert(`Error saving settings: ${error.message || 'Unknown error'}`);
  }
}

/**
 * Confirm canceling changes
 */
function confirmCancel() {
  if (!unsavedChanges || confirm('You have unsaved changes. Are you sure you want to cancel?')) {
    // Reload config
    window.settings.getConfig().then(loadedConfig => {
      config = loadedConfig;
      initializeUI();

      // Clear unsaved changes flag
      unsavedChanges = false;
    });
  }
}

/**
 * Mark settings as having unsaved changes
 */
function markUnsavedChanges() {
  unsavedChanges = true;
}
