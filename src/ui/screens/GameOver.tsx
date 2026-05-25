import { useGameState } from "../context";
import { FONT_MONO, FONT_DISPLAY } from "../tokens";
import { fmt } from "../format";

const RED = "#ff5555";
const DIM = "#6b87a3";
const INK = "#d6e8f5";

function StatCell({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={{ padding: "12px 16px", background: "rgba(255,85,85,0.04)", border: "1px solid rgba(255,85,85,0.12)" }}>
      <div style={{ fontFamily: FONT_MONO, fontSize: 9, letterSpacing: "0.20em", color: DIM }}>{label}</div>
      <div style={{ fontFamily: FONT_MONO, fontSize: 18, fontWeight: 600, color: INK, marginTop: 4 }}>{value}</div>
    </div>
  );
}

export function GameOver({ onRestart }: { onRestart: () => void }) {
  const state = useGameState();

  const totalStructures = Object.values(state.systems).reduce((sum, sys) => {
    const s = sys.structures;
    return sum + s.miners.length + s.reactors.length + s.printers.length + s.stations.length;
  }, 0);

  const totalResearch = Object.values(state.systems).reduce(
    (sum, sys) => sum + Object.keys(sys.completedResearch).length,
    0,
  );

  const systemsReached = Object.values(state.systems).filter(
    (sys) => sys.mainProbe !== null,
  ).length;

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 32,
        fontFamily: FONT_DISPLAY,
      }}
    >
      <div style={{ textAlign: "center" }}>
        <div
          style={{
            fontFamily: FONT_MONO,
            fontSize: 11,
            letterSpacing: "0.30em",
            color: RED,
            marginBottom: 12,
          }}
        >
          MISSION FAILED
        </div>
        <div
          style={{
            fontSize: 32,
            fontWeight: 700,
            color: INK,
            marginBottom: 8,
          }}
        >
          Signal Lost
        </div>
        <div
          style={{
            fontFamily: FONT_MONO,
            fontSize: 13,
            color: DIM,
            maxWidth: 480,
            lineHeight: 1.6,
          }}
        >
          All probe systems have gone offline. Without maintenance materials,
          critical systems degraded beyond recovery. The mission ends here.
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 12,
          width: "100%",
          maxWidth: 560,
        }}
      >
        <StatCell label="CYCLES" value={fmt(state.tickCount)} />
        <StatCell label="SYSTEMS" value={systemsReached} />
        <StatCell label="STRUCTURES" value={totalStructures} />
        <StatCell label="RESEARCH" value={totalResearch} />
      </div>

      <button
        onClick={onRestart}
        style={{
          fontFamily: FONT_MONO,
          fontSize: 13,
          letterSpacing: "0.18em",
          padding: "14px 36px",
          background: "rgba(255,85,85,0.10)",
          border: `1px solid ${RED}66`,
          color: RED,
          cursor: "pointer",
          borderRadius: 2,
          marginTop: 8,
          boxShadow: `0 0 16px rgba(255,85,85,0.15)`,
        }}
      >
        RETURN TO MENU
      </button>
    </div>
  );
}
