const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  receiveConfig: (callback) => ipcRenderer.on('config', callback)
});