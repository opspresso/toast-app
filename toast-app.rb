cask "toast-app" do
  version "0.1.0"
  sha256 :no_check

  url "https://github.com/opspresso/toast-app/releases/download/v#{version}/Toast-#{version}-mac.dmg"
  name "Toast"
  desc "A customizable shortcut launcher for macOS and Windows"
  homepage "https://github.com/opspresso/toast-app"

  app "Toast.app"

  auto_updates true

  zap trash: [
    "~/Library/Application Support/toast-app",
    "~/Library/Preferences/com.opspresso.toast-app.plist",
    "~/Library/Saved Application State/com.opspresso.toast-app.savedState"
  ]
end
