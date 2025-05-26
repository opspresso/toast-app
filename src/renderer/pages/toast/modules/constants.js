/**
 * Toast - Constants and Default Configurations
 */

// Toast URL configuration
export const TOAST_URL = window.toast?.apiBaseUrl || 'https://toastapp.io';
export const SUBSCRIPTION_URL = `${TOAST_URL}/subscription`;
export const DASHBOARD_URL = `${TOAST_URL}/dashboard`;

// Define default button set
export const defaultButtons = [
  // qwert row
  {
    name: 'Toast',
    shortcut: 'Q',
    icon: 'https://toastapp.io/favicon.ico',
    action: 'open',
    url: 'https://toastapp.io',
  },
  {
    name: 'How to Use',
    shortcut: 'W',
    icon: 'FlatColorIcons.questions',
    action: 'open',
    url: 'https://toastapp.io/how-to-use',
  },
  {
    name: 'Subscribe',
    shortcut: 'E',
    icon: 'FlatColorIcons.synchronize',
    action: 'open',
    url: 'https://toastapp.io/subscription',
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
    command:
      window.toast?.platform === 'darwin' ? 'open -a "App Store"' : 'start ms-windows-store:',
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
  .map((_, index) => {
    const rowLetters = ['Q', 'W', 'E', 'R', 'T', 'A', 'S', 'D', 'F', 'G', 'Z', 'X', 'C', 'V', 'B'];
    return {
      name: ``,
      shortcut: rowLetters[index],
      icon: '',
      action: 'application',
      application: '',
      applicationParameters: '',
    };
  });

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
