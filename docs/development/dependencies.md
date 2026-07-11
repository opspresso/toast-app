# Toast App Dependency Management

This document describes the dependency management strategy used by the Toast app, including policies for adding, updating, and maintaining external dependencies.

## Table of Contents

- [Overview](#overview)
- [Dependency Selection Criteria](#dependency-selection-criteria)
- [Current Dependencies](#current-dependencies)
  - [Production Dependencies](#production-dependencies)
  - [Development Dependencies](#development-dependencies)
- [Version Management Policy](#version-management-policy)
- [Updating Dependencies](#updating-dependencies)
- [Security Considerations](#security-considerations)
- [Dependency Auditing](#dependency-auditing)
- [Package Management](#package-management)
- [Handling Compatibility Issues](#handling-compatibility-issues)
- [Common Troubleshooting](#common-troubleshooting)

## Overview

The Toast app uses npm to manage dependencies, with package information stored in `package.json`. This document provides guidelines for evaluating, selecting, and maintaining dependencies throughout the project lifecycle.

## Dependency Selection Criteria

When considering a new dependency, the following criteria are evaluated:

1. **Necessity**: Does the dependency solve a specific problem that would be considerably complex to develop in-house?
2. **Maintenance**: Is the dependency actively maintained with regular updates and security patches?
3. **Community support**: Does the dependency have a solid user base and community support?
4. **Bundle size**: What impact does the dependency have on the application's bundle size?
5. **License**: Does the dependency use a license compatible with our project?
6. **Documentation**: Is the dependency well documented?
7. **Testing**: Is the dependency well tested with good test coverage?

## Current Dependencies

### Production Dependencies

| Dependency | Version | Purpose |
|--------|------|------|
| axios | ^1.16.0 | HTTP client for API requests |
| dotenv | ^16.5.0 | Environment variable management |
| electron-log | ^5.3.4 | Logging utility for Electron |
| electron-store | ^8.1.0 | Simple data persistence for Electron apps |
| electron-updater | ^6.6.2 | Auto-update functionality |
| uiohook-napi | ^1.5.5 | Global keystroke hooking (snippet text expansion, native module) |
| yaml | ^2.8.3 | YAML parsing and generation |

> Unique identifiers use Node.js's built-in `crypto.randomUUID()`.

### Development Dependencies

| Dependency | Version | Purpose |
|--------|------|------|
| electron | ^39.8.5 | Electron framework |
| electron-builder | ^26.6.0 | Application packaging and distribution |
| eslint | ^8.57.0 | JavaScript linting |
| eslint-config-prettier | ^9.1.0 | ESLint configuration for Prettier |
| jest | ^29.7.0 | Testing framework |
| prettier | ^3.2.5 | Code formatting |

## Version Management Policy

The Toast app uses Semantic Versioning (SemVer) for its dependencies:

- **Patch updates** (`^1.0.x`): Automatically allowed for security and bug fixes
- **Minor updates** (`^1.x.0`): Allowed after backward-compatibility testing
- **Major updates** (`^x.0.0`): Require thorough evaluation, testing, and potentially code changes

Dependencies are specified with the caret (`^`) notation to allow automatic patch and minor version updates that maintain backward compatibility.

## Updating Dependencies

Dependencies are updated regularly according to the following process:

1. Run `npm outdated` to identify outdated packages
2. Review the changelogs of packages with available updates
3. Use `npm update` to apply non-breaking changes
4. Test thoroughly after updating
5. Document important dependency changes in the release notes

## Security Considerations

Security is a priority in dependency management:

1. Regular security audits using `npm audit`
2. Prompt resolution of security vulnerabilities
3. Reviewing new dependencies for security impact
4. Monitoring security advisories for existing dependencies

## Dependency Auditing

The project performs regular dependency audits to:

1. Identify and remove unused dependencies
2. Consolidate similar dependencies
3. Verify license compliance
4. Check for security vulnerabilities
5. Assess performance impact

## Package Management

The Toast app uses npm as its primary package manager:

- npm v10 or later is recommended
- package-lock.json is committed to version control to ensure consistent installs
- Use `npm install` to install
- Use `npm install <package>` and `npm install --save-dev <package>` to add new dependencies

## Handling Compatibility Issues

When a dependency introduces breaking changes:

1. Create a dedicated branch for the update
2. Update the dependency and identify affected code
3. Refactor the code to accommodate the changes
4. Add or update tests to verify functionality
5. Document the changes in migration notes
6. Submit a pull request with comprehensive details about the update

## Common Troubleshooting

Common dependency-related issues and how to resolve them:

1. **Dependency conflicts**:
   - Use `npm ls <package>` to inspect the package dependency tree
   - Review and resolve package version conflicts

2. **Build failure after an update**:
   - Temporarily roll back to the previous working version
   - Isolate the problematic dependency
   - Check for environment or configuration issues

3. **Performance degradation**:
   - Profile the application to identify slow components
   - Consider alternatives or optimizations for the problematic dependency
   - Evaluate using code splitting to reduce initial load time
