/**
 * Toast - Icon Normalizer Tests
 *
 * Tests for the file:// → https URL migration of button icons.
 */

// Mock logger
jest.mock('../../../src/main/logger', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  })),
}));

// Mock fs
jest.mock('fs', () => ({
  existsSync: jest.fn(() => true),
}));

// Mock app-icon-extractor (tilde path resolution)
jest.mock('../../../src/main/utils/app-icon-extractor', () => ({
  resolveTildePath: jest.fn(p => p.replace('~', '/Users/test')),
}));

// Mock icons API (default uploadIcon when not injected)
jest.mock('../../../src/main/api/icons', () => ({
  uploadIcon: jest.fn(),
}));

const fs = require('fs');
const { normalizeLocalIcons } = require('../../../src/main/utils/icon-normalizer');

const makePages = icons => [
  {
    name: 'Page 1',
    buttons: icons.map((icon, i) => ({ name: `Button ${i}`, action: 'application', icon })),
  },
];

describe('normalizeLocalIcons', () => {
  let uploadIcon;

  beforeEach(() => {
    jest.clearAllMocks();
    fs.existsSync.mockReturnValue(true);
    uploadIcon = jest.fn().mockResolvedValue({ success: true, url: 'https://icons.example.com/a.png' });
  });

  test('replaces file://~/ icons with uploaded https URLs', async () => {
    const pages = makePages(['file://~/Library/icons/Slack.png']);

    const result = await normalizeLocalIcons(pages, { uploadIcon, platform: 'darwin' });

    expect(result.changed).toBe(true);
    expect(result.failures).toBe(0);
    expect(result.pages[0].buttons[0].icon).toBe('https://icons.example.com/a.png');
    expect(uploadIcon).toHaveBeenCalledWith({
      filePath: '/Users/test/Library/icons/Slack.png',
      onUnauthorized: null,
    });
    // Does not mutate the original array (immutability)
    expect(pages[0].buttons[0].icon).toBe('file://~/Library/icons/Slack.png');
  });

  test('handles absolute file:/// icons without tilde resolution', async () => {
    const pages = makePages(['file:///Users/test/icons/App.png']);

    const result = await normalizeLocalIcons(pages, { uploadIcon, platform: 'darwin' });

    expect(result.changed).toBe(true);
    expect(uploadIcon).toHaveBeenCalledWith({
      filePath: '/Users/test/icons/App.png',
      onUnauthorized: null,
    });
  });

  test('leaves non-file icons untouched', async () => {
    const icons = ['https://example.com/x.png', 'FlatColorIcons.home', '🚀', ''];
    const pages = makePages(icons);

    const result = await normalizeLocalIcons(pages, { uploadIcon, platform: 'darwin' });

    expect(result.changed).toBe(false);
    expect(result.pages).toBe(pages);
    expect(uploadIcon).not.toHaveBeenCalled();
  });

  test('keeps the original value when the upload fails', async () => {
    uploadIcon.mockResolvedValue({ success: false, error: 'network error' });
    const pages = makePages(['file://~/Library/icons/Slack.png']);

    const result = await normalizeLocalIcons(pages, { uploadIcon, platform: 'darwin' });

    expect(result.changed).toBe(false);
    expect(result.failures).toBe(1);
    expect(result.pages[0].buttons[0].icon).toBe('file://~/Library/icons/Slack.png');
  });

  test('skips icons whose local file does not exist', async () => {
    fs.existsSync.mockReturnValue(false);
    const pages = makePages(['file://~/Library/icons/Gone.png']);

    const result = await normalizeLocalIcons(pages, { uploadIcon, platform: 'darwin' });

    expect(result.changed).toBe(false);
    expect(uploadIcon).not.toHaveBeenCalled();
  });

  test('does nothing on non-darwin platforms', async () => {
    const pages = makePages(['file://~/Library/icons/Slack.png']);

    const result = await normalizeLocalIcons(pages, { uploadIcon, platform: 'win32' });

    expect(result.changed).toBe(false);
    expect(result.pages).toBe(pages);
    expect(uploadIcon).not.toHaveBeenCalled();
  });

  test('stops uploading after 3 consecutive failures', async () => {
    uploadIcon.mockResolvedValue({ success: false, error: 'network error' });
    const pages = makePages([
      'file://~/a.png',
      'file://~/b.png',
      'file://~/c.png',
      'file://~/d.png',
      'file://~/e.png',
    ]);

    const result = await normalizeLocalIcons(pages, { uploadIcon, platform: 'darwin' });

    expect(uploadIcon).toHaveBeenCalledTimes(3);
    expect(result.failures).toBe(3);
    expect(result.changed).toBe(false);
  });

  test('stops immediately when the endpoint is unavailable', async () => {
    uploadIcon.mockResolvedValue({ success: false, unavailable: true });
    const pages = makePages(['file://~/a.png', 'file://~/b.png']);

    const result = await normalizeLocalIcons(pages, { uploadIcon, platform: 'darwin' });

    expect(uploadIcon).toHaveBeenCalledTimes(1);
    expect(result.changed).toBe(false);
  });

  test('resets the consecutive failure counter after a success', async () => {
    uploadIcon
      .mockResolvedValueOnce({ success: false, error: 'fail' })
      .mockResolvedValueOnce({ success: false, error: 'fail' })
      .mockResolvedValueOnce({ success: true, url: 'https://icons.example.com/c.png' })
      .mockResolvedValueOnce({ success: false, error: 'fail' })
      .mockResolvedValueOnce({ success: false, error: 'fail' });
    const pages = makePages(['file://~/a.png', 'file://~/b.png', 'file://~/c.png', 'file://~/d.png', 'file://~/e.png']);

    const result = await normalizeLocalIcons(pages, { uploadIcon, platform: 'darwin' });

    // A success resets the counter, so all 5 are attempted
    expect(uploadIcon).toHaveBeenCalledTimes(5);
    expect(result.changed).toBe(true);
    expect(result.pages[0].buttons[2].icon).toBe('https://icons.example.com/c.png');
  });

  test('handles pages without a buttons array', async () => {
    const pages = [{ name: 'Empty' }, null];

    const result = await normalizeLocalIcons(pages, { uploadIcon, platform: 'darwin' });

    expect(result.changed).toBe(false);
    expect(result.pages).toEqual(pages);
  });
});
