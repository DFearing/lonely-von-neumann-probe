import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus } from "@fortawesome/free-solid-svg-icons";
import { useGameState, useDispatch } from "../context";
import type { ProbeState, ProbeInTransit } from "../../simulation/state";
import { FONT_MONO } from "../tokens";
import { Panel } from "../components/Panel";
import { ScreenHeader } from "../components/ScreenHeader";
import { ProbeRow, TransitProbeRow, AvailableProbeRow } from "./probes/ProbeRow";
import { BuildProbeModal } from "./probes/BuildProbeModal";
import { LaunchProbeModal } from "./probes/LaunchProbeModal";

export function Probes() {
  const state = useGameState();
  const dispatch = useDispatch();
  const [showBuild, setShowBuild] = useState(false);
  const [launchingProbe, setLaunchingProbe] = useState<ProbeState | null>(null);

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

  const availableProbes = system.availableProbes;

  const totalCount = activeProbes.length + transitProbes.length + availableProbes.length;
  const homeCount = activeProbes.length;
  const transitCount = transitProbes.length;
  const availableCount = availableProbes.length;

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
              {availableCount > 0 && (
                <span>
                  <span style={{ color: "#4cd8a8" }}>{availableCount}</span>{" "}
                  <span style={{ color: "#6b87a3" }}>AVAILABLE</span>
                </span>
              )}
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
              <FontAwesomeIcon icon={faPlus} />
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
                { color: "#4cd8a8", label: "AVAILABLE" },
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
            {availableProbes.map((probe) => (
              <AvailableProbeRow
                key={probe.id}
                probe={probe}
                onExplore={() => setLaunchingProbe(probe)}
              />
            ))}
            {activeProbes.map(({ probe, systemName }) => (
              <ProbeRow
                key={probe.id}
                probe={probe}
                systemName={systemName}
              />
            ))}
            {transitProbes.map((p) => (
              <TransitProbeRow
                key={p.id}
                probe={p}
                originName={state.systems[p.originSystemId]?.name ?? p.originSystemId}
                destinationName={state.systems[p.destinationSystemId]?.name ?? p.destinationSystemId}
              />
            ))}
            {activeProbes.length === 0 && transitProbes.length === 0 && availableProbes.length === 0 && (
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

      {showBuild && (
        <BuildProbeModal
          system={system}
          dispatch={dispatch}
          onClose={() => setShowBuild(false)}
        />
      )}

      {launchingProbe && (
        <LaunchProbeModal
          probe={launchingProbe}
          system={system}
          state={state}
          dispatch={dispatch}
          onClose={() => setLaunchingProbe(null)}
        />
      )}
    </>
  );
}
