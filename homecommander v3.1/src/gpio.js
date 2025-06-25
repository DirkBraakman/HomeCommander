// GPIO event emitter setup
const { Gpio } = require("onoff");
const EventEmitter = require("events");
const gpioEvents = new EventEmitter();

// Simple debounce helper
function debounce(fn, delay) {
  let timeout = null;
  return (...args) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), delay);
  };
}

// Rotary encoder setup (direction detection)
function setupRotary(dtPin, clkPin, rotaryIndex) {
  let lastClk = 0;
  const dt = new Gpio(dtPin, "in", "both");
  const clk = new Gpio(clkPin, "in", "both");
  clk.watch((err, value) => {
    if (err) return;
    if (value !== lastClk) {
      const dtValue = dt.readSync();
      gpioEvents.emit(
        "rotary",
        rotaryIndex,
        dtValue !== value ? "right" : "left"
      );
      lastClk = value;
    }
  });
}

// Button setup (rising edge, debounced)
function setupButton(pin, buttonIndex) {
  const btn = new Gpio(pin, "in", "rising", { debounceTimeout: 50 });
  btn.watch(
    debounce((err) => {
      if (err) return;
      gpioEvents.emit("button", buttonIndex);
    }, 50)
  );
}

// Hardware pin assignments (Raspberry Pi GPIO)
setupRotary(26, 22, 1);
setupRotary(5, 19, 2);
setupRotary(13, 6, 3);
setupButton(16, 1);
setupButton(20, 2);
setupButton(21, 3);

// Export event emitter
module.exports = { gpioEvents };
