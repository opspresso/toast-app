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
- [Issue Reporting](#issue-reporting)
- [Feature Requests](#feature-requests)
- [Community](#community)

## Code of Conduct

This project and everyone participating in it is governed by our [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code. Please report unacceptable behavior to [project-email@example.com](mailto:project-email@example.com).

## Getting Started

### Prerequisites

- Node.js (v16 or later)
- npm (v7 or later) or yarn
- Git
- Basic knowledge of Electron, JavaScript, and desktop application development

### Fork and Clone

1. Fork the repository on GitHub
2. Clone your fork locally:
   ```
   git clone https://github.com/YOUR-USERNAME/toast-app.git
   cd toast-app
   ```

3. Add the original repository as an upstream remote:
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
2. Configure ESLint and Prettier in your editor
3. Set up the development environment:
   ```
   npm run setup-dev
   ```

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
  npm test
  ```

## Project Structure

Please refer to the [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md) document for a detailed overview of the project structure.

Key directories:
- `src/` - Source code
  - `main/` - Main process code
  - `renderer/` - Renderer process code
  - `common/` - Shared code
- `assets/` - Static assets
- `build/` - Build configuration
- `tests/` - Test files

## Workflow

We follow a feature branch workflow:

1. Ensure your fork is up to date:
   ```
   git fetch upstream
   git checkout main
   git merge upstream/main
   ```

2. Create a new branch for your feature or bugfix:
   ```
   git checkout -b feature/your-feature-name
   ```
   or
   ```
   git checkout -b fix/issue-number-description
   ```

3. Make your changes, following the [coding standards](#coding-standards)

4. Commit your changes with clear, descriptive commit messages:
   ```
   git commit -m "feat: add new button type for custom scripts"
   ```
   or
   ```
   git commit -m "fix: resolve global hotkey conflict on Windows"
   ```

5. Push your branch to your fork:
   ```
   git push origin feature/your-feature-name
   ```

6. Create a pull request from your branch to the main repository

## Pull Request Process

1. Ensure your code follows the [coding standards](#coding-standards)
2. Update documentation as needed
3. Include tests for new features or bug fixes
4. Ensure all tests pass
5. Fill out the pull request template completely
6. Request a review from a maintainer
7. Address any feedback from reviewers
8. Once approved, a maintainer will merge your pull request

## Coding Standards

We follow a set of coding standards to maintain consistency across the codebase:

### JavaScript/TypeScript

- We use ESLint and Prettier for code formatting and linting
- Follow the Airbnb JavaScript Style Guide
- Use ES6+ features where appropriate
- Use async/await for asynchronous code
- Document your code with JSDoc comments

### Commit Messages

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

Types:
- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation changes
- `style`: Changes that do not affect the meaning of the code
- `refactor`: Code changes that neither fix a bug nor add a feature
- `perf`: Performance improvements
- `test`: Adding or correcting tests
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

We use Jest for unit and integration testing. Please ensure your code includes appropriate tests:

### Writing Tests

- Place tests in the `tests/` directory
- Name test files with `.test.js` or `.spec.js` suffix
- Organize tests to mirror the structure of the source code
- Write tests for both success and failure cases
- Mock external dependencies as needed

### Running Tests

```
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch

# Run specific tests
npm test -- -t "test name pattern"
```

### Test Coverage

We aim for high test coverage, especially for critical components:
- Core functionality should have 80%+ coverage
- Critical paths should have 100% coverage
- UI components should have appropriate snapshot or interaction tests

## Documentation

Good documentation is crucial for the project's success:

### Code Documentation

- Use JSDoc comments for functions, classes, and complex code
- Include parameter and return type descriptions
- Document exceptions and edge cases

### Project Documentation

- Update README.md with new features or changes
- Update API documentation when changing interfaces
- Add examples for new functionality
- Keep the user guide up to date

### Documentation Files

- `README.md`: Project overview and quick start
- `ARCHITECTURE.md`: System design and components
- `API_DOCUMENTATION.md`: API reference
- `USER_GUIDE.md`: User instructions
- `CONTRIBUTING.md`: Contribution guidelines (this file)

## Issue Reporting

### Bug Reports

When reporting bugs, please include:

1. A clear, descriptive title
2. Steps to reproduce the issue
3. Expected behavior
4. Actual behavior
5. Screenshots if applicable
6. Environment information:
   - Operating system and version
   - Toast App version
   - Node.js version
   - Any relevant system information

Use the bug report template when creating a new issue.

### Security Issues

For security issues, please do not create a public issue. Instead, email [security@toast-app.example.com](mailto:security@toast-app.example.com) with details about the vulnerability.

## Feature Requests

We welcome feature requests! When suggesting new features:

1. Check if the feature has already been suggested or implemented
2. Use the feature request template
3. Clearly describe the problem the feature would solve
4. Suggest a solution if possible
5. Provide examples of how the feature would be used

## Community

### Communication Channels

- **GitHub Issues**: For bug reports and feature requests
- **GitHub Discussions**: For general questions and discussions
- **Discord**: For real-time communication (link in README)
- **Mailing List**: For announcements and newsletters

### Code Reviews

- Be respectful and constructive in code reviews
- Focus on the code, not the person
- Explain your reasoning for suggested changes
- Be open to alternative approaches

### Recognition

We value all contributions, big and small. Contributors will be recognized in:
- The project README
- Release notes
- A CONTRIBUTORS.md file

## Development Tips

### Debugging

- Use `console.log` for quick debugging
- For more complex debugging:
  ```javascript
  // In main process
  const { app } = require('electron');
  app.on('ready', () => {
    const mainWindow = new BrowserWindow({
      webPreferences: {
        devTools: true
      }
    });
  });
  ```

- Use Chrome DevTools for renderer process debugging
- Use VS Code's debugger for main process debugging

### Common Issues

- **Global Hotkey Registration**: Ensure you're handling platform-specific differences
- **IPC Communication**: Check that channels are correctly named and handlers are registered
- **Window Management**: Be careful with window references and lifecycle events
- **Configuration**: Validate user input to prevent configuration corruption

### Performance Considerations

- Minimize main process workload
- Use IPC sparingly for large data transfers
- Optimize renderer process for smooth UI
- Be mindful of memory usage, especially for long-running processes

## License

By contributing to Toast App, you agree that your contributions will be licensed under the project's [MIT License](LICENSE).

---

Thank you for contributing to Toast App! Your efforts help make this project better for everyone.
