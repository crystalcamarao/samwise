import { createServer } from "node:http";
import { createReadStream } from "node:fs";
import { mkdir, readFile, writeFile, stat, readdir, rm } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import { networkInterfaces } from "node:os";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import { renderDownloadPage } from "./download-page.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 8080;
const DIST = join(__dirname, "..", "dist");
const DATA = process.env.DATA_DIR || join(__dirname, "data");
/** Cap on a single uploaded session (frame + video), base64-inflated. */
const MAX_BODY = 40 * 1024 * 1024;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".css": "text/css",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".json": "application/json",
  ".webmanifest": "application/manifest+json",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
};

await mkdir(DATA, { recursive: true });

/** The tablet's LAN/hotspot IPv4, so guests can reach the download page. */
function lanAddress() {
  for (const addrs of Object.values(networkInterfaces())) {
    for (const a of addrs || []) {
      if (a.family === "IPv4" && !a.internal) return a.address;
    }
  }
  return null;
}

/** Loopback check — only the kiosk (Chrome on the tablet) may upload. */
function isLoopback(req) {
  const a = req.socket.remoteAddress || "";
  return a === "127.0.0.1" || a === "::1" || a === "::ffff:127.0.0.1";
}

function send(res, status, body, headers = {}) {
  res.writeHead(status, headers);
  res.end(body);
}

function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on("data", (c) => {
      size += c.length;
      if (size > limit) {
        reject(new Error("payload too large"));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

function decodeDataUrl(dataUrl) {
  const m = /^data:([^;]+);base64,(.*)$/s.exec(dataUrl || "");
  if (!m) return null;
  return { mime: m[1], buffer: Buffer.from(m[2], "base64") };
}

async function handleCreateSession(req, res) {
  if (!isLoopback(req)) return send(res, 403, "forbidden");
  let payload;
  try {
    const raw = await readBody(req, MAX_BODY);
    payload = JSON.parse(raw.toString("utf8"));
  } catch {
    return send(res, 400, "bad request");
  }

  const frame = decodeDataUrl(payload.frame);
  const video = decodeDataUrl(payload.video);
  if (!frame) return send(res, 400, "missing frame");

  const id = randomBytes(8).toString("hex"); // unguessable
  const dir = join(DATA, id);
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, "frame.png"), frame.buffer);
  const videoExt = video?.mime === "video/webm" ? "webm" : "mp4";
  if (video) await writeFile(join(dir, `clip.${videoExt}`), video.buffer);
  await writeFile(
    join(dir, "meta.json"),
    JSON.stringify({
      id,
      createdAt: Date.now(),
      eventName: payload.eventName || "",
      videoExt: video ? videoExt : null,
      uploaded: false, // becomes true once synced to cloud (step 9)
    }),
  );

  const url = `/s/${id}`;
  const lan = lanAddress();
  const lanUrl = lan ? `http://${lan}:${PORT}${url}` : null;
  send(res, 200, JSON.stringify({ id, url, lanUrl }), {
    "Content-Type": "application/json",
  });
}

async function readMeta(id) {
  try {
    return JSON.parse(await readFile(join(DATA, id, "meta.json"), "utf8"));
  } catch {
    return null;
  }
}

async function handleDownloadPage(res, id) {
  const meta = await readMeta(id);
  if (!meta) {
    // Friendly "not ready yet" page instead of a bare 404 (step 9 wording).
    return send(res, 404, renderDownloadPage(null), {
      "Content-Type": MIME[".html"],
    });
  }
  send(res, 200, renderDownloadPage(meta), { "Content-Type": MIME[".html"] });
}

async function handleAsset(res, id, file) {
  // Only allow the known session files.
  if (!/^(frame\.png|clip\.(mp4|webm))$/.test(file)) {
    return send(res, 404, "not found");
  }
  const path = join(DATA, id, file);
  try {
    const info = await stat(path);
    res.writeHead(200, {
      "Content-Type": MIME[extname(file)] || "application/octet-stream",
      "Content-Length": info.size,
      "Content-Disposition": `attachment; filename="${file}"`,
    });
    createReadStream(path).pipe(res);
  } catch {
    send(res, 404, "not found");
  }
}

async function serveStatic(res, urlPath) {
  const rel = normalize(urlPath).replace(/^(\.\.[/\\])+/, "");
  let path = join(DIST, rel === "/" ? "index.html" : rel);
  try {
    const info = await stat(path);
    if (info.isDirectory()) path = join(path, "index.html");
    res.writeHead(200, {
      "Content-Type": MIME[extname(path)] || "application/octet-stream",
    });
    createReadStream(path).pipe(res);
  } catch {
    // SPA fallback.
    try {
      res.writeHead(200, { "Content-Type": MIME[".html"] });
      createReadStream(join(DIST, "index.html")).pipe(res);
    } catch {
      send(res, 404, "build not found — run `npm run build` first");
    }
  }
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, "http://localhost");
    const path = url.pathname;

    if (path === "/api/health") {
      return send(res, 200, JSON.stringify({ ok: true }), {
        "Content-Type": "application/json",
      });
    }
    if (path === "/api/session" && req.method === "POST") {
      return await handleCreateSession(req, res);
    }
    const dl = /^\/s\/([a-f0-9]{16})$/.exec(path);
    if (dl) return await handleDownloadPage(res, dl[1]);
    const asset = /^\/r\/([a-f0-9]{16})\/([\w.]+)$/.exec(path);
    if (asset) return await handleAsset(res, asset[1], asset[2]);

    return await serveStatic(res, path);
  } catch (e) {
    send(res, 500, "server error");
    console.error(e);
  }
});

server.listen(PORT, () => {
  console.log(`Photobooth server on http://localhost:${PORT}`);
  console.log(`Data dir: ${DATA}`);
});

// Exported for the admin/maintenance tooling (manual purge — step 10).
export async function listSessions() {
  const entries = await readdir(DATA, { withFileTypes: true });
  return entries.filter((e) => e.isDirectory()).map((e) => e.name);
}
export async function deleteSession(id) {
  if (!/^[a-f0-9]{16}$/.test(id)) return;
  await rm(join(DATA, id), { recursive: true, force: true });
}
