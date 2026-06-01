import { beforeEach, describe, expect, it } from "vitest";
import {
  DEFAULT_SETTINGS,
  loadSettings,
  saveSettings,
} from "../src/lib/settings";

// Minimal localStorage stub for the node test environment.
function installStorage() {
  const map = new Map<string, string>();
  (globalThis as any).localStorage = {
    getItem: (k: string) => (map.has(k) ? map.get(k)! : null),
    setItem: (k: string, v: string) => map.set(k, v),
    removeItem: (k: string) => map.delete(k),
    clear: () => map.clear(),
  };
}

describe("settings persistence", () => {
  beforeEach(() => installStorage());

  it("returns defaults when nothing is stored", () => {
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
  });

  it("merges a stored partial over defaults (forward-compatible)", () => {
    localStorage.setItem(
      "pb_settings_v1",
      JSON.stringify({ eventName: "Wedding", printIntensity: 200 }),
    );
    const s = loadSettings();
    expect(s.eventName).toBe("Wedding");
    expect(s.printIntensity).toBe(200);
    // Unspecified fields fall back to defaults.
    expect(s.themeId).toBe(DEFAULT_SETTINGS.themeId);
    expect(s.storageWarnGb).toBe(DEFAULT_SETTINGS.storageWarnGb);
  });

  it("falls back to defaults on corrupt JSON", () => {
    localStorage.setItem("pb_settings_v1", "{not json");
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
  });

  it("round-trips through save/load", () => {
    saveSettings({ ...DEFAULT_SETTINGS, eventName: "Gala", themeId: "party" });
    const s = loadSettings();
    expect(s.eventName).toBe("Gala");
    expect(s.themeId).toBe("party");
  });
});
