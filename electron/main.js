const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');

// Get the path to bundled FFmpeg binaries
function getBundledPath(binaryName) {
  const isDev = !app.isPackaged;
  
  if (isDev) {
    // In development, use the node_modules paths
    try {
      if (binaryName === 'ffmpeg') {
        return require('ffmpeg-static');
      } else {
        return require('ffprobe-static').path;
      }
    } catch (e) {
      return null;
    }
  } else {
    // In production, binaries are in the resources folder
    const platform = process.platform;
    const arch = process.arch;
    
    let binaryFileName = binaryName;
    if (platform === 'win32') {
      binaryFileName += '.exe';
    }
    
    // Try different possible locations
    const possiblePaths = [
      path.join(process.resourcesPath, 'bin', binaryFileName),
      path.join(process.resourcesPath, 'ffmpeg', binaryFileName),
      path.join(app.getAppPath(), '..', 'bin', binaryFileName),
      path.join(app.getAppPath(), 'bin', binaryFileName),
    ];
    
    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        return p;
      }
    }
  }
  return null;
}

// Try to find ffmpeg - first bundled, then system
function findFFmpeg() {
  // Try bundled version first
  const bundledPath = getBundledPath('ffmpeg');
  if (bundledPath && fs.existsSync(bundledPath)) {
    console.log('Using bundled FFmpeg:', bundledPath);
    return bundledPath;
  }
  
  // Fall back to system paths
  const systemPaths = [
    '/usr/bin/ffmpeg',
    '/usr/local/bin/ffmpeg',
    '/opt/homebrew/bin/ffmpeg',
    'C:\\ffmpeg\\bin\\ffmpeg.exe',
    'ffmpeg'
  ];
  
  for (const p of systemPaths) {
    if (p === 'ffmpeg' || fs.existsSync(p)) {
      console.log('Using system FFmpeg:', p);
      return p;
    }
  }
  
  return null;
}

function findFFprobe() {
  // Try bundled version first
  const bundledPath = getBundledPath('ffprobe');
  if (bundledPath && fs.existsSync(bundledPath)) {
    console.log('Using bundled FFprobe:', bundledPath);
    return bundledPath;
  }
  
  // Fall back to system paths
  const systemPaths = [
    '/usr/bin/ffprobe',
    '/usr/local/bin/ffprobe',
    '/opt/homebrew/bin/ffprobe',
    'C:\\ffmpeg\\bin\\ffprobe.exe',
    'ffprobe'
  ];
  
  for (const p of systemPaths) {
    if (p === 'ffprobe' || fs.existsSync(p)) {
      console.log('Using system FFprobe:', p);
      return p;
    }
  }
  
  return null;
}

// Set FFmpeg paths
const ffmpegPath = findFFmpeg();
const ffprobePath = findFFprobe();

if (ffmpegPath) {
  ffmpeg.setFfmpegPath(ffmpegPath);
}
if (ffprobePath) {
  ffmpeg.setFfprobePath(ffprobePath);
}

// Track if FFmpeg is available
let ffmpegAvailable = !!ffmpegPath;

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    frame: false,
    transparent: false,
    resizable: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  // In development, load from Vite dev server
  if (process.env.NODE_ENV !== 'production') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// IPC Handlers
ipcMain.handle('select-video', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'Videos', extensions: ['mp4', 'mkv', 'avi', 'mov', 'webm', 'wmv', 'flv'] }
    ]
  });
  return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle('select-audio', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'Audio', extensions: ['mp3', 'wav', 'aac', 'flac', 'ogg', 'm4a', 'wma', 'mp4', 'mkv', 'webm'] }
    ]
  });
  return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle('select-output', async (event, defaultName) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath: defaultName,
    filters: [
      { name: 'Video', extensions: ['mp4'] }
    ]
  });
  return result.canceled ? null : result.filePath;
});

ipcMain.handle('merge-video-audio', async (event, { videoPath, audioPath, outputPath }) => {
  // Check if ffmpeg is available
  if (!ffmpegAvailable) {
    return { success: false, message: 'FFmpeg not found. Please reinstall the application.' };
  }

  // Get video duration for progress calculation
  let totalDuration = 0;
  try {
    const durationInfo = await new Promise((resolve, reject) => {
      ffmpeg.ffprobe(videoPath, (err, metadata) => {
        if (err) reject(err);
        else resolve(metadata);
      });
    });
    totalDuration = durationInfo.format.duration || 0;
  } catch (e) {
    console.log('Could not get duration, progress may not work');
  }

  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .input(audioPath)
      .outputOptions([
        '-c:v copy',        // Copy video stream without re-encoding
        '-c:a aac',         // Encode audio to AAC
        '-map 0:v:0',       // Use video from first input
        '-map 1:a:0',       // Use audio from second input
        '-shortest'         // End when the shortest stream ends
      ])
      .output(outputPath)
      .on('start', (cmd) => {
        console.log('FFmpeg command:', cmd);
        mainWindow.webContents.send('merge-progress', 5);
      })
      .on('progress', (progress) => {
        let percent = 0;
        if (progress.percent) {
          percent = progress.percent;
        } else if (progress.timemark && totalDuration > 0) {
          // Parse timemark (HH:MM:SS.ms) to seconds
          const parts = progress.timemark.split(':');
          const seconds = parseFloat(parts[0]) * 3600 + parseFloat(parts[1]) * 60 + parseFloat(parts[2]);
          percent = Math.min(95, (seconds / totalDuration) * 100);
        }
        console.log('Progress:', percent, progress);
        mainWindow.webContents.send('merge-progress', Math.round(percent));
      })
      .on('end', () => {
        mainWindow.webContents.send('merge-progress', 100);
        resolve({ success: true, message: 'Merge completed successfully!' });
      })
      .on('error', (err) => {
        console.error('FFmpeg error:', err);
        resolve({ success: false, message: err.message || 'FFmpeg error occurred' });
      })
      .run();
  });
});

// Window control handlers
ipcMain.handle('window-minimize', () => {
  mainWindow.minimize();
});

ipcMain.handle('window-close', () => {
  mainWindow.close();
});

ipcMain.handle('get-video-info', async (event, filePath) => {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) {
        reject(err);
      } else {
        resolve({
          duration: metadata.format.duration,
          hasAudio: metadata.streams.some(s => s.codec_type === 'audio'),
          hasVideo: metadata.streams.some(s => s.codec_type === 'video')
        });
      }
    });
  });
});

// Get audio/media file info (duration)
ipcMain.handle('get-audio-info', async (event, filePath) => {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) {
        reject(err);
      } else {
        const audioStream = metadata.streams.find(s => s.codec_type === 'audio');
        resolve({
          duration: metadata.format.duration,
          hasAudio: !!audioStream,
          codec: audioStream ? audioStream.codec_name : null,
          bitrate: audioStream ? audioStream.bit_rate : null,
          sampleRate: audioStream ? audioStream.sample_rate : null
        });
      }
    });
  });
});

// Select audio output file
ipcMain.handle('select-audio-output', async (event, defaultName) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath: defaultName,
    filters: [
      { name: 'Audio', extensions: ['mp3', 'wav', 'aac', 'm4a'] }
    ]
  });
  return result.canceled ? null : result.filePath;
});

// Extract audio from video
ipcMain.handle('extract-audio', async (event, { videoPath, outputPath }) => {
  if (!ffmpegAvailable) {
    return { success: false, message: 'FFmpeg not found. Please reinstall the application.' };
  }

  let totalDuration = 0;
  try {
    const durationInfo = await new Promise((resolve, reject) => {
      ffmpeg.ffprobe(videoPath, (err, metadata) => {
        if (err) reject(err);
        else resolve(metadata);
      });
    });
    totalDuration = durationInfo.format.duration || 0;
  } catch (e) {
    console.log('Could not get duration');
  }

  return new Promise((resolve) => {
    ffmpeg(videoPath)
      .noVideo()
      .audioCodec('libmp3lame')
      .audioBitrate('192k')
      .output(outputPath)
      .on('start', (cmd) => {
        console.log('FFmpeg command:', cmd);
        mainWindow.webContents.send('merge-progress', 5);
      })
      .on('progress', (progress) => {
        let percent = 0;
        if (progress.percent) {
          percent = progress.percent;
        } else if (progress.timemark && totalDuration > 0) {
          const parts = progress.timemark.split(':');
          const seconds = parseFloat(parts[0]) * 3600 + parseFloat(parts[1]) * 60 + parseFloat(parts[2]);
          percent = Math.min(95, (seconds / totalDuration) * 100);
        }
        mainWindow.webContents.send('merge-progress', Math.round(percent));
      })
      .on('end', () => {
        mainWindow.webContents.send('merge-progress', 100);
        resolve({ success: true, message: 'Audio extracted successfully!' });
      })
      .on('error', (err) => {
        console.error('FFmpeg error:', err);
        resolve({ success: false, message: err.message || 'FFmpeg error occurred' });
      })
      .run();
  });
});

// Remove audio from video
ipcMain.handle('remove-audio', async (event, { videoPath, outputPath }) => {
  if (!ffmpegAvailable) {
    return { success: false, message: 'FFmpeg not found. Please reinstall the application.' };
  }

  let totalDuration = 0;
  try {
    const durationInfo = await new Promise((resolve, reject) => {
      ffmpeg.ffprobe(videoPath, (err, metadata) => {
        if (err) reject(err);
        else resolve(metadata);
      });
    });
    totalDuration = durationInfo.format.duration || 0;
  } catch (e) {
    console.log('Could not get duration');
  }

  return new Promise((resolve) => {
    ffmpeg(videoPath)
      .noAudio()
      .videoCodec('copy')
      .output(outputPath)
      .on('start', (cmd) => {
        console.log('FFmpeg command:', cmd);
        mainWindow.webContents.send('merge-progress', 5);
      })
      .on('progress', (progress) => {
        let percent = 0;
        if (progress.percent) {
          percent = progress.percent;
        } else if (progress.timemark && totalDuration > 0) {
          const parts = progress.timemark.split(':');
          const seconds = parseFloat(parts[0]) * 3600 + parseFloat(parts[1]) * 60 + parseFloat(parts[2]);
          percent = Math.min(95, (seconds / totalDuration) * 100);
        }
        mainWindow.webContents.send('merge-progress', Math.round(percent));
      })
      .on('end', () => {
        mainWindow.webContents.send('merge-progress', 100);
        resolve({ success: true, message: 'Audio removed successfully!' });
      })
      .on('error', (err) => {
        console.error('FFmpeg error:', err);
        resolve({ success: false, message: err.message || 'FFmpeg error occurred' });
      })
      .run();
  });
});
