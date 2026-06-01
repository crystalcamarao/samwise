/**
 * Persisted operator settings (localStorage). Edited in the admin panel and
 * read across the flow: event name/theme/logo for compositing, camera id for
 * capture, print intensity/contrast for the thermal output, storage warn level.
 */

export interface Settings {
  eventName: string;
  /** Footer date; defaults to today but editable. */
  date: string;
  /** Admin PIN gating the hidden panel. */
  pin: string;
  themeId: string;
  /** Thermal print darkness, 0–255. */
  printIntensity: number;
  /** Contrast boost applied before dithering, ~0.8–1.6. */
  thermalContrast: number;
  /** Preferred camera deviceId, or null for the default front camera. */
  cameraId: string | null;
  /** Logo shown on the welcome screen, as a data URL. */
  logoDataUrl: string | null;
  /** Warn (no auto-delete) when local storage exceeds this many GB. */
  storageWarnGb: number;
}

const KEY = "pb_settings_v1";

export function defaultDate(): string {
  return new Date().toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export const DEFAULT_SETTINGS: Settings = {
  eventName: "Our Celebration",
  date: defaultDate(),
  pin: "1234",
  themeId: "classic",
  printIntensity: 110,
  thermalContrast: 1.25,
  cameraId: null,
  logoDataUrl: null,
  storageWarnGb: 10,
};

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(s: Settings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* storage may be full/blocked; settings stay in-memory */
  }
}
