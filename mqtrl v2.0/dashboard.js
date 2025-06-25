const { ipcRenderer } = require('electron')

let config = null

ipcRenderer.on('config', async (e, cfg) => {
  config = cfg
  document.getElementById('dashboard-title').textContent = 'Dashboard'
  document.getElementById('dashboard-info').textContent = 'Laden...'
  await loadHomeAssistantInfo()
})

document.getElementById('gear').onclick = () => {
  ipcRenderer.send('open-settings')
}

function getHaUrl() {
  // Gebruik http, tenzij je weet dat je https moet gebruiken
  return `http://${config.ip}:${config.ha_api_port || '8123'}`
}

async function loadHomeAssistantInfo() {
  if (!config.ip || !config.ha_api_port || !config.ha_token) {
    document.getElementById('dashboard-info').textContent = 'Geen Home Assistant API gegevens ingevuld.'
    return
  }
  try {
    const haUrl = getHaUrl()
    // Config ophalen
    const haConfig = await fetchApi(haUrl + '/api/config')
    // Entiteiten ophalen
    const states = await fetchApi(haUrl + '/api/states')
    // Temperatuur zoeken (eerste sensor met device_class temperature)
    const tempEntity = states.find(e =>
      e.attributes && e.attributes.device_class === 'temperature'
    )
    // Toon info
    document.getElementById('dashboard-title').textContent =
      `${haConfig.location_name} Dashboard`
    let info = `Home Assistant versie: ${haConfig.version}<br>`
    info += `IP: ${config.ip}<br>`
    info += `API Poort: ${config.ha_api_port}<br>`
    if (tempEntity) {
      info += `Temperatuur: ${tempEntity.state} ${tempEntity.attributes.unit_of_measurement || '°C'}<br>`
    }
    document.getElementById('dashboard-info').innerHTML = info

    // Vul entiteitenlijst
    const tbody = document.querySelector('#entity-list tbody')
    tbody.innerHTML = ''
    states.forEach(entity => {
      const row = document.createElement('tr')
      row.innerHTML = `
        <td>${entity.attributes.friendly_name || entity.entity_id}</td>
        <td>${entity.entity_id.split('.')[0]}</td>
        <td>${entity.state} ${entity.attributes.unit_of_measurement || ''}</td>
      `
      tbody.appendChild(row)
    })
  } catch (err) {
    document.getElementById('dashboard-info').textContent = 'Fout bij ophalen Home Assistant info: ' + err.message
  }
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
