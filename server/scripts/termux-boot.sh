#!/data/data/com.termux/files/usr/bin/bash
# Auto-start on tablet boot. Install the "Termux:Boot" add-on (from F-Droid),
# then copy this file to ~/.termux/boot/ and make it executable. On power-up it
# launches the server unattended.
sleep 5
~/photobooth/server/scripts/start.sh >> ~/photobooth/boot.log 2>&1
