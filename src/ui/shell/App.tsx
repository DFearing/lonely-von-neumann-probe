import { useState } from "react";
import { Topbar } from "./Topbar";
import { Sidebar, type ViewId } from "./Sidebar";
import { Footer } from "./Footer";
import { Overview } from "../screens/Overview";
import { Probes } from "../screens/Probes";
import { Systems } from "../screens/Systems";
import { Research } from "../screens/Research";

function Screen({ view }: { view: ViewId }) {
  switch (view) {
    case "overview":
      return <Overview />;
    case "fleet":
      return <Probes />;
    case "systems":
      return <Systems />;
    case "research":
      return <Research />;
  }
}

export function App() {
  const [view, setView] = useState<ViewId>("overview");

  return (
    <div className="app-shell">
      <Topbar />
      <Sidebar activeView={view} onNavigate={setView} />
      <main className="main-content">
        <Screen view={view} />
      </main>
      <Footer />
    </div>
  );
}
