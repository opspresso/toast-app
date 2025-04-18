// Jest setup file

// Create the tests directory structure if it doesn't exist
const fs = require('fs');
const path = require('path');

const directories = [
  'tests/unit',
  'tests/integration',
  'tests/e2e',
  'tests/mocks',
];

directories.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Mock Electron
jest.mock('electron', () => require('./mocks/electron'));

// Global setup
beforeAll(() => {
  // Setup code that runs before all tests
  console.log('Starting tests...');
});

// Global teardown
afterAll(() => {
  // Cleanup code that runs after all tests
  console.log('Tests completed.');
});
