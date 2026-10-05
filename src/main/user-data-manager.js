/** Session-bound profile cache. Settings snapshots belong to the sync manager. */
const { app } = require('electron');
const fs = require('fs');
const path = require('path');
const { createLogger } = require('./logger');
const { getEnv } = require('./config/env');
const { DEFAULT_ANONYMOUS } = require('./constants');

const logger = createLogger('UserDataManager');
const CACHE_TTL_MS = 5 * 60 * 1000;
let client;
let auth;
let generation = 0;
let cached = null;
let pending = null;
const clone = value => JSON.parse(JSON.stringify(value));
const failure = (code, message) => ({ error: { code, message } });

function initialize(apiClient, authManager) {
  client = apiClient;
  auth = authManager;
  generation++;
  cached = pending = null;
}

async function getUserProfile(forceRefresh = false) {
  if (!auth || !client) {
    return failure('PROFILE_NOT_INITIALIZED', 'Profile service is not initialized.');
  }
  const epoch = generation;
  try {
    // hasValidToken also loads or refreshes credentials. Capture the session after it.
    const valid = await auth.hasValidToken();
    if (epoch !== generation) {
      return failure('AUTH_SESSION_CHANGED', 'The account changed during this request.');
    }
    const session = client.getSessionVersion();
    if (!valid) {
      cached = null;
      return client.getAccessToken()
        ? failure('AUTH_UNAVAILABLE', 'Could not refresh the login session. Try again when connected.')
        : { ...clone(DEFAULT_ANONYMOUS), isAuthenticated: false, authSessionVersion: session };
    }
    if (cached?.session !== session) {
      cached = null;
    }
    if (!forceRefresh && cached && Date.now() < cached.expiresAt) {
      return clone(cached.profile);
    }
    if (!pending || pending.session !== session || pending.epoch !== epoch) {
      const request = { session, epoch };
      request.promise = (async () => {
        try {
          const profile = await auth.fetchUserProfile();
          if (epoch !== generation || session !== client.getSessionVersion()) {
            return failure('AUTH_SESSION_CHANGED', 'The account changed during this request.');
          }
          if (profile?.error) {
            cached = null;
            return profile;
          }
          if (!profile || typeof profile.email !== 'string' || !profile.email || !profile.subscription) {
            cached = null;
            return failure('INVALID_PROFILE', 'The server returned an incomplete user profile.');
          }
          const verified = { ...clone(profile), is_authenticated: true, isAuthenticated: true, authSessionVersion: session };
          cached = { session, profile: verified, expiresAt: Date.now() + CACHE_TTL_MS };
          return verified;
        }
        catch (error) {
          if (epoch !== generation || session !== client.getSessionVersion()) {
            return failure('AUTH_SESSION_CHANGED', 'The account changed during this request.');
          }
          cached = null;
          return failure('PROFILE_ERROR', error.message || 'Could not retrieve the user profile.');
        }
        finally {
          if (pending === request) {
            pending = null;
          }
        }
      })();
      pending = request;
    }
    return clone(await pending.promise);
  }
  catch (error) {
    return failure('PROFILE_ERROR', error.message || 'Could not retrieve the user profile.');
  }
}

function cleanupOnLogout() {
  // Invalidate responses before touching disk. Legacy files are never read again.
  generation++;
  cached = pending = null;
  const suffix = getEnv('CONFIG_SUFFIX', '');
  let success = true;
  for (const name of ['user-profile', 'user-settings']) {
    const file = path.join(app.getPath('userData'), `${name}${suffix ? `-${suffix}` : ''}.json`);
    try {
      if (fs.existsSync(file)) {
        fs.unlinkSync(file);
      }
    }
    catch (error) {
      logger.warn('Could not remove a legacy profile/settings cache:', error.code || error.name);
      success = false;
    }
  }
  return success;
}

module.exports = { initialize, getUserProfile, cleanupOnLogout };
