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

/** Fill `{eventName}` / `{date}` placeholders from runtime settings. */
export function resolveText(
  template: string,
  vars: { eventName: string; date: string },
): string {
  return template
    .replace(/\{eventName\}/g, vars.eventName)
    .replace(/\{date\}/g, vars.date);
}
