const { ipcRenderer } = require("electron");

let config = null;

async function initSettings() {
  // Load existing config
  config = await ipcRenderer.invoke("load-config");
  if (config && config.homeAssistant) {
    // Fill form with existing values
    document.getElementById("ha-ip").value = config.homeAssistant.ip || "";
    document.getElementById("ha-port").value =
      config.homeAssistant.port || "8123";
    document.getElementById("ha-token").value =
      config.homeAssistant.token || "";
  }
  // Zet de nav-btn visueel actief als fullscreen aan staat
  const btn = document.getElementById("fullscreen-toggle-btn");
  let fullscreen = true;
  if (config && typeof config.dashboardFullscreen === "boolean") {
    fullscreen = config.dashboardFullscreen;
  }
  setFullscreenBtnState(btn, fullscreen);
  btn.addEventListener("click", async () => {
    fullscreen = !fullscreen;
    setFullscreenBtnState(btn, fullscreen);
    if (!config) config = {};
    config.dashboardFullscreen = fullscreen;
    await ipcRenderer.invoke("save-config", config);
    await ipcRenderer.invoke("set-dashboard-fullscreen", fullscreen);
  });
  // Add event listeners
  document.getElementById("reset-btn").addEventListener("click", resetSettings);
  document
    .getElementById("save-update-btn")
    .addEventListener("click", saveAndUpdateDashboard);
}

// Zet de staat van de fullscreen knop
function setFullscreenBtnState(btn, active) {
  btn.setAttribute("aria-pressed", active ? "true" : "false");
  if (active) {
    btn.style.background = "#2196f3";
    btn.style.color = "white";
    btn.style.borderColor = "#2196f3";
  } else {
    btn.style.background = "#f5f5f5";
    btn.style.color = "#333";
    btn.style.borderColor = "#e0e0e0";
  }
}

// Save settings and update dashboard
async function saveAndUpdateDashboard() {
  // First save settings
  const ip = document.getElementById("ha-ip").value.trim();
  const port = document.getElementById("ha-port").value.trim();
  const token = document.getElementById("ha-token").value.trim();

  // Validation
  if (!ip || !port || !token) {
    return;
  }

  // Create/update config object
  if (!config) {
    config = {};
  }

  config.homeAssistant = {
    ip: ip,
    port: parseInt(port),
    token: token,
  };
  // dashboardFullscreen wordt al apart opgeslagen
  const success = await ipcRenderer.invoke("save-config", config);

  if (success) {
    // Update dashboard
    await ipcRenderer.invoke("update-dashboard");
  }
}

// Reset settings
function resetSettings() {
  document.getElementById("ha-ip").value = "";
  document.getElementById("ha-port").value = "8123";
  document.getElementById("ha-token").value = "";
}

// Initialize settings when page is loaded
document.addEventListener("DOMContentLoaded", initSettings);
