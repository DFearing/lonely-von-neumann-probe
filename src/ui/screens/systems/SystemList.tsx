import type { GameState } from "../../../simulation/state";
import { Panel } from "../../components/Panel";
import { fmt } from "../../format";

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
    <Panel label="Known Systems" flush>
      {systemIds.map((id) => {
        const sys = state.systems[id];
        if (!sys) return null;
        const isSelected = selectedSystem === id;
        const hasProbe = sys.mainProbe !== null;

        return (
          <div
            key={id}
            className={`save-slot${isSelected ? "" : ""}`}
            onClick={() => onSelect(id)}
            style={{
              background: isSelected ? "var(--accent-dim)" : undefined,
              borderLeft: isSelected ? "2px solid var(--accent)" : "2px solid transparent",
            }}
          >
            <div>
              <div className="save-slot-name">
                {hasProbe && <span className="text-success" style={{ marginRight: 4 }}>●</span>}
                {sys.name}
              </div>
              <div className="save-slot-info">
                {sys.starType} star · {fmt(sys.distanceFromOrigin, 2)} ly
              </div>
            </div>
          </div>
        );
      })}
    </Panel>
  );
}
