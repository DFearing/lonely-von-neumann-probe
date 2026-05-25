import { Tooltip } from "./Tooltip";

const SEGMENT_COUNT = 5;

function healthColor(health: number): string {
  if (health > 0.6) return "#4ade80";
  if (health > 0.3) return "#facc15";
  return "#ef4444";
}

export function HealthGauge({
  health,
  compact,
}: {
  health: number;
  compact?: boolean;
}) {
  const pct = Math.round(health * 100);
  const filledSegments = Math.ceil(health * SEGMENT_COUNT);
  const color = healthColor(health);
  const barHeight = compact ? 4 : 6;

  return (
    <Tooltip content={`${pct}% health`}>
      <div
        style={{ display: "flex", alignItems: "center", gap: compact ? 6 : 8, marginBottom: 6, width: "100%" }}
      >
        <div style={{ display: "flex", gap: 2, flex: 1 }}>
          {Array.from({ length: SEGMENT_COUNT }, (_, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                height: barHeight,
                background: i < filledSegments ? color : "rgba(110,200,255,0.08)",
                opacity: i < filledSegments ? 0.85 : 1,
                boxShadow: i < filledSegments ? `0 0 4px ${color}60` : "none",
              }}
            />
          ))}
        </div>
      </div>
    </Tooltip>
  );
}
