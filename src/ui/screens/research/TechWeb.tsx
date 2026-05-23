import type { SystemState } from "../../../simulation/state";
import {
  TECH_BRANCHES,
  techsInBranch,
  type TechDefinition,
} from "../../../simulation/data/tech-tree";
import { getTechStatus, type TechStatus } from "../../../simulation/queries";
import { Panel } from "../../components/Panel";
import { FONT_MONO } from "../../tokens";

const BRANCH_META: Record<
  string,
  { label: string; color: string; icon: string }
> = {
  mining: { label: "Mining Efficiency", color: "#5cc7ff", icon: "⛏" },
  energy: { label: "Energy Production", color: "#ffcb47", icon: "⚡" },
  manufacturing: { label: "Manufacturing", color: "#4cd8a8", icon: "⊟" },
  probe_components: { label: "Probe Components", color: "#4ddbff", icon: "◇" },
  computing: { label: "Computing", color: "#b08bff", icon: "◊" },
  communication: { label: "Communication", color: "#ff9966", icon: "⟑" },
};

const STATUS_LOOK: Record<
  TechStatus,
  { dot: string; ring: string; bg: string }
> = {
  completed: {
    dot: "#4cd8a8",
    ring: "rgba(76,216,168,0.55)",
    bg: "rgba(76,216,168,0.10)",
  },
  in_progress: {
    dot: "#b08bff",
    ring: "rgba(176,139,255,0.65)",
    bg: "rgba(176,139,255,0.12)",
  },
  available: {
    dot: "#4ddbff",
    ring: "rgba(77,219,255,0.45)",
    bg: "rgba(77,219,255,0.06)",
  },
  locked: {
    dot: "#3d5572",
    ring: "rgba(110,200,255,0.12)",
    bg: "rgba(8,16,30,0.5)",
  },
};

function TechNode({
  tech,
  status,
  branchColor,
  branchIcon,
  isSelected,
  onSelect,
}: {
  tech: TechDefinition;
  status: TechStatus;
  branchColor: string;
  branchIcon: string;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const look = STATUS_LOOK[status];

  return (
    <div
      onClick={onSelect}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 6,
        cursor: "pointer",
        padding: "8px 4px",
      }}
    >
      <div
        style={{
          width: 34,
          height: 34,
          borderRadius: "50%",
          background: look.bg,
          border: `1.5px solid ${isSelected ? "#4ddbff" : look.ring}`,
          boxShadow: isSelected
            ? "0 0 0 3px rgba(77,219,255,0.18), 0 0 18px rgba(77,219,255,0.4)"
            : status === "in_progress"
              ? `0 0 12px ${look.ring}`
              : "none",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "box-shadow .15s, border-color .15s, transform .15s",
          transform: isSelected ? "scale(1.1)" : "scale(1)",
        }}
      >
        <span
          style={{
            fontSize: 14,
            color: branchColor,
            opacity: status === "locked" ? 0.5 : 1,
            textShadow:
              status === "completed" || status === "in_progress"
                ? `0 0 6px ${branchColor}80`
                : "none",
          }}
        >
          {branchIcon}
        </span>
      </div>
      <span
        style={{
          fontFamily: FONT_MONO,
          fontSize: 9,
          color:
            status === "locked"
              ? "#5d7a99"
              : isSelected
                ? "#d6e8f5"
                : "#9ab4cf",
          textAlign: "center",
          letterSpacing: "0.04em",
          lineHeight: 1.3,
          maxWidth: 100,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {tech.name}
      </span>
    </div>
  );
}

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
    <Panel
      label="TECHNOLOGY"
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
        minWidth: 0,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          overflowX: "hidden",
          padding: "4px 8px 8px",
        }}
      >
        {/* Tier headers */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "140px repeat(4, 1fr)",
            gap: 0,
            marginBottom: 8,
          }}
        >
          <div />
          {[1, 2, 3, 4].map((tier) => (
            <div
              key={tier}
              style={{
                textAlign: "center",
                fontFamily: FONT_MONO,
                fontSize: 11,
                fontWeight: 600,
                color: "#9ab4cf",
                letterSpacing: "0.22em",
                padding: "4px 0",
              }}
            >
              TIER {tier}
            </div>
          ))}
        </div>

        {/* Branch rows */}
        {TECH_BRANCHES.map((branchId, branchIdx) => {
          const meta = BRANCH_META[branchId];
          if (!meta) return null;
          const techs = techsInBranch(branchId);
          const bgOpacity = branchIdx % 2 === 0 ? 0.025 : 0.008;

          return (
            <div
              key={branchId}
              style={{
                display: "grid",
                gridTemplateColumns: "140px repeat(4, 1fr)",
                gap: 0,
                background: `rgba(${meta.color === "#5cc7ff" ? "92,199,255" : meta.color === "#ffcb47" ? "255,203,71" : meta.color === "#4cd8a8" ? "76,216,168" : meta.color === "#4ddbff" ? "77,219,255" : meta.color === "#b08bff" ? "176,139,255" : "255,153,102"},${bgOpacity})`,
                alignItems: "center",
                minHeight: 80,
              }}
            >
              {/* Branch label */}
              <div
                style={{
                  fontFamily: FONT_MONO,
                  fontSize: 10,
                  color: meta.color,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  padding: "0 12px",
                  whiteSpace: "nowrap",
                  textAlign: "right",
                }}
              >
                {meta.label}
              </div>

              {/* Tech nodes */}
              {techs.map((tech) => {
                const status = getTechStatus(system, tech.id);
                return (
                  <TechNode
                    key={tech.id}
                    tech={tech}
                    status={status}
                    branchColor={meta.color}
                    branchIcon={meta.icon}
                    isSelected={selectedTech === tech.id}
                    onSelect={() => onSelect(tech.id)}
                  />
                );
              })}
            </div>
          );
        })}
      </div>
    </Panel>
  );
}
