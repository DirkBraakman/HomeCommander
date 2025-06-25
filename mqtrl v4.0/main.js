// MQTRL - Main Electron Process
const { app, BrowserWindow, ipcMain, net } = require('electron');
const path = require('path');
const fs = require('fs');
const mqtt = require('mqtt');

const CONFIG_PATH = path.join(__dirname, 'mqtrl.config');
let settingsWindow, dashboardWindow, devicesWindow;

// Create windows
function createSettingsWindow() {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.focus();
    return;
  }
  settingsWindow = new BrowserWindow({
    width: 400,
    height: 550,
    resizable: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });
  settingsWindow.loadFile('settings.html');
  settingsWindow.on('closed', () => settingsWindow = null);
}

function createDashboardWindow() {
  if (dashboardWindow && !dashboardWindow.isDestroyed()) {
    dashboardWindow.focus();
    return;
  }
  dashboardWindow = new BrowserWindow({
    fullscreen: true,
    frame: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });
  dashboardWindow.loadFile('dashboard.html');
  dashboardWindow.on('closed', () => dashboardWindow = null);
}

function createDevicesWindow() {
  if (devicesWindow && !devicesWindow.isDestroyed()) {
    devicesWindow.focus();
    return;
  }
  devicesWindow = new BrowserWindow({
    width: 900,
    height: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });
  devicesWindow.loadFile('devices.html');
  devicesWindow.on('closed', () => devicesWindow = null);
}

app.whenReady().then(createSettingsWindow);
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// IPC Handlers
ipcMain.handle('load-config', async () => {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
    }
    return {};
  } catch (e) {
    return {};
  }
});

ipcMain.handle('save-config', async (event, config) => {
  try {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('clear-config', async () => {
  try {
    if (fs.existsSync(CONFIG_PATH)) fs.unlinkSync(CONFIG_PATH);
    return true;
  } catch (e) {
    return false;
  }
});

ipcMain.on('open-settings-window', () => {
  if (devicesWindow && !devicesWindow.isDestroyed()) devicesWindow.close();
  createSettingsWindow();
});

ipcMain.on('open-devices-window', () => {
  if (settingsWindow && !settingsWindow.isDestroyed()) settingsWindow.close();
  createDevicesWindow();
});

ipcMain.handle('submit-settings', async (event, config) => {
  try {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
    if (settingsWindow && !settingsWindow.isDestroyed()) settingsWindow.close();
    createDashboardWindow();
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('submit-device-assignments', async () => {
  if (devicesWindow && !devicesWindow.isDestroyed()) devicesWindow.close();
  if (dashboardWindow && !dashboardWindow.isDestroyed()) {
    dashboardWindow.reload();
  } else {
    createDashboardWindow();
  }
  return { success: true };
});

// Home Assistant API
ipcMain.handle('get-ha-entities', async () => {
  console.log('get-ha-entities called');
  let config = {};
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
    }
  } catch (e) {
    console.log('Config load error:', e);
    return { success: false, error: 'Config load failed' };
  }
  
  if (!config.ip || !config.token) {
    console.log('Missing IP or token');
    return { success: false, error: 'IP or Token missing' };
  }

  const url = `http://${config.ip}:${config.apiPort || 8123}/api/states`;
  console.log('Fetching from URL:', url);
  
  return new Promise((resolve) => {
    const request = net.request({
      method: 'GET',
      url: url,
      headers: { 'Authorization': `Bearer ${config.token}` }
    });

    let body = '';
    request.on('response', (response) => {
      console.log('Response status:', response.statusCode);
      response.on('data', (chunk) => body += chunk.toString());
      response.on('end', () => {
        if (response.statusCode === 200) {
          try {
            const entities = JSON.parse(body);
            const filtered = entities
              .filter(e => ['light', 'switch', 'button'].includes(e.entity_id.split('.')[0]))
              .map(e => ({
                id: e.entity_id,
                name: e.attributes.friendly_name || e.entity_id,
                type: e.entity_id.split('.')[0]
              }));
            console.log(`Found ${filtered.length} compatible entities`);
            resolve({ success: true, data: filtered });
          } catch (e) {
            console.log('Parse error:', e);
            resolve({ success: false, error: 'Parse error' });
          }
        } else {
          console.log(`HTTP error: ${response.statusCode}`);
          resolve({ success: false, error: `HTTP ${response.statusCode}` });
        }
      });
    });

    request.on('error', (error) => {
      console.log('Request error:', error);
      resolve({ success: false, error: error.message });
    });

    request.end();
  });
});

// MQTT Test
ipcMain.handle('test-mqtt', async (event, opts) => {
  return new Promise((resolve) => {
    try {
      const client = mqtt.connect(`mqtt://${opts.ip}:${opts.mqttPort}`, {
        username: opts.username,
        password: opts.password,
      });
      
      const timeout = setTimeout(() => {
        client.end();
        resolve({ success: false, error: 'timeout' });
      }, 3000);
      
      client.on('connect', () => {
        clearTimeout(timeout);
        client.end();
        resolve({ success: true });
      });
      
      client.on('error', (err) => {
        clearTimeout(timeout);
        client.end();
        resolve({ success: false, error: err.message });
      });
    } catch (e) {
      resolve({ success: false, error: e.message });
    }
  });
});
