#!/usr/bin/env node

/**
 * Prepare FFmpeg binaries for packaging
 * This script copies the ffmpeg-static binaries to the bin folder
 * for electron-builder to include them in the final package.
 * 
 * On Linux, we skip this step as we use system FFmpeg to reduce package size.
 */

const fs = require('fs');
const path = require('path');

const projectRoot = path.join(__dirname, '..');
const platform = process.platform;
const targetPlatform = process.env.BUILD_TARGET_PLATFORM || platform;

console.log(`Preparing FFmpeg for platform: ${platform}`);
console.log(`Target platform: ${targetPlatform}`);

// On Linux builds, skip bundling FFmpeg (use system FFmpeg)
if (targetPlatform === 'linux') {
  console.log('Linux build detected - skipping FFmpeg bundling (will use system FFmpeg)');
  console.log('Make sure FFmpeg is installed: sudo apt install ffmpeg');
  
  // Create empty bin directory to prevent build errors
  const binDir = path.join(projectRoot, 'bin');
  if (!fs.existsSync(binDir)) {
    fs.mkdirSync(binDir, { recursive: true });
  }
  
  // Create placeholder files
  fs.writeFileSync(path.join(binDir, '.gitkeep'), '');
  process.exit(0);
}

// For Windows/Mac, bundle FFmpeg
let ffmpegPath, ffprobePath;

try {
  ffmpegPath = require('ffmpeg-static');
  ffprobePath = require('ffprobe-static').path;
} catch (e) {
  console.error('Error: ffmpeg-static or ffprobe-static not installed');
  console.error('Run: npm install ffmpeg-static ffprobe-static');
  console.error('Note: On Linux, these are optional as system FFmpeg is used.');
  process.exit(1);
}

console.log('FFmpeg binary:', ffmpegPath);
console.log('FFprobe binary:', ffprobePath);

// Create bin directory
const binDir = path.join(projectRoot, 'bin');
if (fs.existsSync(binDir)) {
  fs.rmSync(binDir, { recursive: true, force: true });
}
fs.mkdirSync(binDir, { recursive: true });

// Determine platform-specific binary names
const isWindows = platform === 'win32';
const ffmpegDest = path.join(binDir, isWindows ? 'ffmpeg.exe' : 'ffmpeg');
const ffprobeDest = path.join(binDir, isWindows ? 'ffprobe.exe' : 'ffprobe');

// Copy binaries
try {
  console.log(`Copying FFmpeg to ${ffmpegDest}...`);
  fs.copyFileSync(ffmpegPath, ffmpegDest);
  if (!isWindows) {
    fs.chmodSync(ffmpegDest, 0o755);
  }
  
  console.log(`Copying FFprobe to ${ffprobeDest}...`);
  fs.copyFileSync(ffprobePath, ffprobeDest);
  if (!isWindows) {
    fs.chmodSync(ffprobeDest, 0o755);
  }
  
  console.log('FFmpeg binaries prepared successfully!');
  console.log(`Binaries are in: ${binDir}`);
} catch (e) {
  console.error('Error copying binaries:', e.message);
  process.exit(1);
}

// Verify binaries
const ffmpegSize = fs.statSync(ffmpegDest).size;
const ffprobeSize = fs.statSync(ffprobeDest).size;

console.log(`\nBinary sizes:`);
console.log(`  ffmpeg: ${(ffmpegSize / 1024 / 1024).toFixed(2)} MB`);
console.log(`  ffprobe: ${(ffprobeSize / 1024 / 1024).toFixed(2)} MB`);
console.log(`  Total: ${((ffmpegSize + ffprobeSize) / 1024 / 1024).toFixed(2)} MB`);
