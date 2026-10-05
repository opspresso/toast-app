const { mergeSettings, SyncConflict } = require('../../../src/main/cloud-sync/merge');
const copy = value => JSON.parse(JSON.stringify(value));
const base = {
  pages: [{ id: 'p', name: 'Main', buttons: [
    { shortcut: 'q', name: 'A', action: 'open', url: 'https://a.test' },
    { shortcut: 'w', name: 'B', action: 'open', url: 'https://b.test' },
  ] }],
  snippets: [{ id: 'one', keyword: ':one', content: 'one' }, { id: 'two', keyword: ':two', content: 'two' }],
  appearance: { theme: 'system', opacity: 0.9 },
};

it('merges independent buttons, snippet edits, and appearance fields', () => {
  const local = copy(base);
  const remote = copy(base);
  local.pages[0].buttons[0].name = 'Renamed';
  local.appearance.theme = 'dark';
  remote.pages[0].buttons[1].url = 'https://new.test';
  remote.snippets[0].content = 'remote';
  remote.appearance.opacity = 0.5;
  const merged = mergeSettings(base, local, remote);
  expect(merged.pages[0].buttons.map(b => b.name)).toEqual(['Renamed', 'B']);
  expect(merged.pages[0].buttons[1].url).toBe('https://new.test');
  expect(merged.snippets[0].content).toBe('remote');
  expect(merged.appearance).toEqual({ theme: 'dark', opacity: 0.5 });
  expect(base.pages[0].buttons[0].name).toBe('A');
});

it('propagates local and remote deletions without resurrecting content', () => {
  const local = copy(base);
  const remote = copy(base);
  local.snippets = [];
  remote.pages[0].buttons = [];
  expect(mergeSettings(base, local, remote)).toMatchObject({ snippets: [], pages: [{ buttons: [] }] });
});

it('combines additions while preserving renamed snippet identities', () => {
  const local = copy(base);
  const remote = copy(base);
  local.snippets[0].keyword = ':renamed';
  local.snippets.push({ id: 'three', keyword: ':three', content: 'local' });
  remote.snippets[0].content = 'remote';
  remote.snippets.push({ id: 'four', keyword: ':four', content: 'remote' });
  const merged = mergeSettings(base, local, remote);
  expect(merged.snippets).toContainEqual({ id: 'one', keyword: ':renamed', content: 'remote' });
  expect(new Set(merged.snippets.map(s => s.id))).toEqual(new Set(['one', 'two', 'three', 'four']));
});

it('reports simultaneous edits to the same value', () => {
  const local = copy(base);
  const remote = copy(base);
  local.snippets[0].content = 'local';
  remote.snippets[0].content = 'remote';
  expect(() => mergeSettings(base, local, remote)).toThrow(SyncConflict);
});

it('reports delete versus edit conflicts instead of discarding either change', () => {
  const local = copy(base);
  const remote = copy(base);
  local.snippets.shift();
  remote.snippets[0].content = 'remote';
  expect(() => mergeSettings(base, local, remote)).toThrow(SyncConflict);
});

it('preserves a reorder together with edits and rejects competing reorders', () => {
  const original = { snippets: [...base.snippets, { id: 'three', keyword: ':three', content: 'three' }] };
  const local = copy(original);
  const remote = copy(original);
  local.snippets.reverse();
  remote.snippets[0].content = 'edited';
  expect(mergeSettings(original, local, remote).snippets.map(s => s.id)).toEqual(['three', 'two', 'one']);
  remote.snippets = [remote.snippets[1], remote.snippets[0], remote.snippets[2]];
  expect(() => mergeSettings(original, local, remote)).toThrow(SyncConflict);
});

it('does not guess identities for ambiguous legacy lists', () => {
  const original = { pages: [{ name: 'A' }] };
  expect(() => mergeSettings(original, { pages: [{ name: 'B' }] }, { pages: [{ name: 'C' }] })).toThrow(SyncConflict);
  expect(mergeSettings(original, original, { pages: [] })).toEqual({ pages: [] });
});

it('treats chain actions atomically when they have no stable identity', () => {
  const original = { actions: [{ action: 'exec', command: 'echo base' }] };
  expect(() => mergeSettings(original, { actions: [] }, { actions: [{ action: 'exec', command: 'echo remote' }] })).toThrow(SyncConflict);
});
