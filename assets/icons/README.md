# Icon Files for Toast App

This directory should contain the following icon files:

1. icon.svg - Vector version of the Toast App icon (already created)
2. icon.png - 512x512 PNG version of the icon
3. icon.icns - macOS icon file
4. icon.ico - Windows icon file

For production builds, you'll need to generate these icon files from the SVG source.
You can use tools like:
- ImageMagick for PNG conversion
- iconutil (macOS) for .icns files
- png2ico for .ico files

Example commands:
- Convert SVG to PNG: `convert icon.svg -resize 512x512 icon.png`
- Create macOS icon set: Follow Apple's guidelines for creating .icns files
- Create Windows icon: Use a tool like png2ico or an online converter
