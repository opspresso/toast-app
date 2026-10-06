const fs = require('fs');
const vm = require('vm');
const path = require('path');
const source = fs.readFileSync(path.join(__dirname, '../../../src/renderer/pages/toast/modules/local-icon-utils.js'), 'utf8');
const context = vm.createContext({ module: { exports: {} } });
vm.runInContext(source.replace(/export \{[^}]+\};/, '') + '\nmodule.exports = { getAppNameFromOpenCommand };', context);
const { getAppNameFromOpenCommand } = context.module.exports;
it.each([
  ['open -a Mail --args --example', 'Mail'],
  ['open -a "Visual Studio Code" ~/project', 'Visual Studio Code'],
  ["open -a 'App With Spaces' --args", 'App With Spaces'],
  ['open -a zoom.us', 'zoom.us'],
  ['open -a "Odd \\"Name\\""', 'Odd "Name"'],
  ['open -a "Unclosed', null],
  ['echo open -a Mail', null],
  ['', null],
])('extracts only the literal application from %s', (command, expected) => {
  expect(getAppNameFromOpenCommand(command)).toBe(expected);
});
