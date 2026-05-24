import type { SystemState } from "../../../simulation/state";
import { MAX_TIER } from "../../../simulation/state";
import {
  BRANCH_GROUPS,
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
  mining_efficiency: { label: "Output", color: "#5cc7ff", icon: "⛏" },
  mining_types: { label: "Structures", color: "#3aa8e0", icon: "⛏" },
  energy_production: { label: "Output", color: "#ffcb47", icon: "⚡" },
  energy_types: { label: "Structures", color: "#e0a830", icon: "⚡" },
  manufacturing_efficiency: { label: "Output", color: "#4cd8a8", icon: "⊟" },
  manufacturing_types: { label: "Structures", color: "#38b890", icon: "⊟" },
  probe_cpu: { label: "Processor", color: "#4ddbff", icon: "◇" },
  probe_propulsion: { label: "Propulsion", color: "#6bc0e0", icon: "▷" },
  probe_reactors: { label: "Reactor", color: "#e8b830", icon: "⊙" },
  computing_speed: { label: "Speed", color: "#b08bff", icon: "◊" },
  computing_architecture: { label: "Architecture", color: "#9070e0", icon: "◊" },
  communication: { label: "Range", color: "#ff9966", icon: "⟑" },
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

function formatTechLabel(name: string): string {
  const match = name.match(/^Research Phase (\d+)\/\d+ for .+$/);
  if (match) return `Phase ${match[1]}`;
  return name;
}

function TechNode({
  tech,
  status,
  branchColor,
  branchIcon,
  isSelected,
  onSelect,
  onQueue,
  queuePosition,
}: {
  tech: TechDefinition;
  status: TechStatus;
  branchColor: string;
  branchIcon: string;
  isSelected: boolean;
  onSelect: () => void;
  onQueue: () => void;
  queuePosition: number | null;
}) {
  const look = STATUS_LOOK[status];
  const isCompleted = status === "completed";

  return (
    <div
      onClick={onSelect}
      onDoubleClick={() => {
        if (status === "available") onQueue();
      }}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-start",
        gap: 8,
        cursor: "pointer",
        padding: "12px 2px 12px",
        width: "100%",
        height: 74,
        boxSizing: "border-box",
        overflow: "hidden",
      }}
    >
      <div style={{ position: "relative" }}>
        <div
          style={{
            width: 34,
            height: 34,
            borderRadius: "50%",
            background: isCompleted ? "rgba(76,216,168,0.35)" : look.bg,
            border: `1.5px solid ${isSelected ? "#4ddbff" : isCompleted ? "#4cd8a8" : look.ring}`,
            boxShadow: isSelected
              ? "0 0 0 3px rgba(77,219,255,0.18), 0 0 18px rgba(77,219,255,0.4)"
              : isCompleted
                ? "0 0 8px rgba(76,216,168,0.4)"
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
              color: isCompleted ? "#4cd8a8" : branchColor,
              opacity: status === "locked" ? 0.5 : 1,
              textShadow:
                isCompleted
                  ? "0 0 6px rgba(76,216,168,0.6)"
                  : status === "in_progress"
                    ? `0 0 6px ${branchColor}80`
                    : "none",
            }}
          >
            {isCompleted ? "✓" : branchIcon}
          </span>
        </div>
        {queuePosition !== null && (
          <span
            style={{
              position: "absolute",
              top: -4,
              right: -6,
              fontFamily: FONT_MONO,
              fontSize: 8,
              fontWeight: 700,
              color: "#0a1929",
              background: "#b08bff",
              borderRadius: "50%",
              width: 14,
              height: 14,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              lineHeight: 1,
            }}
          >
            {queuePosition}
          </span>
        )}
      </div>
      <span
        style={{
          fontFamily: FONT_MONO,
          fontSize: 9,
          color:
            isCompleted
              ? "#4cd8a8"
              : status === "locked"
                ? "#5d7a99"
                : isSelected
                  ? "#d6e8f5"
                  : "#9ab4cf",
          textAlign: "center",
          letterSpacing: "0.04em",
          lineHeight: 1.1,
          maxWidth: "100%",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {formatTechLabel(tech.name)}
      </span>
    </div>
  );
}

export function TechWeb({
  system,
  selectedTech,
  onSelect,
  onQueue,
}: {
  system: SystemState;
  selectedTech: string | null;
  onSelect: (techId: string) => void;
  onQueue: (techId: string) => void;
}) {
  const queueMap = new Map<string, number>();
  system.researchQueue.forEach((project, idx) => {
    queueMap.set(project.techId, idx + 1);
  });

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
          overflowX: "auto",
          padding: "4px 8px 8px",
        }}
      >
        {/* Tier headers */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `140px repeat(${MAX_TIER}, 100px)`,
            gap: 0,
            marginBottom: 8,
          }}
        >
          <div />
          {Array.from({ length: MAX_TIER }, (_, i) => i + 1).map((tier) => (
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
              T{tier}
            </div>
          ))}
        </div>

        {/* Branch rows grouped */}
        {BRANCH_GROUPS.map((group) => (
          <div key={group.id}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: `140px repeat(${MAX_TIER}, 100px)`,
                gap: 0,
                padding: "10px 0 2px",
              }}
            >
              <div
                style={{
                  fontFamily: FONT_MONO,
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#9ab4cf",
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  padding: "0 12px",
                  textAlign: "right",
                }}
              >
                {group.label}
              </div>
            </div>

            {group.branches.map((branchId, branchIdx) => {
              const meta = BRANCH_META[branchId];
              if (!meta) return null;
              const techs = techsInBranch(branchId);
              const bgOpacity = branchIdx % 2 === 0 ? 0.025 : 0.008;

              return (
                <div
                  key={branchId}
                  style={{
                    display: "grid",
                    gridTemplateColumns: `140px repeat(${MAX_TIER}, 100px)`,
                    gap: 0,
                    background: `${meta.color}${Math.round(bgOpacity * 255).toString(16).padStart(2, "0")}`,
                    alignItems: "center",
                    minHeight: 64,
                  }}
                >
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
                      position: "relative",
                      top: -8,
                    }}
                  >
                    {meta.label}
                  </div>

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
                        onQueue={() => onQueue(tech.id)}
                        queuePosition={queueMap.get(tech.id) ?? null}
                      />
                    );
                  })}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </Panel>
  );
}
