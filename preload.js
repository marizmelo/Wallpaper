const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  quit: () => ipcRenderer.send('quit'),
  sendHeadData: (data) => ipcRenderer.send('head-data', data),
  onHeadData: (callback) => ipcRenderer.on('head-data', (_event, data) => callback(data)),
  sendReady: () => ipcRenderer.send('window-ready'),
  onAllReady: (callback) => ipcRenderer.on('all-ready', () => callback())
});
