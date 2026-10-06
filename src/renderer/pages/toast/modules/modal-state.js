/** Keep async work attached to one button edit and preserve nested-modal state. */
let currentEdit = null;

export function beginButtonEditContext() {
  currentEdit = {};
}

export function invalidateButtonEditContext() {
  currentEdit = null;
}

export function captureButtonEditRequest(readValue = () => null) {
  const edit = currentEdit;
  const value = readValue();
  return () => edit !== null && edit === currentEdit && readValue() === value;
}

export function getActiveModal() {
  return (
    ['confirm-modal', 'icon-search-modal', 'button-edit-modal', 'profile-modal']
      .map(id => document.getElementById(id))
      .find(modal => modal?.classList.contains('show')) || null
  );
}

export function isAnyModalOpen() {
  return getActiveModal() !== null;
}

export function keepFocusInModal(event) {
  const modal = getActiveModal();
  if (!modal || event.defaultPrevented) {
    return;
  }
  const fields = [...modal.querySelectorAll('button, input, select, textarea, a[href], [tabindex]')].filter(
    field => !field.disabled && field.tabIndex !== -1 && field.getClientRects().length > 0,
  );
  const first = fields[0];
  const last = fields.at(-1);
  const outside = !modal.contains(document.activeElement);
  if (event.key === 'Tab' && (outside || !fields.length || (event.shiftKey ? document.activeElement === first : document.activeElement === last))) {
    event.preventDefault();
    event.stopImmediatePropagation();
    (event.shiftKey ? last : first)?.focus();
  } else if (['Enter', ' '].includes(event.key) && !modal.contains(event.target)) {
    event.preventDefault();
    event.stopImmediatePropagation();
    first?.focus();
  }
}

export function syncModalState() {
  window.toast.setModalOpen(isAnyModalOpen());
}
