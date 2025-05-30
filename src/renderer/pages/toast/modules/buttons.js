/**
 * Toast - Button Management Functions
 */

import { buttonsContainer, buttonTemplate } from './dom-elements.js';
import { getFaviconFromUrl, isURL, createNoResultsElement, showStatus } from './utils.js';
import { getCurrentPageButtons } from './pages.js';

// State variables
export let filteredButtons = [];
export let selectedButtonIndex = -1;
export let isSettingsMode = false;

/**
 * Display buttons for current page
 */
export function showCurrentPageButtons() {
  const currentPageButtons = getCurrentPageButtons();

  // If there are no pages or buttons
  if (currentPageButtons.length === 0) {
    // Initialize button container
    buttonsContainer.innerHTML = '';

    // Show message instructing to add a page
    const noResults = createNoResultsElement();
    buttonsContainer.appendChild(noResults);

    // Reset filtered buttons array
    filteredButtons = [];
    return;
  }

  // If buttons exist, display them
  renderButtons(currentPageButtons);
}

/**
 * Render buttons to container
 * @param {Array} buttons - Array of buttons to display
 */
export function renderButtons(buttons) {
  // Store button array for keyboard navigation
  filteredButtons = buttons || [];

  // Clear container
  buttonsContainer.innerHTML = '';

  // Create and add buttons
  filteredButtons.forEach((button, index) => {
    const buttonElement = createButtonElement(button);

    // Click event
    buttonElement.addEventListener('click', () => {
      executeButton(button);
    });

    // Hover event
    buttonElement.addEventListener('mouseenter', () => {
      selectButton(index);
    });

    buttonsContainer.appendChild(buttonElement);
  });

  // Show empty state if no buttons
  if (filteredButtons.length === 0) {
    const noResults = createNoResultsElement();
    buttonsContainer.appendChild(noResults);
  }
}

/**
 * Create a button element from a button configuration
 * @param {Object} button - Button configuration
 * @returns {HTMLElement} Button element
 */
export function createButtonElement(button) {
  // Clone the template
  const buttonElement = buttonTemplate.content.cloneNode(true).querySelector('.toast-button');

  // Set button data
  buttonElement.dataset.action = JSON.stringify(button);

  // Set button name
  const nameElement = buttonElement.querySelector('.button-name');
  nameElement.textContent = button.name;

  // Set button icon
  const iconElement = buttonElement.querySelector('.button-icon');

  // Process FlatColorIcons format icon
  if (button.icon && button.icon.startsWith('FlatColorIcons.')) {
    const iconName = button.icon.split('.')[1]; // 'FlatColorIcons.home' -> 'home'
    if (window.AllIcons && window.AllIcons[iconName]) {
      iconElement.textContent = '';
      const img = document.createElement('img');
      img.src = window.AllIcons[iconName];
      img.alt = button.name || iconName;
      img.onerror = function () {
        // Display default icon if image loading fails
        iconElement.textContent = '🔍';
      };
      iconElement.appendChild(img);
    } else {
      // Display only icon name if icon not found
      iconElement.textContent = iconName || '❓';
    }
  }
  // URL type and icon is empty but URL exists, use URL's favicon
  else if (button.action === 'open' && (!button.icon || button.icon.trim() === '') && button.url) {
    // Extract domain from URL and create favicon path
    const faviconUrl = getFaviconFromUrl(button.url);
    iconElement.textContent = '';
    const img = document.createElement('img');
    img.src = faviconUrl;
    img.alt = button.name || 'Button icon';
    img.onerror = function () {
      // Use default icon if favicon load fails
      iconElement.textContent = '🌐';
    };
    iconElement.appendChild(img);
  }
  // Application type and icon is empty but application path exists, use application icon
  else if (button.action === 'application' && (!button.icon || button.icon.trim() === '')) {
    // Use default app icon
    iconElement.textContent = '🚀';
  }
  // Exec type and icon is empty but command exists, use default icon
  else if (button.action === 'exec' && (!button.icon || button.icon.trim() === '') && button.command) {
    // Use default command icon
    iconElement.textContent = '⚡';
  }
  // URL type and icon is not empty, use icon
  else if (button.icon && isURL(button.icon)) {
    // Create image tag if icon is a URL image
    iconElement.textContent = '';
    const img = document.createElement('img');
    img.src = button.icon;
    img.alt = button.name || 'Button icon';
    img.onerror = function () {
      // Replace with default icon if image load fails
      iconElement.textContent = '🔘';
    };
    iconElement.appendChild(img);
  }
  // Other types and icon is not empty, use icon
  else if (button.icon && button.icon.trim() !== '') {
    // Use as emoji or plain text
    iconElement.textContent = button.icon || '🔘';
  }
  // Default icons for actions without icons
  else {
    switch (button.action) {
      case 'exec':
        iconElement.textContent = '⚡';
        break;
      case 'application':
        iconElement.textContent = '🚀';
        break;
      case 'open':
        iconElement.textContent = '🌐';
        break;
      case 'script':
        iconElement.textContent = '📜';
        break;
      case 'chain':
        iconElement.textContent = '🔗';
        break;
      default:
        iconElement.textContent = '🔘';
        break;
    }
  }

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
 * Execute a button's action or edit in settings mode
 * @param {Object} button - Button configuration
 */
export function executeButton(button) {
  // Change button settings if in settings mode
  if (isSettingsMode) {
    import('./modals.js').then(({ editButtonSettings }) => {
      editButtonSettings(button);
    });
    return;
  }

  // Execute button action in normal mode
  showStatus('Executing...', 'info');

  // 특별 명령어 처리 (꽃가루 애니메이션)
  if (button.action === 'script' && button.scriptType === 'special' && button.script === 'confetti') {
    // 꽃가루 애니메이션 실행
    showStatus('🎉 Let it go!', 'success');
    window.confetti.start({
      duration: 5,  // 5초 동안 실행
      density: 100  // 꽃가루 밀도
    });
    return;
  }

  // Create action object
  const action = {
    action: button.action,
    ...button,
  };

  // Execute the action
  window.toast
    .executeAction(action)
    .then(result => {
      if (result.success) {
        showStatus(result.message || 'Action completed successfully', 'success');

        // Check hideAfterAction setting and hide window if enabled
        window.toast.getConfig('advanced.hideAfterAction').then(hideAfterAction => {
          if (hideAfterAction !== false) {
            window.toast.hideWindow();
          }
        });
      } else {
        showStatus(result.message || 'Action failed', 'error');
      }
    })
    .catch(error => {
      showStatus(`Error: ${error.message || 'Unknown error'}`, 'error');
    });
}

/**
 * Toggle settings mode
 */
export function toggleSettingsMode() {
  isSettingsMode = !isSettingsMode;

  // Toggle settings mode class on document
  document.body.classList.toggle('settings-mode', isSettingsMode);

  // Show status message
  if (isSettingsMode) {
    showStatus('Settings mode activated. Click buttons to edit settings.', 'info');
  } else {
    showStatus('Settings mode deactivated.', 'info');
  }

  // Re-render current page
  showCurrentPageButtons();
}

/**
 * Select a button by index
 * @param {number} index - Button index
 */
export function selectButton(index) {
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
 * Get the number of buttons per row based on current layout
 * @returns {number} Buttons per row
 */
export function getButtonsPerRow() {
  const containerStyle = window.getComputedStyle(buttonsContainer);
  const columns = containerStyle.gridTemplateColumns.split(' ').length;
  return columns;
}

/**
 * Navigate between buttons using keyboard
 * @param {string} direction - Direction to navigate (up, down, left, right)
 */
export function navigateButtons(direction) {
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
      newIndex =
        direction === 'up'
          ? filteredButtons.length -
          (filteredButtons.length % buttonsPerRow || buttonsPerRow) +
          (selectedButtonIndex % buttonsPerRow)
          : direction === 'left'
            ? selectedButtonIndex + buttonsPerRow - 1
            : 0;

      if (newIndex >= filteredButtons.length) {
        newIndex = filteredButtons.length - 1;
      }
    } else if (newIndex >= filteredButtons.length) {
      newIndex =
        direction === 'down'
          ? selectedButtonIndex % buttonsPerRow
          : direction === 'right'
            ? selectedButtonIndex - buttonsPerRow + 1
            : filteredButtons.length - 1;

      if (newIndex < 0) {
        newIndex = 0;
      }
    }
  }

  // Update selected button
  selectButton(newIndex);
}
