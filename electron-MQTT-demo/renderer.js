const mqtt = require('mqtt');
const fetch = require('node-fetch');

let client;
let config = {};
let entities = [];

window.addEventListener('DOMContentLoaded', async () => {
  window.electronAPI.receiveConfig(async (receivedConfig) => {
    config = receivedConfig;
    await initConnection();
  });
});

async function initConnection() {
  await loadEntities();
  connectMQTT();
}

async function loadEntities() {
  try {
    const response = await fetch(
      `${config.ha_api.url}/api/states`,
      {
        headers: {
          'Authorization': `Bearer ${config.ha_api.token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    const data = await response.json();
    entities = data.filter(entity => 
      config.ha_api.entity_filter.split(',').some(prefix => 
        entity.entity_id.startsWith(prefix)
      )
    );
    
    renderEntities();
    updateServerStats(data);
  } catch (error) {
    console.error('Fout bij ophalen entities:', error);
  }
}

function connectMQTT() {
  client = mqtt.connect(config.mqtt.server, {
    port: config.mqtt.port,
    username: config.mqtt.username,
    password: config.mqtt.password
  });

  client.on('connect', () => {
    console.log('Verbonden met MQTT');
    entities.forEach(entity => {
      client.subscribe(`${config.mqtt.base_topic}/${entity.entity_id}/state`);
    });
  });

  client.on('message', (topic, message) => {
    const entityId = topic.split('/')[1];
    updateEntityState(entityId, message.toString());
  });
}

function updateEntityState(entityId, state) {
  const entity = entities.find(e => e.entity_id === entityId);
  if (entity) {
    entity.state = state;
    renderEntity(entity);
  }
}

function toggleEntity(entityId) {
  const entity = entities.find(e => e.entity_id === entityId);
  if (!entity) return;

  const service = entity.entity_id.split('.')[0];
  const domain = entity.entity_id.split('.')[0];
  
  fetch(
    `${config.ha_api.url}/api/services/${domain}/toggle`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.ha_api.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ entity_id: entity.entity_id })
    }
  ).catch(error => console.error('Toggle error:', error));
}

function renderEntities() {
  const container = document.getElementById('devices-container');
  container.innerHTML = '';
  entities.forEach(entity => {
    renderEntity(entity);
  });
}

function renderEntity(entity) {
  const container = document.getElementById('devices-container');
  const existing = document.getElementById(`entity-${entity.entity_id}`);
  
  const html = `
    <div class="entity-row" id="entity-${entity.entity_id}">
      <div class="entity-status ${entity.state}" 
           onclick="toggleEntity('${entity.entity_id}')">
        ${entity.state === 'on' ? 'AAN' : 'UIT'}
      </div>
      <div class="entity-name">
        ${entity.attributes?.friendly_name || entity.entity_id}
      </div>
    </div>
  `;
  
  if (existing) {
    existing.outerHTML = html;
  } else {
    container.insertAdjacentHTML('beforeend', html);
  }
}

function updateServerStats(entities) {
  document.getElementById('ha-location').textContent = 
    entities.find(e => e.entity_id === 'zone.home')?.attributes.friendly_name || 'Home';
  
  const versionEntity = entities.find(e => e.entity_id === 'sensor.version');
  if (versionEntity) {
    document.getElementById('ha-version').textContent = versionEntity.state;
  }
}

window.toggleEntity = toggleEntity;