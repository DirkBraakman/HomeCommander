// MQTRL Settings
window.addEventListener('DOMContentLoaded', () => {
  const $ = (id) => document.getElementById(id);
  const output = $('output');

  // Load config
  window.mqtrl.loadConfig().then(cfg => {
    if (cfg) {
      $('ip').value = cfg.ip || '';
      $('username').value = cfg.username || '';
      $('password').value = cfg.password || '';
      $('apiPort').value = cfg.apiPort || 8123;
      $('token').value = cfg.token || '';
      $('mqttPort').value = cfg.mqttPort || 1883;
    }
  });

  $('saveBtn').onclick = () => {
    const config = {
      ip: $('ip').value,
      username: $('username').value,
      password: $('password').value,
      apiPort: Number($('apiPort').value),
      token: $('token').value,
      mqttPort: Number($('mqttPort').value)
    };
    window.mqtrl.submitSettings(config);
  };

  $('clearBtn').onclick = () => {
    window.mqtrl.clearConfig().then(() => {
      $('settingsForm').reset();
      output.textContent = 'Settings cleared.';
    });
  };

  $('apiTestBtn').onclick = async () => {
    output.textContent = 'Testing API...';
    try {
      const res = await fetch(`http://${$('ip').value}:${$('apiPort').value}/api/`, {
        headers: { 'Authorization': `Bearer ${$('token').value}` }
      });
      output.textContent = res.ok ? 'API test successful!' : 'API test failed: ' + res.status;
    } catch (e) {
      output.textContent = 'API test failed: ' + e.message;
    }
  };

  $('mqttTestBtn').onclick = async () => {
    output.textContent = 'Testing MQTT...';
    try {
      const result = await window.mqtrl.testMqtt({
        ip: $('ip').value,
        mqttPort: $('mqttPort').value,
        username: $('username').value,
        password: $('password').value
      });
      output.textContent = result.success ? 'MQTT test successful!' : 'MQTT test failed: ' + result.error;
    } catch (e) {
      output.textContent = 'MQTT test failed: ' + e.message;
    }
  };
});
