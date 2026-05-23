import { useState } from "react";
import { useGameState, useDispatch } from "../context";
import type { ProbeState, ProbeInTransit } from "../../simulation/state";
import { FONT_MONO } from "../tokens";
import { Panel } from "../components/Panel";
import { ScreenHeader } from "../components/ScreenHeader";
import { ProbeRow, TransitProbeRow } from "./probes/ProbeRow";
import { ProbeDetail } from "./probes/ProbeDetail";
import { BuildProbeModal } from "./probes/BuildProbeModal";

export function Probes() {
  const state = useGameState();
  const dispatch = useDispatch();
  const [selected, setSelected] = useState<string | null>(null);
  const [showBuild, setShowBuild] = useState(false);

  const system = state.systems[state.currentSystemId];
  if (!system) return null;

  const activeProbes: { probe: ProbeState; systemName: string }[] = [];
  const transitProbes: ProbeInTransit[] = [];

  for (const sys of Object.values(state.systems)) {
    if (sys.mainProbe) {
      activeProbes.push({ probe: sys.mainProbe, systemName: sys.name });
    }
    for (const p of sys.sentProbes) {
      transitProbes.push(p);
    }
  }

  const totalCount = activeProbes.length + transitProbes.length;
  const homeCount = activeProbes.length;
  const transitCount = transitProbes.length;

  let selectedProbe: ProbeState | null = null;
  let selectedSystemName = "";
  if (selected) {
    const active = activeProbes.find((a) => a.probe.id === selected);
    if (active) {
      selectedProbe = active.probe;
      selectedSystemName = active.systemName;
    }
  }

  const targetSystems = system.discoveredSystems
    .map((id) => state.systems[id])
    .filter((s): s is NonNullable<typeof s> => s != null && !s.mainProbe)
    .map((s) => ({ id: s.id, name: s.name }));

  return (
    <>
      <ScreenHeader
        title="Probe Fleet"
        actions={
          <>
            <div
              style={{
                display: "flex",
                gap: 18,
                padding: "4px 12px",
                alignItems: "center",
                fontFamily: FONT_MONO,
                fontSize: 11,
              }}
            >
              <span>
                <span style={{ color: "#d6e8f5" }}>{totalCount}</span>{" "}
                <span style={{ color: "#6b87a3" }}>TOTAL</span>
              </span>
              <span>
                <span style={{ color: "#4cd8a8" }}>{homeCount}</span>{" "}
                <span style={{ color: "#6b87a3" }}>IN SYSTEM</span>
              </span>
              <span>
                <span style={{ color: "#4ddbff" }}>{transitCount}</span>{" "}
                <span style={{ color: "#6b87a3" }}>IN TRANSIT</span>
              </span>
            </div>
            <button
              onClick={() => setShowBuild(true)}
              title="Build new probe"
              style={{
                width: 28,
                height: 28,
                background: "rgba(77,219,255,0.10)",
                border: "1px solid rgba(77,219,255,0.6)",
                color: "#4ddbff",
                fontFamily: FONT_MONO,
                fontSize: 16,
                lineHeight: 1,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                borderRadius: 2,
                padding: 0,
              }}
            >
              +
            </button>
          </>
        }
      />

      <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
        <Panel
          label="FLEET ROSTER"
          right={
            <div
              style={{
                display: "flex",
                gap: 14,
                fontFamily: FONT_MONO,
                fontSize: 10,
                color: "#6b87a3",
                alignItems: "center",
              }}
            >
              {[
                { color: "#4cd8a8", label: "IN SYSTEM" },
                { color: "#4ddbff", label: "TRANSIT" },
                { color: "#ff9966", label: "BUILDING" },
              ].map((l) => (
                <span
                  key={l.label}
                  style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
                >
                  <span
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: "50%",
                      background: l.color,
                      boxShadow: `0 0 4px ${l.color}`,
                    }}
                  />
                  <span style={{ color: l.color }}>{l.label}</span>
                </span>
              ))}
            </div>
          }
          style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 8,
              overflowY: "auto",
              flex: 1,
              minHeight: 0,
            }}
          >
            {activeProbes.map(({ probe, systemName }) => (
              <ProbeRow
                key={probe.id}
                probe={probe}
                systemName={systemName}
                selected={selected === probe.id}
                onClick={() => setSelected(probe.id)}
              />
            ))}
            {transitProbes.map((p) => (
              <TransitProbeRow
                key={p.id}
                probe={p}
                selected={selected === p.id}
                onClick={() => setSelected(p.id)}
              />
            ))}
            {activeProbes.length === 0 && transitProbes.length === 0 && (
              <div
                style={{
                  fontFamily: FONT_MONO,
                  fontSize: 11,
                  color: "#6b87a3",
                  textAlign: "center",
                  padding: "24px 0",
                }}
              >
                No probes in fleet
              </div>
            )}
          </div>
        </Panel>
      </div>

      {selectedProbe && (
        <div
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            width: 380,
            height: "100%",
            zIndex: 10,
          }}
        >
          <ProbeDetail
            probe={selectedProbe}
            systemName={selectedSystemName}
            onBuild={() => setShowBuild(true)}
          />
        </div>
      )}

      {showBuild && (
        <BuildProbeModal
          system={system}
          targetSystems={targetSystems}
          dispatch={dispatch}
          onClose={() => setShowBuild(false)}
        />
      )}
    </>
  );
}
