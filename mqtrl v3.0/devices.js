const { ipcRenderer } = require('electron')

let config = null
let sortColumn = 'name'
let sortDirection = 1 // 1 = asc, -1 = desc
let statesCache = []
let spotsArr = Array(8).fill(null)

async function loadSpotsArrFromConfig() {
  const arr = await ipcRenderer.invoke('get-spots-array')
  spotsArr = Array.isArray(arr) ? arr.slice(0, 8).concat(Array(8).fill(null)).slice(0, 8) : Array(8).fill(null)
}

ipcRenderer.on('config', async (e, cfg) => {
  config = cfg
  document.getElementById('devices-title').textContent = 'Devices'
  document.getElementById('devices-info').textContent = 'Laden...'
  await loadSpotsArrFromConfig()
  await loadHomeAssistantInfo()
})

window.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('#entity-list th[data-sort]').forEach(th => {
    th.addEventListener('click', () => {
      const col = th.getAttribute('data-sort')
      if (sortColumn === col) {
        sortDirection *= -1 // Toggle direction
      } else {
        sortColumn = col
        sortDirection = 1
      }
      renderEntityList(statesCache)
    })
  })
  const saveBtn = document.getElementById('save-spots-btn')
  if (saveBtn) {
    saveBtn.onclick = saveSpots
  }
})

function getHaUrl() {
  return `http://${config.ip}:${config.ha_api_port || '8123'}`
}

async function loadHomeAssistantInfo() {
  if (!config.ip || !config.ha_api_port || !config.ha_token) {
    document.getElementById('devices-info').textContent = 'Geen Home Assistant API gegevens ingevuld.'
    return
  }
  try {
    const haUrl = getHaUrl()
    // Config ophalen
    const haConfig = await fetchApi(haUrl + '/api/config')
    // Entiteiten ophalen
    const states = await fetchApi(haUrl + '/api/states')
    document.getElementById('devices-info').innerHTML =
      `Home Assistant versie: ${haConfig.version}<br>
      IP: ${config.ip}<br>
      API Poort: ${config.ha_api_port}<br>
      Totaal entities: ${states.length}`
    statesCache = states
    renderEntityList(statesCache)
  } catch (err) {
    document.getElementById('devices-info').textContent = 'Fout bij ophalen Home Assistant info: ' + err.message
  }
}

function sortStates(states) {
  return states.slice().sort((a, b) => {
    let aVal, bVal
    if (sortColumn === 'name') {
      aVal = (a.attributes.friendly_name || a.entity_id).toLowerCase()
      bVal = (b.attributes.friendly_name || b.entity_id).toLowerCase()
    } else if (sortColumn === 'type') {
      aVal = a.entity_id.split('.')[0]
      bVal = b.entity_id.split('.')[0]
    } else if (sortColumn === 'value') {
      aVal = isNaN(Number(a.state)) ? a.state : Number(a.state)
      bVal = isNaN(Number(b.state)) ? b.state : Number(b.state)
    }
    if (aVal < bVal) return -1 * sortDirection
    if (aVal > bVal) return 1 * sortDirection
    return 0
  })
}

async function saveSpots() {
  const inputs = document.querySelectorAll('input[type="number"][data-entity-id]')
  let newSpotsArr = Array(8).fill(null)
  let error = false
  let errorMsg = ''
  let spotNumbers = {}

  inputs.forEach(input => {
    const val = parseInt(input.value)
    const entityId = input.getAttribute('data-entity-id')
    if (!isNaN(val)) {
      if (val < 1 || val > 8) {
        error = true
        errorMsg = 'Spot number must be between 1 and 8.'
      } else if (spotNumbers[val]) {
        error = true
        errorMsg = 'Duplicate spot numbers are not allowed.'
      } else {
        newSpotsArr[val - 1] = entityId
        spotNumbers[val] = true
      }
    }
  })

  if (error) {
    alert(errorMsg)
    return
  }

  await ipcRenderer.invoke('set-spots-array', newSpotsArr)
  await loadSpotsArrFromConfig()
  document.getElementById('save-status').textContent = 'Saved!'
  setTimeout(() => { document.getElementById('save-status').textContent = '' }, 1500)
  renderEntityList(statesCache)
}

function renderEntityList(states) {
  const tbody = document.querySelector('#entity-list tbody')
  tbody.innerHTML = ''
  sortStates(states).forEach(entity => {
    const entityId = entity.entity_id
    // Zoek of deze entity in spotsArr zit
    let spotValue = ''
    const idx = spotsArr.findIndex(eid => eid === entityId)
    if (idx !== -1) spotValue = idx + 1
    const row = document.createElement('tr')
    row.innerHTML = `
      <td>${entity.attributes.friendly_name || entity.entity_id}</td>
      <td>${entity.entity_id.split('.')[0]}</td>
      <td>${entity.state} ${entity.attributes.unit_of_measurement || ''}</td>
      <td>
        <input type="number" min="1" max="8" value="${spotValue}" style="width:50px" data-entity-id="${entityId}">
      </td>
    `
    tbody.appendChild(row)
  })
}

async function fetchApi(url) {
  try {
    const res = await fetch(url, {
      headers: {
        'Authorization': 'Bearer ' + config.ha_token,
        'Content-Type': 'application/json'
      }
    })
    if (!res.ok) throw new Error(await res.text())
    return await res.json()
  } catch (e) {
    throw new Error('Kan niet verbinden met Home Assistant API op ' + url + ': ' + e.message)
  }
}
