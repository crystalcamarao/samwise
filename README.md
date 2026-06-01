# Receipt Photobooth

An Android-tablet kiosk photobooth: pick a layout (1/3/4/6 photos), take the
shots, print a 58mm thermal receipt (MXW01) and get a QR to download a color
frame + MP4. See [`PLAN.md`](./PLAN.md) for the full design and roadmap.

## Status
Steps 1–7 of the plan are in place: app scaffold + screen flow; Attract /
Welcome / Choose-Layout screens; front-camera capture (countdown, multi-shot,
retake, screen-flash); color frame compositor; MP4 encoding (WebCodecs → MP4
with a WebM fallback); the Termux Node server (kiosk-only upload, LAN download
page); and the Result screen (download QR + thermal print preview, copies,
reprint). Real MXW01 Bluetooth printing (currently mocked), Cloudflare cloud
sync, and the admin panel are next. See [`server/SETUP.md`](./server/SETUP.md)
for tablet setup.

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
