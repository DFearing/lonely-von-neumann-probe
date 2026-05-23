import type { SystemState } from "../../../simulation/state";
import type { PlayerAction } from "../../../simulation/actions";
import { TECH_TREE } from "../../../simulation/data/tech-tree";
import { getTechStatus, type TechStatus } from "../../../simulation/queries";
import { FONT_MONO } from "../../tokens";
import { fmt, fmtYears } from "../../format";
import { btnFlush } from "../../components/buttons";

const BRANCH_META: Record<string, { color: string; icon: string }> = {
  mining: { color: "#5cc7ff", icon: "⛏" },
  energy: { color: "#ffcb47", icon: "⚡" },
  manufacturing: { color: "#4cd8a8", icon: "⊟" },
  probe_components: { color: "#4ddbff", icon: "◇" },
  computing: { color: "#b08bff", icon: "◊" },
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
              {tech.branchId.toUpperCase().replace("_", " ")} · T{tech.tier}
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
        {tech.effects.join("; ")}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 8,
          marginBottom: 10,
        }}
      >
        <KV k="COMPUTE" v={`${tech.continuousCost} TF/s`} color="#b08bff" />
        <KV k="DURATION" v={fmtYears(tech.researchTime)} />
        <KV k="COST" v={`${fmt(tech.initialCost.materials)} t · ${fmt(tech.initialCost.energy)} MW`} />
        <KV k="PREREQ" v={tech.tier === 1 ? "NONE" : `T${tech.tier - 1}`} />
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
        {status === "in_progress" && project && (
          <>
            <button
              style={{
                ...btnFlush(),
                flex: 1,
                color: "#b08bff",
                borderColor: "rgba(176,139,255,0.4)",
              }}
              onClick={() =>
                dispatch({
                  type: "pause_research",
                  systemId: system.id,
                  projectId: project.id,
                })
              }
            >
              {project.paused ? "RESUME" : "PAUSE"}
            </button>
            <button
              style={{ ...btnFlush(), flex: 1 }}
              onClick={() =>
                dispatch({
                  type: "cancel_research",
                  systemId: system.id,
                  projectId: project.id,
                })
              }
            >
              CANCEL
            </button>
          </>
        )}
        {status === "available" && (
          <>
            <button
              style={{
                ...btnFlush(),
                color: "#4ddbff",
                borderColor: "rgba(77,219,255,0.4)",
                flex: 1,
              }}
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
              START
            </button>
            <button style={{ ...btnFlush(), flex: 1 }} disabled>
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
