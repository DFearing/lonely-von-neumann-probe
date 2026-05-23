import type { SystemState } from "../../../simulation/state";
import type { PlayerAction } from "../../../simulation/actions";
import { TECH_TREE } from "../../../simulation/data/tech-tree";
import { getTechStatus } from "../../../simulation/queries";
import { Panel } from "../../components/Panel";
import { fmt } from "../../format";

export function TechDetail({
  system,
  techId,
  dispatch,
}: {
  system: SystemState;
  techId: string;
  dispatch: (action: PlayerAction) => void;
}) {
  const tech = TECH_TREE[techId];
  if (!tech) return null;

  const status = getTechStatus(system, techId);
  const project = system.researchQueue.find((r) => r.techId === techId);

  return (
    <Panel label="Tech Detail">
      <div className="research-detail">
        <div className="research-detail-name">{tech.name}</div>
        <div className="text-secondary" style={{ fontSize: 11 }}>
          {tech.branchId} · Tier {tech.tier}
        </div>

        <div>
          <div className="section-label">Effects</div>
          {tech.effects.map((e, i) => (
            <div key={i} className="text-secondary" style={{ fontSize: 12 }}>
              • {e}
            </div>
          ))}
        </div>

        <div>
          <div className="section-label">Cost</div>
          <div className="stat-row">
            <span className="stat-label">Initial</span>
            <span className="stat-value">
              {fmt(tech.initialCost.materials)} M · {fmt(tech.initialCost.energy)} E
            </span>
          </div>
          <div className="stat-row">
            <span className="stat-label">Continuous</span>
            <span className="stat-value">{tech.continuousCost} compute/s</span>
          </div>
        </div>

        {status === "completed" && (
          <div className="text-success" style={{ fontSize: 12 }}>✓ Completed</div>
        )}

        {status === "in_progress" && project && (
          <div style={{ display: "flex", gap: 6 }}>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() =>
                dispatch({
                  type: project.paused ? "pause_research" : "pause_research",
                  systemId: system.id,
                  projectId: project.id,
                })
              }
            >
              {project.paused ? "Resume" : "Pause"}
            </button>
            <button
              className="btn btn-danger btn-sm"
              onClick={() =>
                dispatch({
                  type: "cancel_research",
                  systemId: system.id,
                  projectId: project.id,
                })
              }
            >
              Cancel
            </button>
          </div>
        )}

        {status === "available" && (
          <button
            className="btn btn-primary"
            disabled={
              system.resources.materials < tech.initialCost.materials ||
              system.resources.energy < tech.initialCost.energy
            }
            onClick={() =>
              dispatch({
                type: "start_research",
                systemId: system.id,
                techId: tech.id,
              })
            }
          >
            Start Research ({fmt(tech.initialCost.materials)}M, {fmt(tech.initialCost.energy)}E)
          </button>
        )}
      </div>
    </Panel>
  );
}
