import type { ProbeState, ProbeInTransit } from "../../../simulation/state";
import { CPUS, PROPULSIONS, REACTORS } from "../../../simulation/data/components";
import { fmtPercent } from "../../format";

export function ProbeRow({
  probe,
  systemName,
  selected,
  onClick,
}: {
  probe: ProbeState;
  systemName: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <div
      className={`probe-card${selected ? " probe-card--selected" : ""}`}
      onClick={onClick}
    >
      <div className="probe-card-name">{probe.id}</div>
      <div className="probe-card-status">{systemName} — Active</div>
      <div className="probe-card-components">
        {CPUS[probe.components.cpu].name} ·{" "}
        {PROPULSIONS[probe.components.propulsion].name} ·{" "}
        {REACTORS[probe.components.reactor].name}
      </div>
    </div>
  );
}

export function TransitProbeRow({
  probe,
  selected,
  onClick,
}: {
  probe: ProbeInTransit;
  selected: boolean;
  onClick: () => void;
}) {
  const progress =
    probe.travelTimeSeconds > 0
      ? probe.elapsedSeconds / probe.travelTimeSeconds
      : 1;
  return (
    <div
      className={`probe-card${selected ? " probe-card--selected" : ""}`}
      onClick={onClick}
    >
      <div className="probe-card-name">{probe.id}</div>
      <div className="probe-card-status">
        In transit → {probe.destinationSystemId} ({fmtPercent(progress)})
      </div>
      <div style={{ marginTop: 4 }}>
        <div className="progress-bar">
          <div
            className="progress-bar-fill"
            style={{ width: `${Math.min(progress, 1) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}
