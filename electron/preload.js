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
  windowClose: () => ipcRenderer.invoke('window-close')
});
