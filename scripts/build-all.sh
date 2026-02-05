#!/bin/bash

# Build script for Video Tools
# This script builds installers for all platforms

set -e

echo "========================================"
echo "Video Tools - Build Script"
echo "========================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}Error: package.json not found. Run this script from the project root.${NC}"
    exit 1
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Installing dependencies...${NC}"
    npm install
fi

# Build the Vite app first
echo -e "${YELLOW}Building Vite app...${NC}"
npm run build

# Function to build for a specific platform
build_platform() {
    local platform=$1
    echo -e "${YELLOW}Building for ${platform}...${NC}"
    
    case $platform in
        "windows")
            npm run build:win
            ;;
        "linux")
            npm run build:linux
            ;;
        "linux-deb")
            npm run build:linux:deb
            ;;
        "linux-rpm")
            npm run build:linux:rpm
            ;;
        "linux-appimage")
            npm run build:linux:appimage
            ;;
        "linux-snap")
            npm run build:linux:snap
            ;;
        "linux-flatpak")
            npm run build:linux:flatpak
            ;;
        "mac")
            npm run build:mac
            ;;
        "all")
            npm run build:all
            ;;
        *)
            echo -e "${RED}Unknown platform: ${platform}${NC}"
            exit 1
            ;;
    esac
    
    echo -e "${GREEN}Build for ${platform} completed!${NC}"
}

# Parse arguments
if [ $# -eq 0 ]; then
    echo "Usage: $0 <platform>"
    echo ""
    echo "Available platforms:"
    echo "  windows       - Windows installer (NSIS + Portable)"
    echo "  linux         - All Linux formats"
    echo "  linux-deb     - Debian/Ubuntu package (.deb)"
    echo "  linux-rpm     - RedHat/Fedora package (.rpm)"
    echo "  linux-appimage - AppImage"
    echo "  linux-snap    - Snap package"
    echo "  linux-flatpak - Flatpak package"
    echo "  mac           - macOS installer (DMG + ZIP)"
    echo "  all           - All platforms"
    exit 0
fi

# Build for specified platform
build_platform $1

echo ""
echo -e "${GREEN}========================================"
echo "Build completed successfully!"
echo "Output files are in the 'release' directory"
echo "========================================${NC}"
