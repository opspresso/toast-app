/** Three-way merge against the last acknowledged cloud snapshot. */
const { isDeepStrictEqual: equal } = require('util');

class SyncConflict extends Error {
  constructor(path) {
    super("Local and cloud changes could not be merged. Upload to keep this device's settings, or download to use the cloud settings.");
    this.name = 'SyncConflict';
    this.path = path;
  }
}

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function identity(item) {
  if (!isObject(item)) {
    return null;
  }
  for (const key of ['id', 'shortcut', 'keyword']) {
    if (typeof item[key] === 'string' && item[key]) {
      return `${key}:${item[key]}`;
    }
  }
  return null;
}

function indexItems(items, path) {
  const indexed = new Map();
  for (const item of items) {
    const key = identity(item);
    // Ambiguous lists need an explicit choice, never a guessed name/index merge.
    if (!key || indexed.has(key)) {
      throw new SyncConflict(path);
    }
    indexed.set(key, item);
  }
  return indexed;
}

function mergeArrays(base, local, remote, path) {
  const baseMap = indexItems(base, path);
  const localMap = indexItems(local, path);
  const remoteMap = indexItems(remote, path);
  const merged = new Map();
  for (const key of new Set([...baseMap.keys(), ...localMap.keys(), ...remoteMap.keys()])) {
    const value = mergeValue(baseMap.get(key), localMap.get(key), remoteMap.get(key), `${path}/${key}`);
    if (value !== undefined) {
      merged.set(key, value);
    }
  }

  // Compare only surviving base entries so additions/deletions are not mistaken
  // for a reorder. Preserve the side that changed the order; reject two orders.
  const common = key => baseMap.has(key) && localMap.has(key) && remoteMap.has(key);
  const baseOrder = [...baseMap.keys()].filter(common);
  const localOrder = [...localMap.keys()].filter(common);
  const remoteOrder = [...remoteMap.keys()].filter(common);
  if (!equal(localOrder, baseOrder) && !equal(remoteOrder, baseOrder) && !equal(localOrder, remoteOrder)) {
    throw new SyncConflict(`${path}/order`);
  }
  const primary = !equal(localOrder, baseOrder) ? localMap : remoteMap;
  const secondary = primary === localMap ? remoteMap : localMap;
  const order = [...primary.keys()].filter(key => merged.has(key));
  // Place one-sided additions beside their predecessor instead of moving all
  // additions to the end of the list (keyboard slots and snippet order matter).
  let previous;
  for (const key of secondary.keys()) {
    if (!merged.has(key)) {
      continue;
    }
    if (!order.includes(key)) {
      order.splice(previous === undefined ? 0 : order.indexOf(previous) + 1, 0, key);
    }
    previous = key;
  }
  return order.map(key => merged.get(key));
}

function mergeValue(base, local, remote, path) {
  if (equal(local, remote) || equal(remote, base)) {
    return local;
  }
  if (equal(local, base)) {
    return remote;
  }
  if (Array.isArray(base) && Array.isArray(local) && Array.isArray(remote)) {
    return mergeArrays(base, local, remote, path);
  }
  if (isObject(local) && isObject(remote) && (isObject(base) || base === undefined)) {
    const original = base || {};
    const merged = {};
    for (const key of new Set([...Object.keys(original), ...Object.keys(local), ...Object.keys(remote)])) {
      const value = mergeValue(original[key], local[key], remote[key], `${path}/${key}`);
      if (value !== undefined) {
        Object.defineProperty(merged, key, { value, enumerable: true, writable: true, configurable: true });
      }
    }
    return merged;
  }
  throw new SyncConflict(path);
}

function mergeSettings(base, local, remote) {
  return mergeValue(base, local, remote, 'settings');
}

module.exports = { mergeSettings, SyncConflict };
