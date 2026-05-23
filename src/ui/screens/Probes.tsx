import { useState } from "react";
import { useGameState, useDispatch } from "../context";
import type { ProbeState, ProbeInTransit } from "../../simulation/state";
import { Panel } from "../components/Panel";
import { ProbeRow, TransitProbeRow } from "./probes/ProbeRow";
import { ProbeDetail } from "./probes/ProbeDetail";
import { BuildProbeModal } from "./probes/BuildProbeModal";

type SelectedProbe =
  | { kind: "active"; probe: ProbeState; systemName: string }
  | { kind: "transit"; probe: ProbeInTransit };

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

  let selectedProbe: SelectedProbe | null = null;
  if (selected) {
    const active = activeProbes.find((a) => a.probe.id === selected);
    if (active) {
      selectedProbe = { kind: "active", probe: active.probe, systemName: active.systemName };
    } else {
      const transit = transitProbes.find((t) => t.id === selected);
      if (transit) {
        selectedProbe = { kind: "transit", probe: transit };
      }
    }
  }

  const targetSystems = system.discoveredSystems
    .map((id) => state.systems[id])
    .filter((s): s is NonNullable<typeof s> => s != null && !s.mainProbe)
    .map((s) => ({ id: s.id, name: s.name }));

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, height: "100%" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <Panel
          label="Fleet Roster"
          right={
            <button className="btn btn-primary btn-sm" onClick={() => setShowBuild(true)}>
              + Build Probe
            </button>
          }
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
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
              <div className="empty-state">No probes in fleet</div>
            )}
          </div>
        </Panel>
      </div>

      <div>
        {selectedProbe?.kind === "active" ? (
          <ProbeDetail
            probe={selectedProbe.probe}
            systemName={selectedProbe.systemName}
          />
        ) : (
          <Panel label="Probe Detail">
            <div className="empty-state">Select a probe to view details</div>
          </Panel>
        )}
      </div>

      {showBuild && (
        <BuildProbeModal
          system={system}
          targetSystems={targetSystems}
          dispatch={dispatch}
          onClose={() => setShowBuild(false)}
        />
      )}
    </div>
  );
}
