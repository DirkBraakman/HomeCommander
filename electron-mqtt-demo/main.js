const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;
const config = JSON.parse(fs.readFileSync('config.json'));

app.on('ready', () => {
  mainWindow = new BrowserWindow({
    fullscreen: true,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  // Geef config door aan renderer proces
  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow.webContents.send('config', config);
  });

  mainWindow.loadFile('index.html');
});