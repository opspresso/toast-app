// Mock implementation of Electron for testing

const EventEmitter = require('events');

// Mock BrowserWindow
class BrowserWindow extends EventEmitter {
  constructor(options = {}) {
    super();
    this.options = options;
    this.id = Math.floor(Math.random() * 10000);
    this.isVisible = false;
    this.isDestroyed = false;
    this.isMinimized = false;
    this.isFocused = false;
    this.webContents = new WebContents(this);
  }

  loadFile(filePath) {
    this.loadedFile = filePath;
    this.emit('ready-to-show');
    return Promise.resolve();
  }

  loadURL(url) {
    this.loadedURL = url;
    this.emit('ready-to-show');
    return Promise.resolve();
  }

  show() {
    this.isVisible = true;
    this.emit('show');
  }

  hide() {
    this.isVisible = false;
    this.emit('hide');
  }

  close() {
    this.emit('close');
    this.destroy();
  }

  destroy() {
    this.isDestroyed = true;
    this.emit('closed');
  }

  focus() {
    this.isFocused = true;
    this.emit('focus');
  }

  blur() {
    this.isFocused = false;
    this.emit('blur');
  }

  minimize() {
    this.isMinimized = true;
    this.emit('minimize');
  }

  restore() {
    this.isMinimized = false;
    this.emit('restore');
  }

  setPosition(x, y) {
    this.x = x;
    this.y = y;
  }

  getPosition() {
    return [this.x || 0, this.y || 0];
  }

  getBounds() {
    return {
      x: this.x || 0,
      y: this.y || 0,
      width: this.options.width || 800,
      height: this.options.height || 600,
    };
  }

  setOpacity(opacity) {
    this.opacity = opacity;
  }
}

// Mock WebContents
class WebContents extends EventEmitter {
  constructor(browserWindow) {
    super();
    this.browserWindow = browserWindow;
    this.devToolsOpened = false;
  }

  send(channel, ...args) {
    this.emit(channel, { sender: this }, ...args);
    return true;
  }

  openDevTools(options) {
    this.devToolsOpened = true;
  }

  closeDevTools() {
    this.devToolsOpened = false;
  }
}

// Mock Tray
class Tray extends EventEmitter {
  constructor(iconPath) {
    super();
    this.iconPath = iconPath;
    this.tooltip = '';
    this.contextMenu = null;
  }

  setToolTip(tooltip) {
    this.tooltip = tooltip;
  }

  setContextMenu(menu) {
    this.contextMenu = menu;
  }

  setImage(iconPath) {
    this.iconPath = iconPath;
  }

  destroy() {
    this.emit('destroyed');
  }
}

// Mock Menu
class Menu {
  constructor() {
    this.items = [];
  }

  append(menuItem) {
    this.items.push(menuItem);
  }

  insert(pos, menuItem) {
    this.items.splice(pos, 0, menuItem);
  }

  static buildFromTemplate(template) {
    const menu = new Menu();
    template.forEach(item => {
      menu.append(new MenuItem(item));
    });
    return menu;
  }
}

// Mock MenuItem
class MenuItem {
  constructor(options) {
    Object.assign(this, options);
    this.enabled = options.enabled !== false;
    this.visible = options.visible !== false;
    this.checked = options.checked || false;
  }

  click() {
    if (this.enabled && this.click) {
      this.click();
    }
  }
}

// Mock Dialog
const dialog = {
  showOpenDialog: jest.fn().mockResolvedValue({
    canceled: false,
    filePaths: ['/mock/path/file.txt'],
  }),
  showSaveDialog: jest.fn().mockResolvedValue({
    canceled: false,
    filePath: '/mock/path/save-file.txt',
  }),
  showMessageBox: jest.fn().mockResolvedValue({
    response: 0,
  }),
  showErrorBox: jest.fn(),
};

// Mock Shell
const shell = {
  openExternal: jest.fn().mockResolvedValue(true),
  openPath: jest.fn().mockResolvedValue({ success: true }),
  showItemInFolder: jest.fn(),
};

// Mock App
class App extends EventEmitter {
  constructor() {
    super();
    this.name = 'toast-app';
    this.isReady = false;
    this.isQuitting = false;
    this.appPath = '/mock/path/to/app';
    this.version = '1.0.0';
    this.appMetrics = [];
    this.loginItemSettings = {
      openAtLogin: false,
    };
  }

  getPath(name) {
    const paths = {
      home: '/mock/home',
      appData: '/mock/appData',
      userData: '/mock/userData',
      temp: '/mock/temp',
      exe: '/mock/exe',
      desktop: '/mock/desktop',
      documents: '/mock/documents',
      downloads: '/mock/downloads',
      music: '/mock/music',
      pictures: '/mock/pictures',
      videos: '/mock/videos',
      logs: '/mock/logs',
    };
    return paths[name] || '/mock/unknown';
  }

  getAppPath() {
    return this.appPath;
  }

  getVersion() {
    return this.version;
  }

  quit() {
    this.isQuitting = true;
    this.emit('will-quit');
    this.emit('quit');
  }

  exit(code = 0) {
    this.quit();
    return code;
  }

  relaunch(options = {}) {
    this.quit();
    this.emit('will-relaunch');
  }

  focus() {
    this.emit('browser-window-focus');
  }

  hide() {
    this.emit('browser-window-blur');
  }

  setLoginItemSettings(settings) {
    this.loginItemSettings = { ...this.loginItemSettings, ...settings };
  }

  getLoginItemSettings() {
    return this.loginItemSettings;
  }

  requestSingleInstanceLock() {
    return true;
  }

  whenReady() {
    return Promise.resolve();
  }
}

// Mock IPC
const ipcMain = new EventEmitter();
ipcMain.handle = jest.fn().mockImplementation((channel, listener) => {
  ipcMain.on(channel, async (event, ...args) => {
    try {
      const result = await listener(event, ...args);
      event.returnValue = result;
    } catch (error) {
      event.returnValue = { error: error.message };
    }
  });
});

const ipcRenderer = new EventEmitter();
ipcRenderer.invoke = jest.fn().mockImplementation((channel, ...args) => {
  return Promise.resolve({ success: true, channel, args });
});

// Mock GlobalShortcut
const globalShortcut = {
  register: jest.fn().mockReturnValue(true),
  unregister: jest.fn(),
  unregisterAll: jest.fn(),
  isRegistered: jest.fn().mockReturnValue(false),
};

// Mock Screen
const screen = {
  getPrimaryDisplay: jest.fn().mockReturnValue({
    id: 1,
    bounds: { x: 0, y: 0, width: 1920, height: 1080 },
    workArea: { x: 0, y: 0, width: 1920, height: 1040 },
    scaleFactor: 1,
    rotation: 0,
  }),
  getAllDisplays: jest.fn().mockReturnValue([
    {
      id: 1,
      bounds: { x: 0, y: 0, width: 1920, height: 1080 },
      workArea: { x: 0, y: 0, width: 1920, height: 1040 },
      scaleFactor: 1,
      rotation: 0,
    },
  ]),
  getCursorScreenPoint: jest.fn().mockReturnValue({ x: 500, y: 500 }),
};

// Mock Clipboard
const clipboard = {
  readText: jest.fn().mockReturnValue('Mocked clipboard text'),
  writeText: jest.fn(),
  readHTML: jest.fn().mockReturnValue('<p>Mocked clipboard HTML</p>'),
  writeHTML: jest.fn(),
  readImage: jest.fn(),
  writeImage: jest.fn(),
  clear: jest.fn(),
};

// Create app instance
const app = new App();

// Export the mock
module.exports = {
  app,
  BrowserWindow,
  Menu,
  MenuItem,
  Tray,
  dialog,
  shell,
  ipcMain,
  ipcRenderer,
  globalShortcut,
  screen,
  clipboard,
  contextBridge: {
    exposeInMainWorld: jest.fn(),
  },
};
