import { Muxer, ArrayBufferTarget } from "mp4-muxer";

/**
 * Encodes the captured photos into a short slideshow clip. Prefers WebCodecs →
 * MP4 (H.264) for best cross-phone playback (iOS included); falls back to
 * MediaRecorder → WebM where WebCodecs is unavailable.
 *
 * NOTE: encoding runs on the main thread for now. Step 11 moves it to a Web
 * Worker so the UI stays responsive on low-end tablets.
 */

export interface PhotoSource {
  source: CanvasImageSource;
  width: number;
  height: number;
}

export interface VideoResult {
  blob: Blob;
  ext: "mp4" | "webm";
  mimeType: string;
}

interface EncodeOpts {
  width: number;
  height: number;
  fps: number;
  holdMs: number;
}

const DEFAULTS: EncodeOpts = { width: 640, height: 480, fps: 15, holdMs: 1200 };

export async function encodeSlideshow(
  photos: PhotoSource[],
  partial?: Partial<EncodeOpts>,
): Promise<VideoResult> {
  const opts = { ...DEFAULTS, ...partial };
  if (typeof (globalThis as any).VideoEncoder !== "undefined") {
    try {
      return await encodeMp4(photos, opts);
    } catch {
      // Fall through to the WebM path on any encoder/config failure.
    }
  }
  return encodeWebm(photos, opts);
}

/** Draw a photo cover-cropped into the frame, with an optional zoom factor. */
function drawPhoto(
  ctx: CanvasRenderingContext2D,
  p: PhotoSource,
  w: number,
  h: number,
  zoom: number,
): void {
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, w, h);
  const base = Math.max(w / p.width, h / p.height);
  const scale = base * zoom;
  const dw = p.width * scale;
  const dh = p.height * scale;
  ctx.drawImage(p.source, (w - dw) / 2, (h - dh) / 2, dw, dh);
}

async function encodeMp4(
  photos: PhotoSource[],
  opts: EncodeOpts,
): Promise<VideoResult> {
  const { width, height, fps, holdMs } = opts;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;

  const muxer = new Muxer({
    target: new ArrayBufferTarget(),
    video: { codec: "avc", width, height },
    fastStart: "in-memory",
  });

  const VE = (globalThis as any).VideoEncoder;
  const VF = (globalThis as any).VideoFrame;
  const encoder = new VE({
    output: (chunk: any, meta: any) => muxer.addVideoChunk(chunk, meta),
    error: (e: any) => {
      throw e;
    },
  });
  encoder.configure({
    codec: "avc1.42001f",
    width,
    height,
    bitrate: 2_000_000,
    framerate: fps,
  });

  const framesPerPhoto = Math.max(1, Math.round((fps * holdMs) / 1000));
  const frameDurUs = Math.round(1_000_000 / fps);
  const single = photos.length === 1;
  let ts = 0;

  for (const p of photos) {
    for (let f = 0; f < framesPerPhoto; f++) {
      // Single-photo layouts get a slow Ken Burns zoom; grids hold still.
      const zoom = single ? 1 + (0.12 * f) / framesPerPhoto : 1;
      drawPhoto(ctx, p, width, height, zoom);
      const frame = new VF(canvas, { timestamp: ts });
      encoder.encode(frame, { keyFrame: f === 0 });
      frame.close();
      ts += frameDurUs;
    }
  }

  await encoder.flush();
  muxer.finalize();
  const { buffer } = muxer.target as ArrayBufferTarget;
  return {
    blob: new Blob([buffer], { type: "video/mp4" }),
    ext: "mp4",
    mimeType: "video/mp4",
  };
}

async function encodeWebm(
  photos: PhotoSource[],
  opts: EncodeOpts,
): Promise<VideoResult> {
  const { width, height, fps, holdMs } = opts;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;

  const stream = canvas.captureStream(fps);
  const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
    ? "video/webm;codecs=vp9"
    : "video/webm";
  const recorder = new MediaRecorder(stream, { mimeType });
  const chunks: BlobPart[] = [];
  recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);

  const done = new Promise<void>((resolve) => {
    recorder.onstop = () => resolve();
  });

  recorder.start();
  const single = photos.length === 1;
  for (const p of photos) {
    if (single) {
      const steps = 12;
      for (let i = 0; i < steps; i++) {
        drawPhoto(ctx, p, width, height, 1 + (0.12 * i) / steps);
        await sleep(holdMs / steps);
      }
    } else {
      drawPhoto(ctx, p, width, height, 1);
      await sleep(holdMs);
    }
  }
  recorder.stop();
  await done;

  return {
    blob: new Blob(chunks, { type: "video/webm" }),
    ext: "webm",
    mimeType: "video/webm",
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
