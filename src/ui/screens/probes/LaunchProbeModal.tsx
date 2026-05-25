import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import type { GameState, ProbeState, SystemState } from "../../../simulation/state";
import type { PlayerAction } from "../../../simulation/actions";
import { PROPULSIONS } from "../../../simulation/data/components";
import { getAllTransitProbes, getProbeProgress, resolveDistance } from "../../../simulation/queries";
import { TRAVEL_TIME_SCALE } from "../../../simulation/constants";
import { getSystemCoord } from "../../data/system-coords";
import { starColor } from "../../data/star-colors";
import { FONT_DISPLAY, FONT_MONO } from "../../tokens";
import { fmtCycles } from "../../format";

const SCALE = 6;

function parseTier(id: string): number {
  return parseInt(id.split("_t")[1] ?? "1", 10);
}

export function LaunchProbeModal({
  probe,
  system,
  state,
  dispatch,
  onClose,
}: {
  probe: ProbeState;
  system: SystemState;
  state: GameState;
  dispatch: (action: PlayerAction) => void;
  onClose: () => void;
}) {
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const systemIds = [system.id, ...system.discoveredSystems];

  const targetSystems = system.discoveredSystems
    .map((id) => state.systems[id])
    .filter((s): s is NonNullable<typeof s> => s != null && !s.mainProbe);

  const propulsion = PROPULSIONS[probe.components.propulsion];
  const travelSpeed = propulsion?.travelSpeed ?? 1;

  const selectedSystem = selectedTarget ? state.systems[selectedTarget] : null;
  const distance = selectedTarget
    ? resolveDistance(system, selectedTarget, state.systems)
    : 0;
  const travelTimeSeconds = (distance * TRAVEL_TIME_SCALE) / travelSpeed;

  const ct = parseTier(probe.components.cpu);
  const pt = parseTier(probe.components.propulsion);
  const rt = parseTier(probe.components.reactor);

  const originCoord = getSystemCoord(system.id);
  const targetCoord = selectedTarget ? getSystemCoord(selectedTarget) : null;

  const distanceRings = [15, 30, 45, 55];

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
          width: "min(900px, 100%)",
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
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontFamily: FONT_MONO,
                fontSize: 10,
                letterSpacing: "0.22em",
                color: "#6b87a3",
                marginBottom: 4,
              }}
            >
              FLEET → LAUNCH PROBE
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
              {probe.name}
              <span
                style={{
                  fontFamily: FONT_MONO,
                  fontSize: 11,
                  color: "#6b87a3",
                  marginLeft: 14,
                  letterSpacing: "0.12em",
                }}
              >
                T{ct} CPU · T{pt} PROP · T{rt} RCT
              </span>
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
              flexShrink: 0,
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
            gridTemplateColumns: "1fr 260px",
            gap: 16,
            flex: 1,
            minHeight: 0,
            overflow: "hidden",
          }}
        >
          {/* Star Map */}
          <div
            style={{
              flex: 1,
              minHeight: 300,
              position: "relative",
              background:
                "radial-gradient(ellipse at center, rgba(77,219,255,0.04) 0%, transparent 60%)",
              border: "1px dashed rgba(110,200,255,0.08)",
              overflow: "hidden",
            }}
          >
            <svg
              viewBox="-60 -60 120 120"
              preserveAspectRatio="xMidYMid meet"
              style={{ width: "100%", height: "100%" }}
            >
              {/* Distance rings */}
              {distanceRings.map((r) => (
                <g key={r}>
                  <circle
                    cx="0"
                    cy="0"
                    r={r}
                    fill="none"
                    stroke="rgba(110,200,255,0.10)"
                    strokeWidth="0.3"
                    strokeDasharray="1 2"
                  />
                  <text
                    x={r + 1}
                    y={-1}
                    fontFamily="JetBrains Mono"
                    fontSize="2.6"
                    fill="#3d5572"
                  >
                    {Math.round(r / SCALE)}ly
                  </text>
                </g>
              ))}

              {/* Crosshair */}
              <line x1="-60" y1="0" x2="60" y2="0" stroke="rgba(110,200,255,0.06)" strokeWidth="0.3" />
              <line x1="0" y1="-60" x2="0" y2="60" stroke="rgba(110,200,255,0.06)" strokeWidth="0.3" />

              {/* Probe trajectories already in transit */}
              {getAllTransitProbes(state).map((tp) => {
                const origin = getSystemCoord(tp.originSystemId);
                const dest = getSystemCoord(tp.destinationSystemId);
                const ox = origin.x * SCALE;
                const oy = origin.y * SCALE;
                const dx = dest.x * SCALE;
                const dy = dest.y * SCALE;
                const progress = getProbeProgress(tp);
                const px = ox + (dx - ox) * progress;
                const py = oy + (dy - oy) * progress;
                return (
                  <g key={tp.id}>
                    <line
                      x1={ox} y1={oy} x2={dx} y2={dy}
                      stroke="#4ddbff"
                      strokeWidth="0.4"
                      strokeDasharray="1.5 1"
                      opacity="0.25"
                    />
                    <circle cx={px} cy={py} r={1.2} fill="#4ddbff" opacity="0.6" />
                  </g>
                );
              })}

              {/* Trajectory line from origin to selected target */}
              {targetCoord && (
                <g>
                  <line
                    x1={originCoord.x * SCALE}
                    y1={originCoord.y * SCALE}
                    x2={targetCoord.x * SCALE}
                    y2={targetCoord.y * SCALE}
                    stroke="#4cd8a8"
                    strokeWidth="0.6"
                    strokeDasharray="2 1.5"
                    opacity="0.8"
                  />
                  <circle
                    cx={originCoord.x * SCALE}
                    cy={originCoord.y * SCALE}
                    r={2}
                    fill="none"
                    stroke="#4cd8a8"
                    strokeWidth="0.4"
                    opacity="0.6"
                  />
                </g>
              )}

              {/* Stars */}
              {systemIds.map((id) => {
                const sys = state.systems[id];
                if (!sys) return null;
                const coord = getSystemCoord(id);
                const cx = coord.x * SCALE;
                const cy = coord.y * SCALE;
                const isOrigin = id === system.id;
                const isSelected = selectedTarget === id;
                const hasProbe = sys.mainProbe !== null;
                const isValidTarget = targetSystems.some((ts) => ts.id === id);
                const color = starColor(sys.starType);
                const r = isOrigin ? 3 : hasProbe ? 2.5 : 1.8;

                return (
                  <g
                    key={id}
                    onClick={() => {
                      if (isValidTarget) setSelectedTarget(id);
                    }}
                    style={{ cursor: isValidTarget ? "pointer" : "default" }}
                  >
                    {isSelected && (
                      <circle
                        cx={cx}
                        cy={cy}
                        r={9}
                        fill="none"
                        stroke="#4cd8a8"
                        strokeWidth="0.6"
                        strokeDasharray="1 1"
                      />
                    )}
                    {isOrigin && (
                      <circle
                        cx={cx}
                        cy={cy}
                        r={7}
                        fill="none"
                        stroke="#4cd8a8"
                        strokeWidth="0.4"
                        opacity="0.5"
                      />
                    )}
                    <circle cx={cx} cy={cy} r={r + 4} fill={color} opacity="0.15" />
                    <circle
                      cx={cx}
                      cy={cy}
                      r={r}
                      fill={color}
                      stroke={isSelected ? "#4cd8a8" : isOrigin ? "#4cd8a8" : "transparent"}
                      strokeWidth="0.4"
                      opacity={isValidTarget || isOrigin ? 1 : 0.4}
                    />
                    <text
                      x={cx}
                      y={cy + r + 4.5}
                      fontFamily="JetBrains Mono"
                      fontSize="3"
                      fill={isOrigin ? "#4cd8a8" : isSelected ? "#4cd8a8" : isValidTarget ? "#9ab4cf" : "#3d5572"}
                      textAnchor="middle"
                      letterSpacing="0.4"
                    >
                      {sys.name.toUpperCase()}
                    </text>
                  </g>
                );
              })}
            </svg>

            <div
              style={{
                position: "absolute",
                bottom: 8,
                left: 8,
                padding: "4px 8px",
                background: "rgba(8,16,30,0.8)",
                border: "1px solid rgba(110,200,255,0.18)",
                fontFamily: FONT_MONO,
                fontSize: 8,
                color: "#6b87a3",
                letterSpacing: "0.12em",
              }}
            >
              SELECT DESTINATION
            </div>
          </div>

          {/* Right panel: selected target info + launch */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 14,
            }}
          >
            <div
              style={{
                padding: "14px 16px",
                background: "rgba(8,16,30,0.5)",
                border: "1px solid rgba(110,200,255,0.12)",
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
                ORIGIN
              </div>
              <div style={{ fontSize: 14, color: "#4cd8a8", fontWeight: 500 }}>
                {system.name}
              </div>
            </div>

            {selectedSystem ? (
              <div
                style={{
                  padding: "14px 16px",
                  background: "rgba(8,16,30,0.5)",
                  border: "1px solid rgba(76,216,168,0.25)",
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
                  DESTINATION
                </div>
                <div style={{ fontSize: 14, color: "#4cd8a8", fontWeight: 500, marginBottom: 6 }}>
                  {selectedSystem.name}
                </div>
                <div
                  style={{
                    fontFamily: FONT_MONO,
                    fontSize: 10,
                    color: "#6b87a3",
                    display: "flex",
                    flexDirection: "column",
                    gap: 4,
                  }}
                >
                  <span>
                    <span style={{ color: "#3d5572" }}>DISTANCE</span>{" "}
                    <span style={{ color: "#9ab4cf" }}>{distance.toFixed(2)} ly</span>
                  </span>
                  <span>
                    <span style={{ color: "#3d5572" }}>SPEED</span>{" "}
                    <span style={{ color: "#9ab4cf" }}>{travelSpeed}x</span>
                  </span>
                  <span>
                    <span style={{ color: "#3d5572" }}>TRAVEL TIME</span>{" "}
                    <span style={{ color: "#4ddbff" }}>{fmtCycles(travelTimeSeconds)}</span>
                  </span>
                </div>
              </div>
            ) : (
              <div
                style={{
                  padding: "14px 16px",
                  background: "rgba(8,16,30,0.5)",
                  border: "1px dashed rgba(110,200,255,0.12)",
                  fontFamily: FONT_MONO,
                  fontSize: 11,
                  color: "#3d5572",
                  textAlign: "center",
                }}
              >
                Click a star on the map to select a destination
              </div>
            )}

            {/* Available targets list */}
            <div style={{ flex: 1, minHeight: 0, overflow: "auto" }}>
              <div
                style={{
                  fontFamily: FONT_MONO,
                  fontSize: 9,
                  color: "#6b87a3",
                  letterSpacing: "0.18em",
                  marginBottom: 8,
                }}
              >
                REACHABLE SYSTEMS
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {targetSystems.map((ts) => {
                  const d = resolveDistance(system, ts.id, state.systems);
                  const eta = (d * TRAVEL_TIME_SCALE) / travelSpeed;
                  const isActive = selectedTarget === ts.id;
                  return (
                    <div
                      key={ts.id}
                      onClick={() => setSelectedTarget(ts.id)}
                      style={{
                        padding: "8px 10px",
                        background: isActive ? "rgba(76,216,168,0.10)" : "rgba(8,16,30,0.4)",
                        border: `1px solid ${isActive ? "rgba(76,216,168,0.35)" : "rgba(110,200,255,0.10)"}`,
                        cursor: "pointer",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "baseline",
                      }}
                    >
                      <span style={{ fontSize: 11, color: isActive ? "#4cd8a8" : "#9ab4cf" }}>
                        {ts.name}
                      </span>
                      <span
                        style={{
                          fontFamily: FONT_MONO,
                          fontSize: 9,
                          color: "#6b87a3",
                        }}
                      >
                        {d.toFixed(1)} ly · {fmtCycles(eta)}
                      </span>
                    </div>
                  );
                })}
                {targetSystems.length === 0 && (
                  <div
                    style={{
                      fontFamily: FONT_MONO,
                      fontSize: 10,
                      color: "#3d5572",
                      textAlign: "center",
                      padding: "12px 0",
                    }}
                  >
                    No reachable systems without a probe
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={() => {
                if (!selectedTarget) return;
                dispatch({
                  type: "launch_probe",
                  systemId: system.id,
                  probeId: probe.id,
                  targetSystemId: selectedTarget,
                });
                onClose();
              }}
              disabled={!selectedTarget}
              style={{
                marginTop: "auto",
                padding: "12px 16px",
                background: selectedTarget
                  ? "linear-gradient(180deg, rgba(76,216,168,0.18), rgba(76,216,168,0.08))"
                  : "rgba(110,200,255,0.04)",
                border: `1px solid ${selectedTarget ? "#4cd8a8" : "rgba(110,200,255,0.18)"}`,
                color: selectedTarget ? "#4cd8a8" : "#6b87a3",
                fontFamily: FONT_MONO,
                fontSize: 13,
                letterSpacing: "0.18em",
                fontWeight: 600,
                cursor: selectedTarget ? "pointer" : "not-allowed",
                borderRadius: 2,
                boxShadow: selectedTarget ? "0 0 12px rgba(76,216,168,0.2)" : "none",
                opacity: selectedTarget ? 1 : 0.5,
              }}
            >
              LAUNCH
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
