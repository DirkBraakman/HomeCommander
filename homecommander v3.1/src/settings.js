// Settings window: Home Assistant config and fullscreen toggle
const { ipcRenderer } = require("electron");
let config = null;
// Init settings window
async function initSettings() {
  config = await ipcRenderer.invoke("load-config");
  if (config && config.homeAssistant) {
    document.getElementById("ha-ip").value = config.homeAssistant.ip || "";
    document.getElementById("ha-port").value =
      config.homeAssistant.port || "8123";
    document.getElementById("ha-token").value =
      config.homeAssistant.token || "";
  }
  const btn = document.getElementById("fullscreen-toggle-btn");
  let fullscreen = true;
  if (config && typeof config.dashboardFullscreen === "boolean")
    fullscreen = config.dashboardFullscreen;
  setFullscreenBtnState(btn, fullscreen);
  btn.addEventListener("click", async () => {
    fullscreen = !fullscreen;
    setFullscreenBtnState(btn, fullscreen);
    if (!config) config = {};
    config.dashboardFullscreen = fullscreen;
    await ipcRenderer.invoke("save-config", config);
    await ipcRenderer.invoke("set-dashboard-fullscreen", fullscreen);
  });
  document.getElementById("reset-btn").addEventListener("click", resetSettings);
  document
    .getElementById("save-update-btn")
    .addEventListener("click", saveAndUpdateDashboard);
}
// Set fullscreen button state
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
  const ip = document.getElementById("ha-ip").value.trim();
  const port = document.getElementById("ha-port").value.trim();
  const token = document.getElementById("ha-token").value.trim();
  if (!ip || !port || !token) return;
  if (!config) config = {};
  config.homeAssistant = { ip, port: parseInt(port), token };
  const success = await ipcRenderer.invoke("save-config", config);
  if (success) await ipcRenderer.invoke("update-dashboard");
}
// Reset settings form
function resetSettings() {
  document.getElementById("ha-ip").value = "";
  document.getElementById("ha-port").value = "8123";
  document.getElementById("ha-token").value = "";
}
document.addEventListener("DOMContentLoaded", initSettings);
