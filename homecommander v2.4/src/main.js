const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const fs = require("fs");

let dashboardWindow;
let settingsWindow;
let devicesWindow;
let dashboardFullscreen = true;

const configPath = path.join(__dirname, "../homecommander.config");

// Create the main dashboard window. Reads fullscreen setting from config
function createDashboardWindow() {
  let config = {};
  try {
    if (fs.existsSync(configPath)) {
      config = JSON.parse(fs.readFileSync(configPath, "utf8"));
    }
  } catch {}
  dashboardFullscreen =
    typeof config.dashboardFullscreen === "boolean"
      ? config.dashboardFullscreen
      : true;
  dashboardWindow = new BrowserWindow({
    width: 1024,
    height: 600,
    fullscreen: dashboardFullscreen, // Fullscreen if enabled in config
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });
  dashboardWindow.loadFile("src/dashboard.html");
  dashboardWindow.setMenuBarVisibility(false);
}

// Create the settings window
function createSettingsWindow() {
  if (settingsWindow) {
    settingsWindow.focus();
    return;
  }
  settingsWindow = new BrowserWindow({
    width: 400,
    height: 420,
    parent: dashboardWindow,
    modal: false, // Not modal: dashboard stays interactive, taskbar visible
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });
  settingsWindow.loadFile("src/settings.html");
  settingsWindow.setMenuBarVisibility(false);
  settingsWindow.on("closed", () => {
    settingsWindow = null;
  });
}

// Create the devices window
function createDevicesWindow() {
  if (devicesWindow) {
    devicesWindow.focus();
    return;
  }
  devicesWindow = new BrowserWindow({
    width: 600,
    height: 500,
    parent: dashboardWindow,
    modal: true, // Modal: dashboard is blocked while devices window is open
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });
  devicesWindow.loadFile("src/devices.html");
  devicesWindow.setMenuBarVisibility(false);
  devicesWindow.on("closed", () => {
    devicesWindow = null;
  });
}

// Start the application and open the dashboard window
app.whenReady().then(() => {
  createDashboardWindow();
});

// Quit the app when all windows are closed (except on macOS)
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

// IPC handler: open the settings window
ipcMain.handle("open-settings", () => {
  createSettingsWindow();
});

// IPC handler: open the devices window
ipcMain.handle("open-devices", () => {
  createDevicesWindow();
});

// IPC handler: load config from file
ipcMain.handle("load-config", () => {
  try {
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
      return config;
    }
  } catch (error) {
    console.error("Error loading config:", error);
  }
  return null;
});

// IPC handler: save config to file
ipcMain.handle("save-config", (event, config) => {
  try {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    return true;
  } catch (error) {
    console.error("Error saving config:", error);
    return false;
  }
});

// IPC handler: update dashboard (reload config in dashboard window)
ipcMain.handle("update-dashboard", () => {
  try {
    if (dashboardWindow) {
      dashboardWindow.webContents.send("reload-dashboard");
    }
    return true;
  } catch (error) {
    console.error("Error updating dashboard:", error);
    return false;
  }
});

// IPC handler: set dashboard fullscreen on/off
ipcMain.handle("set-dashboard-fullscreen", (event, fullscreen) => {
  if (dashboardWindow) {
    dashboardWindow.setFullScreen(!!fullscreen);
  }
});
