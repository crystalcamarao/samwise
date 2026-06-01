import type { Layout, LayoutId } from "../types";

/** The four selectable layouts. `id` is the photo count. */
export const LAYOUTS: Record<LayoutId, Layout> = {
  1: { id: 1, count: 1, label: "Single", rows: 1, cols: 1 },
  3: { id: 3, count: 3, label: "Strip", rows: 3, cols: 1 },
  4: { id: 4, count: 4, label: "Grid", rows: 2, cols: 2 },
  6: { id: 6, count: 6, label: "Grid", rows: 3, cols: 2 },
};

export const LAYOUT_ORDER: LayoutId[] = [1, 3, 4, 6];

export function getLayout(id: LayoutId): Layout {
  return LAYOUTS[id];
}
