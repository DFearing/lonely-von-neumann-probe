import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCompass } from "@fortawesome/free-solid-svg-icons";
import type { ProbeState, ProbeInTransit } from "../../../simulation/state";
import { HealthGauge } from "../../components/HealthGauge";
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
      <span
        style={{
          fontFamily: FONT_MONO,
          fontSize: 9,
          color: accent,
          letterSpacing: "0.08em",
        }}
      >
        T{tier}
      </span>
    </div>
  );
}

function parseTier(id: string): number {
  return parseInt(id.split("_t")[1] ?? "1", 10);
}

export function ProbeRow({
  probe,
  systemName,
}: {
  probe: ProbeState;
  systemName: string;
}) {
  const color = STATUS_COLORS.active;
  const ct = parseTier(probe.components.cpu);
  const pt = parseTier(probe.components.propulsion);
  const rt = parseTier(probe.components.reactor);

  return (
    <div
      style={{
        padding: "14px 16px",
        background: "rgba(8,16,30,0.4)",
        border: "1px solid rgba(110,200,255,0.12)",
        display: "grid",
        gridTemplateColumns: "1fr auto",
        gap: 12,
        rowGap: 10,
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
          {probe.name}
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
        <HealthGauge health={probe.health} compact />
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
  originName,
  destinationName,
}: {
  probe: ProbeInTransit;
  originName: string;
  destinationName: string;
}) {
  const progress =
    probe.travelTimeSeconds > 0
      ? probe.elapsedSeconds / probe.travelTimeSeconds
      : 1;
  const remaining = Math.max(0, probe.travelTimeSeconds - probe.elapsedSeconds);
  const color = STATUS_COLORS.transit;
  const ct = parseTier(probe.components.cpu);
  const pt = parseTier(probe.components.propulsion);
  const rt = parseTier(probe.components.reactor);

  return (
    <div
      style={{
        padding: "14px 16px",
        background: "rgba(8,16,30,0.4)",
        border: "1px solid rgba(110,200,255,0.12)",
        display: "grid",
        gridTemplateColumns: "1fr auto",
        gap: 12,
        rowGap: 10,
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
          {probe.name}
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
          {destinationName}
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
              {originName} → {destinationName}
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

const AVAILABLE_COLOR = "#4cd8a8";

export function AvailableProbeRow({
  probe,
  onExplore,
}: {
  probe: ProbeState;
  onExplore: () => void;
}) {
  const ct = parseTier(probe.components.cpu);
  const pt = parseTier(probe.components.propulsion);
  const rt = parseTier(probe.components.reactor);

  return (
    <div
      style={{
        padding: "14px 16px",
        background: "rgba(8,16,30,0.4)",
        border: `1px solid ${AVAILABLE_COLOR}30`,
        display: "grid",
        gridTemplateColumns: "1fr auto",
        gap: 12,
        rowGap: 10,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
        <span
          style={{
            width: 9,
            height: 9,
            borderRadius: "50%",
            background: AVAILABLE_COLOR,
            boxShadow: `0 0 6px ${AVAILABLE_COLOR}`,
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
          {probe.name}
        </span>
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          whiteSpace: "nowrap",
        }}
      >
        <span
          style={{
            fontFamily: FONT_MONO,
            fontSize: 10,
            color: AVAILABLE_COLOR,
            letterSpacing: "0.16em",
          }}
        >
          AVAILABLE
        </span>
        <button
          onClick={onExplore}
          style={{
            padding: "5px 12px",
            background: `${AVAILABLE_COLOR}14`,
            border: `1px solid ${AVAILABLE_COLOR}60`,
            color: AVAILABLE_COLOR,
            fontFamily: FONT_MONO,
            fontSize: 10,
            letterSpacing: "0.14em",
            fontWeight: 600,
            cursor: "pointer",
            borderRadius: 2,
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <FontAwesomeIcon icon={faCompass} style={{ fontSize: 10 }} />
          EXPLORE
        </button>
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
