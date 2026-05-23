import { useGameState, useCurrentSystem } from "../context";

const FONT_MONO = "'JetBrains Mono', 'Courier New', monospace";

export function Topbar() {
  const state = useGameState();
  const system = useCurrentSystem();
  const year = 2026 + Math.floor(state.elapsedSeconds);

  return (
    <div
      style={{
        gridArea: "topbar",
        borderBottom: "1px solid rgba(110,200,255,0.12)",
        display: "flex",
        alignItems: "center",
        padding: "0 24px",
        gap: 24,
        background: "rgba(8,16,30,0.6)",
        fontFamily: FONT_MONO,
        fontSize: 12,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: "#4cd8a8",
            boxShadow: "0 0 8px #4cd8a8",
          }}
        />
        <span style={{ color: "#6b87a3", letterSpacing: "0.14em" }}>
          SYSTEM
        </span>
        <span
          style={{
            color: "#d6e8f5",
            letterSpacing: "0.12em",
            fontWeight: 600,
            fontSize: 13,
          }}
        >
          {system.name}
        </span>
        <span style={{ color: "#3d5572" }}>&middot;</span>
        <span style={{ color: "#6b87a3" }}>{system.starType}</span>
        <span style={{ color: "#3d5572" }}>&middot;</span>
        <span style={{ color: "#6b87a3" }}>RICHNESS</span>
        <span style={{ color: "#d6e8f5" }}>
          &times;{system.resourceRichness.toFixed(1)}
        </span>
      </div>
      <div style={{ flex: 1 }} />
      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
        <span style={{ color: "#9ab4cf", letterSpacing: "0.14em" }}>YEAR</span>
        <span
          style={{
            color: "#d6e8f5",
            fontSize: 16,
            fontWeight: 600,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {year}
        </span>
      </div>
    </div>
  );
}
