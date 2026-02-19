const { app, BrowserWindow, ipcMain, dialog, Notification, shell } = require('electron');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const YTDlpWrap = require('yt-dlp-wrap').default;

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

// Try to find ffmpeg - prioritize system on Linux, bundled on Windows/Mac
function findFFmpeg() {
  const platform = process.platform;
  
  // System paths to check
  const systemPaths = [
    '/usr/bin/ffmpeg',
    '/usr/local/bin/ffmpeg',
    '/opt/homebrew/bin/ffmpeg',
    '/snap/bin/ffmpeg',
    'C:\\ffmpeg\\bin\\ffmpeg.exe',
    'C:\\Program Files\\ffmpeg\\bin\\ffmpeg.exe'
  ];
  
  // On Linux, prefer system FFmpeg (smaller package size)
  if (platform === 'linux') {
    for (const p of systemPaths) {
      if (fs.existsSync(p)) {
        console.log('Using system FFmpeg:', p);
        return p;
      }
    }
  }
  
  // Try bundled version (for Windows/Mac or Linux fallback)
  const bundledPath = getBundledPath('ffmpeg');
  if (bundledPath && fs.existsSync(bundledPath)) {
    console.log('Using bundled FFmpeg:', bundledPath);
    return bundledPath;
  }
  
  // Final fallback to system paths (for Windows/Mac)
  for (const p of systemPaths) {
    if (fs.existsSync(p)) {
      console.log('Using system FFmpeg:', p);
      return p;
    }
  }
  
  // Last resort: hope it's in PATH
  console.log('Using FFmpeg from PATH');
  return 'ffmpeg';
}

function findFFprobe() {
  const platform = process.platform;
  
  // System paths to check
  const systemPaths = [
    '/usr/bin/ffprobe',
    '/usr/local/bin/ffprobe',
    '/opt/homebrew/bin/ffprobe',
    '/snap/bin/ffprobe',
    'C:\\ffmpeg\\bin\\ffprobe.exe',
    'C:\\Program Files\\ffmpeg\\bin\\ffprobe.exe'
  ];
  
  // On Linux, prefer system FFprobe (smaller package size)
  if (platform === 'linux') {
    for (const p of systemPaths) {
      if (fs.existsSync(p)) {
        console.log('Using system FFprobe:', p);
        return p;
      }
    }
  }
  
  // Try bundled version (for Windows/Mac or Linux fallback)
  const bundledPath = getBundledPath('ffprobe');
  if (bundledPath && fs.existsSync(bundledPath)) {
    console.log('Using bundled FFprobe:', bundledPath);
    return bundledPath;
  }
  
  // Final fallback to system paths (for Windows/Mac)
  for (const p of systemPaths) {
    if (fs.existsSync(p)) {
      console.log('Using system FFprobe:', p);
      return p;
    }
  }
  
  // Last resort: hope it's in PATH
  console.log('Using FFprobe from PATH');
  return 'ffprobe';
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
    width: 900,
    height: 800,
    minWidth: 600,
    minHeight: 550,
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
  // In production (packaged), load from dist folder
  if (!app.isPackaged) {
    console.log('Development mode - loading from localhost:5173');
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    // In packaged app, files are in the asar archive
    const indexPath = path.join(__dirname, '../dist/index.html');
    console.log('Production mode - loading from:', indexPath);
    mainWindow.loadFile(indexPath);
  }

  // Handle load errors
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('Failed to load:', errorCode, errorDescription);
  });
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

// ============================================
// YouTube Download Features
// ============================================

let ytDlp = null;

// Initialize yt-dlp
async function initYtDlp() {
  if (ytDlp) return ytDlp;
  
  try {
    // Try to find yt-dlp in system PATH or bundled
    const ytDlpPaths = [
      '/usr/bin/yt-dlp',
      '/usr/local/bin/yt-dlp',
      'yt-dlp'
    ];
    
    for (const p of ytDlpPaths) {
      try {
        ytDlp = new YTDlpWrap(p);
        await ytDlp.getVersion();
        console.log('Using yt-dlp:', p);
        return ytDlp;
      } catch (e) {
        continue;
      }
    }
    
    // Download yt-dlp if not found
    console.log('yt-dlp not found, downloading...');
    const ytDlpDir = path.join(app.getPath('userData'), 'yt-dlp');
    if (!fs.existsSync(ytDlpDir)) {
      fs.mkdirSync(ytDlpDir, { recursive: true });
    }
    
    const ytDlpPath = path.join(ytDlpDir, process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp');
    
    if (!fs.existsSync(ytDlpPath)) {
      await YTDlpWrap.downloadFromGithub(ytDlpPath);
    }
    
    ytDlp = new YTDlpWrap(ytDlpPath);
    console.log('Using downloaded yt-dlp:', ytDlpPath);
    return ytDlp;
  } catch (e) {
    console.error('Failed to initialize yt-dlp:', e);
    return null;
  }
}

// Get YouTube video info
ipcMain.handle('youtube-get-info', async (event, url, password = null) => {
  try {
    const yt = await initYtDlp();
    if (!yt) {
      return { success: false, message: 'yt-dlp not available. Please install yt-dlp.' };
    }
    
    const args = [url];
    if (password) {
      args.push('--video-password', password);
    }
    
    let info;
    try {
      info = await yt.getVideoInfo(args);
    } catch (e) {
      const errorMsg = e.message || e.stderr || String(e);
      
      // Check if password is required
      if (errorMsg.includes('password') || errorMsg.includes('--video-password')) {
        return { 
          success: false, 
          needsPassword: true,
          message: 'This video is password protected. Please enter the password.'
        };
      }
      
      // Check for age restriction
      if (errorMsg.includes('age') || errorMsg.includes('Sign in')) {
        return {
          success: false,
          message: 'This video is age-restricted or requires sign-in.'
        };
      }
      
      throw e;
    }
    
    // Extract relevant information
    const formats = info.formats || [];
    
    // Get video formats (with video stream)
    const videoFormats = formats
      .filter(f => f.vcodec && f.vcodec !== 'none' && f.height)
      .map(f => ({
        formatId: f.format_id,
        ext: f.ext,
        resolution: `${f.width || '?'}x${f.height}`,
        height: f.height,
        fps: f.fps,
        vcodec: f.vcodec,
        filesize: f.filesize || f.filesize_approx,
        hasAudio: f.acodec && f.acodec !== 'none'
      }))
      .sort((a, b) => (b.height || 0) - (a.height || 0));
    
    // Get audio formats
    const audioFormats = formats
      .filter(f => f.acodec && f.acodec !== 'none' && (!f.vcodec || f.vcodec === 'none'))
      .map(f => ({
        formatId: f.format_id,
        ext: f.ext,
        acodec: f.acodec,
        abr: f.abr,
        language: f.language || 'default',
        filesize: f.filesize || f.filesize_approx
      }))
      .sort((a, b) => (b.abr || 0) - (a.abr || 0));
    
    // Get unique audio languages
    const audioTracks = [];
    const seenLanguages = new Set();
    
    for (const af of audioFormats) {
      const lang = af.language || 'default';
      if (!seenLanguages.has(lang)) {
        seenLanguages.add(lang);
        audioTracks.push({
          language: lang,
          formats: audioFormats.filter(f => (f.language || 'default') === lang)
        });
      }
    }
    
    return {
      success: true,
      info: {
        title: info.title,
        channel: info.channel || info.uploader,
        duration: info.duration,
        thumbnail: info.thumbnail,
        description: info.description?.substring(0, 200),
        videoFormats: videoFormats.slice(0, 10), // Top 10 video formats
        audioTracks,
        url
      }
    };
  } catch (e) {
    console.error('YouTube info error:', e);
    return { success: false, message: e.message || 'Failed to get video info' };
  }
});

// Select download folder
ipcMain.handle('select-download-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory', 'createDirectory']
  });
  return result.canceled ? null : result.filePaths[0];
});

// Download YouTube video
ipcMain.handle('youtube-download', async (event, { url, videoFormatId, audioFormatId, outputFolder, filename, mergeAudio, audioOnly, password }) => {
  try {
    const yt = await initYtDlp();
    if (!yt) {
      return { success: false, message: 'yt-dlp not available' };
    }
    
    // Sanitize filename
    const safeFilename = filename.replace(/[<>:"/\\|?*]/g, '_');
    const outputTemplate = path.join(outputFolder, `${safeFilename}.%(ext)s`);
    
    let args = [url, '-o', outputTemplate];
    
    // Add password if provided
    if (password) {
      args.push('--video-password', password);
    }
    
    if (audioOnly) {
      // Download audio only and convert to MP3
      if (audioFormatId) {
        args.push('-f', audioFormatId);
      } else {
        args.push('-f', 'bestaudio');
      }
      args.push('-x'); // Extract audio
      args.push('--audio-format', 'mp3');
      args.push('--audio-quality', '0'); // Best quality
      
      if (ffmpegPath) {
        args.push('--ffmpeg-location', path.dirname(ffmpegPath));
      }
    } else if (mergeAudio && videoFormatId && audioFormatId) {
      // Download and merge video + audio
      args.push('-f', `${videoFormatId}+${audioFormatId}`);
      args.push('--merge-output-format', 'mp4');
      
      // Use bundled FFmpeg if available
      if (ffmpegPath) {
        args.push('--ffmpeg-location', path.dirname(ffmpegPath));
      }
    } else if (videoFormatId) {
      // Download video only
      args.push('-f', videoFormatId);
    } else if (audioFormatId) {
      // Download audio only
      args.push('-f', audioFormatId);
      args.push('-x'); // Extract audio
      args.push('--audio-format', 'mp3');
      
      if (ffmpegPath) {
        args.push('--ffmpeg-location', path.dirname(ffmpegPath));
      }
    } else {
      // Best quality
      args.push('-f', 'bestvideo+bestaudio/best');
      args.push('--merge-output-format', 'mp4');
      
      if (ffmpegPath) {
        args.push('--ffmpeg-location', path.dirname(ffmpegPath));
      }
    }
    
    // Add progress tracking
    args.push('--newline');
    args.push('--no-warnings');
    
    console.log('yt-dlp args:', args);
    
    return new Promise((resolve) => {
      let lastProgress = 0;
      let outputFile = '';
      
      const process = yt.exec(args);
      
      process.on('progress', (progress) => {
        if (progress.percent !== undefined) {
          lastProgress = progress.percent;
          mainWindow.webContents.send('merge-progress', Math.round(progress.percent));
        }
      });
      
      process.on('ytDlpEvent', (eventType, eventData) => {
        console.log('yt-dlp event:', eventType, eventData);
        if (eventType === 'download' && eventData.includes('Destination:')) {
          outputFile = eventData.replace('Destination:', '').trim();
        }
      });
      
      process.on('error', (error) => {
        console.error('yt-dlp error:', error);
        resolve({ success: false, message: error.message || 'Download failed' });
      });
      
      process.on('close', () => {
        mainWindow.webContents.send('merge-progress', 100);
        resolve({ 
          success: true, 
          message: 'Download completed!',
          outputFile: outputFile || outputFolder
        });
      });
    });
  } catch (e) {
    console.error('YouTube download error:', e);
    return { success: false, message: e.message || 'Download failed' };
  }
});

// Check if yt-dlp is available
ipcMain.handle('youtube-check', async () => {
  try {
    const yt = await initYtDlp();
    if (yt) {
      const version = await yt.getVersion();
      return { available: true, version };
    }
    return { available: false };
  } catch (e) {
    return { available: false, error: e.message };
  }
});

// System notifications
ipcMain.handle('show-notification', async (event, { title, body, type }) => {
  if (!Notification.isSupported()) {
    console.log('Notifications not supported');
    return false;
  }
  
  const notification = new Notification({
    title: title || 'Video Tools',
    body: body || '',
    icon: path.join(__dirname, '../build/icon.png'),
    silent: false
  });
  
  notification.on('click', () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });
  
  notification.show();
  return true;
});

// Open file in system file manager
ipcMain.handle('show-in-folder', async (event, filePath) => {
  if (filePath && fs.existsSync(filePath)) {
    shell.showItemInFolder(filePath);
    return true;
  } else if (filePath) {
    // Try to open the parent directory if file doesn't exist
    const dir = path.dirname(filePath);
    if (fs.existsSync(dir)) {
      shell.openPath(dir);
      return true;
    }
  }
  return false;
});

// Open file with default application
ipcMain.handle('open-file', async (event, filePath) => {
  if (filePath && fs.existsSync(filePath)) {
    shell.openPath(filePath);
    return true;
  }
  return false;
});
