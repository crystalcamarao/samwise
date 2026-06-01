import { renderDownloadPage } from "../../server/download-page.js";

/**
 * Cloudflare Worker: durable cloud store for guest downloads (R2-backed).
 * The tablet PUTs each session here (authenticated) using the same stable id
 * it generated locally, so the durable URL `/s/<id>` is known up-front and
 * keeps working from anywhere, during and after the event.
 */

const MIME = {
  "frame.png": "image/png",
  "clip.mp4": "video/mp4",
  "clip.webm": "video/webm",
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (path === "/health") return json({ ok: true });

    const put = match(path, /^\/api\/session\/([a-f0-9]{16})$/);
    if (put && request.method === "PUT") {
      return authed(request, env, () => createSession(request, env, put[1]));
    }
    if (put && request.method === "DELETE") {
      return authed(request, env, () => deleteSession(env, put[1]));
    }
    if (path === "/api/sessions" && request.method === "GET") {
      return authed(request, env, () => listSessions(env));
    }

    const dl = match(path, /^\/s\/([a-f0-9]{16})$/);
    if (dl) return downloadPage(env, dl[1]);

    const asset = match(path, /^\/r\/([a-f0-9]{16})\/([\w.]+)$/);
    if (asset) return streamAsset(env, asset[1], asset[2]);

    return new Response("not found", { status: 404 });
  },
};

function match(path, re) {
  const m = re.exec(path);
  return m || null;
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function authed(request, env, fn) {
  const auth = request.headers.get("Authorization") || "";
  if (!env.CLOUD_TOKEN || auth !== `Bearer ${env.CLOUD_TOKEN}`) {
    return new Response("unauthorized", { status: 401 });
  }
  return fn();
}

function decodeDataUrl(dataUrl) {
  const m = /^data:([^;]+);base64,(.*)$/s.exec(dataUrl || "");
  if (!m) return null;
  const bin = atob(m[2]);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return { mime: m[1], bytes };
}

async function createSession(request, env, id) {
  let payload;
  try {
    payload = await request.json();
  } catch {
    return new Response("bad request", { status: 400 });
  }
  const frame = decodeDataUrl(payload.frame);
  const video = decodeDataUrl(payload.video);
  if (!frame) return new Response("missing frame", { status: 400 });

  await env.BUCKET.put(`${id}/frame.png`, frame.bytes, {
    httpMetadata: { contentType: "image/png" },
  });
  const videoExt = video?.mime === "video/webm" ? "webm" : "mp4";
  if (video) {
    await env.BUCKET.put(`${id}/clip.${videoExt}`, video.bytes, {
      httpMetadata: { contentType: video.mime },
    });
  }
  const meta = {
    id,
    createdAt: Date.now(),
    eventName: payload.eventName || "",
    videoExt: video ? videoExt : null,
  };
  await env.BUCKET.put(`${id}/meta.json`, JSON.stringify(meta), {
    httpMetadata: { contentType: "application/json" },
  });
  return json({ id, url: `/s/${id}` });
}

async function readMeta(env, id) {
  const obj = await env.BUCKET.get(`${id}/meta.json`);
  if (!obj) return null;
  try {
    return JSON.parse(await obj.text());
  } catch {
    return null;
  }
}

async function downloadPage(env, id) {
  const meta = await readMeta(env, id);
  const html = renderDownloadPage(meta); // null → "being prepared" page
  return new Response(html, {
    status: meta ? 200 : 404,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

async function streamAsset(env, id, file) {
  if (!MIME[file]) return new Response("not found", { status: 404 });
  const obj = await env.BUCKET.get(`${id}/${file}`);
  if (!obj) return new Response("not found", { status: 404 });
  return new Response(obj.body, {
    headers: {
      "Content-Type": MIME[file],
      "Content-Disposition": `attachment; filename="${file}"`,
    },
  });
}

async function deleteSession(env, id) {
  const list = await env.BUCKET.list({ prefix: `${id}/` });
  await Promise.all(list.objects.map((o) => env.BUCKET.delete(o.key)));
  return json({ deleted: id });
}

async function listSessions(env) {
  const list = await env.BUCKET.list({ prefix: "" });
  const ids = new Set();
  for (const o of list.objects) ids.add(o.key.split("/")[0]);
  return json({ sessions: [...ids] });
}
