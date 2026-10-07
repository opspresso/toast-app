/** Snippet collection validation and atomic edit planning. */
const { randomUUID } = require('crypto');
const { isDeepStrictEqual } = require('util');
const { validateSnippet } = require('./text-expander/matcher');

const MAX_SNIPPETS = 500;
const MAX_PAYLOAD_BYTES = 40000;

function validateSnippets(snippets) {
  if (!Array.isArray(snippets)) {
    return { valid: false, error: 'Snippets must be an array.' };
  }
  if (snippets.length > MAX_SNIPPETS || Buffer.byteLength(JSON.stringify(snippets), 'utf8') > MAX_PAYLOAD_BYTES) {
    return { valid: false, error: 'Snippets exceed the cloud storage limit (500 items / 40,000 bytes).' };
  }
  const ids = new Set();
  for (let index = 0; index < snippets.length; index++) {
    const snippet = snippets[index];
    if (!snippet || typeof snippet !== 'object' || Array.isArray(snippet) ||
      (snippet.id !== undefined && (typeof snippet.id !== 'string' || !snippet.id)) ||
      (snippet.label !== undefined && typeof snippet.label !== 'string') ||
      (snippet.enabled !== undefined && typeof snippet.enabled !== 'boolean')) {
      return { valid: false, error: 'Invalid snippet fields.' };
    }
    if (snippet.id && ids.has(snippet.id)) {
      return { valid: false, error: 'Snippet IDs must be unique.' };
    }
    ids.add(snippet.id);
    const result = validateSnippet(snippet, snippets.slice(0, index));
    if (!result.valid) {
      return { valid: false, error: result.errors.join(' ') };
    }
  }
  return { valid: true };
}

function changeSnippet(current, change) {
  if (!change || !['add', 'update', 'delete'].includes(change.type)) {
    return { success: false, error: 'Invalid snippet operation.' };
  }
  const next = [...current];
  if (change.type === 'add') {
    if (!change.snippet || typeof change.snippet !== 'object' || Array.isArray(change.snippet)) {
      return { success: false, error: 'Invalid snippet.' };
    }
    next.push({ ...change.snippet, id: randomUUID() });
  }
  else {
    const original = change.original;
    const index = original && next.findIndex(item => original.id ? item.id === original.id : item.keyword === original.keyword);
    if (!original || index < 0 || !isDeepStrictEqual(next[index], original)) {
      return { success: false, conflict: true, error: 'This snippet changed or was deleted. Your draft is preserved; reopen the current snippet before saving.' };
    }
    if (change.type === 'delete') {
      next.splice(index, 1);
    }
    else {
      if (!change.snippet || typeof change.snippet !== 'object' || Array.isArray(change.snippet)) {
        return { success: false, error: 'Invalid snippet.' };
      }
      next[index] = { ...change.snippet, id: original.id || randomUUID() };
    }
  }
  const result = validateSnippets(next);
  return result.valid ? { success: true, snippets: next } : { success: false, error: result.error };
}

module.exports = { validateSnippets, changeSnippet };
