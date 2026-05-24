import { useState } from "react";
import { useGameState, useDevJumpForward } from "../context";
import { FONT_MONO, FONT_DISPLAY } from "../tokens";
import { PROFILES } from "../../simulation/autopilot/profiles";
import { simulateToYear } from "../../simulation/autopilot/runner";

export function DevAutopilot({ onClose }: { onClose: () => void }) {
  const state = useGameState();
  const jumpForward = useDevJumpForward();
  const currentYear = 2026 + Math.floor(state.elapsedSeconds);

  const [profileId, setProfileId] = useState(PROFILES[0]!.id);
  const [targetYear, setTargetYear] = useState(currentYear + 100);
  const [result, setResult] = useState<{
    ticksRun: number;
    year: number;
    systems: number;
    structures: number;
    techs: number;
    materials: number;
  } | null>(null);
  const [running, setRunning] = useState(false);

  function handleRun() {
    const profile = PROFILES.find((p) => p.id === profileId);
    if (!profile || !jumpForward) return;

    setRunning(true);
    setTimeout(() => {
      const { finalState, ticksRun } = simulateToYear(state, profile, targetYear);

      let systems = 0;
      let structures = 0;
      let techs = 0;
      let materials = 0;
      for (const sys of Object.values(finalState.systems)) {
        if (sys.mainProbe) systems++;
        for (const arr of Object.values(sys.structures)) {
          structures += arr.length;
        }
        techs += Object.keys(sys.completedResearch).length;
        materials += Math.floor(sys.resources.materials);
      }

      setResult({
        ticksRun,
        year: 2026 + Math.floor(finalState.elapsedSeconds),
        systems,
        structures,
        techs,
        materials,
      });

      jumpForward(finalState);
      setRunning(false);
    }, 10);
  }

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      zIndex: 200,
      background: "rgba(0,0,0,0.7)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}>
      <div style={{
        background: "linear-gradient(135deg, #0a1a30, #050913)",
        border: "1px solid rgba(110,200,255,0.2)",
        borderRadius: 4,
        padding: "24px 32px",
        width: 420,
        fontFamily: FONT_DISPLAY,
        color: "#d6e8f5",
      }}>
        <div style={{
          fontFamily: FONT_MONO,
          fontSize: 10,
          letterSpacing: "0.22em",
          color: "#6b87a3",
          marginBottom: 6,
        }}>DEV · AUTOPILOT</div>
        <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 20 }}>
          Jump Forward
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ fontFamily: FONT_MONO, fontSize: 11, color: "#6b87a3", letterSpacing: "0.12em" }}>
            PROFILE
          </label>
          <select
            value={profileId}
            onChange={(e) => setProfileId(e.target.value)}
            style={{
              display: "block",
              width: "100%",
              marginTop: 4,
              padding: "8px 10px",
              background: "rgba(110,200,255,0.06)",
              border: "1px solid rgba(110,200,255,0.2)",
              color: "#d6e8f5",
              fontFamily: FONT_MONO,
              fontSize: 13,
              borderRadius: 2,
            }}
          >
            {PROFILES.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={{ fontFamily: FONT_MONO, fontSize: 11, color: "#6b87a3", letterSpacing: "0.12em" }}>
            TARGET YEAR
          </label>
          <input
            type="number"
            value={targetYear}
            onChange={(e) => setTargetYear(Number(e.target.value))}
            min={currentYear + 1}
            style={{
              display: "block",
              width: "100%",
              marginTop: 4,
              padding: "8px 10px",
              background: "rgba(110,200,255,0.06)",
              border: "1px solid rgba(110,200,255,0.2)",
              color: "#d6e8f5",
              fontFamily: FONT_MONO,
              fontSize: 13,
              borderRadius: 2,
            }}
          />
          <div style={{ fontFamily: FONT_MONO, fontSize: 10, color: "#3d5572", marginTop: 4 }}>
            Current: {currentYear} · Advancing {Math.max(0, targetYear - currentYear)} years
          </div>
        </div>

        {result && (
          <div style={{
            background: "rgba(110,200,255,0.06)",
            border: "1px solid rgba(110,200,255,0.12)",
            borderRadius: 2,
            padding: "10px 14px",
            marginBottom: 16,
            fontFamily: FONT_MONO,
            fontSize: 11,
            lineHeight: 1.8,
            color: "#9ab4cf",
          }}>
            <div>Year <span style={{ color: "#d6e8f5" }}>{result.year}</span> · {result.ticksRun} ticks</div>
            <div>Systems <span style={{ color: "#4cd8a8" }}>{result.systems}</span> · Structures <span style={{ color: "#4cd8a8" }}>{result.structures}</span></div>
            <div>Techs <span style={{ color: "#6cb8e8" }}>{result.techs}</span> · Materials <span style={{ color: "#d6e8f5" }}>{result.materials}</span></div>
          </div>
        )}

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "1px solid rgba(110,200,255,0.2)",
              color: "#6b87a3",
              padding: "10px 20px",
              fontFamily: FONT_MONO,
              fontSize: 11,
              letterSpacing: "0.14em",
              cursor: "pointer",
              borderRadius: 2,
            }}
          >CLOSE</button>
          <button
            onClick={handleRun}
            disabled={running || targetYear <= currentYear}
            style={{
              background: running ? "rgba(110,200,255,0.06)" : "rgba(77,219,255,0.12)",
              border: "1px solid rgba(77,219,255,0.4)",
              color: running ? "#6b87a3" : "#4ddbff",
              padding: "10px 20px",
              fontFamily: FONT_MONO,
              fontSize: 11,
              letterSpacing: "0.14em",
              fontWeight: 600,
              cursor: running ? "default" : "pointer",
              borderRadius: 2,
            }}
          >{running ? "RUNNING..." : "▸ RUN"}</button>
        </div>
      </div>
    </div>
  );
}
