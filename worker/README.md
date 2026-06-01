# Cloud Worker (durable downloads)

Cloudflare Worker + R2 that stores each session so guests can download during
**and after** the event. The tablet uploads here over its SIM/Wi-Fi; the QR on
the Result screen points to `https://<worker>/s/<id>` when online.

## Deploy
```bash
npm install -g wrangler          # or: npx wrangler ...
wrangler login
wrangler r2 bucket create photobooth
wrangler secret put CLOUD_TOKEN  # choose a strong shared secret
wrangler deploy
```
This prints your Worker URL, e.g. `https://receipt-photobooth.<acct>.workers.dev`.

## Point the tablet at it
Set these in the tablet server's environment (Termux) so it syncs:
```bash
export CLOUD_BASE=https://receipt-photobooth.<acct>.workers.dev
export CLOUD_TOKEN=<same secret as the Worker>
```
When unset, the booth runs LAN-only (offline) and the QR uses the tablet's LAN
URL instead.

## Routes
- `PUT /api/session/:id` — upload (Bearer `CLOUD_TOKEN`); id is the tablet's stable id
- `GET /s/:id` — guest download page (or "being prepared" before upload lands)
- `GET /r/:id/:file` — stream `frame.png` / `clip.mp4|webm`
- `DELETE /api/session/:id` — purge one session (Bearer; used by admin)
- `GET /api/sessions` — list session ids (Bearer; used by admin)
- `GET /health` — reachability check used for the adaptive QR

## Retention
No automatic expiry — purge is manual (admin panel / `DELETE`), matching the
local store. R2's free tier is 10 GB (~1–2 GB per 100-person event).
