const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')
const fs = require('fs')

const CONFIG_PATH = path.join(__dirname, 'mqtrl.config')

let settingsWindow = null
let dashboardWindow = null
let devicesWindow = null

function loadConfig() {
  try {
    return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'))
  } catch {
    return { 
      ip: '', 
      port: '1883', 
      username: '', 
      password: '', 
      ha_api_port: '8123', 
      ha_token: ''
    }
  }
}

function saveConfig(config) {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf8')
}

// SpotsArr helpers
function ensureSpotsArr(config) {
  // Nooit automatisch vullen, alleen lezen
  if (!Array.isArray(config.spotsArr)) config.spotsArr = null
  if (config.spots) delete config.spots
  return config
}

// IPC handlers voor spots-array
ipcMain.handle('get-spots-array', () => {
  const config = ensureSpotsArr(loadConfig())
  if (Array.isArray(config.spotsArr)) {
    return config.spotsArr.slice(0, 8).concat(Array(8).fill(null)).slice(0, 8)
  }
  return Array(8).fill(null)
})

ipcMain.handle('set-spots-array', (e, arr) => {
  const config = loadConfig()
  config.spotsArr = Array.isArray(arr) ? arr.map(x => (typeof x === 'string' ? x : null)).slice(0, 8) : Array(8).fill(null)
  saveConfig(config)
  return true
})

// IPC handlers voor spots
ipcMain.handle('get-entity-spots', () => {
  const config = ensureSpots(loadConfig())
  return config.spots || {}
})

ipcMain.handle('set-entity-spot', (e, entityId, spot) => {
  const config = ensureSpots(loadConfig())
  if (spot === undefined || spot === null || spot === '') {
    delete config.spots[entityId]
  } else {
    config.spots[entityId] = spot
  }
  saveConfig(config)
  return true
})

function createSettingsWindow() {
  if (settingsWindow) {
    settingsWindow.focus()
    return
  }
  settingsWindow = new BrowserWindow({
    width: 420,
    height: 600,
    resizable: false,
    fullscreen: false,
    frame: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    parent: dashboardWindow || null,
    modal: !!dashboardWindow
  })
  settingsWindow.loadFile('settings.html')
  settingsWindow.on('closed', () => { settingsWindow = null })
}

function createDashboardWindow(config) {
  if (dashboardWindow) {
    dashboardWindow.once('closed', () => {
      dashboardWindow = null
      actuallyCreateDashboardWindow(config)
    })
    dashboardWindow.close()
  } else {
    actuallyCreateDashboardWindow(config)
  }
}

function actuallyCreateDashboardWindow(config) {
  dashboardWindow = new BrowserWindow({
    width: 800,
    height: 600,
    fullscreen: true,
    frame: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  })
  dashboardWindow.loadFile('dashboard.html')
  dashboardWindow.on('closed', () => { dashboardWindow = null })
  dashboardWindow.webContents.on('did-finish-load', () => {
    dashboardWindow.webContents.send('config', config)
  })
}

function createDevicesWindow(config) {
  if (devicesWindow) {
    devicesWindow.focus()
    return
  }
  devicesWindow = new BrowserWindow({
    width: 900,
    height: 700,
    resizable: true,
    fullscreen: false,
    frame: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    parent: dashboardWindow || null,
    modal: false
  })
  devicesWindow.loadFile('devices.html')
  devicesWindow.on('closed', () => { devicesWindow = null })
  devicesWindow.webContents.on('did-finish-load', () => {
    devicesWindow.webContents.send('config', config)
  })
}

app.whenReady().then(() => {
  createSettingsWindow()
})

ipcMain.handle('load-config', () => loadConfig())
ipcMain.handle('save-config', (e, config) => { saveConfig(config) })
ipcMain.on('open-dashboard', (e, config) => {
  createDashboardWindow(config)
  if (settingsWindow) settingsWindow.close()
})
ipcMain.on('open-settings', () => {
  createSettingsWindow()
})
ipcMain.on('open-devices', () => {
  const config = loadConfig()
  createDevicesWindow(config)
})
ipcMain.on('reset-settings', () => {
  saveConfig({ 
    ip: '', 
    port: '1883', 
    username: '', 
    password: '', 
    ha_api_port: '8123', 
    ha_token: '', 
    spotsArr: Array(8).fill(null)
  })
})

app.on('window-all-closed', () => {
  app.quit()
})