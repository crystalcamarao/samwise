import { useRef } from "react";
import { useApp } from "../state";

/** Logo + Get Started. Long-pressing the logo opens the admin panel (PIN). */
export function Welcome() {
  const { go, settings } = useApp();
  const timer = useRef<number | null>(null);

  const startHold = () => {
    timer.current = window.setTimeout(() => {
      const entry = window.prompt("Admin PIN");
      if (entry !== null && entry === settings.pin) go("admin");
      else if (entry !== null) window.alert("Incorrect PIN");
    }, 1200);
  };
  const cancelHold = () => {
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = null;
  };

  return (
    <div className="screen welcome">
      <div
        className="logo"
        onPointerDown={startHold}
        onPointerUp={cancelHold}
        onPointerLeave={cancelHold}
        aria-hidden
      >
        {settings.logoDataUrl ? (
          <img className="logo-img" src={settings.logoDataUrl} alt="" />
        ) : (
          "✦"
        )}
      </div>
      <h1 className="welcome-title">{settings.eventName}</h1>
      <button className="btn btn-primary btn-xl" onClick={() => go("layout")}>
        Get Started
      </button>
    </div>
  );
}
