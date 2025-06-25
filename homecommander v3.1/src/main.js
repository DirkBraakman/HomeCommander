// Electron main process: manages windows and IPC
const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const fs = require("fs");
const gpio = require("./gpio");
let dashboardWindow, settingsWindow, devicesWindow;
let dashboardFullscreen = true;
const configPath = path.join(__dirname, "../homecommander.config");

// Create dashboard window (main UI)
function createDashboardWindow() {
  let config = {};
  try {
    if (fs.existsSync(configPath))
      config = JSON.parse(fs.readFileSync(configPath, "utf8"));
  } catch {}
  dashboardFullscreen =
    typeof config.dashboardFullscreen === "boolean"
      ? config.dashboardFullscreen
      : true;
  dashboardWindow = new BrowserWindow({
    width: 1024,
    height: 600,
    fullscreen: dashboardFullscreen,
    webPreferences: { nodeIntegration: true, contextIsolation: false },
  });
  dashboardWindow.loadFile("src/dashboard.html");
  dashboardWindow.setMenuBarVisibility(false);
}
// Create settings window
function createSettingsWindow() {
  if (settingsWindow) return settingsWindow.focus();
  settingsWindow = new BrowserWindow({
    width: 400,
    height: 420,
    parent: dashboardWindow,
    modal: false,
    webPreferences: { nodeIntegration: true, contextIsolation: false },
  });
  settingsWindow.loadFile("src/settings.html");
  settingsWindow.setMenuBarVisibility(false);
  settingsWindow.on("closed", () => (settingsWindow = null));
}
// Create devices window
function createDevicesWindow() {
  if (devicesWindow) return devicesWindow.focus();
  devicesWindow = new BrowserWindow({
    width: 600,
    height: 500,
    parent: dashboardWindow,
    modal: true,
    webPreferences: { nodeIntegration: true, contextIsolation: false },
  });
  devicesWindow.loadFile("src/devices.html");
  devicesWindow.setMenuBarVisibility(false);
  devicesWindow.on("closed", () => (devicesWindow = null));
}
// App lifecycle
app.whenReady().then(createDashboardWindow);
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
// IPC handlers for window and config management
ipcMain.handle("open-settings", () => createSettingsWindow());
ipcMain.handle("open-devices", () => createDevicesWindow());
ipcMain.handle("load-config", () => {
  try {
    if (fs.existsSync(configPath))
      return JSON.parse(fs.readFileSync(configPath, "utf8"));
  } catch {}
  return null;
});
ipcMain.handle("save-config", (e, config) => {
  try {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    return true;
  } catch {
    return false;
  }
});
ipcMain.handle("update-dashboard", () => {
  try {
    if (dashboardWindow) dashboardWindow.webContents.send("reload-dashboard");
    return true;
  } catch {
    return false;
  }
});
ipcMain.handle("set-dashboard-fullscreen", (e, fullscreen) => {
  if (dashboardWindow) dashboardWindow.setFullScreen(!!fullscreen);
});
const { gpioEvents } = gpio;
gpioEvents.on("rotary", (rotaryIndex, direction) => {
  console.log(`rotary${rotaryIndex} ${direction}`); // Log rotary event
  if (dashboardWindow)
    dashboardWindow.webContents.send("rotary-control", {
      rotaryIndex,
      direction,
    });
});
gpioEvents.on("button", (buttonIndex) => {
  console.log(`button${buttonIndex} pressed`); // Log button event
  if (dashboardWindow)
    dashboardWindow.webContents.send("button-control", {
      buttonIndex
    });
});
