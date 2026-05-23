import type { SystemState } from "../../../simulation/state";
import { TECH_BRANCHES, techsInBranch } from "../../../simulation/data/tech-tree";
import { getTechStatus, type TechStatus } from "../../../simulation/queries";

function statusClass(status: TechStatus, isSelected: boolean): string {
  let cls = `tech-node tech-node--${status}`;
  if (isSelected) cls += " tech-node--selected";
  return cls;
}

const BRANCH_LABELS: Record<string, string> = {
  mining: "Mining",
  energy: "Energy",
  manufacturing: "Mfg",
  probe_components: "Probes",
  computing: "Compute",
  communication: "Comms",
};

export function TechWeb({
  system,
  selectedTech,
  onSelect,
}: {
  system: SystemState;
  selectedTech: string | null;
  onSelect: (techId: string) => void;
}) {
  return (
    <div className="tech-grid">
      <div />
      {[1, 2, 3, 4].map((tier) => (
        <div key={tier} className="tech-branch-label" style={{ justifyContent: "center" }}>
          Tier {tier}
        </div>
      ))}

      {TECH_BRANCHES.map((branchId) => {
        const techs = techsInBranch(branchId);
        return [
          <div key={`label-${branchId}`} className="tech-branch-label">
            {BRANCH_LABELS[branchId] ?? branchId}
          </div>,
          ...techs.map((tech) => {
            const status = getTechStatus(system, tech.id);
            return (
              <div
                key={tech.id}
                className={statusClass(status, selectedTech === tech.id)}
                onClick={() => {
                  if (status !== "locked") onSelect(tech.id);
                }}
              >
                <div className="tech-node-name">{tech.name}</div>
                <div className="tech-node-tier">T{tech.tier}</div>
              </div>
            );
          }),
        ];
      })}
    </div>
  );
}
