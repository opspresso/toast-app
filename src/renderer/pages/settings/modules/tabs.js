/**
 * Settings - Tab Management
 * Content is initialized by index.js and refreshed by config/auth events.
 */
export function switchTab(tabId) {
  const links = Array.from(document.querySelectorAll('.settings-nav li'));
  const contents = Array.from(document.querySelectorAll('.settings-tab'));
  if (!links.some(link => link.getAttribute('data-tab') === tabId) || !contents.some(tab => tab.id === tabId)) {
    return;
  }
  for (const link of links) {
    link.classList.toggle('active', link.getAttribute('data-tab') === tabId);
  }
  for (const tab of contents) {
    tab.classList.toggle('active', tab.id === tabId);
  }
}
