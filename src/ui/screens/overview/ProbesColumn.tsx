import type { GameState, ProbeInTransit } from "../../../simulation/state";
import { CPUS, PROPULSIONS, REACTORS } from "../../../simulation/data/components";
import { Panel } from "../../components/Panel";
import { fmtPercent } from "../../format";

function ProbeCard({
  name,
  system,
  components,
  status,
}: {
  name: string;
  system: string;
  components: { cpu: string; propulsion: string; reactor: string };
  status: string;
}) {
  return (
    <div className="probe-card">
      <div className="probe-card-name">{name}</div>
      <div className="probe-card-status">
        {system} — {status}
      </div>
      <div className="probe-card-components">
        {CPUS[components.cpu as keyof typeof CPUS]?.name ?? components.cpu} ·{" "}
        {PROPULSIONS[components.propulsion as keyof typeof PROPULSIONS]?.name ?? components.propulsion} ·{" "}
        {REACTORS[components.reactor as keyof typeof REACTORS]?.name ?? components.reactor}
      </div>
    </div>
  );
}

function TransitCard({ probe }: { probe: ProbeInTransit }) {
  const progress = probe.travelTimeSeconds > 0
    ? probe.elapsedSeconds / probe.travelTimeSeconds
    : 1;
  return (
    <div className="probe-card">
      <div className="probe-card-name">{probe.id}</div>
      <div className="probe-card-status">
        → {probe.destinationSystemId} ({fmtPercent(progress)})
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

export function ProbesColumn({ state }: { state: GameState }) {
  const allProbes: { name: string; system: string; components: { cpu: string; propulsion: string; reactor: string }; status: string }[] = [];
  const inTransit: ProbeInTransit[] = [];

  for (const sys of Object.values(state.systems)) {
    if (sys.mainProbe) {
      allProbes.push({
        name: sys.mainProbe.id,
        system: sys.name,
        components: sys.mainProbe.components,
        status: "Active",
      });
    }
    for (const p of sys.sentProbes) {
      inTransit.push(p);
    }
  }

  const constructingProbes = Object.values(state.systems).flatMap((sys) =>
    sys.constructionQueue.filter((c) => c.targetType === "probe"),
  );

  return (
    <div className="overview-col">
      <Panel label="Fleet" right={<span className="text-dim">{allProbes.length} probes</span>}>
        {allProbes.length === 0 && inTransit.length === 0 ? (
          <div className="empty-state">No probes deployed</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {allProbes.map((p) => (
              <ProbeCard key={p.name} {...p} />
            ))}
            {inTransit.map((p) => (
              <TransitCard key={p.id} probe={p} />
            ))}
          </div>
        )}
      </Panel>
      {constructingProbes.length > 0 && (
        <Panel label="Building">
          {constructingProbes.map((c) => (
            <div key={c.id} className="queue-item">
              <span className="queue-item-name">Probe</span>
              <div className="queue-item-progress">
                <div className="progress-bar">
                  <div
                    className="progress-bar-fill"
                    style={{ width: `${c.progress * 100}%` }}
                  />
                </div>
              </div>
              <span className="queue-item-detail">{fmtPercent(c.progress)}</span>
            </div>
          ))}
        </Panel>
      )}
    </div>
  );
}
