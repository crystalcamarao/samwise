import { describe, expect, it } from "vitest";
import { computeGeometry, PHOTO_ASPECT } from "../src/lib/compositor";
import { LAYOUTS } from "../src/config/layouts";
import { DEFAULT_THEME } from "../src/config/templates";
import type { LayoutId } from "../src/types";

const WIDTH = 1080;

describe("computeGeometry", () => {
  it("produces one rect per photo for every layout", () => {
    (Object.keys(LAYOUTS) as unknown as LayoutId[]).forEach((id) => {
      const layout = LAYOUTS[Number(id) as LayoutId];
      const geo = computeGeometry(layout, DEFAULT_THEME, WIDTH);
      expect(geo.photos).toHaveLength(layout.count);
      expect(geo.width).toBe(WIDTH);
      expect(geo.height).toBeGreaterThan(0);
    });
  });

  it("keeps all photo cells inside the frame width", () => {
    const geo = computeGeometry(LAYOUTS[6], DEFAULT_THEME, WIDTH);
    for (const r of geo.photos) {
      expect(r.x).toBeGreaterThanOrEqual(DEFAULT_THEME.border.width);
      expect(r.x + r.w).toBeLessThanOrEqual(WIDTH - DEFAULT_THEME.border.width);
    }
  });

  it("respects the photo aspect ratio of each cell", () => {
    const geo = computeGeometry(LAYOUTS[4], DEFAULT_THEME, WIDTH);
    const r = geo.photos[0];
    expect(r.w / r.h).toBeCloseTo(PHOTO_ASPECT, 5);
  });

  it("places footer below the last photo row", () => {
    const geo = computeGeometry(LAYOUTS[3], DEFAULT_THEME, WIDTH);
    const lastPhoto = geo.photos[geo.photos.length - 1];
    expect(geo.footer.y).toBeGreaterThanOrEqual(lastPhoto.y + lastPhoto.h);
  });

  it("arranges grid columns left-to-right, top-to-bottom", () => {
    const geo = computeGeometry(LAYOUTS[4], DEFAULT_THEME, WIDTH);
    // 2x2: photo[0] top-left, photo[1] top-right, photo[2] bottom-left.
    expect(geo.photos[1].x).toBeGreaterThan(geo.photos[0].x);
    expect(geo.photos[1].y).toBeCloseTo(geo.photos[0].y, 5);
    expect(geo.photos[2].y).toBeGreaterThan(geo.photos[0].y);
  });
});
