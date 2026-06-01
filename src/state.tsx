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
import {
  loadSettings,
  saveSettings,
  type Settings,
} from "./lib/settings";

export type { Settings };

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
  updateSettings: (patch: Partial<Settings>) => void;
  /** Reset the per-guest flow back to the attract screen. */
  reset: () => void;
}

const AppContext = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [screen, setScreen] = useState<ScreenName>("attract");
  const [layoutId, setLayoutId] = useState<LayoutId | null>(null);
  const [photos, setPhotos] = useState<CapturedPhoto[]>([]);
  const [result, setResult] = useState<SessionResult | null>(null);
  const [settings, setSettings] = useState<Settings>(() => loadSettings());

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      saveSettings(next);
      return next;
    });
  }, []);

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
      updateSettings,
      reset,
    }),
    [
      screen,
      layoutId,
      photos,
      result,
      settings,
      go,
      chooseLayout,
      updateSettings,
      reset,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppState {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
