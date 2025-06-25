const { ipcRenderer } = require('electron')
const mqtt = require('mqtt')

let client = null

const ipInput = document.getElementById('ip')
const portInput = document.getElementById('port')
const usernameInput = document.getElementById('username')
const passwordInput = document.getElementById('password')
const haApiPortInput = document.getElementById('ha_api_port')
const haTokenInput = document.getElementById('ha_token')
const testBtn = document.getElementById('test-btn')
const connectBtn = document.getElementById('connect-btn')
const resetBtn = document.getElementById('reset-btn')
const testResult = document.getElementById('test-result')
const messageLog = document.getElementById('message-log')

function addToLog(message, type = 'info') {
  const timestamp = new Date().toLocaleTimeString()
  const logEntry = `[${timestamp}] ${type.toUpperCase()}: ${message}\n`
  messageLog.value += logEntry
  messageLog.scrollTop = messageLog.scrollHeight
}

async function loadConfig() {
  const config = await ipcRenderer.invoke('load-config')
  ipInput.value = config.ip || ''
  portInput.value = config.port || '1883'
  usernameInput.value = config.username || ''
  passwordInput.value = config.password || ''
  haApiPortInput.value = config.ha_api_port || '8123'
  haTokenInput.value = config.ha_token || ''
}

async function saveConfig() {
  const config = {
    ip: ipInput.value,
    port: portInput.value,
    username: usernameInput.value,
    password: passwordInput.value,
    ha_api_port: haApiPortInput.value,
    ha_token: haTokenInput.value
  }
  await ipcRenderer.invoke('save-config', config)
}

resetBtn.addEventListener('click', async () => {
  ipInput.value = ''
  portInput.value = '1883'
  usernameInput.value = ''
  passwordInput.value = ''
  haApiPortInput.value = '8123'
  haTokenInput.value = ''
  messageLog.value = ''
  testResult.textContent = ''
  await ipcRenderer.invoke('save-config', {
    ip: '', port: '1883', username: '', password: '', ha_api_port: '8123', ha_token: ''
  })
})

testBtn.addEventListener('click', () => {
  if (client) client.end()
  const ip = ipInput.value
  const port = portInput.value
  const username = usernameInput.value
  const password = passwordInput.value
  const options = { port: parseInt(port) }
  if (username) options.username = username
  if (password) options.password = password
  addToLog(`Connecting to ${ip}:${port}...`)
  client = mqtt.connect(`mqtt://${ip}`, options)

  let finished = false
  const cleanup = () => {
    if (client) {
      client.removeAllListeners()
      client.end(true)
      client = null
    }
  }

  client.once('connect', () => {
    if (finished) return
    finished = true
    addToLog('Successfully connected to broker', 'success')
    const testTopic = 'mqtrl/test'
    client.subscribe(testTopic, (err) => {
      if (err) {
        addToLog(`Failed to subscribe: ${err.message}`, 'error')
        testResult.textContent = 'Error: ' + err.message
        testResult.style.color = 'red'
        cleanup()
        return
      }
      addToLog(`Subscribed to topic: ${testTopic}`, 'success')
      // Send test message
      const testMessage = 'Test message from MQTRL at ' + new Date().toLocaleTimeString()
      addToLog(`Sending to ${testTopic}: ${testMessage}`, 'sent')
      client.publish(testTopic, testMessage, (err) => {
        if (err) {
          testResult.textContent = 'Error: ' + err.message
          testResult.style.color = 'red'
          addToLog(`Failed to send: ${err.message}`, 'error')
        } else {
          testResult.textContent = 'Test message sent successfully!'
          testResult.style.color = 'green'
        }
        cleanup()
      })
    })
  })
  client.once('error', (err) => {
    if (finished) return
    finished = true
    addToLog(`Connection error: ${err.message}`, 'error')
    testResult.textContent = 'Error: ' + err.message
    testResult.style.color = 'red'
    cleanup()
  })
  client.once('close', () => {
    if (finished) return
    finished = true
    addToLog('Connection closed', 'warning')
    cleanup()
  })
  client.on('message', (topic, message) => {
    addToLog(`Received on ${topic}: ${message.toString()}`, 'received')
  })
})

connectBtn.addEventListener('click', async () => {
  if (client) client.end()
  const ip = ipInput.value
  const port = portInput.value
  const username = usernameInput.value
  const password = passwordInput.value
  const options = { port: parseInt(port) }
  if (username) options.username = username
  if (password) options.password = password
  addToLog(`Connecting to ${ip}:${port}...`)
  client = mqtt.connect(`mqtt://${ip}`, options)
  client.on('connect', async () => {
    addToLog('Successfully connected to broker', 'success')
    await saveConfig()
    ipcRenderer.send('open-dashboard', {
      ip, port, username, password,
      ha_api_port: haApiPortInput.value,
      ha_token: haTokenInput.value
    })
  })
  client.on('error', (err) => {
    addToLog(`Connection error: ${err.message}`, 'error')
    testResult.textContent = 'Error: ' + err.message
    testResult.style.color = 'red'
  })
})

window.onload = loadConfig
