# Receipt Photobooth

An Android-tablet kiosk photobooth: pick a layout (1/3/4/6 photos), take the
shots, print a 58mm thermal receipt (MXW01) and get a QR to download a color
frame + MP4. See [`PLAN.md`](./PLAN.md) for the full design and roadmap.

## Status
Steps 1–4 of the plan are in place: app scaffold + screen flow, Attract /
Welcome / Choose-Layout screens, front-camera capture (countdown, multi-shot,
retake, screen-flash), and the color frame compositor. Printing, MP4 encoding,
the local server, cloud sync, and the admin panel are next.

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
