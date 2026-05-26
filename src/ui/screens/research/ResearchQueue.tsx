import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faXmark } from "@fortawesome/free-solid-svg-icons";
import type { SystemState } from "../../../simulation/state";
import type { PlayerAction } from "../../../simulation/actions";
import { TECH_TREE } from "../../../simulation/data/tech-tree";
import { BRANCH_META } from "../../data/branch-meta";
import { FONT_MONO } from "../../tokens";
import { fmtCycles } from "../../format";

function miniBtn(): React.CSSProperties {
  return {
    width: 24,
    height: 24,
    padding: 0,
    borderRadius: 2,
    background: "transparent",
    border: "1px solid rgba(110,200,255,0.18)",
    color: "#9ab4cf",
    cursor: "pointer",
    fontFamily: FONT_MONO,
    fontSize: 11,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
  };
}

export function ResearchQueue({
  system,
  dispatch,
  onSelect,
  selectedTech,
}: {
  system: SystemState;
  dispatch: (action: PlayerAction) => void;
  onSelect: (techId: string) => void;
  selectedTech: string | null;
}) {
  const active = system.researchQueue.filter((r) => !r.completed);
  const computeRate = system.resourceRates.computingPowerPerSecond;

  function estimateSeconds(project: typeof active[number]): number {
    const techDef = TECH_TREE[project.techId];
    if (!techDef) return 0;
    const required = project.continuousCost;
    if (required <= 0 || computeRate <= 0) return 0;
    const effectiveRate = Math.min(computeRate, required) / required;
    return (1 - project.progress) * techDef.researchTime / effectiveRate;
  }

  const totalRemaining = active.reduce((sum, project) => sum + estimateSeconds(project), 0);

  return (
    <div
      style={{
        padding: "18px 20px",
        borderBottom: "1px solid rgba(110,200,255,0.10)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 10,
        }}
      >
        <span
          style={{
            fontFamily: FONT_MONO,
            fontSize: 12,
            color: "#4ddbff",
            letterSpacing: "0.18em",
            fontWeight: 600,
          }}
        >
          QUEUE
        </span>
        <span
          style={{
            flex: 1,
            height: 1,
            background: "rgba(110,200,255,0.10)",
          }}
        />
        <span style={{ fontFamily: FONT_MONO, fontSize: 11, color: "#6b87a3" }}>
          {active.length} QUEUED
          {active.length > 0 && (
            <span style={{ color: "#9ab4cf", marginLeft: 6 }}>
              ~{fmtCycles(totalRemaining)}
            </span>
          )}
        </span>
      </div>

      {active.length === 0 ? (
        <div
          style={{
            fontFamily: FONT_MONO,
            fontSize: 12,
            color: "#6b87a3",
            textAlign: "center",
            padding: "14px 0",
          }}
        >
          double click a technology to queue
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {active.map((project, i) => (
            <div
              key={project.id}
              onClick={() => onSelect(project.techId)}
              style={{
                display: "grid",
                gridTemplateColumns: "22px 1fr 70px 48px",
                gap: 10,
                alignItems: "center",
                padding: "8px 10px",
                cursor: "pointer",
                background: selectedTech === project.techId
                  ? "rgba(77,219,255,0.08)"
                  : `${BRANCH_META[project.branchId]?.color ?? "#4ddbff"}0a`,
                borderLeft: `3px solid ${BRANCH_META[project.branchId]?.color ?? "#4ddbff"}`,
                borderTop: selectedTech === project.techId ? "1px solid rgba(77,219,255,0.35)" : "1px solid rgba(110,200,255,0.10)",
                borderRight: selectedTech === project.techId ? "1px solid rgba(77,219,255,0.35)" : "1px solid rgba(110,200,255,0.10)",
                borderBottom: selectedTech === project.techId ? "1px solid rgba(77,219,255,0.35)" : "1px solid rgba(110,200,255,0.10)",
              }}
            >
              <span
                style={{
                  fontFamily: FONT_MONO,
                  fontSize: 11,
                  color: "#6b87a3",
                }}
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 14,
                    color: "#d6e8f5",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {project.name}
                  {project.paused && (
                    <span style={{ color: "#ffcb47", marginLeft: 6, fontSize: 11 }}>
                      PAUSED
                    </span>
                  )}
                </div>
                <div
                  style={{
                    fontFamily: FONT_MONO,
                    fontSize: 11,
                    color: "#6b87a3",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {project.branchId.replaceAll("_", " ")}
                </div>
              </div>
              <span
                style={{
                  fontFamily: FONT_MONO,
                  fontSize: 12,
                  color: "#9ab4cf",
                  textAlign: "right",
                }}
              >
                ~{fmtCycles(estimateSeconds(project))}
              </span>
              <div style={{ display: "flex", gap: 2, justifyContent: "flex-end" }}>
                <button
                  style={miniBtn()}
                  onClick={(e) => {
                    e.stopPropagation();
                    dispatch({
                      type: "cancel_research",
                      systemId: system.id,
                      projectId: project.id,
                    });
                  }}
                >
                  <FontAwesomeIcon icon={faXmark} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
