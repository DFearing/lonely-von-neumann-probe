import { useContext, useEffect, useState } from "react";
import { Brand } from "./Brand";
import { Topbar } from "./Topbar";
import { Sidebar, LVNPGateContext, type ViewId } from "./Sidebar";
import { Footer } from "./Footer";
import { Overview } from "../screens/Overview";
import { Probes } from "../screens/Probes";
import { Systems } from "../screens/Systems";
import { Research } from "../screens/Research";
import { SoundSettings } from "../screens/SoundSettings";
import { useSoundEvents } from "../../audio/use-sound-events";
import { Log } from "../screens/Log";
import { Prestige } from "../screens/Prestige";
import { usePrestige, useGameState, useLoop } from "../context";
import { Printers } from "../screens/Printers";
import { DevAutopilot } from "../screens/DevAutopilot";
import { DEV_MODE } from "../../simulation/dev";

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
  onPrestige,
}: {
  view: ViewId;
  onNavigate: (view: ViewId) => void;
  onPrestige: (() => void) | null;
}) {
  switch (view) {
    case "overview":
      return <Overview onNavigate={onNavigate} />;
    case "printers":
      return <Printers />;
    case "fleet":
      return <Probes />;
    case "systems":
      return <Systems onNavigate={onNavigate} />;
    case "research":
      return <Research />;
    case "log":
      return <Log />;
    case "prestige":
      if (DEV_MODE) return <Overview onNavigate={onNavigate} />;
      return <Prestige onBeginNewMission={onPrestige ?? (() => {})} />;
  }
}

export function App() {
  const [view, setView] = useState<ViewId>("overview");
  const [showSoundSettings, setShowSoundSettings] = useState(false);
  const [showDevAutopilot, setShowDevAutopilot] = useState(false);
  const onPrestige = usePrestige();
  const state = useGameState();
  const loop = useLoop();
  const gate = useContext(LVNPGateContext);
  useSoundEvents();

  const showPrestigeOverlay = state.prestigeTriggered || (DEV_MODE && view === "prestige");

  useEffect(() => {
    if (state.prestigeTriggered && !state.paused) {
      loop.pause();
    }
  }, [state.prestigeTriggered, state.paused, loop]);

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
        gridTemplateRows: "80px 1fr 130px",
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
      <Topbar
        onOpenSettings={() => setShowSoundSettings(true)}
        onBack={gate.onBack}
        {...(DEV_MODE ? { onOpenAutopilot: () => setShowDevAutopilot(true) } : {})}
      />
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
        <Screen view={view} onNavigate={setView} onPrestige={onPrestige} />
      </div>

      <Footer onNavigate={setView} />

      {showPrestigeOverlay && (
        <div style={{
          position: "absolute",
          inset: 0,
          zIndex: 100,
          background: "radial-gradient(ellipse at top, #0a1a30 0%, #050913 70%)",
          display: "flex",
          flexDirection: "column",
          padding: "20px 24px",
          overflow: "hidden",
        }}>
          <Prestige
            onBeginNewMission={() => { setView("overview"); onPrestige?.(); }}
            {...(DEV_MODE && !state.prestigeTriggered ? { onClose: () => setView("overview") } : {})}
          />
        </div>
      )}

      {showSoundSettings && (
        <SoundSettings onClose={() => setShowSoundSettings(false)} />
      )}

      {DEV_MODE && showDevAutopilot && (
        <DevAutopilot onClose={() => setShowDevAutopilot(false)} />
      )}
    </div>
  );
}
