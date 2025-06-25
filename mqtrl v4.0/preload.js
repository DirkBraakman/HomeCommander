// MQTRL Preload Script
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('mqtrl', {
  loadConfig: () => ipcRenderer.invoke('load-config'),
  saveConfig: (config) => ipcRenderer.invoke('save-config', config),
  clearConfig: () => ipcRenderer.invoke('clear-config'),
  openSettingsWindow: () => ipcRenderer.send('open-settings-window'),
  openDevicesWindow: () => ipcRenderer.send('open-devices-window'),
  submitSettings: (config) => ipcRenderer.invoke('submit-settings', config),
  submitDeviceAssignments: () => ipcRenderer.invoke('submit-device-assignments'),
  getHaEntities: () => ipcRenderer.invoke('get-ha-entities'),
  testMqtt: (opts) => ipcRenderer.invoke('test-mqtt', opts),
});
