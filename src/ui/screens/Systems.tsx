import { useState } from "react";
import { useGameState } from "../context";
import type { ViewId } from "../shell/Sidebar";
import { FONT_MONO } from "../tokens";
import { ScreenHeader } from "../components/ScreenHeader";
import { btnFlush } from "../components/buttons";
import { StarMap } from "./systems/StarMap";
import { SystemList } from "./systems/SystemList";
import { SystemDetail } from "./systems/SystemDetail";

export function Systems({ onNavigate }: { onNavigate: (view: ViewId) => void }) {
  const state = useGameState();
  const [selected, setSelected] = useState<string>(state.currentSystemId);

  const currentSystem = state.systems[state.currentSystemId];
  const knownCount = currentSystem ? currentSystem.discoveredSystems.length : 0;
  const colonizedCount = Object.values(state.systems).filter(
    (s) => s.mainProbe !== null && s.id !== state.currentSystemId,
  ).length;

  return (
    <>
      <ScreenHeader
        title="Star Systems"
        actions={
          <>
            <div
              style={{
                display: "flex",
                gap: 14,
                padding: "4px 12px",
                alignItems: "center",
                fontFamily: FONT_MONO,
                fontSize: 11,
              }}
            >
              <span>
                <span style={{ color: "#4cd8a8" }}>1</span>{" "}
                <span style={{ color: "#6b87a3" }}>HOME</span>
              </span>
              <span>
                <span style={{ color: "#4ddbff" }}>{colonizedCount}</span>{" "}
                <span style={{ color: "#6b87a3" }}>COLONIZED</span>
              </span>
              <span>
                <span style={{ color: "#9ab4cf" }}>{knownCount}</span>{" "}
                <span style={{ color: "#6b87a3" }}>KNOWN</span>
              </span>
            </div>
            <button
              style={btnFlush()}
              onClick={() => onNavigate("fleet")}
            >
              SEND PROBE
            </button>
          </>
        }
      />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 260px 340px",
          gap: 16,
          flex: 1,
          minHeight: 0,
        }}
      >
        <StarMap state={state} selectedSystem={selected} onSelect={setSelected} />
        <SystemList state={state} selectedSystem={selected} onSelect={setSelected} />
        <SystemDetail
          state={state}
          systemId={selected}
          onNavigate={onNavigate}
        />
      </div>
    </>
  );
}
