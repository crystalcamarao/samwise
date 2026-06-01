# Tablet setup (Termux + Chrome kiosk)

How to run the photobooth on an Android tablet, fully offline-capable.

## 1. Install Termux + Node
1. Install **Termux** and the **Termux:Boot** add-on from **F-Droid**
   (not the Play Store version — it's outdated).
2. In Termux:
   ```bash
   pkg update && pkg install nodejs git
   termux-setup-storage        # allow file access
   ```

## 2. Get the app onto the tablet
```bash
cd ~ && git clone <repo-url> photobooth
cd photobooth
npm install
npm run build               # produces dist/ that the server serves
cd server && npm start      # → http://localhost:8080
```

## 3. Auto-start on boot (recommended)
```bash
mkdir -p ~/.termux/boot
cp ~/photobooth/server/scripts/termux-boot.sh ~/.termux/boot/
chmod +x ~/.termux/boot/termux-boot.sh ~/photobooth/server/scripts/start.sh
```
- Disable battery optimization for Termux (Android Settings → Apps → Termux).
- Keep the tablet **plugged in**. `start.sh` calls `termux-wake-lock` so the
  server isn't killed in the background.

## 4. Chrome kiosk
1. Open **Chrome** → `http://localhost:8080`.
   `localhost` is a secure context, so **camera + Web Bluetooth printing work**
   over plain HTTP — no certificates needed.
2. Chrome menu → **Add to Home screen** to launch fullscreen without the URL bar.
3. Lock it down: Android **Settings → Security → App pinning**, then pin Chrome.
   Exiting requires the PIN.

## 5. Networking
- **With a data SIM (primary):** the tablet uploads sessions to the cloud over
  cellular; guests scan the durable QR and download on their own connection.
- **No signal (fallback):** turn on the tablet **hotspot**; guests join it and
  the on-screen "Save now" QR points to the tablet's LAN IP (e.g.
  `http://192.168.43.1:8080/s/<id>`). The download still works with zero internet.

## Operator checklist
- [ ] Tablet plugged in
- [ ] Paper loaded in the printer, printer charged & paired
- [ ] SIM has data / hotspot on for the offline fallback
- [ ] Chrome pinned to `localhost:8080`
