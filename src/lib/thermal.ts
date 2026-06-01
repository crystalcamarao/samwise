/**
 * Builds the 1-bit image for the 58mm thermal printer (384px print width).
 *
 * The receipt is composed *natively* at 384px (not downscaled from the color
 * frame) so text stays crisp: pure-black text/borders on white survive Atkinson
 * dithering without becoming a grey dot pattern, while photos are dithered for
 * tone. Downscaling a 1080px frame instead blurred edges into greys and made
 * small text unreadable.
 */
import type { FrameTheme, Layout } from "../types";
import { placeholderPhoto, renderFrame } from "./compositor";

export const THERMAL_WIDTH = 384;
const REF_WIDTH = 1080; // width the themes are authored against

export interface ThermalResult {
  canvas: HTMLCanvasElement;
  /** Black/white ImageData handed to the printer. */
  imageData: ImageData;
}

/** Dither an existing canvas to pure black/white in place; returns its pixels. */
function ditherCanvas(
  canvas: HTMLCanvasElement,
  contrast: number,
  brightness: number,
): ImageData {
  const { width, height } = canvas;
  const ctx = canvas.getContext("2d")!;
  const img = ctx.getImageData(0, 0, width, height);
  const d = img.data;

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
  return img;
}

/** Dither an arbitrary image source (used by the test print). */
export function renderThermal(
  source: CanvasImageSource,
  srcW: number,
  srcH: number,
  opts?: { width?: number; contrast?: number; brightness?: number },
): ThermalResult {
  const width = opts?.width ?? THERMAL_WIDTH;
  const height = Math.max(1, Math.round((srcH / srcW) * width));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.getContext("2d")!.drawImage(source, 0, 0, width, height);
  const imageData = ditherCanvas(canvas, opts?.contrast ?? 1.25, opts?.brightness ?? 8);
  return { canvas, imageData };
}

/**
 * A thermal-optimized variant of a theme: scaled to 384px with pure-black
 * text/borders on a white background, and a minimum legible footer/header size.
 */
function thermalizeTheme(theme: FrameTheme): FrameTheme {
  const s = THERMAL_WIDTH / REF_WIDTH;
  const hasHeader = theme.header.height > 0 && theme.header.text.length > 0;
  const hasFooter = theme.footer.height > 0 && theme.footer.text.length > 0;
  return {
    ...theme,
    background: "#ffffff",
    border: {
      color: "#000000",
      width: Math.max(2, Math.round(theme.border.width * s)),
      radius: Math.max(2, Math.round(theme.border.radius * s)),
    },
    gutter: Math.max(3, Math.round(theme.gutter * s)),
    padding: Math.max(6, Math.round(theme.padding * s)),
    header: hasHeader
      ? {
          ...theme.header,
          color: "#000000",
          size: Math.max(26, Math.round(theme.header.size * s)),
          height: Math.max(34, Math.round(theme.header.height * s)),
        }
      : theme.header,
    footer: hasFooter
      ? {
          ...theme.footer,
          color: "#000000",
          size: Math.max(22, Math.round(theme.footer.size * s)),
          height: Math.max(30, Math.round(theme.footer.height * s)),
        }
      : theme.footer,
  };
}

/** Compose the receipt natively at 384px, then dither for printing. */
export function renderThermalFrame(
  photos: { source: CanvasImageSource; width: number; height: number }[],
  layout: Layout,
  theme: FrameTheme,
  vars: { eventName: string; date: string },
  opts?: { contrast?: number; brightness?: number },
): ThermalResult {
  const canvas = document.createElement("canvas");
  canvas.width = THERMAL_WIDTH;
  renderFrame(canvas, photos, layout, thermalizeTheme(theme), vars);
  const imageData = ditherCanvas(
    canvas,
    opts?.contrast ?? 1.25,
    opts?.brightness ?? 8,
  );
  return { canvas, imageData };
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

/** Render a sample B&W receipt for a theme — what the admin picker previews. */
export function renderReceiptThumbnail(
  layout: Layout,
  theme: FrameTheme,
  vars: { eventName: string; date: string },
): string {
  const photos = Array.from({ length: layout.count }, () => placeholderPhoto());
  return renderThermalFrame(photos, layout, theme, vars).canvas.toDataURL(
    "image/png",
  );
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
