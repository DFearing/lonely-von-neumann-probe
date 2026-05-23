import type { GameState, SystemState } from "../../../simulation/state";
import type { PlayerAction } from "../../../simulation/actions";
import { Panel } from "../../components/Panel";
import { fmt, fmtRate } from "../../format";

function ColonizedDetail({ system }: { system: SystemState }) {
  const { resources, resourceRates, structures } = system;
  const minerCount = structures.miners.filter((s) => s.constructionProgress >= 1).length;
  const reactorCount = structures.reactors.filter((s) => s.constructionProgress >= 1).length;
  const printerCount = structures.printers.filter((s) => s.constructionProgress >= 1).length;

  return (
    <div className="system-detail">
      <div>
        <div className="section-label">Resources</div>
        <div className="stat-row">
          <span className="stat-label">Materials</span>
          <span className="stat-value">{fmt(resources.materials)} ({fmtRate(resourceRates.materialsPerSecond)})</span>
        </div>
        <div className="stat-row">
          <span className="stat-label">Energy</span>
          <span className="stat-value">{fmt(resources.energy)} ({fmtRate(resourceRates.energyPerSecond)})</span>
        </div>
        <div className="stat-row">
          <span className="stat-label">Computing</span>
          <span className="stat-value">{resourceRates.computingPowerPerSecond.toFixed(1)}/s</span>
        </div>
      </div>
      <div>
        <div className="section-label">Infrastructure</div>
        <div className="stat-row">
          <span className="stat-label">Miners</span>
          <span className="stat-value">{minerCount}</span>
        </div>
        <div className="stat-row">
          <span className="stat-label">Reactors</span>
          <span className="stat-value">{reactorCount}</span>
        </div>
        <div className="stat-row">
          <span className="stat-label">Printers</span>
          <span className="stat-value">{printerCount}</span>
        </div>
      </div>
    </div>
  );
}

function UnvisitedDetail({
  system,
}: {
  system: SystemState;
}) {
  return (
    <div className="system-detail">
      <div className="stat-row">
        <span className="stat-label">Distance</span>
        <span className="stat-value">{fmt(system.distanceFromOrigin, 2)} ly</span>
      </div>
      <div className="stat-row">
        <span className="stat-label">Star Type</span>
        <span className="stat-value">{system.starType}</span>
      </div>
      <div className="stat-row">
        <span className="stat-label">Richness</span>
        <span className="stat-value">
          {system.scanned ? `${system.resourceRichness}x` : "Unknown"}
        </span>
      </div>
      <div className="stat-row">
        <span className="stat-label">Status</span>
        <span className="stat-value">{system.scanned ? "Scanned" : "Unvisited"}</span>
      </div>
      {!system.mainProbe && (
        <div style={{ marginTop: 8 }}>
          <div className="text-dim" style={{ fontSize: 11, marginBottom: 4 }}>
            No probe in this system. Build and send one from your current system.
          </div>
        </div>
      )}
    </div>
  );
}

export function SystemDetail({
  state,
  systemId,
  dispatch,
}: {
  state: GameState;
  systemId: string;
  dispatch: (action: PlayerAction) => void;
}) {
  const system = state.systems[systemId];
  const currentSystem = state.systems[state.currentSystemId];
  if (!system) return null;
  if (!currentSystem) return null;

  const isColonized = system.mainProbe !== null;

  return (
    <Panel label={system.name}>
      {isColonized ? (
        <ColonizedDetail system={system} />
      ) : (
        <UnvisitedDetail system={system} />
      )}
      {systemId !== state.currentSystemId && isColonized && (
        <div style={{ marginTop: 12 }}>
          <button
            className="btn btn-primary"
            onClick={() => dispatch({ type: "switch_system", systemId })}
          >
            Switch to {system.name}
          </button>
        </div>
      )}
    </Panel>
  );
}
