const { ipcRenderer } = require("electron");
const axios = require("axios");

let config = null;
let haClient = null;
let entities = [];

// Initialize devices window
async function initDevices() {
  // Load config
  config = await ipcRenderer.invoke("load-config");
  if (!config || !config.homeAssistant) {
    showError(
      "No Home Assistant configuration found. Please configure settings first."
    );
    return;
  }

  // Connect to HA
  await connectToHA();
  // Load entities
  await loadEntities();
  // Reset assignments button event listener
  document
    .getElementById("reset-assignments-btn")
    .addEventListener("click", resetAllAssignments);

  // Save button event listener
  document
    .getElementById("save-btn")
    .addEventListener("click", saveAndUpdateDashboard);
}

// Connect to Home Assistant
async function connectToHA() {
  const { ip, port, token } = config.homeAssistant;
  const baseURL = `http://${ip}:${port}/api`;

  haClient = axios.create({
    baseURL: baseURL,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
}

// Load all entities from HA
async function loadEntities() {
  try {
    const response = await haClient.get("/states");
    entities = response.data;

    // Filter only lights and switches
    const filteredEntities = entities.filter(
      (entity) =>
        entity.entity_id.startsWith("light.") ||
        entity.entity_id.startsWith("switch.")
    );

    displayEntities(filteredEntities);
  } catch (error) {
    console.error("Error loading entities:", error);
    showError(
      "Error connecting to Home Assistant. Please check your settings."
    );
  }
}

// Display entities in the list
function displayEntities(entities) {
  const deviceList = document.getElementById("device-list");
  if (entities.length === 0) {
    deviceList.innerHTML =
      '<div class="error">No lights or switches found.</div>';
    return;
  }

  deviceList.innerHTML = "";

  entities.forEach((entity) => {
    const deviceItem = createDeviceItem(entity);
    deviceList.appendChild(deviceItem);
  });
}

// Create device item HTML element
function createDeviceItem(entity) {
  const div = document.createElement("div");
  div.className = "device-item";
  const entityType = entity.entity_id.split(".")[0];
  const friendlyName = entity.attributes.friendly_name || entity.entity_id;

  // Get all assignments for this entity
  const assignments = getAllAssignmentsForEntity(entity.entity_id);

  let assignButtons = "";
  let assignmentDisplay = "";

  // Show all assignments
  if (assignments.length > 0) {
    assignmentDisplay = assignments
      .map(
        (assignment) => `
            <div class="assignment-info">
                ✓ Assigned to ${assignment.controlName} (${assignment.property})
            </div>
        `
      )
      .join("");
  }

  // Create buttons based on entity type
  if (entityType === "light") {
    assignButtons = `
            <button class="assign-btn light" onclick="showControlSelector('${entity.entity_id}', 'light', 'toggle')">
                Assign to Button (On/Off)
            </button>
            <button class="assign-btn light" onclick="showControlSelector('${entity.entity_id}', 'light', 'brightness')">
                Assign to Slider (Brightness)
            </button>
            <button class="assign-btn light" onclick="showControlSelector('${entity.entity_id}', 'light', 'color')">
                Assign to Rotary (Color)
            </button>
        `;
  } else if (entityType === "switch") {
    assignButtons = `
            <button class="assign-btn switch" onclick="showControlSelector('${entity.entity_id}', 'switch', 'toggle')">
                Assign to Button (On/Off)
            </button>
        `;
  }
  div.innerHTML = `
        <div class="device-name">${friendlyName}</div>
        <div class="device-id">${entity.entity_id}</div>
        ${assignmentDisplay}
        <div class="assign-buttons">
            ${assignButtons}
        </div>
        <div class="control-selector" id="selector-${entity.entity_id.replace(
          /\./g,
          "_"
        )}">
            <select id="control-select-${entity.entity_id.replace(/\./g, "_")}">
                <option value="">Choose control...</option>
            </select>
            <button onclick="assignControl('${
              entity.entity_id
            }')">Assign</button>
        </div>
    `;

  return div;
}

// Show control selector with correct options per property
function showControlSelector(entityId, type, property) {
  // Hide all other selectors
  document.querySelectorAll(".control-selector").forEach((selector) => {
    selector.style.display = "none";
  });

  // Show this selector
  const selectorId = `selector-${entityId.replace(/\./g, "_")}`;
  const selector = document.getElementById(selectorId);
  const selectElement = document.getElementById(
    `control-select-${entityId.replace(/\./g, "_")}`
  );

  // Select correct controls based on property
  let options = '<option value="">Choose control...</option>';

  if (property === "toggle") {
    // On/Off -> only buttons
    options += `
            <option value="1">Button 1</option>
            <option value="2">Button 2</option>
            <option value="3">Button 3</option>
            <option value="4">Button 4</option>
        `;
  } else if (property === "brightness") {
    // Brightness -> only sliders
    options += `
            <option value="7">Slider 1</option>
            <option value="8">Slider 2</option>
        `;
  } else if (property === "color") {
    // Color -> only rotary encoders
    options += `
            <option value="5">Rotary 1</option>
            <option value="6">Rotary 2</option>
        `;
  }

  selectElement.innerHTML = options;
  selector.style.display = "block";

  // Save data for assignment
  selector.dataset.entityType = type;
  selector.dataset.property = property;
}

// Control assignment execution
async function assignControl(entityId) {
  const selectorId = `selector-${entityId.replace(/\./g, "_")}`;
  const selector = document.getElementById(selectorId);
  const selectElement = document.getElementById(
    `control-select-${entityId.replace(/\./g, "_")}`
  );

  const controlId = selectElement.value;
  const entityType = selector.dataset.entityType;
  const property = selector.dataset.property;
  if (!controlId) {
    return;
  }

  // Add assignment to config
  if (!config.assignments) {
    config.assignments = {};
  }

  config.assignments[controlId] = {
    entityId: entityId,
    type: entityType,
    property: property,
    state: "off",
    brightness: 0,
    color: "#ffffff",
  };

  // Save config
  const success = await ipcRenderer.invoke("save-config", config);
  if (success) {
    selector.style.display = "none";
    // Reload entities to show assignment info
    await loadEntities();
  }
}

// Save and update dashboard
async function saveAndUpdateDashboard() {
  // Config is already up-to-date through individual assignments
  // Send message to main window to update dashboard
  const { ipcRenderer } = require("electron");
  try {
    await ipcRenderer.invoke("update-dashboard");
  } catch (error) {
    console.error("Error updating dashboard:", error);
  }
}

// Show error message
function showError(message) {
  const deviceList = document.getElementById("device-list");
  deviceList.innerHTML = `<div class="error">${message}</div>`;
}

// Helper function to find all assignments for an entity
function getAllAssignmentsForEntity(entityId) {
  if (!config || !config.assignments) return [];

  const assignments = [];
  for (const [controlId, assignment] of Object.entries(config.assignments)) {
    if (assignment.entityId === entityId) {
      const controlTypes = {
        1: "Button 1",
        2: "Button 2",
        3: "Button 3",
        4: "Button 4",
        5: "Rotary 1",
        6: "Rotary 2",
        7: "Slider 1",
        8: "Slider 2",
      };
      assignments.push({
        controlId: controlId,
        controlName: controlTypes[controlId],
        property: assignment.property,
      });
    }
  }
  return assignments;
}

// Reset all assignments
async function resetAllAssignments() {
  // Load config if not loaded yet
  if (!config) {
    config = (await ipcRenderer.invoke("load-config")) || {};
  }

  // Clear assignments
  config.assignments = {};

  // Save config
  const success = await ipcRenderer.invoke("save-config", config);

  if (success) {
    // Reload entities to update UI
    await loadEntities();
  }
}

// Initialize devices when page is loaded
document.addEventListener("DOMContentLoaded", initDevices);
