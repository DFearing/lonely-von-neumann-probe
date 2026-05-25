import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import type { SystemState } from "../../../simulation/state";
import type { PlayerAction } from "../../../simulation/actions";
import { getAvailableComponents } from "../../../simulation/queries";
import { CPUS, PROPULSIONS, REACTORS, totalProbeCost } from "../../../simulation/data/components";
import type { CpuDefinition, PropulsionDefinition, ReactorDefinition } from "../../../simulation/data/components";
import { FONT_DISPLAY, FONT_MONO } from "../../tokens";
import { fmt } from "../../format";
import { Panel } from "../../components/Panel";
import { ProbeSchematic } from "../../components/ProbeSchematic";

interface ComponentVariant {
  id: string;
  name: string;
  costLabel: string;
  spec: string;
  techGate: string | null;
  unlocked: boolean;
}

function buildCpuVariants(available: CpuDefinition[]): ComponentVariant[] {
  return available.map((c) => ({
    id: c.type,
    name: c.name,
    costLabel: `${fmt(c.cost.materials)} tons · ${fmt(c.cost.energy)} Megawatts`,
    spec: `${c.computingOutput} Teraflops · ${c.miningOutput} tons/cycle gather`,
    techGate: c.techGate,
    unlocked: true,
  }));
}

function buildPropVariants(available: PropulsionDefinition[]): ComponentVariant[] {
  return available.map((p) => ({
    id: p.type,
    name: p.name,
    costLabel: `${fmt(p.cost.materials)} tons · ${fmt(p.cost.energy)} Megawatts`,
    spec: `${p.travelSpeed}× speed`,
    techGate: p.techGate,
    unlocked: true,
  }));
}

function buildReactorVariants(available: ReactorDefinition[]): ComponentVariant[] {
  return available.map((r) => ({
    id: r.type,
    name: r.name,
    costLabel: `${fmt(r.cost.materials)} tons · ${fmt(r.cost.energy)} Megawatts`,
    spec: `${r.energyMultiplier}× Megawatts output`,
    techGate: r.techGate,
    unlocked: true,
  }));
}

function ComponentSection({
  label,
  accent,
  variants,
  selectedId,
  onSelect,
}: {
  label: string;
  accent: string;
  variants: ComponentVariant[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <Panel label={label} style={{ minWidth: 0 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 8, overflowY: "auto" }}>
        {variants.map((v) => {
          const isSelected = v.id === selectedId;
          const isLocked = !v.unlocked;
          return (
            <div
              key={v.id}
              onClick={() => v.unlocked && onSelect(v.id)}
              style={{
                padding: "8px 10px",
                background: isSelected
                  ? `${accent}14`
                  : isLocked
                    ? "transparent"
                    : "rgba(8,16,30,0.4)",
                border: `1px solid ${isSelected ? accent : isLocked ? "rgba(110,200,255,0.10)" : "rgba(110,200,255,0.18)"}`,
                cursor: isLocked ? "not-allowed" : "pointer",
                opacity: isLocked ? 0.55 : 1,
                position: "relative",
                transition: "background .15s, border-color .15s",
                minHeight: 60,
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
              }}
            >
              <div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "baseline",
                    marginBottom: 3,
                  }}
                >
                  <span style={{ fontSize: 12, color: "#d6e8f5", fontWeight: 500 }}>
                    {v.name}
                  </span>
                  {isSelected && (
                    <span
                      style={{
                        fontFamily: FONT_MONO,
                        fontSize: 8,
                        color: accent,
                        letterSpacing: "0.16em",
                      }}
                    >
                      ●
                    </span>
                  )}
                </div>
                <div
                  style={{
                    fontFamily: FONT_MONO,
                    fontSize: 10,
                    color: accent,
                    marginBottom: 4,
                  }}
                >
                  {v.spec}
                </div>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontFamily: FONT_MONO,
                  fontSize: 9,
                  color: "#6b87a3",
                }}
              >
                <span>{v.costLabel}</span>
                {isLocked && v.techGate && (
                  <span
                    style={{
                      color: "#3d5572",
                      fontSize: 8,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      marginLeft: 4,
                    }}
                  >
                    ◌ {v.techGate}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

function SpecCard({ k, v, accent }: { k: string; v: string; accent: string }) {
  return (
    <div>
      <div
        style={{
          fontFamily: FONT_MONO,
          fontSize: 8,
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
          fontSize: 16,
          color: accent,
          fontWeight: 600,
        }}
      >
        {v}
      </div>
    </div>
  );
}

function BuildColumn({
  cpu,
  propulsion,
  reactor,
  canAfford,
  onBuild,
}: {
  cpu: CpuDefinition;
  propulsion: PropulsionDefinition;
  reactor: ReactorDefinition;
  canAfford: boolean;
  onBuild: () => void;
}) {
  const cost = totalProbeCost(cpu.type, propulsion.type, reactor.type);

  const perfRows = [
    { k: "COMPUTE", v: `${cpu.computingOutput}× TF`, acc: "#b08bff" },
    { k: "MINING", v: `${cpu.miningOutput}× tons/cycle`, acc: "#5cc7ff" },
    { k: "TRAVEL", v: `${propulsion.travelSpeed}× speed`, acc: "#5cc7ff" },
    { k: "ENERGY", v: `${reactor.energyMultiplier}× Megawatts`, acc: "#ffcb47" },
  ];

  return (
    <Panel
      label="CONFIGURATION"
      right={
        <span style={{ fontFamily: FONT_MONO, fontSize: 10, color: canAfford ? "#4cd8a8" : "#ff9966" }}>
          {canAfford ? "● BUILDABLE" : "● INSUFFICIENT"}
        </span>
      }
      style={{ display: "flex", flexDirection: "column", minHeight: 0, minWidth: 0 }}
    >
      <div style={{ display: "flex", gap: 14, alignItems: "center", marginBottom: 14 }}>
        <ProbeSchematic size={130} accent="#4ddbff" />
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 6 }}>
          {[
            { k: "CPU", v: cpu.name, acc: "#4ddbff" },
            { k: "PROP", v: propulsion.name, acc: "#5cc7ff" },
            { k: "RCT", v: reactor.name, acc: "#ffcb47" },
          ].map((row) => (
            <div key={row.k} style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
              <span
                style={{
                  fontFamily: FONT_MONO,
                  fontSize: 9,
                  color: "#6b87a3",
                  letterSpacing: "0.18em",
                  width: 40,
                }}
              >
                {row.k}
              </span>
              <span
                style={{
                  color: row.acc,
                  fontSize: 13,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {row.v}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: 12,
          padding: "12px 0",
          borderTop: "1px solid rgba(110,200,255,0.10)",
          borderBottom: "1px solid rgba(110,200,255,0.10)",
          marginBottom: 12,
        }}
      >
        <SpecCard k="MATERIALS" v={`${fmt(cost.materials, { decimals: 0 })} tons`} accent="#5cc7ff" />
        <SpecCard k="ENERGY" v={`${fmt(cost.energy, { decimals: 0 })} Megawatts`} accent="#ffcb47" />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 12 }}>
        <div
          style={{
            fontFamily: FONT_MONO,
            fontSize: 9,
            color: "#6b87a3",
            letterSpacing: "0.18em",
            marginBottom: 4,
          }}
        >
          PERFORMANCE
        </div>
        {perfRows.map((row) => (
          <div
            key={row.k}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              padding: "4px 0",
              borderBottom: "1px dashed rgba(110,200,255,0.06)",
            }}
          >
            <span
              style={{
                fontFamily: FONT_MONO,
                fontSize: 10,
                color: "#6b87a3",
                letterSpacing: "0.14em",
              }}
            >
              {row.k}
            </span>
            <span style={{ fontFamily: FONT_MONO, fontSize: 11, color: row.acc }}>
              {row.v}
            </span>
          </div>
        ))}
      </div>

      <button
        onClick={onBuild}
        disabled={!canAfford}
        style={{
          marginTop: "auto",
          padding: "12px 16px",
          background: canAfford
            ? "linear-gradient(180deg, rgba(77,219,255,0.18), rgba(77,219,255,0.08))"
            : "rgba(110,200,255,0.04)",
          border: `1px solid ${canAfford ? "#4ddbff" : "rgba(110,200,255,0.18)"}`,
          color: canAfford ? "#4ddbff" : "#6b87a3",
          fontFamily: FONT_MONO,
          fontSize: 13,
          letterSpacing: "0.18em",
          fontWeight: 600,
          cursor: canAfford ? "pointer" : "not-allowed",
          borderRadius: 2,
          boxShadow: canAfford ? "0 0 12px rgba(77,219,255,0.2)" : "none",
          opacity: canAfford ? 1 : 0.5,
        }}
      >
        + QUEUE BUILD
      </button>
    </Panel>
  );
}

export function BuildProbeModal({
  system,
  dispatch,
  onClose,
}: {
  system: SystemState;
  dispatch: (action: PlayerAction) => void;
  onClose: () => void;
}) {
  const available = getAvailableComponents(system);

  const [cpu, setCpu] = useState<string>(available.cpus[0]?.type ?? "cpu_t1");
  const [propulsion, setPropulsion] = useState<string>(
    available.propulsions[0]?.type ?? "prop_t1",
  );
  const [reactor, setReactor] = useState<string>(
    available.reactors[0]?.type ?? "rct_t1",
  );

  const cost = totalProbeCost(cpu, propulsion, reactor);
  const canAfford = system.resources.materials >= cost.materials;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const cpuVariants = buildCpuVariants(available.cpus);
  const propVariants = buildPropVariants(available.propulsions);
  const reactorVariants = buildReactorVariants(available.reactors);

  const cornerStyle = (pos: "tl" | "tr" | "bl" | "br"): CSSProperties => {
    const base: CSSProperties = { position: "absolute", width: 10, height: 10 };
    switch (pos) {
      case "tl":
        return { ...base, top: 0, left: 0, borderTop: "2px solid #4ddbff", borderLeft: "2px solid #4ddbff" };
      case "tr":
        return { ...base, top: 0, right: 0, borderTop: "2px solid #4ddbff", borderRight: "2px solid #4ddbff" };
      case "bl":
        return { ...base, bottom: 0, left: 0, borderBottom: "2px solid #4ddbff", borderLeft: "2px solid #4ddbff" };
      case "br":
        return { ...base, bottom: 0, right: 0, borderBottom: "2px solid #4ddbff", borderRight: "2px solid #4ddbff" };
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "absolute",
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
          width: "min(1080px, 100%)",
          maxHeight: "100%",
          display: "flex",
          flexDirection: "column",
          background: "linear-gradient(180deg, #0a1224 0%, #06101e 100%)",
          border: "1px solid rgba(110,200,255,0.25)",
          boxShadow: "0 0 60px rgba(77,219,255,0.18), 0 0 0 1px rgba(77,219,255,0.10)",
          position: "relative",
        }}
      >
        {(["tl", "tr", "bl", "br"] as const).map((c) => (
          <div key={c} style={cornerStyle(c)} />
        ))}

        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 22px",
            borderBottom: "1px solid rgba(110,200,255,0.12)",
          }}
        >
          <div>
            <div
              style={{
                fontFamily: FONT_MONO,
                fontSize: 10,
                letterSpacing: "0.22em",
                color: "#6b87a3",
                marginBottom: 4,
              }}
            >
              FLEET → NEW PROBE
            </div>
            <div
              style={{
                fontFamily: FONT_DISPLAY,
                fontSize: 22,
                fontWeight: 500,
                color: "#d6e8f5",
                letterSpacing: "-0.01em",
              }}
            >
              Probe Builder
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 32,
              height: 32,
              background: "transparent",
              border: "1px solid rgba(110,200,255,0.20)",
              color: "#9ab4cf",
              fontFamily: FONT_MONO,
              fontSize: 16,
              lineHeight: 1,
              cursor: "pointer",
              borderRadius: 2,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div
          style={{
            padding: 18,
            display: "grid",
            gridTemplateColumns: "1.6fr 1fr",
            gap: 16,
            flex: 1,
            minHeight: 0,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateRows: "1fr 1fr 1fr",
              gap: 12,
              minHeight: 0,
              minWidth: 0,
            }}
          >
            <ComponentSection
              label="CPU"
              accent="#4ddbff"
              variants={cpuVariants}
              selectedId={cpu}
              onSelect={setCpu}
            />
            <ComponentSection
              label="PROPULSION"
              accent="#5cc7ff"
              variants={propVariants}
              selectedId={propulsion}
              onSelect={setPropulsion}
            />
            <ComponentSection
              label="REACTOR"
              accent="#ffcb47"
              variants={reactorVariants}
              selectedId={reactor}
              onSelect={setReactor}
            />
          </div>
          <BuildColumn
            cpu={CPUS[cpu]!}
            propulsion={PROPULSIONS[propulsion]!}
            reactor={REACTORS[reactor]!}
            canAfford={canAfford}
            onBuild={() => {
              dispatch({
                type: "build_probe",
                systemId: system.id,
                cpu,
                propulsion,
                reactor,
              });
              onClose();
            }}
          />
        </div>
      </div>
    </div>
  );
}
