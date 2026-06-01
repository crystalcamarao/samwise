import { useApp } from "../state";

/**
 * Step 1–4 placeholder result: shows the composited frame. The adaptive QR
 * (step 9) and print preview / reprint / copies (step 7) land here next.
 */
export function Result() {
  const { frameUrl, reset } = useApp();
  return (
    <div className="screen result">
      <div className="result-preview">
        {frameUrl ? (
          <img className="frame-img" src={frameUrl} alt="Your photo frame" />
        ) : (
          <p>No photo.</p>
        )}
      </div>
      <div className="result-actions">
        <div className="placeholder-card">QR &amp; print coming next</div>
        <button className="btn btn-primary" onClick={reset}>
          Done
        </button>
      </div>
    </div>
  );
}
