import { describe, expect, it } from "vitest";
import {
  DEFAULT_THEME,
  getTheme,
  resolveText,
  THEME_ORDER,
  THEMES,
} from "../src/config/templates";

describe("templates", () => {
  it("fills event name and date placeholders", () => {
    const out = resolveText("{eventName} — {date}", {
      eventName: "Birthday",
      date: "June 1, 2026",
    });
    expect(out).toBe("Birthday — June 1, 2026");
  });

  it("replaces repeated placeholders", () => {
    const out = resolveText("{eventName} {eventName}", {
      eventName: "Hi",
      date: "x",
    });
    expect(out).toBe("Hi Hi");
  });

  it("getTheme returns a known theme and falls back to classic", () => {
    expect(getTheme("party").id).toBe("party");
    expect(getTheme("does-not-exist")).toBe(DEFAULT_THEME);
  });

  it("every ordered theme exists", () => {
    for (const id of THEME_ORDER) expect(THEMES[id]).toBeDefined();
  });
});
