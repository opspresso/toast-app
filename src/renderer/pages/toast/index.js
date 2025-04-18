/**
 * Toast App - Toast Window JavaScript
 *
 * This script handles the functionality of the Toast popup window.
 */

// DOM Elements
const buttonsContainer = document.getElementById('buttons-container');
const searchInput = document.getElementById('search-input');
const closeButton = document.getElementById('close-button');
const statusContainer = document.getElementById('status-container');
const buttonTemplate = document.getElementById('button-template');

// State
let buttons = [];
let selectedButtonIndex = -1;
let filteredButtons = [];

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  // Load configuration
  window.addEventListener('config-loaded', (event) => {
    const config = event.detail;

    // Set up buttons
    if (config.buttons) {
      buttons = config.buttons;
      filteredButtons = [...buttons];
      renderButtons();
    }

    // Apply appearance settings
    if (config.appearance) {
      applyAppearanceSettings(config.appearance);
    }
  });

  // Set up event listeners
  setupEventListeners();
});

/**
 * Set up event listeners
 */
function setupEventListeners() {
  // Close button
  closeButton.addEventListener('click', () => {
    window.toast.hideWindow();
  });

  // Search input
  searchInput.addEventListener('input', () => {
    filterButtons();
  });

  // Keyboard navigation
  document.addEventListener('keydown', handleKeyDown);

  // Listen for configuration updates
  window.toast.onConfigUpdated((config) => {
    if (config.buttons) {
      buttons = config.buttons;
      filterButtons(); // This will also re-render
    }

    if (config.appearance) {
      applyAppearanceSettings(config.appearance);
    }
  });
}

/**
 * Handle keyboard events
 * @param {KeyboardEvent} event - Keyboard event
 */
function handleKeyDown(event) {
  // If search is focused, don't handle navigation keys
  if (document.activeElement === searchInput &&
      event.key !== 'Escape' &&
      event.key !== 'Enter') {
    return;
  }

  switch (event.key) {
    case 'ArrowUp':
      event.preventDefault();
      navigateButtons('up');
      break;
    case 'ArrowDown':
      event.preventDefault();
      navigateButtons('down');
      break;
    case 'ArrowLeft':
      event.preventDefault();
      navigateButtons('left');
      break;
    case 'ArrowRight':
      event.preventDefault();
      navigateButtons('right');
      break;
    case 'Enter':
      event.preventDefault();
      if (selectedButtonIndex >= 0 && selectedButtonIndex < filteredButtons.length) {
        executeButton(filteredButtons[selectedButtonIndex]);
      }
      break;
    default:
      // Check if key matches a button shortcut
      const upperKey = event.key.toUpperCase();
      const buttonIndex = filteredButtons.findIndex(button =>
        button.shortcut && button.shortcut.toUpperCase() === upperKey
      );

      if (buttonIndex >= 0) {
        event.preventDefault();
        executeButton(filteredButtons[buttonIndex]);
      }
      break;
  }
}

/**
 * Navigate between buttons using keyboard
 * @param {string} direction - Direction to navigate (up, down, left, right)
 */
function navigateButtons(direction) {
  if (filteredButtons.length === 0) return;

  const buttonsPerRow = getButtonsPerRow();
  let newIndex = selectedButtonIndex;

  if (selectedButtonIndex === -1) {
    // No button selected, select the first one
    newIndex = 0;
  } else {
    // Calculate new index based on direction
    switch (direction) {
      case 'up':
        newIndex = selectedButtonIndex - buttonsPerRow;
        break;
      case 'down':
        newIndex = selectedButtonIndex + buttonsPerRow;
        break;
      case 'left':
        newIndex = selectedButtonIndex - 1;
        break;
      case 'right':
        newIndex = selectedButtonIndex + 1;
        break;
    }

    // Ensure index is within bounds
    if (newIndex < 0) {
      newIndex = direction === 'up' ?
        filteredButtons.length - (filteredButtons.length % buttonsPerRow || buttonsPerRow) + (selectedButtonIndex % buttonsPerRow) :
        direction === 'left' ?
          selectedButtonIndex + buttonsPerRow - 1 :
          0;

      if (newIndex >= filteredButtons.length) {
        newIndex = filteredButtons.length - 1;
      }
    } else if (newIndex >= filteredButtons.length) {
      newIndex = direction === 'down' ?
        selectedButtonIndex % buttonsPerRow :
        direction === 'right' ?
          selectedButtonIndex - buttonsPerRow + 1 :
          filteredButtons.length - 1;

      if (newIndex < 0) {
        newIndex = 0;
      }
    }
  }

  // Update selected button
  selectButton(newIndex);
}

/**
 * Get the number of buttons per row based on current layout
 * @returns {number} Buttons per row
 */
function getButtonsPerRow() {
  const containerStyle = window.getComputedStyle(buttonsContainer);
  const columns = containerStyle.gridTemplateColumns.split(' ').length;
  return columns;
}

/**
 * Select a button by index
 * @param {number} index - Button index
 */
function selectButton(index) {
  // Remove selection from current button
  if (selectedButtonIndex >= 0 && selectedButtonIndex < filteredButtons.length) {
    const currentButton = buttonsContainer.children[selectedButtonIndex];
    if (currentButton) {
      currentButton.classList.remove('selected');
    }
  }

  // Update selected index
  selectedButtonIndex = index;

  // Add selection to new button
  if (selectedButtonIndex >= 0 && selectedButtonIndex < filteredButtons.length) {
    const newButton = buttonsContainer.children[selectedButtonIndex];
    if (newButton) {
      newButton.classList.add('selected');
      newButton.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }
}

/**
 * Filter buttons based on search input
 */
function filterButtons() {
  const searchTerm = searchInput.value.toLowerCase();

  if (searchTerm === '') {
    filteredButtons = [...buttons];
  } else {
    filteredButtons = buttons.filter(button =>
      button.name.toLowerCase().includes(searchTerm) ||
      (button.shortcut && button.shortcut.toLowerCase().includes(searchTerm))
    );
  }

  renderButtons();

  // Reset selection
  selectedButtonIndex = filteredButtons.length > 0 ? 0 : -1;
  if (selectedButtonIndex >= 0) {
    selectButton(selectedButtonIndex);
  }
}

/**
 * Render buttons in the container
 */
function renderButtons() {
  // Clear container
  buttonsContainer.innerHTML = '';

  // Create and append button elements
  filteredButtons.forEach((button, index) => {
    const buttonElement = createButtonElement(button);

    // Add click event
    buttonElement.addEventListener('click', () => {
      executeButton(button);
    });

    // Add hover event
    buttonElement.addEventListener('mouseenter', () => {
      selectButton(index);
    });

    buttonsContainer.appendChild(buttonElement);
  });

  // Show message if no buttons
  if (filteredButtons.length === 0) {
    const noResults = document.createElement('div');
    noResults.className = 'no-results';
    noResults.textContent = 'No matching buttons found';
    buttonsContainer.appendChild(noResults);
  }
}

/**
 * Create a button element from a button configuration
 * @param {Object} button - Button configuration
 * @returns {HTMLElement} Button element
 */
function createButtonElement(button) {
  // Clone the template
  const buttonElement = buttonTemplate.content.cloneNode(true).querySelector('.toast-button');

  // Set button data
  buttonElement.dataset.action = JSON.stringify(button);

  // Set button name
  const nameElement = buttonElement.querySelector('.button-name');
  nameElement.textContent = button.name;

  // Set button icon
  const iconElement = buttonElement.querySelector('.button-icon');
  iconElement.textContent = button.icon || '🔘';

  // Set button shortcut
  const shortcutElement = buttonElement.querySelector('.button-shortcut');
  if (button.shortcut) {
    shortcutElement.textContent = button.shortcut;
  } else {
    shortcutElement.style.display = 'none';
  }

  return buttonElement;
}

/**
 * Execute a button's action
 * @param {Object} button - Button configuration
 */
function executeButton(button) {
  // Show executing status
  showStatus('Executing...', 'info');

  // Create action object
  const action = {
    action: button.action,
    ...button
  };

  // Execute the action
  window.toast.executeAction(action)
    .then(result => {
      if (result.success) {
        showStatus(result.message || 'Action completed successfully', 'success');
      } else {
        showStatus(result.message || 'Action failed', 'error');
      }
    })
    .catch(error => {
      showStatus(`Error: ${error.message || 'Unknown error'}`, 'error');
    });
}

/**
 * Show a status message
 * @param {string} message - Status message
 * @param {string} type - Status type (info, success, error)
 */
function showStatus(message, type = 'info') {
  statusContainer.textContent = message;
  statusContainer.className = 'toast-status';
  statusContainer.classList.add(type);

  // Clear status after a delay for success messages
  if (type === 'success') {
    setTimeout(() => {
      statusContainer.textContent = '';
      statusContainer.className = 'toast-status';
    }, 3000);
  }
}

/**
 * Apply appearance settings
 * @param {Object} appearance - Appearance settings
 */
function applyAppearanceSettings(appearance) {
  const container = document.querySelector('.toast-container');

  // Apply theme
  if (appearance.theme) {
    document.documentElement.setAttribute('data-theme', appearance.theme);
  }

  // Apply button layout
  if (appearance.buttonLayout) {
    buttonsContainer.className = 'toast-buttons';
    buttonsContainer.classList.add(appearance.buttonLayout);
  }

  // Apply size
  if (appearance.size) {
    container.className = 'toast-container';
    container.classList.add(`size-${appearance.size}`);
  }
}
