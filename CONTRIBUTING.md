# Contributing to Toast App

Thank you for your interest in contributing to Toast App! This document provides guidelines and instructions for contributing to the project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Environment](#development-environment)
- [Project Structure](#project-structure)
- [Workflow](#workflow)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Testing](#testing)
- [Documentation](#documentation)
- [Reporting Issues](#reporting-issues)
- [Feature Requests](#feature-requests)
- [Community](#community)

## Code of Conduct

Please collaborate with a respectful attitude toward one another. If you encounter inappropriate behavior, report it privately through [GitHub Issues](https://github.com/opspresso/toast-app/issues) or to a repository maintainer.

## Getting Started

### Prerequisites

- Node.js (v20.18 or higher, per `engines.node` in `package.json`)
- npm (v10 or higher)
- Git
- Basic knowledge of Electron, JavaScript, and desktop application development

### Fork and Clone

1. Fork the repository on GitHub
2. Clone your fork locally:
   ```
   git clone https://github.com/YOUR-USERNAME/toast-app.git
   cd toast-app
   ```

3. Add the original repository as the upstream remote:
   ```
   git remote add upstream https://github.com/opspresso/toast-app.git
   ```

4. Install dependencies:
   ```
   npm install
   ```

5. Start the development server:
   ```
   npm run dev
   ```

## Development Environment

### Recommended Tools

- **Visual Studio Code** with the following extensions:
  - ESLint
  - Prettier
  - Debugger for Chrome/Electron
  - Jest
- **Chrome DevTools** for debugging
- **Git** for version control

### Environment Setup

1. Install the recommended tools
2. Configure ESLint and Prettier in your editor (using `.eslintrc.js` and `.prettierrc` in the repository root)
3. Install dependencies: `npm install`

### Running the Application

- **Development mode**:
  ```
  npm run dev
  ```

- **Production build**:
  ```
  npm run build
  ```

- **Testing**:
  ```
  npm run test
  ```

## Project Structure

For a detailed overview of the project structure, see the [docs/development/setup.md](docs/development/setup.md) document.

Main directories:
- `src/` - Source code
  - `main/` - Main process code
  - `renderer/` - Renderer process code
  - `index.js` - Application entry point
- `assets/` - Static assets
- `tests/` - Test files

## Workflow

We follow a feature branch workflow:

1. Make sure your fork is up to date:
   ```
   git fetch upstream
   git checkout main
   git merge upstream/main
   ```

2. Create a new branch for your feature or bug fix:
   ```
   git checkout -b feature/your-feature-name
   ```
   or
   ```
   git checkout -b fix/issue-number-description
   ```

3. Make your changes following the [Coding Standards](#coding-standards)

4. Commit your changes with a clear, descriptive commit message:
   ```
   git commit -m "feat: add new button type for custom scripts"
   ```
   or
   ```
   git commit -m "fix: resolve global hotkey conflict on Windows"
   ```

5. Push the branch to your fork:
   ```
   git push origin feature/your-feature-name
   ```

6. Create a pull request from your branch to the main repository

## Pull Request Process

1. Ensure your code follows the [Coding Standards](#coding-standards)
2. Update documentation as needed
3. Include tests for new features or bug fixes
4. Make sure all tests pass
5. Clearly describe what changed and why in the pull request description
6. Request a review from the maintainers
7. Address feedback from reviewers
8. Once approved, a maintainer will merge the pull request

## Coding Standards

We follow a set of coding standards to maintain consistency across the codebase:

### JavaScript/TypeScript

- Use ESLint and Prettier for code formatting and linting
- Follow the ESLint recommended rules (`eslint:recommended`) and the Prettier configuration
- Use ES6+ features where appropriate
- Use async/await for asynchronous code
- Document code with JSDoc comments

### Commit Messages

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Changes that do not affect the meaning of the code
- `refactor`: Code changes that neither fix a bug nor add a feature
- `perf`: Performance improvements
- `test`: Adding or modifying tests
- `chore`: Changes to the build process or auxiliary tools

Examples:
```
feat(button): add new script action type
fix(shortcut): resolve global hotkey conflict on Windows
docs: update README with new features
```

### Code Quality

- Write self-documenting code with clear variable and function names
- Keep functions small and focused on a single responsibility
- Avoid deep nesting of conditionals and loops
- Use meaningful comments to explain complex logic
- Handle errors appropriately
- Avoid code duplication

## Testing

We use Jest for unit and integration tests. Make sure your code includes appropriate tests:

### Writing Tests

- Place tests in the `tests/` directory
- Name test files with a `.test.js` or `.spec.js` suffix
- Structure tests to mirror the structure of the source code
- Write tests for both success and failure cases
- Mock external dependencies as needed

### Running Tests

```
# Run all tests
npm run test

# Run tests with coverage
npx jest --coverage

# Run tests in watch mode
npx jest --watch

# Run specific tests (by name pattern matching)
npx jest -t "test name pattern"
```

> Variants other than `test` are not registered as separate scripts in `package.json`, so call `npx jest` directly.

### Test Coverage

We aim for high test coverage, especially for critical components:
- 80%+ coverage for core functionality
- 100% coverage for critical paths
- Appropriate snapshot or interaction tests for UI components

## Documentation

Good documentation is essential to the success of the project:

### Code Documentation

- Use JSDoc comments for functions, classes, and complex code
- Include descriptions of parameters and return types
- Document exceptions and edge cases

### Project Documentation

- Update README.md with new features or changes
- Update API documentation when interfaces change
- Add examples for new features
- Keep the user guide up to date

### Documentation Files

- `README.md`: Project overview and quick start
- `docs/architecture/overview.md`: System design and components
- `docs/api/`: API reference
- `docs/guide/user.md`: User instructions
- `CONTRIBUTING.md`: Contributing guidelines (this file)

## Reporting Issues

### Bug Reports

When reporting a bug, please include:

1. A clear, descriptive title
2. Steps to reproduce the issue
3. Expected behavior
4. Actual behavior
5. Screenshots, if applicable
6. Environment information:
   - Operating system and version
   - Toast App version
   - Node.js version
   - Relevant system information

### Security Issues

For security issues, do not create a public issue. Instead, report it privately through the **Security → Report a vulnerability** menu of the GitHub repository ([Security Advisories](https://github.com/opspresso/toast-app/security/advisories/new)).

## Feature Requests

Feature requests are welcome! When proposing a new feature:

1. Check whether the feature has already been proposed or implemented
2. Clearly describe the problem the feature would solve
3. Propose a solution if possible
4. Provide examples of how the feature would be used

## Community

### Communication Channels

- **GitHub Issues**: For bug reports and feature requests
- **GitHub Discussions**: For general questions and discussions

### Code Reviews

- Be respectful and constructive in code reviews
- Focus on the code, not the person
- Explain the reasoning behind suggested changes
- Be open to alternative approaches

### Recognition

We value all contributions, large and small. Contributors are recognized in:
- The project README
- Release notes

## Development Tips

### Debugging

- Use `console.log` for quick debugging
- For more complex debugging:
  ```javascript
  // In the main process
  const { app } = require('electron');
  app.on('ready', () => {
    const mainWindow = new BrowserWindow({
      webPreferences: {
        devTools: true
      }
    });
  });
  ```

- Use Chrome DevTools for debugging the renderer process
- Use the VS Code debugger for debugging the main process

### Common Issues

- **Global shortcut registration**: Make sure you handle platform-specific differences
- **IPC communication**: Verify that channels are named correctly and handlers are registered
- **Window management**: Pay attention to window references and lifecycle events
- **Configuration**: Validate user input to prevent configuration corruption

### Performance Considerations

- Minimize the workload in the main process
- Minimize IPC usage for large data transfers
- Optimize the renderer process for a smooth UI
- Pay attention to memory usage, especially for long-running processes

## License

By contributing to Toast App, you agree that your contributions will be licensed under the project's [MIT License](LICENSE).
