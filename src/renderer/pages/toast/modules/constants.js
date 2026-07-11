/**
 * Toast - Constants and Default Configurations
 */

// Toast URL configuration
export const TOAST_URL = window.toast?.apiBaseUrl || 'https://app.toast.sh';
export const SUBSCRIPTION_URL = `${TOAST_URL}/subscription`;
export const DASHBOARD_URL = `${TOAST_URL}/dashboard`;

// UI chrome icons (stroke follows currentColor) - keep in sync with inline SVGs in index.html
export const UI_ICONS = {
  user: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
  refresh:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>',
  image:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>',
};

// Button shortcut key order definition (qwertasdfgzxcvb)
export const BUTTON_SHORTCUTS = ['Q', 'W', 'E', 'R', 'T', 'A', 'S', 'D', 'F', 'G', 'Z', 'X', 'C', 'V', 'B'];

// Define default button set
export const defaultButtons = [
  // qwert row
  {
    name: 'Toast',
    shortcut: 'Q',
    icon: 'https://app.toast.sh/favicon.ico',
    action: 'open',
    url: 'https://app.toast.sh',
  },
  {
    name: 'How to Use',
    shortcut: 'W',
    icon: 'FlatColorIcons.questions',
    action: 'open',
    url: 'https://app.toast.sh/how-to-use',
  },
  {
    name: 'Subscribe',
    shortcut: 'E',
    icon: 'FlatColorIcons.synchronize',
    action: 'open',
    url: 'https://app.toast.sh/subscription',
  },
  {
    name: 'Confetti',
    shortcut: 'R',
    icon: '🎉',
    action: 'script',
    script: 'confetti',
    scriptType: 'special',
  },
  {
    name: 'iTerm',
    shortcut: 'T',
    icon: '⌨️',
    action: 'exec',
    command: window.toast?.platform === 'darwin' ? 'open -a "iTerm"' : 'start cmd',
  },
  // asdfg row
  {
    name: 'App Store',
    shortcut: 'A',
    icon: '🛒',
    action: 'exec',
    command: window.toast?.platform === 'darwin' ? 'open -a "App Store"' : 'start ms-windows-store:',
  },
  {
    name: 'Slack',
    shortcut: 'S',
    icon: 'https://slack.com/favicon.ico',
    action: 'exec',
    command: window.toast?.platform === 'darwin' ? 'open -a Slack' : 'start slack:',
  },
  {
    name: 'Dictionary',
    shortcut: 'D',
    icon: '📚',
    action: 'exec',
    command: window.toast?.platform === 'darwin' ? 'open -a Dictionary' : 'start ms-dictionary:',
  },
  {
    name: 'Finder',
    shortcut: 'F',
    icon: '🔍',
    action: 'exec',
    command: window.toast?.platform === 'darwin' ? 'open ~' : 'explorer ~',
  },
  {
    name: 'GitHub',
    shortcut: 'G',
    icon: 'https://github.com/favicon.ico',
    action: 'open',
    url: 'https://github.com',
  },
  // zxcvb row
  {
    name: 'Zoom',
    shortcut: 'Z',
    icon: 'https://zoom.us/favicon.ico',
    action: 'exec',
    command: window.toast?.platform === 'darwin' ? 'open -a zoom.us' : 'start zoommtg:',
  },
  {
    name: 'Mail',
    shortcut: 'X',
    icon: '✉️',
    action: 'exec',
    command: window.toast?.platform === 'darwin' ? 'open -a Mail' : 'start outlookmail:',
  },
  {
    name: 'Calendar',
    shortcut: 'C',
    icon: '📅',
    action: 'exec',
    command: window.toast?.platform === 'darwin' ? 'open -a Calendar' : 'start outlookcal:',
  },
  {
    name: 'VSCode',
    shortcut: 'V',
    icon: 'https://code.visualstudio.com/favicon.ico',
    action: 'exec',
    command: window.toast?.platform === 'darwin' ? 'open -a "Visual Studio Code"' : 'start code',
  },
  {
    name: 'Chrome',
    shortcut: 'B',
    icon: 'https://www.google.com/chrome/static/images/chrome-logo-m100.svg',
    action: 'exec',
    command: window.toast?.platform === 'darwin' ? 'open -a "Google Chrome"' : 'start chrome',
  },
];

// Define empty button set (15 buttons)
export const emptyButtons = Array(15)
  .fill(null)
  .map((_, index) => ({
    name: '',
    shortcut: BUTTON_SHORTCUTS[index],
    icon: '',
    action: 'application',
    application: '',
    applicationParameters: '',
  }));

/**
 * Normalize a page's button array to 15 buttons
 * Fills the shortfall with empty buttons for pages that ended up with fewer than 15 buttons
 * due to legacy version data or synchronization.
 * Empty pages (0 buttons) are left as-is to preserve the "add page guidance" behavior.
 * @param {Array} buttons - Button array
 * @returns {Array} Button array padded to 15 buttons
 */
export function normalizePageButtons(buttons) {
  const result = [...(buttons || [])];
  if (result.length === 0) {
    return result;
  }
  while (result.length < emptyButtons.length) {
    result.push({ ...emptyButtons[result.length] });
  }
  return result;
}

/**
 * Reassign the button array's shortcuts in order
 * @param {Array} buttons - Button array
 * @returns {Array} Button array with reassigned shortcuts
 */
export function reassignButtonShortcuts(buttons) {
  return buttons.map((button, index) => {
    if (index < BUTTON_SHORTCUTS.length) {
      return {
        ...button,
        shortcut: BUTTON_SHORTCUTS[index],
      };
    }
    return button;
  });
}

// Keyboard shortcuts help data
export const shortcuts = [
  { key: 'Alt+Space', desc: 'Open Toast window', icon: '🔍' },
  { key: 'ESC', desc: 'Close window', icon: '✖️' },
  { key: '+', desc: 'Add page', icon: '➕' },
  { key: '-', desc: 'Delete page', icon: '➖' },
  { key: '1-9', desc: 'Switch page', icon: '📄' },
  { key: 'qwert asdfg zxcvb', desc: 'Execute action', icon: '🚀' },
  { key: ',', desc: 'Toggle settings mode', icon: '📝' },
  { key: 'Cmd+,', desc: 'Open settings window', icon: '⚙️' },
];
