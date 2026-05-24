import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faRocket, faCircleHalfStroke, faPause, faAtom, faIndustry, faCompass, faChevronDown, faMicrochip } from "@fortawesome/free-solid-svg-icons";
import type { GameState, ProbeMode, SystemState } from "../../../simulation/state";
import type { PlayerAction } from "../../../simulation/actions";
import type { ViewId } from "../../shell/Sidebar";
import { CPUS } from "../../../simulation/data/components";
import { Panel } from "../../components/Panel";
import { HealthGauge } from "../../components/HealthGauge";
import { HeaderAddButton } from "./HeaderAddButton";
import { fmtYears } from "../../format";
import { FONT_MONO } from "../../tokens";

const ACCENT = "#4ddbff";

interface FleetProbe {
  id: string;
  name: string;
  mode: ProbeMode | null;
  systemId: string | null;
  status: "station-keeping" | "in-transit";
  location: string;
  dotColor: string;
  etaYrs: number | null;
  health: number;
  miningOutput: number;
  computingOutput: number;
  printerSpeed: number;
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
        dotColor: "#4cd8a8",
        etaYrs: null,
        health: sys.mainProbe.health,
        miningOutput: sys.mainProbe.miningOutput,
        computingOutput: sys.mainProbe.computingOutput,
        printerSpeed: sys.mainProbe.internalPrinterSpeed,
      });
    }
  }

  for (const sys of Object.values(state.systems)) {
    for (const p of sys.sentProbes) {
      const destSystem = state.systems[p.destinationSystemId];
      const destName = destSystem ? destSystem.name : p.destinationSystemId;
      const remainingSec = Math.max(0, p.travelTimeSeconds - p.elapsedSeconds);
      const remainingYrs = remainingSec > 0 ? remainingSec : null;
      const cpuDef = CPUS[p.components.cpu];
      fleet.push({
        id: p.id,
        name: p.name,
        mode: null,
        systemId: null,
        status: "in-transit",
        location: `→ ${destName}`,
        dotColor: ACCENT,
        etaYrs: remainingYrs,
        health: 1,
        miningOutput: cpuDef?.miningOutput ?? 0,
        computingOutput: cpuDef?.computingOutput ?? 0,
        printerSpeed: cpuDef?.printSpeed ?? 0,
      });
    }
  }

  return fleet;
}


const ACTION_OPTIONS = [
  { mode: "gathering" as ProbeMode, label: "GATHER", icon: faAtom, accent: "#5fd9c4" },
  { mode: "printing" as ProbeMode, label: "PRINT", icon: faIndustry, accent: "#4cd8a8" },
  { mode: null, label: "EXPLORE", icon: faCompass, accent: "#6b87a3" },
] as const;

function ProbeActions({
  mode,
  onSetMode,
}: {
  mode: ProbeMode | null;
  onSetMode: (mode: ProbeMode) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const isActive = mode !== null && mode !== "idle";

  return (
    <div style={{ display: "flex", gap: 6, marginTop: 8, position: "relative" }}>
      <div style={{ flex: 1, position: "relative" }}>
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          style={{
            width: "100%",
            padding: "6px 0",
            background: "rgba(77,219,255,0.08)",
            border: "1px solid rgba(77,219,255,0.30)",
            color: "#9ab4cf",
            fontFamily: FONT_MONO,
            fontSize: 9,
            letterSpacing: "0.18em",
            cursor: "pointer",
            borderRadius: 2,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
          }}
        >
          ACTION <FontAwesomeIcon icon={faChevronDown} style={{ fontSize: 7 }} />
        </button>
        {menuOpen && (
          <div
            style={{
              position: "absolute",
              top: "100%",
              left: 0,
              right: 0,
              marginTop: 2,
              background: "rgba(8,16,30,0.95)",
              border: "1px solid rgba(110,200,255,0.20)",
              borderRadius: 2,
              zIndex: 20,
              overflow: "hidden",
            }}
          >
            {ACTION_OPTIONS.map((opt) => (
              <button
                key={opt.mode}
                onClick={() => {
                  if (opt.mode) onSetMode(opt.mode);
                  setMenuOpen(false);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  width: "100%",
                  padding: "7px 10px",
                  background: opt.mode !== null && mode === opt.mode ? `${opt.accent}18` : "transparent",
                  border: "none",
                  borderBottom: "1px solid rgba(110,200,255,0.08)",
                  color: opt.mode !== null && mode === opt.mode ? opt.accent : "#9ab4cf",
                  fontFamily: FONT_MONO,
                  fontSize: 9,
                  letterSpacing: "0.14em",
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <FontAwesomeIcon icon={opt.icon} style={{ width: 10 }} />
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>
      <button
        disabled={!isActive}
        onClick={() => onSetMode("idle")}
        style={{
          width: 28,
          padding: "6px 0",
          background: isActive ? "rgba(255,107,107,0.10)" : "transparent",
          border: `1px solid ${isActive ? "rgba(255,107,107,0.40)" : "rgba(110,200,255,0.12)"}`,
          color: isActive ? "#ff6b6b" : "#3d5572",
          fontFamily: FONT_MONO,
          fontSize: 9,
          cursor: isActive ? "pointer" : "not-allowed",
          borderRadius: 2,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <FontAwesomeIcon icon={faPause} />
      </button>
    </div>
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
              fontSize: 16,
            }}
          >
            <FontAwesomeIcon icon={faRocket} />
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
              fontSize: 11,
              color: "#6b87a3",
              letterSpacing: "0.18em",
              marginBottom: 8,
            }}
          >
            <FontAwesomeIcon icon={faCircleHalfStroke} style={{ marginRight: 4 }} /> BUILDING NOW
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
                  <span style={{ fontSize: 14, color: "#d6e8f5" }}>
                    Probe
                  </span>
                  <span
                    style={{
                      fontFamily: FONT_MONO,
                      fontSize: 12,
                      color: ACCENT,
                    }}
                  >
                    {fmtYears(remaining)}
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
              padding: "12px 14px",
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
                  fontFamily: FONT_MONO,
                  fontSize: 16,
                  color: "#d6e8f5",
                  fontWeight: 500,
                }}
              >
                {p.name}
              </span>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  fontFamily: FONT_MONO,
                  fontSize: 11,
                  letterSpacing: "0.14em",
                  color:
                    p.status === "in-transit"
                      ? ACCENT
                      : p.mode === "gathering"
                        ? "#5fd9c4"
                        : p.mode === "printing"
                          ? "#4cd8a8"
                          : "#6b87a3",
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background:
                      p.status === "in-transit"
                        ? ACCENT
                        : p.mode === "gathering"
                          ? "#5fd9c4"
                          : p.mode === "printing"
                            ? "#4cd8a8"
                            : "#3d5572",
                    boxShadow:
                      p.mode !== "idle"
                        ? `0 0 4px ${p.mode === "gathering" ? "#5fd9c4" : "#4cd8a8"}`
                        : "none",
                  }}
                />
                {p.status === "in-transit"
                  ? "IN TRANSIT"
                  : p.mode === "gathering"
                    ? "GATHERING"
                    : p.mode === "printing"
                      ? "PRINTING"
                      : "IDLE"}
              </span>
            </div>
            {p.status === "station-keeping" && (
              <HealthGauge health={p.health} />
            )}
            {p.status === "in-transit" && p.etaYrs != null && (
              <div
                style={{
                  fontFamily: FONT_MONO,
                  fontSize: 12,
                  color: ACCENT,
                  marginBottom: 2,
                }}
              >
                {p.location} · ETA {fmtYears(p.etaYrs)}
              </div>
            )}
            <div style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: 6,
              fontFamily: FONT_MONO,
              fontSize: 12,
              marginTop: 6,
              paddingTop: 6,
              borderTop: "1px dashed rgba(110,200,255,0.08)",
            }}>
              <span style={{ color: "#5fd9c4" }} title="Mining output (T/year)">
                <FontAwesomeIcon icon={faAtom} style={{ marginRight: 4, fontSize: 9 }} />
                {(p.miningOutput * p.health).toFixed(1)}
              </span>
              <span style={{ color: "#b08bff" }} title="Computing power (TFLOPS)">
                <FontAwesomeIcon icon={faMicrochip} style={{ marginRight: 4, fontSize: 9 }} />
                {(p.computingOutput * p.health).toFixed(1)}
              </span>
              <span style={{ color: "#4cd8a8" }} title="Printer speed (BP)">
                <FontAwesomeIcon icon={faIndustry} style={{ marginRight: 4, fontSize: 9 }} />
                {(p.printerSpeed * p.health).toFixed(1)}
              </span>
            </div>
            {p.status === "station-keeping" && p.systemId && (
              <ProbeActions
                mode={p.mode}
                onSetMode={(mode) =>
                  dispatch({
                    type: "set_probe_mode",
                    systemId: p.systemId!,
                    mode,
                  })
                }
              />
            )}
          </div>
        ))}
      </div>
    </Panel>
  );
}
