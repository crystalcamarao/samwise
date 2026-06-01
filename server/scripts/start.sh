#!/data/data/com.termux/files/usr/bin/bash
# Start the photobooth server on the tablet. Keeps the CPU awake so Android
# doesn't kill it, then serves the built app + downloads on port 8080.
set -e
termux-wake-lock 2>/dev/null || true
cd "$(dirname "$0")/.."
exec node server.js
