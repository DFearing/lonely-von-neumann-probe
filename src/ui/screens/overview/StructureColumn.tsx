import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faAtom, faBolt, faIndustry, faSatellite, faCircleHalfStroke, faCircle, faArrowRight, faXmark, faCaretDown, faMicrochip, faPause, faPlay, faTrash } from "@fortawesome/free-solid-svg-icons";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import type { SystemState, StructureInstance, StructureType } from "../../../simulation/state";
import type { ResourceRates } from "../../../simulation/rates";
import type { PlayerAction } from "../../../simulation/actions";
import { STRUCTURES } from "../../../simulation/data/structures";
import type { StructureDefinition } from "../../../simulation/data/structures";
import { structureKey } from "../../../simulation/data/structures";
import { getAvailableStructures } from "../../../simulation/queries";
import { calculateRates } from "../../../simulation/rates";
import { Panel } from "../../components/Panel";
import { HealthGauge } from "../../components/HealthGauge";
import { Tooltip } from "../../components/Tooltip";
import { HeaderAddButton } from "./HeaderAddButton";
import { fmt, fmtYears } from "../../format";
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
    formatSummaryRate: (rate) => `${rate >= 0 ? "+" : ""}${rate.toFixed(1)} T/year`,
  },
  reactors: {
    structureType: "reactor",
    label: "REACTORS",
    accent: "#6aa9ff",
    icon: faBolt,
    description: "Generate Energy",
    formatSummaryRate: (rate) => `${rate >= 0 ? "+" : ""}${rate.toFixed(1)} MW/year`,
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
    return `+${def.productionRate.toFixed(1)} T/year`;
  }
  if (category === "reactors") {
    return `+${def.productionRate.toFixed(1)} MW/year`;
  }
  if (category === "stations") {
    return `+${def.productionRate.toFixed(1)} TFLOPS`;
  }
  return `${def.productionRate.toFixed(1)} BP`;
}

function simulateWithStructure(
  system: SystemState,
  def: StructureDefinition,
): ResourceRates {
  const fakeStructure: StructureInstance = {
    id: "_preview",
    type: def.type,
    tier: def.tier,
    productionRate: def.productionRate,
    operatingCost: def.operatingCost,
    maintenanceCost: def.maintenanceCost,
    computeDemand: def.computeDemand,
    active: true,
    constructionProgress: 1,
    health: 1,
  };
  const key = `${def.type}s` as keyof typeof system.structures;
  const preview: SystemState = {
    ...system,
    structures: {
      ...system.structures,
      [key]: [...system.structures[key], fakeStructure],
    },
  };
  return calculateRates(preview);
}

function DeltaRow({
  label,
  before,
  after,
  unit,
  accent,
}: {
  label: string;
  before: number;
  after: number;
  unit: string;
  accent: string;
}) {
  const delta = after - before;
  const sign = delta >= 0 ? "+" : "";
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "baseline",
        fontFamily: FONT_MONO,
        fontSize: 10,
      }}
    >
      <span style={{ color: "#6b87a3" }}>{label}</span>
      <span>
        <span style={{ color: "#6b87a3" }}>{before.toFixed(1)}</span>
        <span style={{ color: "#3d5572" }}> → </span>
        <span style={{ color: "#d6e8f5" }}>{after.toFixed(1)} {unit}</span>
        <span style={{ color: delta >= 0 ? accent : "#ff6b6b", marginLeft: 8 }}>
          {sign}{delta.toFixed(1)}
        </span>
      </span>
    </div>
  );
}

function ConsumeBar({
  label,
  cost,
  available,
  ok,
}: {
  label: string;
  cost: number;
  available: number;
  ok: boolean;
}) {
  const pct = Math.min(100, available > 0 ? (cost / available) * 100 : 100);
  const color = ok ? "#4cd8a8" : "#ff9966";
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontFamily: FONT_MONO, fontSize: 9, letterSpacing: "0.18em", color: "#6b87a3" }}>{label}</span>
        <span style={{ fontFamily: FONT_MONO, fontSize: 10, color: "#9ab4cf" }}>
          <span style={{ color }}>{fmt(cost)}</span>
          <span style={{ color: "#3d5572" }}> / </span>
          <span>{fmt(Math.floor(available))}</span>
        </span>
      </div>
      <div style={{ position: "relative", height: 4, background: "rgba(110,200,255,0.06)" }}>
        <div
          style={{
            position: "absolute",
            inset: "0 auto 0 0",
            width: `${pct}%`,
            background: color,
            opacity: 0.85,
            boxShadow: ok ? `0 0 6px ${color}40` : "none",
          }}
        />
      </div>
    </div>
  );
}

function StatusBadge({ affordable }: { affordable: boolean }) {
  const label = affordable ? "READY" : "INSUFFICIENT";
  const color = affordable ? "#4cd8a8" : "#ff9966";
  return (
    <span
      style={{
        fontFamily: FONT_MONO,
        fontSize: 9,
        letterSpacing: "0.16em",
        color,
        padding: "2px 8px",
        border: `1px solid ${color}55`,
        background: `${color}10`,
      }}
    >
      {label}
    </span>
  );
}

function BuildStructureModal({
  system,
  category,
  config,
  allDefs,
  availableForType,
  dispatch,
  onClose,
}: {
  system: SystemState;
  category: CategoryId;
  config: CategoryConfig;
  allDefs: StructureDefinition[];
  availableForType: StructureDefinition[];
  dispatch: (action: PlayerAction) => void;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState(availableForType[0]?.tier ?? 1);
  const selectedDef = allDefs.find((d) => d.tier === selected);
  const currentRates = system.resourceRates;
  const currentBP = computeSummaryRate(system, "printers");

  const selAffordable = selectedDef
    ? system.resources.materials >= selectedDef.cost.materials
    : false;
  const canBuild = selAffordable;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        background: "rgba(2,6,14,0.72)",
        backdropFilter: "blur(2px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 32,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(600px, 100%)",
          maxHeight: "85vh",
          background: "linear-gradient(180deg, rgba(13,24,46,0.85) 0%, rgba(8,16,30,0.85) 100%)",
          border: `1px solid ${config.accent}22`,
          display: "flex",
          flexDirection: "column",
          position: "relative",
        }}
      >
        {/* Corner ticks */}
        {(["tl", "tr", "bl", "br"] as const).map((c) => {
          const base = { position: "absolute" as const, width: 10, height: 10 };
          const pos = {
            tl: { top: 0, left: 0, borderTop: `2px solid ${config.accent}`, borderLeft: `2px solid ${config.accent}` },
            tr: { top: 0, right: 0, borderTop: `2px solid ${config.accent}`, borderRight: `2px solid ${config.accent}` },
            bl: { bottom: 0, left: 0, borderBottom: `2px solid ${config.accent}`, borderLeft: `2px solid ${config.accent}` },
            br: { bottom: 0, right: 0, borderBottom: `2px solid ${config.accent}`, borderRight: `2px solid ${config.accent}` },
          }[c];
          return <div key={c} style={{ ...base, ...pos }} />;
        })}

        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "14px 18px 12px",
            borderBottom: `1px solid ${config.accent}1a`,
            flexShrink: 0,
          }}
        >
          <div style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
            <FontAwesomeIcon icon={config.icon} style={{ color: config.accent, fontSize: 14, textShadow: `0 0 8px ${config.accent}80` }} />
            <span style={{ fontFamily: FONT_MONO, fontSize: 11, letterSpacing: "0.22em", color: config.accent }}>
              BUILD {config.label.slice(0, -1).toUpperCase()}
            </span>
          </div>
          <button
            onClick={onClose}
            style={{
              fontFamily: FONT_MONO,
              fontSize: 10,
              letterSpacing: "0.18em",
              color: "#9ab4cf",
              background: "transparent",
              border: "1px solid #3d557280",
              padding: "4px 10px",
              borderRadius: 2,
              cursor: "pointer",
            }}
          >
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </div>

        {/* Resources strip */}
        <div
          style={{
            padding: "10px 18px",
            display: "flex",
            alignItems: "center",
            gap: 18,
            borderBottom: `1px dashed ${config.accent}14`,
            fontFamily: FONT_MONO,
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: 9, letterSpacing: "0.18em", color: "#6b87a3" }}>READY</span>
          <span style={{ display: "inline-flex", alignItems: "baseline", gap: 6 }}>
            <span style={{ fontSize: 9, letterSpacing: "0.16em", color: "#6b87a3" }}>NANO MAT</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#5fd9c4" }}>{fmt(Math.floor(system.resources.materials))}</span>
            <span style={{ fontSize: 9, color: "#6b87a3" }}>tons</span>
          </span>
          <span style={{ flex: 1 }} />
          <span style={{ fontSize: 9, letterSpacing: "0.18em", color: "#6b87a3" }}>
            {availableForType.filter((d) => system.resources.materials >= d.cost.materials).length} / {availableForType.length} BUILDABLE
          </span>
        </div>

        {/* Rows */}
        <div style={{ flex: 1, overflowY: "auto", padding: "6px 0" }}>
          {allDefs.filter((d) => availableForType.some((a) => a.type === d.type && a.tier === d.tier)).map((def) => {
            const affordable = system.resources.materials >= def.cost.materials;
            const isSelected = def.tier === selected;
            const afterRates = simulateWithStructure(system, def);

            return (
              <div
                key={`${def.type}_${def.tier}`}
                onClick={() => setSelected(def.tier)}
                style={{
                  padding: "12px 18px",
                  background: isSelected ? `${config.accent}0a` : "transparent",
                  borderLeft: isSelected ? `2px solid ${config.accent}` : "2px solid transparent",
                  cursor: "pointer",
                  transition: "background .12s, border-color .12s",
                }}
              >
                {/* Name + status */}
                <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 8 }}>
                  <div style={{ display: "inline-flex", alignItems: "baseline", gap: 10 }}>
                    <span style={{ fontSize: 14, fontWeight: 500, color: "#d6e8f5" }}>
                      {def.name}
                    </span>
                    <span style={{ fontFamily: FONT_MONO, fontSize: 10, color: config.accent }}>
                      {formatVariantSpec(def, category)}
                    </span>
                  </div>
                  <StatusBadge affordable={affordable} />
                </div>

                {/* Consumption bar */}
                <div style={{ marginBottom: 8 }}>
                  <ConsumeBar
                    label="NANO MATERIAL"
                    cost={def.cost.materials}
                    available={system.resources.materials}
                    ok={affordable}
                  />
                </div>

                {/* Stats row */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr 1fr",
                    fontFamily: FONT_MONO,
                    fontSize: 10,
                    borderTop: `1px dashed ${config.accent}10`,
                    paddingTop: 8,
                  }}
                >
                  <span>
                    <span style={{ color: "#6b87a3", letterSpacing: "0.16em" }}>BUILD </span>
                    <span style={{ color: "#b08bff" }}>
                      {currentBP > 0 ? fmtYears(def.cost.materials / currentBP) : "—"}
                    </span>
                  </span>
                  <span>
                    <span style={{ color: "#6b87a3", letterSpacing: "0.16em" }}>BP·S </span>
                    <span style={{ color: "#9ab4cf" }}>{fmt(def.cost.materials)}</span>
                  </span>
                  <span>
                    <span style={{ color: "#6b87a3", letterSpacing: "0.16em" }}>DRAW </span>
                    <span style={{ color: def.operatingCost > 0 ? "#ff9966" : "#6b87a3" }}>
                      {def.operatingCost > 0 ? `${def.operatingCost.toFixed(1)} MW` : "none"}
                    </span>
                  </span>
                </div>

                {/* Delta block when selected */}
                {isSelected && (
                  <div
                    style={{
                      marginTop: 10,
                      padding: "10px 12px",
                      background: `${config.accent}08`,
                      border: `1px solid ${config.accent}24`,
                    }}
                  >
                    <div style={{ fontFamily: FONT_MONO, fontSize: 9, letterSpacing: "0.22em", color: "#6b87a3", marginBottom: 8 }}>
                      AFTER CONSTRUCTION
                    </div>
                    {category === "miners" && (
                      <DeltaRow
                        label="Nano Material"
                        before={currentRates.materialsPerSecond}
                        after={afterRates.materialsPerSecond}
                        unit="T/year"
                        accent={config.accent}
                      />
                    )}
                    {category === "reactors" && (
                      <DeltaRow
                        label="Energy supply"
                        before={currentRates.energySupply}
                        after={afterRates.energySupply}
                        unit="MW"
                        accent={config.accent}
                      />
                    )}
                    {category === "printers" && (
                      <DeltaRow
                        label="Build power"
                        before={computeSummaryRate(system, "printers")}
                        after={computeSummaryRate(system, "printers") + def.productionRate}
                        unit="BP"
                        accent={config.accent}
                      />
                    )}
                    {def.operatingCost > 0 && (
                      <DeltaRow
                        label="Energy demand"
                        before={currentRates.energyDemand}
                        after={afterRates.energyDemand}
                        unit="MW"
                        accent="#ff9966"
                      />
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer CTA */}
        {selectedDef && (
          <div
            style={{
              padding: "14px 18px",
              borderTop: `1px solid ${config.accent}1a`,
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <div style={{ flex: 1, fontFamily: FONT_MONO, fontSize: 11, color: "#9ab4cf" }}>
              <span style={{ color: "#6b87a3" }}>SELECTED · </span>
              <span style={{ color: "#d6e8f5" }}>{selectedDef.name}</span>
              <span style={{ color: "#3d5572" }}> · </span>
              <span style={{ color: canBuild ? "#4cd8a8" : "#ff9966" }}>
                {canBuild ? `${fmt(selectedDef.cost.materials)} tons` : "INSUFFICIENT"}
              </span>
            </div>
            <button
              disabled={!canBuild}
              onClick={() => {
                if (!canBuild || !selectedDef) return;
                dispatch({
                  type: "build_structure",
                  systemId: system.id,
                  structureType: config.structureType,
                  tier: selectedDef.tier,
                });
                onClose();
              }}
              style={{
                fontFamily: FONT_MONO,
                fontSize: 12,
                letterSpacing: "0.18em",
                padding: "10px 22px",
                background: canBuild ? `${config.accent}18` : "transparent",
                border: `1px solid ${canBuild ? `${config.accent}99` : `${config.accent}44`}`,
                color: canBuild ? config.accent : "#6b87a3",
                opacity: canBuild ? 1 : 0.7,
                borderRadius: 2,
                cursor: canBuild ? "pointer" : "not-allowed",
                boxShadow: canBuild ? `0 0 12px ${config.accent}30` : "none",
              }}
            >
              CONSTRUCT <FontAwesomeIcon icon={faArrowRight} style={{ marginLeft: 6 }} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
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

  const available = getAvailableStructures(system);
  const availableForType = available.filter((d) => d.type === config.structureType);
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
                <FontAwesomeIcon icon={faCaretDown} style={{ marginRight: 4 }} />{maint.toFixed(2)} T/year maintenance
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
        <BuildStructureModal
          system={system}
          category={category}
          config={config}
          allDefs={allDefs}
          availableForType={availableForType}
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
          <div
            style={{
              fontFamily: FONT_MONO,
              fontSize: 11,
              color: "#6b87a3",
              letterSpacing: "0.18em",
              marginBottom: 8,
            }}
          >
            <FontAwesomeIcon icon={faCircleHalfStroke} style={{ marginRight: 4 }} /> BUILDING NOW
          </div>
          {(() => { let probeUsed = false; let cumulativeYears = 0; return building.map((q, qi) => {
            const pct = Math.min(100, q.progress * 100);
            const tierDef = allDefs.find((d) => d.tier === q.targetTier);
            const label = tierDef ? tierDef.name : config.structureType;
            const probePrint = system.mainProbe?.mode === "printing"
              ? system.mainProbe.internalPrinterSpeed
              : 0;
            let assignedSpeed = 0;
            for (const pid of q.assignedPrinterIds) {
              const p = system.structures.printers.find(
                (s) => s.id === pid && s.active && s.constructionProgress >= 1,
              );
              if (p) assignedSpeed += p.productionRate;
            }
            const effectiveProbePrint = probeUsed ? 0 : probePrint;
            const totalSpeed = effectiveProbePrint + assignedSpeed;
            if (totalSpeed > 0 && !probeUsed && probePrint > 0) probeUsed = true;
            const buildTime = q.totalCost.materials;
            const waitSpeed = totalSpeed > 0 ? totalSpeed : (probePrint + assignedSpeed);
            const remaining = waitSpeed > 0
              ? Math.max(0, buildTime * (1 - q.progress) / waitSpeed)
              : Infinity;
            cumulativeYears += remaining === Infinity ? 0 : remaining;
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
                    {totalSpeed > 0 ? fmtYears(remaining) : fmtYears(remaining)}
                    {qi > 0 && (
                      <span style={{ color: "#6b87a3" }}> ({fmtYears(cumulativeYears)})</span>
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
                  {q.assignedPrinterIds.length > 0
                    ? q.assignedPrinterIds.join(", ")
                    : "printer queued"}{" "}
                  &middot; {pct.toFixed(0)}%
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
                    <span style={{ color: "#5fd9c4" }}>{inst.maintenanceCost.toFixed(2)} T/yr</span>
                  )}
                  {inst.maintenanceCost > 0 && inst.operatingCost > 0 && (
                    <span style={{ color: "#6b87a3" }}> · </span>
                  )}
                  {inst.operatingCost > 0 && (
                    <span style={{ color: "#6aa9ff" }}>{inst.operatingCost.toFixed(1)} MW/yr</span>
                  )}
                  {(inst.maintenanceCost > 0 || inst.operatingCost > 0) && inst.computeDemand > 0 && (
                    <span style={{ color: "#6b87a3" }}> · </span>
                  )}
                  {inst.computeDemand > 0 && (
                    <span style={{ color: "#b08bff" }}>{inst.computeDemand.toFixed(2)} TFLOPS/yr</span>
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
