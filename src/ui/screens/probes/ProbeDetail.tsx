import type { ProbeState } from "../../../simulation/state";
import { CPUS, PROPULSIONS, REACTORS } from "../../../simulation/data/components";
import { Panel } from "../../components/Panel";
import { fmt } from "../../format";

export function ProbeDetail({
  probe,
  systemName,
}: {
  probe: ProbeState;
  systemName: string;
}) {
  const cpu = CPUS[probe.components.cpu];
  const prop = PROPULSIONS[probe.components.propulsion];
  const reactor = REACTORS[probe.components.reactor];

  return (
    <Panel label="Probe Detail">
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>{probe.id}</div>
          <div className="text-secondary" style={{ fontSize: 12 }}>
            {systemName} system
          </div>
        </div>

        <div>
          <div className="section-label">Components</div>
          <div className="stat-row">
            <span className="stat-label">CPU</span>
            <span className="stat-value">{cpu.name}</span>
          </div>
          <div className="stat-row">
            <span className="stat-label">Propulsion</span>
            <span className="stat-value">{prop.name}</span>
          </div>
          <div className="stat-row">
            <span className="stat-label">Reactor</span>
            <span className="stat-value">{reactor.name}</span>
          </div>
        </div>

        <div>
          <div className="section-label">Output</div>
          <div className="stat-row">
            <span className="stat-label">Mining</span>
            <span className="stat-value">{fmt(probe.miningOutput, 1)}/s</span>
          </div>
          <div className="stat-row">
            <span className="stat-label">Computing</span>
            <span className="stat-value">{fmt(probe.computingOutput, 1)}/s</span>
          </div>
          <div className="stat-row">
            <span className="stat-label">Print Speed</span>
            <span className="stat-value">{probe.internalPrinterSpeed}x</span>
          </div>
        </div>

        {probe.autoReplicating && (
          <div className="text-success" style={{ fontSize: 11 }}>
            ✦ Von Neumann Self-Replicator
          </div>
        )}
      </div>
    </Panel>
  );
}
