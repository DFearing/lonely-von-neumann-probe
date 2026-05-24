import type { GameState, SystemState } from "../../../simulation/state";
import type { ViewId } from "../../shell/Sidebar";
import { Panel } from "../../components/Panel";
import { FONT_MONO } from "../../tokens";
import { fmt, fmtRate, fmtTime } from "../../format";
import { btnFlush } from "../../components/buttons";

function SysStat({
  label,
  value,
  color = "#d6e8f5",
  muted,
}: {
  label: string;
  value: string;
  color?: string;
  muted?: boolean;
}) {
  return (
    <div>
      <div
        style={{
          fontFamily: FONT_MONO,
          fontSize: 9,
          color: "#6b87a3",
          letterSpacing: "0.16em",
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: FONT_MONO,
          fontSize: 14,
          color: muted ? "#3d5572" : color,
          fontWeight: 500,
        }}
      >
        {value}
      </div>
    </div>
  );
}

function ColonizedDetail({
  system,
  onNavigate,
}: {
  system: SystemState;
  onNavigate: (view: ViewId) => void;
}) {
  const { resourceRates, structures } = system;
  const minerCount = structures.miners.filter((s) => s.constructionProgress >= 1).length;
  const reactorCount = structures.reactors.filter((s) => s.constructionProgress >= 1).length;
  const printerCount = structures.printers.filter((s) => s.constructionProgress >= 1).length;

  const structureCells = [
    { k: "MINERS", v: minerCount, c: "#5cc7ff" },
    { k: "REACTORS", v: reactorCount, c: "#ffcb47" },
    { k: "PRINTERS", v: printerCount, c: "#4cd8a8" },
  ];

  return (
    <Panel
      label="DETAIL · HOME SYSTEM"
      right={
        <span style={{ fontFamily: FONT_MONO, fontSize: 10, color: "#4cd8a8" }}>
          ● ACTIVE
        </span>
      }
    >
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 22, color: "#d6e8f5", fontWeight: 500 }}>
          {system.name}
        </div>
        <div
          style={{
            fontFamily: FONT_MONO,
            fontSize: 11,
            color: "#6b87a3",
            marginTop: 4,
          }}
        >
          {system.starType} · richness ×{system.resourceRichness.toFixed(1)} · home
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 10,
          padding: "12px 0",
          borderTop: "1px solid rgba(110,200,255,0.10)",
          borderBottom: "1px solid rgba(110,200,255,0.10)",
          marginBottom: 14,
        }}
      >
        <SysStat
          label="MATERIALS"
          value={`${fmtRate(resourceRates.materialsPerSecond)} tons/cycle`}
          color="#5cc7ff"
        />
        <SysStat
          label="ENERGY"
          value={`${fmtRate(resourceRates.energySupply)} Megawatts supply · ${fmtRate(resourceRates.energyDemand)} demand`}
          color="#ffcb47"
        />
        <SysStat
          label="COMPUTE"
          value={`${resourceRates.computingPowerPerSecond.toFixed(1)} Teraflops`}
          color="#b08bff"
        />
      </div>

      <div style={{ marginBottom: 14 }}>
        <div
          style={{
            fontFamily: FONT_MONO,
            fontSize: 9,
            color: "#6b87a3",
            letterSpacing: "0.18em",
            marginBottom: 8,
          }}
        >
          STRUCTURES
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
          {structureCells.map((row) => (
            <div
              key={row.k}
              style={{
                padding: "10px 12px",
                background: "rgba(8,16,30,0.4)",
                border: `1px solid ${row.c}30`,
              }}
            >
              <div
                style={{
                  fontFamily: FONT_MONO,
                  fontSize: 9,
                  color: "#6b87a3",
                  letterSpacing: "0.14em",
                  marginBottom: 4,
                }}
              >
                {row.k}
              </div>
              <div
                style={{
                  fontFamily: FONT_MONO,
                  fontSize: 18,
                  color: row.c,
                  fontWeight: 600,
                }}
              >
                {row.v}
              </div>
            </div>
          ))}
        </div>
      </div>

      {system.mainProbe && (
        <div style={{ marginBottom: 14 }}>
          <div
            style={{
              fontFamily: FONT_MONO,
              fontSize: 9,
              color: "#6b87a3",
              letterSpacing: "0.18em",
              marginBottom: 8,
            }}
          >
            PROBES
          </div>
          <div
            style={{
              padding: "10px 12px",
              background: "rgba(8,16,30,0.4)",
              border: "1px solid rgba(110,200,255,0.14)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span style={{ color: "#d6e8f5", fontSize: 13 }}>
              {system.mainProbe.name}
            </span>
            <span style={{ fontFamily: FONT_MONO, fontSize: 10, color: "#4cd8a8" }}>
              ● station-keeping
            </span>
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: 8 }}>
        <button
          style={{
            ...btnFlush(),
            flex: 1,
            color: "#4ddbff",
            borderColor: "rgba(77,219,255,0.4)",
          }}
          onClick={() => onNavigate("overview")}
        >
          MANAGE
        </button>
        <button
          style={{ ...btnFlush(), flex: 1 }}
          onClick={() => onNavigate("fleet")}
        >
          BUILD PROBE
        </button>
      </div>
    </Panel>
  );
}

function UnvisitedDetail({
  system,
  onNavigate,
}: {
  system: SystemState;
  onNavigate: (view: ViewId) => void;
}) {
  const travelTime = system.distanceFromOrigin * 3.1536e7;

  return (
    <Panel
      label="DETAIL · UNVISITED"
      right={
        <span style={{ fontFamily: FONT_MONO, fontSize: 10, color: "#6b87a3" }}>
          ◌ NO PROBE
        </span>
      }
    >
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 22, color: "#d6e8f5", fontWeight: 500 }}>
          {system.name}
        </div>
        <div
          style={{
            fontFamily: FONT_MONO,
            fontSize: 11,
            color: "#6b87a3",
            marginTop: 4,
          }}
        >
          {system.starType}
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: 10,
          padding: "12px 0",
          borderTop: "1px solid rgba(110,200,255,0.10)",
          borderBottom: "1px solid rgba(110,200,255,0.10)",
          marginBottom: 14,
        }}
      >
        <SysStat
          label="DISTANCE"
          value={`${fmt(system.distanceFromOrigin, { decimals: 2 })} ly`}
        />
        <SysStat label="RICHNESS" value="?" muted />
        <SysStat label="TRAVEL @1×" value={fmtTime(travelTime)} />
        <SysStat
          label="TECH-SHARE"
          value={`${fmt(system.distanceFromOrigin, { decimals: 2 })} cycles`}
        />
      </div>

      <div
        style={{
          padding: "10px 12px",
          background: "rgba(255,153,102,0.04)",
          borderLeft: "2px solid #ff9966",
          fontFamily: FONT_MONO,
          fontSize: 10,
          color: "#9ab4cf",
          lineHeight: 1.6,
          marginBottom: 14,
        }}
      >
        <span style={{ color: "#ff9966", letterSpacing: "0.14em" }}>SCAN ·</span>{" "}
        richness not revealed. Send a probe to scan &amp; colonize. Tech share via
        light-speed until{" "}
        <span style={{ color: "#d6e8f5" }}>Zero Latency Comms</span> researched.
      </div>

      <button
        style={{
          width: "100%",
          padding: "12px 18px",
          background:
            "linear-gradient(180deg, rgba(77,219,255,0.18), rgba(77,219,255,0.08))",
          border: "1px solid #4ddbff",
          color: "#4ddbff",
          fontFamily: FONT_MONO,
          fontSize: 12,
          letterSpacing: "0.18em",
          fontWeight: 600,
          cursor: "pointer",
          borderRadius: 2,
          boxShadow: "0 0 12px rgba(77,219,255,0.15)",
        }}
        onClick={() => onNavigate("fleet")}
      >
        ▲ SEND PROBE TO {system.name.toUpperCase()}
      </button>
    </Panel>
  );
}

export function SystemDetail({
  state,
  systemId,
  onNavigate,
}: {
  state: GameState;
  systemId: string;
  onNavigate: (view: ViewId) => void;
}) {
  const system = state.systems[systemId];
  if (!system) return null;

  const isColonized = system.mainProbe !== null;

  return isColonized ? (
    <ColonizedDetail system={system} onNavigate={onNavigate} />
  ) : (
    <UnvisitedDetail system={system} onNavigate={onNavigate} />
  );
}
