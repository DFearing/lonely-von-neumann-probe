import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCheck, faCircleHalfStroke, faCircle, faLock, faPlus,
} from "@fortawesome/free-solid-svg-icons";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import type { SystemState } from "../../../simulation/state";
import type { PlayerAction } from "../../../simulation/actions";
import { TECH_TREE } from "../../../simulation/data/tech-tree";
import { STRUCTURES } from "../../../simulation/data/structures";
import { CPUS, PROPULSIONS, REACTORS } from "../../../simulation/data/components";
import { getTechStatus, getMissingPrerequisites, type TechStatus } from "../../../simulation/queries";
import { FONT_MONO } from "../../tokens";
import { fmt, fmtCycles } from "../../format";
import { btnFlush } from "../../components/buttons";
import { BRANCH_META } from "../../data/branch-meta";

const STATUS_LABELS: Record<TechStatus, { label: string; icon: IconDefinition; color: string }> = {
  completed: { label: "RESEARCHED", icon: faCheck, color: "#4cd8a8" },
  in_progress: { label: "IN PROGRESS", icon: faCircleHalfStroke, color: "#b08bff" },
  available: { label: "AVAILABLE", icon: faCircle, color: "#4ddbff" },
  locked: { label: "LOCKED", icon: faLock, color: "#3d5572" },
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
          fontSize: 10,
          color: "#6b87a3",
          letterSpacing: "0.16em",
          marginBottom: 3,
        }}
      >
        {k}
      </div>
      <div
        style={{
          fontFamily: FONT_MONO,
          fontSize: 18,
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
  const branchIcon = meta?.icon;
  const statusInfo = STATUS_LABELS[status];
  const computeRate = system.resourceRates.computingPowerPerSecond;
  const etaSeconds = computeRate > 0 ? (tech.continuousCost * tech.researchTime) / computeRate : 0;

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
          gap: 14,
          marginBottom: 14,
        }}
      >
        <span
          style={{
            width: 48,
            height: 48,
            borderRadius: "50%",
            border: `1.5px solid ${branchColor}`,
            background: `${branchColor}10`,
            color: branchColor,
            fontSize: 22,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            textShadow: `0 0 6px ${branchColor}60`,
            flexShrink: 0,
          }}
        >
          {branchIcon && <FontAwesomeIcon icon={branchIcon} />}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span
              style={{
                fontFamily: FONT_MONO,
                fontSize: 11,
                color: "#6b87a3",
                letterSpacing: "0.14em",
              }}
            >
              {meta?.label.toUpperCase() ?? tech.branchId.toUpperCase().replaceAll("_", " ")} · T{tech.tier}
            </span>
            <span
              style={{
                fontFamily: FONT_MONO,
                fontSize: 11,
                color: statusInfo.color,
              }}
            >
              <FontAwesomeIcon icon={statusInfo.icon} style={{ marginRight: 4, fontSize: 10 }} /> {statusInfo.label}
            </span>
          </div>
          <div
            style={{
              fontSize: 18,
              color: "#d6e8f5",
              fontWeight: 500,
              marginTop: 2,
            }}
          >
            {tech.name}
          </div>
        </div>
      </div>

      {tech.effects.length > 0 && (
        <div
          style={{
            padding: "10px 14px",
            marginBottom: 14,
            background: `${branchColor}08`,
            borderLeft: `2px solid ${branchColor}`,
            fontSize: 14,
            color: "#d6e8f5",
            lineHeight: 1.4,
          }}
        >
          {tech.effects.map((effect, i) => (
            <div key={i} style={i > 0 ? { marginTop: 4 } : undefined}>
              {effect}
            </div>
          ))}
        </div>
      )}

      {tech.unlocks.length > 0 && (() => {
        const structureDefs = tech.unlocks.flatMap((id) => { const d = STRUCTURES[id]; return d ? [d] : []; });
        const cpuDefs = tech.unlocks.flatMap((id) => { const d = CPUS[id]; return d ? [d] : []; });
        const propDefs = tech.unlocks.flatMap((id) => { const d = PROPULSIONS[id]; return d ? [d] : []; });
        const reactorDefs = tech.unlocks.flatMap((id) => { const d = REACTORS[id]; return d ? [d] : []; });

        return (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
            {structureDefs.map((def) => (
              <div
                key={`${def.type}_${def.tier}`}
                style={{
                  padding: "14px 16px",
                  background: "rgba(110,200,255,0.04)",
                  border: "1px solid rgba(110,200,255,0.10)",
                  fontFamily: FONT_MONO,
                }}
              >
                <div style={{ color: "#d6e8f5", fontWeight: 600, fontSize: 16, marginBottom: 10 }}>
                  {def.name}
                </div>
                <div style={{ fontSize: 14, marginBottom: 10 }}>
                  <span style={{ color: "#5fd9c4" }}>
                    +{def.productionRate} {def.type === "reactor" ? "MW/cycle" : def.type === "station" ? "TFLOPS/cycle" : def.type === "miner" ? "T/cycle" : "BP/cycle"}
                  </span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 12, color: "#6b87a3", letterSpacing: "0.14em", marginBottom: 4 }}>BUILD</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 3, fontSize: 13 }}>
                      <span style={{ color: "#5fd9c4" }}>{fmt(def.cost.materials)} T</span>
                      <span style={{ color: "#6aa9ff" }}>{fmt(def.cost.energy)} MW</span>
                    </div>
                  </div>
                  {(def.maintenanceCost > 0 || def.operatingCost > 0 || def.computeDemand > 0) && (
                    <div>
                      <div style={{ fontSize: 12, color: "#6b87a3", letterSpacing: "0.14em", marginBottom: 4 }}>UPKEEP</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 3, fontSize: 13 }}>
                        {def.maintenanceCost > 0 && (
                          <span style={{ color: "#5fd9c4" }}>{def.maintenanceCost.toFixed(2)} T/cycle</span>
                        )}
                        {def.operatingCost > 0 && (
                          <span style={{ color: "#6aa9ff" }}>{def.operatingCost} MW/cycle</span>
                        )}
                        {def.computeDemand > 0 && (
                          <span style={{ color: "#b08bff" }}>{def.computeDemand} TFLOPS/cycle</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {cpuDefs.map((def) => (
              <div
                key={def.type}
                style={{
                  padding: "14px 16px",
                  background: "rgba(110,200,255,0.04)",
                  border: "1px solid rgba(110,200,255,0.10)",
                  fontFamily: FONT_MONO,
                }}
              >
                <div style={{ color: "#d6e8f5", fontWeight: 600, fontSize: 16, marginBottom: 10 }}>
                  {def.name}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 14, marginBottom: 10 }}>
                  <span style={{ color: "#b08bff" }}>{def.computingOutput} TFLOPS</span>
                  <span style={{ color: "#5fd9c4" }}>{def.miningOutput} tons/cycle gather</span>
                  <span style={{ color: "#6aa9ff" }}>{def.printSpeed}× print speed</span>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: "#6b87a3", letterSpacing: "0.14em", marginBottom: 4 }}>BUILD</div>
                  <div style={{ display: "flex", gap: 12, fontSize: 13 }}>
                    <span style={{ color: "#5fd9c4" }}>{fmt(def.cost.materials)} T</span>
                    <span style={{ color: "#6aa9ff" }}>{fmt(def.cost.energy)} MW</span>
                  </div>
                </div>
              </div>
            ))}

            {propDefs.map((def) => (
              <div
                key={def.type}
                style={{
                  padding: "14px 16px",
                  background: "rgba(110,200,255,0.04)",
                  border: "1px solid rgba(110,200,255,0.10)",
                  fontFamily: FONT_MONO,
                }}
              >
                <div style={{ color: "#d6e8f5", fontWeight: 600, fontSize: 16, marginBottom: 10 }}>
                  {def.name}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 14, marginBottom: 10 }}>
                  <span style={{ color: "#4ddbff" }}>{def.travelSpeed} ly/cycle travel</span>
                  {def.autoReplicate && <span style={{ color: "#f0c674" }}>Auto-replicate</span>}
                </div>
                <div>
                  <div style={{ fontSize: 12, color: "#6b87a3", letterSpacing: "0.14em", marginBottom: 4 }}>BUILD</div>
                  <div style={{ display: "flex", gap: 12, fontSize: 13 }}>
                    <span style={{ color: "#5fd9c4" }}>{fmt(def.cost.materials)} T</span>
                    <span style={{ color: "#6aa9ff" }}>{fmt(def.cost.energy)} MW</span>
                  </div>
                </div>
              </div>
            ))}

            {reactorDefs.map((def) => (
              <div
                key={def.type}
                style={{
                  padding: "14px 16px",
                  background: "rgba(110,200,255,0.04)",
                  border: "1px solid rgba(110,200,255,0.10)",
                  fontFamily: FONT_MONO,
                }}
              >
                <div style={{ color: "#d6e8f5", fontWeight: 600, fontSize: 16, marginBottom: 10 }}>
                  {def.name}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 14, marginBottom: 10 }}>
                  <span style={{ color: "#6aa9ff" }}>{def.energyMultiplier}× MW output</span>
                  {def.solarScaling && <span style={{ color: "#f0c674" }}>Solar scaling</span>}
                </div>
                <div>
                  <div style={{ fontSize: 12, color: "#6b87a3", letterSpacing: "0.14em", marginBottom: 4 }}>BUILD</div>
                  <div style={{ display: "flex", gap: 12, fontSize: 13 }}>
                    <span style={{ color: "#5fd9c4" }}>{fmt(def.cost.materials)} T</span>
                    <span style={{ color: "#6aa9ff" }}>{fmt(def.cost.energy)} MW</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        );
      })()}

      <div style={{ marginBottom: 14 }}>
        <KV k="COMPUTE COST" v={`${fmt(tech.continuousCost * tech.researchTime)} TFLOPS`} color="#b08bff" />
        {computeRate > 0 && (
          <div style={{ fontFamily: FONT_MONO, fontSize: 13, color: "#6b87a3", marginTop: 4 }}>
            (~{fmtCycles(etaSeconds)})
          </div>
        )}
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
            <FontAwesomeIcon icon={faCheck} style={{ marginRight: 4 }} /> COMPLETE
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
              <FontAwesomeIcon icon={faPlus} style={{ marginRight: 4 }} /> QUEUE
            </button>
          </>
        )}
        {status === "locked" && (() => {
          const missing = getMissingPrerequisites(system, techId);
          return (
            <div style={{ flex: 1 }}>
              <button style={{ ...btnFlush(), width: "100%", opacity: 0.5 }} disabled>
                <FontAwesomeIcon icon={faLock} style={{ marginRight: 4 }} /> LOCKED
              </button>
              {missing.length > 0 && (
                <div style={{ marginTop: 8 }}>
                  <div
                    style={{
                      fontFamily: FONT_MONO,
                      fontSize: 10,
                      color: "#6b87a3",
                      letterSpacing: "0.16em",
                      marginBottom: 4,
                    }}
                  >
                    REQUIRES:
                  </div>
                  {missing.map((prereq) => {
                    const prereqMeta = BRANCH_META[prereq.branchId];
                    const color = prereqMeta?.color ?? "#6b87a3";
                    return (
                      <div
                        key={prereq.id}
                        style={{
                          fontFamily: FONT_MONO,
                          fontSize: 13,
                          color,
                          paddingLeft: 8,
                          marginTop: 2,
                        }}
                      >
                        {prereq.name}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })()}
      </div>
    </div>
  );
}
