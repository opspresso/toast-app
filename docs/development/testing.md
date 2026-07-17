# Toast App Testing Strategy

This document describes the Toast app's testing strategy, including the testing approach, tools, and best practices.

> **Current status**: The test infrastructure is set up, and unit tests are implemented for the main features.
> - ✅ Jest configured
> - ✅ Test directory structure created
> - ✅ 38 test suites, 1107 unit test cases implemented
> - ❌ Integration tests and E2E tests not yet implemented

## Table of Contents

- [Testing Goals](#testing-goals)
- [Testing Levels](#testing-levels)
  - [Unit Testing](#unit-testing)
  - [Integration Testing](#integration-testing)
  - [End-to-End Testing](#end-to-end-testing)
  - [UI Component Testing](#ui-component-testing)
  - [Accessibility Testing](#accessibility-testing)
  - [Performance Testing](#performance-testing)
- [Testing Environments](#testing-environments)
- [Test Data Management](#test-data-management)
- [Test Coverage](#test-coverage)
- [Testing Best Practices](#testing-best-practices)
- [Test Reporting](#test-reporting)
- [Manual Testing](#manual-testing)
- [Testing Schedule](#testing-schedule)
- [Test Maintenance](#test-maintenance)

## Testing Goals

The main goals of the testing strategy are:

1. **Ensure functionality**: Verify that all features work as expected
2. **Prevent regressions**: Catch regressions before they reach users
3. **Maintain quality**: Uphold code quality and performance standards
4. **Cross-platform compatibility**: Ensure consistent behavior across platforms
5. **User experience**: Validate that the application delivers a good user experience

## Testing Levels

### Unit Testing

Unit tests focus on testing individual components and functions in isolation.

#### Scope

- Configuration management functions
- Action execution logic
- Utility functions
- Data validation

#### Tools

- **Jest**: The primary testing framework

#### Unit Test Example

```javascript
// Testing the validateAction function in executor.js
describe('validateAction', () => {
  it('should validate a valid exec action', async () => {
    const action = {
      action: 'exec',
      command: 'echo "Hello, world!"'
    };

    const result = await validateAction(action);
    expect(result.valid).toBe(true);
  });

  it('should invalidate an exec action without a command', async () => {
    const action = {
      action: 'exec'
    };

    const result = await validateAction(action);
    expect(result.valid).toBe(false);
    expect(result.message).toContain('Command is required');
  });
});
```

### Integration Testing

Integration tests verify that different parts of the application work correctly together.

#### Scope

- IPC communication
- Window management
- Configuration persistence
- Action execution flow

#### Tools

- **Jest**: Testing framework
- **Mock-FS**: A tool for mocking the file system (install as needed)

#### Integration Test Example

```javascript
// Testing the executeAction flow
describe('Action Execution Flow', () => {
  it('should execute a command and return the result', async () => {
    const { executeAction } = require('../src/main/executor');

    const result = await executeAction({
      action: 'exec',
      command: 'echo "Test"'
    });

    expect(result.success).toBe(true);
    expect(result.output).toContain('Test');
  });
});
```

### End-to-End Testing

End-to-end tests validate complete user flows and scenarios.

#### Scope

- Application startup and initialization
- Global shortcut registration
- Toast window display and interaction
- Settings window functionality
- Button creation and management
- Action execution from the UI

#### Tools

- **Jest**: Testing framework
- **Electron Testing Library**: A tool for UI testing (install as needed)

#### End-to-End Test Example

```javascript
// Testing the global hotkey functionality
describe('Global Hotkey', () => {
  it('should register global shortcuts', () => {
    const { registerGlobalShortcuts } = require('../src/main/shortcuts');
    const mockConfig = { get: jest.fn().mockReturnValue('Alt+Space') };
    const mockWindows = { toast: { show: jest.fn() } };

    const result = registerGlobalShortcuts(mockConfig, mockWindows);
    expect(result).toBe(true);
  });
});
```

### UI Component Testing

UI component tests focus on the behavior and appearance of UI components.

#### Scope

- Toast window components
- Settings window components
- Button rendering
- Form controls
- Dialogs

#### Tools

- **Jest**: Testing framework
- **JSDOM**: DOM environment simulation

#### UI Component Test Example

```javascript
// Testing the Button component
describe('Button Component', () => {
  it('should render a button with the correct properties', async () => {
    // Set up the test environment
    document.body.innerHTML = `<div id="test-container"></div>`;
    const container = document.getElementById('test-container');

    // Create a button
    const button = createButtonElement({
      name: 'Test Button',
      shortcut: 'T',
      icon: '🔘',
      action: 'exec',
      command: 'echo "Test"'
    });

    // Add the button to the container
    container.appendChild(button);

    // Check the button properties
    expect(button.querySelector('.button-name').textContent).toBe('Test Button');
    expect(button.querySelector('.button-shortcut').textContent).toBe('T');
    expect(button.querySelector('.button-icon').textContent).toBe('🔘');
  });
});
```

### Accessibility Testing

Accessibility tests verify that the application is usable by people with disabilities.

#### Scope

- Keyboard navigation
- Screen reader compatibility
- Color contrast
- Focus management

#### Tools

- **Jest**: The base testing framework
- **Manual testing**: Testing with screen readers and keyboard navigation

#### Accessibility Test Example

```javascript
// Testing keyboard navigation in the Toast window
describe('Keyboard Navigation', () => {
  it('should allow navigating between buttons using arrow keys', async () => {
    // Set up the test environment
    document.body.innerHTML = `
      <div id="buttons-container">
        <div class="toast-button" tabindex="0">Button 1</div>
        <div class="toast-button" tabindex="0">Button 2</div>
        <div class="toast-button" tabindex="0">Button 3</div>
      </div>
    `;

    // Focus the first button
    const buttons = document.querySelectorAll('.toast-button');
    buttons[0].focus();

    // Simulate pressing the down arrow key
    const event = new KeyboardEvent('keydown', { key: 'ArrowDown' });
    document.dispatchEvent(event);

    // Check if the second button is focused
    expect(document.activeElement).toBe(buttons[1]);
  });
});
```

### Performance Testing

Performance tests measure the application's resource usage and responsiveness.

#### Scope

- Startup time
- Memory usage
- CPU usage
- Action execution time
- UI responsiveness

#### Tools

- **Jest**: The base framework for performance tests
- **Performance API**: An API for time measurement
- **Custom monitoring**: A tool for tracking resource usage

#### Performance Test Example

```javascript
// Testing function performance
describe('Performance Tests', () => {
  it('should execute actions quickly', async () => {
    const { executeAction } = require('../src/main/executor');
    const startTime = performance.now();

    await executeAction({
      action: 'exec',
      command: 'echo "Performance test"'
    });

    const endTime = performance.now();
    const executionTime = endTime - startTime;

    expect(executionTime).toBeLessThan(1000); // Less than 1 second
  });
});
```

## Testing Environments

### Development Environment

- **Local testing**: Developers run tests locally before committing code
- **Watch mode**: `npx jest --watch` automatically runs tests when files change

### Continuous Integration Environment

- **GitHub Actions**:
  - `test.yml`: Automatically runs `npm run lint` + `npm test` on every push and PR to the main branch (ubuntu-latest, Node 22)
  - `build-release.yml`: Runs release builds on tag push (macOS/Windows)

### Production-Like Environment

- **Packaged app testing**: Testing the packaged application
- **User acceptance testing**: Manual testing of release candidates
- **Beta testing**: Distributing to beta testers for real-world usage feedback

## Test Data Management

### Test Fixtures

- **Configuration fixtures**: Predefined configuration objects
- **Action fixtures**: Sample actions of various types
- **Mock file system**: A virtual file system for testing file operations

### Test Doubles

- **Mocks**: Replace external dependencies with controlled implementations
- **Stubs**: Provide predefined responses to method calls
- **Spies**: Track method calls and arguments

## Test Coverage

The following test coverage goals are set:

- **Unit tests**: 80% code coverage
- **Integration tests**: Cover all critical paths
- **E2E tests**: Cover all major user scenarios

Coverage is measured using Jest's coverage reporter (generated in the `coverage/` directory).

## Testing Best Practices

### General Practices

1. **Test isolation**: Tests should not depend on each other
2. **Deterministic tests**: Tests should produce the same result every time
3. **Fast tests**: Tests should run quickly to encourage frequent testing
4. **Readable tests**: Tests should be easy to understand and maintain

### Electron-Specific Practices

1. **Main process testing**: Test main process modules in isolation
2. **Renderer process testing**: Test renderer process code in a browser-like environment
3. **IPC testing**: Mock IPC channels to test inter-process communication
4. **Window management**: Test window creation, display, hiding, and positioning

## Test Reporting

- **Coverage reports**: On each Jest run, `text` (console), `lcov` (with HTML), and `clover` (XML) coverage reports are generated in the `coverage/` directory

## Manual Testing

Despite automated testing, some aspects require manual testing:

1. **User experience**: Subjective aspects of the UI and interactions
2. **Platform-specific behavior**: Subtle differences across platforms
3. **Global shortcut testing**: System-level keyboard shortcuts
4. **Installation testing**: The package installation process

## Testing Schedule

- **Before commit**: Linting and unit tests
- **Pull request**: Unit, integration, and selected E2E tests
- **Nightly**: Full test suite including performance tests
- **Release candidate**: Full test suite including manual testing
- **Post-release**: Smoke tests to confirm deployment

## Test Maintenance

- **Test refactoring**: Refactor tests regularly to keep them maintainable
- **Test review**: Review tests during code review
- **Test documentation**: Document the testing approach and patterns
- **Test debt**: Track and resolve test technical debt
