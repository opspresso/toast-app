# Snippets (Text Expansion)

An inline text expansion feature that automatically replaces a keyword you type in other apps with predefined text. For example, in any app such as Slack, Notes, or a browser, typing `!email` turns it into `email@toast.sh`.

On first launch, one example snippet, `!email`, is seeded. Its replacement content is the logged-in user's email, or `email@toast.sh` if not logged in. This seeding is performed only once per device, and if snippets already exist (e.g., downloaded via cloud sync), it is left untouched.

## How It Works

1. It detects typing via global keystroke hooking (`uiohook-napi`) and maintains an input buffer.
2. When the buffer ends with the keyword of an enabled snippet, it is judged a match (on overlap, the longest keyword wins).
3. Replacement is clipboard-based: it deletes the typed keyword with Backspace, backs up the existing clipboard, pastes the replacement text (⌘V), and restores the clipboard shortly after. Because it uses the clipboard, it reliably replaces Korean characters and emoji as well.

Space, Enter, arrow keys, mouse clicks, and ⌘/Ctrl/Alt combinations reset the input buffer.

## Permissions (macOS)

Global keystroke detection and replacement require **Accessibility** and **Input Monitoring** permissions. You can request permissions or open System Settings from the Settings → Snippets tab. Without permissions, the feature is automatically kept inactive (no crash).

## Privacy

- The default is **off**. The user must explicitly turn it on for it to work.
- Keystroke content is not written to logs. The input buffer is a fixed-length sliding window kept only in memory.

## Configuration Data

Snippets are stored in the top-level `snippets` array of the configuration and are cloud-synced like pages. Whether the feature is enabled (`textExpander.enabled`) is a device-local setting that is not synced, because permissions are per-device. See [config/schema.md](../config/schema.md) for the detailed schema.

```json
{
  "snippets": [
    { "id": "default-email", "keyword": "!email", "content": "email@toast.sh", "enabled": true, "label": "Email" }
  ],
  "textExpander": { "enabled": false }
}
```

Keyword rules: no whitespace, at least 2 characters, printable ASCII only, no duplicates, and not a prefix or suffix of another keyword (to prevent ambiguous matching). Replacement content allows arbitrary Unicode.

## Limitations

- **macOS only**. Windows is a follow-up task.
- Trigger keywords support ASCII only. Korean IME composition input cannot be used as a trigger because it does not align with the keycode-based buffer (replacement content can be Korean).
- It does not work during macOS Secure Input (password entry fields), because the OS blocks event hooking.
- App Store (MAS) builds do not support this feature due to sandbox restrictions. It works only in regular distribution (DMG/ZIP) builds.
