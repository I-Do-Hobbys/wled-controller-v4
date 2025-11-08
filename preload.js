// preload.js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('wledAPI', {
    getDevices: () => ipcRenderer.invoke('wled:get-devices'),
    onUpdate: (callback) => ipcRenderer.on('wled:update', (_, devices) => callback(devices)),
});