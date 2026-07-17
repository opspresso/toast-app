# Toast App Icon Extraction Utility

This document describes the local icon extraction feature used by the Toast app, which extracts PNG icons from the .icns files of macOS applications.

## Overview

The Toast app's icon extraction system extracts and uses application icons directly from the local system. It finds the .icns files of apps installed in the macOS Applications folder and converts them to PNG format for use in the Toast app.

For logged-in cloud sync users, the extracted PNG icon is uploaded to the server (S3), and the button's icon value is replaced from a local `file://` path with a shareable `https://` URL that works across devices (see "Cross-Device Icon Sharing" below). Users who are not logged in use only local `file://` paths.

### Key Features

- **Direct icon extraction from the local system**: extraction itself is performed locally
- **Support for all installed apps**: every .app bundle in the Applications folder
- **Cross-device sharing**: logged-in users upload extracted icons to the server so they display identically on other devices
- **Real-time preview**: check the icon immediately when configuring a button
- **Automatic detection**: automatic icon extraction from `open -a AppName` commands
- **Smart caching**: once extracted, an icon is cached and reused

## Core Features

### 1. Real-Time Icon Preview

The button settings modal provides a real-time icon preview in the same style as the Toast window buttons.

```javascript
function updateIconPreview() {
  const iconValue = editButtonIconInput.value.trim();
  const actionType = editButtonActionSelect.value;
  const previewImg = document.getElementById('icon-preview-img');
  const placeholder = iconPreview.querySelector('.icon-preview-placeholder');

  // Handle FlatColorIcons
  if (iconValue && iconValue.startsWith('FlatColorIcons.')) {
    const iconKey = iconValue.replace('FlatColorIcons.', '');
    // Look up in the icon catalog and display
  }

  // Full support for file:// URLs
  else if (iconValue && iconValue.startsWith('file://')) {
    previewImg.src = iconValue;
    previewImg.style.display = 'block';
    placeholder.style.display = 'none';
  }
}
```

### 2. Automatic Icon Extraction from Exec Actions

Automatically detects the `open -a AppName` pattern and extracts the icon of the corresponding application.

```javascript
// Supported command patterns
const patterns = [
  'open -a Mail',
  'open -a "Visual Studio Code"',
  'open -a zoom.us',
  'open -a "Final Cut Pro"'
];

// Pattern detection regex
const openAppMatch = command.match(/^open\s+-a\s+(?:"([^"]+)"|([\w\s\.\-]+))/);
if (openAppMatch) {
  const appName = (openAppMatch[1] || openAppMatch[2]).trim();
  const appPath = `/Applications/${appName}.app`;
  // Run automatic icon extraction
}
```

### 3. Enhanced Icon Reload

The 🔄 button lets you force-refresh the icon for Application and Exec actions.

```javascript
// Application action: extract the icon from the selected application
if (actionType === 'application') {
  applicationPath = editButtonApplicationInput.value.trim();
}
// Exec action: extract the app name from the open -a command
else if (actionType === 'exec') {
  const command = editButtonCommandInput.value.trim();
  const openAppMatch = command.match(/^open\s+-a\s+(?:"([^"]+)"|([\w\s\.\-]+))/);
  if (openAppMatch) {
    const appName = (openAppMatch[1] || openAppMatch[2]).trim();
    applicationPath = `/Applications/${appName}.app`;
  }
}
```

### 4. Smart Favicon Support

For Open actions, when the icon is empty, the URL's favicon is displayed automatically.

```javascript
// For an open action with an empty icon but a URL present, use the favicon
if (actionType === 'open' && (!iconValue || iconValue === '') && urlValue) {
  const faviconUrl = getFaviconFromUrl(urlValue);
  previewImg.src = faviconUrl;

  // Fall back to a default icon if the favicon fails to load
  previewImg.onerror = function() {
    placeholder.textContent = '🌐';
  };
}
```

### 5. Per-Action Default Icons

Provides a default icon appropriate for each action type.

```javascript
switch (actionType) {
  case 'exec': placeholder.textContent = '⚡'; break;
  case 'application': placeholder.textContent = '🚀'; break;
  case 'open': placeholder.textContent = '🌐'; break;
  case 'script': placeholder.textContent = '📜'; break;
  case 'chain': placeholder.textContent = '🔗'; break;
  default: placeholder.textContent = '🖼️'; break;
}
```

## System Architecture

### Main Process (`src/main/utils/app-icon-extractor.js`)

```javascript
/**
 * Extract an icon from a macOS application and convert it to PNG
 */
async function extractAppIcon(appName, outputDir = null, forceRefresh = false) {
  if (process.platform !== 'darwin') {
    logger.warn('⚠️ App icon extraction is only supported on macOS');
    return null;
  }

  const appPath = `/Applications/${appName}.app`;
  if (!fs.existsSync(appPath)) {
    logger.error(`❌ App does not exist: ${appPath}`);
    return null;
  }

  try {
    if (!outputDir) {
      const { app } = require('electron');
      outputDir = path.join(app.getPath('userData'), 'icons');
    }

    fs.mkdirSync(outputDir, { recursive: true });

    // Check cache: reuse the existing icon unless forceRefresh, otherwise delete and re-extract
    const existingIcon = getExistingIconPath(appName, outputDir);
    if (existingIcon && !forceRefresh) {
      return existingIcon;
    } else if (existingIcon && forceRefresh) {
      fs.unlinkSync(existingIcon);
    }

    // Search for the .icns file step by step
    let icnsPath = null;

    // 1) Check CFBundleIconFile in Info.plist
    const infoPlistPath = path.join(appPath, 'Contents', 'Info.plist');
    if (fs.existsSync(infoPlistPath)) {
      const plistContent = fs.readFileSync(infoPlistPath, 'utf8');
      const iconFileMatch = plistContent.match(/<key>CFBundleIconFile<\/key>\s*<string>([^<]+)<\/string>/);
      if (iconFileMatch) {
        let iconFileName = iconFileMatch[1];
        if (!iconFileName.endsWith('.icns')) iconFileName += '.icns';
        const potentialIconPath = path.join(appPath, 'Contents', 'Resources', iconFileName);
        if (fs.existsSync(potentialIconPath)) icnsPath = potentialIconPath;
      }
    }

    // 2) Check common icon file names
    if (!icnsPath) {
      const commonIconNames = ['app.icns', 'icon.icns', 'AppIcon.icns'];
      const resourcesPath = path.join(appPath, 'Contents', 'Resources');
      for (const iconName of commonIconNames) {
        const potentialPath = path.join(resourcesPath, iconName);
        if (fs.existsSync(potentialPath)) {
          icnsPath = potentialPath;
          break;
        }
      }
    }

    // 3) Search with the find command (fallback)
    if (!icnsPath) {
      const findCommand = `find "${appPath}" -name "*.icns" -type f | head -n 1`;
      icnsPath = execSync(findCommand, { encoding: 'utf8' }).trim();
    }

    if (!icnsPath) {
      logger.error(`❌ Could not find .icns file: ${appPath}`);
      return null;
    }

    const safeAppName = appName.replace(/[^a-zA-Z0-9\-_]/g, '_');
    const outputPath = path.join(outputDir, `${safeAppName}.png`);

    // Conversion 1) Convert to iconset with iconutil and pick the largest PNG
    const tempIconsetPath = path.join(outputDir, `${safeAppName}_temp.iconset`);
    try {
      execFileSync('iconutil', ['-c', 'iconset', icnsPath, '-o', tempIconsetPath], { stdio: 'pipe' });
      const iconFiles = fs
        .readdirSync(tempIconsetPath)
        .filter(file => file.endsWith('.png'))
        .sort((a, b) => {
          const sizeA = parseInt(a.match(/(\d+)x\d+/)?.[1] || '0');
          const sizeB = parseInt(b.match(/(\d+)x\d+/)?.[1] || '0');
          return sizeB - sizeA; // Largest first
        });
      if (iconFiles.length > 0) {
        fs.copyFileSync(path.join(tempIconsetPath, iconFiles[0]), outputPath);
        fs.rmSync(tempIconsetPath, { recursive: true, force: true });
        if (fs.existsSync(outputPath)) return outputPath;
      }
    } catch (iconutilError) {
      // On iconutil failure, clean up the temp directory and fall back to sips
      fs.rmSync(tempIconsetPath, { recursive: true, force: true });
    }

    // Conversion 2) sips fallback (max 512px)
    execFileSync('sips', ['-s', 'format', 'png', '-Z', '512', icnsPath, '--out', outputPath], { stdio: 'pipe' });

    return fs.existsSync(outputPath) ? outputPath : null;
  } catch (err) {
    logger.error(`❌ Icon extraction error (${appName}): ${err.message}`);
    return null;
  }
}
```

### IPC Communication (`src/main/ipc/system.js`)

```javascript
// Icon extraction IPC handler
ipcMain.handle('extract-app-icon', async (event, applicationPath, forceRefresh = false) => {
  try {
    const appName = extractAppNameFromPath(applicationPath);
    if (!appName) {
      return { success: false, error: 'Could not extract the app name' };
    }

    const iconPath = await extractAppIcon(appName, null, forceRefresh);
    if (!iconPath) {
      return { success: false, error: 'Could not extract the icon' };
    }

    const tildePath = convertToTildePath(iconPath);

    // If authenticated, upload to the server to obtain a shareable remoteUrl (local operation is preserved even on failure)
    let remoteUrl = null;
    if (await authManager.hasValidToken()) {
      const uploadResult = await apiIcons.uploadIcon({ filePath: iconPath, onUnauthorized: authManager.refreshAccessToken });
      if (uploadResult.success) remoteUrl = uploadResult.url;
    }

    return {
      success: true,
      iconUrl: `file://${iconPath}`,
      iconPath: tildePath, // Path converted to ~ format
      appName,
      ...(remoteUrl ? { remoteUrl } : {})
    };
  } catch (err) {
    return {
      success: false,
      error: `Error during icon extraction: ${err.message}`
    };
  }
});
```

### Renderer Process (`src/renderer/pages/toast/modules/local-icon-utils.js`)

```javascript
/**
 * Core feature: extract the icon and name from an application and update the UI
 */
async function updateButtonIconFromLocalApp(applicationPath, iconInput, nameInput = null, forceRefresh = false) {
  if (!applicationPath || !iconInput) return false;

  try {
    const result = await window.toast.extractAppIcon(applicationPath, forceRefresh);

    if (result.success) {
      // 1. Update the icon input field
      //    If the server upload succeeded, prefer the shareable https URL (remoteUrl),
      //    otherwise use the local path-based file:// URL
      iconInput.value = result.remoteUrl || `file://${result.iconPath}`;

      // 2. Update the button name (only if empty)
      if (nameInput && !nameInput.value.trim()) {
        nameInput.value = result.appName;
      }

      // 3. Trigger the input event (to update the preview)
      iconInput.dispatchEvent(new Event('input', { bubbles: true }));

      return true;
    }
    return false;
  } catch (err) {
    console.error('Icon extraction error:', err);
    return false;
  }
}

/**
 * Check whether local icon extraction is supported
 */
function isLocalIconExtractionSupported() {
  return window.toast.platform === 'darwin' && typeof window.toast.extractAppIcon === 'function';
}
```

## User Workflows

### Application Action

1. **Select an application**: choose an application with the Browse button
2. **Automatic icon extraction**: the icon is extracted automatically and shown in the preview upon selection
3. **Force refresh**: re-extract the icon anytime with the 🔄 button

### Exec Action

1. **Enter a command**: enter a command like `open -a Mail`
2. **Automatic detection**: automatically detect the command pattern and extract the Mail.app icon
3. **Real-time update**: the preview updates immediately when the command changes
4. **Force refresh**: re-extract the icon with the 🔄 button

### Open Action

1. **Enter a URL**: enter a website URL (e.g., https://github.com)
2. **Automatic favicon display**: leave the icon field empty to display the favicon automatically
3. **Real-time preview**: the favicon updates immediately when the URL changes

## System Requirements

### macOS Support
- **Required**: macOS 10.12 (Sierra) or later
- **Required**: the `iconutil` command (included with the system, primary conversion)
- **Required**: the `sips` command (included with the system, fallback conversion)
- **Required**: the `find` command (included with the system)
- **Recommended**: apps installed in the Applications folder

### Supported Formats
- **Input**: `.icns` (Apple Icon Image format)
- **Output**: `.png` (Portable Network Graphics)
- **Applications**: `.app` bundles (macOS standard)

## Performance and Optimization

### Caching Strategy

```javascript
// Smart caching: reuse a once-extracted icon
function getExistingIconPath(appName, outputDir) {
  try {
    const safeAppName = appName.replace(/[^a-zA-Z0-9\-_]/g, '_');
    const iconPath = path.join(outputDir, `${safeAppName}.png`);
    return fs.existsSync(iconPath) ? iconPath : null;
  } catch (err) {
    console.error(`❌ Error checking existing icon: ${err.message}`);
    return null;
  }
}

// Function to clean up old icons (30-day threshold) - only defined and currently not called anywhere
function cleanupOldIcons(iconsDir, maxAge = 30 * 24 * 60 * 60 * 1000) {
  try {
    if (!fs.existsSync(iconsDir)) return;

    const files = fs.readdirSync(iconsDir);
    const now = Date.now();

    files.forEach(file => {
      const filePath = path.join(iconsDir, file);
      const stats = fs.statSync(filePath);

      if (now - stats.mtime.getTime() > maxAge) {
        fs.unlinkSync(filePath);
        console.log(`🗑️ Deleted old icon file: ${filePath}`);
      }
    });
  } catch (err) {
    console.error(`❌ Error cleaning up icon cache: ${err.message}`);
  }
}
```

> **Note**: The `cleanupOldIcons` function is defined but is currently not called anywhere, so automatic cleanup of old icon caches is not performed.

### Asynchronous Processing

- **Prevent UI blocking**: all icon extraction is handled asynchronously
- **Background work**: processed without affecting the user interface
- **Progress indication**: the 🔄 → ⏳ → 🔄 button state changes indicate progress

## Error Handling and Security

### Error Handling

```javascript
// 1. Unsupported platform
if (process.platform !== 'darwin') {
  console.warn('⚠️ App icon extraction is only supported on macOS');
  return null;
}

// 2. Application not found
if (!fs.existsSync(appPath)) {
  console.error(`❌ App does not exist: ${appPath}`);
  return null;
}

// 3. Icon file not found
if (!icnsPath) {
  console.error(`❌ Could not find .icns file: ${appPath}`);
  return null;
}

// 4. Conversion failure
try {
  execSync(convertCommand, { stdio: 'pipe' });
} catch (err) {
  console.error(`❌ Icon conversion failed: ${err.message}`);
  return null;
}
```

### Security Considerations

- **Path validation**: validate the application path
- **Safe file names**: remove special characters and generate safe file names
- **Command injection prevention**: escape user input
- **Least privilege**: run with minimal privileges

## Testing and Verification

### Unit Tests

```javascript
describe('App Icon Extractor', () => {
  test('should extract app name from path', () => {
    const appName = extractAppNameFromPath('/Applications/Visual Studio Code.app');
    expect(appName).toBe('Visual Studio Code');
  });

  test('should extract icon for existing app', async () => {
    const iconPath = await extractAppIcon('Finder');
    expect(iconPath).toBeTruthy();
    expect(iconPath).toMatch(/\.png$/);
  });

  test('should handle non-existent app', async () => {
    const iconPath = await extractAppIcon('NonExistentApp');
    expect(iconPath).toBeNull();
  });
});
```

### Integration Tests

```javascript
const testApps = ['Finder', 'Safari', 'System Preferences', 'Terminal'];

for (const appName of testApps) {
  const iconPath = await extractAppIcon(appName);
  console.log(`${appName}: ${iconPath ? '✅' : '❌'}`);
}
```

## Troubleshooting

### Common Problems

1. **Icon is not extracted**
   - Verify that the app is installed in the Applications folder
   - Verify the correct capitalization of the app name
   - Verify whether an .icns file exists inside the app

2. **sips command error**
   - Verify the macOS system
   - Install Xcode Command Line Tools
   - Check the system PATH environment variable

3. **Permission errors**
   - Check read permissions for the Applications folder
   - Check write permissions for the temporary directory

4. **Increased memory usage**
   - Limit the icon cache size
   - Check that temporary files are cleaned up

## Cross-Device Icon Sharing (Cloud Upload)

Logged-in cloud sync users can upload locally extracted icons to the server (S3) so they see the same button icons on any device. Users who are not logged in use only local `file://` paths and skip this step.

Behavior:

1. **Upload on extraction**: after extracting an icon, the `extract-app-icon` IPC handler (`src/main/ipc/system.js`) uploads it to the server via `apiIcons.uploadIcon` if authenticated, and on success includes a `remoteUrl` (https URL) in the response. The renderer (`local-icon-utils.js`) uses `remoteUrl` as the button icon value if present, otherwise the existing `file://` path.
2. **Upload API**: `uploadIcon` in `src/main/api/icons.js` performs a multipart upload to the `USER_ICONS` (`/users/icons`) endpoint. It handles token refresh on 401, a within-session duplicate upload cache, and a 6-hour backoff when the server does not support it (404/405/503).
3. **Migrating existing icons**: just before the cloud sync upload, `normalizeLocalIcons` in `src/main/utils/icon-normalizer.js` performs a one-time upload of the remaining `file://` icons on a page and replaces them with `https://` URLs (inside `uploadSettings` in `src/main/cloud-sync.js`). Icons whose files do not exist on this device are left untouched.

> Server icon URLs are hard to guess since they are based on a user hash plus a content hash, but they allow unauthenticated access, so they are intended only for non-sensitive images such as app icons.

## Related Files

- `src/main/utils/app-icon-extractor.js` - core icon extraction utility
- `src/main/api/icons.js` - icon server upload API (`uploadIcon`)
- `src/main/utils/icon-normalizer.js` - one-time `file://` → `https://` migration
- `src/renderer/pages/toast/modules/local-icon-utils.js` - renderer process utility (prefers remoteUrl)
- `src/main/ipc/system.js` - IPC handler (extract-app-icon, uploads when authenticated)
- `src/main/cloud-sync.js` - calls icon normalization before upload
- `src/renderer/preload/toast.js` - preload script extensions
- `src/renderer/pages/toast/modules/modals-button-edit.js` - button edit modal (icon preview)
- `src/renderer/pages/toast/modules/modals-icon-browser.js` - icon browser modal
- `src/renderer/pages/toast/styles.css` - icon preview styles

## Future Improvements

### Multi-Platform Support
- **Windows**: support for .exe and .ico files
- **Linux**: support for .desktop and .svg files

### Advanced Features
- **Multiple resolutions**: support for 16x16, 32x32, 64x64, 128x128
- **Retina displays**: support for high-resolution displays
- **Batch processing**: extract multiple app icons simultaneously
- **Progress indicator**: show progress during bulk processing

### Performance Optimization
- **Disk-based cache**: a persistent cache system
- **LRU cache**: a memory-efficient cache policy
- **Background preloading**: preload frequently used app icons
