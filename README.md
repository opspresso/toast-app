# Toast App

<p align="center">
  <img src="https://app.toast.sh/logo192.png" alt="Toast App logo" width="192" height="192">
</p>

<p align="center">
  <strong>Customizable shortcut launcher for macOS and Windows</strong><br>
  An Electron-based productivity tool that lets you run actions quickly via global shortcuts.
</p>

<p align="center">
  <img src="https://app.toast.sh/images/screenshot-light.png" alt="Toast App screenshot" width="500">
</p>

## ✨ Key Features

- **🔥 Global Shortcut**: Summon the Toast popup anytime with `Alt+Space`
- **📱 Multiple Pages**: Organize custom buttons across pages
- **⚡ 5 Action Types**: Run commands, open files/URLs, execute scripts, chain actions, launch applications
- **🎨 Theme Support**: Light/Dark/System themes
- **📝 Snippets (Text Expansion)**: Type a keyword like `!email` in any app to automatically replace it with predefined text (macOS)
- **☁️ Cloud Sync**: Sync settings and buttons across multiple devices
- **🖼️ Icon Extraction**: Automatic macOS app icon extraction
- **🌍 Cross-Platform**: Supports macOS and Windows

## 📦 Installation

### Direct Download
Download the latest version from [**GitHub Releases**](https://github.com/opspresso/toast/releases):
- **macOS**: `Toast-{version}.dmg`
- **Windows**: `Toast-Setup-{version}.exe` (installer) or `Toast-{version}.exe` (portable)

### Homebrew (macOS)
```bash
brew install --cask opspresso/tap/toast
```

## 🚀 Quick Start

1. **Launch**: After installation, it runs in the background from the system tray
2. **Open the Popup**: Press `Alt+Space` (the default shortcut) to summon the Toast popup
3. **Click a Button**: Click the desired action button or use its keyboard shortcut
4. **Configure**: Right-click the tray icon → Settings to configure buttons and actions

> 💡 For **detailed usage**, see the [User Guide](docs/guide/user.md).

## 📚 Documentation

| Document | Description |
|------|------|
| [📖 User Guide](docs/guide/user.md) | Detailed feature and usage instructions |
| [🔧 Development Guide](docs/development/setup.md) | Development environment setup and build process |
| [🏗️ Architecture](docs/architecture/overview.md) | System structure and design principles |
| [⌨️ Shortcut Rules](docs/guide/shortcuts.md) | Automatic button shortcut assignment system |
| [📋 Full Documentation Index](docs/README.md) | Index of all documentation |

## 📂 Related Repositories

The Toast project consists of the following repositories:

| Repository | Visibility | Description |
|--------|-----------|------|
| [opspresso/toast](https://github.com/opspresso/toast) | Public | Distribution and flagship repository (release distribution, homepage, issue tracking) |
| [opspresso/toast-app](https://github.com/opspresso/toast-app) | Public | Desktop app source (this repository) |
| [opspresso/toast-web](https://github.com/opspresso/toast-web) | Private | Web service source (authentication/sync API and web console) |

## 🛠️ Quick Start for Developers

```bash
# 1. Clone the repository
git clone https://github.com/opspresso/toast-app.git
cd toast-app

# 2. Install dependencies
npm install

# 3. Run in development mode
npm run dev
```

> 📝 For **detailed development information**, see the [Development Guide](docs/development/setup.md).

## 🤝 Contributing

Join us in improving Toast App! Check out the [contributing guidelines](CONTRIBUTING.md), or report bugs and suggest features via [Issues](https://github.com/opspresso/toast-app/issues).

## 📄 License

MIT License - see the [LICENSE](LICENSE) file for details.

---

<p align="center">
  Boost your productivity with <strong>Toast App</strong>! ⚡
</p>
