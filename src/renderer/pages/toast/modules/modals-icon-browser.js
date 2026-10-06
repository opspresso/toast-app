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
import { getAppNameFromOpenCommand } from './local-icon-utils.js';
import { captureButtonEditRequest, syncModalState } from './modal-state.js';
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
    const isCurrent = captureButtonEditRequest();
    if (!isCurrent()) {
      return;
    }
    // Initialize icon container and render icon grid
    renderIconsGrid();

    // Show icon search modal
    iconSearchModal.classList.add('show');
    window.toast.setModalOpen(true);

    // Focus on search field
    setTimeout(() => {
      if (isCurrent() && iconSearchModal.classList.contains('show')) {
        iconSearchInput.focus();
      }
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
    } else {
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
  syncModalState();
}

let previewVersion = 0;

/** Update only the current edit's preview; late file/image requests cannot replace it. */
export async function updateIconPreview() {
  const version = ++previewVersion;
  const unchanged = captureButtonEditRequest(() =>
    JSON.stringify([
      editButtonIconInput.value,
      editButtonActionSelect.value,
      editButtonUrlInput.value,
      editButtonCommandInput.value,
      editButtonApplicationInput.value,
    ]),
  );
  const isCurrent = () => version === previewVersion && unchanged();
  if (!isCurrent()) {
    return;
  }
  const iconValue = editButtonIconInput.value.trim();
  const actionType = editButtonActionSelect.value;
  const previewImg = document.getElementById('icon-preview-img');
  const placeholder = iconPreview.querySelector('.icon-preview-placeholder');
  const fallback = { exec: '⚡', application: '🚀', open: '🌐', script: '📜', chain: '🔗' }[actionType];
  const showPlaceholder = (value = fallback) => {
    if (!isCurrent()) {
      return;
    }
    previewImg.onerror = null;
    previewImg.onload = null;
    previewImg.removeAttribute('src');
    previewImg.style.display = 'none';
    placeholder.style.display = 'block';
    if (value) {
      placeholder.textContent = value;
    } else {
      placeholder.innerHTML = UI_ICONS.image;
    }
    iconPreview.classList.remove('has-icon');
  };
  const showImage = url => {
    if (!isCurrent()) {
      return;
    }
    previewImg.onload = () => {
      if (isCurrent()) {
        previewImg.style.display = 'block';
        placeholder.style.display = 'none';
        iconPreview.classList.add('has-icon');
      }
    };
    previewImg.onerror = () => showPlaceholder();
    previewImg.src = url;
  };
  showPlaceholder();
  try {
    if (iconValue.startsWith('FlatColorIcons.')) {
      const key = iconValue.slice('FlatColorIcons.'.length);
      const category = Object.values(window.IconsCatalog).find(value => value.icons?.[key]);
      if (category) {
        showImage(category.icons[key]);
      }
    } else if (iconValue.startsWith('file://~/')) {
      const resolved = await window.toast.resolveTildePath(iconValue.slice(7));
      showImage(`file://${resolved}`);
    } else if (/^(file|https?):\/\//.test(iconValue)) {
      showImage(iconValue);
    } else if (iconValue) {
      showPlaceholder(iconValue);
    } else if (actionType === 'open' && editButtonUrlInput.value.trim()) {
      showImage(getFaviconFromUrl(editButtonUrlInput.value.trim()));
    } else if (window.toast.platform === 'darwin') {
      const reference =
        actionType === 'application'
          ? editButtonApplicationInput.value.trim()
          : actionType === 'exec'
            ? getAppNameFromOpenCommand(editButtonCommandInput.value)
            : null;
      if (reference) {
        const result = await window.toast.extractAppIcon(reference, false);
        if (result?.success) {
          showImage(result.remoteUrl || result.iconUrl);
        }
      }
    }
  } catch (error) {
    if (isCurrent()) {
      console.warn('Failed to load icon preview:', error);
      showPlaceholder();
    }
  }
}
