import { useState } from "react";
import type { GameState } from "../../../simulation/state";
import { getAllTransitProbes, getProbeProgress } from "../../../simulation/queries";
import { getSystemCoord } from "../../data/system-coords";
import { starColor } from "../../data/star-colors";
import { FONT_MONO } from "../../tokens";

const SCALE = 6;
const ZOOM_LEVELS = [15, 25, 40, 60];

export function MiniStarMap({ state }: { state: GameState }) {
  const [zoomIdx, setZoomIdx] = useState(0);
  const halfSpan = ZOOM_LEVELS[zoomIdx]!;

  const currentSystem = state.systems[state.currentSystemId];
  const systemIds = currentSystem
    ? [currentSystem.id, ...currentSystem.discoveredSystems]
    : [];

  const homeCoord = getSystemCoord(state.currentSystemId);
  const cx = homeCoord.x * SCALE;
  const cy = homeCoord.y * SCALE;

  const ringStep = Math.max(6, Math.round(halfSpan / 3));
  const distanceRings = [ringStep, ringStep * 2, ringStep * 3].filter((r) => r < halfSpan);

  const s = halfSpan / 60;

  const btnStyle = {
    width: 32,
    height: 32,
    display: "flex" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    background: "rgba(8,16,30,0.8)",
    border: "1px solid rgba(110,200,255,0.18)",
    color: "#9ab4cf",
    fontFamily: FONT_MONO,
    fontSize: 18,
    cursor: "pointer" as const,
    lineHeight: 1,
  };

  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        position: "relative",
        background:
          "radial-gradient(ellipse at center, rgba(77,219,255,0.04) 0%, transparent 60%)",
        overflow: "hidden",
      }}
    >
      <svg
        viewBox={`${cx - halfSpan} ${cy - halfSpan} ${halfSpan * 2} ${halfSpan * 2}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ width: "100%", height: "100%" }}
      >
        {distanceRings.map((r) => (
          <g key={r}>
            <circle
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke="rgba(110,200,255,0.10)"
              strokeWidth="0.3"
              strokeDasharray="1 2"
            />
            <text
              x={cx + r + 0.5}
              y={cy - 0.5}
              fontFamily="JetBrains Mono"
              fontSize={2.6 * s}
              fill="#3d5572"
            >
              {Math.round(r / SCALE)}ly
            </text>
          </g>
        ))}

        <line
          x1={cx - halfSpan}
          y1={cy}
          x2={cx + halfSpan}
          y2={cy}
          stroke="rgba(110,200,255,0.06)"
          strokeWidth="0.2"
        />
        <line
          x1={cx}
          y1={cy - halfSpan}
          x2={cx}
          y2={cy + halfSpan}
          stroke="rgba(110,200,255,0.06)"
          strokeWidth="0.2"
        />

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
              <circle cx={px} cy={py} r={1.5 * s} fill="#4ddbff" opacity="0.9" />
              <circle cx={px} cy={py} r={3 * s} fill="#4ddbff" opacity="0.15" />
            </g>
          );
        })}

        {systemIds.map((id) => {
          const sys = state.systems[id];
          if (!sys) return null;
          const coord = getSystemCoord(id);
          const sx = coord.x * SCALE;
          const sy = coord.y * SCALE;
          const isHome = state.currentSystemId === id;
          const hasProbe = sys.mainProbe !== null;
          const color = isHome ? "#4cd8a8" : hasProbe ? starColor(sys.starType) : "#6b87a3";
          const r = (isHome ? 3 : hasProbe ? 2.5 : 1.8) * s;
          const labelColor = isHome ? "#4cd8a8" : hasProbe ? "#9ab4cf" : "#6b87a3";

          return (
            <g key={id}>
              <circle cx={sx} cy={sy} r={r + 4 * s} fill={color} opacity="0.15" />
              <circle cx={sx} cy={sy} r={r} fill={color} />
              <text
                x={sx}
                y={sy + r + 4.5 * s}
                fontFamily="JetBrains Mono"
                fontSize={3 * s}
                fill={labelColor}
                textAnchor="middle"
                letterSpacing={0.4 * s}
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
          right: 8,
          display: "flex",
          flexDirection: "column",
          gap: 2,
        }}
      >
        <button
          style={btnStyle}
          disabled={zoomIdx === 0}
          onClick={() => setZoomIdx((i) => Math.max(0, i - 1))}
        >
          +
        </button>
        <button
          style={btnStyle}
          disabled={zoomIdx === ZOOM_LEVELS.length - 1}
          onClick={() => setZoomIdx((i) => Math.min(ZOOM_LEVELS.length - 1, i + 1))}
        >
          −
        </button>
      </div>
    </div>
  );
}
