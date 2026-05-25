import type { GameState } from "../../../simulation/state";
import { getAllTransitProbes, getProbeProgress } from "../../../simulation/queries";
import { getSystemCoord } from "../../data/system-coords";
import { Panel } from "../../components/Panel";
import { FONT_MONO } from "../../tokens";
import { starColor } from "../../data/star-colors";

const SCALE = 6;

export function StarMap({
  state,
  selectedSystem,
  onSelect,
}: {
  state: GameState;
  selectedSystem: string | null;
  onSelect: (id: string) => void;
}) {
  const currentSystem = state.systems[state.currentSystemId];
  const systemIds = currentSystem
    ? [currentSystem.id, ...currentSystem.discoveredSystems]
    : [];

  const distanceRings = [15, 30, 45, 55];

  return (
    <Panel
      label="STAR MAP · KNOWN SYSTEMS"
      style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}
      right={
        <div
          style={{
            display: "flex",
            gap: 14,
            fontFamily: FONT_MONO,
            fontSize: 10,
            color: "#6b87a3",
          }}
        >
          <span>
            ●{" "}
            <span style={{ color: "#4cd8a8" }}>HOME</span>
          </span>
          <span>
            ○{" "}
            <span style={{ color: "#4ddbff" }}>KNOWN</span>
          </span>
          <span>
            ◌{" "}
            <span style={{ color: "#6b87a3" }}>UNVISITED</span>
          </span>
        </div>
      }
    >
      <div
        style={{
          flex: 1,
          minHeight: 0,
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
          <line
            x1="-60"
            y1="0"
            x2="60"
            y2="0"
            stroke="rgba(110,200,255,0.06)"
            strokeWidth="0.3"
          />
          <line
            x1="0"
            y1="-60"
            x2="0"
            y2="60"
            stroke="rgba(110,200,255,0.06)"
            strokeWidth="0.3"
          />

          {/* Direction labels */}
          <text
            x="0"
            y="-56"
            fontFamily="JetBrains Mono"
            fontSize="3"
            fill="#3d5572"
            textAnchor="middle"
            letterSpacing="0.5"
          >
            N
          </text>
          <text
            x="0"
            y="58.5"
            fontFamily="JetBrains Mono"
            fontSize="3"
            fill="#3d5572"
            textAnchor="middle"
            letterSpacing="0.5"
          >
            S
          </text>
          <text
            x="-56"
            y="1"
            fontFamily="JetBrains Mono"
            fontSize="3"
            fill="#3d5572"
            textAnchor="middle"
            letterSpacing="0.5"
          >
            W
          </text>
          <text
            x="56"
            y="1"
            fontFamily="JetBrains Mono"
            fontSize="3"
            fill="#3d5572"
            textAnchor="middle"
            letterSpacing="0.5"
          >
            E
          </text>

          {/* Probe trajectories */}
          {getAllTransitProbes(state).map((probe) => {
            const origin = getSystemCoord(probe.originSystemId);
            const dest = getSystemCoord(probe.destinationSystemId);
            const ox = origin.x * SCALE;
            const oy = origin.y * SCALE;
            const dx = dest.x * SCALE;
            const dy = dest.y * SCALE;
            const progress = getProbeProgress(probe);
            const px = ox + (dx - ox) * progress;
            const py = oy + (dy - oy) * progress;
            return (
              <g key={probe.id}>
                <line
                  x1={ox}
                  y1={oy}
                  x2={dx}
                  y2={dy}
                  stroke="#4ddbff"
                  strokeWidth="0.4"
                  strokeDasharray="1.5 1"
                  opacity="0.4"
                />
                <circle cx={px} cy={py} r={1.5} fill="#4ddbff" opacity="0.9" />
                <circle cx={px} cy={py} r={3} fill="#4ddbff" opacity="0.15" />
              </g>
            );
          })}

          {/* Stars */}
          {systemIds.map((id) => {
            const sys = state.systems[id];
            if (!sys) return null;
            const coord = getSystemCoord(id);
            const cx = coord.x * SCALE;
            const cy = coord.y * SCALE;
            const isSelected = selectedSystem === id;
            const isHome = state.currentSystemId === id;
            const hasProbe = sys.mainProbe !== null;
            const color = starColor(sys.starType);
            const r = isHome ? 3 : hasProbe ? 2.5 : 1.8;

            return (
              <g
                key={id}
                onClick={() => onSelect(id)}
                style={{ cursor: "pointer" }}
              >
                {isSelected && (
                  <circle
                    cx={cx}
                    cy={cy}
                    r={9}
                    fill="none"
                    stroke="#4ddbff"
                    strokeWidth="0.5"
                    strokeDasharray="1 1"
                  />
                )}
                <circle cx={cx} cy={cy} r={r + 4} fill={color} opacity="0.15" />
                <circle
                  cx={cx}
                  cy={cy}
                  r={r}
                  fill={color}
                  stroke={isSelected ? "#4ddbff" : "transparent"}
                  strokeWidth="0.4"
                />
                <text
                  x={cx}
                  y={cy + r + 4.5}
                  fontFamily="JetBrains Mono"
                  fontSize="3"
                  fill={isHome ? "#4cd8a8" : isSelected ? "#4ddbff" : "#9ab4cf"}
                  textAnchor="middle"
                  letterSpacing="0.4"
                >
                  {sys.name.toUpperCase()}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Scale indicator overlay */}
        <div
          style={{
            position: "absolute",
            bottom: 12,
            left: 12,
            padding: "6px 10px",
            background: "rgba(8,16,30,0.8)",
            border: "1px solid rgba(110,200,255,0.18)",
            fontFamily: FONT_MONO,
            fontSize: 9,
            color: "#6b87a3",
            letterSpacing: "0.14em",
          }}
        >
          <div>SCALE · 12LY MAX</div>
          <div>ORIGIN · SOL</div>
        </div>
      </div>
    </Panel>
  );
}
