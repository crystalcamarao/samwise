import { useCallback, useEffect, useState } from "react";
import { makeQrDataUrl } from "../lib/qr";
import { getPrinter } from "../lib/printer";
import { useApp } from "../state";

type PrintStatus = "idle" | "printing" | "done" | "error";

export function Result() {
  const { result, reset } = useApp();
  const [qr, setQr] = useState<string | null>(null);
  const [copies, setCopies] = useState(1);
  const [printStatus, setPrintStatus] = useState<PrintStatus>("idle");

  const shareUrl = result?.shareUrl ?? null;

  useEffect(() => {
    let active = true;
    if (shareUrl) {
      makeQrDataUrl(shareUrl).then((u) => active && setQr(u));
    } else {
      setQr(null);
    }
    return () => {
      active = false;
    };
  }, [shareUrl]);

  const doPrint = useCallback(async () => {
    if (!result) return;
    setPrintStatus("printing");
    try {
      await getPrinter().print({ imageData: result.thermalImage, copies });
      setPrintStatus("done");
    } catch {
      setPrintStatus("error");
    }
  }, [result, copies]);

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
      <div className="result-preview">
        <img className="frame-img" src={result.frameUrl} alt="Your photo frame" />
      </div>

      <div className="result-actions">
        <div className="qr-card">
          {qr ? (
            <>
              <img className="qr" src={qr} alt="Scan to download" />
              <p className="qr-label">Scan to download your photo &amp; video</p>
            </>
          ) : (
            <div className="qr placeholder-card">
              <p>
                Saving… your download link will appear once the booth is online.
              </p>
            </div>
          )}
        </div>

        <div className="print-block">
          <div className="thermal-preview">
            <span className="thermal-label">Receipt preview</span>
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
              Print failed — check paper. Your download is still available above.
            </p>
          )}
        </div>

        <button className="btn" disabled={printing} onClick={reset}>
          Done
        </button>
      </div>
    </div>
  );
}
