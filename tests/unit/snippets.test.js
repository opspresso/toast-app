const { validateSnippets } = require('../../src/main/snippets');

it.each([null, {}, [null], [{ keyword: ':one', content: 1 }], [{ keyword: ':one', content: 'x', enabled: 'true' }]])('rejects invalid snippet collections %j', value => {
  expect(validateSnippets(value).valid).toBe(false);
});
it('applies cloud count and byte limits to native edits', () => {
  expect(validateSnippets(Array.from({ length: 501 }, () => ({ keyword: ':one', content: 'x' }))).valid).toBe(false);
  expect(validateSnippets([{ keyword: ':one', content: 'x'.repeat(40000) }]).valid).toBe(false);
});
it('accepts empty arrays and enforces ID uniqueness', () => {
  expect(validateSnippets([]).valid).toBe(true);
  expect(validateSnippets([{ id: 'same', keyword: ':one', content: 'x' }, { id: 'same', keyword: ':two', content: 'y' }]).valid).toBe(false);
});
