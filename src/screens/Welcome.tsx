import { useApp } from "../state";

/** Logo + Get Started. The logo is a swappable asset. */
export function Welcome() {
  const { go, settings } = useApp();
  return (
    <div className="screen welcome">
      <div className="logo" aria-hidden>
        ✦
      </div>
      <h1 className="welcome-title">{settings.eventName}</h1>
      <button className="btn btn-primary btn-xl" onClick={() => go("layout")}>
        Get Started
      </button>
    </div>
  );
}
