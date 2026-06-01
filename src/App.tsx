import { AppProvider, useApp } from "./state";
import { useIdleReset, useSessionReload, useWakeLock } from "./lib/kiosk";
import { Attract } from "./screens/Attract";
import { Welcome } from "./screens/Welcome";
import { ChooseLayout } from "./screens/ChooseLayout";
import { Capture } from "./screens/Capture";
import { Processing } from "./screens/Processing";
import { Result } from "./screens/Result";
import { Admin } from "./screens/Admin";

function Router() {
  const { screen } = useApp();
  switch (screen) {
    case "attract":
      return <Attract />;
    case "welcome":
      return <Welcome />;
    case "layout":
      return <ChooseLayout />;
    case "capture":
      return <Capture />;
    case "processing":
      return <Processing />;
    case "result":
      return <Result />;
    case "admin":
      return <Admin />;
  }
}

/** Hosts the screens plus the kiosk lifecycle hooks (need the app context). */
function Shell() {
  const { screen, reset } = useApp();
  useWakeLock();
  // Auto-reset to attract on screens where a guest may walk away. Capture and
  // processing run their own flow, and admin is operator-driven, so leave those.
  const idleArmed =
    screen === "welcome" || screen === "layout" || screen === "result";
  useIdleReset(idleArmed, reset);
  useSessionReload(screen);
  return (
    <div className="app">
      <Router />
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <Shell />
    </AppProvider>
  );
}
