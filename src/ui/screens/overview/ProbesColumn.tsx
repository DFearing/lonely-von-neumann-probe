import type { GameState, SystemState } from "../../../simulation/state";
import type { ViewId } from "../../shell/Sidebar";
import { CPUS, PROPULSIONS, REACTORS } from "../../../simulation/data/components";
import type { CpuType, PropulsionType, ReactorType } from "../../../simulation/state";
import { Panel } from "../../components/Panel";
import { HeaderAddButton } from "./HeaderAddButton";
import { fmtTime, fmtYears } from "../../format";
import { FONT_MONO } from "../../tokens";

const ACCENT = "#4ddbff";

function componentNames(components: {
  cpu: CpuType;
  propulsion: PropulsionType;
  reactor: ReactorType;
}): string {
  const cpuName = CPUS[components.cpu].name;
  const propName = PROPULSIONS[components.propulsion].name;
  const reactorName = REACTORS[components.reactor].name;
  return `${cpuName} · ${propName} · ${reactorName}`;
}

interface FleetProbe {
  id: string;
  status: "station-keeping" | "in-transit";
  location: string;
  components: string;
  dotColor: string;
  etaYrs: number | null;
}

function gatherFleet(state: GameState): FleetProbe[] {
  const fleet: FleetProbe[] = [];

  for (const sys of Object.values(state.systems)) {
    if (sys.mainProbe) {
      fleet.push({
        id: sys.mainProbe.id,
        status: "station-keeping",
        location: sys.name,
        components: componentNames(sys.mainProbe.components),
        dotColor: "#4cd8a8",
        etaYrs: null,
      });
    }
  }

  for (const sys of Object.values(state.systems)) {
    for (const p of sys.sentProbes) {
      const destSystem = state.systems[p.destinationSystemId];
      const destName = destSystem ? destSystem.name : p.destinationSystemId;
      const remainingSec = Math.max(0, p.travelTimeSeconds - p.elapsedSeconds);
      const remainingYrs = remainingSec > 0 ? remainingSec : null;
      fleet.push({
        id: p.id,
        status: "in-transit",
        location: `→ ${destName}`,
        components: componentNames(p.components),
        dotColor: ACCENT,
        etaYrs: remainingYrs,
      });
    }
  }

  return fleet;
}

export function ProbesColumn({
  state,
  system,
  onNavigate,
}: {
  state: GameState;
  system: SystemState;
  onNavigate: (view: ViewId) => void;
}) {
  const fleet = gatherFleet(state);
  const transitCount = fleet.filter((p) => p.status === "in-transit").length;

  const buildingProbes = system.constructionQueue.filter(
    (q) => q.targetType === "probe",
  );

  return (
    <Panel
      label={
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              width: 18,
              height: 18,
              color: ACCENT,
              fontSize: 13,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              textShadow: `0 0 6px ${ACCENT}60`,
            }}
          >
            &#9671;
          </span>
          <span>PROBES</span>
        </span>
      }
      right={
        <HeaderAddButton
          accent={ACCENT}
          onClick={() => onNavigate("fleet")}
        />
      }
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
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
            fontSize: 11,
            color: ACCENT,
            letterSpacing: "0.14em",
          }}
        >
          {fleet.length} ACTIVE &middot; {transitCount} IN TRANSIT
        </div>
        <div
          style={{
            fontFamily: FONT_MONO,
            fontSize: 10,
            color: "#6b87a3",
            marginTop: 4,
          }}
        >
          Explore, scan &amp; extend the network
        </div>
      </div>

      {/* Building now */}
      {buildingProbes.length > 0 && (
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
              fontSize: 9,
              color: "#6b87a3",
              letterSpacing: "0.18em",
              marginBottom: 8,
            }}
          >
            &#9680; BUILDING NOW
          </div>
          {buildingProbes.map((q) => {
            const pct = Math.min(100, q.progress * 100);
            const totalBuildTime = q.totalCost.materials + q.totalCost.energy;
            const remainingFraction = 1 - q.progress;
            const remaining = Math.max(0, totalBuildTime * remainingFraction);
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
                  <span style={{ fontSize: 12, color: "#d6e8f5" }}>
                    Probe
                  </span>
                  <span
                    style={{
                      fontFamily: FONT_MONO,
                      fontSize: 10,
                      color: ACCENT,
                    }}
                  >
                    {fmtTime(remaining)}
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
                      background: ACCENT,
                      transition: "width .4s linear",
                      boxShadow: `0 0 6px ${ACCENT}80`,
                    }}
                  />
                </div>
                <div
                  style={{
                    fontFamily: FONT_MONO,
                    fontSize: 9,
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
          })}
        </div>
      )}

      {/* Fleet roster */}
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
        {fleet.map((p) => (
          <div
            key={p.id}
            style={{
              padding: "8px 10px",
              background: `${ACCENT}06`,
              border: `1px solid ${ACCENT}30`,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                justifyContent: "space-between",
                marginBottom: 4,
              }}
            >
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: p.dotColor,
                    boxShadow: `0 0 4px ${p.dotColor}`,
                  }}
                />
                <span
                  style={{
                    fontFamily: FONT_MONO,
                    fontSize: 12,
                    color: "#d6e8f5",
                    fontWeight: 500,
                  }}
                >
                  {p.id}
                </span>
              </span>
              {p.etaYrs != null && (
                <span
                  style={{
                    fontFamily: FONT_MONO,
                    fontSize: 10,
                    color: ACCENT,
                  }}
                >
                  ETA {fmtYears(p.etaYrs)}
                </span>
              )}
            </div>
            <div
              style={{
                fontFamily: FONT_MONO,
                fontSize: 10,
                color: "#9ab4cf",
                marginBottom: 2,
              }}
            >
              {p.location}
            </div>
            <div
              style={{
                fontFamily: FONT_MONO,
                fontSize: 9,
                color: "#6b87a3",
              }}
            >
              {p.status} &middot; {p.components}
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}
