#!/bin/bash

# Build Flatpak package for Video Tools
# Requires: flatpak-builder, flatpak

set -e

echo "========================================"
echo "Video Tools - Flatpak Build Script"
echo "========================================"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check if flatpak-builder is installed
if ! command -v flatpak-builder &> /dev/null; then
    echo -e "${RED}Error: flatpak-builder is not installed.${NC}"
    echo "Install it with: sudo apt install flatpak-builder"
    exit 1
fi

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}Error: Run this script from the project root.${NC}"
    exit 1
fi

# Install Flatpak runtime and SDK if not present
echo -e "${YELLOW}Checking Flatpak runtimes...${NC}"
flatpak install -y flathub org.freedesktop.Platform//23.08 || true
flatpak install -y flathub org.freedesktop.Sdk//23.08 || true
flatpak install -y flathub org.electronjs.Electron2.BaseApp//23.08 || true

# Build the Electron app first
echo -e "${YELLOW}Building Electron app...${NC}"
npm install
npm run build
npx electron-builder --linux dir

# Build Flatpak
echo -e "${YELLOW}Building Flatpak...${NC}"
cd flatpak
flatpak-builder --force-clean --user --install-deps-from=flathub --repo=repo --install builddir com.videotools.merger.yml

# Create the .flatpak bundle
echo -e "${YELLOW}Creating Flatpak bundle...${NC}"
flatpak build-bundle repo ../release/video-tools.flatpak com.videotools.merger

cd ..

echo ""
echo -e "${GREEN}========================================"
echo "Flatpak build completed!"
echo "The .flatpak file is in the 'release' directory"
echo ""
echo "To install locally:"
echo "  flatpak install release/video-tools.flatpak"
echo ""
echo "To run:"
echo "  flatpak run com.videotools.merger"
echo ""
echo "To publish to Flathub:"
echo "  Submit a PR to https://github.com/flathub/flathub"
echo "========================================${NC}"
