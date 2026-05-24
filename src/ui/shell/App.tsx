import { useState } from "react";
import { Brand } from "./Brand";
import { Topbar } from "./Topbar";
import { Sidebar, type ViewId } from "./Sidebar";
import { Footer } from "./Footer";
import { Overview } from "../screens/Overview";
import { Probes } from "../screens/Probes";
import { Systems } from "../screens/Systems";
import { Research } from "../screens/Research";

const FONT_DISPLAY = "'Space Grotesk', system-ui, sans-serif";

const STARFIELD_BACKGROUND =
  "radial-gradient(1px 1px at 12% 18%, #6da4d4 0, transparent 50%)," +
  "radial-gradient(1px 1px at 27% 42%, #8fb8e0 0, transparent 50%)," +
  "radial-gradient(1px 1px at 71% 12%, #5d8aa8 0, transparent 50%)," +
  "radial-gradient(1px 1px at 84% 71%, #9bc3e6 0, transparent 50%)," +
  "radial-gradient(1px 1px at 38% 88%, #6da4d4 0, transparent 50%)," +
  "radial-gradient(1px 1px at 92% 34%, #8fb8e0 0, transparent 50%)," +
  "radial-gradient(1px 1px at 55% 22%, #aac5e0 0, transparent 50%)," +
  "radial-gradient(1px 1px at 14% 72%, #5d8aa8 0, transparent 50%)";

function Screen({
  view,
  onNavigate,
}: {
  view: ViewId;
  onNavigate: (view: ViewId) => void;
}) {
  switch (view) {
    case "overview":
      return <Overview onNavigate={onNavigate} />;
    case "fleet":
      return <Probes />;
    case "systems":
      return <Systems onNavigate={onNavigate} />;
    case "research":
      return <Research />;
  }
}

export function App() {
  const [view, setView] = useState<ViewId>("overview");

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background:
          "radial-gradient(ellipse at top, #0a1a30 0%, #050913 70%)",
        color: "#d6e8f5",
        fontFamily: FONT_DISPLAY,
        display: "grid",
        gridTemplateColumns: "200px 1fr",
        gridTemplateRows: "64px 1fr 130px",
        gridTemplateAreas:
          '"brand topbar" "sidebar main" "sidebar footer"',
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: STARFIELD_BACKGROUND,
          opacity: 0.5,
          pointerEvents: "none",
        }}
      />

      <Brand onNavigate={setView} />
      <Topbar />
      <Sidebar activeView={view} onNavigate={setView} />

      <div
        style={{
          gridArea: "main",
          padding: "20px 24px",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          minHeight: 0,
        }}
      >
        <Screen view={view} onNavigate={setView} />
      </div>

      <Footer onNavigate={setView} />
    </div>
  );
}
