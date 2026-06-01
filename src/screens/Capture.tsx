import { useCallback, useEffect, useRef, useState } from "react";
import { capturePhoto, startCamera, stopStream } from "../lib/camera";
import type { CapturedPhoto } from "../lib/camera";
import { getLayout } from "../config/layouts";
import { useApp } from "../state";

type Phase = "loading" | "ready" | "countdown" | "flash" | "review" | "error";

const COUNTDOWN_FROM = 3;

export function Capture() {
  const { layoutId, go, setPhotos, reset } = useApp();
  const layout = layoutId ? getLayout(layoutId) : null;

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const shotsRef = useRef<CapturedPhoto[]>([]);

  const [phase, setPhase] = useState<Phase>("loading");
  const [count, setCount] = useState(COUNTDOWN_FROM);
  const [taken, setTaken] = useState<CapturedPhoto[]>([]);
  const [error, setError] = useState<string>("");

  // Start / stop the camera with the screen lifecycle.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stream = await startCamera();
        if (cancelled) {
          stopStream(stream);
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
        setPhase("ready");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Camera unavailable");
        setPhase("error");
      }
    })();
    return () => {
      cancelled = true;
      stopStream(streamRef.current);
      streamRef.current = null;
    };
  }, []);

  const total = layout?.count ?? 0;

  const runCountdown = useCallback(() => {
    setPhase("countdown");
    setCount(COUNTDOWN_FROM);
    let n = COUNTDOWN_FROM;
    const tick = window.setInterval(() => {
      n -= 1;
      if (n > 0) {
        setCount(n);
        return;
      }
      window.clearInterval(tick);
      // Flash, capture, then either continue or move to review.
      setPhase("flash");
      window.setTimeout(() => {
        const video = videoRef.current;
        if (video) shotsRef.current.push(capturePhoto(video));
        const shots = [...shotsRef.current];
        setTaken(shots);
        if (shots.length >= total) {
          setPhase("review");
        } else {
          setPhase("ready");
          window.setTimeout(runCountdown, 700);
        }
      }, 150);
    }, 1000);
  }, [total]);

  const start = useCallback(() => {
    shotsRef.current = [];
    setTaken([]);
    runCountdown();
  }, [runCountdown]);

  const retake = useCallback(() => {
    shotsRef.current = [];
    setTaken([]);
    setPhase("ready");
  }, []);

  const accept = useCallback(() => {
    setPhotos(shotsRef.current);
    go("processing");
  }, [go, setPhotos]);

  if (!layout) {
    return (
      <div className="screen">
        <p>No layout selected.</p>
        <button className="btn" onClick={reset}>
          Start over
        </button>
      </div>
    );
  }

  return (
    <div className="screen capture">
      <div className="capture-stage">
        <video
          ref={videoRef}
          className="capture-video"
          playsInline
          muted
        />
        {phase === "flash" && <div className="flash" />}
        {phase === "countdown" && <div className="countdown">{count}</div>}
        {phase === "loading" && <div className="overlay">Starting camera…</div>}
        {phase === "error" && (
          <div className="overlay error">
            <p>{error}</p>
            <button className="btn" onClick={reset}>
              Back
            </button>
          </div>
        )}
      </div>

      <div className="capture-progress">
        {Array.from({ length: total }).map((_, i) => (
          <span
            key={i}
            className={`dot ${i < taken.length ? "done" : ""}`}
            aria-label={`photo ${i + 1}`}
          />
        ))}
      </div>

      <div className="capture-controls">
        {phase === "ready" && taken.length === 0 && (
          <button className="btn btn-primary btn-xl" onClick={start}>
            {total === 1 ? "Take Photo" : `Take ${total} Photos`}
          </button>
        )}
        {phase === "review" && (
          <>
            <button className="btn" onClick={retake}>
              Retake
            </button>
            <button className="btn btn-primary" onClick={accept}>
              Looks good →
            </button>
          </>
        )}
      </div>
    </div>
  );
}
