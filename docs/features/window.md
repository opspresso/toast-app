# Toast App Window Show/Hide Behavior

This document provides a detailed technical description of the Toast app's window show and hide mechanism.

## Table of Contents

- [Overview](#overview)
- [Window Show/Hide Behavior Summary](#window-showhide-behavior-summary)
- [Situations Where the Window Is Hidden](#situations-where-the-window-is-hidden)
  - [Focus Loss (Blur Event)](#focus-loss-blur-event)
  - [ESC Key Press](#esc-key-press)
  - [After Executing a Button Action](#after-executing-a-button-action)
  - [Global Shortcut Toggle](#global-shortcut-toggle)
  - [Explicit Calls](#explicit-calls)
- [Exceptional Situations Where the Window Is Not Hidden](#exceptional-situations-where-the-window-is-not-hidden)
  - [When a Modal Window Is Open](#when-a-modal-window-is-open)
  - [When Login Is in Progress](#when-login-is-in-progress)
  - [Exceptions Based on Settings](#exceptions-based-on-settings)
  - [When the ESC Key Is Used for Another Purpose in Settings Mode](#when-the-esc-key-is-used-for-another-purpose-in-settings-mode)
- [Related Settings Options](#related-settings-options)
- [Conclusion](#conclusion)

## Overview

The Toast app is an Electron-based productivity tool that provides various actions triggered by user-defined shortcuts. This document covers how and when the app's main window appears and hides, and the settings that control this behavior.

## Window Show/Hide Behavior Summary

Toast App shows the window in the following situations:
- When the global shortcut (default: Alt+Space) is pressed
- When the toast-display API is called
- When the "Open Toast" option is selected from the system tray icon menu

The window is hidden automatically or explicitly in the following situations:
- When the window loses focus (depending on settings)
- When the ESC key is pressed (depending on settings)
- After executing a button action (depending on settings)
- When the toast close button is clicked
- When the global shortcut toggle is triggered

In certain situations, hiding the window is prevented:
- When a modal window is open
- When the login process is in progress
- When a specific setting is disabled

## Situations Where the Window Is Hidden

### Focus Loss (Blur Event)

When the user moves focus to another window, the toast window is hidden. This is implemented in the `windows.js` file as follows:

```javascript
toastWindow.on('blur', () => {
  const hideOnBlur = config.get('advanced.hideOnBlur');
  const loginInProgress = isLoginProcessActive();

  if (loginInProgress) {
    return;
  }

  if (hideOnBlur !== false && !isModalOpened()) {
    toastWindow.webContents.send('before-hide');
    toastWindow.hide();
  }
});
```

The window is hidden when all of the following conditions are met:
- The `advanced.hideOnBlur` setting is enabled (default: true)
- The login process is not in progress
- No modal is open

### ESC Key Press

When the user presses the ESC key, the window is hidden. This is handled by the renderer process's keyboard handler (`src/renderer/pages/toast/modules/keyboard.js`):

```javascript
case 'Escape':
  // Exit edit mode when ESC key is pressed in settings mode
  // Note: Modal closing is handled separately when modal is open
  if (isSettingsMode && !buttonEditModal.classList.contains('show')) {
    event.preventDefault();
    toggleSettingsMode();
  }
  else if (!isSettingsMode) {
    // Hide window when ESC is pressed in normal mode (if hideOnEscape is enabled)
    event.preventDefault();
    window.toast.getConfig('advanced.hideOnEscape').then(hideOnEscape => {
      if (hideOnEscape !== false) {
        hideToastWindow();
      }
    });
  }
  break;
```

In addition, the `keydown` handler in `src/renderer/preload/toast.js` also checks the modal state and the `advanced.hideOnEscape` setting before sending `hide-toast`.

The window is hidden when the following conditions are met:
- The `advanced.hideOnEscape` setting is enabled (default: true)
- No modal is open
- In settings mode, ESC is used to toggle settings mode

### After Executing a Button Action

After a button action completes successfully, the window is hidden automatically:

```javascript
async function executeButton(button) {
  // ... action execution code ...

  const result = await window.toast.executeAction(action);
  if (result.success) {
    const hideAfterAction = await window.toast.getConfig('advanced.hideAfterAction');
    if (hideAfterAction) {
      window.toast.hideWindow();
    }
  } else {
    // Failure handling
  }
}
```

The window is hidden when the following conditions are met:
- The `advanced.hideAfterAction` setting is enabled (default: true)
- The button action completes successfully

### Global Shortcut Toggle

The global shortcut toggles the window. Pressing the same shortcut while the window is shown hides it:

```javascript
function toggleToastWindow(toastWindow, config) {
  if (!toastWindow) {
    console.error('Toast window not available');
    return;
  }

  if (toastWindow.isVisible()) {
    toastWindow.hide();
  } else {
    // Window display logic...
  }
}
```

### Explicit Calls

The window can be hidden by the following explicit calls:
- Calling `window.toast.hideWindow()` when the close button is clicked
- When a `hide-toast` event occurs through the IPC channel
- When the `hideToastWindow()` function is called directly in the main process

## Exceptional Situations Where the Window Is Not Hidden

### When a Modal Window Is Open

When a modal window is open, the toast window is not hidden. This is implemented in `ipc.js` by tracking the modal state:

```javascript
let isModalOpen = false;

function isModalOpened() {
  return isModalOpen;
}

ipcMain.on('modal-state-changed', (event, open) => {
  isModalOpen = open;
});
```

The renderer process updates this state when a modal opens or closes:

```javascript
function editButtonSettings(button) {
  // ... code that opens and configures the button edit modal ...

  // Notify the main process that a modal is open
  window.toast.setModalOpen(true);

  // Show the modal
  buttonEditModal.classList.add('show');
}

function closeButtonEditModal() {
  // Notify the main process that the modal is closed
  window.toast.setModalOpen(false);

  buttonEditModal.classList.remove('show');
}
```

In this way, hiding the window is prevented when the following modals are open:
- Button edit modal
- User profile modal
- Other application modals

### When Login Is in Progress

The window is not hidden while login is in progress, such as during the OAuth authentication process:

```javascript
// windows.js
const loginInProgress = isLoginProcessActive();

if (loginInProgress) {
  return;
}
```

The login state is managed in `auth.js` and `auth-manager.js` and is maintained until the authentication token exchange process completes.

### Exceptions Based on Settings

If the user has disabled a specific setting, window hiding caused by that behavior does not occur:

- `advanced.hideOnBlur`: When set to false, the window is not hidden even when it loses focus
- `advanced.hideOnEscape`: When set to false, the window is not hidden even when the ESC key is pressed
- `advanced.hideAfterAction`: When set to false, the window is not hidden even after an action runs

### When the ESC Key Is Used for Another Purpose in Settings Mode

In settings mode, the ESC key is used to exit settings mode instead of hiding the window:

```javascript
// In src/renderer/pages/toast/modules/keyboard.js
case 'Escape':
  // Exit edit mode when ESC key is pressed in settings mode
  // Note: Modal closing is handled separately when modal is open
  if (isSettingsMode && !buttonEditModal.classList.contains('show')) {
    event.preventDefault();
    toggleSettingsMode();
  }
  break;
```

In this case, the window remains visible despite the ESC key press.

## Related Settings Options

The Toast App's window show/hide behavior can be controlled by the user through the following settings defined in `config.js`:

```javascript
advanced: {
  type: 'object',
  properties: {
    launchAtLogin: {
      type: 'boolean',
      default: false
    },
    hideAfterAction: {
      type: 'boolean',
      default: true
    },
    hideOnBlur: {
      type: 'boolean',
      default: true
    },
    hideOnEscape: {
      type: 'boolean',
      default: true
    },
    showInTaskbar: {
      type: 'boolean',
      default: false
    }
  },
  default: {
    launchAtLogin: false,
    hideAfterAction: true,
    hideOnBlur: true,
    hideOnEscape: true,
    showInTaskbar: false
  }
}
```

### Settings Descriptions

| Setting | Default | Description |
|------|--------|------|
| `hideAfterAction` | `true` | Whether to hide the window automatically after a button action runs |
| `hideOnBlur` | `true` | Whether to hide the window automatically when it loses focus |
| `hideOnEscape` | `true` | Whether to hide the window when the ESC key is pressed |
| `showInTaskbar` | `false` | Whether to show the app in the system taskbar |
| `launchAtLogin` | `false` | Whether to launch the app automatically when the system starts |

## Conclusion

The Toast app's window show/hide mechanism considers various conditions to optimize the user experience. By default, the app follows these principles:

1. **Minimal interference**: When not in use, it hides automatically so it does not take up workspace
2. **Context awareness**: Exceptionally stays visible when a modal is open or during login
3. **User control**: The behavior can be customized through settings

This behavior provides a smooth workflow by letting users quickly access the app to perform needed tasks and having it disappear automatically when no longer needed.
