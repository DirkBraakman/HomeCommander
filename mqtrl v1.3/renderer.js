const mqtt = require('mqtt')
let client = null

// DOM elements
const connectBtn = document.getElementById('connect-btn')
const testBtn = document.getElementById('test-btn')
const statusIndicator = document.getElementById('status-indicator')
const testSection = document.getElementById('test-section')
const testResult = document.getElementById('test-result')
const messageLog = document.getElementById('message-log') // Toegevoegd

// Helper function to add messages to log
function addToLog(message, type = 'info') {
  const timestamp = new Date().toLocaleTimeString()
  const logEntry = `[${timestamp}] ${type.toUpperCase()}: ${message}\n`
  messageLog.value += logEntry
  messageLog.scrollTop = messageLog.scrollHeight // Auto-scroll naar beneden
}

// Connection handler
connectBtn.addEventListener('click', () => {
  const ip = document.getElementById('ip').value
  const port = document.getElementById('port').value
  const username = document.getElementById('username').value
  const password = document.getElementById('password').value
  
  const options = {
    port: parseInt(port),
  }
  
  if (username) options.username = username
  if (password) options.password = password

  // Disconnect if already connected
  if (client) {
    addToLog('Disconnecting from current broker...')
    client.end()
  }

  addToLog(`Connecting to ${ip}:${port}...`)
  
  // Connect to broker
  client = mqtt.connect(`mqtt://${ip}`, options)

  client.on('connect', () => {
    statusIndicator.className = 'connected'
    testSection.classList.remove('hidden')
    testResult.textContent = ''
    addToLog('Successfully connected to broker', 'success')
    
    // Subscribe to test topic
    const testTopic = 'mqtrl/test'
    client.subscribe(testTopic, (err) => {
      if (err) {
        addToLog(`Failed to subscribe to ${testTopic}: ${err.message}`, 'error')
      } else {
        addToLog(`Subscribed to topic: ${testTopic}`, 'success')
      }
    })
  })

  client.on('error', (err) => {
    statusIndicator.className = 'disconnected'
    testSection.classList.add('hidden')
    addToLog(`Connection error: ${err.message}`, 'error')
  })

  client.on('close', () => {
    statusIndicator.className = 'disconnected'
    testSection.classList.add('hidden')
    addToLog('Connection closed', 'warning')
  })

  // Handle incoming messages
  client.on('message', (topic, message) => {
    addToLog(`Received on ${topic}: ${message.toString()}`, 'received')
  })
})

// Test message handler
testBtn.addEventListener('click', () => {
  if (!client || !client.connected) return
  
  const testTopic = 'mqtrl/test'
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
  })
})