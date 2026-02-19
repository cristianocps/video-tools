# Simple But Honest Video Tools

A simple and modern Electron application to work with audio and video files. Download, merge, extract, and edit video/audio with ease. Powered by FFmpeg & yt-dlp.

![SBH Video Tools](https://img.shields.io/badge/Electron-33-blue) ![License](https://img.shields.io/badge/License-MIT-green)

## Screenshots

Coming soon...

## Features

- **Video Download** - Download from YouTube, Vimeo, Twitter/X, TikTok, Instagram, and 1000+ sites
- **Audio Only Download** - Extract audio as MP3 from any video
- **Password Protected Videos** - Support for Vimeo and other password-protected content
- **Merge Audio & Video** - Add an audio track to a video file
- **Extract Audio** - Extract audio from video to MP3
- **Remove Audio** - Remove the audio track from a video
- **Job Queue** - Queue multiple jobs and process them in batch
- **Drag & Drop** - Easy file selection with drag and drop
- **History** - Track recently processed files
- **Light/Dark Theme** - Toggle between light, dark, or system theme
- **System Notifications** - Get notified when jobs complete
- **Modern UI** - Clean design with shadcn/ui components

### Video Download
The download feature supports 1000+ websites including:
- YouTube, Vimeo, Dailymotion
- Twitter/X, Instagram, TikTok, Facebook
- Twitch, Kick, Reddit
- And many more...

Features:
- Fetch video information from URL
- See available video qualities (resolution, FPS, codec)
- Select from multiple audio tracks (different languages)
- Download video and audio separately or merged
- Automatic yt-dlp download on first use

## Supported Formats

**Video Input:** MP4, MKV, AVI, MOV, WebM, WMV, FLV

**Audio Input:** MP3, WAV, AAC, FLAC, OGG, M4A, WMA, MP4

**Output:** MP4 (video), MP3 (audio)

## Prerequisites

- **Node.js** 18 or higher

> **Note:** FFmpeg is bundled with the application! You don't need to install it separately. The installers include FFmpeg (~76MB) and FFprobe (~62MB) binaries.

## Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run electron:dev
```

## Building Installers

### Quick Build Commands

```bash
# Build for current platform
npm run electron:build

# Build for specific platforms
npm run build:win           # Windows (NSIS + Portable)
npm run build:linux         # All Linux formats
npm run build:linux:deb     # Debian/Ubuntu (.deb)
npm run build:linux:rpm     # RedHat/Fedora (.rpm)
npm run build:linux:appimage # AppImage
npm run build:linux:snap    # Snap
npm run build:linux:flatpak # Flatpak
npm run build:mac           # macOS (DMG + ZIP)
npm run build:all           # All platforms
```

### Using Build Scripts

```bash
# Make scripts executable
chmod +x scripts/*.sh

# Build for a specific platform
./scripts/build-all.sh windows
./scripts/build-all.sh linux
./scripts/build-all.sh linux-snap
./scripts/build-all.sh linux-flatpak
```

### Building Snap Package

Requires `snapcraft`:

```bash
# Install snapcraft
sudo snap install snapcraft --classic

# Build snap
./scripts/build-snap.sh

# Install locally
sudo snap install release/*.snap --dangerous
```

### Building Flatpak Package

Requires `flatpak-builder`:

```bash
# Install dependencies
sudo apt install flatpak-builder
flatpak install flathub org.freedesktop.Platform//23.08
flatpak install flathub org.freedesktop.Sdk//23.08
flatpak install flathub org.electronjs.Electron2.BaseApp//23.08

# Build flatpak
./scripts/build-flatpak.sh

# Install locally
flatpak install release/video-tools.flatpak
```

### Building Windows Installer

```bash
# On Linux (cross-compile) or Windows
./scripts/build-windows.sh

# Or directly
npm run build:win
```

## Output Files

After building, installers are located in the `release/` directory:

| Platform | Files |
|----------|-------|
| Windows | `Video Tools Setup-*.exe`, `Video Tools-*-portable.exe` |
| Linux | `.deb`, `.rpm`, `.AppImage`, `.snap`, `.flatpak` |
| macOS | `.dmg`, `.zip` |

## Project Structure

```
video-editor/
├── electron/
│   ├── main.js          # Electron main process
│   └── preload.js       # Preload script (IPC bridge)
├── src/
│   ├── components/ui/   # shadcn/ui components
│   ├── App.jsx          # Main React component
│   └── index.css        # Tailwind styles
├── flatpak/             # Flatpak manifest files
├── snap/                # Snap manifest files
├── scripts/             # Build scripts
├── build/               # Build resources (icons)
└── release/             # Built installers
```

## Adding App Icons

Before building, add your icons to the `build/` directory:

```
build/
├── icon.ico             # Windows (256x256)
├── icon.icns            # macOS
└── icons/
    ├── icon-16.png
    ├── icon-32.png
    ├── icon-64.png
    ├── icon-128.png
    ├── icon-256.png
    └── icon-512.png
```

You can generate these from a single PNG using tools like:
- [electron-icon-builder](https://www.npmjs.com/package/electron-icon-builder)
- [png2icons](https://www.npmjs.com/package/png2icons)

## Tech Stack

- **Electron** - Cross-platform desktop app
- **React** - UI framework
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **shadcn/ui** - UI components
- **FFmpeg** - Video/audio processing (bundled via ffmpeg-static)
- **yt-dlp** - YouTube video downloading (auto-downloaded on first use)
- **electron-builder** - Packaging

## FFmpeg Bundling

The application bundles FFmpeg binaries using `ffmpeg-static` and `ffprobe-static` packages. This means:

- Users don't need to install FFmpeg separately
- The application works out of the box on all platforms
- Installers are larger (~140MB extra) but fully self-contained

The binaries are automatically prepared during the build process via `npm run prepare-ffmpeg`.

## License

MIT License - see [LICENSE](LICENSE) for details.
