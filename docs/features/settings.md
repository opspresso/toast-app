# Settings

The main process owns settings in a shared `electron-store`. Renderer windows read and
change settings through preload IPC methods. The current schema is in `src/main/config.js`.

## Settings window

| Tab | Controls |
|---|---|
| Settings | Global hotkey, launch at login, appearance, window hiding, taskbar visibility, reset |
| Account | Sign in/out, subscription information, cloud sync status and controls |
| Snippets | Text expansion permission, enable switch, and snippet editing |
| About | Version, update checks, downloads, installation, and website links |

General and appearance controls save immediately. Startup, local saves, reset, import, and cloud
updates use the same native preference application path for window size, opacity, position,
taskbar visibility, and launch at login. Unchanged values are not reapplied. Selecting a position
preset overrides the current monitor's saved drag position. Background updates refresh hidden
controls and the active theme without interrupting hotkey recording. Snippet forms save through **Add Snippet**
or **Save Changes**. Text expansion is off by default and requires macOS permissions.
See [Snippets](snippets.md) for its input rules and conflict handling.

## Data and defaults

- `globalHotkey` defaults to `Alt+Space` and remains local to the device.
- `pages` and `snippets` hold user content. Empty arrays represent an intentional empty collection.
- `appearance` controls theme, accent color, position, size, opacity, layout, and saved monitor positions.
- `advanced` controls startup and window hiding behavior.
- `textExpander` stores device-local enable and first-run seeding state.
- `subscription`, `_sync`, and `security` are maintained by the main process.

The file is under Electron's `app.getPath('userData')`. With `CONFIG_SUFFIX` set, the filename
is `config-<suffix>.json`; otherwise it is `config.json`. See [the schema](../config/schema.md)
and [data storage](../config/data-storage.md) for the storage model.

## Resetting preferences

**Settings → Advanced → Reset to Defaults** resets the hotkey, appearance, and advanced
preferences and disables text expansion. It preserves:

- Buttons and snippets.
- The authenticated account and cloud sync enabled preference.
- The last synchronized baseline and per-account recovery copies.
- Action approvals and whether example snippets were already seeded.

Reset persists the requested preferences in one operation. It does not turn the installation
into a new account or erase the metadata needed to reconcile offline changes.

## Import and export

The `import-config` and `export-config` IPC helpers use JSON. Export includes `globalHotkey`,
`pages`, `snippets`, `appearance`, and `advanced`; it excludes credentials and sync/approval metadata.

Import replaces only supplied sections. An imported appearance or advanced section starts from
its schema defaults. Omitted sections remain unchanged. The main process validates button actions,
snippet rules, payload limits, and the settings schema before persisting the update atomically.
Invalid JSON or any invalid section returns failure and leaves the existing configuration intact.
Account state, sync baselines, recovery copies, and approvals are preserved.

Export a backup before importing or editing a configuration file. If import fails, check the JSON
syntax and section formats, then retry with a corrected file. Never fix an import failure by clearing
the settings store.

## Cloud synchronization

Cloud sync downloads after login and checks for changes every 15 minutes. Local changes are
scheduled after a 5-second debounce. **Sync Now** attempts a safe merge. Explicit upload/download
chooses which copy to retain when a conflict needs a decision. See [Cloud Sync](cloud-sync.md).
