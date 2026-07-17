# Toast App Integration Guide

This document provides a basic guide to integrating the Toast app with external services.

> **Note**: For detailed information on OAuth authentication, environment variables, API communication, and more, see the respective dedicated documents:
> - [Cloud Sync](../features/cloud-sync.md) - Settings synchronization and API communication
> - [Environment Variables](../config/environment.md) - Environment variable configuration and management
> - [Security](../architecture/security.md) - Authentication and security topics

## Table of Contents

- [Overview](#overview)
- [Settings Synchronization](#settings-synchronization)
- [Local Data Management](#local-data-management)
- [Error Handling](#error-handling)
- [Security Considerations](#security-considerations)

## Overview

The Toast app integrates with various external services to provide enhanced functionality to users. The main integration features are:

- **Cloud sync**: Cloud storage and synchronization of settings and data
- **Authentication system**: User authentication and permission management
- **API communication**: Data exchange with external services

## Settings Synchronization

The Toast app provides a feature to synchronize user settings (page configuration, theme, etc.) to the cloud.

For more details on cloud sync, see the [Cloud Sync](../features/cloud-sync.md) document.

## Local Data Management

The Toast app stores and manages user data locally in a secure manner:

- **Configuration data**: App settings and page configuration
- **User profile**: Authenticated user information
- **Cache data**: Temporary data for improved performance

For more details, see the [Data Storage](../config/data-storage.md) document.

## Error Handling

The Toast app appropriately handles various network errors and API response errors to preserve the user experience.

### Main Error Handling Strategies

1. **Network connection errors**: Maintain offline functionality using locally stored data
2. **Token expiration errors**: Automatically attempt to refresh using the refresh token
3. **API request failures**: Appropriate retry logic and user notification

### Error Response Format

```json
{
  "success": false,
  "error": "Human readable error message"
}
```

### Handling Empty Files

If a file is corrupted or empty, default values are provided to prevent errors:

```javascript
function getUserProfile() {
  try {
    const profileData = readFromFile(PROFILE_FILE_PATH);

    if (!profileData) {
      // Return an anonymous profile if the file is missing or empty
      return {
        id: 'anonymous',
        name: 'Anonymous User',
        email: '',
        subscription: {
          plan: 'free',
          active: false,
          features: { page_groups: 1 }
        }
      };
    }

    return profileData;
  } catch (error) {
    // Return an anonymous profile if an error occurs
    console.error('Error fetching profile information:', error);
    return getAnonymousProfile();
  }
}
```

## Security Considerations

The Toast app implements several security measures to protect user authentication information and personal data.

For more details on security, see the [Security](../architecture/security.md) document.

### Token Security

1. **Local storage**: Tokens are stored as plaintext JSON in the `auth-tokens.json` file (or `auth-tokens-<suffix>.json` when `CONFIG_SUFFIX` is set) in the user data directory, and OS secure storage (macOS Keychain / Windows DPAPI / Linux Secret Service) is not used
2. **HTTPS communication**: All API communication is encrypted over HTTPS
3. **Token expiration management**: When the access token expires, it is automatically refreshed using the refresh token (default expiration of 1 year, adjustable via `TOKEN_EXPIRES_IN`)

### CSRF Protection

During the OAuth authentication process, a `state` parameter is used to prevent CSRF (Cross-Site Request Forgery) attacks:

```javascript
const { randomUUID } = require('crypto');

// Generate and store state when making the authentication request
const state = randomUUID();
storeStateParam(state);

// Validate state in the authentication response
const storedState = retrieveStoredState();
if (!storedState || state !== storedState) {
  // Respond to a possible CSRF attack
  console.error('State mismatch. Possible CSRF attack');
  return { success: false, error: 'state_mismatch' };
}
```

### Local Data Protection

1. **Sensitive information filtering**: Exclude sensitive information from data stored locally
2. **File access restrictions**: Set appropriate access permissions on the user data directory
3. **Always validate**: Always validate data loaded from files before use
