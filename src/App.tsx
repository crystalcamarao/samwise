import { AppProvider, useApp } from "./state";
import { Attract } from "./screens/Attract";
import { Welcome } from "./screens/Welcome";
import { ChooseLayout } from "./screens/ChooseLayout";
import { Capture } from "./screens/Capture";
import { Processing } from "./screens/Processing";
import { Result } from "./screens/Result";

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
  }
}

export default function App() {
  return (
    <AppProvider>
      <div className="app">
        <Router />
      </div>
    </AppProvider>
  );
}
