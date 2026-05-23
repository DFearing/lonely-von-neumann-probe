import { useState } from "react";
import type { SystemState, CpuType, PropulsionType, ReactorType } from "../../../simulation/state";
import type { PlayerAction } from "../../../simulation/actions";
import { getAvailableComponents } from "../../../simulation/queries";
import { totalProbeCost } from "../../../simulation/data/components";
import { fmt } from "../../format";

export function BuildProbeModal({
  system,
  targetSystems,
  dispatch,
  onClose,
}: {
  system: SystemState;
  targetSystems: { id: string; name: string }[];
  dispatch: (action: PlayerAction) => void;
  onClose: () => void;
}) {
  const available = getAvailableComponents(system);

  const [cpu, setCpu] = useState<CpuType>(available.cpus[0]?.type ?? "basic_cpu");
  const [propulsion, setPropulsion] = useState<PropulsionType>(
    available.propulsions[0]?.type ?? "basic_ion_drive",
  );
  const [reactor, setReactor] = useState<ReactorType>(
    available.reactors[0]?.type ?? "basic_reactor",
  );
  const [targetSystemId, setTargetSystemId] = useState(
    targetSystems[0]?.id ?? "",
  );

  const cost = totalProbeCost(cpu, propulsion, reactor);
  const canAfford =
    system.resources.materials >= cost.materials &&
    system.resources.energy >= cost.energy;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">Build Probe</span>
          <button className="btn-icon" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <div className="section-label">CPU</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {available.cpus.map((c) => (
                  <label key={c.type} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                    <input
                      type="radio"
                      name="cpu"
                      checked={cpu === c.type}
                      onChange={() => setCpu(c.type)}
                    />
                    <span>{c.name}</span>
                    <span className="text-dim mono" style={{ fontSize: 10 }}>
                      {fmt(c.cost.materials)}M {fmt(c.cost.energy)}E
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <div className="section-label">Propulsion</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {available.propulsions.map((p) => (
                  <label key={p.type} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                    <input
                      type="radio"
                      name="propulsion"
                      checked={propulsion === p.type}
                      onChange={() => setPropulsion(p.type)}
                    />
                    <span>{p.name}</span>
                    <span className="text-dim mono" style={{ fontSize: 10 }}>
                      {fmt(p.cost.materials)}M {fmt(p.cost.energy)}E — {p.travelSpeed}x speed
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <div className="section-label">Reactor</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {available.reactors.map((r) => (
                  <label key={r.type} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                    <input
                      type="radio"
                      name="reactor"
                      checked={reactor === r.type}
                      onChange={() => setReactor(r.type)}
                    />
                    <span>{r.name}</span>
                    <span className="text-dim mono" style={{ fontSize: 10 }}>
                      {fmt(r.cost.materials)}M {fmt(r.cost.energy)}E — {r.energyMultiplier}x energy
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <div className="section-label">Destination</div>
              <select
                value={targetSystemId}
                onChange={(e) => setTargetSystemId(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  background: "var(--bg-input)",
                  border: "1px solid var(--border)",
                  borderRadius: 4,
                  color: "var(--text-primary)",
                  fontFamily: "var(--font-display)",
                  fontSize: 13,
                }}
              >
                {targetSystems.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="stat-row" style={{ borderTop: "1px solid var(--border)", paddingTop: 8 }}>
              <span className="stat-label">Total Cost</span>
              <span className="stat-value">
                {fmt(cost.materials)} M · {fmt(cost.energy)} E
              </span>
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            disabled={!canAfford || !targetSystemId}
            onClick={() => {
              dispatch({
                type: "build_probe",
                systemId: system.id,
                cpu,
                propulsion,
                reactor,
                targetSystemId,
              });
              onClose();
            }}
          >
            Build Probe ({fmt(cost.materials)}M)
          </button>
        </div>
      </div>
    </div>
  );
}
