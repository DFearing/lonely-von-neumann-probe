import type { GameState, ProbeMode, SystemState } from "../../../simulation/state";
import type { PlayerAction } from "../../../simulation/actions";
import type { ViewId } from "../../shell/Sidebar";
import { CPUS, PROPULSIONS, REACTORS } from "../../../simulation/data/components";
import { Panel } from "../../components/Panel";
import { HeaderAddButton } from "./HeaderAddButton";
import { fmtTime, fmtYears } from "../../format";
import { FONT_MONO } from "../../tokens";

const ACCENT = "#4ddbff";

function componentNames(components: {
  cpu: string;
  propulsion: string;
  reactor: string;
}): string {
  const cpuName = CPUS[components.cpu]?.name ?? components.cpu;
  const propName = PROPULSIONS[components.propulsion]?.name ?? components.propulsion;
  const reactorName = REACTORS[components.reactor]?.name ?? components.reactor;
  return `${cpuName} · ${propName} · ${reactorName}`;
}

interface FleetProbe {
  id: string;
  name: string;
  mode: ProbeMode | null;
  systemId: string | null;
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
        name: sys.mainProbe.name,
        mode: sys.mainProbe.mode,
        systemId: sys.id,
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
        name: p.name,
        mode: null,
        systemId: null,
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

function ProbeActionButton({
  label,
  accent,
  disabled,
  onClick,
}: {
  label: string;
  accent: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      style={{
        flex: 1,
        padding: "6px 0",
        background: disabled ? "transparent" : `${accent}14`,
        border: `1px solid ${disabled ? "rgba(110,200,255,0.12)" : `${accent}50`}`,
        color: disabled ? "#3d5572" : accent,
        fontFamily: FONT_MONO,
        fontSize: 9,
        letterSpacing: "0.18em",
        cursor: disabled ? "not-allowed" : "pointer",
        borderRadius: 2,
      }}
    >
      {label}
    </button>
  );
}

export function ProbesColumn({
  state,
  system,
  dispatch,
  onNavigate,
}: {
  state: GameState;
  system: SystemState;
  dispatch: (action: PlayerAction) => void;
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
            const totalSpeed = probePrint + assignedSpeed;
            const buildTime = q.totalCost.materials;
            const remaining = totalSpeed > 0
              ? Math.max(0, buildTime * (1 - q.progress) / totalSpeed)
              : Infinity;
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
                  {p.name}
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
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontFamily: FONT_MONO,
                fontSize: 9,
                marginBottom: 2,
              }}
            >
              <span
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: "50%",
                  background:
                    p.status === "in-transit"
                      ? ACCENT
                      : p.mode === "gathering"
                        ? "#5cc7ff"
                        : p.mode === "printing"
                          ? "#4cd8a8"
                          : "#3d5572",
                  boxShadow:
                    p.mode !== "idle"
                      ? `0 0 4px ${p.mode === "gathering" ? "#5cc7ff" : "#4cd8a8"}`
                      : "none",
                }}
              />
              <span
                style={{
                  color:
                    p.mode === "gathering"
                      ? "#5cc7ff"
                      : p.mode === "printing"
                        ? "#4cd8a8"
                        : "#6b87a3",
                }}
              >
                {p.status === "in-transit"
                  ? "IN TRANSIT"
                  : p.mode === "gathering"
                    ? "GATHERING"
                    : p.mode === "printing"
                      ? "PRINTING"
                      : "IDLE"}
              </span>
            </div>
            <div
              style={{
                fontFamily: FONT_MONO,
                fontSize: 9,
                color: "#6b87a3",
              }}
            >
              {p.components}
            </div>
            {p.status === "station-keeping" && p.systemId && (
              <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                <ProbeActionButton
                  label={p.mode === "gathering" ? "STOP" : "GATHER"}
                  accent={p.mode === "gathering" ? "#ff6b6b" : "#5cc7ff"}
                  disabled={p.mode === "printing"}
                  onClick={() =>
                    dispatch({
                      type: "set_probe_mode",
                      systemId: p.systemId!,
                      mode: p.mode === "gathering" ? "idle" : "gathering",
                    })
                  }
                />
                <ProbeActionButton
                  label="EXPLORE"
                  accent="#6b87a3"
                  disabled={p.mode === "printing"}
                  onClick={() => {}}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </Panel>
  );
}
