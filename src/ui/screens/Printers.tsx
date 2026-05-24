import { Fragment, useMemo, useState } from "react";
import { useGameState, useDispatch } from "../context";
import type {
  SystemState,
  StructureInstance,
  ConstructionProject,
} from "../../simulation/state";
import { STRUCTURES, structureKey, PRINTER_NAMES } from "../../simulation/data/structures";
import { starColor } from "../data/star-colors";
import { ScreenHeader } from "../components/ScreenHeader";
import { Panel } from "../components/Panel";
import { btnFlush } from "../components/buttons";
import { FONT_MONO } from "../tokens";
import { fmt, fmtYears } from "../format";

// ---------------------------------------------------------------------------
// View-model types
// ---------------------------------------------------------------------------

type PrinterStatus = "printing" | "idle" | "starved" | "paused";
type JobKind = "reactor" | "miner" | "printer" | "station" | "probe";

interface PrinterJob {
  projectId: string;
  name: string;
  kind: JobKind;
  buildTime: number;
  progress: number;
  totalCost: { materials: number; energy: number };
  queueIndex: number;
  assignedCount: number;
}

interface PrinterView {
  id: string;
  systemId: string;
  tier: number;
  name: string;
  status: PrinterStatus;
  productionRate: number;
  operatingCost: number;
  maintenanceCost: number;
  health: number;
  job: PrinterJob | null;
  isProbe: boolean;
}

interface SystemView {
  id: string;
  name: string;
  color: string;
  distance: number;
  isHome: boolean;
  energySupply: number;
  energyDemand: number;
  printers: PrinterView[];
  queueLength: number;
}

interface AggregateStats {
  total: number;
  active: number;
  idle: number;
  starved: number;
  paused: number;
  throughput: number;
  energyDraw: number;
  queueItems: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TIER_COLORS: Record<number, string> = {
  0: "#4cd8a8",
  1: "#6cb8e8",
  2: "#4ddbff",
  3: "#b08bff",
  4: "#d488ec",
  5: "#ff9966",
  6: "#ffd700",
};

const TIER_LABELS: Record<number, string> = {
  0: "PROBE",
  1: "BASIC",
  2: "ENHANCED",
  3: "NANOSCALE",
  4: "ATOMIC",
  5: "QUANTUM",
  6: "VON NEUMANN",
};

const STATUS_INFO: Record<PrinterStatus, { color: string; label: string }> = {
  printing: { color: "#4cd8a8", label: "PRINTING" },
  idle: { color: "#6b87a3", label: "IDLE" },
  starved: { color: "#ee8cb8", label: "STARVED" },
  paused: { color: "#d488ec", label: "PAUSED" },
};

function tierColor(tier: number): string {
  return TIER_COLORS[tier] ?? "#6cb8e8";
}

function tierLabel(tier: number): string {
  return TIER_LABELS[tier] ?? `T${tier}`;
}

// ---------------------------------------------------------------------------
// Data extraction
// ---------------------------------------------------------------------------

function projectName(project: ConstructionProject): string {
  if (project.targetConfig !== null) return "Probe";
  const key = structureKey(
    project.targetType as StructureInstance["type"],
    project.targetTier,
  );
  const def = STRUCTURES[key];
  return def?.name ?? project.targetType;
}

function buildPrinterJob(
  project: ConstructionProject,
  queue: readonly ConstructionProject[],
): PrinterJob {
  return {
    projectId: project.id,
    name: projectName(project),
    kind: project.targetType as JobKind,
    buildTime: project.totalCost.materials,
    progress: project.progress,
    totalCost: project.totalCost,
    queueIndex: queue.indexOf(project),
    assignedCount: project.assignedPrinterIds.length,
  };
}

function buildSystemView(system: SystemState): SystemView | null {
  const printers: PrinterView[] = [];
  const energyDeficit = system.resourceRates.energyNet < 0;

  const printerToProject = new Map<string, ConstructionProject>();
  for (const project of system.constructionQueue) {
    for (const printerId of project.assignedPrinterIds) {
      printerToProject.set(printerId, project);
    }
  }

  if (system.mainProbe?.mode === "printing") {
    const probe = system.mainProbe;
    const firstProject = system.constructionQueue[0] ?? null;
    printers.push({
      id: probe.id,
      systemId: system.id,
      tier: 0,
      name: probe.name,
      status: firstProject ? "printing" : "idle",
      productionRate: probe.internalPrinterSpeed,
      operatingCost: 0,
      maintenanceCost: 0,
      health: probe.health,
      job: firstProject
        ? buildPrinterJob(firstProject, system.constructionQueue)
        : null,
      isProbe: true,
    });
  }

  for (const inst of system.structures.printers) {
    if (inst.constructionProgress < 1) continue;

    const project = printerToProject.get(inst.id);
    let status: PrinterStatus;
    if (!inst.active) status = "paused";
    else if (project) status = energyDeficit ? "starved" : "printing";
    else status = "idle";

    printers.push({
      id: inst.id,
      systemId: system.id,
      tier: inst.tier,
      name: PRINTER_NAMES[inst.tier - 1] ?? `Printer T${inst.tier}`,
      status,
      productionRate: inst.productionRate,
      operatingCost: inst.operatingCost,
      maintenanceCost: inst.maintenanceCost,
      health: inst.health,
      job: project
        ? buildPrinterJob(project, system.constructionQueue)
        : null,
      isProbe: false,
    });
  }

  if (printers.length === 0 && system.constructionQueue.length === 0) {
    return null;
  }

  return {
    id: system.id,
    name: system.name,
    color: starColor(system.starType),
    distance: system.distanceFromOrigin,
    isHome: system.distanceFromOrigin === 0,
    energySupply: system.resourceRates.energySupply,
    energyDemand: system.resourceRates.energyDemand,
    printers,
    queueLength: system.constructionQueue.length,
  };
}

function aggregateStats(systems: SystemView[]): AggregateStats {
  const stats: AggregateStats = {
    total: 0,
    active: 0,
    idle: 0,
    starved: 0,
    paused: 0,
    throughput: 0,
    energyDraw: 0,
    queueItems: 0,
  };
  for (const sys of systems) {
    stats.queueItems += sys.queueLength;
    for (const p of sys.printers) {
      stats.total++;
      if (p.status === "printing") {
        stats.active++;
        stats.throughput += p.productionRate;
        stats.energyDraw += p.operatingCost;
      } else if (p.status === "idle") {
        stats.idle++;
      } else if (p.status === "starved") {
        stats.starved++;
        stats.throughput += p.productionRate;
        stats.energyDraw += p.operatingCost;
      } else if (p.status === "paused") {
        stats.paused++;
      }
    }
  }
  return stats;
}

function printerETA(printer: PrinterView): number {
  if (!printer.job || printer.status === "paused") return Infinity;
  const remaining = printer.job.buildTime * (1 - printer.job.progress);
  if (printer.productionRate <= 0) return Infinity;
  return remaining / printer.productionRate;
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
  systems: SystemView[];
}) {
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
        unit="BP"
        color="#4cd8a8"
      />
      <PrnBannerKPI
        label="QUEUE"
        value={stats.queueItems}
        unit={stats.queueItems === 1 ? "ITEM" : "ITEMS"}
        color="#b08bff"
      />
      <PrnBannerKPI
        label="ATTENTION"
        value={stats.starved + stats.idle + stats.paused}
        unit={
          stats.starved > 0
            ? `${stats.starved} STARVED`
            : stats.paused > 0
              ? `${stats.paused} PAUSED`
              : `${stats.idle} IDLE`
        }
        color={stats.starved > 0 ? "#ee8cb8" : "#6b87a3"}
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
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          {systems.map((sys) => {
            const active = sys.printers.filter(
              (p) => p.status === "printing",
            ).length;
            return (
              <div
                key={sys.id}
                style={{ display: "flex", alignItems: "center", gap: 6 }}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: sys.color,
                    boxShadow: `0 0 6px ${sys.color}80`,
                  }}
                />
                <span
                  style={{
                    fontFamily: FONT_MONO,
                    fontSize: 10,
                    color: "#d6e8f5",
                  }}
                >
                  <span style={{ color: "#4cd8a8" }}>{active}</span>
                  <span style={{ color: "#3d5572" }}>
                    /{sys.printers.length}
                  </span>
                </span>
              </div>
            );
          })}
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
  system: SystemView;
  expanded: boolean;
  onToggle: () => void;
}) {
  const active = system.printers.filter(
    (p) => p.status === "printing" || p.status === "starved",
  ).length;
  const draw = system.printers
    .filter((p) => p.status === "printing" || p.status === "starved")
    .reduce((sum, p) => sum + p.operatingCost, 0);
  const deficit = system.energyDemand > system.energySupply;
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
          background: system.color,
          boxShadow: `0 0 8px ${system.color}80`,
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
        {system.distance > 0 && (
          <span
            style={{
              fontFamily: FONT_MONO,
              fontSize: 10,
              color: "#6b87a3",
            }}
          >
            {system.distance.toFixed(2)} ly
          </span>
        )}
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
          <span style={{ color: "#3d5572" }}>/{system.printers.length}</span>
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
        {system.queueLength > 0 && (
          <Fragment>
            <span
              style={{
                width: 1,
                height: 14,
                background: "rgba(110,200,255,0.14)",
              }}
            />
            <span style={{ color: "#b08bff" }}>
              {system.queueLength}
              <span
                style={{
                  color: "#6b87a3",
                  letterSpacing: "0.12em",
                  marginLeft: 4,
                }}
              >
                QUEUED
              </span>
            </span>
          </Fragment>
        )}
        <span
          style={{
            width: 1,
            height: 14,
            background: "rgba(110,200,255,0.14)",
          }}
        />
        <span style={{ color: deficit ? "#ee8cb8" : "#5d8aff" }}>
          {draw.toFixed(1)}
          <span style={{ color: "#3d5572" }}>/</span>
          {system.energySupply.toFixed(1)}
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
      </div>
    </div>
  );
}

function PrnRow({
  printer,
  selected,
  onSelect,
}: {
  printer: PrinterView;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  const tc = tierColor(printer.tier);
  const stat = STATUS_INFO[printer.status];
  const job = printer.job;
  const pct = job ? job.progress * 100 : 0;
  const eta = printerETA(printer);

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
        background: selected ? "rgba(77,219,255,0.05)" : "transparent",
        borderTop: "1px solid rgba(110,200,255,0.05)",
        borderLeft: `3px solid ${selected ? "#4ddbff" : tc + "88"}`,
        cursor: "pointer",
        transition: "background .12s",
      }}
    >
      {/* Icon */}
      <div
        style={{
          gridArea: "icon",
          alignSelf: "center",
          width: 32,
          height: 32,
          borderRadius: 3,
          background: tc + "12",
          border: `1px solid ${tc}88`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: tc,
          fontSize: 15,
        }}
      >
        {printer.isProbe ? "✦" : "⊟"}
      </div>

      {/* Header */}
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
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {printer.name}
        </span>
        <span
          style={{
            fontFamily: FONT_MONO,
            fontSize: 9,
            color: tc,
            letterSpacing: "0.18em",
            flexShrink: 0,
          }}
        >
          {tierLabel(printer.tier)}
        </span>
        <span
          style={{
            fontFamily: FONT_MONO,
            fontSize: 9,
            color: "#3d5572",
            flexShrink: 0,
          }}
        >
          {printer.productionRate.toFixed(1)} BP
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
            flexShrink: 0,
          }}
        >
          {stat.label}
        </span>
      </div>

      {/* Power */}
      <div style={{ gridArea: "power", textAlign: "right" }}>
        {!printer.isProbe && (
          <Fragment>
            <span
              style={{
                fontFamily: FONT_MONO,
                fontSize: 15,
                color:
                  printer.status === "printing" || printer.status === "starved"
                    ? "#5d8aff"
                    : "#3d5572",
                fontWeight: 600,
              }}
            >
              {printer.status === "printing" || printer.status === "starved"
                ? printer.operatingCost.toFixed(1)
                : "0"}
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
          </Fragment>
        )}
      </div>

      {/* Body */}
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
                  {fmt(job.totalCost.materials)} tons
                  {job.assignedCount > 1 && (
                    <Fragment>
                      <span
                        style={{
                          color: "#3d5572",
                          margin: "0 6px",
                        }}
                      >
                        &middot;
                      </span>
                      <span style={{ color: "#4ddbff" }}>
                        {job.assignedCount} printers
                      </span>
                    </Fragment>
                  )}
                  {job.queueIndex > 0 && (
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
                        #{job.queueIndex + 1} in queue
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
                {printer.status === "paused"
                  ? "paused · not accepting jobs"
                  : "idle · no job assigned"}
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
                  {eta < Infinity ? fmtYears(eta) : "—"}
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
  dispatch,
}: {
  printer: PrinterView | null;
  system: SystemView | null;
  dispatch: (a: Parameters<ReturnType<typeof useDispatch>>[0]) => void;
}) {
  if (!printer || !system) return null;
  const tc = tierColor(printer.tier);
  const stat = STATUS_INFO[printer.status];
  const job = printer.job;
  const pct = job ? job.progress * 100 : 0;
  const eta = printerETA(printer);

  return (
    <div
      style={{
        padding: "14px 16px",
        borderBottom: "1px solid rgba(110,200,255,0.10)",
      }}
    >
      {/* Header */}
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
            background: tc + "15",
            border: `1.5px solid ${tc}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: tc,
            fontSize: 22,
            textShadow: `0 0 8px ${tc}60`,
          }}
        >
          {printer.isProbe ? "✦" : "⊟"}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontFamily: FONT_MONO,
              fontSize: 9,
              color: tc,
              letterSpacing: "0.18em",
              marginBottom: 2,
            }}
          >
            {tierLabel(printer.tier)}
            {printer.isProbe ? " INTERNAL" : " PRINTER"}
            {" · "}
            {printer.productionRate.toFixed(1)} BP
          </div>
          <div
            style={{
              fontFamily: FONT_MONO,
              fontSize: 15,
              color: "#d6e8f5",
              fontWeight: 500,
            }}
          >
            {printer.name}
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
                background: system.color,
                boxShadow: `0 0 4px ${system.color}80`,
              }}
            />
            {system.name.toUpperCase()}
            {system.distance > 0 && (
              <Fragment>
                <span style={{ color: "#3d5572" }}>&middot;</span>
                <span>{system.distance.toFixed(2)} ly</span>
              </Fragment>
            )}
          </div>
        </div>
      </div>

      {/* Current job */}
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
              {eta < Infinity ? fmtYears(eta) : "—"}
              {" "}
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
            <PrnKV
              k="MATERIALS"
              v={`${fmt(job.totalCost.materials)} tons`}
            />
            <PrnKV
              k="ENERGY"
              v={`${fmt(job.totalCost.energy)} MW`}
            />
            <PrnKV
              k="BUILD POWER"
              v={`${(job.buildTime * job.progress).toFixed(1)} / ${job.buildTime.toFixed(1)}`}
            />
            <PrnKV
              k="QUEUE POSITION"
              v={
                job.queueIndex === 0
                  ? "first"
                  : `#${job.queueIndex + 1}`
              }
              color={job.queueIndex === 0 ? "#9ab4cf" : "#d488ec"}
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
          {printer.status === "paused"
            ? "PAUSED · NOT ACCEPTING JOBS"
            : "IDLE · NO JOB ASSIGNED"}
          <div
            style={{
              marginTop: 6,
              color: "#3d5572",
              letterSpacing: "0.06em",
            }}
          >
            {printer.status === "paused"
              ? "resume to accept build orders"
              : "queue empty · ready to print"}
          </div>
        </div>
      )}

      {/* Stats */}
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
          v={`${printer.productionRate.toFixed(1)} BP`}
          color="#4cd8a8"
        />
        {!printer.isProbe && (
          <PrnKV
            k="POWER DRAW"
            v={`${printer.operatingCost.toFixed(1)} MW`}
            color="#5d8aff"
          />
        )}
        {!printer.isProbe && (
          <PrnKV
            k="MAINTENANCE"
            v={`${printer.maintenanceCost.toFixed(2)} T/year`}
            color="#6b87a3"
          />
        )}
        <PrnKV
          k="HEALTH"
          v={`${(printer.health * 100).toFixed(0)}%`}
          color={printer.health >= 0.5 ? "#4cd8a8" : "#ee8cb8"}
        />
      </div>

      {/* Action buttons */}
      <div style={{ display: "flex", gap: 6 }}>
        {job && !printer.isProbe && (
          <button
            onClick={() =>
              dispatch({
                type: "cancel_construction",
                systemId: printer.systemId,
                projectId: job.projectId,
              })
            }
            style={{
              ...btnFlush(),
              flex: 1,
              color: "#ee8cb8",
              borderColor: "rgba(238,140,184,0.30)",
            }}
          >
            &times; CANCEL JOB
          </button>
        )}
        {!printer.isProbe && printer.status !== "paused" && (
          <button
            onClick={() =>
              dispatch({
                type: "toggle_structure",
                systemId: printer.systemId,
                structureId: printer.id,
              })
            }
            style={{
              ...btnFlush(),
              flex: 1,
              color: "#d488ec",
              borderColor: "rgba(212,136,236,0.40)",
            }}
          >
            &#x275A;&#x275A; PAUSE
          </button>
        )}
        {!printer.isProbe && printer.status === "paused" && (
          <button
            onClick={() =>
              dispatch({
                type: "toggle_structure",
                systemId: printer.systemId,
                structureId: printer.id,
              })
            }
            style={{
              ...btnFlush(),
              flex: 1,
              color: "#4cd8a8",
              borderColor: "rgba(76,216,168,0.40)",
            }}
          >
            &#x25B6; RESUME
          </button>
        )}
      </div>
    </div>
  );
}

function PrnQueueSection({
  systems,
  dispatch,
}: {
  systems: SystemView[];
  dispatch: (a: Parameters<ReturnType<typeof useDispatch>>[0]) => void;
}) {
  const state = useGameState();
  const allQueue: {
    project: ConstructionProject;
    systemId: string;
    systemName: string;
  }[] = [];
  for (const sys of systems) {
    const gameSys = state.systems[sys.id];
    if (!gameSys) continue;
    for (const project of gameSys.constructionQueue) {
      allQueue.push({
        project,
        systemId: sys.id,
        systemName: sys.name,
      });
    }
  }
  if (allQueue.length === 0) return null;

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
            color: "#b08bff",
            letterSpacing: "0.18em",
            fontWeight: 600,
          }}
        >
          CONSTRUCTION QUEUE
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
          {allQueue.length} {allQueue.length === 1 ? "item" : "items"}
        </span>
      </div>

      <div
        style={{ display: "flex", flexDirection: "column", gap: 5 }}
      >
        {allQueue.map(({ project, systemId, systemName }) => {
          const pct = project.progress * 100;
          const name = projectName(project);
          const hasAssigned = project.assignedPrinterIds.length > 0;
          return (
            <div
              key={project.id}
              style={{
                padding: "8px 10px",
                background: hasAssigned
                  ? "rgba(76,216,168,0.04)"
                  : "rgba(110,200,255,0.02)",
                border: `1px solid ${hasAssigned ? "rgba(76,216,168,0.20)" : "rgba(110,200,255,0.08)"}`,
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
                <JobGlyph
                  kind={project.targetType as JobKind}
                  size={12}
                  color={hasAssigned ? "#4cd8a8" : "#6b87a3"}
                />
                <span
                  style={{
                    fontFamily: FONT_MONO,
                    fontSize: 11,
                    color: "#d6e8f5",
                    flex: 1,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {name}
                </span>
                {systems.length > 1 && (
                  <span
                    style={{
                      fontFamily: FONT_MONO,
                      fontSize: 9,
                      color: "#6b87a3",
                    }}
                  >
                    {systemName}
                  </span>
                )}
                <span
                  style={{
                    fontFamily: FONT_MONO,
                    fontSize: 10,
                    fontWeight: 600,
                    color: hasAssigned ? "#4cd8a8" : "#6b87a3",
                  }}
                >
                  {pct.toFixed(0)}%
                </span>
                <button
                  onClick={() =>
                    dispatch({
                      type: "cancel_construction",
                      systemId,
                      projectId: project.id,
                    })
                  }
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "#3d5572",
                    cursor: "pointer",
                    padding: "0 2px",
                    fontFamily: FONT_MONO,
                    fontSize: 12,
                  }}
                  title="Cancel construction"
                >
                  &times;
                </button>
              </div>
              <div
                style={{
                  position: "relative",
                  height: 3,
                  background: "rgba(110,200,255,0.06)",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    inset: "0 auto 0 0",
                    width: pct + "%",
                    background: hasAssigned ? "#4cd8a8" : "#6b87a3",
                    opacity: 0.7,
                    transition: "width .4s linear",
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

function EmptyState() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        padding: "60px 24px",
        color: "#6b87a3",
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: 32, opacity: 0.3 }}>{"⊟"}</div>
      <div
        style={{
          fontFamily: FONT_MONO,
          fontSize: 11,
          letterSpacing: "0.18em",
        }}
      >
        NO PRINTERS ONLINE
      </div>
      <div style={{ fontSize: 13, color: "#3d5572", maxWidth: 300 }}>
        Build a printer from the Overview page to begin construction
        operations. The probe&apos;s internal printer activates
        automatically when structures are queued.
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------

export function Printers() {
  const state = useGameState();
  const dispatch = useDispatch();

  const systems = useMemo(() => {
    const views: SystemView[] = [];
    for (const sys of Object.values(state.systems)) {
      const view = buildSystemView(sys);
      if (view) views.push(view);
    }
    views.sort((a, b) => a.distance - b.distance);
    return views;
  }, [state.systems]);

  const stats = useMemo(() => aggregateStats(systems), [systems]);

  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const toggle = (id: string) =>
    setExpanded((e) => ({ ...e, [id]: !(e[id] ?? true) }));

  const allPrinters = useMemo(
    () => systems.flatMap((s) => s.printers),
    [systems],
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const effectiveSelectedId = selectedId ?? allPrinters[0]?.id ?? null;

  const [selected, selectedSystem] = useMemo<
    [PrinterView | null, SystemView | null]
  >(() => {
    if (!effectiveSelectedId) return [null, null];
    for (const sys of systems) {
      const p = sys.printers.find((x) => x.id === effectiveSelectedId);
      if (p) return [p, sys];
    }
    return [null, null];
  }, [systems, effectiveSelectedId]);

  const isEmpty = systems.length === 0;

  return (
    <Fragment>
      <ScreenHeader title="Printer Operations" />

      {isEmpty ? (
        <EmptyState />
      ) : (
        <Fragment>
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
                    {(expanded[sys.id] ?? true) &&
                      sys.printers.map((p) => (
                        <PrnRow
                          key={p.id}
                          printer={p}
                          selected={p.id === effectiveSelectedId}
                          onSelect={(id) => setSelectedId(id)}
                        />
                      ))}
                  </div>
                ))}
              </div>
            </Panel>

            <Panel
              label="DETAIL"
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
                <PrnDetail
                  printer={selected}
                  system={selectedSystem}
                  dispatch={dispatch}
                />
                <PrnQueueSection systems={systems} dispatch={dispatch} />
              </div>
            </Panel>
          </div>
        </Fragment>
      )}
    </Fragment>
  );
}
