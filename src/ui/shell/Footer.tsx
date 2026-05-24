import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCaretDown, faCaretUp, faAtom, faBolt, faMicrochip } from "@fortawesome/free-solid-svg-icons";
import { useCurrentSystem } from "../context";
import { fmt, fmtRate, fmtYears } from "../format";
import { FONT_MONO } from "../tokens";
import { TECH_TREE } from "../../simulation/data/tech-tree";
import type { ViewId } from "./Sidebar";

function resourceColor(
  supply: number,
  demand: number,
  baseColor: string,
): string {
  if (supply <= 0 && demand <= 0) return baseColor;
  if (supply <= demand) return "#ff6b6b";
  if (demand / supply > 0.7) return "#ffcb47";
  return baseColor;
}

function MaterialsCell({
  value,
  supply,
  demand,
}: {
  value: number;
  supply: number;
  demand: number;
}) {
  const net = supply - demand;
  const demandColor = resourceColor(supply, demand, "#5fd9c4");
  return (
    <div
      style={{
        padding: "14px 24px",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          fontFamily: FONT_MONO,
          fontSize: 11,
          color: "#6b87a3",
          letterSpacing: "0.18em",
          marginBottom: 6,
        }}
      >
        <FontAwesomeIcon icon={faAtom} style={{ fontSize: 14, marginRight: 6 }} />NANO MATERIAL
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
        <span
          style={{
            fontSize: 38,
            fontWeight: 500,
            color: "#5fd9c4",
            fontVariantNumeric: "tabular-nums",
            fontFamily: FONT_MONO,
            letterSpacing: "-0.02em",
            textShadow: "0 0 12px #5fd9c440",
          }}
        >
          {fmt(Math.floor(value))}
        </span>
        <span
          style={{ fontFamily: FONT_MONO, fontSize: 13, color: "#6b87a3" }}
        >
          tons
        </span>
      </div>
      <div
        style={{
          display: "flex",
          gap: 12,
          fontFamily: FONT_MONO,
          fontSize: 14,
          marginTop: 4,
        }}
      >
        <span style={{ color: "#5fd9c4" }}>
          {fmtRate(net)} tons/year net
        </span>
        {demand > 0 && (
          <span style={{ color: demandColor }}>
            <FontAwesomeIcon icon={faCaretDown} style={{ marginRight: 4 }} />
            {demand.toFixed(1)} demand
          </span>
        )}
      </div>
    </div>
  );
}

function EnergyCell({
  supply,
  demand,
}: {
  supply: number;
  demand: number;
}) {
  const net = supply - demand;
  const demandColor = resourceColor(supply, demand, "#6aa9ff");
  return (
    <div
      style={{
        padding: "14px 24px",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          fontFamily: FONT_MONO,
          fontSize: 11,
          color: "#6b87a3",
          letterSpacing: "0.18em",
          marginBottom: 6,
        }}
      >
        <FontAwesomeIcon icon={faBolt} style={{ fontSize: 14, marginRight: 6 }} />ENERGY
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
        <span
          style={{
            fontSize: 38,
            fontWeight: 500,
            color: "#6aa9ff",
            fontVariantNumeric: "tabular-nums",
            fontFamily: FONT_MONO,
            letterSpacing: "-0.02em",
            textShadow: "0 0 12px #6aa9ff40",
          }}
        >
          {fmtRate(net)}
        </span>
        <span
          style={{ fontFamily: FONT_MONO, fontSize: 13, color: "#6b87a3" }}
        >
          Megawatts net
        </span>
      </div>
      <div
        style={{
          display: "flex",
          gap: 12,
          fontFamily: FONT_MONO,
          fontSize: 14,
          marginTop: 4,
        }}
      >
        <span style={{ color: "#6aa9ff" }}>
          <FontAwesomeIcon icon={faCaretUp} style={{ marginRight: 4 }} />
          {supply.toFixed(1)} supply
        </span>
        <span style={{ color: demandColor }}>
          <FontAwesomeIcon icon={faCaretDown} style={{ marginRight: 4 }} />
          {demand.toFixed(1)} demand
        </span>
      </div>
    </div>
  );
}

function computeColor(efficiency: number): string {
  if (efficiency < 0.5) return "#ff6b6b";
  if (efficiency < 0.8) return "#ffcb47";
  return "#b08bff";
}

function ComputeResearchCell({
  computeRate,
  computeSupply,
  computeDemand,
  computeEfficiency,
  researchName,
  researchTier,
  researchProgress,
  researchContinuousCost,
  researchTechId,
  onNavigate,
}: {
  computeRate: number;
  computeSupply: number;
  computeDemand: number;
  computeEfficiency: number;
  researchName: string | null;
  researchTier: number | null;
  researchProgress: number;
  researchContinuousCost: number;
  researchTechId: string | null;
  onNavigate: (view: ViewId) => void;
}) {
  const pct = researchProgress * 100;
  const techDef = researchTechId ? TECH_TREE[researchTechId] : undefined;
  const researchTime = techDef?.researchTime ?? 0;
  const eta =
    researchContinuousCost > 0 && computeRate > 0 && researchTime > 0
      ? ((1 - researchProgress) * researchContinuousCost * researchTime) / computeRate
      : 0;
  const color = computeColor(computeEfficiency);

  return (
    <div
      onClick={() => onNavigate("research")}
      style={{
        padding: "14px 24px",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        cursor: "pointer",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 12,
          marginBottom: 6,
        }}
      >
        <span
          style={{
            fontFamily: FONT_MONO,
            fontSize: 11,
            color: "#6b87a3",
            letterSpacing: "0.18em",
          }}
        >
          <FontAwesomeIcon icon={faMicrochip} style={{ fontSize: 14, marginRight: 6 }} />COMPUTE
        </span>
        {researchName != null ? (
          <span
            style={{
              fontFamily: FONT_MONO,
              fontSize: 10,
              color: "#6b87a3",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              flex: 1,
              minWidth: 0,
            }}
          >
            <span style={{ color: "#3d5572" }}>&rarr; </span>
            <span style={{ color: "#9ab4cf" }}>{researchName}</span>
            {researchTier != null && (
              <span style={{ color: "#3d5572" }}> &middot; T{researchTier}</span>
            )}
          </span>
        ) : (
          <span
            style={{
              fontFamily: FONT_MONO,
              fontSize: 10,
              color: "#3d5572",
              flex: 1,
            }}
          >
            No research is being pursued
          </span>
        )}
        {researchName != null && (
          <span
            style={{
              fontFamily: FONT_MONO,
              fontSize: 10,
              color: "#b08bff",
              flexShrink: 0,
            }}
          >
            {fmtYears(eta)}
          </span>
        )}
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 14 }}>
        <span
          style={{
            fontSize: 38,
            fontWeight: 500,
            color,
            fontVariantNumeric: "tabular-nums",
            fontFamily: FONT_MONO,
            letterSpacing: "-0.02em",
            textShadow: `0 0 12px ${color}40`,
          }}
        >
          {fmtRate(computeRate)}
        </span>
        <span
          style={{ fontFamily: FONT_MONO, fontSize: 13, color: "#6b87a3" }}
        >
          Teraflops net
        </span>
      </div>
      <div
        style={{
          display: "flex",
          gap: 12,
          fontFamily: FONT_MONO,
          fontSize: 14,
          marginTop: 4,
        }}
      >
        <span style={{ color: "#4cd8a8" }}>
          <FontAwesomeIcon icon={faCaretUp} style={{ marginRight: 4 }} />
          {computeSupply.toFixed(1)} supply
        </span>
        <span style={{ color: computeDemand > 0 ? "#6b87a3" : "#3d5572" }}>
          <FontAwesomeIcon icon={faCaretDown} style={{ marginRight: 4 }} />
          {computeDemand.toFixed(1)} demand
        </span>
        {computeEfficiency < 1 && (
          <span style={{ color }}>
            {(computeEfficiency * 100).toFixed(0)}% eff
          </span>
        )}
      </div>
      <div
        style={{
          height: 2,
          marginTop: 8,
          background: "rgba(176,139,255,0.10)",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: "0 auto 0 0",
            width: `${pct}%`,
            background: "#b08bff",
            opacity: 0.7,
            transition: "width .4s linear",
          }}
        />
      </div>
    </div>
  );
}

export function Footer({
  onNavigate,
}: {
  onNavigate: (view: ViewId) => void;
}) {
  const system = useCurrentSystem();
  const activeResearch = system.researchQueue.find(
    (r) => !r.completed && !r.paused,
  );

  return (
    <div
      data-tour="footer"
      style={{
        gridArea: "footer",
        borderTop: "1px solid rgba(110,200,255,0.12)",
        background: "rgba(6,12,24,0.8)",
        display: "grid",
        gridTemplateColumns: "1fr 1fr 1fr",
        alignItems: "center",
      }}
    >
      <MaterialsCell
        value={system.resources.materials}
        supply={system.resourceRates.materialsSupply}
        demand={system.resourceRates.materialsDemand}
      />
      <div
        style={{
          borderLeft: "1px solid rgba(110,200,255,0.08)",
          height: "100%",
        }}
      >
        <EnergyCell
          supply={system.resourceRates.energySupply}
          demand={system.resourceRates.energyDemand}
        />
      </div>
      <div
        style={{
          borderLeft: "1px solid rgba(110,200,255,0.08)",
          height: "100%",
        }}
      >
        <ComputeResearchCell
          computeRate={system.resourceRates.computingPowerPerSecond}
          computeSupply={system.resourceRates.computeSupply}
          computeDemand={system.resourceRates.computeDemand}
          computeEfficiency={system.resourceRates.computeEfficiency}
          researchName={activeResearch?.name ?? null}
          researchTier={activeResearch?.tier ?? null}
          researchProgress={activeResearch?.progress ?? 0}
          researchContinuousCost={activeResearch?.continuousCost ?? 0}
          researchTechId={activeResearch?.techId ?? null}
          onNavigate={onNavigate}
        />
      </div>
    </div>
  );
}
