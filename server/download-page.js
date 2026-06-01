/**
 * Renders the guest-facing download page served over the LAN (and, later, from
 * the Cloudflare Worker). Pass `null` to render the "not ready yet" page.
 */
export function renderDownloadPage(meta) {
  if (!meta) {
    return page(
      "Almost ready…",
      `<h1>Your photos are being prepared</h1>
       <p class="muted">Check back in a moment — this link will work shortly.</p>`,
    );
  }

  const video = meta.videoExt
    ? `<video class="media" src="/r/${meta.id}/clip.${meta.videoExt}"
              controls playsinline loop muted autoplay></video>
       <a class="btn" href="/r/${meta.id}/clip.${meta.videoExt}" download>Save video</a>`
    : "";

  return page(
    "Your photos",
    `<h1>${escapeHtml(meta.eventName || "Your photos")}</h1>
     <img class="media" src="/r/${meta.id}/frame.png" alt="Your photo frame" />
     <a class="btn" href="/r/${meta.id}/frame.png" download>Save photo</a>
     ${video}
     <p class="muted ios-note">On iPhone: tap a Save button, then choose
        <b>Download</b> / use the share sheet to add it to Photos.</p>`,
  );
}

function page(title, inner) {
  return `<!doctype html><html lang="en"><head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(title)}</title>
<style>
  :root { color-scheme: dark; }
  body { margin:0; font-family: system-ui, sans-serif; background:#101014;
         color:#f4f4f6; display:flex; flex-direction:column; align-items:center;
         gap:18px; padding:24px; }
  h1 { font-size:1.6rem; margin:8px 0; text-align:center; }
  .media { width:100%; max-width:420px; border-radius:12px;
           box-shadow:0 8px 30px rgba(0,0,0,.5); }
  .btn { display:block; width:100%; max-width:420px; box-sizing:border-box;
         text-align:center; background:#ff5aa0; color:#fff; text-decoration:none;
         font-weight:700; font-size:1.1rem; padding:16px; border-radius:999px; }
  .muted { color:#9a9aa6; font-size:.9rem; text-align:center; max-width:420px; }
</style></head><body>${inner}</body></html>`;
}

function escapeHtml(s) {
  return String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[c],
  );
}
