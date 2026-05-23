import type { ResearchProject } from "../../../simulation/state";
import { Panel } from "../../components/Panel";
import { fmtPercent, fmtTime } from "../../format";

export function ActiveBanner({
  project,
  computeRate,
}: {
  project: ResearchProject;
  computeRate: number;
}) {
  const remaining = project.continuousCost > 0 && computeRate > 0
    ? ((1 - project.progress) * project.continuousCost * 100) / computeRate
    : 0;

  return (
    <Panel label="Active Research">
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>
            {project.name}
          </div>
          <div className="progress-bar progress-bar--lg" style={{ marginBottom: 4 }}>
            <div
              className="progress-bar-fill"
              style={{ width: `${project.progress * 100}%` }}
            />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span className="text-secondary" style={{ fontSize: 11 }}>
              {fmtPercent(project.progress)} complete
            </span>
            <span className="text-dim" style={{ fontSize: 11 }}>
              ETA: {remaining > 0 ? fmtTime(remaining) : "—"}
            </span>
          </div>
        </div>
      </div>
    </Panel>
  );
}
