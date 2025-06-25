#!/bin/bash
# Set internal pull-up resistors for all GPIO pins (0 to 27) using raspi-gpio
cd "$(dirname "$0")"
for PIN in {0..27}; do
  raspi-gpio set "$PIN" pu
done

xhost +SI:localuser:root
sudo -E /home/admin/.config/nvm/versions/node/v16.20.2/bin/node node_modules/.bin/electron . --no-sandbox