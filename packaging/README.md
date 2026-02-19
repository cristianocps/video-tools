# Packaging Files

This directory contains packaging files for various Linux distributions.

## Arch Linux (AUR)

Two PKGBUILD options are available:

### Option 1: Source Build (PKGBUILD)

Builds from source, uses system Electron and FFmpeg:

```bash
cd packaging/arch
makepkg -si
```

Dependencies:
- `electron` (from official repos or AUR)
- `ffmpeg`
- `nodejs`

### Option 2: AppImage (PKGBUILD-appimage)

Installs the pre-built AppImage:

```bash
cd packaging/arch
cp PKGBUILD-appimage PKGBUILD
makepkg -si
```

Dependencies:
- `fuse2`
- `ffmpeg`

## Debian/Ubuntu

Download the `.deb` package from the [releases page](https://github.com/cristianocps/simple-but-honest-video-tools/releases) and install:

```bash
sudo apt install ./SBH-Video-Tools-*-linux-x64.deb
```

Or install dependencies manually and use the AppImage:

```bash
sudo apt install ffmpeg
chmod +x SBH-Video-Tools-*.AppImage
./SBH-Video-Tools-*.AppImage
```

## Fedora/RHEL

Download the `.rpm` package from the [releases page](https://github.com/cristianocps/simple-but-honest-video-tools/releases) and install:

```bash
sudo dnf install ./SBH-Video-Tools-*-linux-x64.rpm
```

Or use the AppImage:

```bash
sudo dnf install ffmpeg
chmod +x SBH-Video-Tools-*.AppImage
./SBH-Video-Tools-*.AppImage
```

## Universal (AppImage)

The AppImage works on any Linux distribution:

1. Download the `.AppImage` file from releases
2. Make it executable: `chmod +x SBH-Video-Tools-*.AppImage`
3. Run it: `./SBH-Video-Tools-*.AppImage`

**Note:** Make sure `ffmpeg` is installed on your system:
- Ubuntu/Debian: `sudo apt install ffmpeg`
- Fedora: `sudo dnf install ffmpeg`
- Arch: `sudo pacman -S ffmpeg`

## Building from Source

```bash
# Clone the repository
git clone https://github.com/cristianocps/simple-but-honest-video-tools.git
cd simple-but-honest-video-tools

# Install dependencies
npm install

# Build for your platform
npm run build:linux:appimage  # AppImage
npm run build:linux:deb       # Debian/Ubuntu
npm run build:linux:rpm       # Fedora/RHEL
```
