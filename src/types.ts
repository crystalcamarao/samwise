/** Number of photos a layout captures. Doubles as the layout id. */
export type LayoutId = 1 | 3 | 4 | 6;

export interface Layout {
  /** Stable id == photo count. */
  id: LayoutId;
  /** Photos taken for this layout. */
  count: LayoutId;
  /** Short label shown on the selection card. */
  label: string;
  /** Grid rows / columns used to arrange the photos in the frame. */
  rows: number;
  cols: number;
}

export interface FrameTheme {
  id: string;
  name: string;
  /** CSS font-family stack for header/footer text. */
  fontFamily: string;
  /** Solid background color behind the photos. */
  background: string;
  /** Frame border. */
  border: { color: string; width: number; radius: number };
  /** Gap between photos, in frame pixels. */
  gutter: number;
  /** Outer padding inside the border, in frame pixels. */
  padding: number;
  header: { text: string; color: string; size: number; height: number };
  footer: { text: string; color: string; size: number; height: number };
}

/** A rectangle in frame-pixel coordinates. */
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Geometry produced by the compositor for a given layout + theme + frame size. */
export interface FrameGeometry {
  width: number;
  height: number;
  header: Rect;
  footer: Rect;
  /** One rect per photo, row-major. */
  photos: Rect[];
}

export type ScreenName =
  | "attract"
  | "welcome"
  | "layout"
  | "capture"
  | "processing"
  | "result"
  | "admin";
