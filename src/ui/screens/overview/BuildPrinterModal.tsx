import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faIndustry, faXmark, faArrowRight } from "@fortawesome/free-solid-svg-icons";
import type { SystemState } from "../../../simulation/state";
import type { PlayerAction } from "../../../simulation/actions";
import type { StructureDefinition } from "../../../simulation/data/structures";
import { STRUCTURES } from "../../../simulation/data/structures";
import { FONT_MONO } from "../../tokens";
import { fmt, fmtYears } from "../../format";

const ACCENT = "#4cd8a8";

function getAllPrinterDefs(): StructureDefinition[] {
  return Object.values(STRUCTURES)
    .filter((d) => d.type === "printer")
    .sort((a, b) => a.tier - b.tier);
}

function isUnlocked(system: SystemState, def: StructureDefinition): boolean {
  return !def.techGate || system.completedResearch[def.techGate] === true;
}

function getTotalBuildPower(system: SystemState): number {
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

function ResourcePip({
  label,
  value,
  unit,
  color,
}: {
  label: string;
  value: number;
  unit: string;
  color: string;
}) {
  return (
    <div style={{ display: "inline-flex", alignItems: "baseline", gap: 6 }}>
      <span style={{ fontFamily: FONT_MONO, fontSize: 9, letterSpacing: "0.16em", color: "#6b87a3" }}>{label}</span>
      <span style={{ fontFamily: FONT_MONO, fontSize: 13, fontWeight: 600, color }}>{fmt(value)}</span>
      <span style={{ fontFamily: FONT_MONO, fontSize: 9, color: "#6b87a3" }}>{unit}</span>
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

function Stat({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div>
      <span style={{ fontFamily: FONT_MONO, fontSize: 10, color: "#6b87a3", letterSpacing: "0.16em" }}>{label} </span>
      <span style={{ fontFamily: FONT_MONO, fontSize: 10, color }}>{value}</span>
    </div>
  );
}

function BudgetRow({
  def,
  system,
  selected,
  onSelect,
}: {
  def: StructureDefinition;
  system: SystemState;
  selected: boolean;
  onSelect: () => void;
}) {
  const locked = !isUnlocked(system, def);
  const affordM = system.resources.materials >= def.cost.materials;
  const energyNet = system.resourceRates.energySupply - system.resourceRates.energyDemand;

  const currentBP = getTotalBuildPower(system);
  const buildTime = currentBP > 0 ? def.cost.materials / currentBP : Infinity;
  const payback = def.productionRate > 0 ? Math.round(def.cost.materials / (def.productionRate * 4)) : Infinity;

  let status: string;
  let statusColor: string;
  if (locked) {
    status = "TECH LOCKED";
    statusColor = "#6b87a3";
  } else if (!affordM) {
    const shortfall = def.cost.materials - Math.floor(system.resources.materials);
    status = `+${fmt(shortfall)} TONS SHORT`;
    statusColor = "#ff9966";
  } else {
    status = "READY";
    statusColor = "#4cd8a8";
  }

  return (
    <div
      onClick={onSelect}
      style={{
        padding: "12px 18px",
        background: selected ? `${ACCENT}0a` : "transparent",
        borderLeft: selected ? `2px solid ${ACCENT}` : "2px solid transparent",
        cursor: "pointer",
        opacity: locked ? 0.78 : 1,
        transition: "background .12s, border-color .12s",
      }}
    >
      {/* Name + speed + status */}
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 8 }}>
        <div style={{ display: "inline-flex", alignItems: "baseline", gap: 10 }}>
          <span style={{ fontSize: 14, fontWeight: 500, color: locked ? "#9ab4cf" : "#d6e8f5" }}>{def.name}</span>
          <span style={{ fontFamily: FONT_MONO, fontSize: 10, color: locked ? "#6b87a3" : ACCENT }}>
            {def.productionRate.toFixed(1)} BP
          </span>
        </div>
        <span
          style={{
            fontFamily: FONT_MONO,
            fontSize: 9,
            letterSpacing: "0.16em",
            color: statusColor,
            padding: "2px 8px",
            border: `1px solid ${statusColor}55`,
            background: `${statusColor}10`,
          }}
        >
          {status}
        </span>
      </div>

      {/* Consumption bars */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 8 }}>
        <ConsumeBar
          label="MATERIALS"
          cost={def.cost.materials}
          available={system.resources.materials}
          ok={affordM && !locked}
        />
        <ConsumeBar
          label="ENERGY DRAW"
          cost={def.operatingCost}
          available={Math.max(0, energyNet)}
          ok={!locked && energyNet >= def.operatingCost}
        />
      </div>

      {/* Bottom stats */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          borderTop: `1px dashed ${ACCENT}10`,
          paddingTop: 8,
        }}
      >
        <Stat
          label="BUILD"
          value={currentBP > 0 ? fmtYears(buildTime) : "—"}
          color="#b08bff"
        />
        <Stat
          label="OUTPUT"
          value={`${def.productionRate.toFixed(1)} BP`}
          color={ACCENT}
        />
        <Stat
          label="PAYBACK"
          value={locked ? "—" : fmtYears(payback)}
          color="#4cd8a8"
        />
      </div>
    </div>
  );
}

function BuildCTA({
  def,
  canBuild,
  locked,
  onBuild,
}: {
  def: StructureDefinition;
  canBuild: boolean;
  locked: boolean;
  onBuild: () => void;
}) {
  const color = locked ? "#6b87a3" : canBuild ? ACCENT : "#ff9966";
  return (
    <>
      <div style={{ flex: 1, fontFamily: FONT_MONO, fontSize: 11, color: "#9ab4cf" }}>
        <span style={{ color: "#6b87a3" }}>SELECTED &middot; </span>
        <span style={{ color: "#d6e8f5" }}>{def.name}</span>
        <span style={{ color: "#3d5572" }}> &middot; </span>
        <span style={{ color: locked ? "#ff9966" : canBuild ? ACCENT : "#ff9966" }}>
          {locked ? "TECH LOCKED" : canBuild ? `${fmt(def.cost.materials)} tons` : "INSUFFICIENT"}
        </span>
      </div>
      <button
        disabled={!canBuild}
        onClick={onBuild}
        style={{
          fontFamily: FONT_MONO,
          fontSize: 12,
          letterSpacing: "0.18em",
          padding: "10px 22px",
          background: canBuild ? `${color}18` : "transparent",
          border: `1px solid ${canBuild ? `${color}99` : `${color}44`}`,
          color,
          opacity: canBuild ? 1 : 0.7,
          borderRadius: 2,
          cursor: canBuild ? "pointer" : "not-allowed",
          boxShadow: canBuild ? `0 0 12px ${color}30` : "none",
        }}
      >
        {locked ? "LOCKED" : "CONSTRUCT"}
        {!locked && <FontAwesomeIcon icon={faArrowRight} style={{ marginLeft: 8 }} />}
      </button>
    </>
  );
}

export function BuildPrinterModal({
  system,
  dispatch,
  onClose,
}: {
  system: SystemState;
  dispatch: (action: PlayerAction) => void;
  onClose: () => void;
}) {
  const allDefs = getAllPrinterDefs();
  const [selectedTier, setSelectedTier] = useState(allDefs[0]?.tier ?? 1);
  const selectedDef = allDefs.find((d) => d.tier === selectedTier);

  const materials = Math.floor(system.resources.materials);
  const energyNet = system.resourceRates.energySupply - system.resourceRates.energyDemand;

  const buildableCount = allDefs.filter((d) => {
    return isUnlocked(system, d) && system.resources.materials >= d.cost.materials;
  }).length;

  const selectedLocked = selectedDef ? !isUnlocked(system, selectedDef) : true;
  const canBuild = selectedDef
    ? !selectedLocked && system.resources.materials >= selectedDef.cost.materials
    : false;

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
          border: `1px solid ${ACCENT}22`,
          display: "flex",
          flexDirection: "column",
          position: "relative",
        }}
      >
        {/* Corner ticks */}
        {(["tl", "tr", "bl", "br"] as const).map((c) => {
          const base = { position: "absolute" as const, width: 10, height: 10 };
          const pos = {
            tl: { top: 0, left: 0, borderTop: `2px solid ${ACCENT}`, borderLeft: `2px solid ${ACCENT}` },
            tr: { top: 0, right: 0, borderTop: `2px solid ${ACCENT}`, borderRight: `2px solid ${ACCENT}` },
            bl: { bottom: 0, left: 0, borderBottom: `2px solid ${ACCENT}`, borderLeft: `2px solid ${ACCENT}` },
            br: { bottom: 0, right: 0, borderBottom: `2px solid ${ACCENT}`, borderRight: `2px solid ${ACCENT}` },
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
            borderBottom: `1px solid ${ACCENT}1a`,
            flexShrink: 0,
          }}
        >
          <div style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
            <FontAwesomeIcon
              icon={faIndustry}
              style={{ color: ACCENT, fontSize: 14, filter: `drop-shadow(0 0 8px ${ACCENT}80)` }}
            />
            <span style={{ fontFamily: FONT_MONO, fontSize: 11, letterSpacing: "0.22em", color: ACCENT }}>
              BUILD PRINTER
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
            borderBottom: `1px dashed ${ACCENT}14`,
            flexShrink: 0,
          }}
        >
          <div style={{ fontFamily: FONT_MONO, fontSize: 9, letterSpacing: "0.18em", color: "#6b87a3" }}>READY</div>
          <ResourcePip label="MATERIALS" value={materials} unit="tons" color="#5cc7ff" />
          <ResourcePip label="ENERGY" value={Math.max(0, Math.floor(energyNet * 10) / 10)} unit="MW" color="#ffcb47" />
          <div style={{ flex: 1 }} />
          <div style={{ fontFamily: FONT_MONO, fontSize: 9, letterSpacing: "0.18em", color: "#6b87a3" }}>
            {buildableCount} / {allDefs.length} BUILDABLE
          </div>
        </div>

        {/* Printer rows */}
        <div style={{ flex: 1, overflowY: "auto", padding: "6px 0" }}>
          {allDefs.map((def) => (
            <BudgetRow
              key={def.tier}
              def={def}
              system={system}
              selected={def.tier === selectedTier}
              onSelect={() => setSelectedTier(def.tier)}
            />
          ))}
        </div>

        {/* Footer CTA */}
        {selectedDef && (
          <div
            style={{
              padding: "14px 18px",
              borderTop: `1px solid ${ACCENT}1a`,
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <BuildCTA
              def={selectedDef}
              canBuild={canBuild}
              locked={selectedLocked}
              onBuild={() => {
                if (!canBuild || !selectedDef) return;
                dispatch({
                  type: "build_structure",
                  systemId: system.id,
                  structureType: "printer",
                  tier: selectedDef.tier,
                });
                onClose();
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
