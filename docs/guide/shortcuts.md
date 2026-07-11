# Toast App Button Shortcut Rules

This document provides a detailed explanation of how button shortcuts are assigned and managed in the Toast app.

## Overview

Every button in the Toast app uses a fixed shortcut system that is automatically assigned in the order **qwertasdfgzxcvb** based on its position within the page. This gives users a consistent keyboard experience and makes shortcuts predictable from a button's position alone.

## Shortcut Assignment Rules

### Default Order

Button shortcuts are assigned in the following order:

```
Q W E R T
A S D F G
Z X C V B
```

- **First row**: Q, W, E, R, T (5 keys)
- **Second row**: A, S, D, F, G (5 keys)
- **Third row**: Z, X, C, V, B (5 keys)
- Supports up to **15 buttons** total

### Assignment by Position

| Position | Shortcut | Description |
|------|--------|------|
| Button 1 | Q | First row, first |
| Button 2 | W | First row, second |
| Button 3 | E | First row, third |
| Button 4 | R | First row, fourth |
| Button 5 | T | First row, fifth |
| Button 6 | A | Second row, first |
| Button 7 | S | Second row, second |
| Button 8 | D | Second row, third |
| Button 9 | F | Second row, fourth |
| Button 10 | G | Second row, fifth |
| Button 11 | Z | Third row, first |
| Button 12 | X | Third row, second |
| Button 13 | C | Third row, third |
| Button 14 | V | Third row, fourth |
| Button 15 | B | Third row, fifth |

## Automatic Reassignment System

### When Does Reassignment Happen?

A button's shortcut is automatically reassigned in the following situations:

1. **Adding a button**: When adding a new button to the page
2. **Deleting a button**: When deleting an existing button
3. **Reordering buttons**: When dragging a button to change its position in settings mode (a plain drag inserts; Cmd/Ctrl+drag swaps)
4. **Loading a page**: When loading a page from the configuration file
5. **Importing buttons**: When importing a button configuration from an external source

### Reassignment Process

```javascript
// Example: when there are 3 buttons
const buttons = [
  { name: "Chrome", shortcut: "Q", ... },
  { name: "VSCode", shortcut: "W", ... },
  { name: "Terminal", shortcut: "E", ... }
];

// After swapping the positions of the first and second buttons
const reorderedButtons = [
  { name: "VSCode", shortcut: "Q", ... },  // Automatically reassigned to Q
  { name: "Chrome", shortcut: "W", ... },  // Automatically reassigned to W
  { name: "Terminal", shortcut: "E", ... } // E retained
];
```

## Implementation Details

### Constant Definition

```javascript
// src/renderer/pages/toast/modules/constants.js
export const BUTTON_SHORTCUTS = ['Q', 'W', 'E', 'R', 'T', 'A', 'S', 'D', 'F', 'G', 'Z', 'X', 'C', 'V', 'B'];
```

### Reassignment Function

```javascript
/**
 * Reassigns the shortcuts of a button array in order
 * @param {Array} buttons - Button array
 * @returns {Array} Button array with reassigned shortcuts
 */
export function reassignButtonShortcuts(buttons) {
  return buttons.map((button, index) => {
    if (index < BUTTON_SHORTCUTS.length) {
      return {
        ...button,
        shortcut: BUTTON_SHORTCUTS[index]
      };
    }
    return button;
  });
}
```

### Application Points

1. **On page initialization** (`initializePages` function in `pages.js`)
2. **On button update** (`updateCurrentPageButtons` function in `pages.js`)
3. **On new page creation** (creating default buttons and empty buttons)

## User Experience

### Advantages

1. **Consistency**: The same position always gets the same shortcut
2. **Predictability**: You can tell the shortcut just from the button's position
3. **Easy to learn**: Intuitive as it follows the qwerty keyboard layout
4. **Automation**: Users don't need to manage shortcuts manually

### Limitations

1. **Maximum of 15**: Only up to 15 buttons per page are supported
2. **Fixed order**: Users cannot set their preferred shortcut directly
3. **Keyboard dependency**: Optimized for the qwerty keyboard layout

## Keyboard Layout Considerations

### QWERTY Keyboard

Designed to provide the best experience on a standard QWERTY keyboard:

```
Q W E R T Y U I O P
A S D F G H J K L
Z X C V B N M
```

The selected keys are placed in positions that are easily reachable with the left hand.

### Other Keyboard Layouts

- **DVORAK**: Key positions differ, but the physical positions are the same
- **AZERTY**: Some key positions may differ
- **Other layouts**: Works based on the physical key positions

## Accessibility Considerations

### Keyboard Navigation

- **Arrow keys**: Move between buttons
- **Tab key**: Move focus
- **Enter key**: Run the selected button
- **Shortcuts**: Run a button directly

### Visual Indication

- The shortcut is clearly displayed on each button
- The shortcut is highlighted on hover
- Visual feedback on keyboard focus

## Troubleshooting

### Common Issues

1. **Shortcut not working**
   - Check whether focus is on a modal or another input field
   - Check whether the Toast window is active

2. **Unexpected shortcut**
   - Check the button position (assigned automatically by position)
   - Refresh the page to confirm the latest assignment

3. **Shortcut conflict**
   - No conflicts occur within the Toast app (managed automatically)
   - Conflicts with system global shortcuts need to be checked separately

### Debugging

You can check the following in the developer tools:

```javascript
// Check the buttons and shortcuts of the current page
console.log(pages[currentPageIndex].buttons.map(b => ({ name: b.name, shortcut: b.shortcut })));

// Check the shortcut constant
console.log(BUTTON_SHORTCUTS);
```

## Future Improvements

### Planned Features

1. **Custom shortcuts**: An option for advanced users
2. **Keyboard layout detection**: Automatically choosing the optimal keys
3. **Shortcut conflict detection**: Preventing conflicts with system shortcuts
4. **Accessibility improvements**: Stronger screen reader support

### Proposed Enhancements

1. **Support for more buttons**: Using additional key combinations
2. **Per-group shortcuts**: Different shortcut patterns per page
3. **Learning mode**: A visual guide for learning shortcuts

## Conclusion

The Toast app's button shortcut system is designed for consistency and ease of use. Through the automatic assignment system in qwertasdfgzxcvb order, users can enjoy efficient keyboard navigation without complex shortcut management.

This system is especially useful for power users who work with many buttons, and it minimizes the learning curve since the shortcut can be intuitively inferred from a button's position alone.
