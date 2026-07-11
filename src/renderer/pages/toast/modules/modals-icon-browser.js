/**
 * Toast - Icon Browser & Preview Functions
 */

import {
  iconSearchModal,
  editButtonIconInput,
  editButtonActionSelect,
  editButtonUrlInput,
  editButtonCommandInput,
  editButtonApplicationInput,
  iconPreview,
} from './dom-elements.js';
import { UI_ICONS } from './constants.js';
import { showStatus, getFaviconFromUrl } from './utils.js';

/**
 * Setup icon search modal functionality
 */
export function setupIconSearchModal() {
  const browseIconButton = document.getElementById('browse-icon-button');
  const closeIconSearch = document.getElementById('close-icon-search');
  const closeIconBrowser = document.getElementById('close-icon-browser');
  const iconSearchInput = document.getElementById('icon-search-input');
  const categorySelect = document.getElementById('category-select');
  const iconsContainer = document.getElementById('icons-container');

  // Icon search button click event
  browseIconButton.addEventListener('click', () => {
    // Initialize icon container and render icon grid
    renderIconsGrid();

    // Show icon search modal
    iconSearchModal.classList.add('show');
    window.toast.setModalOpen(true);

    // Focus on search field
    setTimeout(() => {
      iconSearchInput.focus();
    }, 300);
  });

  // Icon search modal close button event
  closeIconSearch.addEventListener('click', closeIconSearchModal);
  closeIconBrowser.addEventListener('click', closeIconSearchModal);

  // Icon search field input event
  iconSearchInput.addEventListener('input', () => {
    renderIconsGrid();
  });

  // Category selection change event
  categorySelect.addEventListener('change', () => {
    renderIconsGrid();
  });

  // Icon grid rendering function
  function renderIconsGrid() {
    // Initialize container
    iconsContainer.innerHTML = '';

    const searchQuery = iconSearchInput.value.trim().toLowerCase();
    const selectedCategory = categorySelect.value;

    // Display all categories or only selected category
    if (selectedCategory === 'all') {
      // Display all categories
      Object.keys(window.IconsCatalog).forEach(category => {
        renderCategoryIcons(category, searchQuery);
      });
    }
    else {
      // Display only selected category
      renderCategoryIcons(selectedCategory, searchQuery);
    }
  }

  // Category icon rendering function
  function renderCategoryIcons(categoryKey, searchQuery) {
    if (!window.IconsCatalog || !window.IconsCatalog[categoryKey]) {
      return;
    }

    const category = window.IconsCatalog[categoryKey];
    const icons = category.icons;
    const filteredIcons = {};

    // Filter icons by search query
    Object.keys(icons).forEach(iconKey => {
      if (!searchQuery || iconKey.toLowerCase().includes(searchQuery)) {
        filteredIcons[iconKey] = icons[iconKey];
      }
    });

    // Add category only if there are filtered icons
    if (Object.keys(filteredIcons).length > 0) {
      // Add category title
      const categoryTitle = document.createElement('div');
      categoryTitle.className = 'icon-category-title';
      categoryTitle.textContent = category.name;
      iconsContainer.appendChild(categoryTitle);

      // Add icons
      Object.keys(filteredIcons).forEach(iconKey => {
        const iconPath = filteredIcons[iconKey];
        const iconValue = `FlatColorIcons.${iconKey}`;

        // Create icon item
        const iconItem = document.createElement('div');
        iconItem.className = 'icon-item';
        iconItem.setAttribute('data-icon', iconValue);

        // Check if this is the currently selected icon
        if (editButtonIconInput.value === iconValue) {
          iconItem.classList.add('selected');
        }

        // Create icon image
        const img = document.createElement('img');
        img.src = iconPath;
        img.alt = iconKey;

        // Icon click event
        iconItem.addEventListener('click', () => {
          // Remove selection from previously selected icon
          document.querySelectorAll('.icons-container .icon-item.selected').forEach(item => {
            item.classList.remove('selected');
          });

          // Select current icon
          iconItem.classList.add('selected');

          // Set value to icon field
          editButtonIconInput.value = iconValue;

          // Trigger input event to update preview
          editButtonIconInput.dispatchEvent(new Event('input', { bubbles: true }));

          // Close modal
          closeIconSearchModal();

          // Show status message
          showStatus('Icon selected', 'info');
        });

        // Add only image to icon item (remove name)
        iconItem.appendChild(img);
        iconsContainer.appendChild(iconItem);
      });
    }
  }
}

/**
 * Icon search modal close function
 */
export function closeIconSearchModal() {
  iconSearchModal.classList.remove('show');
  window.toast.setModalOpen(false);
}

/**
 * Try to load extracted icon for preview
 * @param {HTMLElement} previewImg - Preview image element
 * @param {HTMLElement} placeholder - Placeholder element
 * @param {HTMLElement} iconPreview - Icon preview container
 * @param {string} applicationPath - Application path
 * @param {string} fallbackIcon - Fallback icon if extraction fails
 */
function tryLoadExtractedIconForPreview(previewImg, placeholder, iconPreview, applicationPath, fallbackIcon) {
  // Try to get existing extracted icon
  window.toast
    .extractAppIcon(applicationPath, false)
    .then(result => {
      if (result.success && result.iconUrl) {
        // Show extracted icon
        previewImg.src = result.iconUrl;
        previewImg.style.display = 'block';
        placeholder.style.display = 'none';
        iconPreview.classList.add('has-icon');

        // Handle image loading error
        previewImg.onerror = function () {
          previewImg.style.display = 'none';
          placeholder.style.display = 'block';
          placeholder.textContent = fallbackIcon;
          iconPreview.classList.remove('has-icon');
        };
      }
      else {
        // Use fallback icon if extraction fails
        previewImg.style.display = 'none';
        placeholder.style.display = 'block';
        placeholder.textContent = fallbackIcon;
        iconPreview.classList.remove('has-icon');
      }
    })
    .catch(error => {
      console.warn('Failed to load icon preview:', error);
      previewImg.style.display = 'none';
      placeholder.style.display = 'block';
      placeholder.textContent = fallbackIcon;
      iconPreview.classList.remove('has-icon');
    });
}

/**
 * Update the icon preview (applies the same logic as the toast window buttons)
 */
export function updateIconPreview() {
  const iconValue = editButtonIconInput.value.trim();
  const actionType = editButtonActionSelect.value;
  const urlValue = editButtonUrlInput.value.trim();
  const commandValue = editButtonCommandInput.value.trim();
  const previewImg = document.getElementById('icon-preview-img');
  const placeholder = iconPreview.querySelector('.icon-preview-placeholder');

  // Handle FlatColorIcons
  if (iconValue && iconValue.startsWith('FlatColorIcons.')) {
    const iconKey = iconValue.replace('FlatColorIcons.', '');
    let iconPath = null;

    // Search in the icon catalog
    for (const categoryKey of Object.keys(window.IconsCatalog)) {
      const category = window.IconsCatalog[categoryKey];
      if (category.icons && category.icons[iconKey]) {
        iconPath = category.icons[iconKey];
        break;
      }
    }

    if (iconPath) {
      previewImg.src = iconPath;
      previewImg.style.display = 'block';
      placeholder.style.display = 'none';
      iconPreview.classList.add('has-icon');
      return;
    }
  }
  else if (actionType === 'open' && (!iconValue || iconValue === '') && urlValue) {
    // For open actions where the icon is empty but a URL exists, use the favicon
    const faviconUrl = getFaviconFromUrl(urlValue);
    previewImg.src = faviconUrl;
    previewImg.style.display = 'block';
    placeholder.style.display = 'none';
    iconPreview.classList.add('has-icon');

    // Fall back to the default icon if the favicon fails to load
    previewImg.onerror = function () {
      previewImg.style.display = 'none';
      placeholder.style.display = 'block';
      placeholder.textContent = '🌐';
      iconPreview.classList.remove('has-icon');
    };
    return;
  }
  else if (iconValue && (iconValue.startsWith('file://') || iconValue.startsWith('http://') || iconValue.startsWith('https://'))) {
    // URL-form icon (file://, http://, https://)
    // Handle file:// URLs with tilde paths
    if (iconValue.startsWith('file://~/')) {
      const tildePath = iconValue.substring(7); // Remove 'file://' prefix
      window.toast
        .resolveTildePath(tildePath)
        .then(resolvedPath => {
          previewImg.src = `file://${resolvedPath}`;
          previewImg.style.display = 'block';
          placeholder.style.display = 'none';
          iconPreview.classList.add('has-icon');
        })
        .catch(err => {
          console.warn('Failed to resolve tilde path:', err);
          previewImg.src = iconValue; // Fallback to original
          previewImg.style.display = 'block';
          placeholder.style.display = 'none';
          iconPreview.classList.add('has-icon');
        });
    }
    else {
      previewImg.src = iconValue;
      previewImg.style.display = 'block';
      placeholder.style.display = 'none';
      iconPreview.classList.add('has-icon');
    }

    // Fall back to the default icon if the image fails to load
    previewImg.onerror = function () {
      previewImg.style.display = 'none';
      placeholder.style.display = 'block';
      placeholder.textContent = '🔘';
      iconPreview.classList.remove('has-icon');
    };
    return;
  }
  else if (iconValue && iconValue !== '') {
    // Emoji or text icon
    previewImg.style.display = 'none';
    placeholder.style.display = 'block';
    placeholder.textContent = iconValue;
    iconPreview.classList.remove('has-icon');
    return;
  }

  // Detect the 'open -a AppName' pattern in exec actions and show the icon
  if (actionType === 'exec' && (!iconValue || iconValue === '') && commandValue) {
    // Supports various patterns: open -a AppName, open -a "App Name", open -a domain.com
    const openAppMatch = commandValue.match(/^open\s+-a\s+(?:"([^"]+)"|([\w\s.-]+))/);
    if (openAppMatch) {
      const appName = (openAppMatch[1] || openAppMatch[2]).trim();
      // Check whether an extracted icon exists and try to load it
      if (window.toast && window.toast.platform === 'darwin') {
        const appPath = `/Applications/${appName}.app`;
        tryLoadExtractedIconForPreview(previewImg, placeholder, iconPreview, appPath, '📱');
        return;
      }
    }
  }

  // For application actions with an application path, show the icon
  if (actionType === 'application' && (!iconValue || iconValue === '') && editButtonApplicationInput.value.trim()) {
    const applicationPath = editButtonApplicationInput.value.trim();
    if (window.toast && window.toast.platform === 'darwin') {
      tryLoadExtractedIconForPreview(previewImg, placeholder, iconPreview, applicationPath, '🚀');
      return;
    }
  }

  // When there is no icon, show the default icon per action type
  previewImg.style.display = 'none';
  placeholder.style.display = 'block';
  iconPreview.classList.remove('has-icon');

  switch (actionType) {
    case 'exec':
      placeholder.textContent = '⚡';
      break;
    case 'application':
      placeholder.textContent = '🚀';
      break;
    case 'open':
      placeholder.textContent = '🌐';
      break;
    case 'script':
      placeholder.textContent = '📜';
      break;
    case 'chain':
      placeholder.textContent = '🔗';
      break;
    default:
      placeholder.innerHTML = UI_ICONS.image;
      break;
  }
}
