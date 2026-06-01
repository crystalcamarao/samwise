/**
 * Off-main-thread MP4 encoder. Receives transferred ImageBitmaps, encodes an
 * H.264 slideshow with WebCodecs + mp4-muxer on an OffscreenCanvas, and posts
 * back the MP4 ArrayBuffer. Keeps the UI responsive on low-end tablets.
 */
import { Muxer, ArrayBufferTarget } from "mp4-muxer";

interface EncodeMsg {
  bitmaps: ImageBitmap[];
  width: number;
  height: number;
  fps: number;
  holdMs: number;
}

const ws: any = self;

ws.onmessage = async (e: MessageEvent<EncodeMsg>) => {
  const { bitmaps, width, height, fps, holdMs } = e.data;
  try {
    const buffer = await encode(bitmaps, width, height, fps, holdMs);
    ws.postMessage({ ok: true, buffer }, [buffer]);
  } catch (err) {
    ws.postMessage({ ok: false, error: String(err) });
  } finally {
    bitmaps.forEach((b) => b.close());
  }
};

async function encode(
  bitmaps: ImageBitmap[],
  width: number,
  height: number,
  fps: number,
  holdMs: number,
): Promise<ArrayBuffer> {
  const VE = ws.VideoEncoder;
  const VF = ws.VideoFrame;
  if (!VE || !VF) throw new Error("WebCodecs unavailable in worker");

  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext("2d") as OffscreenCanvasRenderingContext2D;

  const muxer = new Muxer({
    target: new ArrayBufferTarget(),
    video: { codec: "avc", width, height },
    fastStart: "in-memory",
  });
  const encoder = new VE({
    output: (chunk: any, meta: any) => muxer.addVideoChunk(chunk, meta),
    error: (err: any) => {
      throw err;
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
  const single = bitmaps.length === 1;
  let ts = 0;

  for (const bmp of bitmaps) {
    for (let f = 0; f < framesPerPhoto; f++) {
      const zoom = single ? 1 + (0.12 * f) / framesPerPhoto : 1;
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, width, height);
      const base = Math.max(width / bmp.width, height / bmp.height) * zoom;
      const dw = bmp.width * base;
      const dh = bmp.height * base;
      ctx.drawImage(bmp, (width - dw) / 2, (height - dh) / 2, dw, dh);
      const frame = new VF(canvas, { timestamp: ts });
      encoder.encode(frame, { keyFrame: f === 0 });
      frame.close();
      ts += frameDurUs;
    }
  }

  await encoder.flush();
  muxer.finalize();
  return (muxer.target as ArrayBufferTarget).buffer;
}
