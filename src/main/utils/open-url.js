/** Normalize launcher URLs without changing custom URI schemes or host:port links. */
function normalizeOpenUrl(value) {
  const url = value.trim();
  const hasScheme = /^[a-z][a-z0-9+.-]*:/i.test(url);
  const hostWithPort = /^[^/?#:]+:\d+(?:[/?#]|$)/.test(url);
  return !hasScheme || hostWithPort ? `http://${url}` : url;
}

module.exports = { normalizeOpenUrl };
