/**
 * Converts the color frame into a 1-bit image for the 58mm thermal printer
 * (384px print width) using Atkinson dithering, which keeps faces legible far
 * better than a hard threshold. The same output drives both the on-screen print
 * preview and the bytes sent to the printer (step 8).
 */

export const THERMAL_WIDTH = 384;

export interface ThermalResult {
  canvas: HTMLCanvasElement;
  /** Black/white ImageData handed to the printer. */
  imageData: ImageData;
}

export function renderThermal(
  source: CanvasImageSource,
  srcW: number,
  srcH: number,
  opts?: { width?: number; contrast?: number; brightness?: number },
): ThermalResult {
  const width = opts?.width ?? THERMAL_WIDTH;
  const contrast = opts?.contrast ?? 1.15;
  const brightness = opts?.brightness ?? 8;
  const height = Math.max(1, Math.round((srcH / srcW) * width));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(source, 0, 0, width, height);

  const img = ctx.getImageData(0, 0, width, height);
  const d = img.data;

  // Grayscale + contrast/brightness into a float buffer for error diffusion.
  const gray = new Float32Array(width * height);
  for (let i = 0; i < width * height; i++) {
    const r = d[i * 4];
    const g = d[i * 4 + 1];
    const b = d[i * 4 + 2];
    let v = 0.299 * r + 0.587 * g + 0.114 * b;
    v = (v - 128) * contrast + 128 + brightness;
    gray[i] = v;
  }

  atkinsonDither(gray, width, height);

  for (let i = 0; i < width * height; i++) {
    const v = gray[i];
    d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = v;
    d[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return { canvas, imageData: img };
}

/** A small test pattern for the admin "Test print" button. */
export function buildTestImage(label: string, contrast = 1.15): ThermalResult {
  const w = THERMAL_WIDTH;
  const h = 220;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "#000";
  ctx.textAlign = "center";
  ctx.font = "700 34px system-ui, sans-serif";
  ctx.fillText("TEST PRINT", w / 2, 50);
  ctx.font = "500 22px system-ui, sans-serif";
  ctx.fillText(label || "Photobooth", w / 2, 88);
  // Greyscale ramp to judge intensity/contrast.
  for (let x = 0; x < w; x++) {
    const v = Math.round((x / w) * 255);
    ctx.fillStyle = `rgb(${v},${v},${v})`;
    ctx.fillRect(x, 120, 1, 60);
  }
  return renderThermal(canvas, w, h, { contrast });
}

/** In-place Atkinson dither: snaps to 0/255 and diffuses 1/8 of the error. */
export function atkinsonDither(gray: Float32Array, w: number, h: number): void {
  const at = (x: number, y: number, e: number) => {
    if (x < 0 || x >= w || y < 0 || y >= h) return;
    gray[y * w + x] += (e * 1) / 8;
  };
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const old = gray[i];
      const nv = old < 128 ? 0 : 255;
      gray[i] = nv;
      const err = old - nv;
      at(x + 1, y, err);
      at(x + 2, y, err);
      at(x - 1, y + 1, err);
      at(x, y + 1, err);
      at(x + 1, y + 1, err);
      at(x, y + 2, err);
    }
  }
}
