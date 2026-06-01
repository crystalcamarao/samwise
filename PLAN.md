# Receipt Photobooth — Build Plan

An Android-tablet kiosk photobooth. Logo → Get Started → pick a layout (1/3/4/6
photos) → capture → prints a **58mm thermal receipt** (MXW01) and shows an
on-screen **QR** to download a color **framed photo + MP4**. Offline-first with
adaptive cloud sync so guests can download during *and* after the event.

## Hardware
- **Printer:** MXW01, 58mm thermal, **384px** print width, **Web Bluetooth (BLE)**
  via the `mxw01-thermal-printer` TypeScript library (framework-agnostic).
- **Tablet:** Android, **Chrome** (required for Web Bluetooth + camera), front
  camera, **data SIM** for the cellular uplink, kept plugged in.

## Stack
- React + Vite + TypeScript PWA (kiosk UI).
- Runtime-agnostic **Node server**, run on the tablet via **Termux**. Serves the
  app at `localhost` (a secure context, so Web Bluetooth works), stores sessions
  locally, runs the cloud-sync queue, and serves the LAN download page.
- **Cloudflare Worker + R2** for durable cloud downloads (opportunistic upload).
- Output video: **WebCodecs → MP4** (WebM fallback), encoded in a Web Worker.

## Operating model (SIM primary + offline fallback)
- App is **served locally from Termux** → always loads regardless of signal;
  Web Bluetooth printing works at `localhost`.
- The **SIM is the primary uplink**: each session uploads to Cloudflare in the
  background, so the durable link is usually live before the guest leaves.
- **Result screen is adaptive:**
  - **Signal present (usual case):** one **durable cloud QR**; guests download on
    their own data, on-site and forever after. No hotspot needed.
  - **Dead zone:** falls back to the **LAN path** — hotspot + Wi-Fi-join QR +
    "Save now" instant download — plus the durable cloud QR that lights up once
    the SIM regains signal and the queue syncs.
- **Printing** is Bluetooth, fully offline, unaffected by signal in all cases.

## Screens
Attract (idle loop, "Tap to start") → Welcome (logo) → Choose Layout (1/3/4/6,
template-previewed) → Capture (front cam, countdown, multi-shot, retake,
screen-flash) → Processing (compose frame + encode MP4 + queue) → Result
(adaptive QR + print preview / reprint / multiple copies) → Admin (hidden, PIN).

## Layouts
`{ count, rows, cols, gutter, ... }` config drives both UI and compositor:
- **1** — single large photo
- **3** — classic vertical strip
- **4** — 2×2 grid
- **6** — 2×3 grid

## Template system
JSON descriptor + optional PNG assets, selectable per event in admin. Renders
two targets from one template:
- **Color digital frame** (for the MP4 + download)
- **1-bit thermal receipt** (overlay flattened, portrait-tuned dithering)
`{eventName}` / `{date}` filled from admin settings. Extends to **MP4 branding**
(logo watermark + intro/outro frame).

## Admin panel (hidden, PIN)
Camera select · print intensity/dither · event name + logo upload · template
picker + live preview · **test print** · printer reconnect + paper/battery
status · **cellular/online status + data-used estimate** · storage used + free
space + **warn >10 GB (configurable, warn-only)** · manual purge (local & cloud)
· pending-upload count + **Sync now** · **config import/export** to clone tablets.

## Reliability (all-day kiosk)
Per-session blob/canvas/object-URL cleanup · encode in a Web Worker · periodic
auto-reload (idle / every N sessions) · re-acquire camera / BLE / wake-lock on
focus/visibility change · **print failure never blocks the digital path** ·
graceful out-of-disk handling.

## Security
Unguessable session ids · upload endpoint **kiosk-only** · read-only LAN
download · rate-limiting. (Privacy handling is minimal per decision: no consent
screen, no guest self-delete; operator-only manual purge.)

## Repo layout
```
/server/   Node: serve app, POST /api/session (kiosk-only), GET /s/:id,
           GET /r/:id/:file, cloud sync, manual purge;
           scripts/: termux-boot, start, wake-lock, SETUP.md
/  src/screens/  Attract, Welcome, ChooseLayout, Capture, Processing, Result, Admin
   src/lib/      camera, compositor, template, video(mp4), printer(mxw01),
                 upload, queue, sync, qr, storage, mocks
   src/config/   layouts.ts, templates/*.json, settings
   public/       PWA manifest, icons, default logo/templates
/worker/   Cloudflare Worker + R2 (durable cloud), wrangler.toml
tests/     compositor geometry, layout×template snapshots
```

## Build order
1. Scaffold PWA + screen state machine
2. Welcome + Attract + layout select
3. Camera capture (front cam, countdown, retake, mirror/crop, flash)
4. Template engine + color compositor (1/3/4/6)
5. MP4 encoder (Web Worker)
6. Node server on Termux + LAN download page + kiosk-only upload
7. Result screen: adaptive QR + print preview / reprint / copies
8. Printer (mxw01): persistent BLE, queue/lock, 1-bit thermal render, dithering
9. Cloudflare Worker + R2 + background sync + adaptive online/offline logic
10. Admin panel
11. Kiosk hardening: Termux:Boot auto-start, wake-lock, memory/reload,
    screen-pinning + hotspot docs, mock hardware for sandbox dev
12. Tests + SessionStart hook + SETUP.md

## Status
- [x] Steps 1–4: scaffold, screens, camera, compositor
- [x] Step 5: MP4 encoder (WebCodecs → MP4, MediaRecorder → WebM fallback)
- [x] Step 6: Termux Node server (kiosk-only upload, LAN download page, streaming)
- [x] Step 7: Result screen (QR + print preview / reprint / copies)
- [x] Step 8: thermal 1-bit render + Atkinson dithering, **real MXW01 Web
  Bluetooth client** (mock auto-fallback when BLE is unavailable / `pb_printer=mock`)
- [x] Step 9: Cloudflare Worker + R2, tablet→cloud background sync + retry
  queue, `/api/status` + `/api/sync`, adaptive online/offline QR (durable cloud
  vs "save now" LAN + secondary durable QR)
- [x] Step 10: Admin panel (hidden long-press + PIN): event name/date/theme/
  logo, camera select, print intensity + contrast, test print, printer
  reconnect, cloud status + Sync now, storage used/free + warn threshold +
  purge-all, config import/export; server `/api/storage` `/api/sessions`
  `/api/purge`
- [x] Step 11: kiosk hardening — screen wake lock (re-acquire on visibility),
  idle auto-reset to attract, periodic reload to flush memory, MP4 encoding
  moved to a Web Worker; auto-start scripts + screen-pinning/hotspot docs
- [ ] Step 12: more tests + SessionStart hook
