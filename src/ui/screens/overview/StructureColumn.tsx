import { useState, useEffect, useRef } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faAtom,
  faBolt,
  faIndustry,
  faSatellite,
  faCircleHalfStroke,
  faMicrochip,
  faPause,
  faPlay,
  faTrash,
  faWrench,
} from "@fortawesome/free-solid-svg-icons";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import type { SystemState, StructureType, StructureInstance } from "../../../simulation/state";
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
  outputUnit: string;
  formatOutput: (rate: number) => string;
}

const COST_COLORS = {
  power: "#5d8aff",
  maint: "#4fc7b8",
  compute: "#b08bff",
  idle: "#e0b25c",
} as const;

const CATEGORY_CONFIGS: Record<CategoryId, CategoryConfig> = {
  miners: {
    structureType: "miner",
    label: "MINERS",
    accent: "#5fd9c4",
    icon: faAtom,
    description: "Extract Materials",
    outputUnit: "T/cycle",
    formatOutput: (rate) => `${rate >= 0 ? "+" : ""}${rate.toFixed(1)}`,
  },
  reactors: {
    structureType: "reactor",
    label: "REACTORS",
    accent: "#6aa9ff",
    icon: faBolt,
    description: "Generate Energy",
    outputUnit: "MW/cycle",
    formatOutput: (rate) => `${rate >= 0 ? "+" : ""}${rate.toFixed(1)}`,
  },
  printers: {
    structureType: "printer",
    label: "PRINTERS",
    accent: "#4cd8a8",
    icon: faIndustry,
    description: "Build structures & probes",
    outputUnit: "BP/cycle",
    formatOutput: (rate) => rate.toFixed(1),
  },
  stations: {
    structureType: "station" as StructureType,
    label: "STATIONS",
    accent: "#b08bff",
    icon: faSatellite,
    description: "Provide Computing",
    outputUnit: "TFLOPS",
    formatOutput: (rate) => `${rate >= 0 ? "+" : ""}${rate.toFixed(1)}`,
  },
};

function computeSummaryRate(system: SystemState, category: CategoryId): number {
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

interface CostTotals {
  power: number;
  maint: number;
  compute: number;
}

function totalsFor(completed: StructureInstance[]): CostTotals {
  let power = 0;
  let maint = 0;
  let compute = 0;
  for (const s of completed) {
    if (s.active) {
      power += s.operatingCost;
      compute += s.computeDemand;
      maint += s.maintenanceCost;
    } else {
      maint += s.maintenanceCost * 0.25;
    }
  }
  return { power, maint, compute };
}

function CostBar({ totals }: { totals: CostTotals }) {
  const { power, maint, compute } = totals;
  // Costs span different units; scale by ×10 so flex grows sum past 1
  // and the bar always fills the track. The proportions stay intact.
  const segments: Array<{
    key: "power" | "maint" | "compute";
    value: number;
    label: string;
    unit: string;
    icon: IconDefinition;
  }> = [
    { key: "power", value: power, label: "Power draw", unit: "MW", icon: faBolt },
    { key: "maint", value: maint, label: "Maintenance", unit: "T/cy", icon: faWrench },
    { key: "compute", value: compute, label: "Compute demand", unit: "TFLOPS", icon: faMicrochip },
  ];
  const total = power + maint + compute;
  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          marginBottom: 6,
        }}
      >
        <span
          style={{
            fontFamily: FONT_MONO,
            fontSize: 9.5,
            letterSpacing: "0.2em",
            color: "#6b87a3",
            textTransform: "uppercase",
          }}
        >
          Running cost
        </span>
        <span
          style={{
            fontFamily: FONT_MONO,
            fontSize: 9.5,
            letterSpacing: "0.08em",
            color: "#4d6480",
            textTransform: "uppercase",
          }}
        >
          per cycle
        </span>
      </div>
      <div
        style={{
          display: "flex",
          gap: 2,
          height: 10,
          borderRadius: 4,
          background: "rgba(255,255,255,0.03)",
          overflow: "hidden",
        }}
      >
        {total === 0 ? (
          <div
            style={{
              flex: 1,
              fontFamily: FONT_MONO,
              fontSize: 9,
              color: "#3d5572",
              letterSpacing: "0.1em",
              textAlign: "center",
              lineHeight: "10px",
            }}
          >
            no running cost
          </div>
        ) : (
          segments.map((seg) => {
            const grow = seg.value * 10;
            if (grow <= 0) return null;
            const color = COST_COLORS[seg.key];
            return (
              <Tooltip
                key={seg.key}
                wrapperStyle={{ flex: `${grow} 1 0`, height: "100%", minWidth: 0 }}
                content={
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                    <FontAwesomeIcon icon={seg.icon} style={{ color }} />
                    <span style={{ color: "#9ab4cf", letterSpacing: "0.12em" }}>
                      {seg.label.toUpperCase()}
                    </span>
                    <span style={{ color }}>
                      {seg.value.toFixed(2)} {seg.unit}
                    </span>
                  </span>
                }
              >
                <span
                  style={{
                    display: "block",
                    width: "100%",
                    background: color,
                    borderRadius: 2,
                    height: "100%",
                  }}
                />
              </Tooltip>
            );
          })
        )}
      </div>
    </div>
  );
}

function CostStats({ totals }: { totals: { power: number; maint: number; compute: number } }) {
  const items: Array<{ value: number; unit: string; color: string }> = [
    { value: totals.power, unit: "MW", color: COST_COLORS.power },
    { value: totals.maint, unit: "T/cy", color: COST_COLORS.maint },
    { value: totals.compute, unit: "TFLOPS", color: COST_COLORS.compute },
  ];
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 10 }}>
      {items.map((it, i) => (
        <span
          key={i}
          style={{
            fontFamily: FONT_MONO,
            color: it.color,
            display: "inline-flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 1,
            lineHeight: 1,
          }}
        >
          <span style={{ fontSize: 13 }}>{it.value.toFixed(2)}</span>
          <span style={{ fontSize: 9, opacity: 0.7, letterSpacing: "0.05em" }}>{it.unit}</span>
        </span>
      ))}
    </div>
  );
}

function StatusPill({ active, accent }: { active: boolean; accent: string }) {
  const color = active ? accent : COST_COLORS.idle;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontFamily: FONT_MONO,
        fontSize: 10,
        letterSpacing: "0.16em",
        color,
        background: `${color}1a`,
        border: `1px solid ${color}48`,
        borderRadius: 999,
        padding: "4px 11px 4px 9px",
        whiteSpace: "nowrap",
      }}
    >
      <span
        style={{
          width: 7,
          height: 7,
          borderRadius: "50%",
          background: color,
          boxShadow: active ? `0 0 8px ${color}` : "none",
          animation: active ? "lvnp-status-pulse 2s ease-in-out infinite" : "none",
        }}
      />
      {active ? "ACTIVE" : "IDLE"}
    </span>
  );
}

function UnitToggle({
  active,
  accent,
  onClick,
}: {
  active: boolean;
  accent: string;
  onClick: () => void;
}) {
  const color = active ? accent : COST_COLORS.idle;
  return (
    <Tooltip content={active ? "Pause structure" : "Resume structure"}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        style={{
          width: 30,
          height: 30,
          borderRadius: 8,
          flex: "none",
          display: "grid",
          placeItems: "center",
          background: `${color}1a`,
          border: `1px solid ${color}48`,
          color,
          cursor: "pointer",
          padding: 0,
        }}
        aria-label={active ? "Pause" : "Resume"}
      >
        <FontAwesomeIcon icon={active ? faPause : faPlay} style={{ fontSize: 12 }} />
      </button>
    </Tooltip>
  );
}

function UnitCard({
  inst,
  def,
  serial,
  config,
  isNew,
  isConfirming,
  refundAmount,
  onToggle,
  onDestroyRequest,
  onDestroyConfirm,
  onDestroyCancel,
}: {
  inst: StructureInstance;
  def: StructureDefinition;
  serial: number;
  config: CategoryConfig;
  isNew: boolean;
  isConfirming: boolean;
  refundAmount: number;
  onToggle: () => void;
  onDestroyRequest: () => void;
  onDestroyConfirm: () => void;
  onDestroyCancel: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const accent = config.accent;
  const tierOpacity = 0.04 + Math.min(inst.tier - 1, 4) * 0.012;
  const railIntensity = 1;

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: "relative",
        display: "flex",
        border: isNew ? `1px dashed ${accent}` : `1px solid ${inst.active ? `${accent}30` : "rgba(110,200,255,0.10)"}`,
        borderRadius: 11,
        overflow: "hidden",
        background: isNew
          ? `${accent}18`
          : `linear-gradient(180deg, ${accent}${Math.round(tierOpacity * 255).toString(16).padStart(2, "0")}, ${accent}04)`,
        boxShadow: isNew ? `0 0 16px ${accent}40, inset 0 0 12px ${accent}15` : "none",
        opacity: inst.active ? 1 : 0.7,
        transition: "background 1s ease-out, border-color 1s ease-out, box-shadow 1s ease-out, opacity .16s",
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
          <span style={{ fontFamily: FONT_MONO, fontSize: 11, color: accent }}>
            Recovers {fmt(refundAmount)} tons
          </span>
          <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
            <button
              onClick={onDestroyConfirm}
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
              onClick={onDestroyCancel}
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

      <span
        style={{
          width: 3,
          flex: "none",
          background: inst.active
            ? `linear-gradient(180deg, ${accent}, ${accent}33)`
            : `linear-gradient(180deg, ${COST_COLORS.idle}, ${COST_COLORS.idle}33)`,
          opacity: railIntensity,
        }}
      />

      <div style={{ flex: 1, padding: "12px 14px 13px", minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
          <UnitToggle active={inst.active} accent={accent} onClick={onToggle} />
          <div style={{ display: "flex", flexDirection: "column", gap: 4, lineHeight: 1, minWidth: 0 }}>
            <Tooltip content={def.description}>
              <span
                style={{
                  fontSize: 15,
                  fontWeight: 600,
                  color: inst.active ? "#d6e8f5" : "#9ab4cf",
                  whiteSpace: "nowrap",
                }}
              >
                {def.name}
              </span>
            </Tooltip>
            <span
              style={{
                fontFamily: FONT_MONO,
                fontSize: 9.5,
                letterSpacing: "0.14em",
                color: "#6b87a3",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              TIER {roman(inst.tier)} · #{String(serial).padStart(2, "0")}
            </span>
          </div>
          <span style={{ marginLeft: "auto" }}>
            {hovered ? (
              <Tooltip content="Destroy structure">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDestroyRequest();
                  }}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    fontFamily: FONT_MONO,
                    fontSize: 10,
                    letterSpacing: "0.14em",
                    color: "#ff8a8a",
                    background: "rgba(255,90,90,0.12)",
                    border: "1px solid rgba(255,90,90,0.42)",
                    borderRadius: 999,
                    padding: "5px 12px 5px 10px",
                    cursor: "pointer",
                  }}
                >
                  <FontAwesomeIcon icon={faTrash} style={{ fontSize: 10 }} /> DESTROY
                </button>
              </Tooltip>
            ) : (
              <StatusPill active={inst.active} accent={accent} />
            )}
          </span>
        </div>

        <div style={{ marginTop: 12 }}>
          <HealthGauge health={inst.health} compact />
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            gap: 14,
            marginTop: 10,
          }}
        >
          <div style={{ display: "flex", alignItems: "baseline", gap: 9 }}>
            <span
              style={{
                fontSize: 26,
                fontWeight: 600,
                lineHeight: 1,
                letterSpacing: "-0.01em",
                color: inst.active ? accent : COST_COLORS.idle,
                textShadow: inst.active ? `0 0 14px ${accent}55` : "none",
              }}
            >
              {config.formatOutput(def.productionRate)}
            </span>
            <span style={{ display: "flex", flexDirection: "column", gap: 2, lineHeight: 1 }}>
              <span
                style={{
                  fontFamily: FONT_MONO,
                  fontSize: 11,
                  color: inst.active ? accent : COST_COLORS.idle,
                }}
              >
                {config.outputUnit}
              </span>
              <span
                style={{
                  fontFamily: FONT_MONO,
                  fontSize: 8.5,
                  letterSpacing: "0.2em",
                  color: "#6b87a3",
                }}
              >
                OUTPUT
              </span>
            </span>
          </div>
          <div style={{ paddingBottom: 3 }}>
            <CostStats
              totals={{
                power: inst.operatingCost,
                maint: inst.maintenanceCost,
                compute: inst.computeDemand,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function roman(t: number): string {
  const m = ["", "I", "II", "III", "IV", "V", "VI"];
  return m[t] ?? String(t);
}

export function StructureColumn({
  system,
  category,
  dispatch,
  disabled,
}: {
  system: SystemState;
  category: CategoryId;
  dispatch: (action: PlayerAction) => void;
  disabled?: boolean;
}) {
  const config = CATEGORY_CONFIGS[category];
  const instances = system.structures[category];
  const completed = instances.filter((s) => s.constructionProgress >= 1);
  const summaryRate = computeSummaryRate(system, category);
  const totals = totalsFor(completed);
  const activeCount = completed.filter((s) => s.active).length;
  const idleCount = completed.length - activeCount;

  const allDefs = Object.values(STRUCTURES)
    .filter((d) => d.type === config.structureType)
    .sort((a, b) => a.tier - b.tier);

  const building = system.constructionQueue.filter(
    (c) => c.targetType === config.structureType,
  );

  const [showBuild, setShowBuild] = useState(false);
  const [destroyConfirmId, setDestroyConfirmId] = useState<string | null>(null);
  const [recentlyBuilt, setRecentlyBuilt] = useState<Set<string>>(new Set());
  const prevIdsRef = useRef<Set<string>>(new Set(completed.map((s) => s.id)));
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const completedIds = completed.map((s) => s.id).join(",");
  useEffect(() => {
    const currentIds = new Set(completedIds.split(",").filter(Boolean));
    const newIds: string[] = [];
    for (const id of currentIds) {
      if (!prevIdsRef.current.has(id)) newIds.push(id);
    }
    prevIdsRef.current = currentIds;
    if (newIds.length === 0) return;
    setRecentlyBuilt((prev) => new Set([...prev, ...newIds]));
    for (const id of newIds) {
      const timer = setTimeout(() => {
        setRecentlyBuilt((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        timersRef.current.delete(id);
      }, 4000);
      timersRef.current.set(id, timer);
    }
  }, [completedIds]);

  if (disabled) {
    return (
      <Panel
        label={
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 16 }}>
              <FontAwesomeIcon icon={config.icon} />
            </span>
            <span>{config.label}</span>
          </span>
        }
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minHeight: 0,
          minWidth: 0,
          overflow: "hidden",
          opacity: 0.35,
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            fontFamily: FONT_MONO,
            fontSize: 11,
            color: "#6b87a3",
            letterSpacing: "0.14em",
            textAlign: "center",
            padding: "24px 8px",
          }}
        >
          {config.description}
        </div>
      </Panel>
    );
  }

  // Group cards by structure type per-instance for "#01/#02/..." serials.
  const serials: Record<string, number> = {};

  return (
    <Panel
      label={
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 16 }}>
            <FontAwesomeIcon icon={config.icon} />
          </span>
          <span>{config.label}</span>
        </span>
      }
      right={
        <span data-tour={`col-${category}`}>
          <HeaderAddButton accent={config.accent} onClick={() => setShowBuild(!showBuild)} />
        </span>
      }
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
        minWidth: 0,
        overflow: "hidden",
      }}
    >
      <style>{`@keyframes lvnp-status-pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.45; } }`}</style>

      {/* Summary: status line + hero output + cost bar */}
      <div
        style={{
          marginBottom: 14,
          paddingBottom: 14,
          borderBottom: "1px dashed rgba(110,200,255,0.10)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 12,
          }}
        >
          <div
            style={{
              fontFamily: FONT_MONO,
              fontSize: 12,
              fontWeight: 500,
              letterSpacing: "0.16em",
              color: config.accent,
            }}
          >
            {activeCount} ACTIVE · {idleCount} IDLE
          </div>
          <div
            style={{
              fontFamily: FONT_MONO,
              fontSize: 10.5,
              letterSpacing: "0.14em",
              color: "#9ab4cf",
              border: "1px solid rgba(110,200,255,0.18)",
              borderRadius: 999,
              padding: "3px 10px",
            }}
          >
            <b style={{ color: "#d6e8f5", fontWeight: 600 }}>{completed.length}</b> OWNED
          </div>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 18,
          }}
        >
          <div style={{ display: "flex", alignItems: "baseline", gap: 10, flex: "none" }}>
            <span
              style={{
                fontSize: 40,
                fontWeight: 600,
                lineHeight: 1,
                letterSpacing: "-0.02em",
                color: config.accent,
                textShadow: `0 0 22px ${config.accent}55`,
              }}
            >
              {config.formatOutput(summaryRate)}
            </span>
            <span style={{ display: "flex", flexDirection: "column", gap: 2, lineHeight: 1 }}>
              <span style={{ fontFamily: FONT_MONO, fontSize: 11, color: config.accent }}>
                {config.outputUnit}
              </span>
              <span
                style={{
                  fontFamily: FONT_MONO,
                  fontSize: 9,
                  letterSpacing: "0.2em",
                  color: "#6b87a3",
                  textTransform: "uppercase",
                }}
              >
                {config.description}
              </span>
            </span>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <CostBar totals={totals} />
          </div>
        </div>
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
          {(() => {
            const probePrint = system.mainProbe?.mode === "printing"
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
                    <span style={{ fontSize: 14, color: "#d6e8f5" }}>{label}</span>
                    <span
                      style={{
                        fontFamily: FONT_MONO,
                        fontSize: 12,
                        color: config.accent,
                      }}
                    >
                      {remaining === Infinity ? "Paused: No printers" : fmtCycles(remaining)}
                      {globalIndex > 0 && remaining !== Infinity && (
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
            });
          })()}
        </div>
      )}

      {/* Section divider */}
      {completed.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "0 0 12px" }}>
          <span style={{ flex: 1, height: 1, background: "rgba(110,200,255,0.10)" }} />
          <span
            style={{
              fontFamily: FONT_MONO,
              fontSize: 9,
              letterSpacing: "0.2em",
              color: "#4d6480",
              textTransform: "uppercase",
              whiteSpace: "nowrap",
            }}
          >
            {completed.length} unit{completed.length === 1 ? "" : "s"}
          </span>
          <span style={{ flex: 1, height: 1, background: "rgba(110,200,255,0.10)" }} />
        </div>
      )}

      {/* Owned structures */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 9,
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
          const serial = (serials[def.name] ?? 0) + 1;
          serials[def.name] = serial;
          return (
            <UnitCard
              key={inst.id}
              inst={inst}
              def={def}
              serial={serial}
              config={config}
              isNew={recentlyBuilt.has(inst.id)}
              isConfirming={destroyConfirmId === inst.id}
              refundAmount={refundAmount}
              onToggle={() =>
                dispatch({
                  type: "toggle_structure",
                  systemId: system.id,
                  structureId: inst.id,
                })
              }
              onDestroyRequest={() => setDestroyConfirmId(inst.id)}
              onDestroyConfirm={() => {
                dispatch({
                  type: "destroy_structure",
                  systemId: system.id,
                  structureId: inst.id,
                });
                setDestroyConfirmId(null);
              }}
              onDestroyCancel={() => setDestroyConfirmId(null)}
            />
          );
        })}
      </div>
    </Panel>
  );
}
