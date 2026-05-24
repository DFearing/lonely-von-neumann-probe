import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCircle, faStarOfLife, faPlus } from "@fortawesome/free-solid-svg-icons";
import type { ProbeState } from "../../../simulation/state";
import { CPUS, PROPULSIONS, REACTORS } from "../../../simulation/data/components";
import { Panel } from "../../components/Panel";
import { ProbeSchematic } from "../../components/ProbeSchematic";
import { HealthGauge } from "../../components/HealthGauge";
import { FONT_MONO } from "../../tokens";

export function ProbeDetail({
  probe,
  systemName,
  onBuild,
}: {
  probe: ProbeState;
  systemName: string;
  onBuild: () => void;
}) {
  const cpu = CPUS[probe.components.cpu]!;
  const prop = PROPULSIONS[probe.components.propulsion]!;
  const reactor = REACTORS[probe.components.reactor]!;

  const statusColor = "#4cd8a8";

  const techRows = [
    { k: "CPU", v: cpu.name, acc: "#b08bff" },
    { k: "PROPULSION", v: prop.name, acc: "#4ddbff" },
    { k: "REACTOR", v: reactor.name, acc: "#6aa9ff" },
  ];

  const telemetry = [
    { k: "MINING", v: `${(probe.miningOutput * probe.health).toFixed(1)} T/year`, acc: "#5fd9c4" },
    { k: "COMPUTE", v: `${(probe.computingOutput * probe.health).toFixed(1)} TFLOPS`, acc: "#b08bff" },
    { k: "SPEED", v: `×${prop.travelSpeed.toFixed(1)}`, acc: "#4ddbff" },
  ];

  return (
    <Panel
      label="PROBE DETAIL"
      right={
        <span
          style={{
            fontFamily: FONT_MONO,
            fontSize: 10,
            color: statusColor,
            letterSpacing: "0.16em",
          }}
        >
          <FontAwesomeIcon icon={faCircle} style={{ fontSize: 6, marginRight: 4 }} /> STATION-KEEPING
        </span>
      }
      style={{ display: "flex", flexDirection: "column", minHeight: 0 }}
    >
      {/* Header */}
      <div style={{ marginBottom: 14, display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ flexShrink: 0 }}>
          <ProbeSchematic size={108} accent={statusColor} />
        </div>
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontFamily: FONT_MONO,
              fontSize: 20,
              fontWeight: 600,
              color: "#d6e8f5",
              letterSpacing: "0.04em",
            }}
          >
            {probe.name}
          </div>
          <div
            style={{
              fontFamily: FONT_MONO,
              fontSize: 10,
              color: "#6b87a3",
              marginTop: 4,
              letterSpacing: "0.14em",
            }}
          >
            ROLE · <span style={{ color: "#9ab4cf" }}>INDUSTRIAL</span>
          </div>
          <div
            style={{
              fontFamily: FONT_MONO,
              fontSize: 10,
              color: "#6b87a3",
              marginTop: 2,
              letterSpacing: "0.14em",
            }}
          >
            UPLINK · <span style={{ color: "#9ab4cf" }}>NOMINAL</span>
          </div>
        </div>
      </div>

      {/* Location */}
      <div
        style={{
          padding: "12px 14px",
          marginBottom: 14,
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
            marginBottom: 6,
          }}
        >
          LOCATION
        </div>
        <div style={{ fontSize: 13, color: "#d6e8f5", marginBottom: 4 }}>
          <span style={{ color: "#4cd8a8" }}>{systemName}</span> · home system
        </div>
        <div style={{ fontFamily: FONT_MONO, fontSize: 10, color: "#6b87a3" }}>
          stationed
        </div>
      </div>

      {/* Structural Integrity */}
      <div
        style={{
          padding: "12px 14px",
          marginBottom: 14,
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
          STRUCTURAL INTEGRITY
        </div>
        <HealthGauge health={probe.health} />
      </div>

      {/* Technology */}
      <div style={{ marginBottom: 14 }}>
        <div
          style={{
            fontFamily: FONT_MONO,
            fontSize: 9,
            color: "#6b87a3",
            letterSpacing: "0.18em",
            marginBottom: 8,
          }}
        >
          TECHNOLOGY
        </div>
        {techRows.map((row) => (
          <div
            key={row.k}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              padding: "7px 0",
              borderBottom: "1px dashed rgba(110,200,255,0.08)",
            }}
          >
            <span
              style={{
                fontFamily: FONT_MONO,
                fontSize: 10,
                color: "#6b87a3",
                letterSpacing: "0.14em",
              }}
            >
              {row.k}
            </span>
            <span style={{ fontSize: 12, color: row.acc }}>{row.v}</span>
          </div>
        ))}
      </div>

      {/* Telemetry */}
      <div style={{ marginBottom: 14 }}>
        <div
          style={{
            fontFamily: FONT_MONO,
            fontSize: 9,
            color: "#6b87a3",
            letterSpacing: "0.18em",
            marginBottom: 8,
          }}
        >
          TELEMETRY
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
          {telemetry.map((cell) => (
            <div
              key={cell.k}
              style={{
                padding: "8px 10px",
                background: "rgba(8,16,30,0.4)",
                border: `1px solid ${cell.acc}30`,
              }}
            >
              <div
                style={{
                  fontFamily: FONT_MONO,
                  fontSize: 8,
                  color: "#6b87a3",
                  letterSpacing: "0.16em",
                  marginBottom: 3,
                }}
              >
                {cell.k}
              </div>
              <div
                style={{
                  fontFamily: FONT_MONO,
                  fontSize: 16,
                  color: cell.acc,
                  fontWeight: 600,
                }}
              >
                {cell.v}
              </div>
            </div>
          ))}
        </div>
      </div>

      {probe.autoReplicating && (
        <div
          style={{
            fontFamily: FONT_MONO,
            fontSize: 10,
            color: "#4cd8a8",
            letterSpacing: "0.14em",
            marginBottom: 14,
          }}
        >
          <FontAwesomeIcon icon={faStarOfLife} style={{ marginRight: 6 }} /> VON NEUMANN SELF-REPLICATOR
        </div>
      )}

      {/* Actions */}
      <div style={{ marginTop: "auto", display: "flex", gap: 8 }}>
        <button
          onClick={onBuild}
          style={{
            flex: 1,
            padding: "8px 12px",
            background: "rgba(77,219,255,0.08)",
            border: "1px solid rgba(77,219,255,0.4)",
            color: "#4ddbff",
            fontFamily: FONT_MONO,
            fontSize: 11,
            letterSpacing: "0.14em",
            cursor: "pointer",
            borderRadius: 2,
          }}
        >
          <FontAwesomeIcon icon={faPlus} style={{ marginRight: 6 }} /> BUILD PROBE
        </button>
      </div>
    </Panel>
  );
}
