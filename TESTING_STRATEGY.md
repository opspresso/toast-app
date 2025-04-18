# Toast App Testing Strategy

This document outlines the testing strategy for the Toast App, including testing approaches, tools, and best practices.

## Testing Goals

The primary goals of our testing strategy are to:

1. **Ensure Functionality**: Verify that all features work as expected
2. **Prevent Regressions**: Catch regressions before they reach users
3. **Maintain Quality**: Uphold code quality and performance standards
4. **Cross-Platform Compatibility**: Ensure consistent behavior across platforms
5. **User Experience**: Validate that the application provides a good user experience

## Testing Levels

### Unit Testing

Unit tests focus on testing individual components and functions in isolation.

#### Scope

- Configuration management functions
- Action execution logic
- Utility functions
- Data validation

#### Tools

- **Jest**: Primary testing framework
- **Sinon**: For mocks, stubs, and spies
- **Electron-Mocha**: For Electron-specific testing

#### Example Unit Test

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

Integration tests verify that different parts of the application work together correctly.

#### Scope

- IPC communication
- Window management
- Configuration persistence
- Action execution flow

#### Tools

- **Spectron**: For testing Electron applications
- **Electron-Mocha**: For running tests in Electron context
- **Mock-FS**: For mocking the file system

#### Example Integration Test

```javascript
// Testing the executeAction flow from IPC to action execution
describe('Action Execution Flow', () => {
  let app;

  beforeEach(async () => {
    app = new spectron.Application({
      path: electronPath,
      args: [path.join(__dirname, '..')]
    });

    await app.start();
  });

  afterEach(async () => {
    if (app && app.isRunning()) {
      await app.stop();
    }
  });

  it('should execute a command and return the result', async () => {
    const result = await app.electron.ipcRenderer.invoke('execute-action', {
      action: 'exec',
      command: 'echo "Test"'
    });

    expect(result.success).toBe(true);
    expect(result.stdout.trim()).toBe('Test');
  });
});
```

### End-to-End Testing

End-to-end tests validate complete user flows and scenarios.

#### Scope

- Application startup and initialization
- Global hotkey registration
- Toast window display and interaction
- Settings window functionality
- Button creation and management
- Action execution from UI

#### Tools

- **Spectron**: For automating Electron applications
- **WebdriverIO**: For UI interaction
- **Mocha**: For test structure

#### Example E2E Test

```javascript
// Testing the global hotkey functionality
describe('Global Hotkey', () => {
  let app;

  beforeEach(async () => {
    app = new spectron.Application({
      path: electronPath,
      args: [path.join(__dirname, '..')]
    });

    await app.start();
    await app.client.waitUntilWindowLoaded();
  });

  afterEach(async () => {
    if (app && app.isRunning()) {
      await app.stop();
    }
  });

  it('should show the Toast window when the global hotkey is pressed', async () => {
    // Simulate pressing the global hotkey
    await app.electron.ipcRenderer.send('test-global-hotkey');

    // Check if the Toast window is visible
    const isVisible = await app.browserWindow.isVisible();
    expect(isVisible).toBe(true);
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

- **Testing Library**: For component testing
- **Jest**: For assertions
- **Electron-Mocha**: For running tests in Electron context

#### Example UI Component Test

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

Accessibility tests ensure that the application is usable by people with disabilities.

#### Scope

- Keyboard navigation
- Screen reader compatibility
- Color contrast
- Focus management

#### Tools

- **axe-core**: For automated accessibility testing
- **Lighthouse**: For accessibility audits
- **Manual testing**: With screen readers and keyboard navigation

#### Example Accessibility Test

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

- **Electron DevTools**: For profiling and monitoring
- **Performance API**: For timing measurements
- **Custom monitoring**: For resource usage tracking

#### Example Performance Test

```javascript
// Testing the startup time
describe('Application Startup', () => {
  it('should start in under 2 seconds', async () => {
    const startTime = Date.now();

    const app = new spectron.Application({
      path: electronPath,
      args: [path.join(__dirname, '..')]
    });

    await app.start();
    await app.client.waitUntilWindowLoaded();

    const endTime = Date.now();
    const startupTime = endTime - startTime;

    expect(startupTime).toBeLessThan(2000);

    await app.stop();
  });
});
```

## Testing Environments

### Development Environment

- **Local Testing**: Developers run tests locally before committing code
- **Pre-commit Hooks**: Run linting and unit tests automatically before commits
- **Watch Mode**: Tests run automatically when files change

### Continuous Integration Environment

- **GitHub Actions**: Run tests on every push and pull request
- **Matrix Testing**: Test on multiple platforms (macOS, Windows, Linux)
- **Coverage Reports**: Generate and track test coverage

### Production-like Environment

- **Packaged App Testing**: Test the packaged application
- **User Acceptance Testing**: Manual testing of release candidates
- **Beta Testing**: Distribute to beta testers for real-world feedback

## Test Data Management

### Test Fixtures

- **Configuration Fixtures**: Predefined configuration objects
- **Action Fixtures**: Sample actions for different types
- **Mock File System**: Virtual file system for testing file operations

### Test Doubles

- **Mocks**: Replace external dependencies with controlled implementations
- **Stubs**: Provide canned responses for method calls
- **Spies**: Track method calls and arguments

## Test Coverage

We aim for the following test coverage targets:

- **Unit Tests**: 80% code coverage
- **Integration Tests**: Cover all critical paths
- **E2E Tests**: Cover all main user scenarios

Coverage is measured using Jest's coverage reporter and tracked in CI.

## Testing Best Practices

### General Practices

1. **Test Isolation**: Tests should not depend on each other
2. **Deterministic Tests**: Tests should produce the same results every time
3. **Fast Tests**: Tests should run quickly to encourage frequent testing
4. **Readable Tests**: Tests should be easy to understand and maintain

### Electron-Specific Practices

1. **Main Process Testing**: Test main process modules in isolation
2. **Renderer Process Testing**: Test renderer process code in a browser-like environment
3. **IPC Testing**: Mock IPC channels for testing cross-process communication
4. **Window Management**: Test window creation, showing, hiding, and positioning

## Test Automation

### Continuous Integration

- **Pull Request Checks**: Run tests on every pull request
- **Branch Protection**: Require passing tests before merging
- **Scheduled Tests**: Run full test suite nightly

### Test Reporting

- **Test Results**: Generate JUnit XML reports for CI integration
- **Coverage Reports**: Generate HTML and JSON coverage reports
- **Test Dashboards**: Visualize test results and trends

## Manual Testing

Despite automated testing, some aspects require manual testing:

1. **User Experience**: Subjective aspects of the UI and interactions
2. **Platform-Specific Behavior**: Subtle differences between platforms
3. **Global Hotkey Testing**: System-level keyboard shortcuts
4. **Installation Testing**: Package installation process

## Testing Schedule

- **Pre-commit**: Linting and unit tests
- **Pull Request**: Unit, integration, and selected E2E tests
- **Nightly**: Full test suite including performance tests
- **Release Candidate**: Full test suite plus manual testing
- **Post-release**: Smoke tests to verify deployment

## Test Maintenance

- **Test Refactoring**: Regularly refactor tests to keep them maintainable
- **Test Review**: Review tests during code reviews
- **Test Documentation**: Document testing approach and patterns
- **Test Debt**: Track and address test technical debt

## Conclusion

This testing strategy provides a comprehensive approach to ensuring the quality and reliability of the Toast App. By combining different testing levels and techniques, we can catch issues early and deliver a high-quality product to users.

The strategy should evolve as the application grows and as we learn from our testing experiences.
