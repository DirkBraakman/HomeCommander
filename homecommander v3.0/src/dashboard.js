const { ipcRenderer } = require("electron");
const axios = require("axios");

// Rotary step variables
const rotaryBrightnessStep = 5; // % per step
const rotaryHueStep = 10; // degrees per step

// State for dashboard and Home Assistant
let config = null;
let haClient = null;
const colorHues = { 1: 0, 2: 0, 3: 0 };
const brightnessStates = { 1: 0, 2: 0, 3: 0 };
const controlLabels = {
  1: "Rotary 1",
  2: "Rotary 2",
  3: "Rotary 3",
  4: "Button 1",
  5: "Button 2",
  6: "Button 3",
};

// Initialize the dashboard UI and logic
async function initDashboard() {
  config = await ipcRenderer.invoke("load-config");
  if (config?.homeAssistant) await connectToHomeAssistant();
  document
    .getElementById("settings-btn")
    .addEventListener("click", openSettings);
  document.getElementById("devices-btn").addEventListener("click", openDevices);
  ipcRenderer.on("reload-dashboard", reloadDashboard);
  updateTime();
  setInterval(updateTime, 1000);
  await updateDashboard();
  setInterval(() => haClient && config?.assignments && updateDashboard(), 5000);
  window.addEventListener("keydown", (e) => {
    const key = parseInt(e.key);
    if (key >= 1 && key <= 6) handleKeyboardControl(key);
  });

  // IPC: keyboard-control event from main process (for GPIO buttons)
  window.electronAPI = window.electronAPI || {};
  window.electronAPI.keyboardControl = handleKeyboardControl;
  require("electron").ipcRenderer.on("keyboard-control", (event, key) => {
    handleKeyboardControl(key);
  });

  // IPC: rotary-control event from main process
  require("electron").ipcRenderer.on(
    "rotary-control",
    async (event, { rotaryIndex, direction }) => {
      if (!config?.assignments?.[rotaryIndex]) return;
      const assignment = config.assignments[rotaryIndex];
      if (assignment.property === "brightness") {
        await handleRotaryBrightness(rotaryIndex, assignment, direction);
      } else if (assignment.property === "color") {
        await handleRotaryColor(rotaryIndex, assignment, direction);
      }
    }
  );
}

// Update the time display
function updateTime() {
  document.getElementById("current-time").textContent =
    new Date().toLocaleTimeString("nl-NL");
}

// Connect to Home Assistant API
async function connectToHomeAssistant() {
  if (!config?.homeAssistant) return;
  const { ip, port, token } = config.homeAssistant;
  const baseURL = `http://${ip}:${port}/api`;
  setText("ha-details", `${ip}:${port} - Connecting...`);
  try {
    haClient = axios.create({
      baseURL,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });
    const { data } = await haClient.get("/");
    setHTML(
      "ha-status",
      `<strong>HomeCommander:</strong> ${
        data.location_name || "Home Assistant"
      }`
    );
    setText("ha-details", `${ip}:${port} - Connected`);
  } catch {
    setHTML("ha-status", "<strong>HomeCommander:</strong> Connection Error");
    setText("ha-details", `${ip}:${port} - Connection Failed`);
  }
}

// Update all dashboard controls with current assignments
async function updateDashboard() {
  resetAllControls();
  for (let i = 1; i <= 6; i++) {
    const el = document.getElementById(`control-${i}`);
    if (!el) continue;
    const assignment = config?.assignments?.[i];
    const statusEl = el.querySelector(".control-status");
    const valueEl = el.querySelector(".control-value");
    const titleEl = el.querySelector(".control-title");
    titleEl.textContent = controlLabels[i];
    if (!assignment || !assignment.entityId) {
      valueEl.textContent = "Not assigned";
      setTextOn(el, ".control-status", "");
      continue;
    }
    el.classList.add("assigned");
    valueEl.textContent = `${getEntityName(
      assignment.entityId
    )}\n${propertyLabel(assignment.property)}`;
    if (!haClient) {
      setOffline(statusEl);
      continue;
    }
    try {
      const { data } = await haClient.get(`/states/${assignment.entityId}`);
      updateControlStatus(statusEl, assignment, data);
    } catch {
      setOffline(statusEl);
    }
  }
}

// Reset all controls to default state
function resetAllControls() {
  for (let i = 1; i <= 6; i++) {
    const el = document.getElementById(`control-${i}`);
    if (!el) continue;
    el.classList.remove("assigned");
    el.style.backgroundColor = "";
    setTextOn(el, ".control-status", "");
    setTextOn(el, ".control-value", "Not assigned");
    setTextOn(el, ".control-title", controlLabels[i]);
  }
}

// Return a user-friendly label for a property
const propertyLabel = (prop) =>
  ({
    toggle: "On/Off Control",
    brightness: "Brightness Control",
    color: "Color Control",
  }[prop] || prop);

// Get entity name from entity_id
const getEntityName = (id) => id.split(".")[1].replace(/_/g, " ");

// Set status to offline
function setOffline(statusEl) {
  statusEl.textContent = "❌";
  statusEl.style.color = "#ff5722";
}

// Update the visual status of a control
function updateControlStatus(statusEl, assignment, entityState) {
  const state = entityState.state;
  const attr = entityState.attributes;
  const el = statusEl.closest(".control-circle");
  statusEl.style.color = "";
  el.style.backgroundColor = "";
  if (assignment.type === "light") {
    if (assignment.property === "toggle") {
      statusEl.textContent = state === "on" ? "🌕" : "🌑";
    } else if (assignment.property === "brightness") {
      const brightness = attr.brightness
        ? Math.round((attr.brightness / 255) * 100)
        : 0;
      statusEl.textContent = state === "on" ? `${brightness}%` : "OFF";
      statusEl.style.color = state === "on" ? "#2196f3" : "#666";
    } else if (assignment.property === "color") {
      if (state === "on" && attr.rgb_color) {
        const [r, g, b] = attr.rgb_color;
        const hex = rgbToHex(r, g, b);
        statusEl.textContent = hex;
        el.style.backgroundColor = hex;
        const bright = (r * 299 + g * 587 + b * 114) / 1000;
        const textCol = bright > 128 ? "#000" : "#fff";
        statusEl.style.color = textCol;
        setColorOn(el, ".control-title", textCol);
        setColorOn(el, ".control-value", bright > 128 ? "#333" : "#ccc");
      } else {
        statusEl.textContent = "OFF";
        el.style.backgroundColor = "#f5f5f5";
        statusEl.style.color = "#666";
        setColorOn(el, ".control-title", "");
        setColorOn(el, ".control-value", "");
      }
      // Fix: always reset .control-title color for all controls if not color
    } else {
      setColorOn(el, ".control-title", "");
      setColorOn(el, ".control-value", "");
    }
  } else if (assignment.type === "switch") {
    statusEl.textContent = state === "on" ? "🌕" : "🌑";
  }
}

// Open the settings window
function openSettings() {
  ipcRenderer.invoke("open-settings");
}
// Open the devices window
function openDevices() {
  ipcRenderer.invoke("open-devices");
}
// Reload dashboard config and UI
async function reloadDashboard() {
  config = await ipcRenderer.invoke("load-config");
  if (config?.homeAssistant) await connectToHomeAssistant();
  await updateDashboard();
}
// Handle keyboard 1-6 for assignment actions
async function handleKeyboardControl(controlNumber) {
  if (!config?.assignments?.[controlNumber]) return;
  const assignment = config.assignments[controlNumber];
  if (controlNumber >= 1 && controlNumber <= 3) {
    if (assignment.property === "color")
      await handleColorControl(controlNumber, assignment);
    else if (assignment.property === "brightness")
      await handleBrightnessControl(controlNumber, assignment);
  } else if (controlNumber >= 4 && controlNumber <= 6) {
    await handleToggleControl(controlNumber, assignment);
  }
}
// Toggle on/off for assigned entity
async function handleToggleControl(controlNumber, assignment) {
  if (!haClient || !assignment.entityId) return;
  try {
    const { data } = await haClient.get(`/states/${assignment.entityId}`);
    const newState = data.state === "on" ? "off" : "on";
    await haClient.post(`/services/${assignment.type}/turn_${newState}`, {
      entity_id: assignment.entityId,
    });
    setTimeout(updateDashboard, 200);
  } catch {}
}
// Step color hue for assigned entity
async function handleColorControl(controlNumber, assignment) {
  if (!haClient || !assignment.entityId) return;
  colorHues[controlNumber] = (colorHues[controlNumber] + 30) % 360;
  const hue = colorHues[controlNumber];
  const rgb = hsvToRgb(hue, 100, 100);
  try {
    await haClient.post(`/services/light/turn_on`, {
      entity_id: assignment.entityId,
      rgb_color: rgb,
    });
    setTimeout(updateDashboard, 200);
  } catch {}
}
// Step brightness for assigned entity
async function handleBrightnessControl(controlNumber, assignment) {
  if (!haClient || !assignment.entityId) return;
  brightnessStates[controlNumber] =
    (brightnessStates[controlNumber] + 10) % 110;
  if (brightnessStates[controlNumber] > 100)
    brightnessStates[controlNumber] = 0;
  const brightness = brightnessStates[controlNumber];
  try {
    const { data } = await haClient.get(`/states/${assignment.entityId}`);
    const current = data.attributes.brightness
      ? Math.round((data.attributes.brightness / 255) * 100)
      : 0;
    if (current !== brightness) {
      if (brightness === 0)
        await haClient.post(`/services/light/turn_off`, {
          entity_id: assignment.entityId,
        });
      else {
        const val = Math.round((brightness / 100) * 255);
        await haClient.post(`/services/light/turn_on`, {
          entity_id: assignment.entityId,
          brightness: val,
        });
      }
      setTimeout(updateDashboard, 200);
    }
  } catch {}
}

// Rotary brightness handler
async function handleRotaryBrightness(controlNumber, assignment, direction) {
  if (!haClient || !assignment.entityId) return;
  try {
    const { data } = await haClient.get(`/states/${assignment.entityId}`);
    let current = data.attributes.brightness
      ? Math.round((data.attributes.brightness / 255) * 100)
      : 0;
    let step = rotaryBrightnessStep;
    if (direction === "left") current -= step;
    else current += step;
    if (current < 0) current = 0;
    if (current > 100) current = 100;
    const val = Math.round((current / 100) * 255);
    if (current === 0) {
      await haClient.post(`/services/light/turn_off`, {
        entity_id: assignment.entityId,
      });
    } else {
      await haClient.post(`/services/light/turn_on`, {
        entity_id: assignment.entityId,
        brightness: val,
      });
    }
    setTimeout(updateDashboard, 200);
  } catch {}
}

// Rotary color handler
async function handleRotaryColor(controlNumber, assignment, direction) {
  if (!haClient || !assignment.entityId) return;
  let step = rotaryHueStep;
  if (typeof colorHues[controlNumber] !== "number") colorHues[controlNumber] = 0;
  if (direction === "right")
    colorHues[controlNumber] = (colorHues[controlNumber] + step) % 360;
  else
    colorHues[controlNumber] = (colorHues[controlNumber] - step + 360) % 360;
  const hue = colorHues[controlNumber];
  const rgb = hsvToRgb(hue, 100, 100);
  try {
    await haClient.post(`/services/light/turn_on`, {
      entity_id: assignment.entityId,
      rgb_color: rgb,
    });
    setTimeout(updateDashboard, 200);
  } catch {}
}

// Convert HSV to RGB array
function hsvToRgb(h, s, v) {
  h = h / 360;
  s = s / 100;
  v = v / 100;
  const c = v * s;
  const x = c * (1 - Math.abs(((h * 6) % 2) - 1));
  const m = v - c;
  let r, g, b;
  if (h < 1 / 6) {
    r = c;
    g = x;
    b = 0;
  } else if (h < 2 / 6) {
    r = x;
    g = c;
    b = 0;
  } else if (h < 3 / 6) {
    r = 0;
    g = c;
    b = x;
  } else if (h < 4 / 6) {
    r = 0;
    g = x;
    b = c;
  } else if (h < 5 / 6) {
    r = x;
    g = 0;
    b = c;
  } else {
    r = c;
    g = 0;
    b = x;
  }
  return [
    Math.round((r + m) * 255),
    Math.round((g + m) * 255),
    Math.round((b + m) * 255),
  ];
}
// Convert RGB to hex string
function rgbToHex(r, g, b) {
  return `#${[r, g, b]
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("")}`.toUpperCase();
}
// Set text content on a selector inside an element
function setTextOn(el, sel, text) {
  const t = el.querySelector(sel);
  if (t) t.textContent = text;
}
// Set color style on a selector inside an element
function setColorOn(el, sel, color) {
  const t = el.querySelector(sel);
  if (t) t.style.color = color;
}
// Set text content by id
function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}
// Set HTML content by id
function setHTML(id, html) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = html;
}
// Initialize dashboard on page load
document.addEventListener("DOMContentLoaded", initDashboard);
