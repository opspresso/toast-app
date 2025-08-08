/**
 * Toast - Authentication and User Management
 */

import { SUBSCRIPTION_URL, DASHBOARD_URL } from './constants.js';
import {
  loginLoadingOverlay,
  profileModal,
  profileAvatar,
  profileName,
  profileEmail,
  subscriptionStatus,
  subscriptionPlan,
  subscriptionExpiry,
  subscriptionPages,
  subscribeButton,
  dashboardButton,
  logoutButton,
  userButton,
} from './dom-elements.js';
import { getInitials, showStatus } from './utils.js';

// State variables
export let userProfile = null;
export let userSubscription = null;
export let isSubscribed = true;
export let isLoggingIn = false;

/**
 * Start login process and show loading screen
 */
export async function initiateSignIn() {
  try {
    // Activate loading screen
    showLoginLoadingScreen();
    isLoggingIn = true;

    // Start login process
    const result = await window.toast.initiateLogin();

    if (result.success) {
      // Get user profile and subscription information
      await fetchUserProfileAndSubscription();

      showStatus('Login successful', 'success');

      // Show user profile modal on successful login
      showUserProfile();
    } else {
      showStatus(`Login failed: ${result.error || 'Unknown error'}`, 'error');
    }
  } catch (error) {
    console.error('Error during login:', error);
    showStatus(`Login error: ${error.message || 'Unknown error'}`, 'error');
  } finally {
    // Deactivate loading screen
    hideLoginLoadingScreen();
    isLoggingIn = false;
  }
}

/**
 * Fetch user profile information
 * (subscription information is provided by the profile API)
 */
export async function fetchUserProfileAndSubscription() {
  try {
    // Fetch user profile (only call profile API once)
    const profileResult = await window.toast.fetchUserProfile();

    if (!profileResult.error) {
      userProfile = profileResult;

      // Check and validate is_authenticated value
      if (userProfile.is_authenticated === undefined) {
        console.warn('is_authenticated flag is missing in user profile, assuming authenticated');
        userProfile.is_authenticated = true; // Assume authenticated if value is missing
      }

      // Extract subscription information (provided in profile)
      if (profileResult.subscription) {
        userSubscription = profileResult.subscription;

        // Update subscription status
        isSubscribed = userSubscription.active || userSubscription.is_subscribed || false;
      } else {
        // Set default values when no subscription information exists
        userSubscription = {
          active: false,
          is_subscribed: false,
          plan: 'free',
          features: { page_groups: 1 },
        };
        isSubscribed = false;
      }

      // UI update - display profile and subscription information
      updateUserButton();
      updateProfileDisplay();
    } else {
      console.error('Failed to fetch user profile information:', profileResult.error);
    }

    return {
      profile: userProfile,
      subscription: userSubscription,
    };
  } catch (error) {
    console.error('Error fetching user information:', error);
    throw error;
  }
}

/**
 * Show login loading screen
 */
export function showLoginLoadingScreen() {
  loginLoadingOverlay.classList.add('show');
}

/**
 * Hide login loading screen
 */
export function hideLoginLoadingScreen() {
  loginLoadingOverlay.classList.remove('show');
}

/**
 * Show user profile modal
 */
export async function showUserProfile() {
  // When user is not logged in
  // Explicitly check is_authenticated flag
  if (!userProfile || !userSubscription || (userProfile && userProfile.is_authenticated === false)) {
    try {
      showStatus('Fetching user information...', 'info');
      showLoginLoadingScreen();

      const result = await fetchUserProfileAndSubscription();
      hideLoginLoadingScreen();

      // Start login process if unable to get user information
      if (!result.profile || !result.subscription) {
        // Initialize profile information before showing login screen
        updateProfileDisplay();

        // Change login button text
        if (logoutButton) {
          logoutButton.textContent = 'Sign In';
        }

        // Show login modal
        profileModal.classList.add('show');
        window.toast.setModalOpen(true);

        // Set login button event handler (not logged in state)
        if (logoutButton) {
          // Set completely new event handler (don't restore to original handler)
          logoutButton.onclick = () => {
            // Close modal
            hideProfileModal();

            // Start login process
            setTimeout(() => {
              initiateSignIn();
            }, 300);
          };
        }

        return;
      }
    } catch (error) {
      hideLoginLoadingScreen();
      showStatus('Failed to fetch user information. Please login again.', 'error');

      // Initialize profile information even if error occurs
      updateProfileDisplay();

      // Change login button text
      if (logoutButton) {
        logoutButton.textContent = 'Sign In';
      }

      // Show login modal
      profileModal.classList.add('show');
      window.toast.setModalOpen(true);
      return;
    }
  }

  // Update profile information
  updateProfileDisplay();

  // Show modal
  profileModal.classList.add('show');
  window.toast.setModalOpen(true);
}

/**
 * Display profile image in user button
 */
export function updateUserButton() {
  userButton.innerHTML = ''; // Remove existing content

  // Authentication status check - consider logged in only if user profile exists and is_authenticated is true
  const isAuthenticated = userProfile && userProfile.is_authenticated !== false;

  if (isAuthenticated) {
    if (userProfile.profile_image || userProfile.avatar || userProfile.image) {
      // If profile image exists
      const img = document.createElement('img');
      const imageUrl = userProfile.profile_image || userProfile.avatar || userProfile.image;
      img.src = imageUrl;
      img.alt = 'Profile';
      img.style.width = '100%';
      img.style.height = '100%';
      img.style.objectFit = 'cover';
      img.style.borderRadius = '50%';

      // Handle image load error
      img.onerror = function () {
        // Use initials as fallback if image load fails
        const initials = getInitials(userProfile.name || userProfile.display_name || 'User');
        userButton.textContent = initials;
        userButton.style.fontSize = '12px';
        userButton.style.backgroundColor = 'var(--primary-color)';
        userButton.style.color = 'white';
      };

      // Log on successful image load
      img.onload = function () {};

      userButton.appendChild(img);
    } else {
      // Display initials if no image available
      const initials = getInitials(userProfile.name || userProfile.display_name || 'User');
      userButton.textContent = initials;
      userButton.style.fontSize = '12px';
      userButton.style.backgroundColor = 'var(--primary-color)';
      userButton.style.color = 'white';
    }

    // Update tooltip for logged in user
    userButton.title = 'View User Information';
  } else {
    // Default icon if not logged in
    userButton.textContent = '👤';
    userButton.style.fontSize = '16px';
    userButton.style.backgroundColor = 'transparent';
    userButton.style.color = 'var(--text-color)';
    userButton.style.border = 'none';

    // Change tooltip to login prompt message
    userButton.title = 'Click to login';

    // Change login button style - add border to make it more noticeable
    userButton.style.border = '2px dashed var(--accent-color)';
    userButton.style.boxShadow = '0 0 5px rgba(var(--accent-color-rgb), 0.5)';
  }
}

/**
 * Update profile display
 */
export function updateProfileDisplay() {
  // Initialize profile image
  profileAvatar.innerHTML = '';

  // Authentication status check - consider logged in only if user profile exists and is_authenticated is true
  const isAuthenticated = userProfile && userProfile.is_authenticated !== false;

  if (isAuthenticated) {
    // When user profile exists and is authenticated
    if (userProfile.profile_image || userProfile.avatar || userProfile.image) {
      const img = document.createElement('img');
      const imageUrl = userProfile.profile_image || userProfile.avatar || userProfile.image;
      img.src = imageUrl;
      img.alt = 'Profile image';

      // Handle image load error
      img.onerror = function () {
        // Replace with initials if image load fails
        profileAvatar.innerHTML = getInitials(userProfile.name || userProfile.display_name || 'User');
      };

      // Apply effect when image load completes
      img.onload = function () {
        img.style.opacity = 1;
      };

      img.style.opacity = 0;
      img.style.transition = 'opacity 0.3s ease';
      profileAvatar.appendChild(img);
    } else {
      // Use initials if no image available
      const initials = getInitials(userProfile.name || userProfile.display_name || 'User');
      profileAvatar.innerHTML = initials;
    }

    // Set name and email
    profileName.textContent = userProfile.name || userProfile.display_name || 'User';
    profileEmail.textContent = userProfile.email || '';

    // Show logout button when logged in
    if (logoutButton) {
      logoutButton.textContent = 'Sign Out';
    }
  } else {
    // When no user profile (logged out state)
    profileAvatar.innerHTML = '👤';
    profileName.textContent = 'Guest User';
    profileEmail.textContent = 'Not logged in';

    // Show login button when not logged in
    if (logoutButton) {
      logoutButton.textContent = 'Sign In';
    }
  }

  // Initialize subscription information
  subscriptionStatus.className = 'subscription-value subscription-status-inactive';
  subscriptionPlan.className = 'subscription-value';

  // Initialize button initial state
  if (subscribeButton) {
    subscribeButton.style.display = 'none';
  }

  if (dashboardButton) {
    dashboardButton.style.display = 'none';
  }

  if (userSubscription) {
    // When subscription information exists
    const isActive = userSubscription.active || userSubscription.is_subscribed || false;
    subscriptionStatus.textContent = isActive ? 'Active' : 'Inactive';
    subscriptionStatus.className = 'subscription-value ' + (isActive ? 'subscription-status-active' : 'subscription-status-inactive');

    // Subscription plan
    const planName = (userSubscription.plan || 'free').toUpperCase();
    subscriptionPlan.textContent = planName;
    if (planName === 'PREMIUM' || planName === 'VIP') {
      subscriptionPlan.classList.add('subscription-plan-premium');
    }

    // Expiry date
    const expiryDate = userSubscription.expiresAt || userSubscription.subscribed_until;
    subscriptionExpiry.textContent = expiryDate ? new Date(expiryDate).toLocaleDateString() : 'None';

    // Page group information
    const pageGroups = userSubscription.features?.page_groups || '1';
    subscriptionPages.textContent = pageGroups;

    // Show subscribe button - when not subscribed (including anonymous users)
    if (!isActive && subscribeButton) {
      subscribeButton.style.display = 'block';
    }

    // Show dashboard button - only for subscribed users
    if (isActive && dashboardButton) {
      dashboardButton.style.display = 'block';
    }
  } else {
    // When no subscription information (logged out state)
    subscriptionStatus.textContent = 'Inactive';
    subscriptionPlan.textContent = 'FREE';
    subscriptionExpiry.textContent = 'None';
    subscriptionPages.textContent = '1';
  }
}

/**
 * Hide profile modal
 */
export function hideProfileModal() {
  profileModal.classList.remove('show');
  window.toast.setModalOpen(false);
}

/**
 * Handle logout process
 */
export async function handleLogout() {
  // Check authentication status - consider logged in only if user profile exists and is_authenticated is true
  const isAuthenticated = userProfile && userProfile.is_authenticated !== false;

  // Start login process if not logged in
  if (!isAuthenticated) {
    // Start login process when not logged in
    hideProfileModal();
    setTimeout(() => {
      initiateSignIn();
    }, 300);
    return;
  }

  try {
    showStatus('Logging out...', 'info');
    const result = await window.toast.logout();

    if (result) {
      // Reset user profile and subscription information
      userProfile = null;
      userSubscription = null;
      isSubscribed = false;

      // Update user button UI to reflect logged out state
      updateUserButton();

      // Get current settings (for backup)
      const currentAppearance = (await window.toast.getConfig('appearance')) || {};

      // Attempt to reset all settings
      try {
        // Call logout (function provided in auth.js)
        await window.toast.invoke('logout');
      } catch (resetError) {
        console.error('Error resetting settings:', resetError);

        // Alternative method: manually reset settings
        await window.toast.saveConfig({
          subscription: {
            isAuthenticated: false,
            isSubscribed: false,
            plan: 'free',
            expiresAt: '',
            pageGroups: 1,
            isVip: false,
            additionalFeatures: {
              advancedActions: false,
              cloudSync: false,
            },
          },
        });
      }

      // Save appearance settings again to preserve them
      if (currentAppearance && Object.keys(currentAppearance).length > 0) {
        await window.toast.saveConfig({ appearance: currentAppearance });
      }

      showStatus('Logged out successfully.', 'success');
      hideProfileModal();
    } else {
      showStatus('Logout failed', 'error');
    }
  } catch (error) {
    console.error('Logout error:', error);
    showStatus(`Logout error: ${error.message || 'Unknown error'}`, 'error');
  }
}

/**
 * Reset app settings to default values
 * @param {Object} options - Reset options
 * @param {boolean} options.keepAppearance - Whether to keep appearance settings
 * @returns {Promise<Object>} Result object
 */
export async function resetToDefaults(options = { keepAppearance: true }) {
  try {
    showStatus('Resetting settings...', 'info');

    // Call resetToDefaults function (exposed from preload)
    const result = await window.toast.resetToDefaults(options);

    if (result.success) {
      showStatus('Settings have been reset to defaults.', 'success');
      return { success: true };
    } else {
      showStatus(`Failed to reset settings: ${result.error}`, 'error');
      return { success: false, error: result.error };
    }
  } catch (error) {
    console.error('Error resetting settings:', error);
    showStatus(`Error resetting settings: ${error.message || 'Unknown error'}`, 'error');
    return { success: false, error: error.message };
  }
}

/**
 * Handle page limit for unauthenticated users after logout
 */
export async function handlePageLimitAfterLogout() {
  // Import pages module dynamically to avoid circular dependency
  const { pages, renderPagingButtons } = await import('./pages.js');
  const { showCurrentPageButtons } = await import('./buttons.js');

  // Limit number of pages (unauthenticated users are limited to 1 page)
  if (pages.length > 1) {
    // Keep only the first page and delete the rest
    pages.splice(1); // Remove all pages except the first one

    // Update UI
    renderPagingButtons();
    showCurrentPageButtons();

    // Save configuration
    await window.toast.saveConfig({ pages });

    showStatus('Unauthenticated users can only use 1 page. Only the first page has been kept.', 'info');
  }
}

/**
 * Setup authentication event handlers
 */
export function setupAuthEventHandlers() {
  // Subscribe button click event
  if (subscribeButton) {
    subscribeButton.addEventListener('click', () => {
      // Open subscription page in browser using defined constant
      window.toast.executeAction({
        action: 'open',
        url: SUBSCRIPTION_URL,
      });

      // Hide profile modal
      hideProfileModal();
    });
  }

  // Dashboard button click event
  if (dashboardButton) {
    dashboardButton.addEventListener('click', () => {
      // Open dashboard page in browser using defined constant
      window.toast.executeAction({
        action: 'open',
        url: DASHBOARD_URL,
      });

      // Hide profile modal
      hideProfileModal();
    });
  }

  // Set up authentication related event listeners
  if (window.toast.onLoginSuccess) {
    window.toast.onLoginSuccess(data => {
      isSubscribed = data.isSubscribed;

      // Update user information
      fetchUserProfileAndSubscription()
        .then(() => {
          showStatus('Login successful', 'success');
        })
        .catch(error => {
          console.error('Error updating user information after login:', error);
        });
    });
  }

  if (window.toast.onLoginError) {
    window.toast.onLoginError(data => {
      console.error('Login error:', data);
      showStatus(`Login failed: ${data.message || data.error || 'Unknown error'}`, 'error');
    });
  }

  if (window.toast.onLogoutSuccess) {
    window.toast.onLogoutSuccess(() => {
      // Update UI on successful logout
      userProfile = null;
      userSubscription = null;
      isSubscribed = false;

      // Update user button UI
      updateUserButton();

      showStatus('Logged out successfully', 'success');
    });
  }

  if (window.toast.onAuthStateChanged) {
    window.toast.onAuthStateChanged(data => {
      // Handle based on authentication state change type
      if (data.type === 'auth-reload') {
        // Load user data and update UI when authentication info is refreshed
        fetchUserProfileAndSubscription()
          .then(() => {
            showStatus(data.message || 'Authentication refreshed', 'success');
          })
          .catch(error => {
            console.error('Error updating user information after auth reload:', error);
          });
      }
    });
  }

  if (window.toast.onAuthReloadSuccess) {
    window.toast.onAuthReloadSuccess(data => {
      // Update subscription information
      if (data.subscription) {
        userSubscription = data.subscription;
        isSubscribed = data.subscription.active || data.subscription.is_subscribed || false;

        // Update user button UI
        updateUserButton();
      }

      showStatus(data.message || 'Authentication refreshed', 'success');
    });
  }
}
