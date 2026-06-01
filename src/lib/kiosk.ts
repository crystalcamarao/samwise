import { useEffect, useRef } from "react";

/**
 * Hold a screen wake lock so the tablet never sleeps mid-event, re-acquiring it
 * whenever the page becomes visible again (the lock is dropped on tab-hide).
 */
export function useWakeLock(): void {
  useEffect(() => {
    let lock: any = null;
    const request = async () => {
      try {
        lock = await (navigator as any).wakeLock?.request("screen");
      } catch {
        /* denied or unsupported */
      }
    };
    request();
    const onVisible = () => {
      if (document.visibilityState === "visible") request();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      lock?.release?.().catch(() => {});
    };
  }, []);
}

/**
 * Reset to the attract screen after `timeoutMs` of no interaction, so the booth
 * is ready for the next guest. Only armed on the screens passed via `active`.
 */
export function useIdleReset(
  active: boolean,
  onIdle: () => void,
  timeoutMs = 90_000,
): void {
  useEffect(() => {
    if (!active) return;
    let timer = window.setTimeout(onIdle, timeoutMs);
    const bump = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(onIdle, timeoutMs);
    };
    const events = ["pointerdown", "keydown", "touchstart"];
    events.forEach((e) => window.addEventListener(e, bump, { passive: true }));
    return () => {
      window.clearTimeout(timer);
      events.forEach((e) => window.removeEventListener(e, bump));
    };
  }, [active, onIdle, timeoutMs]);
}

/**
 * Reload the page once it lands back on the attract screen after a number of
 * completed sessions, flushing any accumulated memory for all-day stability.
 */
export function useSessionReload(
  screen: string,
  reloadEvery = 40,
): void {
  const completed = useRef(0);
  const prev = useRef(screen);
  useEffect(() => {
    if (screen === "result" && prev.current !== "result") completed.current++;
    if (screen === "attract" && completed.current >= reloadEvery) {
      location.reload();
    }
    prev.current = screen;
  }, [screen, reloadEvery]);
}
