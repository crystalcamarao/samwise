import type { FrameTheme } from "../types";

/**
 * Default frame theme. Step 4 ships one built-in theme; the full template
 * system (step 8, per-event selectable in admin) extends this shape with
 * background images and PNG overlays.
 */
export const DEFAULT_THEME: FrameTheme = {
  id: "classic",
  name: "Classic",
  background: "#ffffff",
  border: { color: "#101014", width: 18, radius: 24 },
  gutter: 16,
  padding: 28,
  header: { text: "{eventName}", color: "#101014", size: 64, height: 110 },
  footer: { text: "{date}", color: "#6b6b76", size: 34, height: 64 },
};

const PARTY_THEME: FrameTheme = {
  id: "party",
  name: "Party",
  background: "#fff0f6",
  border: { color: "#ff5aa0", width: 26, radius: 28 },
  gutter: 18,
  padding: 30,
  header: { text: "{eventName}", color: "#ff2d87", size: 66, height: 116 },
  footer: { text: "{date}", color: "#b84a7e", size: 34, height: 64 },
};

const MINIMAL_THEME: FrameTheme = {
  id: "minimal",
  name: "Minimal",
  background: "#ffffff",
  border: { color: "#ffffff", width: 10, radius: 8 },
  gutter: 10,
  padding: 18,
  header: { text: "", color: "#101014", size: 0, height: 0 },
  footer: { text: "{date}", color: "#9a9aa6", size: 28, height: 52 },
};

const MONO_THEME: FrameTheme = {
  id: "mono",
  name: "Receipt",
  background: "#ffffff",
  border: { color: "#111111", width: 8, radius: 4 },
  gutter: 12,
  padding: 22,
  header: { text: "{eventName}", color: "#111111", size: 52, height: 92 },
  footer: { text: "· {date} ·", color: "#111111", size: 32, height: 60 },
};

const BOLD_THEME: FrameTheme = {
  id: "bold",
  name: "Bold",
  background: "#ffffff",
  border: { color: "#111111", width: 40, radius: 8 },
  gutter: 20,
  padding: 34,
  header: { text: "{eventName}", color: "#111111", size: 78, height: 130 },
  footer: { text: "{date}", color: "#111111", size: 36, height: 66 },
};

const ELEGANT_THEME: FrameTheme = {
  id: "elegant",
  name: "Elegant",
  background: "#faf7f2",
  border: { color: "#2a2622", width: 14, radius: 2 },
  gutter: 18,
  padding: 40,
  header: { text: "{eventName}", color: "#2a2622", size: 60, height: 120 },
  footer: { text: "{date}", color: "#6f675c", size: 30, height: 70 },
};

const CUTE_THEME: FrameTheme = {
  id: "cute",
  name: "Cute",
  background: "#fff7fb",
  border: { color: "#ff7eb6", width: 30, radius: 40 },
  gutter: 18,
  padding: 30,
  header: { text: "♡ {eventName} ♡", color: "#e35d97", size: 60, height: 112 },
  footer: { text: "{date}", color: "#c76b96", size: 32, height: 62 },
};

/** Selectable frame themes (the full template system extends these). */
export const THEMES: Record<string, FrameTheme> = {
  mono: MONO_THEME,
  classic: DEFAULT_THEME,
  minimal: MINIMAL_THEME,
  bold: BOLD_THEME,
  elegant: ELEGANT_THEME,
  party: PARTY_THEME,
  cute: CUTE_THEME,
};

export const THEME_ORDER = [
  "mono",
  "classic",
  "minimal",
  "bold",
  "elegant",
  "party",
  "cute",
];

export function getTheme(id: string): FrameTheme {
  return THEMES[id] ?? DEFAULT_THEME;
}

/** Fill `{eventName}` / `{date}` placeholders from runtime settings. */
export function resolveText(
  template: string,
  vars: { eventName: string; date: string },
): string {
  return template
    .replace(/\{eventName\}/g, vars.eventName)
    .replace(/\{date\}/g, vars.date);
}
