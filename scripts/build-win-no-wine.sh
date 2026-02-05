#!/bin/bash

# Build Windows installer without Wine
# This creates a working build but without custom icon/version info in the exe
# The icon will still be embedded in the installer

set -e

echo "========================================"
echo "Video Tools - Windows Build (No Wine)"
echo "========================================"

cd "$(dirname "$0")/.."

# Prepare FFmpeg
echo "Preparing FFmpeg binaries..."
node scripts/prepare-ffmpeg.js

# Build Vite
echo "Building Vite app..."
npm run build

# Build with electron-builder, skipping rcedit by removing icon temporarily
echo "Building Windows installer..."

# Use node to run electron-builder with modified config
node -e "
const builder = require('electron-builder');
const config = require('./package.json').build;

// Remove icon from win config to skip rcedit
const modifiedConfig = {
  ...config,
  win: {
    ...config.win,
    icon: null,
    signAndEditExecutable: false
  }
};

builder.build({
  targets: builder.Platform.WINDOWS.createTarget(),
  config: modifiedConfig
}).then(() => {
  console.log('Build completed!');
}).catch((error) => {
  console.error('Build failed:', error);
  process.exit(1);
});
"

echo ""
echo "========================================"
echo "Build completed!"
echo "Note: The .exe file won't have a custom icon (Windows default icon)"
echo "      but the installer and app will work correctly."
echo ""
echo "To add custom icon, build on Windows or install wine32:"
echo "  sudo dpkg --add-architecture i386"
echo "  sudo apt update"  
echo "  sudo apt install wine32:i386"
echo "========================================"
