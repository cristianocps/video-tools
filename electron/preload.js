const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  selectVideo: () => ipcRenderer.invoke('select-video'),
  selectAudio: () => ipcRenderer.invoke('select-audio'),
  selectOutput: (defaultName) => ipcRenderer.invoke('select-output', defaultName),
  selectAudioOutput: (defaultName) => ipcRenderer.invoke('select-audio-output', defaultName),
  mergeVideoAudio: (params) => ipcRenderer.invoke('merge-video-audio', params),
  extractAudio: (params) => ipcRenderer.invoke('extract-audio', params),
  removeAudio: (params) => ipcRenderer.invoke('remove-audio', params),
  getVideoInfo: (filePath) => ipcRenderer.invoke('get-video-info', filePath),
  getAudioInfo: (filePath) => ipcRenderer.invoke('get-audio-info', filePath),
  onMergeProgress: (callback) => {
    ipcRenderer.on('merge-progress', (event, progress) => callback(progress));
  },
  windowMinimize: () => ipcRenderer.invoke('window-minimize'),
  windowClose: () => ipcRenderer.invoke('window-close'),
  
  // YouTube API
  youtubeCheck: () => ipcRenderer.invoke('youtube-check'),
  youtubeGetInfo: (url, password) => ipcRenderer.invoke('youtube-get-info', url, password),
  youtubeDownload: (params) => ipcRenderer.invoke('youtube-download', params),
  selectDownloadFolder: () => ipcRenderer.invoke('select-download-folder'),
  
  // System notifications
  showNotification: (options) => ipcRenderer.invoke('show-notification', options),
  
  // File operations
  showInFolder: (filePath) => ipcRenderer.invoke('show-in-folder', filePath),
  openFile: (filePath) => ipcRenderer.invoke('open-file', filePath)
});
