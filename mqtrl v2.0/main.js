const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')
const fs = require('fs')

const CONFIG_PATH = path.join(__dirname, 'mqtrl.config')

let settingsWindow = null
let dashboardWindow = null

function loadConfig() {
  try {
    return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'))
  } catch {
    return { ip: '', port: '1883', username: '', password: '', ha_api_port: '8123', ha_token: '' }
  }
}

function saveConfig(config) {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf8')
}

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
ipcMain.on('reset-settings', () => {
  saveConfig({ ip: '', port: '1883', username: '', password: '', ha_api_port: '8123', ha_token: '' })
})

app.on('window-all-closed', () => {
  app.quit()
})