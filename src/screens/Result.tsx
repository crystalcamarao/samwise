import { useCallback, useEffect, useMemo, useState } from "react";
import { makeQrDataUrl } from "../lib/qr";
import { getPrinter } from "../lib/printer";
import { useApp } from "../state";
import type { ShareInfo } from "../state";

type PrintStatus = "idle" | "printing" | "done" | "error";

/**
 * Decide what to show for downloads, given connectivity and sync state:
 *  - cloud copy live + online → one durable QR (works now and later)
 *  - otherwise, if we have a LAN URL → "save now" QR for the on-site download,
 *    plus a secondary durable QR (lights up once the booth syncs)
 */
function planShare(share: ShareInfo): {
  primary?: { url: string; label: string };
  secondary?: { url: string; label: string };
  message?: string;
} {
  const online = typeof navigator !== "undefined" ? navigator.onLine : true;
  if (share.uploaded && share.cloudUrl && online) {
    return {
      primary: {
        url: share.cloudUrl,
        label: "Scan to download — works now and anytime later",
      },
    };
  }
  if (share.lanUrl) {
    return {
      primary: {
        url: share.lanUrl,
        label: "On the booth Wi-Fi? Scan to save now",
      },
      secondary: share.cloudUrl
        ? {
            url: share.cloudUrl,
            label: "Get it later — online within ~24h",
          }
        : undefined,
    };
  }
  if (share.cloudUrl) {
    return {
      primary: { url: share.cloudUrl, label: "Scan to download your photos" },
      message: "Saving online — your link will work shortly.",
    };
  }
  return { message: "Saving… your download link will appear once online." };
}

export function Result() {
  const { result, settings, reset } = useApp();
  const [primaryQr, setPrimaryQr] = useState<string | null>(null);
  const [secondaryQr, setSecondaryQr] = useState<string | null>(null);
  const [copies, setCopies] = useState(1);
  const [printStatus, setPrintStatus] = useState<PrintStatus>("idle");

  const plan = useMemo(
    () => (result ? planShare(result.share) : { message: "" }),
    [result],
  );

  useEffect(() => {
    let active = true;
    setPrimaryQr(null);
    setSecondaryQr(null);
    if (plan.primary) {
      makeQrDataUrl(plan.primary.url).then((u) => active && setPrimaryQr(u));
    }
    if (plan.secondary) {
      makeQrDataUrl(plan.secondary.url, 256).then(
        (u) => active && setSecondaryQr(u),
      );
    }
    return () => {
      active = false;
    };
  }, [plan]);

  const doPrint = useCallback(async () => {
    if (!result) return;
    setPrintStatus("printing");
    try {
      await getPrinter().print({
        imageData: result.thermalImage,
        copies,
        intensity: settings.printIntensity,
      });
      setPrintStatus("done");
    } catch {
      setPrintStatus("error");
    }
  }, [result, copies, settings.printIntensity]);

  if (!result) {
    return (
      <div className="screen">
        <p>No photo.</p>
        <button className="btn btn-primary" onClick={reset}>
          Start over
        </button>
      </div>
    );
  }

  const printing = printStatus === "printing";

  return (
    <div className="screen result">
      <div className="result-body">
        <div className="result-top">
          <img
            className="frame-img"
            src={result.frameUrl}
            alt="Your photo frame"
          />
        </div>

        <div className="result-cols">
          <div className="card qr-card">
            <span className="card-title">Download</span>
            {primaryQr ? (
              <>
                <img className="qr" src={primaryQr} alt="Scan to download" />
                <p className="qr-label">{plan.primary?.label}</p>
              </>
            ) : (
              <div className="qr placeholder-card">
                <p>{plan.message ?? "Preparing your download…"}</p>
              </div>
            )}
            {secondaryQr && (
              <div className="qr-secondary">
                <img
                  className="qr qr-sm"
                  src={secondaryQr}
                  alt="Download later"
                />
                <p className="qr-label">{plan.secondary?.label}</p>
              </div>
            )}
          </div>

          <div className="card print-block">
            <span className="card-title">Print</span>
            <div className="thermal-preview">
              <img src={result.thermalUrl} alt="Thermal print preview" />
            </div>

            <div className="copies">
              <span>Copies</span>
              <div className="stepper">
                <button
                  className="btn step"
                  disabled={printing || copies <= 1}
                  onClick={() => setCopies((c) => Math.max(1, c - 1))}
                >
                  −
                </button>
                <span className="copies-n">{copies}</span>
                <button
                  className="btn step"
                  disabled={printing || copies >= 5}
                  onClick={() => setCopies((c) => Math.min(5, c + 1))}
                >
                  +
                </button>
              </div>
            </div>

            <button
              className="btn btn-primary"
              disabled={printing}
              onClick={doPrint}
            >
              {printStatus === "idle" && "Print"}
              {printStatus === "printing" && "Printing…"}
              {printStatus === "done" && "Reprint"}
              {printStatus === "error" && "Retry print"}
            </button>
            {printStatus === "error" && (
              <p className="print-error">
                Print failed — check paper. Your download still works.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Always-visible footer. Done never depends on printing — printing is
          optional, and a guest can finish at any time. */}
      <div className="result-footer">
        <button className="btn btn-primary done-btn" onClick={reset}>
          Done
        </button>
        <span className="footer-hint">Printing is optional — tap Done to finish</span>
      </div>
    </div>
  );
}
