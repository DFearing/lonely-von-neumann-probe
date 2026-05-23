import type { SystemState } from "../../../simulation/state";
import type { PlayerAction } from "../../../simulation/actions";
import { Panel } from "../../components/Panel";
import { fmtPercent } from "../../format";

export function ResearchQueue({
  system,
  dispatch,
}: {
  system: SystemState;
  dispatch: (action: PlayerAction) => void;
}) {
  const active = system.researchQueue.filter((r) => !r.completed);

  return (
    <Panel label="Research Queue">
      {active.length === 0 ? (
        <div className="empty-state">No active research</div>
      ) : (
        <div>
          {active.map((project) => (
            <div key={project.id} className="queue-item">
              <span className="queue-item-name">
                {project.name}
                {project.paused && (
                  <span className="text-warning" style={{ marginLeft: 4 }}>
                    (paused)
                  </span>
                )}
              </span>
              <div className="queue-item-progress">
                <div className="progress-bar">
                  <div
                    className={`progress-bar-fill${project.paused ? " progress-bar-fill--warning" : ""}`}
                    style={{ width: `${project.progress * 100}%` }}
                  />
                </div>
              </div>
              <span className="queue-item-detail">{fmtPercent(project.progress)}</span>
              <button
                className="btn-icon"
                style={{ marginLeft: 4, width: 20, height: 20, fontSize: 9 }}
                onClick={() =>
                  dispatch({
                    type: "cancel_research",
                    systemId: system.id,
                    projectId: project.id,
                  })
                }
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}
