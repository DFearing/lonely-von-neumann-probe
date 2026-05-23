import type { GameState } from "../../../simulation/state";
import { getSystemCoord } from "../../data/system-coords";

const MAP_SIZE = 400;
const MAP_CENTER = MAP_SIZE / 2;
const SCALE = 16;

function starColor(starType: string): string {
  switch (starType) {
    case "yellow": return "#ffe066";
    case "red": return "#ff6b6b";
    case "blue": return "#66b3ff";
    default: return "#f0f0ff";
  }
}

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

  const rings = [5, 10];

  return (
    <div className="star-map">
      <svg
        viewBox={`0 0 ${MAP_SIZE} ${MAP_SIZE}`}
        width="100%"
        style={{ display: "block" }}
      >
        <rect width={MAP_SIZE} height={MAP_SIZE} fill="#050913" />

        {rings.map((r) => (
          <circle
            key={r}
            cx={MAP_CENTER}
            cy={MAP_CENTER}
            r={r * SCALE}
            fill="none"
            stroke="#1a2338"
            strokeWidth={0.5}
            strokeDasharray="2 4"
          />
        ))}

        <line
          x1={MAP_CENTER}
          y1={0}
          x2={MAP_CENTER}
          y2={MAP_SIZE}
          stroke="#1a2338"
          strokeWidth={0.3}
        />
        <line
          x1={0}
          y1={MAP_CENTER}
          x2={MAP_SIZE}
          y2={MAP_CENTER}
          stroke="#1a2338"
          strokeWidth={0.3}
        />

        {systemIds.map((id) => {
          const sys = state.systems[id];
          if (!sys) return null;
          const coord = getSystemCoord(id);
          const cx = MAP_CENTER + coord.x * SCALE;
          const cy = MAP_CENTER + coord.y * SCALE;
          const isSelected = selectedSystem === id;
          const isCurrent = state.currentSystemId === id;
          const hasProbe = sys.mainProbe !== null;
          const color = starColor(sys.starType);

          return (
            <g
              key={id}
              onClick={() => onSelect(id)}
              style={{ cursor: "pointer" }}
            >
              {isSelected && (
                <circle cx={cx} cy={cy} r={10} fill="none" stroke="#4ddbff" strokeWidth={1} opacity={0.5} />
              )}
              {hasProbe && (
                <circle cx={cx} cy={cy} r={7} fill="none" stroke="#00e87b" strokeWidth={0.5} opacity={0.4} />
              )}
              <circle cx={cx} cy={cy} r={isCurrent ? 4 : 3} fill={color} />
              <text
                x={cx}
                y={cy + 12}
                fill="#5a6d84"
                fontSize={6}
                textAnchor="middle"
                fontFamily="'Space Grotesk', sans-serif"
              >
                {sys.name}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
