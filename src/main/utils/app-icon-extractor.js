/**
 * Toast - App Icon Extractor
 *
 * macOS 애플리케이션의 .icns 파일에서 PNG 아이콘을 추출하여
 * Toast 앱에서 사용하는 로컬 아이콘 추출 유틸리티
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync, execFileSync } = require('child_process');
const { createLogger } = require('../logger');

// 모듈별 로거 생성
const logger = createLogger('AppIconExtractor');

/**
 * macOS 애플리케이션에서 아이콘을 추출하여 PNG로 변환
 * @param {string} appName - 애플리케이션 이름
 * @param {string} outputDir - 출력 디렉토리 경로
 * @param {boolean} forceRefresh - 기존 캐시를 무시하고 강제로 다시 추출
 * @returns {Promise<string|null>} - 추출된 PNG 파일 경로 또는 null
 */
async function extractAppIcon(appName, outputDir = null, forceRefresh = false) {
  if (process.platform !== 'darwin') {
    logger.warn('⚠️ App icon extraction is only supported on macOS');
    return null;
  }

  const appPath = `/Applications/${appName}.app`;
  if (!fs.existsSync(appPath)) {
    logger.error(`❌ 앱이 존재하지 않습니다: ${appPath}`);
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
      // logger.info(`✅ 기존 아이콘 사용: ${appName}`);
      return existingIcon;
    }
    else if (existingIcon && forceRefresh) {
      logger.info(`🔄 강제 새로고침으로 기존 아이콘 삭제: ${appName}`);
      try {
        fs.unlinkSync(existingIcon);
      }
      catch (error) {
        logger.warn(`⚠️ 기존 아이콘 삭제 실패: ${error.message}`);
      }
    }

    // 먼저 Info.plist에서 아이콘 파일명 확인
    let icnsPath = null;
    try {
      const infoPlistPath = path.join(appPath, 'Contents', 'Info.plist');
      if (fs.existsSync(infoPlistPath)) {
        const plistContent = fs.readFileSync(infoPlistPath, 'utf8');
        const iconFileMatch = plistContent.match(/<key>CFBundleIconFile<\/key>\s*<string>([^<]+)<\/string>/);

        if (iconFileMatch) {
          let iconFileName = iconFileMatch[1];
          // .icns 확장자가 없으면 추가
          if (!iconFileName.endsWith('.icns')) {
            iconFileName += '.icns';
          }

          const potentialIconPath = path.join(appPath, 'Contents', 'Resources', iconFileName);
          if (fs.existsSync(potentialIconPath)) {
            icnsPath = potentialIconPath;
            logger.info(`✅ Info.plist에서 아이콘 파일 발견: ${iconFileName}`);
          }
        }
      }
    }
    catch (error) {
      logger.warn(`⚠️ Info.plist 파싱 실패: ${error.message}`);
    }

    // Info.plist에서 찾지 못했으면 일반적인 아이콘 파일들 검색
    if (!icnsPath) {
      const commonIconNames = ['app.icns', 'icon.icns', 'AppIcon.icns'];
      const resourcesPath = path.join(appPath, 'Contents', 'Resources');

      for (const iconName of commonIconNames) {
        const potentialPath = path.join(resourcesPath, iconName);
        if (fs.existsSync(potentialPath)) {
          icnsPath = potentialPath;
          logger.info(`✅ 일반적인 아이콘 파일 발견: ${iconName}`);
          break;
        }
      }
    }

    // 마지막으로 find 명령어로 검색
    if (!icnsPath) {
      try {
        const findCommand = `find "${appPath}" -name "*.icns" -type f | head -n 1`;
        icnsPath = execSync(findCommand, { encoding: 'utf8' }).trim();
        if (icnsPath) {
          logger.info(`✅ find 명령어로 아이콘 파일 발견: ${icnsPath}`);
        }
      }
      catch (error) {
        logger.warn(`⚠️ find 명령어 실행 실패: ${error.message}`);
      }
    }

    if (!icnsPath) {
      logger.error(`❌ .icns 파일을 찾을 수 없습니다: ${appPath}`);
      return null;
    }

    // icns 파일 정보 확인
    try {
      const icnsStats = fs.statSync(icnsPath);
      logger.info(`📁 발견된 icns 파일: ${icnsPath} (크기: ${icnsStats.size} bytes)`);

      // icns 파일의 내용 확인 (첫 몇 바이트)
      const buffer = fs.readFileSync(icnsPath, { start: 0, end: 8 });
      const header = buffer.toString('ascii', 0, 4);
      logger.info(`🔍 icns 파일 헤더: ${header}`);

      if (header !== 'icns') {
        logger.warn(`⚠️ 유효하지 않은 icns 파일 헤더: ${header}`);
      }
    }
    catch (error) {
      logger.warn(`⚠️ icns 파일 정보 확인 실패: ${error.message}`);
    }

    const safeAppName = appName.replace(/[^a-zA-Z0-9\-_]/g, '_');
    const outputPath = path.join(outputDir, `${safeAppName}.png`);

    // 먼저 iconutil을 사용해서 iconset으로 변환 후 가장 큰 아이콘 추출 시도
    const tempIconsetPath = path.join(outputDir, `${safeAppName}_temp.iconset`);

    try {
      // iconutil로 icns를 iconset으로 변환 (execFileSync: icnsPath/tempIconsetPath는
      // 앱 번들 내부 파일명에서 올 수 있어, 셸 문자열 보간 대신 인자 배열로 전달해
      // 경로에 셸 메타문자가 있어도 명령 인젝션으로 이어지지 않게 한다)
      logger.info(`🔄 iconutil 변환 실행: ${icnsPath} -> ${tempIconsetPath}`);
      execFileSync('iconutil', ['-c', 'iconset', icnsPath, '-o', tempIconsetPath], { stdio: 'pipe' });

      // iconset에서 가장 큰 아이콘 찾기
      if (fs.existsSync(tempIconsetPath)) {
        const iconFiles = fs
          .readdirSync(tempIconsetPath)
          .filter(file => file.endsWith('.png'))
          .sort((a, b) => {
            // 파일명에서 크기 추출하여 정렬 (큰 것부터)
            const sizeA = parseInt(a.match(/(\d+)x\d+/)?.[1] || '0');
            const sizeB = parseInt(b.match(/(\d+)x\d+/)?.[1] || '0');
            return sizeB - sizeA;
          });

        if (iconFiles.length > 0) {
          const largestIcon = path.join(tempIconsetPath, iconFiles[0]);
          logger.info(`✅ iconset에서 가장 큰 아이콘 발견: ${iconFiles[0]}`);

          // 가장 큰 아이콘을 출력 경로로 복사
          fs.copyFileSync(largestIcon, outputPath);

          // 임시 iconset 디렉토리 정리
          fs.rmSync(tempIconsetPath, { recursive: true, force: true });

          if (fs.existsSync(outputPath)) {
            logger.info(`✅ iconutil로 아이콘 추출 성공: ${appName} -> ${outputPath}`);
            return outputPath;
          }
        }
      }
    }
    catch (iconutilError) {
      logger.warn(`⚠️ iconutil 변환 실패, sips로 대체: ${iconutilError.message}`);

      // 임시 파일 정리
      if (fs.existsSync(tempIconsetPath)) {
        fs.rmSync(tempIconsetPath, { recursive: true, force: true });
      }
    }

    // iconutil이 실패하면 sips 사용
    logger.info(`🔄 sips 변환 실행: ${icnsPath} -> ${outputPath}`);

    try {
      const result = execFileSync('sips', ['-s', 'format', 'png', '-Z', '512', icnsPath, '--out', outputPath], {
        stdio: 'pipe',
        encoding: 'utf8',
      });
      logger.debug(`sips 출력: ${result}`);
    }
    catch (sipsError) {
      logger.error(`❌ sips 변환 실패: ${sipsError.message}`);
      return null;
    }

    if (fs.existsSync(outputPath)) {
      logger.info(`✅ 아이콘 추출 성공: ${appName} -> ${outputPath}`);
      return outputPath;
    }
    else {
      logger.error(`❌ 아이콘 변환 실패: ${appName}`);
      return null;
    }
  }
  catch (err) {
    logger.error(`❌ 아이콘 추출 오류 (${appName}): ${err.message}`);
    return null;
  }
}

/**
 * 애플리케이션 경로에서 앱 이름 추출
 * @param {string} applicationPath - 애플리케이션 전체 경로
 * @returns {string|null} - 추출된 앱 이름 또는 null
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
    logger.error(`❌ 앱 이름 추출 오류: ${err.message}`);
    return null;
  }
}

/**
 * 기존에 추출된 아이콘이 있는지 확인
 * @param {string} appName - 애플리케이션 이름
 * @param {string} outputDir - 출력 디렉토리 경로
 * @returns {string|null} - 기존 아이콘 파일 경로 또는 null
 */
function getExistingIconPath(appName, outputDir) {
  try {
    const safeAppName = appName.replace(/[^a-zA-Z0-9\-_]/g, '_');
    const iconPath = path.join(outputDir, `${safeAppName}.png`);
    return fs.existsSync(iconPath) ? iconPath : null;
  }
  catch (err) {
    logger.error(`❌ 기존 아이콘 확인 오류: ${err.message}`);
    return null;
  }
}

/**
 * 아이콘 캐시 디렉토리 정리
 * @param {string} iconsDir - 아이콘 디렉토리 경로
 * @param {number} maxAge - 최대 보관 기간 (밀리초)
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
        logger.info(`🗑️ 오래된 아이콘 파일 삭제: ${filePath}`);
      }
    });
  }
  catch (err) {
    logger.error(`❌ 아이콘 캐시 정리 오류: ${err.message}`);
  }
}

/**
 * 절대 경로를 ~/... 형태로 변환
 * @param {string} absolutePath - 절대 경로
 * @returns {string} - ~/... 형태의 경로
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
 * ~/... 경로를 절대 경로로 변환
 * @param {string} tildePath - ~/... 형태의 경로
 * @returns {string} - 절대 경로
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
