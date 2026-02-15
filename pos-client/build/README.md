# Application Icons

This directory contains application icons for the POS Terminal.

## Icon Files

- `icon.svg` - Source vector icon (1024x1024)
- `icon.png` - PNG icon for Linux (required, 1024x1024 or 512x512)
- `icon.icns` - macOS icon file (required for macOS builds)
- `icon.ico` - Windows icon file (required for Windows builds)

## Generating Icons from SVG

To generate platform-specific icons from the SVG source, you can use one of these methods:

### Method 1: Using electron-icon-builder (Recommended)

```bash
npm install -g electron-icon-builder
electron-icon-builder --input=./build/icon.svg --output=./build --flatten
```

### Method 2: Using ImageMagick and librsvg

For PNG:
```bash
rsvg-convert -w 1024 -h 1024 icon.svg > icon.png
```

For ICNS (macOS):
```bash
# Create iconset directory
mkdir icon.iconset
# Generate various sizes
for size in 16 32 64 128 256 512 1024; do
  rsvg-convert -w $size -h $size icon.svg > icon.iconset/icon_${size}x${size}.png
done
# Create icns file
iconutil -c icns icon.iconset
```

For ICO (Windows):
```bash
# Install ImageMagick
convert icon.svg -define icon:auto-resize=256,128,96,64,48,32,16 icon.ico
```

### Method 3: Using electron-builder's icon generation

electron-builder can generate platform-specific icons from a 1024x1024 PNG:

1. Create a 1024x1024 PNG called `icon.png` in this directory
2. Run `electron-builder` - it will automatically generate .icns and .ico files

## Current Status

⚠️ **Placeholder icons are currently in use**

For production deployment:
1. Create a professional 1024x1024 PNG icon
2. Generate platform-specific formats using one of the methods above
3. Replace the placeholder files in this directory

## Design Guidelines

- Use a simple, recognizable design
- Ensure good contrast and visibility at small sizes (16x16)
- Avoid fine details that won't be visible when scaled down
- Use colors that work well on both light and dark backgrounds
- Consider the app's brand identity and color scheme
