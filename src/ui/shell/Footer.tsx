import { useCurrentSystem } from "../context";
import { fmt, fmtRate, fmtTime } from "../format";
import { getMaterialsCap, getEnergyCap } from "../queries";
import type { ViewId } from "./Sidebar";

const FONT_MONO = "'JetBrains Mono', 'Courier New', monospace";

function StockpileCell({
  label,
  value,
  rate,
  cap,
  color,
  unit,
}: {
  label: string;
  value: number;
  rate: number;
  cap: number;
  color: string;
  unit: string;
}) {
  const pct = cap > 0 ? Math.min(100, (value / cap) * 100) : 0;
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
          {label}
        </span>
        <span style={{ fontFamily: FONT_MONO, fontSize: 10, color: "#3d5572" }}>
          CAP {fmt(cap)} {unit}
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 14 }}>
        <span
          style={{
            fontSize: 32,
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
          style={{ fontFamily: FONT_MONO, fontSize: 13, color: "#4cd8a8" }}
        >
          {fmtRate(rate)} {unit}/s
        </span>
      </div>
      <div
        style={{
          height: 2,
          marginTop: 8,
          background: "rgba(110,200,255,0.08)",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: "0 auto 0 0",
            width: `${pct}%`,
            background: color,
            opacity: 0.6,
            transition: "width .4s linear",
          }}
        />
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
            {fmtTime(eta)}
          </span>
        )}
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 14 }}>
        <span
          style={{
            fontSize: 32,
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
          TF/s
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
  const matCap = getMaterialsCap(system);
  const enCap = getEnergyCap(system);

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
      <StockpileCell
        label="MATERIALS"
        value={system.resources.materials}
        rate={system.resourceRates.materialsPerSecond}
        cap={matCap}
        color="#5cc7ff"
        unit="t"
      />
      <div
        style={{
          borderLeft: "1px solid rgba(110,200,255,0.08)",
          height: "100%",
        }}
      >
        <StockpileCell
          label="ENERGY"
          value={system.resources.energy}
          rate={system.resourceRates.energyPerSecond}
          cap={enCap}
          color="#ffcb47"
          unit="MW"
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
