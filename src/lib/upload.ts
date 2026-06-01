import type { VideoResult } from "./video";

export interface UploadResult {
  id: string;
  /** Relative path on the local server. */
  url: string;
  /** Absolute LAN/hotspot URL for the guest QR, when available. */
  lanUrl: string | null;
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}

/**
 * Upload the session to the local server. Best-effort: returns null on any
 * failure (e.g. running the app without the server in dev). The retry queue and
 * cloud sync land in step 9.
 */
export async function uploadSession(
  frameDataUrl: string,
  video: VideoResult | null,
  eventName: string,
): Promise<UploadResult | null> {
  try {
    const body = JSON.stringify({
      frame: frameDataUrl,
      eventName,
      video: video ? await blobToDataUrl(video.blob) : null,
    });
    const res = await fetch("/api/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });
    if (!res.ok) return null;
    return (await res.json()) as UploadResult;
  } catch {
    return null;
  }
}
