# Toast App Environment Variables

This document describes the environment variables that the Toast app actually uses.

## Table of Contents

- [How to Set Environment Variables](#how-to-set-environment-variables)
- [Authentication Variables](#authentication-variables)
- [Token Expiration Variables](#token-expiration-variables)
- [Application Settings Variables](#application-settings-variables)

## How to Set Environment Variables

Environment variables can be set in the following ways:

### 1. Using a .env file (recommended)

Create a `.env` or `.env.local` file in the `src/main/config/` directory to set environment variables.

**Loading priority**: `.env.local` (local development environment) > `.env` (default environment)

```bash
# .env file example
CLIENT_ID=your_client_id
CLIENT_SECRET=your_client_secret
TOAST_URL=https://app.toast.sh
TOKEN_EXPIRES_IN=31536000
NODE_ENV=production
```

```bash
# .env.local file example (takes priority over .env during local development)
CLIENT_ID=local_development_client_id
CLIENT_SECRET=local_development_client_secret
TOAST_URL=http://localhost:3000
NODE_ENV=development
```

### 2. System environment variables

Set them as operating system environment variables:

```bash
# macOS/Linux
export CLIENT_ID=your_client_id
export TOKEN_EXPIRES_IN=31536000

# Windows
set CLIENT_ID=your_client_id
set TOKEN_EXPIRES_IN=31536000
```

## Authentication Variables

These are the environment variables used for user authentication and API communication.

| Variable | Default | Description | Example |
|--------|--------|------|------|
| `CLIENT_ID` | - | OAuth client ID | `toast_app_client_id` |
| `CLIENT_SECRET` | - | OAuth client secret | `your_client_secret` |
| `CONFIG_SUFFIX` | - | When running multiple instances simultaneously, isolates the auth token file (`auth-tokens-${CONFIG_SUFFIX}.json`) and the settings store (`config-${CONFIG_SUFFIX}.json`) together (defaults to `auth-tokens.json` and `config.json` respectively when unset) | `dev` |

### Authentication Variable Example

```bash
# Development environment
CLIENT_ID=development_client_id
CLIENT_SECRET=development_client_secret

# Production environment
CLIENT_ID=production_client_id
CLIENT_SECRET=production_client_secret
```

## Token Expiration Variables

This environment variable is used as the fallback value for the OAuth access token expiration time (the server's `expires_in` response always takes priority).

| Variable | Default | Description | Example |
|--------|--------|------|------|
| `TOKEN_EXPIRES_IN` | `31536000` | Token expiration time (in seconds; negative means indefinite) | `86400` |

### Setting the Token Expiration Time

```bash
# 1 year (default)
TOKEN_EXPIRES_IN=31536000

# Indefinite (negative value)
TOKEN_EXPIRES_IN=-1

# 30 days
TOKEN_EXPIRES_IN=2592000

# 1 day
TOKEN_EXPIRES_IN=86400

# 1 hour
TOKEN_EXPIRES_IN=3600
```

**Token expiration time details**:
- The `expires_in` value in the server response always takes priority; `TOKEN_EXPIRES_IN` is the fallback for when the server does not provide a value.
- **31536000**: 1 year (default setting)
- **Negative value (-1)**: Sets the token as unlimited (effectively permanent)
- **0**: Treated as a falsy value and replaced with the default (1 year)
- **Positive value**: The token is valid for that number of seconds

## Application Settings Variables

These are the environment variables used for the application's basic settings.

| Variable | Default | Description | Example |
|--------|--------|------|------|
| `TOAST_URL` | `https://app.toast.sh` | Toast web service URL | `https://app.toast.sh` |
| `NODE_ENV` | - | Runtime environment mode (development/production) | `development` |
| `AUTO_INSTALL_UPDATES` | - | If `true`, installs updates automatically once the download completes | `true` |

### NODE_ENV Setting

The `NODE_ENV` environment variable determines the application's runtime mode:

- **development**: Runs in development mode (verbose logging, auto-update disabled)
- **production**: Runs in production mode (minimal logging, auto-update enabled)

```bash
# Run in development mode
NODE_ENV=development npm start
# or
npm run dev

# Run in production mode
npm start
```

**Key effects:**
- Auto-update: Enabled only when `NODE_ENV !== 'development'`
- Log level: More verbose logging in development mode
- Environment variable logging: In test mode (`NODE_ENV === 'test'`), logging of environment variable loading is disabled

### Application Settings Example

```bash
# Production environment
TOAST_URL=https://app.toast.sh

# Development environment (when using a local server)
NODE_ENV=development
TOAST_URL=http://localhost:3000
```

## Per-Environment Configuration Examples

### Default Environment (.env)

```bash
# Default production environment settings
CLIENT_ID=production_client_id
CLIENT_SECRET=production_client_secret
TOAST_URL=https://app.toast.sh
TOKEN_EXPIRES_IN=31536000
NODE_ENV=production
```

### Local Development Environment (.env.local)

The `.env.local` file takes priority over `.env` and is ignored by Git:

```bash
# Local development environment settings (overrides production settings)
CLIENT_ID=development_client_id
CLIENT_SECRET=development_client_secret
TOAST_URL=http://localhost:3000
TOKEN_EXPIRES_IN=86400
NODE_ENV=development
```

## Security Considerations

1. **Protecting sensitive information**:
   - Add the `.env` file to `.gitignore`
   - Never commit `CLIENT_SECRET` to a public repository
   - In production environments, using system environment variables is recommended

2. **Separation by environment**:
   - Use different client IDs/secrets for development, test, and production environments
   - Set the appropriate TOAST_URL for each environment

3. **Setting defaults**:
   - Display a clear error message when a required variable is missing
   - Provide a default for TOKEN_EXPIRES_IN

## Troubleshooting

### When environment variables are not recognized

1. Check the `.env` file location: `src/main/config/.env`
2. Check the file encoding: UTF-8
3. Ensure there are no spaces or special characters in variable names
4. Restart the application

### When authentication errors occur

1. Verify the `CLIENT_ID` and `CLIENT_SECRET` values
2. Verify they are the exact values issued by the Toast web service
3. Verify that the correct client information is used for each environment

### Token-related problems

1. Verify the `TOKEN_EXPIRES_IN` value is in the correct format (a number)
2. Use 0 or a negative value to set an indefinite token
3. Verify the token expiration time is not too short

## Related Documents

- [Development Guide](../development/setup.md) - Setting up the development environment
- [Cloud Sync](../features/cloud-sync.md) - Sync-related environment variables
- [Configuration Schema](./schema.md) - Application configuration options
