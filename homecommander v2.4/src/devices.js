const { ipcRenderer } = require("electron");
const axios = require("axios");

let config = null;
let haClient = null;
let entities = [];
const controlLabels = {
  1: "Rotary 1",
  2: "Rotary 2",
  3: "Rotary 3",
  4: "Button 1",
  5: "Button 2",
  6: "Button 3",
};

// Initialize the devices window and load all data
async function initDevices() {
  config = await ipcRenderer.invoke("load-config");
  if (!config?.homeAssistant) {
    showError(
      "No Home Assistant configuration found. Please configure settings first."
    );
    return;
  }
  await connectToHA();
  await loadEntities();
  document
    .getElementById("reset-assignments-btn")
    .addEventListener("click", resetAllAssignments);
  document
    .getElementById("save-btn")
    .addEventListener("click", saveAndUpdateDashboard);
}

// Connect to Home Assistant API
async function connectToHA() {
  const { ip, port, token } = config.homeAssistant;
  haClient = axios.create({
    baseURL: `http://${ip}:${port}/api`,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
}

// Load all entities from Home Assistant
async function loadEntities() {
  try {
    const { data } = await haClient.get("/states");
    entities = data;
    const filtered = entities.filter(
      (e) =>
        e.entity_id.startsWith("light.") || e.entity_id.startsWith("switch.")
    );
    displayEntities(filtered);
  } catch {
    showError(
      "Error connecting to Home Assistant. Please check your settings."
    );
  }
}

// Render all entities in the device list
function displayEntities(entities) {
  const deviceList = document.getElementById("device-list");
  if (!entities.length) {
    deviceList.innerHTML =
      '<div class="error">No lights or switches found.</div>';
    return;
  }
  deviceList.innerHTML = "";
  entities.forEach((entity) =>
    deviceList.appendChild(createDeviceItem(entity))
  );
}

// Create a device item element for the UI
function createDeviceItem(entity) {
  const div = document.createElement("div");
  div.className = "device-item";
  const entityType = entity.entity_id.split(".")[0];
  const friendlyName = entity.attributes.friendly_name || entity.entity_id;
  const assignments = getAllAssignmentsForEntity(entity.entity_id);
  let assignmentDisplay = assignments.length
    ? assignments
        .map(
          (a) =>
            `<div class="assignment-info">✓ Assigned to ${a.controlName} (${a.property})</div>`
        )
        .join("")
    : "";
  let assignButtons = "";
  if (entityType === "light") {
    assignButtons = [
      { prop: "toggle", label: "Assign to Button (On/Off)" },
      { prop: "brightness", label: "Assign to Rotary (Brightness)" },
      { prop: "color", label: "Assign to Rotary (Color)" },
    ]
      .map(
        (btn) =>
          `<button class="assign-btn" onclick="showControlSelector('${entity.entity_id}', 'light', '${btn.prop}')">${btn.label}</button>`
      )
      .join("");
  } else if (entityType === "switch") {
    assignButtons = `<button class="assign-btn" onclick="showControlSelector('${entity.entity_id}', 'switch', 'toggle')">Assign to Button (On/Off)</button>`;
  }
  const safeId = entity.entity_id.replace(/\./g, "_");
  div.innerHTML = `
    <div class="device-name">${friendlyName}</div>
    <div class="device-id">${entity.entity_id}</div>
    ${assignmentDisplay}
    <div class="assign-buttons">${assignButtons}</div>
    <div class="control-selector" id="selector-${safeId}">
      <select id="control-select-${safeId}">
        <option value="">Choose control...</option>
      </select>
      <button onclick="assignControl('${entity.entity_id}')">Assign</button>
    </div>
  `;
  return div;
}

// Show the control selector for assignment
function showControlSelector(entityId, type, property) {
  document
    .querySelectorAll(".control-selector")
    .forEach((s) => (s.style.display = "none"));
  const safeId = entityId.replace(/\./g, "_");
  const selector = document.getElementById(`selector-${safeId}`);
  const selectElement = document.getElementById(`control-select-${safeId}`);
  let options = '<option value="">Choose control...</option>';
  if (property === "toggle") {
    options += [4, 5, 6]
      .map((i) => `<option value="${i}">${controlLabels[i]}</option>`)
      .join("");
  } else if (property === "brightness" || property === "color") {
    options += [1, 2, 3]
      .map((i) => `<option value="${i}">${controlLabels[i]}</option>`)
      .join("");
  }
  selectElement.innerHTML = options;
  selector.style.display = "block";
  selector.dataset.entityType = type;
  selector.dataset.property = property;
}

// Assign a control to an entity
async function assignControl(entityId) {
  const safeId = entityId.replace(/\./g, "_");
  const selector = document.getElementById(`selector-${safeId}`);
  const selectElement = document.getElementById(`control-select-${safeId}`);
  const controlId = selectElement.value;
  const entityType = selector.dataset.entityType;
  const property = selector.dataset.property;
  if (!controlId) return;
  if (!config.assignments) config.assignments = {};
  config.assignments[controlId] = {
    entityId,
    type: entityType,
    property,
    state: "off",
    brightness: 0,
    color: "#ffffff",
  };
  const success = await ipcRenderer.invoke("save-config", config);
  if (success) {
    selector.style.display = "none";
    await loadEntities();
  }
}

// Save and update dashboard
async function saveAndUpdateDashboard() {
  try {
    await ipcRenderer.invoke("update-dashboard");
  } catch {}
}

// Show an error message in the UI
function showError(message) {
  const deviceList = document.getElementById("device-list");
  deviceList.innerHTML = `<div class="error">${message}</div>`;
}

// Get all assignments for a given entity
function getAllAssignmentsForEntity(entityId) {
  if (!config?.assignments) return [];
  return Object.entries(config.assignments)
    .filter(([_, a]) => a.entityId === entityId)
    .map(([controlId, assignment]) => ({
      controlId,
      controlName: controlLabels[controlId],
      property: assignment.property,
    }));
}

// Reset all assignments
async function resetAllAssignments() {
  if (!config) config = (await ipcRenderer.invoke("load-config")) || {};
  config.assignments = {};
  const success = await ipcRenderer.invoke("save-config", config);
  if (success) await loadEntities();
}

// Initialize devices when page is loaded
document.addEventListener("DOMContentLoaded", initDevices);
