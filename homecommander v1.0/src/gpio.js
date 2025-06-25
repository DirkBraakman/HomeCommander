// GPIO Controller - placeholder for Raspberry Pi GPIO functions
// This module will later handle the physical buttons, rotary encoders and sliders

class GPIOController {
  constructor() {
    this.buttons = []; // 4 buttons
    this.rotaryEncoders = []; // 2 rotary encoders
    this.sliders = []; // 2 sliders
    this.callbacks = {};
  }

  // Initialize GPIO (placeholder)
  init() {
    console.log("GPIO Controller initialized");
    // Here would come the real GPIO setup for Raspberry Pi
    // For example with the 'rpi-gpio' or 'pigpio' library
  }

  // Register button event handler
  onButtonPress(buttonId, callback) {
    if (!this.callbacks.buttons) this.callbacks.buttons = {};
    this.callbacks.buttons[buttonId] = callback;
  }

  // Register rotary encoder event handler
  onRotaryChange(rotaryId, callback) {
    if (!this.callbacks.rotaryEncoders) this.callbacks.rotaryEncoders = {};
    this.callbacks.rotaryEncoders[rotaryId] = callback;
  }

  // Register slider event handler
  onSliderChange(sliderId, callback) {
    if (!this.callbacks.sliders) this.callbacks.sliders = {};
    this.callbacks.sliders[sliderId] = callback;
  }

  // Simulate button press (for testing without hardware)
  simulateButtonPress(buttonId) {
    if (this.callbacks.buttons && this.callbacks.buttons[buttonId]) {
      this.callbacks.buttons[buttonId]();
    }
  }

  // Simulate rotary encoder (for testing without hardware)
  simulateRotaryChange(rotaryId, direction) {
    if (
      this.callbacks.rotaryEncoders &&
      this.callbacks.rotaryEncoders[rotaryId]
    ) {
      this.callbacks.rotaryEncoders[rotaryId](direction);
    }
  }

  // Simulate slider change (for testing without hardware)
  simulateSliderChange(sliderId, value) {
    if (this.callbacks.sliders && this.callbacks.sliders[sliderId]) {
      this.callbacks.sliders[sliderId](value);
    }
  }
}

module.exports = GPIOController;
