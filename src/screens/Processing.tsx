import { useEffect, useRef } from "react";
import { renderFrame } from "../lib/compositor";
import { DEFAULT_THEME } from "../config/templates";
import { getLayout } from "../config/layouts";
import { useApp } from "../state";

/**
 * Composites the captured photos into the color frame, then advances to the
 * result. (Step 5 adds MP4 encoding; step 9 adds the cloud upload here.)
 */
export function Processing() {
  const { layoutId, photos, settings, setFrameUrl, go, reset } = useApp();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!layoutId) {
      reset();
      return;
    }
    const canvas = canvasRef.current ?? document.createElement("canvas");
    canvas.width = 1080;
    try {
      renderFrame(
        canvas,
        photos.map((p) => ({
          source: p.canvas,
          width: p.width,
          height: p.height,
        })),
        getLayout(layoutId),
        DEFAULT_THEME,
        { eventName: settings.eventName, date: settings.date },
      );
      setFrameUrl(canvas.toDataURL("image/png"));
      const t = window.setTimeout(() => go("result"), 600);
      return () => window.clearTimeout(t);
    } catch {
      reset();
    }
  }, [layoutId, photos, settings, setFrameUrl, go, reset]);

  return (
    <div className="screen processing">
      <canvas ref={canvasRef} className="hidden-canvas" />
      <div className="spinner" />
      <p>Building your photo…</p>
    </div>
  );
}
