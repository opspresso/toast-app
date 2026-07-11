# Toast App Pages and Navigation

This document describes the page layout, components, and navigation structure of the Toast app.

## Overview

The Toast app consists of two main windows:

1. **Toast Window**: A popup window that appears when you press the global shortcut
2. **Settings Window**: A window for configuring the application

Each window has its own layout, components, and navigation patterns. The Toast window supports multiple pages of buttons, allowing users to organize their actions into logical groups.

## Toast Window

The Toast window is the primary interface that users interact with to run actions.

### Layout

```
┌──────────────────────────────────────────────────────────────────┐
│                 Toast          12:34:56                         × │
├──────────────────────────────────────────────────────────────────┤
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │   1   │   2   │   3   │   +   │   -                          │ │
│ └──────────────────────────────────────────────────────────────┘ │
│                                                                  │
│ ┌───────┐  ┌───────┐  ┌───────┐  ┌───────┐  ┌───────┐            │
│ │  📁   │  │  🌐   │  │  ⌨️   │  │  📝   │  │  🔊   │            │
│ │Files Q│  │Brws W │  │Term E │  │Notes R│  │Music T│            │
│ └───────┘  └───────┘  └───────┘  └───────┘  └───────┘            │
│                                                                  │
│ ┌───────┐  ┌───────┐  ┌───────┐  ┌───────┐  ┌───────┐            │
│ │  🔍   │  │  🔧   │  │  📸   │  │  🗓️   │  │  💬   │            │
│ │Srch A │  │Set S  │  │Cap D  │  │Cal F  │  │Chat G │            │
│ └───────┘  └───────┘  └───────┘  └───────┘  └───────┘            │
│                                                                  │
│ ┌───────┐  ┌───────┐  ┌───────┐  ┌───────┐  ┌───────┐            │
│ │  📊   │  │  📡   │  │  🎥   │  │  📋   │  │  🔒   │            │
│ │Stat Z │  │Net X  │  │Rec C  │  │Clip V │  │Lock B │            │
│ └───────┘  └───────┘  └───────┘  └───────┘  └───────┘            │
│                                                                  │
│ Status: Ready                                    👤  📝  ⚙️     │
└──────────────────────────────────────────────────────────────────┘
```
(Buttons are arranged in a 5-column grid, and the shortcut for each row follows the physical keyboard layout order `qwert` / `asdfg` / `zxcvb`.)

### Components

#### Header

- **Title**: Shows "Toast" as the window title
- **Clock**: Displays the current time (HH:MM:SS)
- **Close Button**: Closes the Toast window

#### Page Navigation

- **Page Buttons**: Numbered buttons (1-9) for switching between pages
  - **Free users**: Limited to 1 page
  - **Authenticated users**: Can create up to 3 pages
  - **Subscribers**: Can create up to 9 pages
- **Add Page Button**: Adds a new button page (+) (subject to account limits)
- **Remove Page Button**: Removes the current page (-)

#### Button Grid

- **Buttons**: Displays the configured buttons in a grid or list layout (up to 15 buttons per page)
- **Button Components**:
  - **Icon**: The visual representation of the button (emoji or custom icon)
  - **Name**: The display name of the button
  - **Shortcut**: The single-key shortcut for the button (automatically assigned in qwertasdfgzxcvb order)

#### Status Bar

- **Status Message**: Displays the status of the last action
- **Status Types**:
  - **Ready**: The default state
  - **Running**: An action is executing
  - **Success**: The action completed successfully (auto-hidden after 3 seconds)
  - **Error**: The action failed
- **User Button (👤)**: Opens the user profile / subscription information modal
- **Edit Mode Toggle (📝)**: Toggles button edit mode
- **Settings Button (⚙️)**: Opens the Settings window

### Navigation

#### Keyboard Navigation

- **Arrow Keys**: Move between buttons
- **Enter**: Run the selected button
- **Escape**: Close the Toast window or exit settings mode
- **Shortcut Keys**: Run the corresponding button (automatically assigned in qwertasdfgzxcvb order)
- **Number Keys (1-9)**: Switch between pages
- **Plus/Equals Keys (+, =)**: Add a new page (`+` with Shift, `=` also works on its own)
- **Minus Key (-)**: Remove the current page (in settings mode)
- **Comma Key (,)**: Toggle settings mode (`Cmd+,` / `Ctrl+,` opens the Settings window)

#### Mouse Navigation

- **Click**: Run a button or edit it in settings mode
- **Hover**: Highlight a button
- **Drag**: Reorder buttons in settings mode
- **Click a Page Number**: Switch between pages
- **Click the + Button**: Add a new page
- **Click the - Button**: Remove the current page
- **Click the Edit Icon (📝)**: Toggle button edit mode
- **Click the Settings Icon (⚙️)**: Open the Settings window

#### Settings Mode

- **Toggle**: Click the edit icon (📝) or press the comma (,) key
- **Edit a Button**: Click any button to edit its properties
- **Reorder Buttons**: Drag a button and drop it in a different position
  - **Drag**: Inserts at the drop position, shifting the buttons in between by one slot
  - **Cmd+Drag** (Windows: Ctrl+Drag): Swaps the positions of the two buttons
  - After moving, shortcuts are automatically reassigned in qwertasdfgzxcvb order by position, and changes are saved immediately
- **Exit**: Press the Escape key or click the edit icon (📝) again

## Settings Window

The Settings window lets users configure the application.

### Layout

```
┌─────────────┬───────────────────────────────────────────────┐
│             │                                               │
│  Settings   │  Settings                                     │
│             │                                               │
│  Account    │  General                                      │
│             │ Global Shortcut: [Alt+Space]  [Record] [Clear]│
│  Snippets   │  ☑ Launch at login                            │
│             │                                               │
│  About      │  Appearance                                   │
│             │   Theme / Position / Size / Opacity           │
│             │                                               │
│             │  Advanced                                     │
│             │   Hide behavior / Taskbar / Reset             │
│             │                                               │
└─────────────┴───────────────────────────────────────────────┘
```

The window title and close button use the OS's native title bar. Settings are saved immediately when changed.

### Components

#### Sidebar

- **Navigation Tabs**:
  - **Settings**: General (global shortcut, launch at login) · Appearance (theme, position, size, opacity) · Advanced (hide behavior, taskbar, reset) sections
  - **Account**: Account/subscription management and cloud sync
  - **Snippets**: Text expansion snippet management (keyword → replacement text)
  - **About**: Version information and updates

#### Main Content Area

The main content area displays different settings depending on the selected tab.

##### General Section — Settings Tab

- **Global Shortcut**: Configure the global shortcut that triggers the Toast window
  - **Shortcut Input**: Displays the current shortcut
  - **Record Button**: Record a new shortcut
  - **Clear Button**: Clear the current shortcut
- **Launch at Login**: Option to automatically start the Toast app at login

##### Appearance Section — Settings Tab

- **Theme**: Choose between light, dark, or system theme
- **Position**: Choose where the Toast window appears (center, top, bottom, cursor)
- **Size**: Choose the size of the Toast window (small, medium, large)
- **Opacity**: Adjust the transparency of the Toast window (0.1-1.0)

##### Account Section (Account & Subscription) — Account Tab

- **Login/Logout**: User account authentication
- **Profile Information**: Displays the username, email, and profile image after login
- **Subscription Information**: Displays the current subscription status, expiration date, and available features
- **Manage Subscription**: Navigate to the subscription management page

##### Cloud Sync Section — Account Tab

- **Sync Status**: Displays the current sync status and the time of the last sync
- **Enable/Disable Sync**: Toggle the cloud sync feature
- **Manual Sync**: Upload to server, download from server, and conflict resolution

##### Advanced Section — Settings Tab

- **Hide After Action**: Hide the Toast window after running an action
- **Hide on Focus Loss**: Hide the Toast window when it loses focus
- **Hide with Escape Key**: Hide the Toast window when the Escape key is pressed
- **Show in Taskbar**: Show the Toast window in the taskbar/dock
- **Reset to Defaults**: Reset all settings to their default values

##### Snippets Tab

- **Snippet List**: Displays the registered text expansion snippets (keyword → replacement text)
- **Add/Edit/Delete**: Manage snippets

##### About Tab

- **Version Information**: Displays the current app version
- **Update Management**: Check for, download, and install updates
- **Homepage Link**: Navigate to the official website
- **Alternative Update Methods**: Guidance for Homebrew, GitHub releases, etc.

#### Button Editor Dialog

The button editor dialog appears when you edit a button in settings mode. This dialog is displayed directly in the Toast window when you click a button in settings mode.

```
┌─────────────────────────────────────────┐
│  Edit Button Settings                 × │
├─────────────────────────────────────────┤
│                                         │
│  Button Name: [                    ]    │
│                                         │
│  Icon: [                          ]     │
│                                         │
│  Action Type: [Run Command        ▼]    │
│                                         │
│  Command: [                        ]    │
│                                         │
│  URL: [                           ]     │
│                                         │
│  Script: [                        ]     │
│                                         │
├─────────────────────────────────────────┤
│  [Save]                      [Cancel]   │
└─────────────────────────────────────────┘
```

- **Dialog Header**:
  - **Title**: "Edit Button Settings"
  - **Close Button**: Closes the dialog
- **Button Properties**:
  - **Button Name**: The display name of the button
  - **Icon**: An emoji or custom icon
  - **Action Type**: The type of action to run (application, exec, open, script, chain)
- **Action Parameters**: Different parameters depending on the selected action type:
  - **Run Command**: Command field
  - **Open URL**: URL field
  - **Run Script**: Script text area
- **Dialog Footer**:
  - **Save Button**: Save the button changes
  - **Cancel Button**: Discard changes and close the dialog

Note: You cannot change a button's shortcut when editing it. Shortcuts are automatically assigned in qwertasdfgzxcvb order based on the button's position within the page.

### Navigation

#### Tab Navigation

- **Click**: Switch between tabs
- **Tab Key**: Move between form controls
- **Enter**: Activate a button or submit a form

#### Button List Navigation

- **Scroll**: Scroll through the button list
- **Click**: Select a button to edit or delete

#### Dialog Navigation

- **Tab Key**: Move between form controls
- **Enter**: Submit the form
- **Escape**: Cancel and close the dialog

## System Tray Menu

The system tray menu provides quick access to Toast app features.

```
┌─────────────────┐
│  Open Toast     │
├─────────────────┤
│  How to use     │
│  Dashboard      │
│  Subscription   │
├─────────────────┤
│  Settings...    │
│  About          │
│  Version: x.x.x │
├─────────────────┤
│  Quit           │
└─────────────────┘
```

### Menu Items

- **Open Toast**: Open the Toast window
- **How to use**: Open the usage guide page (external browser)
- **Dashboard**: Open the dashboard (external browser)
- **Subscription**: Open the subscription management page (external browser)
- **Settings...**: Open the Settings window
- **About**: Show information about Toast
- **Version**: Show the current app version (disabled item)
- **Quit**: Exit the application

### Navigation

- **Click**: Select a menu item
- **Hover**: Highlight a menu item
- **Escape**: Close the menu

## Navigation Flows

### Application Startup

1. Start the Toast app
2. On first launch, the Settings window opens
3. Otherwise, the Toast app runs in the background with a system tray icon

### Opening the Toast Window

1. The user presses the global shortcut
2. The Toast window appears at the configured position
3. The user can search, navigate, or run buttons
4. The Toast window closes after an action or when the user clicks outside it

### Configuring Settings

1. The user right-clicks the system tray icon
2. The user selects "Settings" from the menu
3. The Settings window opens
4. The user moves between tabs to configure various settings
5. The user saves or cancels the changes

### Adding or Editing a Button

1. The user opens the Toast window with the global shortcut
2. The user switches to edit mode (click the edit icon (📝) or press the comma (,) key)
3. The user clicks an empty button to add one, or clicks an existing button to edit it
4. The button editor dialog opens
5. The user configures the button properties
6. The user saves or cancels the changes

### Exiting the Application

1. The user right-clicks the system tray icon
2. The user selects "Quit" from the menu
3. The Toast app closes

## Page Limits and Authentication

The Toast app offers different page limits based on account status:

### Page Allocation Policy

- **Free users**: Without authentication, all users get 1 page for basic features.
- **Authenticated users**: Logged-in, authenticated users get up to 3 pages.
- **Subscribers**: Users with an active subscription can create up to 9 pages.

### Authentication Process

1. Open Settings and go to the Account tab
2. Click "Login" and authenticate through the Toast web service
3. Account status is verified automatically, and page limits are updated accordingly

### Subscription Benefits

A Toast app premium subscription provides additional benefits:
- Increased page limit (up to 9 pages)
- Cloud sync/backup of your configuration
- Priority support

> All action types (application, exec, open, script, chain) behave identically regardless of subscription tier. Subscription only affects the page count limit and cloud sync eligibility.

## Responsive Behavior

### Toast Window

- **Small size**: 500x350 window, fixed 5-column grid (10px gap)
- **Medium size**: 700x500 window, fixed 5-column grid (12px gap)
- **Large size**: 800x550 window, fixed 5-column grid (14px gap)

### Settings Window

- **Small screens**: The sidebar collapses into a dropdown menu
- **Medium screens**: The sidebar and content are placed side by side
- **Large screens**: A wider content area with more room for controls

## Accessibility Considerations

### Keyboard Navigation

- All features are accessible via keyboard
- Tab order follows a logical flow
- Focus indicators are visible

### Screen Readers

- All controls have appropriate labels
- Status messages are announced
- Dialog focus is managed appropriately

### Color Contrast

- Text has sufficient contrast against the background
- Focus indicators are visible
- Status messages use appropriate colors

## Future UI Improvements

### Toast Window

- Customizable button sizes and spacing
- Button categories and folders
- Search history and favorites

### Settings Window

- A visual button editor with drag and drop
- Toast window preview
- Theme customization
- A keyboard shortcut editor

## Conclusion

The Toast app UI is designed to be simple, efficient, and accessible. The Toast window provides quick access to actions, while the Settings window enables comprehensive configuration. System tray integration keeps the app out of the way when it isn't needed.
