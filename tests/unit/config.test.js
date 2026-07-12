const { app } = require('electron');

// Mock electron-store
jest.mock('electron-store', () => {
  return jest.fn().mockImplementation(() => ({
    get: jest.fn(),
    set: jest.fn(),
    has: jest.fn(),
    delete: jest.fn(),
    clear: jest.fn(),
    store: {},
  }));
});

const Store = require('electron-store');

describe('Configuration Store', () => {
  let mockStore;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Get the mocked store instance
    mockStore = new Store();
  });

  test('should create store with correct schema', () => {
    // Import the module that uses electron-store
    const { createConfigStore } = require('../../src/main/config');

    // Call the function that creates the store
    const config = createConfigStore();

    // Verify Store was constructed at least once
    expect(Store).toHaveBeenCalled();

    // Verify the returned object has the expected methods
    expect(config).toHaveProperty('get');
    expect(config).toHaveProperty('set');
    expect(config).toHaveProperty('has');
    expect(config).toHaveProperty('delete');
    expect(config).toHaveProperty('clear');
  });

  test('should get configuration values', () => {
    // Import the module
    const { createConfigStore } = require('../../src/main/config');
    const config = createConfigStore();

    // Setup mock return values
    config.get.mockImplementation((key) => {
      const values = {
        globalHotkey: 'Alt+Space',
        'appearance.theme': 'dark',
        'buttons': [{ name: 'Test Button' }],
      };
      return values[key];
    });

    // Test getting values
    expect(config.get('globalHotkey')).toBe('Alt+Space');
    expect(config.get('appearance.theme')).toBe('dark');
    expect(config.get('buttons')).toEqual([{ name: 'Test Button' }]);

    // Verify get was called with correct keys
    expect(config.get).toHaveBeenCalledWith('globalHotkey');
    expect(config.get).toHaveBeenCalledWith('appearance.theme');
    expect(config.get).toHaveBeenCalledWith('buttons');
  });

  test('should set configuration values', () => {
    // Import the module
    const { createConfigStore } = require('../../src/main/config');
    const config = createConfigStore();

    // Set some values
    config.set('globalHotkey', 'Ctrl+Space');
    config.set('appearance.theme', 'light');
    config.set('buttons', [{ name: 'New Button' }]);

    // Verify set was called with correct arguments
    expect(config.set).toHaveBeenCalledWith('globalHotkey', 'Ctrl+Space');
    expect(config.set).toHaveBeenCalledWith('appearance.theme', 'light');
    expect(config.set).toHaveBeenCalledWith('buttons', [{ name: 'New Button' }]);
  });

  test('should reset to defaults', () => {
    // Import the module
    const { createConfigStore, resetToDefaults } = require('../../src/main/config');
    const config = createConfigStore();

    // Mock get method to return empty pages
    config.get.mockReturnValue([]);

    // Reset to defaults
    resetToDefaults(config);

    // Verify clear was called
    expect(config.clear).toHaveBeenCalled();

    // Verify default values were set
    expect(config.set).toHaveBeenCalledWith('globalHotkey', 'Alt+Space');
    expect(config.set).toHaveBeenCalledWith('pages', []);
    // Snippets are preserved and text expander reset to default
    expect(config.set).toHaveBeenCalledWith('snippets', []);
    expect(config.set).toHaveBeenCalledWith('textExpander', { enabled: false, seeded: false });
  });

  describe('schema', () => {
    test('defines snippets and textExpander keys', () => {
      const { schema } = require('../../src/main/config');
      expect(schema.snippets).toEqual(expect.objectContaining({ type: 'array' }));
      expect(schema.snippets.default).toEqual([]);
      expect(schema.textExpander.default).toEqual({ enabled: false, seeded: false });
    });

    test('defines cloudSync.enabled defaulting to true', () => {
      const { schema } = require('../../src/main/config');
      expect(schema.cloudSync).toEqual(expect.objectContaining({ type: 'object' }));
      expect(schema.cloudSync.default).toEqual({ enabled: true });
    });
  });

  describe('seedDefaultSnippets', () => {
    test('seeds the !email default with the login email when empty and unseeded', () => {
      const { createConfigStore, seedDefaultSnippets } = require('../../src/main/config');
      const config = createConfigStore();
      config.get.mockImplementation(key => {
        if (key === 'textExpander') return { enabled: false, seeded: false };
        if (key === 'snippets') return [];
        return undefined;
      });

      seedDefaultSnippets(config, 'me@corp.com');

      expect(config.set).toHaveBeenCalledWith('snippets', [
        { id: 'default-email', keyword: '!email', content: 'me@corp.com', enabled: true, label: 'Email' },
      ]);
      expect(config.set).toHaveBeenCalledWith('textExpander', { enabled: false, seeded: true });
    });

    test('uses the fallback email when not logged in', () => {
      const { createConfigStore, seedDefaultSnippets } = require('../../src/main/config');
      const config = createConfigStore();
      config.get.mockImplementation(key => (key === 'textExpander' ? { seeded: false } : key === 'snippets' ? [] : undefined));

      seedDefaultSnippets(config);

      expect(config.set).toHaveBeenCalledWith('snippets', [expect.objectContaining({ keyword: '!email', content: 'email@toast.sh' })]);
    });

    test('does nothing when already seeded', () => {
      const { createConfigStore, seedDefaultSnippets } = require('../../src/main/config');
      const config = createConfigStore();
      config.get.mockImplementation(key => (key === 'textExpander' ? { seeded: true } : undefined));

      seedDefaultSnippets(config, 'x@y.com');

      const snippetSets = config.set.mock.calls.filter(call => call[0] === 'snippets');
      expect(snippetSets).toHaveLength(0);
    });

    test('does not overwrite existing snippets but marks as seeded', () => {
      const { createConfigStore, seedDefaultSnippets } = require('../../src/main/config');
      const config = createConfigStore();
      config.get.mockImplementation(key => {
        if (key === 'textExpander') return { seeded: false };
        if (key === 'snippets') return [{ keyword: ':x', content: 'y' }];
        return undefined;
      });

      seedDefaultSnippets(config, 'x@y.com');

      const snippetSets = config.set.mock.calls.filter(call => call[0] === 'snippets');
      expect(snippetSets).toHaveLength(0);
      expect(config.set).toHaveBeenCalledWith('textExpander', { seeded: true });
    });
  });

  describe('generateDataHash', () => {
    test('includes snippets in the sync hash', () => {
      const { generateDataHash } = require('../../src/main/config');
      const base = { pages: [], appearance: {}, advanced: {} };
      const withSnippet = { ...base, snippets: [{ keyword: ':email', content: 'a@b.com' }] };
      // Changing snippets must change the hash so sync detects it
      expect(generateDataHash(base)).not.toBe(generateDataHash(withSnippet));
    });

    test('is stable for equal data', () => {
      const { generateDataHash } = require('../../src/main/config');
      const data = { pages: [], snippets: [{ keyword: ':x', content: 'y' }], appearance: {}, advanced: {} };
      expect(generateDataHash(data)).toBe(generateDataHash({ ...data }));
    });

    test('detects content changes even when array lengths are unchanged', () => {
      // A JSON.stringify(value, arrayOfKeys) call treats the array as a property
      // allowlist applied at every nesting level, not a sort — so nested fields
      // like button names/shortcuts or a snippet's content would be silently
      // stripped and two differently-edited datasets would hash identically.
      const { generateDataHash } = require('../../src/main/config');
      const before = {
        pages: [{ name: 'Page 1', buttons: [{ name: 'btn1', shortcut: 'a' }] }],
        snippets: [{ keyword: ':x', content: 'before' }],
        appearance: { theme: 'dark' },
        advanced: { launchAtLogin: false },
      };
      const after = {
        pages: [{ name: 'Page 1', buttons: [{ name: 'btn1-renamed', shortcut: 'b' }] }],
        snippets: [{ keyword: ':x', content: 'after' }],
        appearance: { theme: 'light' },
        advanced: { launchAtLogin: true },
      };
      expect(generateDataHash(before)).not.toBe(generateDataHash(after));
    });

    test('is independent of nested key insertion order', () => {
      const { generateDataHash } = require('../../src/main/config');
      const a = { pages: [], snippets: [], appearance: { theme: 'dark', accentColor: 'blue' }, advanced: {} };
      const b = { pages: [], snippets: [], appearance: { accentColor: 'blue', theme: 'dark' }, advanced: {} };
      expect(generateDataHash(a)).toBe(generateDataHash(b));
    });
  });
});
