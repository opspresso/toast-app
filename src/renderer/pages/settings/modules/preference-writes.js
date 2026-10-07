import { config, updateConfig } from './state.js';

/** Boolean IPC failures must remain visible, including native-application failures after a disk write. */
export async function writePreference(operation, failureMessage, refresh = () => {}) {
  try {
    if (await operation() !== true) {
      throw new Error(failureMessage);
    }
    return true;
  }
  catch (error) {
    window.settings.log.error(failureMessage, error);
    const beforeRead = config;
    try {
      const current = await window.settings.getConfig();
      if (current && config === beforeRead) {
        updateConfig({ ...config, ...current });
      }
    }
    catch (readError) {
      window.settings.log.error('Could not reload saved settings:', readError);
    }
    refresh();
    alert(failureMessage);
    return false;
  }
}

export function savePreference(key, value, refresh) {
  return writePreference(() => window.settings.setConfig(key, value), 'Could not save or apply this setting. Please try again.', refresh);
}
