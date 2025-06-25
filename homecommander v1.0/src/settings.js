const { ipcRenderer } = require("electron");

let config = null;

// Initialize settings window
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
  } // Add event listeners
  document.getElementById("reset-btn").addEventListener("click", resetSettings);
  document
    .getElementById("save-update-btn")
    .addEventListener("click", saveAndUpdateDashboard);
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

  // Save config
  const success = await ipcRenderer.invoke("save-config", config);

  if (success) {
    // Update dashboard
    await ipcRenderer.invoke("update-dashboard");

    // Close window after 1 second
    setTimeout(() => {
      window.close();
    }, 1000);
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
