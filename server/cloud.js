import { readFile } from "node:fs/promises";
import { join } from "node:path";

/**
 * Tablet → Cloudflare sync. Configured via env:
 *   CLOUD_BASE   e.g. https://receipt-photobooth.<acct>.workers.dev
 *   CLOUD_TOKEN  shared secret matching the Worker's CLOUD_TOKEN
 * When unset, the booth runs LAN-only and these are no-ops.
 */
const CLOUD_BASE = (process.env.CLOUD_BASE || "").replace(/\/$/, "");
const CLOUD_TOKEN = process.env.CLOUD_TOKEN || "";

export function cloudConfigured() {
  return Boolean(CLOUD_BASE && CLOUD_TOKEN);
}

/** Durable URL for a session — known up-front from the stable id. */
export function cloudUrlFor(id) {
  return CLOUD_BASE ? `${CLOUD_BASE}/s/${id}` : null;
}

function fetchTimeout(url, opts, ms) {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), ms);
  return fetch(url, { ...opts, signal: ac.signal }).finally(() =>
    clearTimeout(t),
  );
}

/** Is the cloud reachable right now? Drives the adaptive QR + admin status. */
export async function cloudOnline(timeoutMs = 4000) {
  if (!cloudConfigured()) return false;
  try {
    const r = await fetchTimeout(`${CLOUD_BASE}/health`, {}, timeoutMs);
    return r.ok;
  } catch {
    return false;
  }
}

async function toDataUrl(path, mime) {
  const buf = await readFile(path);
  return `data:${mime};base64,${buf.toString("base64")}`;
}

/** Upload one local session to the cloud. Returns true on success. */
export async function uploadSessionToCloud(dataDir, id, timeoutMs = 20000) {
  if (!cloudConfigured()) return false;
  const dir = join(dataDir, id);
  let meta;
  try {
    meta = JSON.parse(await readFile(join(dir, "meta.json"), "utf8"));
  } catch {
    return false;
  }
  const frame = await toDataUrl(join(dir, "frame.png"), "image/png");
  let video = null;
  if (meta.videoExt) {
    try {
      video = await toDataUrl(
        join(dir, `clip.${meta.videoExt}`),
        meta.videoExt === "webm" ? "video/webm" : "video/mp4",
      );
    } catch {
      /* video optional */
    }
  }
  try {
    const r = await fetchTimeout(
      `${CLOUD_BASE}/api/session/${id}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${CLOUD_TOKEN}`,
        },
        body: JSON.stringify({ frame, video, eventName: meta.eventName || "" }),
      },
      timeoutMs,
    );
    return r.ok;
  } catch {
    return false;
  }
}

export async function deleteSessionFromCloud(id) {
  if (!cloudConfigured()) return;
  try {
    await fetchTimeout(
      `${CLOUD_BASE}/api/session/${id}`,
      { method: "DELETE", headers: { Authorization: `Bearer ${CLOUD_TOKEN}` } },
      8000,
    );
  } catch {
    /* best effort */
  }
}
