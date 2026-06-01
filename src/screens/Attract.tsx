import { useApp } from "../state";

/** Idle loop that draws guests in. Tapping anywhere starts the flow. */
export function Attract() {
  const { go } = useApp();
  return (
    <button className="screen attract" onClick={() => go("welcome")}>
      <div className="attract-emoji" aria-hidden>
        📸
      </div>
      <h1 className="attract-title">Tap to start</h1>
      <p className="attract-sub">Strike a pose &amp; grab a print</p>
    </button>
  );
}
