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

/** Selectable frame themes (the full template system extends these). */
export const THEMES: Record<string, FrameTheme> = {
  classic: DEFAULT_THEME,
  party: PARTY_THEME,
  minimal: MINIMAL_THEME,
};

export const THEME_ORDER = ["classic", "party", "minimal"];

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
