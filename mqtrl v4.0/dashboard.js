// MQTRL Dashboard
const spotIcons = ['💡', '🔌', '💡', '🔈', '🔒', '🌡️', '🪟', '🛏️'];

function updateClock() {
  document.getElementById('clock').textContent = new Date().toLocaleTimeString();
}

function loadServerInfo() {
  window.mqtrl.loadConfig().then(cfg => {
    document.getElementById('serverInfo').textContent = cfg?.ip 
      ? `Home Assistant: ${cfg.ip}:${cfg.apiPort || 8123}`
      : 'No config loaded';
  });
}

function renderSpots() {
  const row1 = document.getElementById('row1');
  const row2 = document.getElementById('row2');
  row1.innerHTML = '';
  row2.innerHTML = '';
  
  for (let i = 0; i < 4; i++) {
    const spot = document.createElement('div');
    spot.className = 'spot';
    spot.innerHTML = `${spotIcons[i]}<div class='spot-label'>Spot ${i+1}</div>`;
    row1.appendChild(spot);
  }
  
  for (let i = 4; i < 8; i++) {
    const spot = document.createElement('div');
    spot.className = 'spot';
    spot.innerHTML = `${spotIcons[i]}<div class='spot-label'>Spot ${i+1}</div>`;
    row2.appendChild(spot);
  }
}

document.getElementById('settingsBtn').onclick = () => window.mqtrl.openSettingsWindow();
document.getElementById('devicesBtn').onclick = () => window.mqtrl.openDevicesWindow();

setInterval(updateClock, 1000);
updateClock();
loadServerInfo();
renderSpots();
