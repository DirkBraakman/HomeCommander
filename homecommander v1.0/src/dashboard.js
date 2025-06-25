const { ipcRenderer } = require("electron");
const axios = require("axios");

let config = null;
let haClient = null;

// Initialize dashboard
async function initDashboard() {
  // Load config
  config = await ipcRenderer.invoke("load-config");

  if (config && config.homeAssistant) {
    await connectToHomeAssistant();
  }

  // Add event listeners
  document
    .getElementById("settings-btn")
    .addEventListener("click", openSettings);
  document.getElementById("devices-btn").addEventListener("click", openDevices);

  // Listen for reload messages from main process
  ipcRenderer.on("reload-dashboard", async () => {
    await reloadDashboard();
  });

  // Update time
  updateTime();
  setInterval(updateTime, 1000);

  // Update dashboard with assignments
  await updateDashboard();

  // Periodically update dashboard to show real-time states
  setInterval(async () => {
    if (haClient && config && config.assignments) {
      await updateDashboard();
    }
  }, 5000); // Update every 5 seconds
}

// Display time
function updateTime() {
  const now = new Date();
  const timeString = now.toLocaleTimeString("nl-NL");
  document.getElementById("current-time").textContent = timeString;
}

// Connect to Home Assistant
async function connectToHomeAssistant() {
  if (!config || !config.homeAssistant) return;

  const { ip, port, token } = config.homeAssistant;
  const baseURL = `http://${ip}:${port}/api`;

  // Update HA details with IP and port
  document.getElementById(
    "ha-details"
  ).textContent = `${ip}:${port} - Connecting...`;

  try {
    haClient = axios.create({
      baseURL: baseURL,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    // Test connection
    const response = await haClient.get("/");
    const haInfo = response.data;
    document.getElementById("ha-status").textContent = `Home Assistant: ${
      haInfo.location_name || "Connected"
    }`;
    document.getElementById(
      "ha-details"
    ).textContent = `${ip}:${port} - Connected`;
  } catch (error) {
    console.error("Error connecting to HA:", error);
    document.getElementById("ha-status").textContent =
      "Home Assistant: Connection Error";
    document.getElementById(
      "ha-details"
    ).textContent = `${ip}:${port} - Connection Failed`;
  }
}

// Update dashboard with assignments
async function updateDashboard() {
  if (!config || !config.assignments) {
    resetAllControls();
    return;
  }

  // Reset all circles first
  resetAllControls();

  // Update correct circle for each assignment
  for (const [controlId, assignment] of Object.entries(config.assignments)) {
    const controlElement = document.getElementById(`control-${controlId}`);
    if (controlElement && assignment.entityId) {
      controlElement.classList.add("assigned");

      const statusElement = controlElement.querySelector(".control-status");
      const valueElement = controlElement.querySelector(".control-value");

      // Show entity name and property
      const entityName = assignment.entityId.split(".")[1].replace(/_/g, " ");
      const propertyText = getPropertyDisplayText(assignment.property);
      valueElement.textContent = `${entityName}\n${propertyText}`;

      // Get real-time state from Home Assistant
      if (haClient) {
        try {
          const response = await haClient.get(`/states/${assignment.entityId}`);
          const entityState = response.data;

          // Update status based on entity type, property and current state
          updateControlStatus(statusElement, assignment, entityState);
        } catch (error) {
          console.error(
            `Error fetching state for ${assignment.entityId}:`,
            error
          );
          // Show offline status
          statusElement.textContent = "❌";
          statusElement.style.color = "#ff5722";
        }
      } else {
        // No HA connection
        statusElement.textContent = "❌";
        statusElement.style.color = "#ff5722";
      }
    }
  }
}

// Reset all control circles to default state
function resetAllControls() {
  for (let i = 1; i <= 8; i++) {
    const controlElement = document.getElementById(`control-${i}`);
    if (controlElement) {
      controlElement.classList.remove("assigned");
      controlElement.style.backgroundColor = "";

      const statusElement = controlElement.querySelector(".control-status");
      const valueElement = controlElement.querySelector(".control-value");
      const titleElement = controlElement.querySelector(".control-title");

      statusElement.textContent = "";
      statusElement.style.color = "";
      valueElement.textContent = "Not assigned";
      valueElement.style.color = "";
      titleElement.style.color = "";
    }
  }
}

// Get user-friendly property display text
function getPropertyDisplayText(property) {
  switch (property) {
    case "toggle":
      return "On/Off Control";
    case "brightness":
      return "Brightness Control";
    case "color":
      return "Color Control";
    default:
      return property;
  }
}

// Update control status based on entity state and property
function updateControlStatus(statusElement, assignment, entityState) {
  const state = entityState.state;
  const attributes = entityState.attributes;
  const controlElement = statusElement.closest(".control-circle");

  // Reset color and background
  statusElement.style.color = "";
  controlElement.style.backgroundColor = "";

  if (assignment.type === "light") {
    if (assignment.property === "toggle") {
      statusElement.textContent = state === "on" ? "🌕" : "🌑";
      statusElement.style.color = "";
    } else if (assignment.property === "brightness") {
      const brightness = attributes.brightness
        ? Math.round((attributes.brightness / 255) * 100)
        : 0;
      statusElement.textContent = state === "on" ? `${brightness}%` : "OFF";
      statusElement.style.color = state === "on" ? "#2196f3" : "#666";
    } else if (assignment.property === "color") {
      if (state === "on" && attributes.rgb_color) {
        const [r, g, b] = attributes.rgb_color;
        const hexColor = `#${r.toString(16).padStart(2, "0")}${g
          .toString(16)
          .padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
        statusElement.textContent = hexColor.toUpperCase();
        controlElement.style.backgroundColor = hexColor;
        // Determine text color based on background brightness
        const brightness = (r * 299 + g * 587 + b * 114) / 1000;
        statusElement.style.color = brightness > 128 ? "#000" : "#fff";
        statusElement.parentElement.querySelector(
          ".control-title"
        ).style.color = brightness > 128 ? "#000" : "#fff";
        statusElement.parentElement.querySelector(
          ".control-value"
        ).style.color = brightness > 128 ? "#333" : "#ccc";
      } else {
        statusElement.textContent = "OFF";
        controlElement.style.backgroundColor = "#f5f5f5";
        statusElement.style.color = "#666";
        statusElement.parentElement.querySelector(
          ".control-title"
        ).style.color = "";
        statusElement.parentElement.querySelector(
          ".control-value"
        ).style.color = "";
      }
    }
  } else if (assignment.type === "switch") {
    statusElement.textContent = state === "on" ? "🌕" : "🌑";
    statusElement.style.color = "";
  }
}

// Open settings window
function openSettings() {
  ipcRenderer.invoke("open-settings");
}

// Open devices window
function openDevices() {
  ipcRenderer.invoke("open-devices");
}

// Reload dashboard with new config
async function reloadDashboard() {
  console.log("Reloading dashboard...");

  // Reload config
  config = await ipcRenderer.invoke("load-config");

  // Reconnect to HA if configuration changed
  if (config && config.homeAssistant) {
    await connectToHomeAssistant();
  }

  // Update dashboard with new assignments
  await updateDashboard();

  console.log("Dashboard reload completed");
}

// Initialize dashboard when page is loaded
document.addEventListener("DOMContentLoaded", initDashboard);
