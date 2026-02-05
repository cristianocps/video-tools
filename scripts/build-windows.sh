#!/bin/bash

# Build Windows installer for Video Tools
# Can be run on Linux with Wine or on Windows with WSL

set -e

echo "========================================"
echo "Video Tools - Windows Build Script"
echo "========================================"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}Error: Run this script from the project root.${NC}"
    exit 1
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Installing dependencies...${NC}"
    npm install
fi

# Build the app
echo -e "${YELLOW}Building Windows installer...${NC}"
npm run build:win

echo ""
echo -e "${GREEN}========================================"
echo "Windows build completed!"
echo "Output files in 'release' directory:"
echo "  - Video Tools Setup *.exe (NSIS installer)"
echo "  - Video Tools *-portable.exe (Portable version)"
echo "========================================${NC}"
