import type { SystemState } from "../../../simulation/state";
import type { PlayerAction } from "../../../simulation/actions";
import { FONT_MONO } from "../../tokens";
import { fmtYears } from "../../format";

function miniBtn(): React.CSSProperties {
  return {
    width: 18,
    height: 18,
    padding: 0,
    borderRadius: 2,
    background: "transparent",
    border: "1px solid rgba(110,200,255,0.18)",
    color: "#9ab4cf",
    cursor: "pointer",
    fontFamily: FONT_MONO,
    fontSize: 9,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
  };
}

export function ResearchQueue({
  system,
  dispatch,
}: {
  system: SystemState;
  dispatch: (action: PlayerAction) => void;
}) {
  const active = system.researchQueue.filter((r) => !r.completed);

  return (
    <div
      style={{
        padding: "14px 16px",
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
            fontSize: 10,
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
        <span style={{ fontFamily: FONT_MONO, fontSize: 9, color: "#6b87a3" }}>
          {active.length} QUEUED
        </span>
      </div>

      {active.length === 0 ? (
        <div
          style={{
            fontFamily: FONT_MONO,
            fontSize: 10,
            color: "#6b87a3",
            textAlign: "center",
            padding: "12px 0",
          }}
        >
          queue empty · click + QUEUE on any tech
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {active.map((project, i) => (
            <div
              key={project.id}
              style={{
                display: "grid",
                gridTemplateColumns: "18px 1fr 60px 48px",
                gap: 8,
                alignItems: "center",
                padding: "6px 8px",
                background: "rgba(8,16,30,0.5)",
                border: "1px solid rgba(110,200,255,0.10)",
              }}
            >
              <span
                style={{
                  fontFamily: FONT_MONO,
                  fontSize: 9,
                  color: "#6b87a3",
                }}
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 12,
                    color: "#d6e8f5",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {project.name}
                  {project.paused && (
                    <span style={{ color: "#ffcb47", marginLeft: 6, fontSize: 9 }}>
                      PAUSED
                    </span>
                  )}
                </div>
                <div
                  style={{
                    fontFamily: FONT_MONO,
                    fontSize: 9,
                    color: "#6b87a3",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {project.branchId}
                </div>
              </div>
              <span
                style={{
                  fontFamily: FONT_MONO,
                  fontSize: 10,
                  color: "#9ab4cf",
                  textAlign: "right",
                }}
              >
                ~{fmtYears(project.continuousCost > 0 ? project.continuousCost * 100 : 0)}
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
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
