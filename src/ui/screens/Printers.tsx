// Data below is hardcoded mock data. Wire to real game state when
// multi-system printer tracking is implemented.

import { Fragment, useEffect, useMemo, useState } from "react";
import { ScreenHeader } from "../components/ScreenHeader";
import { Panel } from "../components/Panel";
import { btnFlush } from "../components/buttons";
import { FONT_MONO } from "../tokens";
import { fmtTime } from "../format";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TierInfo {
  label: string;
  color: string;
  speed: number;
}

interface StatusInfo {
  color: string;
  label: string;
}

type PrinterStatus = "printing" | "idle" | "starved" | "paused";
type JobKind = "reactor" | "miner" | "printer" | "station" | "probe";

interface PrinterJob {
  name: string;
  kind: JobKind;
  total: number;
  elapsed: number;
  cost: string;
  queueAhead: number;
}

interface PrinterData {
  id: string;
  tier: number;
  status: PrinterStatus;
  job: PrinterJob | null;
}

interface SystemPower {
  generated: number;
  capacity: number;
}

interface PrinterSystem {
  id: string;
  name: string;
  starColor: string;
  distance: number;
  isHome?: boolean;
  power: SystemPower;
  printers: PrinterData[];
}

interface AggregateStats {
  total: number;
  active: number;
  idle: number;
  starved: number;
  powerDraw: number;
  throughput: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PRN_TIERS: Record<number, TierInfo> = {
  1: { label: "BASIC", color: "#6cb8e8", speed: 1.0 },
  2: { label: "ENHANCED", color: "#4ddbff", speed: 1.5 },
  3: { label: "ADVANCED", color: "#b08bff", speed: 2.5 },
  4: { label: "AUTOMATED", color: "#d488ec", speed: 4.0 },
};

const PRN_STATUS: Record<PrinterStatus, StatusInfo> = {
  printing: { color: "#4cd8a8", label: "PRINTING" },
  idle: { color: "#6b87a3", label: "IDLE" },
  starved: { color: "#ee8cb8", label: "STARVED · ENERGY" },
  paused: { color: "#d488ec", label: "PAUSED" },
};

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const PRN_SYSTEMS: PrinterSystem[] = [
  {
    id: "sol",
    name: "Sol",
    starColor: "#ffcb47",
    distance: 0,
    isHome: true,
    power: { generated: 60, capacity: 80 },
    printers: [
      {
        id: "PRN-SOL-01",
        tier: 1,
        status: "printing",
        job: {
          name: "Reactor (Basic)",
          kind: "reactor",
          total: 4.0,
          elapsed: 3.1,
          cost: "10M · 2E",
          queueAhead: 1,
        },
      },
      {
        id: "PRN-SOL-02",
        tier: 2,
        status: "printing",
        job: {
          name: "Probe BOB-04",
          kind: "probe",
          total: 18.0,
          elapsed: 11.4,
          cost: "60M · 14E",
          queueAhead: 0,
        },
      },
      {
        id: "PRN-SOL-03",
        tier: 2,
        status: "printing",
        job: {
          name: "Miner (T2)",
          kind: "miner",
          total: 8.0,
          elapsed: 5.6,
          cost: "30M · 10E",
          queueAhead: 2,
        },
      },
      {
        id: "PRN-SOL-04",
        tier: 3,
        status: "idle",
        job: null,
      },
    ],
  },
  {
    id: "alpha",
    name: "Alpha Centauri",
    starColor: "#fff2c0",
    distance: 4.37,
    power: { generated: 38, capacity: 50 },
    printers: [
      {
        id: "PRN-AC-01",
        tier: 2,
        status: "printing",
        job: {
          name: "Solar Harvester",
          kind: "reactor",
          total: 16.0,
          elapsed: 2.0,
          cost: "120M · 30E",
          queueAhead: 0,
        },
      },
      {
        id: "PRN-AC-02",
        tier: 2,
        status: "starved",
        job: {
          name: "Miner (T2)",
          kind: "miner",
          total: 8.0,
          elapsed: 1.4,
          cost: "30M · 10E",
          queueAhead: 1,
        },
      },
    ],
  },
  {
    id: "sirius",
    name: "Sirius",
    starColor: "#bcd5ff",
    distance: 8.6,
    power: { generated: 95, capacity: 120 },
    printers: [
      {
        id: "PRN-SIR-01",
        tier: 3,
        status: "printing",
        job: {
          name: "Mass Driver",
          kind: "station",
          total: 24.0,
          elapsed: 19.8,
          cost: "400M · 100E",
          queueAhead: 0,
        },
      },
    ],
  },
  {
    id: "barnard",
    name: "Barnard's Star",
    starColor: "#ff8a6e",
    distance: 5.96,
    power: { generated: 14, capacity: 20 },
    printers: [
      {
        id: "PRN-BAR-01",
        tier: 1,
        status: "printing",
        job: {
          name: "Printer",
          kind: "printer",
          total: 12.0,
          elapsed: 0.6,
          cost: "30M · 10E",
          queueAhead: 3,
        },
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const POWER_BY_TIER = [0, 10, 25, 60, 150] as const;

function prnPower(p: PrinterData): number {
  return POWER_BY_TIER[p.tier] ?? 0;
}

function livePrnSystems(t: number): PrinterSystem[] {
  return PRN_SYSTEMS.map((sys) => ({
    ...sys,
    printers: sys.printers.map((p) => {
      if (!p.job) return p;
      if (p.status !== "printing") return p;
      const tier = PRN_TIERS[p.tier];
      if (!tier) return p;
      const next = Math.min(p.job.total, p.job.elapsed + t * tier.speed * 0.05);
      return { ...p, job: { ...p.job, elapsed: next } };
    }),
  }));
}

function aggregatePrnStats(systems: PrinterSystem[]): AggregateStats {
  let total = 0;
  let active = 0;
  let idle = 0;
  let starved = 0;
  let powerDraw = 0;
  let throughput = 0;
  for (const sys of systems) {
    for (const p of sys.printers) {
      total++;
      if (p.status === "printing") {
        active++;
        powerDraw += prnPower(p);
        const tier = PRN_TIERS[p.tier];
        if (tier) throughput += tier.speed;
      } else if (p.status === "idle") {
        idle++;
      } else if (p.status === "starved") {
        starved++;
      }
    }
  }
  return { total, active, idle, starved, powerDraw, throughput };
}

// ---------------------------------------------------------------------------
// useTick — drives mock progress bar advancement
// ---------------------------------------------------------------------------

function useTick(interval = 500): number {
  const [t, setT] = useState(0);
  useEffect(() => {
    const id = setInterval(
      () => setT((v) => v + interval / 1000),
      interval,
    );
    return () => clearInterval(id);
  }, [interval]);
  return t;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function JobGlyph({
  kind,
  size = 14,
  color = "#d6e8f5",
}: {
  kind: JobKind;
  size?: number;
  color?: string;
}) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 16 16",
    fill: "none",
    stroke: color,
    strokeWidth: 1.4,
    strokeLinejoin: "round" as const,
  };
  switch (kind) {
    case "reactor":
      return (
        <svg {...common}>
          <circle cx="8" cy="8" r="4" />
          <circle cx="8" cy="8" r="1.2" fill={color} stroke="none" />
          <line x1="8" y1="1" x2="8" y2="3.6" />
          <line x1="8" y1="12.4" x2="8" y2="15" />
          <line x1="1" y1="8" x2="3.6" y2="8" />
          <line x1="12.4" y1="8" x2="15" y2="8" />
        </svg>
      );
    case "miner":
      return (
        <svg {...common}>
          <path d="M2 14 L7 5 L9 5 L14 14 Z" />
          <line x1="5" y1="9" x2="11" y2="9" />
        </svg>
      );
    case "printer":
      return (
        <svg {...common}>
          <rect x="3" y="3" width="10" height="10" />
          <line x1="3" y1="9" x2="13" y2="9" />
          <circle cx="6" cy="6" r="0.8" fill={color} stroke="none" />
        </svg>
      );
    case "station":
      return (
        <svg {...common}>
          <polygon points="8,2 14,8 8,14 2,8" />
          <polygon points="8,5.5 11,8 8,10.5 5,8" fill={color + "40"} />
        </svg>
      );
    case "probe":
      return (
        <svg {...common}>
          <circle cx="8" cy="8" r="2.4" fill={color + "40"} stroke="none" />
          <circle cx="8" cy="8" r="2.4" />
          <line x1="8" y1="5.6" x2="8" y2="2" />
          <line x1="8" y1="10.4" x2="8" y2="14" />
          <line x1="5.6" y1="8" x2="2" y2="8" />
          <line x1="10.4" y1="8" x2="14" y2="8" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <rect x="3" y="3" width="10" height="10" />
        </svg>
      );
  }
}

function PrnBannerKPI({
  label,
  value,
  unit,
  color,
}: {
  label: string;
  value: string | number;
  unit: string;
  color: string;
}) {
  return (
    <div
      style={{
        padding: "12px 16px",
        borderLeft: "1px solid rgba(108,184,232,0.18)",
      }}
    >
      <div
        style={{
          fontFamily: FONT_MONO,
          fontSize: 9,
          color: "#6b87a3",
          letterSpacing: "0.18em",
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
        <span
          style={{
            fontFamily: FONT_MONO,
            fontSize: 22,
            color,
            fontWeight: 600,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {value}
        </span>
        <span
          style={{
            fontFamily: FONT_MONO,
            fontSize: 9,
            color: "#6b87a3",
            letterSpacing: "0.14em",
          }}
        >
          {unit}
        </span>
      </div>
    </div>
  );
}

function PrnGlobalBanner({
  stats,
  systems,
}: {
  stats: AggregateStats;
  systems: PrinterSystem[];
}) {
  const dotForSystem = (sys: PrinterSystem) => {
    const active = sys.printers.filter((p) => p.status === "printing").length;
    const total = sys.printers.length;
    return {
      id: sys.id,
      name: sys.name,
      color: sys.starColor,
      active,
      total,
    };
  };
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr) 1.4fr",
        gap: 0,
        marginBottom: 16,
        background:
          "linear-gradient(90deg, rgba(108,184,232,0.10), rgba(108,184,232,0.02) 70%)",
        border: "1px solid rgba(108,184,232,0.30)",
        borderLeft: "3px solid #6cb8e8",
      }}
    >
      <PrnBannerKPI
        label="PRINTERS"
        value={stats.total}
        unit={`${stats.active} ACTIVE`}
        color="#d6e8f5"
      />
      <PrnBannerKPI
        label="THROUGHPUT"
        value={stats.throughput.toFixed(1)}
        unit="BP/s"
        color="#4cd8a8"
      />
      <PrnBannerKPI
        label="POWER DRAW"
        value={stats.powerDraw}
        unit="MW"
        color="#5d8aff"
      />
      <PrnBannerKPI
        label="ATTENTION"
        value={stats.starved + stats.idle}
        unit={
          stats.starved
            ? `${stats.starved} STARVED`
            : `${stats.idle} IDLE`
        }
        color={stats.starved ? "#ee8cb8" : "#6b87a3"}
      />

      <div
        style={{
          padding: "12px 16px",
          borderLeft: "1px solid rgba(108,184,232,0.18)",
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
          SYSTEMS &middot; {systems.length}
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          {systems.map(dotForSystem).map((d) => (
            <div
              key={d.id}
              style={{ display: "flex", alignItems: "center", gap: 6 }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: d.color,
                  boxShadow: `0 0 6px ${d.color}80`,
                }}
              />
              <span
                style={{
                  fontFamily: FONT_MONO,
                  fontSize: 10,
                  color: "#d6e8f5",
                }}
              >
                <span style={{ color: "#4cd8a8" }}>{d.active}</span>
                <span style={{ color: "#3d5572" }}>/{d.total}</span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PrnSystemHeader({
  system,
  expanded,
  onToggle,
}: {
  system: PrinterSystem;
  expanded: boolean;
  onToggle: () => void;
}) {
  const active = system.printers.filter(
    (p) => p.status === "printing",
  ).length;
  const draw = system.printers
    .filter((p) => p.status === "printing")
    .reduce((sum, p) => sum + prnPower(p), 0);
  const deficit = draw > system.power.generated;
  return (
    <div
      onClick={onToggle}
      style={{
        display: "grid",
        gridTemplateColumns: "18px 16px 1fr auto",
        gap: 10,
        alignItems: "center",
        padding: "10px 12px",
        background: "rgba(8,16,30,0.55)",
        borderTop: "1px solid rgba(110,200,255,0.10)",
        borderBottom: "1px solid rgba(110,200,255,0.06)",
        cursor: "pointer",
        position: "sticky",
        top: 0,
        zIndex: 1,
      }}
    >
      <span
        style={{
          fontFamily: FONT_MONO,
          fontSize: 11,
          color: "#6b87a3",
        }}
      >
        {expanded ? "▾" : "▸"}
      </span>
      <span
        style={{
          width: 10,
          height: 10,
          borderRadius: "50%",
          background: system.starColor,
          boxShadow: `0 0 8px ${system.starColor}80`,
        }}
      />
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 12,
          minWidth: 0,
        }}
      >
        <span
          style={{
            fontSize: 14,
            color: "#d6e8f5",
            fontWeight: 600,
            letterSpacing: "0.04em",
          }}
        >
          {system.name.toUpperCase()}
        </span>
        {system.isHome && (
          <span
            style={{
              fontFamily: FONT_MONO,
              fontSize: 9,
              color: "#4cd8a8",
              letterSpacing: "0.18em",
            }}
          >
            HOME
          </span>
        )}
        <span
          style={{
            fontFamily: FONT_MONO,
            fontSize: 10,
            color: "#6b87a3",
          }}
        >
          {system.distance.toFixed(2)} ly
        </span>
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          fontFamily: FONT_MONO,
          fontSize: 10,
        }}
      >
        <span>
          <span style={{ color: "#4cd8a8" }}>{active}</span>
          <span style={{ color: "#3d5572" }}>
            /{system.printers.length}
          </span>
          <span
            style={{
              color: "#6b87a3",
              letterSpacing: "0.12em",
              marginLeft: 6,
            }}
          >
            ACTIVE
          </span>
        </span>
        <span
          style={{
            width: 1,
            height: 14,
            background: "rgba(110,200,255,0.14)",
          }}
        />
        <span style={{ color: deficit ? "#ee8cb8" : "#5d8aff" }}>
          {draw}
          <span style={{ color: "#3d5572" }}>/</span>
          {system.power.generated}
          <span
            style={{
              color: "#6b87a3",
              letterSpacing: "0.12em",
              marginLeft: 4,
            }}
          >
            MW
          </span>
        </span>
        <span
          style={{
            width: 56,
            height: 4,
            background: "rgba(93,138,255,0.10)",
            position: "relative",
          }}
        >
          <span
            style={{
              position: "absolute",
              inset: "0 auto 0 0",
              width:
                Math.min(
                  100,
                  (draw / system.power.generated) * 100,
                ) + "%",
              background: deficit ? "#ee8cb8" : "#5d8aff",
            }}
          />
        </span>
      </div>
    </div>
  );
}

function PrnRow({
  printer,
  selected,
  onSelect,
}: {
  printer: PrinterData;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  const tier = PRN_TIERS[printer.tier];
  const stat = PRN_STATUS[printer.status];
  if (!tier || !stat) return null;
  const job = printer.job;
  const pct = job ? (job.elapsed / job.total) * 100 : 0;
  const remaining = job ? job.total - job.elapsed : 0;
  const power = prnPower(printer);
  return (
    <div
      onClick={() => onSelect(printer.id)}
      style={{
        display: "grid",
        gridTemplateColumns: "36px minmax(0, 1fr) auto",
        gridTemplateRows: "auto auto",
        gridTemplateAreas: '"icon header power" "icon body body"',
        columnGap: 12,
        rowGap: 8,
        alignItems: "start",
        padding: "12px 14px 12px 12px",
        background: selected
          ? "rgba(77,219,255,0.05)"
          : "transparent",
        borderTop: "1px solid rgba(110,200,255,0.05)",
        borderLeft: `3px solid ${selected ? "#4ddbff" : tier.color + "88"}`,
        cursor: "pointer",
        transition: "background .12s",
      }}
    >
      <div
        style={{
          gridArea: "icon",
          alignSelf: "center",
          width: 32,
          height: 32,
          borderRadius: 3,
          background: tier.color + "12",
          border: `1px solid ${tier.color}88`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: tier.color,
          fontSize: 15,
        }}
      >
        &#x229F;
      </div>

      <div
        style={{
          gridArea: "header",
          display: "flex",
          alignItems: "baseline",
          gap: 10,
          minWidth: 0,
        }}
      >
        <span
          style={{
            fontFamily: FONT_MONO,
            fontSize: 12,
            color: "#d6e8f5",
            fontWeight: 500,
            letterSpacing: "0.02em",
          }}
        >
          {printer.id}
        </span>
        <span
          style={{
            fontFamily: FONT_MONO,
            fontSize: 9,
            color: tier.color,
            letterSpacing: "0.18em",
          }}
        >
          {tier.label}
        </span>
        <span
          style={{
            fontFamily: FONT_MONO,
            fontSize: 9,
            color: "#3d5572",
          }}
        >
          {tier.speed.toFixed(1)}&times;
        </span>
        <span
          style={{
            fontFamily: FONT_MONO,
            fontSize: 8.5,
            color: stat.color,
            letterSpacing: "0.16em",
            padding: "2px 7px",
            background: stat.color + "14",
            border: `1px solid ${stat.color}40`,
          }}
        >
          {stat.label}
        </span>
      </div>

      <div style={{ gridArea: "power", textAlign: "right" }}>
        <span
          style={{
            fontFamily: FONT_MONO,
            fontSize: 15,
            color:
              printer.status === "printing" ? "#5d8aff" : "#3d5572",
            fontWeight: 600,
          }}
        >
          {printer.status === "printing" ? power : 0}
        </span>
        <span
          style={{
            fontFamily: FONT_MONO,
            fontSize: 9,
            color: "#6b87a3",
            letterSpacing: "0.16em",
            marginLeft: 4,
          }}
        >
          MW
        </span>
      </div>

      <div
        style={{
          gridArea: "body",
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) minmax(160px, 240px)",
          gap: 14,
          alignItems: "center",
        }}
      >
        <div style={{ minWidth: 0 }}>
          {job ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <JobGlyph kind={job.kind} size={14} color={stat.color} />
              <div style={{ minWidth: 0, flex: 1 }}>
                <div
                  style={{
                    fontSize: 13,
                    color: "#d6e8f5",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    lineHeight: 1.15,
                  }}
                >
                  {job.name}
                </div>
                <div
                  style={{
                    fontFamily: FONT_MONO,
                    fontSize: 9.5,
                    color: "#6b87a3",
                    marginTop: 2,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {job.cost}
                  {job.queueAhead > 0 && (
                    <Fragment>
                      <span
                        style={{
                          color: "#3d5572",
                          margin: "0 6px",
                        }}
                      >
                        &middot;
                      </span>
                      <span style={{ color: "#d488ec" }}>
                        +{job.queueAhead} queued
                      </span>
                    </Fragment>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <div
                style={{
                  width: 14,
                  height: 14,
                  border: "1px dashed rgba(110,200,255,0.30)",
                  borderRadius: 2,
                }}
              />
              <div
                style={{
                  fontSize: 13,
                  color: "#6b87a3",
                  fontStyle: "italic",
                }}
              >
                idle &middot; no job assigned
              </div>
            </div>
          )}
        </div>

        <div style={{ minWidth: 0 }}>
          {job ? (
            <Fragment>
              <div
                style={{
                  position: "relative",
                  height: 5,
                  background: "rgba(110,200,255,0.08)",
                  marginBottom: 5,
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    inset: "0 auto 0 0",
                    width: pct + "%",
                    background: `linear-gradient(90deg, ${stat.color}80, ${stat.color})`,
                    transition: "width .4s linear",
                    boxShadow:
                      printer.status === "printing"
                        ? `0 0 4px ${stat.color}80`
                        : "none",
                  }}
                />
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontFamily: FONT_MONO,
                  fontSize: 10,
                }}
              >
                <span style={{ color: stat.color, fontWeight: 600 }}>
                  {pct.toFixed(0)}%
                </span>
                <span style={{ color: "#9ab4cf" }}>
                  {fmtTime(remaining)}
                </span>
                <span style={{ color: "#3d5572" }}>
                  {job.elapsed.toFixed(1)}
                  <span style={{ color: "#2c3e5a" }}>
                    /{job.total.toFixed(1)}
                  </span>
                </span>
              </div>
            </Fragment>
          ) : (
            <div
              style={{
                border: "1px dashed rgba(110,200,255,0.18)",
                padding: "5px 8px",
                fontFamily: FONT_MONO,
                fontSize: 9,
                color: "#6b87a3",
                letterSpacing: "0.14em",
                textAlign: "center",
              }}
            >
              AWAITING QUEUE
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PrnKV({
  k,
  v,
  color = "#d6e8f5",
}: {
  k: string;
  v: string;
  color?: string;
}) {
  return (
    <div>
      <div
        style={{
          fontFamily: FONT_MONO,
          fontSize: 8,
          color: "#6b87a3",
          letterSpacing: "0.16em",
          marginBottom: 3,
        }}
      >
        {k}
      </div>
      <div
        style={{
          fontFamily: FONT_MONO,
          fontSize: 12,
          color,
          fontWeight: 500,
        }}
      >
        {v}
      </div>
    </div>
  );
}

function PrnDetail({
  printer,
  system,
}: {
  printer: PrinterData | null;
  system: PrinterSystem | null;
}) {
  if (!printer || !system) return null;
  const tier = PRN_TIERS[printer.tier];
  const stat = PRN_STATUS[printer.status];
  if (!tier || !stat) return null;
  const job = printer.job;
  const pct = job ? (job.elapsed / job.total) * 100 : 0;
  const power = prnPower(printer);
  const remaining = job ? job.total - job.elapsed : 0;

  return (
    <div
      style={{
        padding: "14px 16px",
        borderBottom: "1px solid rgba(110,200,255,0.10)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 12,
        }}
      >
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 3,
            background: tier.color + "15",
            border: `1.5px solid ${tier.color}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: tier.color,
            fontSize: 22,
            textShadow: `0 0 8px ${tier.color}60`,
          }}
        >
          &#x229F;
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontFamily: FONT_MONO,
              fontSize: 9,
              color: tier.color,
              letterSpacing: "0.18em",
              marginBottom: 2,
            }}
          >
            {tier.label} PRINTER &middot; {tier.speed.toFixed(1)}&times;
            SPEED
          </div>
          <div
            style={{
              fontFamily: FONT_MONO,
              fontSize: 15,
              color: "#d6e8f5",
              fontWeight: 500,
            }}
          >
            {printer.id}
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              marginTop: 4,
              fontFamily: FONT_MONO,
              fontSize: 9.5,
              color: "#6b87a3",
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: system.starColor,
                boxShadow: `0 0 4px ${system.starColor}80`,
              }}
            />
            {system.name.toUpperCase()}
            <span style={{ color: "#3d5572" }}>&middot;</span>
            <span>{system.distance.toFixed(2)} ly</span>
          </div>
        </div>
      </div>

      {job ? (
        <div
          style={{
            padding: "12px",
            background: "rgba(8,16,30,0.6)",
            border: `1px solid ${stat.color}30`,
            borderLeft: `2px solid ${stat.color}`,
            marginBottom: 12,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginBottom: 10,
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                border: "1px solid rgba(110,200,255,0.18)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "rgba(110,200,255,0.04)",
              }}
            >
              <JobGlyph kind={job.kind} size={20} color={stat.color} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontFamily: FONT_MONO,
                  fontSize: 8.5,
                  color: stat.color,
                  letterSpacing: "0.18em",
                  marginBottom: 2,
                }}
              >
                {stat.label}
              </div>
              <div
                style={{
                  fontSize: 14,
                  color: "#d6e8f5",
                  fontWeight: 500,
                }}
              >
                {job.name}
              </div>
            </div>
          </div>

          <div
            style={{
              position: "relative",
              height: 6,
              background: "rgba(110,200,255,0.08)",
              marginBottom: 6,
            }}
          >
            <div
              style={{
                position: "absolute",
                inset: "0 auto 0 0",
                width: pct + "%",
                background: `linear-gradient(90deg, ${stat.color}60, ${stat.color})`,
                transition: "width .4s linear",
                boxShadow: `0 0 4px ${stat.color}60`,
              }}
            />
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontFamily: FONT_MONO,
              fontSize: 11,
              marginBottom: 12,
            }}
          >
            <span style={{ color: stat.color, fontWeight: 600 }}>
              {pct.toFixed(1)}%
            </span>
            <span style={{ color: "#9ab4cf" }}>
              {fmtTime(remaining)}{" "}
              <span style={{ color: "#3d5572" }}>remaining</span>
            </span>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 8,
            }}
          >
            <PrnKV k="MATERIALS" v={job.cost.split(" · ")[0] ?? ""} />
            <PrnKV k="ENERGY" v={job.cost.split(" · ")[1] ?? ""} />
            <PrnKV
              k="BP USED"
              v={`${job.elapsed.toFixed(1)} / ${job.total.toFixed(1)}`}
            />
            <PrnKV
              k="QUEUE"
              v={
                job.queueAhead > 0
                  ? `+${job.queueAhead} ahead`
                  : "last in line"
              }
              color={job.queueAhead > 0 ? "#d488ec" : "#9ab4cf"}
            />
          </div>
        </div>
      ) : (
        <div
          style={{
            padding: "20px 12px",
            textAlign: "center",
            border: "1px dashed rgba(110,200,255,0.18)",
            marginBottom: 12,
            fontFamily: FONT_MONO,
            fontSize: 10,
            color: "#6b87a3",
            letterSpacing: "0.14em",
          }}
        >
          IDLE &middot; NO JOB ASSIGNED
          <div
            style={{
              marginTop: 6,
              color: "#3d5572",
              letterSpacing: "0.06em",
            }}
          >
            queue empty &middot; ready to print
          </div>
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 8,
          marginBottom: 12,
        }}
      >
        <PrnKV
          k="THROUGHPUT"
          v={`${tier.speed.toFixed(1)} BP/s`}
          color="#4cd8a8"
        />
        <PrnKV
          k="POWER"
          v={`${printer.status === "printing" ? power : 0} / ${power} MW`}
          color="#5d8aff"
        />
      </div>

      <div style={{ display: "flex", gap: 6 }}>
        {job && printer.status === "printing" && (
          <Fragment>
            <button
              style={{
                ...btnFlush(),
                flex: 1,
                color: "#d488ec",
                borderColor: "rgba(212,136,236,0.40)",
              }}
            >
              &#x275A;&#x275A; PAUSE
            </button>
            <button style={{ ...btnFlush(), flex: 1 }}>+ QUEUE</button>
            <button
              style={{
                ...btnFlush(),
                flex: 1,
                color: "#ee8cb8",
                borderColor: "rgba(238,140,184,0.30)",
              }}
            >
              &times; CANCEL
            </button>
          </Fragment>
        )}
        {printer.status === "starved" && (
          <Fragment>
            <button
              style={{
                ...btnFlush(),
                flex: 1,
                color: "#ee8cb8",
                borderColor: "rgba(238,140,184,0.40)",
              }}
            >
              &#x26A0; RESOLVE POWER
            </button>
            <button style={{ ...btnFlush(), flex: 1 }}>+ QUEUE</button>
          </Fragment>
        )}
        {printer.status === "idle" && (
          <Fragment>
            <button
              style={{
                ...btnFlush(),
                flex: 1,
                color: "#4ddbff",
                borderColor: "rgba(77,219,255,0.40)",
              }}
            >
              + NEW BUILD ORDER
            </button>
          </Fragment>
        )}
      </div>
    </div>
  );
}

function PrnSystemBreakdown({
  systems,
  stats,
  onPickSystem,
  currentSystemId,
}: {
  systems: PrinterSystem[];
  stats: AggregateStats;
  onPickSystem: (sysId: string) => void;
  currentSystemId: string | null;
}) {
  return (
    <div style={{ padding: "14px 16px" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 10,
        }}
      >
        <span
          style={{
            fontFamily: FONT_MONO,
            fontSize: 10,
            color: "#6cb8e8",
            letterSpacing: "0.18em",
            fontWeight: 600,
          }}
        >
          POWER BY SYSTEM
        </span>
        <span
          style={{
            flex: 1,
            height: 1,
            background: "rgba(110,200,255,0.10)",
          }}
        />
        <span
          style={{
            fontFamily: FONT_MONO,
            fontSize: 9,
            color: "#6b87a3",
          }}
        >
          {stats.powerDraw} MW total
        </span>
      </div>

      <div
        style={{ display: "flex", flexDirection: "column", gap: 5 }}
      >
        {systems.map((sys) => {
          const draw = sys.printers
            .filter((p) => p.status === "printing")
            .reduce((s, p) => s + prnPower(p), 0);
          const gen = sys.power.generated;
          const usePct = Math.min(100, (draw / gen) * 100);
          const drawPct = Math.min(
            100,
            (draw / Math.max(1, stats.powerDraw)) * 100,
          );
          const deficit = draw > gen;
          const isCur = sys.id === currentSystemId;
          return (
            <div
              key={sys.id}
              onClick={() => onPickSystem(sys.id)}
              style={{
                padding: "6px 8px",
                background: isCur
                  ? "rgba(77,219,255,0.06)"
                  : "transparent",
                border: `1px solid ${isCur ? "rgba(77,219,255,0.30)" : "rgba(110,200,255,0.06)"}`,
                cursor: "pointer",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 4,
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: sys.starColor,
                  }}
                />
                <span
                  style={{
                    fontFamily: FONT_MONO,
                    fontSize: 10,
                    color: "#d6e8f5",
                    letterSpacing: "0.06em",
                    flex: 1,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {sys.name.toUpperCase()}
                </span>
                <span
                  style={{
                    fontFamily: FONT_MONO,
                    fontSize: 9.5,
                    color: deficit ? "#ee8cb8" : "#5d8aff",
                  }}
                >
                  {draw}
                  <span style={{ color: "#3d5572" }}>/{gen}</span>
                  <span
                    style={{ color: "#6b87a3", marginLeft: 3 }}
                  >
                    MW
                  </span>
                </span>
              </div>
              <div
                style={{
                  position: "relative",
                  height: 4,
                  background: "rgba(110,200,255,0.06)",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    inset: "0 auto 0 0",
                    width: drawPct + "%",
                    background: deficit ? "#ee8cb8" : "#5d8aff",
                    opacity: 0.7,
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    top: -2,
                    left: usePct + "%",
                    width: 1,
                    height: 8,
                    background: "#d6e8f5",
                    opacity: 0.4,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PrnLegendDot({
  color,
  label,
}: {
  color: string;
  label: string;
}) {
  return (
    <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: color,
          boxShadow: `0 0 4px ${color}80`,
        }}
      />
      <span style={{ letterSpacing: "0.14em" }}>{label}</span>
    </span>
  );
}

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------

export function Printers() {
  const t = useTick();
  const systems = useMemo(() => livePrnSystems(t), [t]);
  const stats = useMemo(() => aggregatePrnStats(systems), [systems]);

  const [expanded, setExpanded] = useState<Record<string, boolean>>(
    () =>
      Object.fromEntries(PRN_SYSTEMS.map((sys) => [sys.id, true])),
  );
  const toggle = (id: string) =>
    setExpanded((e) => ({ ...e, [id]: !e[id] }));

  const [selectedId, setSelectedId] = useState("PRN-SOL-02");
  const [selected, selectedSystem] = useMemo<
    [PrinterData | null, PrinterSystem | null]
  >(() => {
    for (const sys of systems) {
      const p = sys.printers.find((x) => x.id === selectedId);
      if (p) return [p, sys];
    }
    return [null, null];
  }, [systems, selectedId]);

  const focusSystem = (sysId: string) => {
    const sys = systems.find((x) => x.id === sysId);
    if (sys && sys.printers.length) setSelectedId(sys.printers[0]!.id);
  };

  return (
    <Fragment>
      <ScreenHeader
        title="Printer Operations"
        actions={
          <button
            style={{
              ...btnFlush(),
              padding: "6px 14px",
              color: "#4ddbff",
              borderColor: "rgba(77,219,255,0.4)",
            }}
          >
            + NEW BUILD ORDER
          </button>
        }
      />

      <PrnGlobalBanner stats={stats} systems={systems} />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 360px",
          gridTemplateRows: "minmax(0, 1fr)",
          gap: 16,
          flex: 1,
          minHeight: 0,
        }}
      >
        <Panel
          label="PRINTERS · BY SYSTEM"
          right={
            <div
              style={{
                display: "flex",
                gap: 14,
                fontFamily: FONT_MONO,
                fontSize: 9.5,
                color: "#6b87a3",
              }}
            >
              <PrnLegendDot color="#4cd8a8" label="PRINTING" />
              <PrnLegendDot color="#ee8cb8" label="STARVED" />
              <PrnLegendDot color="#6b87a3" label="IDLE" />
            </div>
          }
          style={{
            display: "flex",
            flexDirection: "column",
            minHeight: 0,
            minWidth: 0,
            overflow: "hidden",
          }}
        >
          <div
            className="lvnp-scrollable"
            style={{
              overflowY: "auto",
              overflowX: "hidden",
              flex: 1,
              margin: "-18px",
            }}
          >
            {systems.map((sys) => (
              <div key={sys.id}>
                <PrnSystemHeader
                  system={sys}
                  expanded={expanded[sys.id] ?? true}
                  onToggle={() => toggle(sys.id)}
                />
                {expanded[sys.id] &&
                  sys.printers.map((p) => (
                    <PrnRow
                      key={p.id}
                      printer={p}
                      selected={p.id === selectedId}
                      onSelect={setSelectedId}
                    />
                  ))}
              </div>
            ))}
          </div>
        </Panel>

        <Panel
          label="PRINTER DETAIL"
          style={{
            display: "flex",
            flexDirection: "column",
            minHeight: 0,
            minWidth: 0,
            overflow: "hidden",
          }}
        >
          <div
            className="lvnp-scrollable"
            style={{
              overflowY: "auto",
              overflowX: "hidden",
              flex: 1,
              margin: "-18px",
            }}
          >
            <PrnDetail printer={selected} system={selectedSystem} />
            <PrnSystemBreakdown
              systems={systems}
              stats={stats}
              onPickSystem={focusSystem}
              currentSystemId={
                selectedSystem ? selectedSystem.id : null
              }
            />
          </div>
        </Panel>
      </div>
    </Fragment>
  );
}
