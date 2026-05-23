import type { ProbeState, ProbeInTransit } from "../../../simulation/state";
import { FONT_MONO } from "../../tokens";
import { fmtTime, fmtPercent } from "../../format";

const STATUS_COLORS = {
  active: "#4cd8a8",
  transit: "#4ddbff",
  constructing: "#ff9966",
} as const;

function TechChip({ label, tier, accent }: { label: string; tier: number; accent: string }) {
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <span style={{ color: "#3d5572", letterSpacing: "0.14em" }}>{label}</span>
      <span style={{ display: "inline-flex", gap: 3 }}>
        {Array.from({ length: 4 }, (_, i) => {
          const filled = i < tier;
          return (
            <span
              key={i}
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: filled ? accent : "transparent",
                border: `1px solid ${filled ? accent : "rgba(110,200,255,0.22)"}`,
                boxShadow: filled ? `0 0 3px ${accent}80` : "none",
              }}
            />
          );
        })}
      </span>
    </div>
  );
}

function cpuTier(cpu: string): number {
  const tiers: Record<string, number> = {
    basic_cpu: 1, enhanced_cpu: 2, advanced_cpu: 3, quantum_cpu: 4,
  };
  return tiers[cpu] ?? 1;
}

function propTier(prop: string): number {
  const tiers: Record<string, number> = {
    basic_ion_drive: 1, efficient_drive: 2, advanced_drive: 3, von_neumann_drive: 4,
  };
  return tiers[prop] ?? 1;
}

function rctTier(rct: string): number {
  const tiers: Record<string, number> = {
    basic_reactor: 1, fusion_reactor: 2, solar_harvester: 2, exotic_reactor: 4,
  };
  return tiers[rct] ?? 1;
}

export function ProbeRow({
  probe,
  systemName,
  selected,
  onClick,
}: {
  probe: ProbeState;
  systemName: string;
  selected: boolean;
  onClick: () => void;
}) {
  const color = STATUS_COLORS.active;
  const ct = cpuTier(probe.components.cpu);
  const pt = propTier(probe.components.propulsion);
  const rt = rctTier(probe.components.reactor);

  return (
    <div
      onClick={onClick}
      style={{
        padding: "14px 16px",
        background: selected ? "rgba(77,219,255,0.08)" : "rgba(8,16,30,0.4)",
        border: `1px solid ${selected ? "#4ddbff" : "rgba(110,200,255,0.12)"}`,
        display: "grid",
        gridTemplateColumns: "1fr auto",
        gap: 12,
        rowGap: 10,
        cursor: "pointer",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
        <span
          style={{
            width: 9,
            height: 9,
            borderRadius: "50%",
            background: color,
            boxShadow: `0 0 6px ${color}`,
            flexShrink: 0,
          }}
        />
        <span
          style={{
            fontFamily: FONT_MONO,
            fontSize: 14,
            fontWeight: 600,
            color: "#d6e8f5",
            letterSpacing: "0.04em",
          }}
        >
          {probe.id}
        </span>
        <span style={{ color: "#3d5572" }}>·</span>
        <span
          style={{
            fontSize: 12,
            color: "#9ab4cf",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {systemName}
        </span>
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          gap: 3,
          whiteSpace: "nowrap",
        }}
      >
        <span
          style={{
            fontFamily: FONT_MONO,
            fontSize: 10,
            color,
            letterSpacing: "0.16em",
          }}
        >
          STATION-KEEPING
        </span>
        <span
          style={{
            fontFamily: FONT_MONO,
            fontSize: 9,
            color: "#6b87a3",
            letterSpacing: "0.12em",
          }}
        >
          <span style={{ color: "#3d5572" }}>UPLINK · </span>NOMINAL
        </span>
      </div>

      <div style={{ gridColumn: "1 / -1" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(5, auto)",
            gap: 18,
            fontFamily: FONT_MONO,
            fontSize: 10,
          }}
        >
          <TechChip label="CPU" tier={ct} accent="#4ddbff" />
          <TechChip label="PROP" tier={pt} accent="#5cc7ff" />
          <TechChip label="RCT" tier={rt} accent="#ffcb47" />
          <TechChip label="MINING" tier={ct} accent="#5cc7ff" />
          <TechChip label="COMPUTE" tier={ct} accent="#b08bff" />
        </div>
      </div>
    </div>
  );
}

export function TransitProbeRow({
  probe,
  selected,
  onClick,
}: {
  probe: ProbeInTransit;
  selected: boolean;
  onClick: () => void;
}) {
  const progress =
    probe.travelTimeSeconds > 0
      ? probe.elapsedSeconds / probe.travelTimeSeconds
      : 1;
  const remaining = Math.max(0, probe.travelTimeSeconds - probe.elapsedSeconds);
  const color = STATUS_COLORS.transit;
  const ct = cpuTier(probe.components.cpu);
  const pt = propTier(probe.components.propulsion);
  const rt = rctTier(probe.components.reactor);

  return (
    <div
      onClick={onClick}
      style={{
        padding: "14px 16px",
        background: selected ? "rgba(77,219,255,0.08)" : "rgba(8,16,30,0.4)",
        border: `1px solid ${selected ? "#4ddbff" : "rgba(110,200,255,0.12)"}`,
        display: "grid",
        gridTemplateColumns: "1fr auto",
        gap: 12,
        rowGap: 10,
        cursor: "pointer",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
        <span
          style={{
            width: 9,
            height: 9,
            borderRadius: "50%",
            background: color,
            boxShadow: `0 0 6px ${color}`,
            flexShrink: 0,
          }}
        />
        <span
          style={{
            fontFamily: FONT_MONO,
            fontSize: 14,
            fontWeight: 600,
            color: "#d6e8f5",
            letterSpacing: "0.04em",
          }}
        >
          {probe.id}
        </span>
        <span style={{ color: "#3d5572" }}>·</span>
        <span
          style={{
            fontSize: 12,
            color: "#9ab4cf",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          <span style={{ color: "#3d5572" }}>→ </span>
          {probe.destinationSystemId}
        </span>
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          gap: 3,
          whiteSpace: "nowrap",
        }}
      >
        <span
          style={{
            fontFamily: FONT_MONO,
            fontSize: 10,
            color,
            letterSpacing: "0.16em",
          }}
        >
          IN-TRANSIT
        </span>
      </div>

      <div style={{ gridColumn: "1 / -1" }}>
        <div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontFamily: FONT_MONO,
              fontSize: 10,
              color: "#6b87a3",
              marginBottom: 4,
            }}
          >
            <span>
              {probe.originSystemId} → {probe.destinationSystemId}
            </span>
            <span style={{ color: "#4ddbff" }}>
              {fmtPercent(progress)} · ETA {fmtTime(remaining)}
            </span>
          </div>
          <div
            style={{
              position: "relative",
              height: 3,
              background: "rgba(110,200,255,0.08)",
            }}
          >
            <div
              style={{
                position: "absolute",
                inset: "0 auto 0 0",
                width: `${Math.min(progress, 1) * 100}%`,
                background: "#4ddbff",
                opacity: 0.85,
                boxShadow: "0 0 6px rgba(77,219,255,0.7)",
                transition: "width .4s linear",
              }}
            />
          </div>
        </div>
      </div>

      <div style={{ gridColumn: "1 / -1" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(5, auto)",
            gap: 18,
            fontFamily: FONT_MONO,
            fontSize: 10,
          }}
        >
          <TechChip label="CPU" tier={ct} accent="#4ddbff" />
          <TechChip label="PROP" tier={pt} accent="#5cc7ff" />
          <TechChip label="RCT" tier={rt} accent="#ffcb47" />
          <TechChip label="MINING" tier={ct} accent="#5cc7ff" />
          <TechChip label="COMPUTE" tier={ct} accent="#b08bff" />
        </div>
      </div>
    </div>
  );
}
