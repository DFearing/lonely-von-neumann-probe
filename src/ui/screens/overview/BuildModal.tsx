import { useState, useEffect, type CSSProperties } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faIndustry, faBolt, faAtom, faSatellite } from "@fortawesome/free-solid-svg-icons";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import type { SystemState, StructureType } from "../../../simulation/state";
import type { PlayerAction } from "../../../simulation/actions";
import type { StructureDefinition } from "../../../simulation/data/structures";
import { STRUCTURES } from "../../../simulation/data/structures";
import { TECH_TREE } from "../../../simulation/data/tech-tree";
import { getAvailableStructures } from "../../../simulation/queries";
import { FONT_MONO, FONT_DISPLAY } from "../../tokens";
import { fmt } from "../../format";

// ---------------------------------------------------------------------------
// Color palette (mirrors the standalone design tokens)
// ---------------------------------------------------------------------------

const C = {
  ink: "#d6e8f5",
  ink2: "#9ab4cf",
  ink3: "#6b87a3",
  ink4: "#3d5572",
  ink5: "rgba(110,200,255,0.10)",
  bg: "#050913",
  panel: "rgba(8,16,30,0.7)",
  cyan: "#4ddbff",
  teal: "#4cd8a8",
  yellow: "#ffcb47",
  warn: "#ff9966",
  lilac: "#d488ec",
} as const;

// ---------------------------------------------------------------------------
// Category configuration
// ---------------------------------------------------------------------------

type CategoryId = "miners" | "reactors" | "printers" | "stations";

interface CatConfig {
  label: string;
  icon: IconDefinition;
  accent: string;
  structureType: StructureType;
}

const CAT: Record<CategoryId, CatConfig> = {
  printers: {
    label: "PRINTER",
    icon: faIndustry,
    accent: "#4ddbff",
    structureType: "printer",
  },
  reactors: {
    label: "REACTOR",
    icon: faBolt,
    accent: "#ffcb47",
    structureType: "reactor",
  },
  miners: {
    label: "MINER",
    icon: faAtom,
    accent: "#4cd8a8",
    structureType: "miner",
  },
  stations: {
    label: "STATION",
    icon: faSatellite,
    accent: "#b08bff",
    structureType: "station",
  },
};

const CATEGORY_ORDER: CategoryId[] = ["printers", "reactors", "miners", "stations"];

// ---------------------------------------------------------------------------
// Presentation blurbs per structure type + tier
// ---------------------------------------------------------------------------

const BLURBS: Record<string, string> = {
  printer_1: "First-generation fabricator. The workhorse of new colonies.",
  printer_2: "Multi-head fabricator. Doubles throughput for modest cost.",
  printer_3: "Atom-resolution deposition. Required for complex objects.",
  printer_4: "Programmable matter at the atom scale. Used for advanced probes.",
  printer_5: "Coherent-state pattern projection. Speed comes at thermal cost.",
  printer_6: "Self-replicating assembler. Each unit can spawn copies of itself.",
  reactor_1: "Fission-based power plant providing steady baseline energy.",
  reactor_2: "Hydrogen fusion core with improved energy density.",
  reactor_3: "Matter-antimatter annihilation for massive power output.",
  reactor_4: "Extracts energy from quantum vacuum fluctuations.",
  reactor_5: "Stellar-powered electromagnetic generators. Output scales with star type.",
  reactor_6: "Harvests radiation from contained micro black holes.",
  miner_1: "Standard extraction rig for surface-level ore deposits.",
  miner_2: "Rotary bore system reaching mid-depth mineral veins.",
  miner_3: "High-energy beam cuts through dense rock formations.",
  miner_4: "Reaches deep planetary mantle for rare minerals.",
  miner_5: "Uses gravity pulses to extract buried resources.",
  miner_6: "Breaks apart asteroid bodies for bulk processing.",
  station_1: "Basic communication and data processing facility.",
  station_2: "Networked processors for parallel computation.",
  station_3: "Neuromorphic computing array for complex analysis.",
  station_4: "Quantum computing center for exponential processing.",
  station_5: "Star-scale computing megastructure.",
  station_6: "Nested computational shells maximizing stellar output.",
};

// ---------------------------------------------------------------------------
// Output unit labels per structure type
// ---------------------------------------------------------------------------

const OUTPUT_UNITS: Record<StructureType, string> = {
  miner: "T/cycle",
  reactor: "MW",
  printer: "BP/s",
  station: "TFLOPS",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmtBuildTime(def: StructureDefinition, bpPerSec: number): string {
  if (bpPerSec <= 0) return "—";
  const secs = def.cost.materials / bpPerSec;
  if (secs < 60) return `${Math.ceil(secs)}s`;
  if (secs < 3600) return `${Math.floor(secs / 60)}m ${Math.floor(secs % 60)}s`;
  return `${Math.floor(secs / 3600)}h ${Math.floor((secs % 3600) / 60)}m`;
}

function getTechName(techGate: string): string {
  const tech = TECH_TREE[techGate];
  return tech ? tech.name : techGate;
}

function getSystemBP(system: SystemState): number {
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

function getDefsForCategory(category: CategoryId): StructureDefinition[] {
  const type = CAT[category].structureType;
  return Object.values(STRUCTURES)
    .filter((d) => d.type === type)
    .sort((a, b) => a.tier - b.tier);
}

function isUnlocked(system: SystemState, def: StructureDefinition): boolean {
  const available = getAvailableStructures(system);
  return available.some((a) => a.type === def.type && a.tier === def.tier);
}

function isAffordable(system: SystemState, def: StructureDefinition): boolean {
  return system.resources.materials >= def.cost.materials;
}

// ---------------------------------------------------------------------------
// Shared sub-components
// ---------------------------------------------------------------------------

const mono: CSSProperties = { fontFamily: FONT_MONO };
const disp: CSSProperties = { fontFamily: FONT_DISPLAY };

function CornerTicks({ accent, size = 10, inset = -1 }: { accent: string; size?: number; inset?: number }) {
  return (
    <>
      {(["tl", "tr", "bl", "br"] as const).map((c) => {
        const pos =
          c === "tl"
            ? { top: inset, left: inset, borderTop: `2px solid ${accent}`, borderLeft: `2px solid ${accent}` }
            : c === "tr"
              ? { top: inset, right: inset, borderTop: `2px solid ${accent}`, borderRight: `2px solid ${accent}` }
              : c === "bl"
                ? { bottom: inset, left: inset, borderBottom: `2px solid ${accent}`, borderLeft: `2px solid ${accent}` }
                : { bottom: inset, right: inset, borderBottom: `2px solid ${accent}`, borderRight: `2px solid ${accent}` };
        return <div key={c} style={{ position: "absolute", width: size, height: size, ...pos }} />;
      })}
    </>
  );
}

function NavArrow({ dir, onClick, accent, disabled }: { dir: "left" | "right"; onClick: () => void; accent: string; disabled: boolean }) {
  const ch = dir === "left" ? "‹" : "›";
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        width: 36,
        height: 36,
        borderRadius: "50%",
        background: disabled ? "transparent" : `${accent}10`,
        border: `1px solid ${disabled ? C.ink4 + "40" : accent + "66"}`,
        color: disabled ? C.ink4 : accent,
        ...mono,
        fontSize: 22,
        lineHeight: "30px",
        cursor: disabled ? "not-allowed" : "pointer",
        boxShadow: disabled ? "none" : `0 0 10px ${accent}30`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        paddingBottom: 3,
        flexShrink: 0,
        position: "relative",
        zIndex: 20,
      }}
    >
      {ch}
    </button>
  );
}

function StatusPill({ unlocked, affordable }: { unlocked: boolean; affordable: boolean }) {
  if (!unlocked) {
    return <span style={pillStyle(C.lilac)}>{"◌"} LOCKED</span>;
  }
  return affordable ? (
    <span style={pillStyle(C.teal)}>{"●"} READY</span>
  ) : (
    <span style={pillStyle(C.warn)}>! SHORT</span>
  );
  function pillStyle(c: string): CSSProperties {
    return {
      ...mono,
      fontSize: 9,
      letterSpacing: "0.16em",
      color: c,
      padding: "2px 8px",
      border: `1px solid ${c}55`,
      background: `${c}10`,
    };
  }
}

function SpecCell({ k, v, color = C.ink }: { k: string; v: string; color?: string }) {
  return (
    <div style={{ padding: "10px 12px", background: "rgba(8,16,30,0.55)", border: `1px solid ${C.ink5}` }}>
      <div style={{ ...mono, fontSize: 9, letterSpacing: "0.20em", color: C.ink3 }}>{k}</div>
      <div style={{ ...mono, fontSize: 16, fontWeight: 600, color, marginTop: 4, fontVariantNumeric: "tabular-nums" }}>{v}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// HeaderBar
// ---------------------------------------------------------------------------

function HeaderBar({
  accent,
  cat,
  setCat,
  onClose,
}: {
  accent: string;
  cat: CategoryId;
  setCat: (c: CategoryId) => void;
  onClose: () => void;
}) {
  return (
    <div
      style={{
        padding: "12px 16px 10px",
        borderBottom: `1px solid ${accent}1a`,
        display: "flex",
        alignItems: "center",
        gap: 16,
        flexShrink: 0,
      }}
    >
      <div style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
        <FontAwesomeIcon icon={CAT[cat].icon} style={{ color: accent, fontSize: 18, textShadow: `0 0 8px ${accent}80` }} />
        <span style={{ ...mono, fontSize: 14, letterSpacing: "0.22em", color: accent }}>CONSTRUCT</span>
      </div>
      <div style={{ display: "flex", gap: 6, marginLeft: "auto" }}>
        {CATEGORY_ORDER.map((k) => {
          const active = k === cat;
          const a = CAT[k].accent;
          return (
            <button
              key={k}
              onClick={() => setCat(k)}
              style={{
                ...mono,
                fontSize: 12,
                letterSpacing: "0.18em",
                padding: "8px 16px",
                background: active ? `${a}18` : "transparent",
                border: `1px solid ${active ? a + "99" : C.ink4 + "60"}`,
                color: active ? a : C.ink3,
                cursor: "pointer",
                borderRadius: 2,
                boxShadow: active ? `0 0 10px ${a}40` : "none",
              }}
            >
              <FontAwesomeIcon icon={CAT[k].icon} style={{ marginRight: 6 }} />
              {CAT[k].label}
            </button>
          );
        })}
      </div>
      <button
        onClick={onClose}
        style={{
          ...mono,
          fontSize: 10,
          letterSpacing: "0.18em",
          color: C.ink2,
          background: "transparent",
          border: `1px solid ${C.ink4}80`,
          padding: "4px 10px",
          borderRadius: 2,
          cursor: "pointer",
          marginLeft: 6,
        }}
      >
        ESC
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// FooterCTA
// ---------------------------------------------------------------------------

function FooterCTA({
  def,
  unlocked,
  affordable,
  accent,
  onBuild,
}: {
  def: StructureDefinition | undefined;
  unlocked: boolean;
  affordable: boolean;
  accent: string;
  onBuild: () => void;
}) {
  if (!def) return null;
  const locked = !unlocked;
  const enabled = affordable && !locked;
  const color = locked ? C.ink3 : affordable ? accent : C.warn;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, justifyContent: "flex-end" }}>
      <button
        disabled={!enabled}
        onClick={enabled ? onBuild : undefined}
        style={{
          ...mono,
          fontSize: 12,
          letterSpacing: "0.18em",
          padding: "10px 22px",
          background: enabled ? `${color}18` : "transparent",
          border: `1px solid ${color}${enabled ? "99" : "44"}`,
          color,
          opacity: enabled ? 1 : 0.7,
          borderRadius: 2,
          cursor: enabled ? "pointer" : "not-allowed",
          boxShadow: enabled ? `0 0 12px ${color}30` : "none",
        }}
      >
        {locked ? "LOCKED" : "CONSTRUCT →"}
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// CoverflowDetail (detail section below the carousel)
// ---------------------------------------------------------------------------

function CoverflowDetail({
  def,
  unlocked,
  affordable,
  accent,
  cat,
  system,
}: {
  def: StructureDefinition;
  unlocked: boolean;
  affordable: boolean;
  accent: string;
  cat: CategoryId;
  system: SystemState;
}) {
  const locked = !unlocked;
  const a = locked ? C.ink3 : accent;
  const key = `${def.type}_${def.tier}`;
  const blurb = BLURBS[key] ?? def.description;
  const bpPerSec = getSystemBP(system);
  const outUnit = OUTPUT_UNITS[def.type];

  return (
    <>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 24, marginBottom: 6 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ ...mono, fontSize: 9, letterSpacing: "0.22em", color: C.ink3 }}>
            TIER {def.tier} {"·"} {CAT[cat].label}
          </div>
          <div style={{ ...disp, fontSize: 22, fontWeight: 600, color: C.ink, marginTop: 4 }}>{def.name}</div>
        </div>
        <div style={{ flexShrink: 0 }}>
          <StatusPill unlocked={unlocked} affordable={affordable} />
        </div>
      </div>
      <div style={{ ...mono, fontSize: 11, color: C.ink2, lineHeight: 1.5, marginTop: 8, marginBottom: 14, maxWidth: 540 }}>{blurb}</div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
        <SpecCell k="OUTPUT" v={`${def.productionRate} ${outUnit}`} color={a} />
        <SpecCell k="MATERIALS" v={`${fmt(def.cost.materials)} tons`} color={affordable ? C.ink : C.warn} />
        <SpecCell k="ENERGY" v={`${fmt(def.operatingCost, { decimals: 1 })} MW`} color={C.ink} />
        <SpecCell k="BUILD TIME" v={fmtBuildTime(def, bpPerSec)} color={C.lilac} />
      </div>

      {locked && def.techGate && (
        <div
          style={{
            marginTop: 12,
            padding: "10px 12px",
            background: `${C.lilac}08`,
            border: `1px solid ${C.lilac}30`,
            ...mono,
            fontSize: 11,
            color: C.ink2,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span style={{ color: C.lilac, fontSize: 14 }}>{"◆"}</span>
          <span style={{ color: C.ink3, letterSpacing: "0.14em", fontSize: 10 }}>UNLOCKS WITH</span>
          <span style={{ color: C.ink, fontWeight: 600 }}>{getTechName(def.techGate)}</span>
        </div>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// BuildModal (main exported component)
// ---------------------------------------------------------------------------

export function BuildModal({
  system,
  category,
  dispatch,
  onClose,
}: {
  system: SystemState;
  category: CategoryId;
  dispatch: (action: PlayerAction) => void;
  onClose: () => void;
}) {
  const [cat, setCat] = useState<CategoryId>(category);
  const allDefs = getDefsForCategory(cat);
  const [idx, setIdx] = useState(() => {
    let best = 0;
    for (let i = allDefs.length - 1; i >= 0; i--) {
      const d = allDefs[i];
      if (d && isUnlocked(system, d)) { best = i; break; }
    }
    return best;
  });
  const accent = CAT[cat].accent;

  useEffect(() => {
    const defs = getDefsForCategory(cat);
    let best = 0;
    for (let i = defs.length - 1; i >= 0; i--) {
      const d = defs[i];
      if (d && isUnlocked(system, d)) { best = i; break; }
    }
    setIdx(best);
  }, [cat, system]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") setIdx((i) => Math.max(0, i - 1));
      if (e.key === "ArrowRight") setIdx((i) => Math.min(allDefs.length - 1, i + 1));
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, allDefs.length]);

  const selectedDef = allDefs[idx];
  if (!selectedDef) return null;

  const unlocked = isUnlocked(system, selectedDef);
  const affordable = isAffordable(system, selectedDef);

  const handleBuild = () => {
    dispatch({
      type: "build_structure",
      systemId: system.id,
      structureType: CAT[cat].structureType,
      tier: selectedDef.tier,
    });
    onClose();
  };

  const go = (d: number) => setIdx((i) => Math.max(0, Math.min(allDefs.length - 1, i + d)));

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
          width: 960,
          maxWidth: "100%",
          height: "min(780px, 90vh)",
          background: "radial-gradient(ellipse at top, #0a1a30 0%, #050913 80%)",
          padding: 22,
          color: C.ink,
          ...disp,
          position: "relative",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Starfield */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            opacity: 0.32,
            backgroundImage: [
              "radial-gradient(1px 1px at 8% 14%, #6da4d4 0, transparent 50%)",
              "radial-gradient(1px 1px at 65% 8%, #8fb8e0 0, transparent 50%)",
              "radial-gradient(1px 1px at 88% 52%, #5d8aa8 0, transparent 50%)",
              "radial-gradient(1px 1px at 22% 62%, #9bc3e6 0, transparent 50%)",
              "radial-gradient(1px 1px at 78% 88%, #6da4d4 0, transparent 50%)",
              "radial-gradient(1px 1px at 42% 32%, #aac5e0 0, transparent 50%)",
              "radial-gradient(1px 1px at 51% 78%, #6da4d4 0, transparent 50%)",
            ].join(","),
          }}
        />

        {/* Shell frame */}
        <div
          style={{
            position: "relative",
            zIndex: 1,
            background: "linear-gradient(180deg, rgba(13,24,46,0.85), rgba(8,16,30,0.85))",
            border: `1px solid ${accent}22`,
            flex: 1,
            display: "flex",
            flexDirection: "column",
            minHeight: 0,
          }}
        >
          <CornerTicks accent={accent} />

          <div style={{ flex: 1, minHeight: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>
            <HeaderBar accent={accent} cat={cat} setCat={setCat} onClose={onClose} />

            {/* Coverflow strip */}
            <div
              style={{
                position: "relative",
                height: 340,
                padding: "28px 24px 12px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 18,
                flexShrink: 0,
                background: "linear-gradient(180deg, transparent, rgba(77,219,255,0.03) 70%, transparent)",
              }}
            >
              {/* Horizon line */}
              <div
                style={{
                  position: "absolute",
                  left: 24,
                  right: 24,
                  bottom: 48,
                  height: 1,
                  background: `linear-gradient(90deg, transparent, ${accent}30, transparent)`,
                }}
              />
              <NavArrow dir="left" onClick={() => go(-1)} accent={accent} disabled={idx === 0} />
              <div style={{ flex: 1, position: "relative", height: "100%", perspective: "1100px", overflow: "hidden" }}>
                {allDefs.map((def, i) => {
                  const d = i - idx;
                  const abs = Math.abs(d);
                  if (abs > 2) return null;
                  const tx = d * 140;
                  const rot = d === 0 ? 0 : d > 0 ? -28 : 28;
                  const sc = d === 0 ? 1 : abs === 1 ? 0.82 : 0.64;
                  const z = 10 - abs;
                  const op = d === 0 ? 1 : abs === 1 ? 0.92 : 0.7;
                  const itemUnlocked = isUnlocked(system, def);
                  const locked = !itemUnlocked;
                  const a = locked ? C.ink3 : accent;
                  return (
                    <div
                      key={`${def.type}_${def.tier}`}
                      onClick={() => setIdx(i)}
                      style={{
                        position: "absolute",
                        left: "50%",
                        top: "50%",
                        width: 220,
                        height: 260,
                        marginLeft: -110,
                        marginTop: -130,
                        transform: `translateX(${tx}px) rotateY(${rot}deg) scale(${sc})`,
                        transformStyle: "preserve-3d",
                        transition: "transform .4s, opacity .4s",
                        zIndex: z,
                        opacity: op,
                        cursor: "pointer",
                      }}
                    >
                      <div
                        style={{
                          width: "100%",
                          height: "100%",
                          background:
                            d === 0
                              ? `linear-gradient(180deg, ${a}22, ${a}10), rgba(8,16,30,0.96)`
                              : `linear-gradient(180deg, ${a}18, ${a}08), rgba(8,16,30,0.92)`,
                          border: `1px solid ${a}${d === 0 ? "99" : "66"}`,
                          boxShadow: d === 0 ? `0 0 24px ${a}30, inset 0 0 30px ${a}10` : "none",
                          display: "flex",
                          flexDirection: "column",
                          position: "relative",
                        }}
                      >
                        {d === 0 && <CornerTicks accent={a} size={12} />}
                        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <FontAwesomeIcon
                            icon={CAT[cat].icon}
                            style={{
                              fontSize: 24 + def.tier * 18,
                              color: a,
                              opacity: locked ? 0.45 : 1,
                              filter: `drop-shadow(0 0 ${4 + def.tier * 2}px ${a}60)`,
                              strokeWidth: def.tier,
                            }}
                          />
                        </div>
                        <div
                          style={{
                            padding: "6px 10px",
                            borderTop: `1px solid ${a}22`,
                            ...mono,
                            fontSize: 9,
                            letterSpacing: "0.16em",
                            color: locked ? C.ink3 : C.ink2,
                            textAlign: "center",
                          }}
                        >
                          T{def.tier} {"·"} {def.name.toUpperCase()}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <NavArrow dir="right" onClick={() => go(1)} accent={accent} disabled={idx === allDefs.length - 1} />
            </div>

            {/* Indicator dots */}
            <div style={{ display: "flex", gap: 6, justifyContent: "center", padding: "0 0 14px" }}>
              {allDefs.map((def, i) => (
                <button
                  key={`${def.type}_${def.tier}`}
                  onClick={() => setIdx(i)}
                  style={{
                    width: i === idx ? 18 : 6,
                    height: 6,
                    borderRadius: 3,
                    background: i === idx ? accent : `${accent}33`,
                    border: "none",
                    cursor: "pointer",
                    transition: "width .25s",
                    padding: 0,
                  }}
                />
              ))}
            </div>

            {/* Detail card */}
            <div style={{ flex: 1, padding: "14px 20px 18px", overflowY: "auto" }}>
              <CoverflowDetail def={selectedDef} unlocked={unlocked} affordable={affordable} accent={accent} cat={cat} system={system} />
            </div>
          </div>

          {/* Footer */}
          <div style={{ padding: "12px 18px", borderTop: `1px solid ${accent}1a`, flexShrink: 0 }}>
            <FooterCTA def={selectedDef} unlocked={unlocked} affordable={affordable} accent={accent} onBuild={handleBuild} />
          </div>
        </div>
      </div>
    </div>
  );
}
