/**
 * Toast - Icon Utility Functions
 */

/**
 * Extract application name from file path
 * @param {string} applicationPath - Application file path
 * @returns {string} Application name
 */
export function extractApplicationName(applicationPath) {
  if (!applicationPath) return '';

  // macOS: /Applications/Visual Studio Code.app -> Visual Studio Code
  if (applicationPath.endsWith('.app')) {
    const appName = applicationPath.split('/').pop().replace('.app', '');
    return appName;
  }

  // Windows: C:\Program Files\Google\Chrome\Application\chrome.exe -> chrome
  if (applicationPath.endsWith('.exe')) {
    const exeName = applicationPath.split('\\').pop().replace('.exe', '');
    return exeName;
  }

  // Linux or other: /usr/bin/firefox -> firefox
  const fileName = applicationPath.split('/').pop();
  return fileName;
}

/**
 * Extract application name from exec command
 * @param {string} command - Exec command
 * @returns {string} Application name
 */
export function extractApplicationNameFromCommand(command) {
  if (!command) return '';

  // Handle "open -a AppName" pattern
  const openAppMatch = command.match(/open\s+-a\s+(["']?)([^"'\s]+)\1/);
  if (openAppMatch) {
    return openAppMatch[2];
  }

  // Handle direct application execution
  // Extract first word that looks like an application name
  const words = command.trim().split(/\s+/);
  const firstWord = words[0];

  // Check if it's a path to an application
  if (firstWord.includes('/') || firstWord.includes('\\')) {
    return extractApplicationName(firstWord);
  }

  // Return the command name itself
  return firstWord;
}

/**
 * Get Toast icon URL for application
 * @param {string} applicationName - Application name
 * @returns {Promise<string>} Toast icon URL
 */
export async function getToastIconUrl(applicationName) {
  if (!applicationName) return '';

  // Get TOAST_URL from environment or use default
  let toastUrl = 'https://toastapp.io';
  try {
    if (window.toast?.getEnv) {
      toastUrl = await window.toast.getEnv('TOAST_URL') || 'https://toastapp.io';
    }
  } catch (error) {
    // Silently fall back to default URL
  }

  // Encode application name for URL
  const encodedName = encodeURIComponent(applicationName);

  return `${toastUrl}/api/icons/${encodedName}`;
}

/**
 * Fetch application icon from Toast API
 * @param {string} applicationPath - Application file path
 * @returns {Promise<string>} Icon URL or empty string if failed
 */
export async function fetchApplicationIcon(applicationPath) {
  try {
    const applicationName = extractApplicationName(applicationPath);
    if (!applicationName) return '';

    const iconUrl = await getToastIconUrl(applicationName);

    // Test if the icon URL is accessible
    const response = await fetch(iconUrl, {
      method: 'HEAD',
      redirect: 'follow'
    });

    if (response.ok) {
      // Return the final URL after redirects
      return response.url;
    } else {
      // Try with GET method as fallback
      try {
        const getResponse = await fetch(iconUrl, { redirect: 'follow' });
        if (getResponse.ok) {
          return getResponse.url;
        }
      } catch (getError) {
        // Silently fail
      }
      return '';
    }
  } catch (error) {
    return '';
  }
}

/**
 * Fetch application icon from Toast API using command
 * @param {string} command - Exec command
 * @returns {Promise<string>} Icon URL or empty string if failed
 */
export async function fetchApplicationIconFromCommand(command) {
  try {
    const applicationName = extractApplicationNameFromCommand(command);
    if (!applicationName) return '';

    const iconUrl = await getToastIconUrl(applicationName);

    // Test if the icon URL is accessible
    const response = await fetch(iconUrl, {
      method: 'HEAD',
      redirect: 'follow'
    });

    if (response.ok) {
      // Return the final URL after redirects
      return response.url;
    } else {
      // Try with GET method as fallback
      try {
        const getResponse = await fetch(iconUrl, { redirect: 'follow' });
        if (getResponse.ok) {
          return getResponse.url;
        }
      } catch (getError) {
        // Silently fail
      }
      return '';
    }
  } catch (error) {
    return '';
  }
}

/**
 * Update button icon with Toast API icon
 * @param {string} applicationPath - Application file path
 * @param {HTMLElement} iconInput - Icon input element
 * @returns {Promise<boolean>} Success status
 */
export async function updateButtonIconFromApplication(applicationPath, iconInput) {
  try {
    const iconUrl = await fetchApplicationIcon(applicationPath);

    if (iconUrl) {
      iconInput.value = iconUrl;
      return true;
    } else {
      // Keep existing icon or use default
      return false;
    }
  } catch (error) {
    return false;
  }
}

/**
 * Update button icon with Toast API icon from command
 * @param {string} command - Exec command
 * @param {HTMLElement} iconInput - Icon input element
 * @returns {Promise<boolean>} Success status
 */
export async function updateButtonIconFromCommand(command, iconInput) {
  try {
    const iconUrl = await fetchApplicationIconFromCommand(command);

    if (iconUrl) {
      iconInput.value = iconUrl;
      return true;
    } else {
      // Keep existing icon or use default
      return false;
    }
  } catch (error) {
    return false;
  }
}
