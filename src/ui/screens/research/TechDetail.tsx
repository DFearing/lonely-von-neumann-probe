import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faAtom, faBolt, faIndustry, faMicrochip, faRocket, faSatellite,
  faTowerBroadcast, faCheck, faCircleHalfStroke, faCircle, faLock, faPlus,
} from "@fortawesome/free-solid-svg-icons";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import type { SystemState } from "../../../simulation/state";
import type { PlayerAction } from "../../../simulation/actions";
import { TECH_TREE } from "../../../simulation/data/tech-tree";
import { STRUCTURES } from "../../../simulation/data/structures";
import { getTechStatus, type TechStatus } from "../../../simulation/queries";
import { FONT_MONO } from "../../tokens";
import { fmt, fmtYears } from "../../format";
import { btnFlush } from "../../components/buttons";

const BRANCH_META: Record<string, { label: string; color: string; icon: IconDefinition }> = {
  mining_efficiency: { label: "Mining · Output", color: "#5cc7ff", icon: faAtom },
  mining_types: { label: "Mining · Structures", color: "#3aa8e0", icon: faAtom },
  energy_production: { label: "Energy · Output", color: "#ffcb47", icon: faBolt },
  energy_types: { label: "Energy · Structures", color: "#e0a830", icon: faBolt },
  manufacturing_efficiency: { label: "Printing · Output", color: "#4cd8a8", icon: faIndustry },
  manufacturing_types: { label: "Printing · Structures", color: "#38b890", icon: faIndustry },
  station_efficiency: { label: "Stations · Output", color: "#b08bff", icon: faSatellite },
  station_types: { label: "Stations · Structures", color: "#9070e0", icon: faSatellite },
  probe_cpu: { label: "Probes · Processor", color: "#4ddbff", icon: faMicrochip },
  probe_propulsion: { label: "Probes · Propulsion", color: "#6bc0e0", icon: faRocket },
  probe_reactors: { label: "Probes · Reactor", color: "#e8b830", icon: faAtom },
  computing_speed: { label: "Computing · Speed", color: "#b08bff", icon: faMicrochip },
  computing_architecture: { label: "Computing · Architecture", color: "#9070e0", icon: faMicrochip },
  communication: { label: "Communication · Range", color: "#ff9966", icon: faTowerBroadcast },
  communication_speed: { label: "Communication · Speed", color: "#e07744", icon: faTowerBroadcast },
};

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

      {tech.unlocks.length === 0 && (
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
        const defs = tech.unlocks.flatMap((id) => { const d = STRUCTURES[id]; return d ? [d] : []; });
        if (defs.length === 0) return null;
        return (
          <div style={{ marginBottom: 14 }}>
            {defs.map((def) => (
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
                    +{def.productionRate} {def.type === "reactor" ? "MW/year" : def.type === "station" ? "TFLOPS/year" : def.type === "miner" ? "T/year" : "BP/year"}
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
                          <span style={{ color: "#5fd9c4" }}>{def.maintenanceCost.toFixed(2)} T/year</span>
                        )}
                        {def.operatingCost > 0 && (
                          <span style={{ color: "#6aa9ff" }}>{def.operatingCost} MW/year</span>
                        )}
                        {def.computeDemand > 0 && (
                          <span style={{ color: "#b08bff" }}>{def.computeDemand} TFLOPS/year</span>
                        )}
                      </div>
                    </div>
                  )}
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
            (~{fmtYears(etaSeconds)})
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
        {status === "locked" && (
          <button style={{ ...btnFlush(), flex: 1, opacity: 0.5 }} disabled>
            PREREQ LOCKED
          </button>
        )}
      </div>
    </div>
  );
}
