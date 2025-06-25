const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const fs = require("fs");
const GPIOController = require("./gpio.js");

let mainWindow;
let settingsWindow;
let devicesWindow;
let gpioController;

// Config file path
const configPath = path.join(__dirname, "../homecommander.config");

// Create main window
function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1024,
    height: 768,
    fullscreen: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  mainWindow.loadFile("src/dashboard.html");
  // Hide menu for fullscreen experience
  mainWindow.setMenuBarVisibility(false);
}

// Create settings window
function createSettingsWindow() {
  if (settingsWindow) {
    settingsWindow.focus();
    return;
  }
  settingsWindow = new BrowserWindow({
    width: 400,
    height: 500,
    parent: mainWindow,
    modal: true,
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

// Create devices window
function createDevicesWindow() {
  if (devicesWindow) {
    devicesWindow.focus();
    return;
  }
  devicesWindow = new BrowserWindow({
    width: 600,
    height: 600,
    parent: mainWindow,
    modal: true,
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

// Initialize GPIO controller
function initGPIO() {
  gpioController = new GPIOController();
  gpioController.init();

  // GPIO event handlers (placeholder)
  // These will later call HA API based on assignments
  for (let i = 1; i <= 4; i++) {
    gpioController.onButtonPress(i, () => {
      console.log(`Button ${i} pressed`);
      // HA API call based on assignment will go here
    });
  }

  for (let i = 1; i <= 2; i++) {
    gpioController.onRotaryChange(i, (direction) => {
      console.log(`Rotary ${i} turned ${direction}`);
      // HA API call for color adjustment will go here
    });

    gpioController.onSliderChange(i, (value) => {
      console.log(`Slider ${i} changed to ${value}`);
      // HA API call for brightness adjustment will go here
    });
  }
}

// Start app
app.whenReady().then(() => {
  createMainWindow();
  initGPIO();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

// IPC handlers for communication between windows
ipcMain.handle("open-settings", () => {
  createSettingsWindow();
});

ipcMain.handle("open-devices", () => {
  createDevicesWindow();
});

// Load config
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

// Save config
ipcMain.handle("save-config", (event, config) => {
  try {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    return true;
  } catch (error) {
    console.error("Error saving config:", error);
    return false;
  }
});

// Update dashboard
ipcMain.handle("update-dashboard", () => {
  try {
    // Send reload message to main window
    if (mainWindow) {
      mainWindow.webContents.send("reload-dashboard");
    }
    return true;
  } catch (error) {
    console.error("Error updating dashboard:", error);
    return false;
  }
});
