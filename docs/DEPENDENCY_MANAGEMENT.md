# Dependency Management

This document outlines the dependency management strategy used in the Toast App, including policies for adding, updating, and maintaining external dependencies.

## Table of Contents

- [Dependency Management](#dependency-management)
  - [Table of Contents](#table-of-contents)
  - [Overview](#overview)
  - [Dependency Selection Criteria](#dependency-selection-criteria)
  - [Current Dependencies](#current-dependencies)
    - [Production Dependencies](#production-dependencies)
    - [Development Dependencies](#development-dependencies)
  - [Versioning Policy](#versioning-policy)
  - [Updating Dependencies](#updating-dependencies)
  - [Security Considerations](#security-considerations)
  - [Dependency Auditing](#dependency-auditing)
  - [Package Management](#package-management)
  - [Handling Breaking Changes](#handling-breaking-changes)
  - [Troubleshooting Common Issues](#troubleshooting-common-issues)

## Overview

Toast App manages dependencies using Yarn, with package information stored in `package.json`. This document provides guidelines on how dependencies are evaluated, selected, and maintained throughout the project lifecycle.

## Dependency Selection Criteria

When considering new dependencies, the following criteria are evaluated:

1. **Necessity**: Does the dependency solve a specific problem that would be significantly more complex to solve in-house?
2. **Maintenance**: Is the dependency actively maintained with regular updates and security patches?
3. **Community Support**: Does the dependency have a robust user base and community support?
4. **Bundle Size**: What impact will the dependency have on the application's bundle size?
5. **License**: Does the dependency use a license compatible with our project?
6. **Documentation**: Is the dependency well-documented?
7. **Testing**: Is the dependency well-tested with good test coverage?

## Current Dependencies

### Production Dependencies

| Dependency | Version | Purpose |
|------------|---------|---------|
| @nut-tree-fork/nut-js | ^4.2.6 | Native UI automation for keyboard shortcuts |
| axios | ^1.8.4 | HTTP client for API requests |
| dotenv | ^16.5.0 | Environment variable management |
| electron-log | ^5.3.4 | Logging utility for Electron |
| electron-store | ^8.1.0 | Simple data persistence for Electron apps |
| electron-updater | ^6.6.2 | Auto-update functionality |
| uuid | ^11.1.0 | Generation of unique identifiers |
| yaml | ^2.7.1 | YAML parsing and generation |

### Development Dependencies

| Dependency | Version | Purpose |
|------------|---------|---------|
| @electron/notarize | ^3.0.1 | Code signing for macOS |
| electron | ^35.1.5 | Electron framework |
| electron-builder | ^26.0.12 | Application packaging and distribution |
| electron-builder-notarize | ^1.5.2 | Notarization helper for electron-builder |
| eslint | ^8.57.0 | JavaScript linting |
| eslint-config-prettier | ^9.1.0 | ESLint configuration for Prettier |
| jest | ^29.7.0 | Testing framework |
| prettier | ^3.2.5 | Code formatting |

## Versioning Policy

The Toast App uses semantic versioning (SemVer) for dependencies:

- **Patch updates** (`^1.0.x`): Automatically accepted for security fixes and bug fixes
- **Minor updates** (`^1.x.0`): Accepted after testing for backward compatibility
- **Major updates** (`^x.0.0`): Require thorough evaluation, testing, and potentially code changes

Dependencies are specified with caret (`^`) notation to allow for automatic patch and minor version updates that maintain backward compatibility.

## Updating Dependencies

Dependencies are regularly updated following this process:

1. Run `yarn outdated` to identify outdated packages
2. Research changelogs for packages with available updates
3. Update non-breaking changes with `yarn upgrade-interactive --latest`
4. Test thoroughly after updates
5. Document significant dependency changes in release notes

Automated dependency updates are configured through GitHub Dependabot, which creates pull requests for dependency updates that pass initial verification.

## Security Considerations

Security is a priority in dependency management:

1. Regular security audits using `yarn audit`
2. Prompt addressing of security vulnerabilities
3. Review of new dependencies for security implications
4. Monitoring security advisories for existing dependencies

## Dependency Auditing

The project conducts regular dependency audits to:

1. Identify and remove unused dependencies
2. Consolidate similar dependencies
3. Verify license compliance
4. Check for security vulnerabilities
5. Evaluate performance impact

## Package Management

The Toast App uses Yarn as the primary package manager:

- Yarn v1.22.x is the standard version
- Yarn.lock is committed to version control to ensure consistent installations
- `yarn` is used for installation
- `yarn add` and `yarn add --dev` are used for adding new dependencies

## Handling Breaking Changes

When a dependency introduces breaking changes:

1. Create a dedicated branch for the update
2. Update the dependency and identify affected code
3. Refactor code to accommodate changes
4. Add or update tests to verify functionality
5. Document changes in migration notes
6. Submit a pull request with comprehensive details about the update

## Troubleshooting Common Issues

Common dependency-related issues and their solutions:

1. **Conflicting Dependencies**:
   - Use `yarn why <package>` to understand why a package is installed
   - Review and resolve package version conflicts

2. **Build Failures After Updates**:
   - Roll back to previous working versions temporarily
   - Isolate the problematic dependency
   - Check for environment or configuration issues

3. **Performance Degradation**:
   - Profile the application to identify slow components
   - Consider alternatives or optimizations for problematic dependencies
   - Evaluate the use of code splitting to reduce initial load times