/**
 * Toast - App Icon Extractor
 *
 * Local icon extraction utility that extracts PNG icons from the .icns files
 * of macOS applications for use in the Toast app
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync, execFileSync } = require('child_process');
const { createLogger } = require('../logger');

// Create logger for this module
const logger = createLogger('AppIconExtractor');

/**
 * Extract an icon from a macOS application and convert it to PNG
 * @param {string} appName - Application name
 * @param {string} outputDir - Output directory path
 * @param {boolean} forceRefresh - Ignore the existing cache and force re-extraction
 * @returns {Promise<string|null>} - Path to the extracted PNG file, or null
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

    const existingIcon = getExistingIconPath(appName, outputDir);
    if (existingIcon && !forceRefresh) {
      // logger.info(`✅ Using existing icon: ${appName}`);
      return existingIcon;
    }
    else if (existingIcon && forceRefresh) {
      logger.info(`🔄 Deleting existing icon due to forced refresh: ${appName}`);
      try {
        fs.unlinkSync(existingIcon);
      }
      catch (error) {
        logger.warn(`⚠️ Failed to delete existing icon: ${error.message}`);
      }
    }

    // First, check the icon file name in Info.plist
    let icnsPath = null;
    try {
      const infoPlistPath = path.join(appPath, 'Contents', 'Info.plist');
      if (fs.existsSync(infoPlistPath)) {
        const plistContent = fs.readFileSync(infoPlistPath, 'utf8');
        const iconFileMatch = plistContent.match(/<key>CFBundleIconFile<\/key>\s*<string>([^<]+)<\/string>/);

        if (iconFileMatch) {
          let iconFileName = iconFileMatch[1];
          // Add the .icns extension if it is missing
          if (!iconFileName.endsWith('.icns')) {
            iconFileName += '.icns';
          }

          const potentialIconPath = path.join(appPath, 'Contents', 'Resources', iconFileName);
          if (fs.existsSync(potentialIconPath)) {
            icnsPath = potentialIconPath;
            logger.info(`✅ Icon file found in Info.plist: ${iconFileName}`);
          }
        }
      }
    }
    catch (error) {
      logger.warn(`⚠️ Failed to parse Info.plist: ${error.message}`);
    }

    // If not found in Info.plist, search for common icon files
    if (!icnsPath) {
      const commonIconNames = ['app.icns', 'icon.icns', 'AppIcon.icns'];
      const resourcesPath = path.join(appPath, 'Contents', 'Resources');

      for (const iconName of commonIconNames) {
        const potentialPath = path.join(resourcesPath, iconName);
        if (fs.existsSync(potentialPath)) {
          icnsPath = potentialPath;
          logger.info(`✅ Common icon file found: ${iconName}`);
          break;
        }
      }
    }

    // As a last resort, search using the find command
    if (!icnsPath) {
      try {
        const findCommand = `find "${appPath}" -name "*.icns" -type f | head -n 1`;
        icnsPath = execSync(findCommand, { encoding: 'utf8' }).trim();
        if (icnsPath) {
          logger.info(`✅ Icon file found via find command: ${icnsPath}`);
        }
      }
      catch (error) {
        logger.warn(`⚠️ Failed to run find command: ${error.message}`);
      }
    }

    if (!icnsPath) {
      logger.error(`❌ Could not find an .icns file: ${appPath}`);
      return null;
    }

    // Check the icns file information
    try {
      const icnsStats = fs.statSync(icnsPath);
      logger.info(`📁 Found icns file: ${icnsPath} (size: ${icnsStats.size} bytes)`);

      // Check the contents of the icns file (first few bytes)
      const buffer = fs.readFileSync(icnsPath, { start: 0, end: 8 });
      const header = buffer.toString('ascii', 0, 4);
      logger.info(`🔍 icns file header: ${header}`);

      if (header !== 'icns') {
        logger.warn(`⚠️ Invalid icns file header: ${header}`);
      }
    }
    catch (error) {
      logger.warn(`⚠️ Failed to check icns file information: ${error.message}`);
    }

    const safeAppName = appName.replace(/[^a-zA-Z0-9\-_]/g, '_');
    const outputPath = path.join(outputDir, `${safeAppName}.png`);

    // First, try converting to an iconset with iconutil and extracting the largest icon
    const tempIconsetPath = path.join(outputDir, `${safeAppName}_temp.iconset`);

    try {
      // Convert icns to iconset with iconutil (execFileSync: icnsPath/tempIconsetPath may
      // come from file names inside the app bundle, so they are passed as an argument array
      // instead of shell string interpolation, so that shell metacharacters in the path
      // cannot lead to command injection)
      logger.info(`🔄 Running iconutil conversion: ${icnsPath} -> ${tempIconsetPath}`);
      execFileSync('iconutil', ['-c', 'iconset', icnsPath, '-o', tempIconsetPath], { stdio: 'pipe' });

      // Find the largest icon in the iconset
      if (fs.existsSync(tempIconsetPath)) {
        const iconFiles = fs
          .readdirSync(tempIconsetPath)
          .filter(file => file.endsWith('.png'))
          .sort((a, b) => {
            // Extract the size from the file name and sort (largest first)
            const sizeA = parseInt(a.match(/(\d+)x\d+/)?.[1] || '0');
            const sizeB = parseInt(b.match(/(\d+)x\d+/)?.[1] || '0');
            return sizeB - sizeA;
          });

        if (iconFiles.length > 0) {
          const largestIcon = path.join(tempIconsetPath, iconFiles[0]);
          logger.info(`✅ Largest icon found in iconset: ${iconFiles[0]}`);

          // Copy the largest icon to the output path
          fs.copyFileSync(largestIcon, outputPath);

          // Clean up the temporary iconset directory
          fs.rmSync(tempIconsetPath, { recursive: true, force: true });

          if (fs.existsSync(outputPath)) {
            logger.info(`✅ Icon extracted successfully with iconutil: ${appName} -> ${outputPath}`);
            return outputPath;
          }
        }
      }
    }
    catch (iconutilError) {
      logger.warn(`⚠️ iconutil conversion failed, falling back to sips: ${iconutilError.message}`);

      // Clean up temporary files
      if (fs.existsSync(tempIconsetPath)) {
        fs.rmSync(tempIconsetPath, { recursive: true, force: true });
      }
    }

    // Use sips if iconutil fails
    logger.info(`🔄 Running sips conversion: ${icnsPath} -> ${outputPath}`);

    try {
      const result = execFileSync('sips', ['-s', 'format', 'png', '-Z', '512', icnsPath, '--out', outputPath], {
        stdio: 'pipe',
        encoding: 'utf8',
      });
      logger.debug(`sips output: ${result}`);
    }
    catch (sipsError) {
      logger.error(`❌ sips conversion failed: ${sipsError.message}`);
      return null;
    }

    if (fs.existsSync(outputPath)) {
      logger.info(`✅ Icon extracted successfully: ${appName} -> ${outputPath}`);
      return outputPath;
    }
    else {
      logger.error(`❌ Icon conversion failed: ${appName}`);
      return null;
    }
  }
  catch (err) {
    logger.error(`❌ Icon extraction error (${appName}): ${err.message}`);
    return null;
  }
}

/**
 * Extract the app name from an application path
 * @param {string} applicationPath - Full application path
 * @returns {string|null} - Extracted app name, or null
 */
function extractAppNameFromPath(applicationPath) {
  if (!applicationPath) {
    return null;
  }

  try {
    if (applicationPath.endsWith('.app')) {
      return path.basename(applicationPath, '.app');
    }
    return path.parse(path.basename(applicationPath)).name;
  }
  catch (err) {
    logger.error(`❌ App name extraction error: ${err.message}`);
    return null;
  }
}

/**
 * Check whether a previously extracted icon exists
 * @param {string} appName - Application name
 * @param {string} outputDir - Output directory path
 * @returns {string|null} - Path to the existing icon file, or null
 */
function getExistingIconPath(appName, outputDir) {
  try {
    const safeAppName = appName.replace(/[^a-zA-Z0-9\-_]/g, '_');
    const iconPath = path.join(outputDir, `${safeAppName}.png`);
    return fs.existsSync(iconPath) ? iconPath : null;
  }
  catch (err) {
    logger.error(`❌ Existing icon check error: ${err.message}`);
    return null;
  }
}

/**
 * Clean up the icon cache directory
 * @param {string} iconsDir - Icon directory path
 * @param {number} maxAge - Maximum retention period (milliseconds)
 */
function cleanupOldIcons(iconsDir, maxAge = 30 * 24 * 60 * 60 * 1000) {
  try {
    if (!fs.existsSync(iconsDir)) {
      return;
    }

    const files = fs.readdirSync(iconsDir);
    const now = Date.now();

    files.forEach(file => {
      const filePath = path.join(iconsDir, file);
      const stats = fs.statSync(filePath);

      if (now - stats.mtime.getTime() > maxAge) {
        fs.unlinkSync(filePath);
        logger.info(`🗑️ Deleted old icon file: ${filePath}`);
      }
    });
  }
  catch (err) {
    logger.error(`❌ Icon cache cleanup error: ${err.message}`);
  }
}

/**
 * Convert an absolute path to ~/... form
 * @param {string} absolutePath - Absolute path
 * @returns {string} - Path in ~/... form
 */
function convertToTildePath(absolutePath) {
  if (!absolutePath) {
    return absolutePath;
  }
  
  const homeDir = os.homedir();
  if (absolutePath.startsWith(homeDir)) {
    return absolutePath.replace(homeDir, '~');
  }
  
  return absolutePath;
}

/**
 * Convert a ~/... path to an absolute path
 * @param {string} tildePath - Path in ~/... form
 * @returns {string} - Absolute path
 */
function resolveTildePath(tildePath) {
  if (!tildePath) {
    return tildePath;
  }
  
  if (tildePath.startsWith('~/')) {
    return path.join(os.homedir(), tildePath.slice(2));
  }
  
  return tildePath;
}

module.exports = {
  extractAppIcon,
  extractAppNameFromPath,
  getExistingIconPath,
  cleanupOldIcons,
  convertToTildePath,
  resolveTildePath,
};
