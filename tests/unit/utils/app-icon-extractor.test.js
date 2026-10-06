const fs = require('fs');
const path = require('path');
const os = require('os');
const mockExecFile = jest.fn();
let mockDirectory;
const mockGetFileIcon = jest.fn();
jest.mock('child_process', () => ({ execFile: (...args) => mockExecFile(...args) }));
jest.mock('electron', () => ({ app: { getPath: () => mockDirectory, getFileIcon: (...args) => mockGetFileIcon(...args) } }));
jest.mock('../../../src/main/logger', () => ({ createLogger: () => ({ warn() {}, debug() {} }) }));
const extractor = require('../../../src/main/utils/app-icon-extractor');
const largePng = fs.readFileSync(path.join(__dirname, '../../../assets/icons/icon.png'));
const smallPng = fs.readFileSync(path.join(__dirname, '../../../assets/icons/tray-icon.png'));
let root;
let bundle;
const oversizedPng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAABAAAAAQAAQAAAABXZhYuAAAAlklEQVR4nO3BAQEAAACCIP+vbkhAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADvBgQeAAGfIdLmAAAAAElFTkSuQmCC', 'base64');
let iconOutput;
let toolHook;
let originalPlatform;

function makeBundle(name = 'Sample App', parent = root, iconFile = 'AppIcon') {
  const directory = path.join(parent, `${name}.app`);
  fs.mkdirSync(path.join(directory, 'Contents/Resources'), { recursive: true });
  fs.writeFileSync(path.join(directory, 'Contents/Info.plist'), JSON.stringify(iconFile === null ? {} : { CFBundleIconFile: iconFile }));
  if (iconFile) fs.writeFileSync(path.join(directory, 'Contents/Resources', `${iconFile}.icns`), 'icns fixture');
  return directory;
}

beforeEach(() => {
  jest.clearAllMocks();
  originalPlatform = process.platform;
  Object.defineProperty(process, 'platform', { value: 'darwin', configurable: true });
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'toast-icon-extractor-'));
  mockDirectory = path.join(root, 'user-data');
  bundle = makeBundle();
  toolHook = async () => {};
  iconOutput = largePng;
  mockGetFileIcon.mockResolvedValue({ isEmpty: () => false, getScaleFactors: () => [1, 2], toPNG: () => smallPng });
  mockExecFile.mockImplementation((tool, args, options, callback) => {
    void (async () => {
      await toolHook(path.basename(tool), args);
      if (tool.endsWith('/plutil')) return fs.promises.readFile(args.at(-1), 'utf8');
      if (tool.endsWith('/iconutil')) {
        const output = args[args.indexOf('-o') + 1];
        await fs.promises.mkdir(output);
        await fs.promises.writeFile(path.join(output, 'icon_512x512@2x.png'), iconOutput);
        await fs.promises.writeFile(path.join(output, 'icon_256x256.png'), smallPng);
      }
      if (tool.endsWith('/sips')) {
        await fs.promises.writeFile(args[args.indexOf('--out') + 1], smallPng);
      }
      return '';
    })().then(stdout => callback(null, stdout), error => callback(error));
    return {};
  });
});
afterEach(() => {
  Object.defineProperty(process, 'platform', { value: originalPlatform, configurable: true });
  jest.restoreAllMocks();
  fs.rmSync(root, { recursive: true, force: true });
});

it('extracts a full bundle path, bounds its PNG, and cleans its temporary work', async () => {
  const icon = await extractor.extractAppIcon(bundle);
  expect(icon).toMatch(/Sample_App-[a-f0-9]+\.png$/);
  expect(fs.readFileSync(icon).equals(largePng)).toBe(true);
  expect(fs.statSync(icon).mode & 0o777).toBe(0o600);
  expect(fs.readdirSync(path.dirname(icon))).toEqual([path.basename(icon)]);
  expect(mockExecFile.mock.calls.every(([, , options]) => options.shell === false)).toBe(true);
});
it('resizes representations above the upload dimension limit', async () => {
  iconOutput = oversizedPng;
  const icon = await extractor.extractAppIcon(bundle);
  expect(fs.readFileSync(icon).equals(smallPng)).toBe(true);
  expect(mockExecFile.mock.calls.some(([tool, args]) => tool.endsWith('/sips') && args[0] === '-Z' && args[1] === '512')).toBe(true);
});
it('passes shell metacharacters as literal argv and never runs a find shell', async () => {
  bundle = makeBundle('Odd $(printf marker) "Name"');
  expect(await extractor.extractAppIcon(bundle)).not.toBeNull();
  expect(mockExecFile.mock.calls.map(([file]) => path.basename(file))).toEqual(['plutil', 'iconutil']);
  expect(mockExecFile.mock.calls[0][1].at(-1)).toBe(path.join(fs.realpathSync(bundle), 'Contents/Info.plist'));
});
it('resolves bare names from system application directories', async () => {
  const realpath = fs.promises.realpath.bind(fs.promises);
  jest.spyOn(fs.promises, 'realpath').mockImplementation(value => {
    if (value === '/System/Applications/ToastFixtureLookup.app') return realpath(bundle);
    if (value.endsWith('/ToastFixtureLookup.app')) return Promise.reject(Object.assign(new Error('missing'), { code: 'ENOENT' }));
    return realpath(value);
  });
  expect(await extractor.extractAppIcon('ToastFixtureLookup')).not.toBeNull();
});
it('keeps same-named apps in different locations in separate cache entries', async () => {
  const other = makeBundle('Sample App', path.join(root, 'other'));
  expect(await extractor.extractAppIcon(other)).not.toBe(await extractor.extractAppIcon(bundle));
});
it('reuses compatible cached icons and re-extracts when application metadata is newer', async () => {
  const icon = await extractor.extractAppIcon(bundle);
  mockExecFile.mockClear();
  expect(await extractor.extractAppIcon(bundle)).toBe(icon);
  expect(mockExecFile).not.toHaveBeenCalled();
  fs.utimesSync(icon, new Date(0), new Date(0));
  expect(await extractor.extractAppIcon(bundle)).toBe(icon);
  expect(mockExecFile).toHaveBeenCalled();
});
it('shares concurrent cold extractions, including a concurrent force-refresh request', async () => {
  const results = await Promise.all([extractor.extractAppIcon(bundle), extractor.extractAppIcon(bundle, null, true)]);
  expect(results[0]).toBe(results[1]);
  expect(mockExecFile.mock.calls.filter(([file]) => file.endsWith('/plutil'))).toHaveLength(1);
});
it('does not satisfy force refresh with a concurrent cached result', async () => {
  const icon = await extractor.extractAppIcon(bundle);
  mockExecFile.mockClear();
  await Promise.all([extractor.extractAppIcon(bundle), extractor.extractAppIcon(bundle, null, true)]);
  expect(fs.existsSync(icon)).toBe(true);
  expect(mockExecFile.mock.calls.filter(([file]) => file.endsWith('/plutil'))).toHaveLength(1);
});
it('keeps the old icon when both native decoders fail during forced refresh', async () => {
  const icon = await extractor.extractAppIcon(bundle);
  const original = fs.readFileSync(icon);
  toolHook = async tool => { if (tool !== 'plutil') throw Object.assign(new Error('Decode failed'), { code: 1 }); };
  expect(await extractor.extractAppIcon(bundle, null, true)).toBeNull();
  expect(fs.readFileSync(icon).equals(original)).toBe(true);
  expect(fs.readdirSync(path.dirname(icon))).toEqual([path.basename(icon)]);
});
it('uses ImageIO for a valid ICNS variant that iconutil cannot expand', async () => {
  toolHook = async tool => { if (tool === 'iconutil') throw Object.assign(new Error('Unsupported variant'), { code: 1 }); };
  expect(await extractor.extractAppIcon(bundle)).not.toBeNull();
  expect(mockExecFile.mock.calls.some(([tool, args]) => tool.endsWith('/sips') && args.includes('format'))).toBe(true);
});
it('rejects bundle resource symlinks that point outside the selected application', async () => {
  const icon = path.join(bundle, 'Contents/Resources/AppIcon.icns');
  fs.unlinkSync(icon);
  const outside = path.join(root, 'private.icns');
  fs.writeFileSync(outside, 'icns private');
  fs.symlinkSync(outside, icon);
  expect(await extractor.extractAppIcon(bundle)).toBeNull();
  expect(mockExecFile.mock.calls.map(([tool]) => path.basename(tool))).toEqual(['plutil']);
});
it('asks the OS for an icon when the bundle uses asset-catalog metadata', async () => {
  bundle = makeBundle('Asset Catalog', root, null);
  expect(await extractor.extractAppIcon(bundle)).not.toBeNull();
  expect(mockGetFileIcon).toHaveBeenCalledWith(fs.realpathSync(bundle), { size: 'normal' });
});
it('lets the event loop run while native conversion is pending', async () => {
  let entered;
  let release;
  const started = new Promise(resolve => { entered = resolve; });
  const gate = new Promise(resolve => { release = resolve; });
  toolHook = async tool => { if (tool === 'plutil') { entered(); await gate; } };
  const work = extractor.extractAppIcon(bundle);
  await started;
  await new Promise(resolve => setImmediate(resolve));
  release();
  expect(await work).not.toBeNull();
});
it('rejects invalid paths and unsupported platforms without starting native tools', async () => {
  expect(await extractor.extractAppIcon(path.join(root, 'missing.app'))).toBeNull();
  expect(await extractor.extractAppIcon('../relative.app')).toBeNull();
  Object.defineProperty(process, 'platform', { value: 'win32', configurable: true });
  expect(await extractor.extractAppIcon(bundle)).toBeNull();
  expect(mockExecFile).not.toHaveBeenCalled();
});
it('converts only actual home descendants and preserves dotted app names', () => {
  jest.spyOn(os, 'homedir').mockReturnValue('/Users/test');
  expect(extractor.convertToTildePath('/Users/test/icons/App.png')).toBe('~/icons/App.png');
  expect(extractor.convertToTildePath('/Users/test-other/App.png')).toBe('/Users/test-other/App.png');
  expect(extractor.resolveTildePath('~/icons/App.png')).toBe('/Users/test/icons/App.png');
  expect(extractor.extractAppNameFromPath('zoom.us')).toBe('zoom.us');
  expect(extractor.extractAppNameFromPath('/System/Applications/Utilities/Terminal.app')).toBe('Terminal');
  expect(extractor.extractAppNameFromPath(null)).toBeNull();
});
