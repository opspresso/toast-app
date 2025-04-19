# Toast App Pages and Navigation

This document describes the page layouts, components, and navigation structure of the Toast App.

## Overview

Toast App consists of two main windows:

1. **Toast Window**: The popup window that appears when the global hotkey is pressed
2. **Settings Window**: The window for configuring the application

Each window has its own layout, components, and navigation patterns. The Toast window supports multiple pages of buttons, allowing users to organize their actions into logical groups.

## Toast Window

The Toast window is the main interface that users interact with to execute actions.

### Layout

```
┌───────────────────────────────────────────────────────────┐
│                       Toast                              × │
├───────────────────────────────────────────────────────────┤
│ ┌───────────────────────────────────────────────────────┐ │
│ │   1   │   2   │   3   │   +   │   -                   │ │
│ └───────────────────────────────────────────────────────┘ │
│                                                           │
│ ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐     │
│ │   📁    │   │   🌐    │   │   ⌨️    │   │   📝    │     │
│ │         │   │         │   │         │   │         │     │
│ │ Files Q │   │Browser W│   │Terminal E│   │ Notes R │     │
│ └─────────┘   └─────────┘   └─────────┘   └─────────┘     │
│                                                           │
│ ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐     │
│ │   🔊    │   │   🔍    │   │   🔧    │   │   📸    │     │
│ │         │   │         │   │         │   │         │     │
│ │ Music A │   │Search S │   │Settings D│   │ Capture F│    │
│ └─────────┘   └─────────┘   └─────────┘   └─────────┘     │
│                                                           │
│ ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐     │
│ │   🗓️    │   │   💬    │   │   📊    │   │   📡    │     │
│ │         │   │         │   │         │   │         │     │
│ │Calendar Z│   │ Chat X  │   │ Stats C │   │Network V│     │
│ └─────────┘   └─────────┘   └─────────┘   └─────────┘     │
│                                                           │
│ Status: Ready                               Settings ⚙️   │
└───────────────────────────────────────────────────────────┘
```

### Components

#### Header

- **Title**: Displays "Toast" as the window title
- **Close Button**: Closes the Toast window

#### Page Navigation

- **Page Buttons**: Numbered buttons (1-9) to switch between pages
- **Add Page Button**: Adds a new page of buttons (+)
- **Remove Page Button**: Removes the current page (-)

#### Button Grid

- **Buttons**: Displays the configured buttons in a grid or list layout (up to 15 buttons per page)
- **Button Components**:
  - **Icon**: Visual representation of the button (emoji or custom icon)
  - **Name**: Display name of the button
  - **Shortcut**: Single-key shortcut for the button (Q-Z, A-M letters)

#### Status Bar

- **Status Message**: Displays the status of the last action
- **Status Types**:
  - **Ready**: Default state
  - **Executing**: Action is being executed
  - **Success**: Action completed successfully (auto-hides after 3 seconds)
  - **Error**: Action failed
- **Settings Toggle**: Button to toggle settings mode (⚙️)

### Navigation

#### Keyboard Navigation

- **Arrow Keys**: Navigate between buttons
- **Enter**: Execute the selected button
- **Escape**: Close the Toast window or exit settings mode
- **Shortcut Keys**: Execute the corresponding button
- **Number Keys (1-9)**: Switch between pages
- **Plus Key (+)**: Add a new page (with Shift)
- **Minus Key (-)**: Remove current page (in settings mode)
- **Comma Key (,)**: Toggle settings mode

#### Mouse Navigation

- **Click**: Execute a button or edit in settings mode
- **Hover**: Highlight a button
- **Click Page Numbers**: Switch between pages
- **Click + Button**: Add a new page
- **Click - Button**: Remove the current page
- **Click Settings Icon**: Toggle settings mode

#### Settings Mode

- **Toggle**: Click the gear icon (⚙️) or press comma (,) key
- **Edit Buttons**: Click any button to edit its properties
- **Exit**: Press Escape key or click the gear icon again

#### Search Navigation

- **Type**: Filter buttons by name or shortcut
- **Enter**: Execute the first matching button
- **Escape**: Clear the search input

## Settings Window

The Settings window allows users to configure the application.

### Layout

```
┌─────────────────────────────────────────────────────────────┐
│                     Toast Settings                          │
├─────────────┬───────────────────────────────────────────────┤
│             │                                               │
│  General    │  General Settings                             │
│             │                                               │
│  Buttons    │  Global Hotkey: [Alt+Space]  [Record] [Clear] │
│             │                                               │
│  Appearance │  ☑ Launch at login                            │
│             │                                               │
│  Advanced   │                                               │
│             │                                               │
│             │                                               │
│             │                                               │
│             │                                               │
│             │                                               │
│             │                                               │
│             │                                               │
│             │                                               │
│             │                                               │
│             │                                               │
├─────────────┴───────────────────────────────────────────────┤
│  [Save]                                      [Cancel]       │
└─────────────────────────────────────────────────────────────┘
```

### Components

#### Header

- **Title**: Displays "Toast App Settings" as the window title
- **Save Button**: Saves the settings
- **Cancel Button**: Cancels changes and closes the window

#### Sidebar

- **Navigation Tabs**:
  - **General**: General settings
  - **Buttons**: Button configuration
  - **Appearance**: Visual appearance settings
  - **Advanced**: Advanced settings

#### Main Content Area

The main content area displays different settings based on the selected tab.

##### General Tab

- **Global Hotkey**: Configure the global hotkey to trigger the Toast window
  - **Hotkey Input**: Displays the current hotkey
  - **Record Button**: Records a new hotkey
  - **Clear Button**: Clears the current hotkey
- **Launch at Login**: Option to start Toast App automatically at login

##### Buttons Tab

- **Button List**: Displays the configured buttons
  - **Button Items**:
    - **Icon**: Visual representation of the button
    - **Name**: Display name of the button
    - **Action**: Description of the button's action
    - **Edit Button**: Opens the button editor
    - **Delete Button**: Deletes the button
- **Add Button**: Adds a new button
- **Import/Export**: Imports or exports button configurations

##### Appearance Tab

- **Theme**: Choose between light, dark, or system theme
- **Position**: Choose where the Toast window appears
- **Size**: Choose the size of the Toast window
- **Opacity**: Adjust the transparency of the Toast window
- **Button Layout**: Choose between grid or list layout

##### Advanced Tab

- **Hide After Action**: Hide the Toast window after executing an action
- **Hide on Blur**: Hide the Toast window when it loses focus
- **Hide on Escape**: Hide the Toast window when the Escape key is pressed
- **Show in Taskbar**: Show the Toast window in the taskbar/dock
- **Reset to Defaults**: Reset all settings to their default values

#### Button Editor Dialog

The button editor dialog appears when editing a button in settings mode. This dialog is displayed directly in the Toast window when a button is clicked in settings mode.

```
┌─────────────────────────────────────────┐
│  Edit Button Settings                  × │
├─────────────────────────────────────────┤
│                                         │
│  Button Name: [                    ]    │
│                                         │
│  Icon: [                          ]     │
│                                         │
│  Action Type: [Execute Command     ▼]   │
│                                         │
│  Command: [                        ]    │
│                                         │
│  URL: [                            ]    │
│                                         │
│  Script: [                         ]    │
│                                         │
│  Key Combination: [                ]    │
│                                         │
├─────────────────────────────────────────┤
│  [Save]                      [Cancel]   │
└─────────────────────────────────────────┘
```

- **Dialog Header**:
  - **Title**: "Edit Button Settings"
  - **Close Button**: Closes the dialog
- **Button Properties**:
  - **Button Name**: Display name of the button
  - **Icon**: Emoji or custom icon
  - **Action Type**: Type of action to execute (exec, open, script, shortcut)
- **Action Parameters**: Different parameters based on the selected action type:
  - **Execute Command**: Command field
  - **Open URL**: URL field
  - **Run Script**: Script text area
  - **Execute Shortcut**: Key Combination field
- **Dialog Footer**:
  - **Save Button**: Saves the button changes
  - **Cancel Button**: Cancels changes and closes the dialog

Note: The shortcut key cannot be changed when editing a button as it's used as the button's identifier within a page.

### Navigation

#### Tab Navigation

- **Click**: Switch between tabs
- **Tab Key**: Navigate between form controls
- **Enter**: Activate buttons or submit forms

#### Button List Navigation

- **Scroll**: Scroll through the button list
- **Click**: Select a button to edit or delete

#### Dialog Navigation

- **Tab Key**: Navigate between form controls
- **Enter**: Submit the form
- **Escape**: Cancel and close the dialog

## System Tray Menu

The system tray menu provides quick access to Toast App functions.

```
┌─────────────────┐
│  Open Toast     │
├─────────────────┤
│  Settings       │
├─────────────────┤
│  About Toast    │
├─────────────────┤
│  Quit           │
└─────────────────┘
```

### Menu Items

- **Open Toast**: Opens the Toast window
- **Settings**: Opens the Settings window
- **About Toast**: Shows information about Toast
- **Quit**: Quits the application

### Navigation

- **Click**: Select a menu item
- **Hover**: Highlight a menu item
- **Escape**: Close the menu

## Navigation Flow

### Application Startup

1. Toast App starts
2. If it's the first launch, the Settings window opens
3. Otherwise, Toast App runs in the background with a system tray icon

### Opening the Toast Window

1. User presses the global hotkey
2. Toast window appears at the configured position
3. User can search, navigate, or execute buttons
4. Toast window closes after an action or when the user clicks outside

### Configuring Settings

1. User right-clicks the system tray icon
2. User selects "Settings" from the menu
3. Settings window opens
4. User navigates between tabs to configure different settings
5. User saves or cancels changes

### Adding or Editing a Button

1. User opens the Settings window
2. User navigates to the Buttons tab
3. User clicks "Add Button" or "Edit" on an existing button
4. Button editor dialog opens
5. User configures the button properties
6. User saves or cancels changes

### Quitting the Application

1. User right-clicks the system tray icon
2. User selects "Quit" from the menu
3. Toast App closes

## Responsive Behavior

### Toast Window

- **Small Screen**: Buttons arranged in a 3x3 grid
- **Medium Screen**: Buttons arranged in a 4x3 grid
- **Large Screen**: Buttons arranged in a 5x3 grid

### Settings Window

- **Small Screen**: Sidebar collapses to a dropdown menu
- **Medium Screen**: Sidebar and content side by side
- **Large Screen**: Wider content area with more space for controls

## Accessibility Considerations

### Keyboard Navigation

- All functions are accessible via keyboard
- Tab order follows a logical flow
- Focus indicators are visible

### Screen Readers

- All controls have appropriate labels
- Status messages are announced
- Dialog focus is managed properly

### Color Contrast

- Text has sufficient contrast against backgrounds
- Focus indicators are visible
- Status messages use appropriate colors

## Future UI Enhancements

### Toast Window

- Customizable button size and spacing
- Drag and drop to reorder buttons
- Button categories and folders
- Search history and favorites

### Settings Window

- Visual button editor with drag and drop
- Preview of the Toast window
- Theme customization
- Keyboard shortcut editor

## Conclusion

The Toast App UI is designed to be simple, efficient, and accessible. The Toast window provides quick access to actions, while the Settings window allows for comprehensive configuration. The system tray integration ensures that the app stays out of the way when not needed.
