/**
 * Toast - Clock Functions
 */

/**
 * Initialize the clock and start updating it
 */
export function initClock() {
  updateClock();
  // Update clock every second
  setInterval(updateClock, 1000);
}

/**
 * Update the clock display with current time
 */
export function updateClock() {
  const now = new Date();
  const hours = now.getHours();
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');

  // Determine AM/PM
  const ampm = hours >= 12 ? 'PM' : 'AM';

  // Convert to 12-hour format
  const hours12 = hours % 12 || 12;
  const hours12Str = String(hours12).padStart(2, '0');

  // Get clock element directly to avoid import timing issues
  const toastClock = document.getElementById('toast-clock');

  // Update clock display with HTML formatting
  if (toastClock) {
    toastClock.innerHTML = `<span class="ampm">${ampm}</span> ${hours12Str}:${minutes}<span class="seconds">:${seconds}</span>`;
  } else {
    console.warn('Toast clock element not found');
  }
}
