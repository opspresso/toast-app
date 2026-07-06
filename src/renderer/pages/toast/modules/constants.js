/**
 * Toast - Constants and Default Configurations
 */

// Toast URL configuration
export const TOAST_URL = window.toast?.apiBaseUrl || 'https://app.toast.sh';
export const SUBSCRIPTION_URL = `${TOAST_URL}/subscription`;
export const DASHBOARD_URL = `${TOAST_URL}/dashboard`;

// 버튼 단축키 순서 정의 (qwertasdfgzxcvb)
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
 * 페이지 버튼 배열을 15개로 정규화하는 함수
 * 과거 버전 데이터나 동기화로 버튼이 15개 미만이 된 페이지의 부족분을 빈 버튼으로 채운다.
 * 빈 페이지(0개)는 "페이지 추가 안내" 동작을 유지하기 위해 그대로 둔다.
 * @param {Array} buttons - 버튼 배열
 * @returns {Array} 15개로 채워진 버튼 배열
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
 * 버튼 배열의 단축키를 순서대로 재할당하는 함수
 * @param {Array} buttons - 버튼 배열
 * @returns {Array} 단축키가 재할당된 버튼 배열
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
