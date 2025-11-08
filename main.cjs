// main.js
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { startDiscovery, getDevices, onDevicesUpdated } = require('./discover-wled.cjs');
if (require('electron-squirrel-startup')) app.quit();

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: true,
    },
  });

  mainWindow.loadFile('dist/index.html'); // Adjust the path based on your build directory

  mainWindow.on('closed', function () {
    mainWindow = null;
  });

  mainWindow.webContents.openDevTools()
}


app.whenReady().then(() => {
  createWindow();
  startDiscovery();
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', function () {
  if (mainWindow === null) createWindow();
});

// IPC handlers
ipcMain.handle('wled:get-devices', () => getDevices());

onDevicesUpdated((devices) => {
    if (mainWindow) {
        mainWindow.webContents.send('wled:update', devices);
    }
});