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

// Electron is already mocked via jest.config.js moduleNameMapping
// No need to mock here to avoid circular dependency

// Global setup
beforeAll(() => {
  // Setup code that runs before all tests
});

// Global teardown
afterAll(() => {
  // Cleanup code that runs after all tests
});
