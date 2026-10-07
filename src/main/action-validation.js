/** Pure validation for stored buttons and executable actions. */
const MAX_CHAIN_DEPTH = 10;
const SUPPORTED_SCRIPT_TYPES = ['javascript', 'applescript', 'powershell', 'bash'];

/**
 * Test an action without executing it
 * @param {Object} action - Action configuration
 * @param {number} [depth] - Current chain nesting depth (internal use)
 * @returns {Promise<Object>} Validation result
 */
function validateAction(action, depth = 0, { allowInert = false } = {}) {
  try {
    // Validate action
    if (!action || typeof action !== 'object' || Array.isArray(action)) {
      return { valid: false, message: 'No action provided' };
    }

    if (!action.action) {
      return { valid: false, message: 'Action type is required' };
    }

    for (const key of ['name', 'id', 'shortcut', 'icon', 'color', 'applicationPath', 'application', 'applicationParameters', 'command', 'workingDir', 'url', 'path', 'script', 'scriptType']) {
      if (action[key] !== undefined && typeof action[key] !== 'string') {
        return { valid: false, message: `${key} must be a string for ${action.action} action` };
      }
    }
    for (const key of ['runInTerminal', 'stopOnError']) {
      if (action[key] !== undefined && typeof action[key] !== 'boolean') {
        return { valid: false, message: `${key} must be a boolean for ${action.action} action` };
      }
    }
    if (allowInert && action.action === 'script' && action.scriptType === 'special' && action.script === 'confetti') {
      return { valid: true };
    }
    // Validate based on action type
    switch (action.action) {
      case 'application':
        if (allowInert && !action.applicationPath && !action.application) {
          break;
        }
        if (!action.applicationPath?.trim()) {
          return { valid: false, message: 'Application path is required for application action' };
        }
        break;
      case 'exec':
        if (!action.command?.trim()) {
          return { valid: false, message: 'Command is required for exec action' };
        }
        break;
      case 'open':
        if (!action.url?.trim() && !action.path?.trim()) {
          return { valid: false, message: 'URL or path is required for open action' };
        }
        if (typeof action.url === 'string' && /^file:/i.test(action.url.trim())) {
          return { valid: false, message: 'file:// URLs are not allowed for open action; use path instead' };
        }
        break;
      case 'script':
        if (!action.script?.trim()) {
          return { valid: false, message: 'Script content is required for script action' };
        }
        if (!action.scriptType) {
          return { valid: false, message: 'Script type is required for script action' };
        }
        if (!SUPPORTED_SCRIPT_TYPES.includes(String(action.scriptType).toLowerCase())) {
          return { valid: false, message: `Unsupported script type: ${action.scriptType}` };
        }
        break;
      case 'chain':
        if (depth >= MAX_CHAIN_DEPTH) {
          return { valid: false, message: `Chain nesting exceeds maximum depth of ${MAX_CHAIN_DEPTH}` };
        }

        if (!action.actions || !Array.isArray(action.actions) || action.actions.length === 0) {
          return { valid: false, message: 'Actions array is required for chain action' };
        }

        // Validate each action in the chain
        for (let i = 0; i < action.actions.length; i++) {
          const subAction = action.actions[i];
          const validation = validateAction(subAction, depth + 1);

          if (!validation.valid) {
            return {
              valid: false,
              message: `Invalid action at index ${i}: ${validation.message}`,
            };
          }
        }
        break;
      default:
        return { valid: false, message: `Unsupported action type: ${action.action}` };
    }

    return { valid: true };
  }
  catch (error) {
    return {
      valid: false,
      message: `Error validating action: ${error.message}`,
      error,
    };
  }
}

function validatePages(pages) {
  if (!Array.isArray(pages) || pages.length > 9 || Buffer.byteLength(JSON.stringify(pages), 'utf8') > 350000) {
    return { valid: false, message: 'Pages must be an array with at most 9 pages and 350,000 bytes.' };
  }
  const pageIds = new Set();
  for (const page of pages) {
    if (!page || Array.isArray(page) || typeof page.name !== 'string' || !Array.isArray(page.buttons) || page.buttons.length > 15 ||
      (page.id !== undefined && typeof page.id !== 'string') || (page.shortcut !== undefined && typeof page.shortcut !== 'string')) {
      return { valid: false, message: 'Each page needs a name and at most 15 buttons.' };
    }
    if (page.id && pageIds.has(page.id)) {
      return { valid: false, message: 'Page IDs must be unique.' };
    }
    pageIds.add(page.id);
    const buttonIds = new Set();
    for (const button of page.buttons) {
      if (!button || typeof button.name !== 'string') {
        return { valid: false, message: 'Each button needs a name.' };
      }
      const result = validateAction(button, 0, { allowInert: true });
      if (!result.valid) {
        return result;
      }
      if (button.id && buttonIds.has(button.id)) {
        return { valid: false, message: 'Button IDs must be unique within a page.' };
      }
      buttonIds.add(button.id);
    }
  }
  return { valid: true };
}

module.exports = { validateAction, validatePages, MAX_CHAIN_DEPTH };
