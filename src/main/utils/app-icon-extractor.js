/** Extract app icons without blocking the main process or interpreting file names as shell code. */
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { execFile } = require('child_process');
const { app } = require('electron');
const { createLogger } = require('../logger');
const { expandTilde } = require('./expand-tilde');

const logger = createLogger('AppIconExtractor');
const pending = new Map();
const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

function runTool(tool, args) {
  return new Promise((resolve, reject) => {
    execFile(`/usr/bin/${tool}`, args, { encoding: 'utf8', timeout: 15000, maxBuffer: 2_000_000, shell: false }, (error, stdout) => {
      if (error) {
        reject(error);
      }
      else {
        resolve(stdout);
      }
    });
  });
}

async function resolveApplication(reference) {
  if (typeof reference !== 'string' || !reference.trim()) {
    throw new Error('An application name or absolute .app path is required');
  }
  const expanded = expandTilde(reference);
  const candidates = path.isAbsolute(expanded) ? [expanded] : !/[\\/]/.test(reference)
    ? ['/Applications', path.join(os.homedir(), 'Applications'), '/System/Applications', '/System/Applications/Utilities', '/System/Library/CoreServices']
      .map(directory => path.join(directory, `${reference.replace(/\.app$/i, '')}.app`))
    : [];
  for (const candidate of candidates) {
    try {
      const resolved = await fs.promises.realpath(candidate);
      if (resolved.toLowerCase().endsWith('.app') && (await fs.promises.stat(resolved)).isDirectory()) {
        return resolved;
      }
    }
    catch (error) {
      if (!['ENOENT', 'ENOTDIR'].includes(error.code)) {
        throw error;
      }
    }
  }
  throw new Error('Application bundle not found');
}

async function bundleFile(bundle, relativePath) {
  const file = await fs.promises.realpath(path.resolve(bundle, relativePath));
  const relative = path.relative(bundle, file);
  if (!relative || relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative) || !(await fs.promises.stat(file)).isFile()) {
    throw new Error('Application icon resources must remain inside the selected bundle');
  }
  return file;
}

async function readHeader(file, length) {
  const handle = await fs.promises.open(file, 'r');
  try {
    const buffer = Buffer.alloc(length);
    const { bytesRead } = await handle.read(buffer, 0, length, 0);
    return buffer.subarray(0, bytesRead);
  }
  finally {
    await handle.close();
  }
}

async function extractBundle(bundle, outputDir, forceRefresh) {
  const infoPath = await bundleFile(bundle, 'Contents/Info.plist');
  const [bundleStats, infoStats] = await Promise.all([fs.promises.stat(bundle), fs.promises.stat(infoPath)]);
  const name = extractAppNameFromPath(bundle).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 80);
  const identity = crypto.createHash('sha256').update(convertToTildePath(bundle)).digest('hex').slice(0, 16);
  const outputPath = path.join(outputDir, `${name}-${identity}.png`);
  if (!forceRefresh) {
    try {
      const cached = await fs.promises.stat(outputPath);
      if (cached.isFile() && cached.size > 8 && cached.size <= 2_000_000 && cached.mtimeMs >= Math.max(bundleStats.mtimeMs, infoStats.mtimeMs)) {
        return { path: outputPath, cached: true };
      }
    }
    catch (error) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }
  }

  await fs.promises.mkdir(outputDir, { recursive: true, mode: 0o700 });
  const temporary = await fs.promises.mkdtemp(path.join(outputDir, '.extract-'));
  try {
    const metadata = JSON.parse(await runTool('plutil', ['-convert', 'json', '-o', '-', infoPath]));
    const converted = path.join(temporary, 'icon.png');
    const iconName = metadata.CFBundleIconFile;
    if (typeof iconName === 'string' && iconName) {
      if (path.isAbsolute(iconName)) {
        throw new Error('The declared icon path must be relative to the application bundle');
      }
      const icnsPath = await bundleFile(bundle, path.join('Contents', 'Resources', iconName.toLowerCase().endsWith('.icns') ? iconName : `${iconName}.icns`));
      if (!(await readHeader(icnsPath, 4)).equals(Buffer.from('icns'))) {
        throw new Error('The declared application icon is not an ICNS file');
      }
      const iconset = path.join(temporary, 'icons.iconset');
      let source;
      try {
        await runTool('iconutil', ['-c', 'iconset', icnsPath, '-o', iconset]);
      }
      catch (error) {
        // ImageIO supports ICNS variants that iconutil cannot expand. Its actual
        // PNG output is checked below; failed conversion never replaces a cache.
        logger.debug('Decoding the ICNS file with ImageIO:', error.code || error.name);
        await runTool('sips', ['-s', 'format', 'png', icnsPath, '--out', converted]);
        source = converted;
      }
      if (!source) {
        const variants = (await fs.promises.readdir(iconset)).filter(file => file.endsWith('.png'));
        variants.sort((a, b) => {
          const pixels = name => Number(name.match(/(\d+)x\d+/)?.[1] || 0) * (name.includes('@2x') ? 2 : 1);
          return pixels(b) - pixels(a);
        });
        if (!variants.length) {
          throw new Error('The application icon has no PNG representation');
        }
        await fs.promises.copyFile(path.join(iconset, variants[0]), converted);
      }
    }
    else {
      // Bundles with asset-catalog icons can omit CFBundleIconFile. Ask the OS
      // for the associated icon instead of guessing from unrelated bundle files.
      // Electron's 'large' icon size is unsupported on macOS.
      const image = await app.getFileIcon(bundle, { size: 'normal' });
      if (image.isEmpty()) {
        throw new Error('The application has no icon representation');
      }
      await fs.promises.writeFile(converted, image.toPNG({ scaleFactor: Math.max(1, ...image.getScaleFactors()) }), { mode: 0o600 });
    }

    const header = await readHeader(converted, 24);
    if (header.length < 24 || !header.subarray(0, 8).equals(PNG_SIGNATURE)) {
      throw new Error('Icon conversion did not produce a PNG');
    }
    let finalPath = converted;
    if (Math.max(header.readUInt32BE(16), header.readUInt32BE(20)) > 512) {
      finalPath = path.join(temporary, 'bounded.png');
      await runTool('sips', ['-Z', '512', converted, '--out', finalPath]);
    }
    const finalHeader = await readHeader(finalPath, 24);
    if (finalHeader.length < 24 || !finalHeader.subarray(0, 8).equals(PNG_SIGNATURE) ||
        finalHeader.readUInt32BE(16) < 1 || finalHeader.readUInt32BE(20) < 1 ||
        Math.max(finalHeader.readUInt32BE(16), finalHeader.readUInt32BE(20)) > 512) {
      throw new Error('Icon conversion did not produce a bounded PNG');
    }
    const size = (await fs.promises.stat(finalPath)).size;
    if (size <= 8 || size > 2_000_000) {
      throw new Error('Converted icon exceeds the upload size limit');
    }
    await fs.promises.chmod(finalPath, 0o600);
    // Atomic replacement preserves the previous icon if decoding or resizing fails.
    await fs.promises.rename(finalPath, outputPath);
    return { path: outputPath, cached: false };
  }
  finally {
    await fs.promises.rm(temporary, { recursive: true, force: true });
  }
}

async function extractAppIcon(reference, outputDir = null, forceRefresh = false) {
  if (process.platform !== 'darwin') {
    return null;
  }
  let key;
  let request;
  try {
    const bundle = await resolveApplication(reference);
    const directory = path.resolve(outputDir || path.join(app.getPath('userData'), 'icons'));
    key = `${bundle}:${directory}`;
    if (pending.has(key)) {
      const existing = pending.get(key);
      const result = await existing;
      if (forceRefresh && result.cached) {
        if (pending.get(key) === existing) {
          pending.delete(key);
        }
        return await extractAppIcon(reference, outputDir, true);
      }
      return result.path;
    }
    request = extractBundle(bundle, directory, forceRefresh);
    pending.set(key, request);
    return (await request).path;
  }
  catch (error) {
    logger.warn('Application icon extraction failed:', error.code || error.name);
    return null;
  }
  finally {
    if (request && pending.get(key) === request) {
      pending.delete(key);
    }
  }
}

function extractAppNameFromPath(applicationPath) {
  if (typeof applicationPath !== 'string' || !applicationPath) {
    return null;
  }
  if (!/[\\/]/.test(applicationPath) && !/\.(app|exe)$/i.test(applicationPath)) {
    return applicationPath;
  }
  return applicationPath.toLowerCase().endsWith('.app') ? path.basename(applicationPath).slice(0, -4) : path.parse(path.basename(applicationPath)).name;
}

function convertToTildePath(absolutePath) {
  if (typeof absolutePath !== 'string') {
    return absolutePath;
  }
  const home = os.homedir();
  return absolutePath === home ? '~' : absolutePath.startsWith(`${home}${path.sep}`) ? `~${absolutePath.slice(home.length)}` : absolutePath;
}

function resolveTildePath(tildePath) {
  return typeof tildePath === 'string' ? expandTilde(tildePath) : tildePath;
}

module.exports = { extractAppIcon, extractAppNameFromPath, convertToTildePath, resolveTildePath };
