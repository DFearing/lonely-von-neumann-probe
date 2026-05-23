import type { SystemState, StructureType } from "../../../simulation/state";
import type { PlayerAction } from "../../../simulation/actions";
import type { ViewId } from "../../shell/Sidebar";
import { STRUCTURES } from "../../../simulation/data/structures";
import type { StructureDefinition } from "../../../simulation/data/structures";
import { getAvailableStructures, getTechStatus } from "../../../simulation/queries";
import { TECH_TREE, techsInBranch } from "../../../simulation/data/tech-tree";
import { calculateRates } from "../../../simulation/rates";
import { Panel } from "../../components/Panel";
import { HeaderAddButton } from "./HeaderAddButton";
import { fmt, fmtTime } from "../../format";
import { FONT_MONO } from "../../tokens";

type CategoryId = "miners" | "reactors" | "printers";

interface CategoryConfig {
  structureType: StructureType;
  label: string;
  accent: string;
  icon: string;
  description: string;
  techBranch: string;
  formatSummaryRate: (rate: number) => string;
}

const CATEGORY_CONFIGS: Record<CategoryId, CategoryConfig> = {
  miners: {
    structureType: "miner",
    label: "MINERS",
    accent: "#5cc7ff",
    icon: "⛏",
    description: "Extract Materials",
    techBranch: "mining",
    formatSummaryRate: (rate) => `+${rate.toFixed(1)} t/s`,
  },
  reactors: {
    structureType: "reactor",
    label: "REACTORS",
    accent: "#ffcb47",
    icon: "⚡",
    description: "Generate Energy",
    techBranch: "energy",
    formatSummaryRate: (rate) => `+${rate.toFixed(1)} MW/s`,
  },
  printers: {
    structureType: "printer",
    label: "PRINTERS",
    accent: "#4cd8a8",
    icon: "⊟",
    description: "Build structures & probes",
    techBranch: "manufacturing",
    formatSummaryRate: (rate) => `${rate.toFixed(1)}× speed`,
  },
};

function getNextUpgradeTech(
  system: SystemState,
  branchId: string,
): { name: string; status: string; effect: string } | null {
  const techs = techsInBranch(branchId);
  for (const tech of techs) {
    const status = getTechStatus(system, tech.id);
    if (status === "in_progress") {
      return {
        name: tech.name,
        status: "researching",
        effect: tech.effects[0] ?? "",
      };
    }
    if (status === "available") {
      return {
        name: tech.name,
        status: "available",
        effect: tech.effects[0] ?? "",
      };
    }
    if (status === "locked") {
      return {
        name: tech.name,
        status: "locked",
        effect: tech.effects[0] ?? "",
      };
    }
  }
  return null;
}

function computeSummaryRate(
  system: SystemState,
  category: CategoryId,
): number {
  const rates = calculateRates(system);
  switch (category) {
    case "miners":
      return rates.materialsPerSecond;
    case "reactors":
      return rates.energyPerSecond;
    case "printers": {
      let total = 0;
      for (const p of system.structures.printers) {
        if (p.active && p.constructionProgress >= 1) {
          total += p.productionRate;
        }
      }
      if (system.mainProbe) {
        total += system.mainProbe.internalPrinterSpeed;
      }
      return total;
    }
  }
}

function formatVariantSpec(
  def: StructureDefinition,
  category: CategoryId,
): string {
  if (category === "miners") {
    return `+${def.productionRate.toFixed(1)} t/s`;
  }
  if (category === "reactors") {
    const opCost = def.operatingCost > 0 ? ` · −${def.operatingCost.toFixed(1)} MW op` : "";
    return `+${def.productionRate} MW/s${opCost}`;
  }
  return `${def.productionRate.toFixed(1)}× speed`;
}

function formatVariantCost(def: StructureDefinition): string {
  return `${fmt(def.cost.materials)} t · ${fmt(def.cost.energy)} MW`;
}

export function StructureColumn({
  system,
  category,
  dispatch,
  onNavigate,
}: {
  system: SystemState;
  category: CategoryId;
  dispatch: (action: PlayerAction) => void;
  onNavigate: (view: ViewId) => void;
}) {
  const config = CATEGORY_CONFIGS[category];
  const instances = system.structures[category];
  const completed = instances.filter((s) => s.constructionProgress >= 1);
  const summaryRate = computeSummaryRate(system, category);

  const available = getAvailableStructures(system);
  const availableForType = available.filter((d) => d.type === config.structureType);
  const allDefs = Object.values(STRUCTURES)
    .filter((d) => d.type === config.structureType)
    .sort((a, b) => a.tier - b.tier);

  const building = system.constructionQueue.filter(
    (c) => c.targetType === config.structureType,
  );

  const upgrade = getNextUpgradeTech(system, config.techBranch);

  const handleBuild = () => {
    const firstAvailable = allDefs.find((d) =>
      availableForType.some((a) => a.type === d.type && a.tier === d.tier),
    );
    if (!firstAvailable) return;
    dispatch({
      type: "build_structure",
      systemId: system.id,
      structureType: config.structureType,
      tier: firstAvailable.tier,
    });
  };

  return (
    <Panel
      label={
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              width: 18,
              height: 18,
              color: config.accent,
              fontSize: 13,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              textShadow: `0 0 6px ${config.accent}60`,
            }}
          >
            {config.icon}
          </span>
          <span>{config.label}</span>
        </span>
      }
      right={<HeaderAddButton accent={config.accent} onClick={handleBuild} />}
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
        minWidth: 0,
        overflow: "hidden",
      }}
    >
      {/* Summary */}
      <div
        style={{
          marginBottom: 12,
          paddingBottom: 12,
          borderBottom: "1px dashed rgba(110,200,255,0.10)",
        }}
      >
        <div
          style={{
            fontFamily: FONT_MONO,
            fontSize: 11,
            color: config.accent,
            letterSpacing: "0.14em",
          }}
        >
          {completed.length} OWNED &middot; {config.formatSummaryRate(summaryRate)}
        </div>
        <div
          style={{
            fontFamily: FONT_MONO,
            fontSize: 10,
            color: "#6b87a3",
            marginTop: 4,
          }}
        >
          {config.description}
        </div>
        {upgrade && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              marginTop: 8,
              fontFamily: FONT_MONO,
              fontSize: 10,
            }}
          >
            <span
              style={{
                width: 5,
                height: 5,
                background:
                  upgrade.status === "researching" ? "#b08bff" : "#3d5572",
                boxShadow:
                  upgrade.status === "researching"
                    ? "0 0 4px #b08bff"
                    : "none",
              }}
            />
            <span style={{ color: "#9ab4cf" }}>{upgrade.name}</span>
            <span style={{ color: "#4cd8a8" }}>{upgrade.effect}</span>
          </div>
        )}
      </div>

      {/* Building now */}
      {building.length > 0 && (
        <div
          style={{
            marginBottom: 12,
            paddingBottom: 12,
            borderBottom: "1px dashed rgba(110,200,255,0.10)",
          }}
        >
          <div
            style={{
              fontFamily: FONT_MONO,
              fontSize: 9,
              color: "#6b87a3",
              letterSpacing: "0.18em",
              marginBottom: 8,
            }}
          >
            &#9680; BUILDING NOW
          </div>
          {building.map((q) => {
            const pct = Math.min(100, q.progress * 100);
            const tierDef = allDefs.find((d) => d.tier === q.targetTier);
            const label = tierDef ? tierDef.name : config.structureType;
            const totalBuildTime = q.totalCost.materials + q.totalCost.energy;
            const remaining = Math.max(0, totalBuildTime * (1 - q.progress));
            return (
              <div key={q.id} style={{ marginBottom: 4 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "baseline",
                    justifyContent: "space-between",
                    marginBottom: 4,
                  }}
                >
                  <span style={{ fontSize: 12, color: "#d6e8f5" }}>
                    {label}
                  </span>
                  <span
                    style={{
                      fontFamily: FONT_MONO,
                      fontSize: 10,
                      color: config.accent,
                    }}
                  >
                    {fmtTime(remaining)}
                  </span>
                </div>
                <div
                  style={{
                    position: "relative",
                    height: 4,
                    background: "rgba(110,200,255,0.08)",
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      inset: "0 auto 0 0",
                      width: `${pct}%`,
                      background: config.accent,
                      transition: "width .4s linear",
                      boxShadow: `0 0 6px ${config.accent}80`,
                    }}
                  />
                </div>
                <div
                  style={{
                    fontFamily: FONT_MONO,
                    fontSize: 9,
                    color: "#3d5572",
                    marginTop: 3,
                  }}
                >
                  {q.assignedPrinterIds.length > 0
                    ? q.assignedPrinterIds.join(", ")
                    : "printer queued"}{" "}
                  &middot; {pct.toFixed(0)}%
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Variant cards */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 8,
          flex: 1,
          minHeight: 0,
          overflow: "auto",
        }}
      >
        {allDefs.map((def) => {
          const unlocked = availableForType.some(
            (a) => a.type === def.type && a.tier === def.tier,
          );
          const locked = !unlocked;
          return (
            <div
              key={`${def.type}_${def.tier}`}
              style={{
                padding: "8px 10px",
                background: locked ? "transparent" : `${config.accent}06`,
                border: `1px solid ${locked ? "rgba(110,200,255,0.08)" : `${config.accent}30`}`,
                opacity: locked ? 0.6 : 1,
                transition: "background .15s, border-color .15s",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  justifyContent: "space-between",
                  marginBottom: 3,
                }}
              >
                <span
                  style={{ fontSize: 12, color: "#d6e8f5", fontWeight: 500 }}
                >
                  {def.name}
                </span>
                {locked && (
                  <span
                    style={{
                      fontFamily: FONT_MONO,
                      fontSize: 8,
                      color: "#3d5572",
                      letterSpacing: "0.14em",
                    }}
                  >
                    &#9676; LOCKED
                  </span>
                )}
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  justifyContent: "space-between",
                }}
              >
                <span
                  style={{
                    fontFamily: FONT_MONO,
                    fontSize: 10,
                    color: config.accent,
                  }}
                >
                  {formatVariantSpec(def, category)}
                </span>
                <span
                  style={{
                    fontFamily: FONT_MONO,
                    fontSize: 9,
                    color: "#6b87a3",
                  }}
                >
                  {formatVariantCost(def)}
                </span>
              </div>
              {locked && def.techGate && (
                <div
                  style={{
                    fontFamily: FONT_MONO,
                    fontSize: 9,
                    color: "#6b87a3",
                    marginTop: 4,
                  }}
                >
                  tech:{" "}
                  <span
                    style={{ color: "#9ab4cf", cursor: "pointer" }}
                    onClick={() => onNavigate("research")}
                  >
                    {TECH_TREE[def.techGate]?.name ?? def.techGate.replace(/_/g, " ")}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Panel>
  );
}
