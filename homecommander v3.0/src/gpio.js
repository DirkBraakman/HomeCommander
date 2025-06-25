// GPIO handler for rotary encoders and buttons
// Uses onoff for GPIO access
const { Gpio } = require('onoff');
const EventEmitter = require('events');

// GPIO pin assignments
const ROTARY1_DT = 26;
const ROTARY1_CLK = 22;
const ROTARY2_DT = 5;
const ROTARY2_CLK = 19;
const ROTARY3_DT = 13;
const ROTARY3_CLK = 6;
const BUTTON1_PIN = 16;
const BUTTON2_PIN = 20;
const BUTTON3_PIN = 21;

// Step sizes
const rotaryBrightnessStep = 5; // % per step
const rotaryHueStep = 30; // degrees per step

// Event emitter for actions
const gpioEvents = new EventEmitter();

// Helper to debounce button presses
function debounce(fn, delay) {
  let timeout = null;
  return (...args) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), delay);
  };
}

// Rotary encoder handler
function setupRotary(dtPin, clkPin, rotaryIndex) {
  let lastClk = 0;
  const dt = new Gpio(dtPin, 'in', 'both');
  const clk = new Gpio(clkPin, 'in', 'both');
  clk.watch((err, value) => {
    if (err) return;
    if (value !== lastClk) {
      const dtValue = dt.readSync();
      if (dtValue !== value) {
        gpioEvents.emit('rotary', rotaryIndex, 'right');
      } else {
        gpioEvents.emit('rotary', rotaryIndex, 'left');
      }
      lastClk = value;
    }
  });
}

// Button handler
function setupButton(pin, buttonIndex) {
  const btn = new Gpio(pin, 'in', 'rising', { debounceTimeout: 50 });
  btn.watch(debounce((err, value) => {
    if (err) return;
    gpioEvents.emit('button', buttonIndex);
  }, 50));
}

// Setup all hardware
setupRotary(ROTARY1_DT, ROTARY1_CLK, 1);
setupRotary(ROTARY2_DT, ROTARY2_CLK, 2);
setupRotary(ROTARY3_DT, ROTARY3_CLK, 3);
setupButton(BUTTON1_PIN, 1);
setupButton(BUTTON2_PIN, 2);
setupButton(BUTTON3_PIN, 3);

module.exports = {
  gpioEvents,
  rotaryBrightnessStep,
  rotaryHueStep
};
