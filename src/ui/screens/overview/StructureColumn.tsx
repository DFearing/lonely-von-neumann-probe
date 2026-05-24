import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faAtom, faBolt, faIndustry, faSatellite, faCircleHalfStroke, faCircle, faCaretDown, faMicrochip, faPause, faPlay, faTrash } from "@fortawesome/free-solid-svg-icons";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import type { SystemState, StructureType } from "../../../simulation/state";
import type { PlayerAction } from "../../../simulation/actions";
import { STRUCTURES } from "../../../simulation/data/structures";
import type { StructureDefinition } from "../../../simulation/data/structures";
import { structureKey } from "../../../simulation/data/structures";
import { Panel } from "../../components/Panel";
import { HealthGauge } from "../../components/HealthGauge";
import { Tooltip } from "../../components/Tooltip";
import { HeaderAddButton } from "./HeaderAddButton";
import { BuildModal } from "./BuildModal";
import { fmt, fmtCycles } from "../../format";
import { FONT_MONO } from "../../tokens";

type CategoryId = "miners" | "reactors" | "printers" | "stations";

interface CategoryConfig {
  structureType: StructureType;
  label: string;
  accent: string;
  icon: IconDefinition;
  description: string;
  formatSummaryRate: (rate: number) => string;
}

const CATEGORY_CONFIGS: Record<CategoryId, CategoryConfig> = {
  miners: {
    structureType: "miner",
    label: "MINERS",
    accent: "#5fd9c4",
    icon: faAtom,
    description: "Extract Materials",
    formatSummaryRate: (rate) => `${rate >= 0 ? "+" : ""}${rate.toFixed(1)} T/cycle`,
  },
  reactors: {
    structureType: "reactor",
    label: "REACTORS",
    accent: "#6aa9ff",
    icon: faBolt,
    description: "Generate Energy",
    formatSummaryRate: (rate) => `${rate >= 0 ? "+" : ""}${rate.toFixed(1)} MW/cycle`,
  },
  printers: {
    structureType: "printer",
    label: "PRINTERS",
    accent: "#4cd8a8",
    icon: faIndustry,
    description: "Build structures & probes",
    formatSummaryRate: (rate) => `${rate.toFixed(1)} BP`,
  },
  stations: {
    structureType: "station" as StructureType,
    label: "STATIONS",
    accent: "#b08bff",
    icon: faSatellite,
    description: "Provide Computing",
    formatSummaryRate: (rate) => `${rate >= 0 ? "+" : ""}${rate.toFixed(1)} TFLOPS`,
  },
};



function computeSummaryRate(
  system: SystemState,
  category: CategoryId,
): number {
  switch (category) {
    case "miners":
      return system.resourceRates.materialsPerSecond;
    case "reactors":
      return system.resourceRates.energyNet;
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
    case "stations":
      return system.resourceRates.computeSupply - (system.mainProbe?.computingOutput ?? 0);
  }
}

function formatVariantSpec(
  def: StructureDefinition,
  category: CategoryId,
): string {
  if (category === "miners") {
    return `+${def.productionRate.toFixed(1)} T/cycle`;
  }
  if (category === "reactors") {
    return `+${def.productionRate.toFixed(1)} MW/cycle`;
  }
  if (category === "stations") {
    return `+${def.productionRate.toFixed(1)} TFLOPS`;
  }
  return `${def.productionRate.toFixed(1)} BP`;
}


export function StructureColumn({
  system,
  category,
  dispatch,
}: {
  system: SystemState;
  category: CategoryId;
  dispatch: (action: PlayerAction) => void;
}) {
  const config = CATEGORY_CONFIGS[category];
  const instances = system.structures[category];
  const completed = instances.filter((s) => s.constructionProgress >= 1);
  const summaryRate = computeSummaryRate(system, category);

  const allDefs = Object.values(STRUCTURES)
    .filter((d) => d.type === config.structureType)
    .sort((a, b) => a.tier - b.tier);

  const building = system.constructionQueue.filter(
    (c) => c.targetType === config.structureType,
  );

  const [showBuild, setShowBuild] = useState(false);
  const [destroyConfirmId, setDestroyConfirmId] = useState<string | null>(null);

  return (
    <Panel
      label={
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              fontSize: 16,
            }}
          >
            <FontAwesomeIcon icon={config.icon} />
          </span>
          <span>{config.label}</span>
        </span>
      }
      right={<HeaderAddButton accent={config.accent} onClick={() => setShowBuild(!showBuild)} />}
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
            fontSize: 13,
            color: config.accent,
            letterSpacing: "0.14em",
          }}
        >
          {completed.length} OWNED &middot; {config.formatSummaryRate(summaryRate)}
        </div>
        {(() => {
          let draw = 0, maint = 0, compute = 0;
          for (const s of completed) {
            if (s.active) {
              draw += s.operatingCost;
              maint += s.maintenanceCost;
              compute += s.computeDemand;
            } else {
              maint += s.maintenanceCost * 0.25;
            }
          }
          return (
            <div style={{ fontFamily: FONT_MONO, fontSize: 12, marginTop: 4, display: "flex", flexDirection: "column", gap: 2 }}>
              <span style={{ color: "#6aa9ff" }}>
                <FontAwesomeIcon icon={faBolt} style={{ marginRight: 4 }} />{draw.toFixed(1)} MW draw
              </span>
              <span style={{ color: "#6b87a3" }}>
                <FontAwesomeIcon icon={faCaretDown} style={{ marginRight: 4 }} />{maint.toFixed(2)} T/cycle maintenance
              </span>
              <span style={{ color: "#b08bff" }}>
                <FontAwesomeIcon icon={faMicrochip} style={{ marginRight: 4 }} />{compute.toFixed(2)} TFLOPS demand
              </span>
            </div>
          );
        })()}
      </div>

      {/* Build modal */}
      {showBuild && (
        <BuildModal
          system={system}
          category={category}
          dispatch={dispatch}
          onClose={() => setShowBuild(false)}
        />
      )}

      {/* Building now */}
      {building.length > 0 && (
        <div
          style={{
            marginBottom: 12,
            paddingBottom: 12,
            borderBottom: "1px dashed rgba(110,200,255,0.10)",
          }}
        >
          {(() => { const probePrint = system.mainProbe?.mode === "printing"
              ? system.mainProbe.internalPrinterSpeed
              : 0;
            let cumulativeYears = 0;
            const fullQueue = system.constructionQueue;
            return building.map((q) => {
            const pct = Math.min(100, q.progress * 100);
            const tierDef = allDefs.find((d) => d.tier === q.targetTier);
            const label = tierDef ? tierDef.name : config.structureType;
            const globalIndex = fullQueue.indexOf(q);
            const probeUsedByEarlier = globalIndex > 0 && probePrint > 0 && fullQueue.slice(0, globalIndex).some((prev) => {
              let prevSpeed = 0;
              for (const pid of prev.assignedPrinterIds) {
                const p = system.structures.printers.find(
                  (s) => s.id === pid && s.active && s.constructionProgress >= 1,
                );
                if (p) prevSpeed += p.productionRate;
              }
              return (probePrint + prevSpeed) > 0;
            });
            let assignedSpeed = 0;
            for (const pid of q.assignedPrinterIds) {
              const p = system.structures.printers.find(
                (s) => s.id === pid && s.active && s.constructionProgress >= 1,
              );
              if (p) assignedSpeed += p.productionRate;
            }
            const effectiveProbePrint = probeUsedByEarlier ? 0 : probePrint;
            const totalSpeed = effectiveProbePrint + assignedSpeed;
            const buildTime = q.totalCost.materials;
            const waitSpeed = totalSpeed > 0 ? totalSpeed : (probePrint + assignedSpeed);
            const remaining = waitSpeed > 0
              ? Math.max(0, buildTime * (1 - q.progress) / waitSpeed)
              : Infinity;
            const priorRemaining = fullQueue.slice(0, globalIndex).reduce((sum, prev) => {
              let prevAssigned = 0;
              for (const pid of prev.assignedPrinterIds) {
                const p = system.structures.printers.find(
                  (s) => s.id === pid && s.active && s.constructionProgress >= 1,
                );
                if (p) prevAssigned += p.productionRate;
              }
              const prevSpeed = (sum === 0 ? probePrint : 0) + prevAssigned;
              const prevWait = prevSpeed > 0 ? prevSpeed : probePrint;
              const prevBuild = prev.totalCost.materials;
              const prevTime = prevWait > 0 ? Math.max(0, prevBuild * (1 - prev.progress) / prevWait) : 0;
              return sum + prevTime;
            }, 0);
            cumulativeYears = priorRemaining + (remaining === Infinity ? 0 : remaining);
            return (
              <div key={q.id} style={{ marginBottom: 8 }}>
                <div style={{
                  fontFamily: FONT_MONO,
                  fontSize: 10,
                  color: totalSpeed > 0 ? config.accent : "#3d5572",
                  letterSpacing: "0.18em",
                  marginBottom: 4,
                }}>
                  <FontAwesomeIcon icon={faCircleHalfStroke} style={{ marginRight: 4 }} />
                  {totalSpeed > 0 ? "PRINTING NOW" : "QUEUED"}
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "baseline",
                    justifyContent: "space-between",
                    marginBottom: 4,
                  }}
                >
                  <span style={{ fontSize: 14, color: "#d6e8f5" }}>
                    {label}
                  </span>
                  <span
                    style={{
                      fontFamily: FONT_MONO,
                      fontSize: 12,
                      color: config.accent,
                    }}
                  >
                    {fmtCycles(remaining)}
                    {globalIndex > 0 && (
                      <span style={{ color: "#6b87a3" }}> ({fmtCycles(cumulativeYears)})</span>
                    )}
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
                    fontSize: 11,
                    color: "#3d5572",
                    marginTop: 3,
                  }}
                >
                  {pct.toFixed(0)}%
                </div>
              </div>
            );
          }); })()}
        </div>
      )}

      {/* Owned structures */}
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
        {completed.map((inst) => {
          const def = allDefs.find((d) => d.tier === inst.tier);
          if (!def) return null;
          const key = structureKey(inst.type, inst.tier);
          const structureDef = STRUCTURES[key];
          const refundAmount = structureDef ? Math.floor(structureDef.cost.materials * 0.5) : 0;
          const isConfirming = destroyConfirmId === inst.id;
          return (
            <div
              key={inst.id}
              style={{
                padding: "12px 14px",
                background: `${config.accent}06`,
                border: `1px solid ${inst.active ? `${config.accent}30` : "rgba(110,200,255,0.10)"}`,
                position: "relative",
              }}
            >
              {isConfirming && (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background: "rgba(8,16,30,0.92)",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    zIndex: 2,
                  }}
                >
                  <span style={{ fontFamily: FONT_MONO, fontSize: 12, color: "#d6e8f5" }}>
                    Destroy {def.name}?
                  </span>
                  <span style={{ fontFamily: FONT_MONO, fontSize: 11, color: "#5fd9c4" }}>
                    Recovers {fmt(refundAmount)} tons
                  </span>
                  <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                    <button
                      onClick={() => {
                        dispatch({
                          type: "destroy_structure",
                          systemId: system.id,
                          structureId: inst.id,
                        });
                        setDestroyConfirmId(null);
                      }}
                      style={{
                        fontFamily: FONT_MONO,
                        fontSize: 11,
                        letterSpacing: "0.14em",
                        padding: "5px 14px",
                        background: "rgba(255,107,107,0.15)",
                        border: "1px solid rgba(255,107,107,0.5)",
                        color: "#ff6b6b",
                        cursor: "pointer",
                      }}
                    >
                      CONFIRM
                    </button>
                    <button
                      onClick={() => setDestroyConfirmId(null)}
                      style={{
                        fontFamily: FONT_MONO,
                        fontSize: 11,
                        letterSpacing: "0.14em",
                        padding: "5px 14px",
                        background: "transparent",
                        border: "1px solid rgba(110,200,255,0.2)",
                        color: "#6b87a3",
                        cursor: "pointer",
                      }}
                    >
                      CANCEL
                    </button>
                  </div>
                </div>
              )}
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  justifyContent: "space-between",
                  marginBottom: 3,
                }}
              >
                <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      dispatch({
                        type: "toggle_structure",
                        systemId: system.id,
                        structureId: inst.id,
                      });
                    }}
                    title={inst.active ? "Pause structure" : "Resume structure"}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: inst.active ? "#6b87a3" : "#4cd8a8",
                      cursor: "pointer",
                      padding: 0,
                      fontSize: 12,
                    }}
                  >
                    <FontAwesomeIcon icon={inst.active ? faPause : faPlay} />
                  </button>
                  <Tooltip content={structureDef?.description ?? def.name}>
                    <span style={{ fontSize: 16, color: "#d6e8f5", fontWeight: 500 }}>
                      {def.name}
                    </span>
                  </Tooltip>
                </span>
                <span
                  style={{
                    fontFamily: FONT_MONO,
                    fontSize: 12,
                    color: inst.active ? "#4cd8a8" : "#6b87a3",
                    letterSpacing: "0.14em",
                  }}
                >
                  {inst.active
                    ? <><FontAwesomeIcon icon={faCircle} style={{ fontSize: 6, marginRight: 4 }} /> ACTIVE</>
                    : <><FontAwesomeIcon icon={faCircle} style={{ fontSize: 6, marginRight: 4, opacity: 0.4 }} /> IDLE</>
                  }
                </span>
              </div>
              <div style={{ opacity: inst.active ? 1 : 0.4 }}>
              <HealthGauge health={inst.health} />
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontFamily: FONT_MONO,
                  fontSize: 14,
                }}
              >
                <span style={{ color: config.accent }} title="Production output">
                  {formatVariantSpec(def, category)}
                </span>
                <span style={{ fontFamily: FONT_MONO, fontSize: 12 }}>
                  {inst.maintenanceCost > 0 && (
                    <span style={{ color: "#5fd9c4" }}>{inst.maintenanceCost.toFixed(2)} T/cy</span>
                  )}
                  {inst.maintenanceCost > 0 && inst.operatingCost > 0 && (
                    <span style={{ color: "#6b87a3" }}> · </span>
                  )}
                  {inst.operatingCost > 0 && (
                    <span style={{ color: "#6aa9ff" }}>{inst.operatingCost.toFixed(1)} MW/cy</span>
                  )}
                  {(inst.maintenanceCost > 0 || inst.operatingCost > 0) && inst.computeDemand > 0 && (
                    <span style={{ color: "#6b87a3" }}> · </span>
                  )}
                  {inst.computeDemand > 0 && (
                    <span style={{ color: "#b08bff" }}>{inst.computeDemand.toFixed(2)} TFLOPS/cy</span>
                  )}
                </span>
              </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setDestroyConfirmId(inst.id);
                }}
                title="Destroy structure"
                style={{
                  position: "absolute",
                  bottom: 8,
                  right: 8,
                  background: "transparent",
                  border: "none",
                  color: "#3d5572",
                  cursor: "pointer",
                  padding: 2,
                  fontSize: 10,
                  transition: "color 0.15s",
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#ff6b6b"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#3d5572"; }}
              >
                <FontAwesomeIcon icon={faTrash} />
              </button>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}
