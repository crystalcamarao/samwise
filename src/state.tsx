import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { LayoutId, ScreenName } from "./types";
import type { CapturedPhoto } from "./lib/camera";

export interface Settings {
  eventName: string;
  /** Display date string, e.g. "June 1, 2026". */
  date: string;
}

/** Where a guest can fetch their photos, for the adaptive QR. */
export interface ShareInfo {
  /** Instant on-site download over the booth LAN/hotspot. */
  lanUrl: string | null;
  /** Durable cloud URL — works during and after the event. */
  cloudUrl: string | null;
  /** Whether the cloud copy is already live. */
  uploaded: boolean;
}

/** Everything Processing produces for the Result screen. */
export interface SessionResult {
  /** Composited color frame as a PNG data URL. */
  frameUrl: string;
  /** 1-bit thermal preview as a PNG data URL. */
  thermalUrl: string;
  /** Black/white pixels for the printer. */
  thermalImage: ImageData;
  share: ShareInfo;
}

interface AppState {
  screen: ScreenName;
  layoutId: LayoutId | null;
  photos: CapturedPhoto[];
  result: SessionResult | null;
  settings: Settings;
  go: (screen: ScreenName) => void;
  chooseLayout: (id: LayoutId) => void;
  setPhotos: (photos: CapturedPhoto[]) => void;
  setResult: (result: SessionResult | null) => void;
  /** Reset the per-guest flow back to the attract screen. */
  reset: () => void;
}

const AppContext = createContext<AppState | null>(null);

function defaultDate(): string {
  return new Date().toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [screen, setScreen] = useState<ScreenName>("attract");
  const [layoutId, setLayoutId] = useState<LayoutId | null>(null);
  const [photos, setPhotos] = useState<CapturedPhoto[]>([]);
  const [result, setResult] = useState<SessionResult | null>(null);
  const [settings] = useState<Settings>({
    eventName: "Our Celebration",
    date: defaultDate(),
  });

  const go = useCallback((s: ScreenName) => setScreen(s), []);

  const chooseLayout = useCallback((id: LayoutId) => {
    setLayoutId(id);
    setPhotos([]);
    setScreen("capture");
  }, []);

  const reset = useCallback(() => {
    setLayoutId(null);
    setPhotos([]);
    setResult(null);
    setScreen("attract");
  }, []);

  const value = useMemo<AppState>(
    () => ({
      screen,
      layoutId,
      photos,
      result,
      settings,
      go,
      chooseLayout,
      setPhotos,
      setResult,
      reset,
    }),
    [screen, layoutId, photos, result, settings, go, chooseLayout, reset],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppState {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
