#!/usr/bin/env node

/**
 * Build Windows 64-bit portable version
 * Creates a folder/zip that can be run without installation
 */

const builder = require('electron-builder');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

const projectRoot = path.join(__dirname, '..');

// Ensure rcedit-x64 is in place of rcedit-ia32
async function ensureRceditX64() {
  const cacheDir = path.join(process.env.HOME, '.cache/electron-builder/winCodeSign/winCodeSign-2.6.0');
  const rceditPath = path.join(cacheDir, 'rcedit-ia32.exe');
  const toolsDir = path.join(projectRoot, 'tools');
  const rceditX64 = path.join(toolsDir, 'rcedit-x64.exe');
  
  // Download rcedit-x64 if not present
  if (!fs.existsSync(rceditX64)) {
    console.log('Downloading rcedit-x64.exe...');
    if (!fs.existsSync(toolsDir)) {
      fs.mkdirSync(toolsDir, { recursive: true });
    }
    execSync(`curl -L -o "${rceditX64}" https://github.com/electron/rcedit/releases/download/v2.0.0/rcedit-x64.exe`);
  }
  
  // Replace rcedit-ia32 with x64 version if cache exists
  if (fs.existsSync(cacheDir)) {
    const stat = fs.statSync(rceditPath);
    // Only replace if it's the 32-bit version (smaller size)
    if (stat.size < 1350000) {
      console.log('Replacing rcedit-ia32 with x64 version...');
      fs.copyFileSync(rceditX64, rceditPath);
    }
  }
}

async function main() {
  console.log('========================================');
  console.log('Video Tools - Windows x64 Portable Build');
  console.log('========================================\n');

  await ensureRceditX64();

  // Read the package.json build config
  const pkg = require(path.join(projectRoot, 'package.json'));
  const config = pkg.build;

  // Build only dir (portable folder), skip NSIS to avoid wine dependency
  const modifiedConfig = {
    ...config,
    win: {
      ...config.win,
      target: [{ target: 'dir', arch: ['x64'] }]
    }
  };

  console.log('Building Windows x64 portable app...\n');

  try {
    await builder.build({
      targets: builder.Platform.WINDOWS.createTarget(['dir'], builder.Arch.x64),
      config: modifiedConfig
    });

    // Create archive
    const releaseDir = path.join(projectRoot, 'release');
    const zipName = `Video-Tools-${pkg.version}-win-x64-portable.tar.gz`;
    
    console.log('\nCreating archive...');
    execSync(`cd "${releaseDir}" && tar -czvf "${zipName}" win-unpacked`, { stdio: 'pipe' });

    const stats = fs.statSync(path.join(releaseDir, zipName));
    const sizeMB = (stats.size / 1024 / 1024).toFixed(2);

    console.log('\n========================================');
    console.log('Build completed successfully!');
    console.log('');
    console.log(`Output: release/${zipName}`);
    console.log(`Size: ${sizeMB} MB`);
    console.log('');
    console.log('Instructions:');
    console.log('1. Copy to Windows and extract');
    console.log('2. Run "win-unpacked/Video Tools.exe"');
    console.log('');
    console.log('To create NSIS installer, install:');
    console.log('  sudo apt install nsis wine32:i386');
    console.log('Then run: npm run build:win');
    console.log('========================================');
  } catch (error) {
    console.error('\nBuild failed:', error.message);
    process.exit(1);
  }
}

main();
