import { useCurrentSystem } from "../context";
import { fmt, fmtRate, fmtYears } from "../format";
import type { ViewId } from "./Sidebar";

const FONT_MONO = "'JetBrains Mono', 'Courier New', monospace";

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
  const color = resourceColor(supply, demand, "#d6e8f5");
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
        NANO MATERIAL
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
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
        <span style={{ color: net >= 0 ? "#4cd8a8" : "#ff6b6b" }}>
          {fmtRate(net)} tons/year net
        </span>
        {demand > 0 && (
          <span style={{ color: "#ff9966" }}>
            ▼ {demand.toFixed(1)} maint
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
  const color = resourceColor(supply, demand, "#5cc7ff");
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
        ENERGY
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
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
          {fmtRate(net)}
        </span>
        <span
          style={{ fontFamily: FONT_MONO, fontSize: 13, color: "#6b87a3" }}
        >
          MW net
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
          ▲ {supply.toFixed(1)} supply
        </span>
        <span style={{ color: demand > 0 ? "#ff9966" : "#3d5572" }}>
          ▼ {demand.toFixed(1)} draw
        </span>
      </div>
    </div>
  );
}

function ComputeResearchCell({
  computeRate,
  researchName,
  researchTier,
  researchProgress,
  researchContinuousCost,
  onNavigate,
}: {
  computeRate: number;
  researchName: string | null;
  researchTier: number | null;
  researchProgress: number;
  researchContinuousCost: number;
  onNavigate: (view: ViewId) => void;
}) {
  const pct = researchProgress * 100;
  const eta =
    researchContinuousCost > 0 && computeRate > 0
      ? ((1 - researchProgress) * researchContinuousCost * 100) / computeRate
      : 0;

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
          COMPUTE
        </span>
        {researchName != null && (
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
            color: "#b08bff",
            fontVariantNumeric: "tabular-nums",
            fontFamily: FONT_MONO,
            letterSpacing: "-0.02em",
            textShadow: "0 0 12px rgba(176,139,255,0.4)",
          }}
        >
          {computeRate.toFixed(1)}
        </span>
        <span
          style={{ fontFamily: FONT_MONO, fontSize: 13, color: "#6b87a3" }}
        >
          TFLOPS
        </span>
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
          researchName={activeResearch?.name ?? null}
          researchTier={activeResearch?.tier ?? null}
          researchProgress={activeResearch?.progress ?? 0}
          researchContinuousCost={activeResearch?.continuousCost ?? 0}
          onNavigate={onNavigate}
        />
      </div>
    </div>
  );
}
