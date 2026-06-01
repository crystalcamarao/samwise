import type { FrameGeometry, FrameTheme, Layout, Rect } from "../types";
import { resolveText } from "../config/templates";

/** Aspect ratio (width / height) each photo cell is cropped to. */
export const PHOTO_ASPECT = 4 / 3;

/**
 * Compute the frame geometry for a layout at a given pixel width. Pure and
 * deterministic so it can be unit-tested without a canvas. Height is derived
 * from the content; callers don't pass a height.
 */
export function computeGeometry(
  layout: Layout,
  theme: FrameTheme,
  width: number,
): FrameGeometry {
  const inset = theme.border.width + theme.padding;
  const contentX = inset;
  const contentW = width - inset * 2;

  const gutterX = theme.gutter * (layout.cols - 1);
  const cellW = (contentW - gutterX) / layout.cols;
  const cellH = cellW / PHOTO_ASPECT;

  const hasHeader = theme.header.text.length > 0 && theme.header.height > 0;
  const hasFooter = theme.footer.text.length > 0 && theme.footer.height > 0;

  const topY = inset;
  const headerH = hasHeader ? theme.header.height : 0;
  const header: Rect = { x: contentX, y: topY, w: contentW, h: headerH };

  const gridTop = topY + headerH + (hasHeader ? theme.gutter : 0);
  const photos: Rect[] = [];
  for (let i = 0; i < layout.count; i++) {
    const row = Math.floor(i / layout.cols);
    const col = i % layout.cols;
    photos.push({
      x: contentX + col * (cellW + theme.gutter),
      y: gridTop + row * (cellH + theme.gutter),
      w: cellW,
      h: cellH,
    });
  }

  const gridH = cellH * layout.rows + theme.gutter * (layout.rows - 1);
  const footerTop = gridTop + gridH + (hasFooter ? theme.gutter : 0);
  const footerH = hasFooter ? theme.footer.height : 0;
  const footer: Rect = { x: contentX, y: footerTop, w: contentW, h: footerH };

  const height = footerTop + footerH + inset;
  return { width, height, header, footer, photos };
}

/** Draw an image cropped to "cover" the destination rect (center-cropped). */
function drawImageCover(
  ctx: CanvasRenderingContext2D,
  img: CanvasImageSource,
  sw: number,
  sh: number,
  dst: Rect,
): void {
  const scale = Math.max(dst.w / sw, dst.h / sh);
  const dw = sw * scale;
  const dh = sh * scale;
  const dx = dst.x + (dst.w - dw) / 2;
  const dy = dst.y + (dst.h - dh) / 2;
  ctx.save();
  ctx.beginPath();
  ctx.rect(dst.x, dst.y, dst.w, dst.h);
  ctx.clip();
  ctx.drawImage(img, dx, dy, dw, dh);
  ctx.restore();
}

export interface RenderInput {
  width: number;
  height: number;
}

/**
 * Render the color frame for the captured photos onto a canvas. Returns the
 * geometry used. Photos are drawn in order, cover-cropped into their cells.
 */
export function renderFrame(
  canvas: HTMLCanvasElement,
  photos: { source: CanvasImageSource; width: number; height: number }[],
  layout: Layout,
  theme: FrameTheme,
  vars: { eventName: string; date: string },
): FrameGeometry {
  const geo = computeGeometry(layout, theme, canvas.width || 1080);
  canvas.width = geo.width;
  canvas.height = geo.height;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2D context unavailable");

  // Border color fills the whole frame; background sits inside it.
  ctx.fillStyle = theme.border.color;
  ctx.fillRect(0, 0, geo.width, geo.height);
  ctx.fillStyle = theme.background;
  roundedRect(
    ctx,
    theme.border.width,
    theme.border.width,
    geo.width - theme.border.width * 2,
    geo.height - theme.border.width * 2,
    theme.border.radius,
  );
  ctx.fill();

  // Header / footer text.
  ctx.textAlign = "center";
  if (geo.header.h > 0) {
    drawCenteredText(ctx, resolveText(theme.header.text, vars), geo.header, {
      color: theme.header.color,
      size: theme.header.size,
      weight: 700,
    });
  }
  if (geo.footer.h > 0) {
    drawCenteredText(ctx, resolveText(theme.footer.text, vars), geo.footer, {
      color: theme.footer.color,
      size: theme.footer.size,
      weight: 500,
    });
  }

  // Photos.
  geo.photos.forEach((rect, i) => {
    const p = photos[i];
    if (p) drawImageCover(ctx, p.source, p.width, p.height, rect);
  });

  return geo;
}

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function drawCenteredText(
  ctx: CanvasRenderingContext2D,
  text: string,
  rect: Rect,
  font: { color: string; size: number; weight: number },
): void {
  ctx.fillStyle = font.color;
  ctx.font = `${font.weight} ${font.size}px system-ui, sans-serif`;
  ctx.textBaseline = "middle";
  ctx.fillText(text, rect.x + rect.w / 2, rect.y + rect.h / 2, rect.w);
}
