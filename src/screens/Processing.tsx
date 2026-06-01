import { useEffect, useRef, useState } from "react";
import { renderFrame } from "../lib/compositor";
import { renderThermalFrame } from "../lib/thermal";
import { encodeSlideshowSmart } from "../lib/video";
import { uploadSession } from "../lib/upload";
import { getTheme } from "../config/templates";
import { getLayout } from "../config/layouts";
import { useApp } from "../state";

/**
 * Pipeline for one session: composite the color frame, render the thermal
 * version, encode the MP4, and upload (best-effort) to get the share URL.
 */
export function Processing() {
  const { layoutId, photos, settings, setResult, go, reset } = useApp();
  const ran = useRef(false);
  const [status, setStatus] = useState("Building your photo…");

  useEffect(() => {
    if (ran.current) return; // guard StrictMode double-invoke
    ran.current = true;

    if (!layoutId || photos.length === 0) {
      reset();
      return;
    }

    (async () => {
      try {
        const sources = photos.map((p) => ({
          source: p.canvas,
          width: p.width,
          height: p.height,
        }));

        const frameCanvas = document.createElement("canvas");
        frameCanvas.width = 1080;
        renderFrame(
          frameCanvas,
          sources,
          getLayout(layoutId),
          getTheme(settings.themeId),
          { eventName: settings.eventName, date: settings.date },
        );
        const frameUrl = frameCanvas.toDataURL("image/png");

        const thermal = renderThermalFrame(
          sources,
          getLayout(layoutId),
          getTheme(settings.themeId),
          { eventName: settings.eventName, date: settings.date },
          { contrast: settings.thermalContrast },
        );
        const thermalUrl = thermal.canvas.toDataURL("image/png");

        setStatus("Creating your video…");
        let video = null;
        try {
          video = await encodeSlideshowSmart(sources);
        } catch {
          video = null; // print + photo still work without it
        }

        setStatus("Saving…");
        const uploaded = await uploadSession(frameUrl, video, settings.eventName);

        setResult({
          frameUrl,
          thermalUrl,
          thermalImage: thermal.imageData,
          share: {
            lanUrl: uploaded?.lanUrl ?? null,
            cloudUrl: uploaded?.cloudUrl ?? null,
            uploaded: uploaded?.uploaded ?? false,
          },
        });
        go("result");
      } catch {
        reset();
      }
    })();
  }, [layoutId, photos, settings, setResult, go, reset]);

  return (
    <div className="screen processing">
      <div className="spinner" />
      <p>{status}</p>
    </div>
  );
}
