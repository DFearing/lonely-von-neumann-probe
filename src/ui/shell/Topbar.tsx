import { useEffect } from "react";
import { useGameState, useCurrentSystem, useLoop } from "../context";
import { FONT_MONO } from "../tokens";
import { starColor } from "../data/star-colors";
import type { GameSpeed } from "../../simulation/actions";

function richnessLabel(value: number): string {
  if (value < 0.7) return "Barren";
  if (value < 0.9) return "Poor";
  if (value < 1.1) return "Moderate";
  if (value < 1.4) return "Rich";
  if (value < 1.8) return "Abundant";
  return "Plentiful";
}

const SPEEDS: GameSpeed[] = [1, 10, 100, 1000];
const SPEED_LABELS: Record<GameSpeed, string> = { 1: "1×", 10: "10×", 100: "100×", 1000: "1000×" };

export function Topbar() {
  const state = useGameState();
  const system = useCurrentSystem();
  const loop = useLoop();
  const paused = loop.isPaused();
  const currentSpeed = loop.getSpeed();
  const year = 2026 + Math.floor(state.elapsedSeconds);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (!e.ctrlKey && !e.metaKey) return;
      const key = e.key;
      if (key === "0") { e.preventDefault(); loop.pause(); }
      else if (key === "1") { e.preventDefault(); loop.setSpeed(1); if (loop.isPaused()) loop.unpause(); }
      else if (key === "2") { e.preventDefault(); loop.setSpeed(10); if (loop.isPaused()) loop.unpause(); }
      else if (key === "3") { e.preventDefault(); loop.setSpeed(100); if (loop.isPaused()) loop.unpause(); }
      else if (key === "4") { e.preventDefault(); loop.setSpeed(1000); if (loop.isPaused()) loop.unpause(); }
      else if (key === "=" || key === "+") {
        e.preventDefault();
        const idx = SPEEDS.indexOf(loop.getSpeed());
        if (idx < SPEEDS.length - 1) loop.setSpeed(SPEEDS[idx + 1]!);
        if (loop.isPaused()) loop.unpause();
      } else if (key === "-") {
        e.preventDefault();
        const idx = SPEEDS.indexOf(loop.getSpeed());
        if (idx > 0) loop.setSpeed(SPEEDS[idx - 1]!);
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [loop]);

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
        fontSize: 15,
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
        <span
          style={{
            display: "inline-block",
            width: 10,
            height: 10,
            borderRadius: "50%",
            background: starColor(system.starType),
            boxShadow: `0 0 8px ${starColor(system.starType)}`,
            alignSelf: "center",
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
            fontSize: 16,
          }}
        >
          {system.name}
        </span>
        <span style={{ color: "#3d5572" }}>&middot;</span>
        <span style={{ color: "#d6e8f5" }}>
          {richnessLabel(system.resourceRichness)} materials
        </span>
      </div>
      <div style={{ flex: 1 }} />
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <button
          onClick={() => paused ? loop.unpause() : loop.pause()}
          style={{
            fontFamily: FONT_MONO,
            fontSize: 12,
            letterSpacing: "0.1em",
            color: paused ? "#4cd8a8" : "#6b87a3",
            background: paused ? "rgba(76,216,168,0.1)" : "transparent",
            border: `1px solid ${paused ? "rgba(76,216,168,0.4)" : "rgba(110,200,255,0.15)"}`,
            padding: "4px 10px",
            cursor: "pointer",
          }}
        >
          {paused ? "▶" : "⏸"}
        </button>
        {SPEEDS.map((s) => (
          <button
            key={s}
            onClick={() => { loop.setSpeed(s); if (paused) loop.unpause(); }}
            style={{
              fontFamily: FONT_MONO,
              fontSize: 11,
              color: !paused && currentSpeed === s ? "#d6e8f5" : "#6b87a3",
              background: !paused && currentSpeed === s ? "rgba(110,200,255,0.12)" : "transparent",
              border: `1px solid ${!paused && currentSpeed === s ? "rgba(110,200,255,0.3)" : "rgba(110,200,255,0.1)"}`,
              padding: "4px 8px",
              cursor: "pointer",
            }}
          >
            {SPEED_LABELS[s]}
          </button>
        ))}
      </div>
      <div style={{ flex: 1 }} />
      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
        <span style={{ color: "#9ab4cf", letterSpacing: "0.14em" }}>YEAR</span>
        <span
          style={{
            color: "#d6e8f5",
            fontSize: 20,
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
