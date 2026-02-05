#!/bin/bash

# Generate app icons from SVG
# Requires: inkscape or imagemagick (convert)

set -e

echo "========================================"
echo "Video Tools - Icon Generator"
echo "========================================"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

cd "$(dirname "$0")/.."

# Check if source SVG exists
if [ ! -f "build/icon.svg" ]; then
    echo -e "${RED}Error: build/icon.svg not found${NC}"
    exit 1
fi

# Create icons directory
mkdir -p build/icons

# Function to convert SVG to PNG using available tool
convert_svg() {
    local size=$1
    local output=$2
    
    if command -v inkscape &> /dev/null; then
        inkscape build/icon.svg --export-type=png --export-filename="$output" -w $size -h $size 2>/dev/null
    elif command -v convert &> /dev/null; then
        convert -background none -resize ${size}x${size} build/icon.svg "$output"
    elif command -v rsvg-convert &> /dev/null; then
        rsvg-convert -w $size -h $size build/icon.svg -o "$output"
    else
        echo -e "${RED}Error: No SVG converter found. Install inkscape, imagemagick, or librsvg${NC}"
        exit 1
    fi
}

echo -e "${YELLOW}Generating PNG icons...${NC}"

# Generate various sizes
sizes=(16 32 48 64 128 256 512 1024)
for size in "${sizes[@]}"; do
    echo "  Creating ${size}x${size}..."
    convert_svg $size "build/icons/icon-${size}.png"
done

# Copy main icon sizes
cp build/icons/icon-256.png build/icon.png

echo -e "${YELLOW}Generating Windows .ico...${NC}"
if command -v convert &> /dev/null; then
    convert build/icons/icon-16.png build/icons/icon-32.png build/icons/icon-48.png build/icons/icon-64.png build/icons/icon-128.png build/icons/icon-256.png build/icon.ico
    echo -e "${GREEN}  Created build/icon.ico${NC}"
else
    echo -e "${YELLOW}  Skipped .ico (imagemagick not installed)${NC}"
fi

echo -e "${YELLOW}Generating macOS .icns...${NC}"
if command -v iconutil &> /dev/null; then
    # Create iconset directory
    mkdir -p build/icon.iconset
    cp build/icons/icon-16.png build/icon.iconset/icon_16x16.png
    cp build/icons/icon-32.png build/icon.iconset/icon_16x16@2x.png
    cp build/icons/icon-32.png build/icon.iconset/icon_32x32.png
    cp build/icons/icon-64.png build/icon.iconset/icon_32x32@2x.png
    cp build/icons/icon-128.png build/icon.iconset/icon_128x128.png
    cp build/icons/icon-256.png build/icon.iconset/icon_128x128@2x.png
    cp build/icons/icon-256.png build/icon.iconset/icon_256x256.png
    cp build/icons/icon-512.png build/icon.iconset/icon_256x256@2x.png
    cp build/icons/icon-512.png build/icon.iconset/icon_512x512.png
    cp build/icons/icon-1024.png build/icon.iconset/icon_512x512@2x.png
    
    iconutil -c icns build/icon.iconset -o build/icon.icns
    rm -rf build/icon.iconset
    echo -e "${GREEN}  Created build/icon.icns${NC}"
elif command -v png2icns &> /dev/null; then
    png2icns build/icon.icns build/icons/icon-16.png build/icons/icon-32.png build/icons/icon-128.png build/icons/icon-256.png build/icons/icon-512.png build/icons/icon-1024.png
    echo -e "${GREEN}  Created build/icon.icns${NC}"
else
    echo -e "${YELLOW}  Skipped .icns (iconutil/png2icns not available - macOS only)${NC}"
fi

# Copy icons for snap
mkdir -p snap/gui
cp build/icons/icon-256.png snap/gui/video-tools.png

echo ""
echo -e "${GREEN}========================================"
echo "Icons generated successfully!"
echo ""
echo "Files created:"
echo "  build/icon.svg     - Source SVG"
echo "  build/icon.png     - Main PNG (256x256)"
echo "  build/icon.ico     - Windows icon"
echo "  build/icon.icns    - macOS icon"
echo "  build/icons/       - All PNG sizes"
echo "========================================${NC}"
