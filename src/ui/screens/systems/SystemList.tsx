import type { GameState, SystemState } from "../../../simulation/state";
import { getIncomingProbes } from "../../../simulation/queries";
import { Panel } from "../../components/Panel";
import { FONT_MONO } from "../../tokens";
import { starColor } from "../../data/star-colors";
import { fmt } from "../../format";

function systemStatus(sys: SystemState, isHome: boolean, hasIncoming: boolean): string {
  if (isHome) return "HOME";
  if (sys.mainProbe) return "COLONIZED";
  if (hasIncoming) return "INCOMING";
  return "KNOWN";
}

function statusColorForStatus(status: string, isHome: boolean): string {
  if (isHome) return "#4cd8a8";
  if (status === "INCOMING") return "#4ddbff";
  return "#6b87a3";
}

function SystemListItem({
  sys,
  isSelected,
  isHome,
  hasIncoming,
  onSelect,
}: {
  sys: SystemState;
  isSelected: boolean;
  isHome: boolean;
  hasIncoming: boolean;
  onSelect: () => void;
}) {
  const color = starColor(sys.starType);
  const status = systemStatus(sys, isHome, hasIncoming);
  const statusColor = statusColorForStatus(status, isHome);

  return (
    <div
      onClick={onSelect}
      style={{
        padding: "10px 12px",
        background: isSelected ? "rgba(77,219,255,0.10)" : "transparent",
        border: `1px solid ${isSelected ? "#4ddbff" : "rgba(110,200,255,0.10)"}`,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: 10,
      }}
    >
      <span
        style={{
          width: 10,
          height: 10,
          background: color,
          flexShrink: 0,
          borderRadius: "50%",
          boxShadow: `0 0 6px ${color}80`,
        }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, color: "#d6e8f5", fontWeight: 500 }}>
          {sys.name}
        </div>
        <div
          style={{
            fontFamily: FONT_MONO,
            fontSize: 10,
            color: "#6b87a3",
            marginTop: 2,
          }}
        >
          {fmt(sys.distanceFromOrigin, { decimals: 2 })}ly · {sys.starType}
        </div>
      </div>
      <span
        style={{
          fontFamily: FONT_MONO,
          fontSize: 9,
          letterSpacing: "0.14em",
          color: statusColor,
        }}
      >
        {status}
      </span>
    </div>
  );
}

export function SystemList({
  state,
  selectedSystem,
  onSelect,
}: {
  state: GameState;
  selectedSystem: string | null;
  onSelect: (id: string) => void;
}) {
  const currentSystem = state.systems[state.currentSystemId];
  if (!currentSystem) return null;

  const systemIds = [currentSystem.id, ...currentSystem.discoveredSystems];

  return (
    <Panel
      label="SYSTEM LIST"
      style={{ display: "flex", flexDirection: "column", minHeight: 0 }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 6,
          overflowY: "auto",
        }}
      >
        {systemIds.map((id) => {
          const sys = state.systems[id];
          if (!sys) return null;
          return (
            <SystemListItem
              key={id}
              sys={sys}
              isSelected={selectedSystem === id}
              isHome={state.currentSystemId === id}
              hasIncoming={getIncomingProbes(state, id).length > 0}
              onSelect={() => onSelect(id)}
            />
          );
        })}
      </div>
      <div
        style={{
          marginTop: 14,
          paddingTop: 12,
          borderTop: "1px solid rgba(110,200,255,0.10)",
          fontFamily: FONT_MONO,
          fontSize: 10,
          color: "#6b87a3",
          lineHeight: 1.7,
        }}
      >
        <div>RANGE · 12 ly (sensor T1)</div>
        <div>SCAN · upgrade Comms branch</div>
      </div>
    </Panel>
  );
}
