#!/usr/bin/env node

/**
 * Build Windows portable app without Wine
 * This creates a working build as a ZIP file that can be extracted and run
 */

const builder = require('electron-builder');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

const projectRoot = path.join(__dirname, '..');

// Read the package.json build config
const pkg = require(path.join(projectRoot, 'package.json'));
const config = pkg.build;

console.log('========================================');
console.log('Video Tools - Windows Build (No Wine)');
console.log('========================================\n');

// Modify config to only build dir (unpacked folder)
const modifiedConfig = {
  ...config,
  win: {
    ...config.win,
    icon: null, // Skip icon to avoid rcedit
    signAndEditExecutable: false,
    target: [{ target: 'dir', arch: ['x64'] }]
  }
};

console.log('Building Windows app (portable folder)...\n');

builder.build({
  targets: builder.Platform.WINDOWS.createTarget(['dir'], builder.Arch.x64),
  config: modifiedConfig
}).then(() => {
  console.log('\nCreating ZIP archive...');
  
  const releaseDir = path.join(projectRoot, 'release');
  const unpackedDir = path.join(releaseDir, 'win-unpacked');
  const zipName = `Video-Tools-${pkg.version}-win-x64-portable.zip`;
  const zipPath = path.join(releaseDir, zipName);
  
  // Remove existing zip if present
  if (fs.existsSync(zipPath)) {
    fs.unlinkSync(zipPath);
  }
  
  // Create zip using system zip command
  try {
    execSync(`cd "${releaseDir}" && zip -r "${zipName}" win-unpacked`, { stdio: 'inherit' });
    
    const stats = fs.statSync(zipPath);
    const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
    
    console.log('\n========================================');
    console.log('Build completed successfully!');
    console.log('');
    console.log(`Output: release/${zipName}`);
    console.log(`Size: ${sizeMB} MB`);
    console.log('');
    console.log('Instructions:');
    console.log('1. Copy the ZIP to a Windows machine');
    console.log('2. Extract to any folder');
    console.log('3. Run "Video Tools.exe"');
    console.log('');
    console.log('Note: No installation required (portable)');
    console.log('========================================');
  } catch (e) {
    console.log('\nCould not create ZIP (zip command not found)');
    console.log('The unpacked app is in: release/win-unpacked/');
    console.log('You can manually zip this folder or copy it to Windows.');
  }
}).catch((error) => {
  console.error('\nBuild failed:', error.message);
  process.exit(1);
});
