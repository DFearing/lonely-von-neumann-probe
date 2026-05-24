import type { SystemState } from "../../../simulation/state";
import type { PlayerAction } from "../../../simulation/actions";
import { TECH_TREE } from "../../../simulation/data/tech-tree";
import { getTechStatus, type TechStatus } from "../../../simulation/queries";
import { FONT_MONO } from "../../tokens";
import { fmt } from "../../format";
import { btnFlush } from "../../components/buttons";

const BRANCH_META: Record<string, { color: string; icon: string }> = {
  mining_efficiency: { color: "#5cc7ff", icon: "⛏" },
  mining_types: { color: "#3aa8e0", icon: "⛏" },
  energy_production: { color: "#ffcb47", icon: "⚡" },
  energy_types: { color: "#e0a830", icon: "⚡" },
  manufacturing_efficiency: { color: "#4cd8a8", icon: "⊟" },
  manufacturing_types: { color: "#38b890", icon: "⊟" },
  probe_cpu: { color: "#4ddbff", icon: "◇" },
  probe_propulsion: { color: "#6bc0e0", icon: "▷" },
  probe_reactors: { color: "#e8b830", icon: "⊙" },
  computing_speed: { color: "#b08bff", icon: "◊" },
  computing_architecture: { color: "#9070e0", icon: "◊" },
  communication: { color: "#ff9966", icon: "⟑" },
};

const STATUS_LABELS: Record<TechStatus, { label: string; color: string }> = {
  completed: { label: "✓ RESEARCHED", color: "#4cd8a8" },
  in_progress: { label: "◐ IN PROGRESS", color: "#b08bff" },
  available: { label: "○ AVAILABLE", color: "#4ddbff" },
  locked: { label: "◌ LOCKED", color: "#3d5572" },
};

function KV({
  k,
  v,
  color = "#d6e8f5",
}: {
  k: string;
  v: string;
  color?: string;
}) {
  return (
    <div>
      <div
        style={{
          fontFamily: FONT_MONO,
          fontSize: 8,
          color: "#6b87a3",
          letterSpacing: "0.16em",
          marginBottom: 2,
        }}
      >
        {k}
      </div>
      <div
        style={{
          fontFamily: FONT_MONO,
          fontSize: 12,
          color,
          fontWeight: 500,
        }}
      >
        {v}
      </div>
    </div>
  );
}

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
  const meta = BRANCH_META[tech.branchId];
  const branchColor = meta?.color ?? "#9ab4cf";
  const branchIcon = meta?.icon ?? "?";
  const statusInfo = STATUS_LABELS[status];

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
          gap: 10,
          marginBottom: 10,
        }}
      >
        <span
          style={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            border: `1.5px solid ${branchColor}`,
            background: `${branchColor}10`,
            color: branchColor,
            fontSize: 18,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            textShadow: `0 0 6px ${branchColor}60`,
            flexShrink: 0,
          }}
        >
          {branchIcon}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span
              style={{
                fontFamily: FONT_MONO,
                fontSize: 9,
                color: "#6b87a3",
                letterSpacing: "0.14em",
              }}
            >
              {tech.branchId.toUpperCase().replaceAll("_", " ")} · T{tech.tier}
            </span>
            <span
              style={{
                fontFamily: FONT_MONO,
                fontSize: 9,
                color: statusInfo.color,
              }}
            >
              {statusInfo.label}
            </span>
          </div>
          <div
            style={{
              fontSize: 15,
              color: "#d6e8f5",
              fontWeight: 500,
              marginTop: 2,
            }}
          >
            {tech.name}
          </div>
        </div>
      </div>

      <div
        style={{
          padding: "8px 10px",
          marginBottom: 10,
          background: `${branchColor}08`,
          borderLeft: `2px solid ${branchColor}`,
          fontSize: 12,
          color: "#d6e8f5",
          lineHeight: 1.4,
        }}
      >
        {(tech.effects.length > 1 ? tech.effects.slice(1) : tech.effects).map((effect, i) => (
          <div key={i} style={i > 0 ? { marginTop: 4 } : undefined}>
            {effect}
          </div>
        ))}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 8,
          marginBottom: 10,
        }}
      >
        <KV k="COST" v={`${fmt(tech.continuousCost * tech.researchTime)} TF`} color="#b08bff" />
        <KV
          k="PREREQ"
          v={(() => {
            const parts: string[] = [];
            if (tech.tier > 1) parts.push(`T${tech.tier - 1}`);
            for (const prereqId of tech.prerequisites) {
              const prereq = TECH_TREE[prereqId];
              if (prereq) parts.push(prereq.name);
            }
            return parts.length > 0 ? parts.join(", ") : "NONE";
          })()}
        />
      </div>

      <div style={{ display: "flex", gap: 6 }}>
        {status === "completed" && (
          <button
            style={{
              ...btnFlush(),
              flex: 1,
              color: "#4cd8a8",
              borderColor: "rgba(76,216,168,0.4)",
            }}
            disabled
          >
            ✓ COMPLETE
          </button>
        )}
        {status === "in_progress" && project && (() => {
          const queueIndex = system.researchQueue.filter(r => !r.completed).findIndex(r => r.id === project.id);
          const isFirst = queueIndex === 0;
          return (
            <>
              <button
                style={{
                  ...btnFlush(),
                  flex: 1,
                  color: isFirst ? "#b08bff" : "#4ddbff",
                  borderColor: isFirst ? "rgba(176,139,255,0.4)" : "rgba(77,219,255,0.4)",
                }}
                onClick={() =>
                  isFirst
                    ? dispatch({
                        type: "pause_research",
                        systemId: system.id,
                        projectId: project.id,
                      })
                    : dispatch({
                        type: "reorder_research",
                        systemId: system.id,
                        projectId: project.id,
                        newIndex: 0,
                      })
                }
              >
                {isFirst ? (project.paused ? "RESUME" : "PAUSE") : "START"}
              </button>
            </>
          );
        })()}
        {status === "available" && (
          <>
            <button
              style={{
                ...btnFlush(),
                color: "#4ddbff",
                borderColor: "rgba(77,219,255,0.4)",
                flex: 1,
              }}
              onClick={() =>
                dispatch({
                  type: "start_research",
                  systemId: system.id,
                  techId: tech.id,
                  priority: true,
                })
              }
            >
              START
            </button>
            <button
              style={{ ...btnFlush(), flex: 1 }}
              onClick={() =>
                dispatch({
                  type: "start_research",
                  systemId: system.id,
                  techId: tech.id,
                })
              }
            >
              + QUEUE
            </button>
          </>
        )}
        {status === "locked" && (
          <button style={{ ...btnFlush(), flex: 1, opacity: 0.5 }} disabled>
            PREREQ LOCKED
          </button>
        )}
      </div>
    </div>
  );
}
