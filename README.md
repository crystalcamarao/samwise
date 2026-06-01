# Receipt Photobooth

An Android-tablet kiosk photobooth: pick a layout (1/3/4/6 photos), take the
shots, print a 58mm thermal receipt (MXW01) and get a QR to download a color
frame + MP4. See [`PLAN.md`](./PLAN.md) for the full design and roadmap.

## Status
Steps 1–10 of the plan are in place: app scaffold + screen flow; Attract /
Welcome / Choose-Layout screens; front-camera capture (countdown, multi-shot,
retake, screen-flash); color frame compositor with selectable themes; MP4
encoding (WebCodecs → MP4 with a WebM fallback); real MXW01 Bluetooth printing
(with a mock fallback); the Termux Node server (kiosk-only upload, LAN download
page); Cloudflare Worker + R2 cloud sync with a retry queue and adaptive QR; the
Result screen (adaptive download QR + thermal print preview, copies, reprint);
and a hidden admin panel (event/theme/logo, camera, print intensity/contrast,
test print, cloud status + sync, storage + purge, config import/export).
kiosk hardening (wake lock, idle auto-reset, periodic reload, Web Worker
encoding); and a test suite + a SessionStart hook. All 12 plan steps are now
implemented. See [`server/SETUP.md`](./server/SETUP.md) for tablet setup and
[`worker/README.md`](./worker/README.md) for cloud deploy.

Open the admin panel by long-pressing the logo on the Welcome screen (PIN
default `1234`).

## Develop
```bash
npm install
npm run dev      # http://localhost:8080  (localhost = secure context → camera works)
npm run lint     # type-check
npm test         # compositor geometry tests
npm run build
```

The camera needs a secure context (HTTPS or `localhost`). On the tablet, open
Chrome at the localhost URL served by the local server.
