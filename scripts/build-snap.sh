#!/bin/bash

# Build Snap package for Video Tools
# Requires: snapcraft

set -e

echo "========================================"
echo "Video Tools - Snap Build Script"
echo "========================================"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check if snapcraft is installed
if ! command -v snapcraft &> /dev/null; then
    echo -e "${RED}Error: snapcraft is not installed.${NC}"
    echo "Install it with: sudo snap install snapcraft --classic"
    exit 1
fi

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}Error: Run this script from the project root.${NC}"
    exit 1
fi

# Build the app first using electron-builder
echo -e "${YELLOW}Building Electron app...${NC}"
npm run build:linux:snap

# Or build using snapcraft directly
# echo -e "${YELLOW}Building Snap with snapcraft...${NC}"
# snapcraft

echo ""
echo -e "${GREEN}========================================"
echo "Snap build completed!"
echo "The .snap file is in the 'release' directory"
echo ""
echo "To install locally:"
echo "  sudo snap install release/*.snap --dangerous"
echo ""
echo "To publish to Snap Store:"
echo "  snapcraft login"
echo "  snapcraft upload release/*.snap --release=stable"
echo "========================================${NC}"
